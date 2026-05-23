import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

interface VerseData {
  book: string;
  chapter: number;
  verse: number;
  text?: string;
  text_english?: string;
  text_luganda?: string;
  english_text?: string;
  luganda_text?: string;
}

// Helper to clean verse text
function cleanVerseText(text: string | undefined): string {
  if (!text) return '';
  return text.trim().replace(/<div[^>]*data-styled-content[^>]*>/gi, '')
    .replace(/<\/div>\s*$/gi, '')
    .trim();
}

// Validate verse schema - only books, chapters, verses allowed
function validateVerseSchema(verse: any, index: number): { valid: boolean; error?: string } {
  const allowedFields = ['book', 'chapter', 'verse', 'text_english', 'text_luganda', 'english_text', 'luganda_text', 'text'];
  const verseKeys = Object.keys(verse);
  const disallowedFields = verseKeys.filter(key => !allowedFields.includes(key));
  
  if (disallowedFields.length > 0) {
    return {
      valid: false,
      error: `Row ${index + 1}: Disallowed fields: ${disallowedFields.join(', ')}. Only book, chapter, verse, and text fields allowed.`
    };
  }
  
  if (!verse.book || verse.chapter === undefined || verse.verse === undefined) {
    return {
      valid: false,
      error: `Row ${index + 1}: Missing required fields (book, chapter, verse).`
    };
  }
  
  return { valid: true };
}

// Fetch and parse JSON from GitHub URL
async function fetchFromGitHub(url: string): Promise<VerseData[]> {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle both array and single book object
    if (Array.isArray(data)) {
      return data;
    } else if (data.chapters && Array.isArray(data.chapters)) {
      // Ruth Prayer Bible format - flatten chapters into verse array
      const verses: VerseData[] = [];
      const bookName = data.name || data.name_english || 'Unknown';
      data.chapters.forEach((chapter: any) => {
        if (chapter.verses && Array.isArray(chapter.verses)) {
          chapter.verses.forEach((verse: any) => {
            verses.push({
              book: bookName,
              chapter: chapter.chapter_number || chapter.number || 0,
              verse: verse.verse_number || verse.number || 0,
              text_english: verse.text_english || verse.english_text || '',
              text_luganda: verse.text_luganda || verse.luganda_text || ''
            });
          });
        }
      });
      return verses;
    } else {
      throw new Error('JSON must be an array of verses or a book object with chapters');
    }
  } catch (error) {
    throw new Error(`Failed to fetch from GitHub: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { englishSourceType, englishSource, lugandaFile, mergeMode } = body;

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const importedVerses = new Map<string, any>(); // key: "book:chapter:verse"

    // Step 1: Process English from GitHub or file
    let englishVerses: VerseData[] = [];
    if (englishSourceType === 'github' && englishSource) {
      try {
        console.log(`📥 Fetching English KJV from GitHub: ${englishSource}`);
        englishVerses = await fetchFromGitHub(englishSource);
        console.log(`✅ Loaded ${englishVerses.length} English verses from GitHub`);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: `Failed to fetch English data: ${error instanceof Error ? error.message : String(error)}` },
          { status: 400 }
        );
      }
    } else if (englishSourceType === 'upload' && englishSource) {
      try {
        const parsed = JSON.parse(englishSource);
        englishVerses = Array.isArray(parsed) ? parsed : [parsed];
        console.log(`✅ Loaded ${englishVerses.length} English verses from upload`);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: `Invalid English JSON: ${error instanceof Error ? error.message : String(error)}` },
          { status: 400 }
        );
      }
    }

    // Step 2: Process Luganda from file
    let lugandaVerses: VerseData[] = [];
    if (lugandaFile) {
      try {
        const parsed = JSON.parse(lugandaFile);
        lugandaVerses = Array.isArray(parsed) ? parsed : [parsed];
        console.log(`✅ Loaded ${lugandaVerses.length} Luganda verses from file`);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: `Invalid Luganda JSON: ${error instanceof Error ? error.message : String(error)}` },
          { status: 400 }
        );
      }
    }

    // Step 3: Merge verses based on mode
    console.log(`🔄 Merge mode: ${mergeMode}`);
    
    // Add English verses to map
    for (const verse of englishVerses) {
      const schemaVal = validateVerseSchema(verse, 0);
      if (!schemaVal.valid) {
        errorCount++;
        continue;
      }
      const key = `${verse.book}:${verse.chapter}:${verse.verse}`;
      importedVerses.set(key, {
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        text_english: cleanVerseText(verse.text_english || verse.english_text || verse.text || ''),
        text_luganda: ''
      });
    }

    // Merge Luganda verses
    for (const verse of lugandaVerses) {
      const schemaVal = validateVerseSchema(verse, 0);
      if (!schemaVal.valid) {
        errorCount++;
        continue;
      }
      const key = `${verse.book}:${verse.chapter}:${verse.verse}`;
      
      if (importedVerses.has(key)) {
        // Update existing with Luganda
        const existing = importedVerses.get(key)!;
        existing.text_luganda = cleanVerseText(verse.text_luganda || verse.luganda_text || verse.text || '');
      } else if (mergeMode === 'merge') {
        // Add as new verse with only Luganda
        importedVerses.set(key, {
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text_english: '',
          text_luganda: cleanVerseText(verse.text_luganda || verse.luganda_text || verse.text || '')
        });
      }
    }

    console.log(`📊 Total verses to import: ${importedVerses.size}`);

    // Step 4: Import to database
    for (const [_, verse] of importedVerses) {
      try {
        // Find book
        const bookResult = await sql`
          SELECT id FROM bible_books 
          WHERE LOWER(name_english) = LOWER(${verse.book})
          OR LOWER(name_luganda) = LOWER(${verse.book})
          LIMIT 1
        `;

        if (bookResult.length === 0) {
          errors.push(`Book "${verse.book}" not found in database`);
          errorCount++;
          continue;
        }

        const bookId = bookResult[0].id;
        const existingVerse = await sql`
          SELECT id FROM bible_verses
          WHERE book_id = ${bookId}
          AND chapter = ${verse.chapter}
          AND verse = ${verse.verse}
        `;

        if (existingVerse.length > 0) {
          // Update existing
          await sql`
            UPDATE bible_verses
            SET 
              text_english = ${verse.text_english || ''},
              text_luganda = ${verse.text_luganda || ''},
              created_at = NOW()
            WHERE id = ${existingVerse[0].id}
          `;
          console.log(`✅ Updated: ${verse.book} ${verse.chapter}:${verse.verse}`);
        } else {
          // Insert new
          await sql`
            INSERT INTO bible_verses (book_id, chapter, verse, text_english, text_luganda, created_at)
            VALUES (${bookId}, ${verse.chapter}, ${verse.verse}, ${verse.text_english || ''}, ${verse.text_luganda || ''}, NOW())
          `;
          console.log(`✅ Inserted: ${verse.book} ${verse.chapter}:${verse.verse}`);
        }

        successCount++;
      } catch (error) {
        console.error(`Error processing verse:`, error);
        errors.push(`${verse.book} ${verse.chapter}:${verse.verse}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import complete: ${successCount} verses imported, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.slice(0, 10)
    });

  } catch (error) {
    console.error('Dual-source import error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to import' },
      { status: 500 }
    );
  }
}
