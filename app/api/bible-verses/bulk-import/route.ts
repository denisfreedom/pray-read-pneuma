import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// Strip all HTML tags, comments, inline styles, and HTML entities from verse text
function cleanVerseText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/<!--[\s\S]*?-->/g, '')               // HTML comments
    .replace(/<[^>]+>/g, '')                         // HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Supported Luganda JSON formats:
 *
 * FORMAT 1 — Flat array with metadata wrapper (recommended):
 * {
 *   "metadata": { "language": "luganda", "lang_short": "lg", "version": "NBS" },
 *   "verses": [
 *     { "book": "Genesis", "chapter": 1, "verse": 1, "text": "Mu ntandikwa Katonda..." },
 *     { "book_name": "Genesis", "chapter": 1, "verse": 2, "text_luganda": "Nsi yaali..." }
 *   ]
 * }
 *
 * FORMAT 2 — Flat array without wrapper (language must be set to "luganda" in UI):
 * [
 *   { "book": "Genesis", "chapter": 1, "verse": 1, "text": "Mu ntandikwa..." },
 *   ...
 * ]
 *
 * FORMAT 3 — Nested chapters object:
 * {
 *   "metadata": { "language": "luganda" },
 *   "verses": [
 *     { "book": "Genesis", "chapter": 1, "verse": 1, "text_luganda": "Mu ntandikwa..." }
 *   ]
 * }
 *
 * Required fields per verse (any combination accepted):
 *   book OR book_name       — Bible book name (English or Luganda)
 *   chapter                 — chapter number (integer or string)
 *   verse                   — verse number (integer or string)
 *   text OR text_luganda OR luganda_text  — verse text (for Luganda import)
 *   text OR text_english OR english_text  — verse text (for English import)
 *
 * Language detection (in priority order):
 *   1. metadata.lang_short = "lg" | "lug"
 *   2. metadata.language   = "luganda"
 *   3. verse fields: text_luganda or luganda_text present → luganda
 *   4. Fallback: english
 */

const ALLOWED_FIELDS = new Set([
  'book', 'book_name', 'chapter', 'verse',
  'text', 'text_english', 'text_luganda',
  'english_text', 'luganda_text',
]);

function validateVerse(verse: any, index: number): { valid: boolean; error?: string } {
  const keys = Object.keys(verse);
  const disallowed = keys.filter(k => !ALLOWED_FIELDS.has(k));
  if (disallowed.length > 0) {
    return { valid: false, error: `Row ${index + 1}: Unknown fields: ${disallowed.join(', ')}. Allowed: ${[...ALLOWED_FIELDS].join(', ')}` };
  }
  const bookField = verse.book || verse.book_name;
  if (!bookField) {
    return { valid: false, error: `Row ${index + 1}: Missing "book" or "book_name" field.` };
  }
  if (verse.chapter == null) {
    return { valid: false, error: `Row ${index + 1}: Missing "chapter" field.` };
  }
  if (verse.verse == null) {
    return { valid: false, error: `Row ${index + 1}: Missing "verse" field.` };
  }
  const hasText = verse.text || verse.text_english || verse.english_text || verse.text_luganda || verse.luganda_text;
  if (!hasText) {
    return { valid: false, error: `Row ${index + 1}: Missing text field. Use "text", "text_luganda", or "text_english".` };
  }
  return { valid: true };
}

function detectLanguage(metadata: any, verses: any[]): 'luganda' | 'english' {
  // 1. Check metadata lang_short
  const langShort = (metadata?.lang_short || '').toLowerCase();
  if (langShort === 'lg' || langShort === 'lug') return 'luganda';

  // 2. Check metadata language
  const langFull = (metadata?.language || '').toLowerCase();
  if (langFull === 'luganda') return 'luganda';
  if (langFull === 'english') return 'english';

  // 3. Auto-detect from first verse with a text field
  const sample = verses.slice(0, 10);
  const hasLugandaField = sample.some(v => v.text_luganda || v.luganda_text);
  const hasEnglishField = sample.some(v => v.text_english || v.english_text);
  if (hasLugandaField && !hasEnglishField) return 'luganda';

  return 'english';
}

function extractText(verse: any, language: 'luganda' | 'english'): string {
  if (language === 'luganda') {
    return cleanVerseText(verse.text_luganda || verse.luganda_text || verse.text || '');
  }
  return cleanVerseText(verse.text_english || verse.english_text || verse.text || '');
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) / (1024 * 1024) > 50) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 50MB.' }, { status: 413 });
    }

    const rawText = await request.text();
    if (!rawText?.trim()) {
      return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
    }

    let body: any;
    try {
      body = JSON.parse(rawText.trim());
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid JSON: ' + (e instanceof Error ? e.message : String(e)) }, { status: 400 });
    }

    // Support both bare array and wrapped { metadata, verses }
    let verses: any[];
    let metadata: any = {};

    if (Array.isArray(body)) {
      verses = body;
    } else if (body.verses && Array.isArray(body.verses)) {
      verses = body.verses;
      metadata = body.metadata || {};
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid format. Expected either a JSON array of verses, or an object with "verses" array. See API docs for supported formats.'
      }, { status: 400 });
    }

    if (verses.length === 0) {
      return NextResponse.json({ success: false, error: 'No verses found in JSON.' }, { status: 400 });
    }

    const language = detectLanguage(metadata, verses);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const uniqueBooks = new Set<number>();
    const uniqueChapters = new Set<string>();

    // Cache book lookups to avoid repeated DB queries
    const bookCache = new Map<string, number | null>();

    for (let i = 0; i < verses.length; i++) {
      const verse = verses[i];
      try {
        const validation = validateVerse(verse, i);
        if (!validation.valid) {
          if (errors.length < 20) errors.push(validation.error!);
          errorCount++;
          continue;
        }

        const bookName = (verse.book || verse.book_name) as string;
        const chapterNum = parseInt(String(verse.chapter));
        const verseNum = parseInt(String(verse.verse));
        const verseText = extractText(verse, language);

        if (!verseText) {
          if (errors.length < 20) errors.push(`Row ${i + 1}: Empty text after cleaning for ${bookName} ${chapterNum}:${verseNum}`);
          errorCount++;
          continue;
        }

        // Lookup book (cached)
        const cacheKey = bookName.toLowerCase();
        let bookId: number | null;

        if (bookCache.has(cacheKey)) {
          bookId = bookCache.get(cacheKey)!;
        } else {
          const bookResult = await sql`
            SELECT id FROM bible_books
            WHERE LOWER(name_english) = LOWER(${bookName})
               OR LOWER(name_luganda)  = LOWER(${bookName})
            LIMIT 1
          `;
          bookId = bookResult.length > 0 ? bookResult[0].id : null;
          bookCache.set(cacheKey, bookId);
        }

        if (!bookId) {
          if (errors.length < 20) errors.push(`Row ${i + 1}: Book "${bookName}" not found in database.`);
          errorCount++;
          continue;
        }

        uniqueBooks.add(bookId);
        uniqueChapters.add(`${bookId}:${chapterNum}`);

        // CRITICAL FIX: Only update the specific language field, preserve the other one
        if (language === 'luganda') {
          // Check if verse exists
          const existing = await sql`
            SELECT text_english FROM bible_verses 
            WHERE book_id = ${bookId} AND chapter = ${chapterNum} AND verse = ${verseNum}
            LIMIT 1
          `;
          
          if (existing.length > 0) {
            // Update only Luganda, preserve English
            await sql`
              UPDATE bible_verses 
              SET text_luganda = ${verseText}, created_at = NOW()
              WHERE book_id = ${bookId} AND chapter = ${chapterNum} AND verse = ${verseNum}
            `;
          } else {
            // Insert new verse with empty English
            await sql`
              INSERT INTO bible_verses (book_id, chapter, verse, text_english, text_luganda, created_at)
              VALUES (${bookId}, ${chapterNum}, ${verseNum}, '', ${verseText}, NOW())
            `;
          }
        } else {
          // Check if verse exists
          const existing = await sql`
            SELECT text_luganda FROM bible_verses 
            WHERE book_id = ${bookId} AND chapter = ${chapterNum} AND verse = ${verseNum}
            LIMIT 1
          `;
          
          if (existing.length > 0) {
            // Update only English, preserve Luganda
            await sql`
              UPDATE bible_verses 
              SET text_english = ${verseText}, created_at = NOW()
              WHERE book_id = ${bookId} AND chapter = ${chapterNum} AND verse = ${verseNum}
            `;
          } else {
            // Insert new verse with empty Luganda
            await sql`
              INSERT INTO bible_verses (book_id, chapter, verse, text_english, text_luganda, created_at)
              VALUES (${bookId}, ${chapterNum}, ${verseNum}, ${verseText}, '', NOW())
            `;
          }
        }

        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const ref = `${verse.book || verse.book_name || '?'} ${verse.chapter}:${verse.verse}`;
        if (errors.length < 20) errors.push(`Row ${i + 1} (${ref}): ${msg}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import complete: ${successCount} verses imported, ${errorCount} errors`,
      language,
      successCount,
      errorCount,
      totalBooksProcessed: uniqueBooks.size,
      totalChaptersProcessed: uniqueChapters.size,
      successRate: `${((successCount / verses.length) * 100).toFixed(1)}%`,
      errors: errors.slice(0, 20),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: 'Bulk import failed', message: errorMsg }, { status: 500 });
  }
}
