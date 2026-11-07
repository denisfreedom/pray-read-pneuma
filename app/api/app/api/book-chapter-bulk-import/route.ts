import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// POST /api/book-chapter-bulk-import
// Body: { book, introduction, closing_prayer, chapters: [{ chapter, introduction, closing_prayer, verses: [{ verse, pray_read, cross_references: ["John 14:6", ...] }] }] }
// Also accepts _english / _luganda suffixed keys and book_name / bookName.

const BOOK_ALIASES: Record<string, string> = {
  'song of solomon': 'Song of Solomon', 'song of songs': 'Song of Solomon',
  '1 samuel': '1 Samuel', '2 samuel': '2 Samuel', '1 kings': '1 Kings', '2 kings': '2 Kings',
  '1 chronicles': '1 Chronicles', '2 chronicles': '2 Chronicles',
  '1 corinthians': '1 Corinthians', '2 corinthians': '2 Corinthians',
  '1 thessalonians': '1 Thessalonians', '2 thessalonians': '2 Thessalonians',
  '1 timothy': '1 Timothy', '2 timothy': '2 Timothy',
  '1 peter': '1 Peter', '2 peter': '2 Peter',
  '1 john': '1 John', '2 john': '2 John', '3 john': '3 John',
  'psalm': 'Psalms', 'psalms': 'Psalms', 'rev': 'Revelation',
};

function normBook(s: string) {
  return s.trim().replace(/\.$/, '').replace(/\s+/g, ' ');
}
function resolveBookName(raw: string) {
  const n = normBook(raw);
  const lower = n.toLowerCase();
  if (BOOK_ALIASES[lower]) return BOOK_ALIASES[lower];
  return n;
}

// Parse one cross-ref string like "John 17:11-12" / "John 8:1-5,6,7-8" / "Ex. 3:5" / "Jn 6:4" / "John 8:1-5; 6:1"
function parseRefs(input: string, lastBook: string | null): Array<{ book: string; chapter: number; verse: number }> {
  const out: Array<{ book: string; chapter: number; verse: number }> = [];
  let currentBook = lastBook;
  // split on ; first (separate refs), keep commas inside a ref for verse lists
  const parts = input.split(';').map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    // Try: [Book] chapter:verse-list   OR bare "6:1" (continuation)
    const m = part.match(/^(?:(.+?)\s+)?(\d+)\s*:\s*(.+)$/);
    if (!m) continue;
    let bookPart = m[1]?.trim() || null;
    const chapter = parseInt(m[2], 10);
    const verseSpec = m[3].trim();
    if (bookPart) {
      // strip trailing dot: "Ex." -> "Ex"
      bookPart = bookPart.replace(/\.$/, '');
      currentBook = bookPart;
    }
    if (!currentBook) continue;
    // verseSpec: "1-5,6,7-8" or "11-12" or "6"
    for (const seg of verseSpec.split(',').map(s => s.trim()).filter(Boolean)) {
      const rm = seg.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!rm) continue;
      const from = parseInt(rm[1], 10);
      const to = rm[2] ? parseInt(rm[2], 10) : from;
      for (let v = from; v <= to; v++) out.push({ book: currentBook, chapter, verse: v });
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bookRaw: string = body.book || body.book_name || body.bookName || '';
    if (!bookRaw) return NextResponse.json({ error: 'Missing book' }, { status: 400 });
    const bookName = resolveBookName(bookRaw);

    // Find book_id — bible_books uses name_english in this project, name in others. Try both.
    let rows: any[] = [];
    try {
      rows = await sql`SELECT id, name_english AS name FROM bible_books WHERE LOWER(name_english) = LOWER(${bookName}) OR LOWER(name_luganda) = LOWER(${bookName}) LIMIT 1`;
    } catch { rows = await sql`SELECT id, name FROM bible_books WHERE LOWER(name) = LOWER(${bookName}) OR LOWER(name_luganda) = LOWER(${bookName}) LIMIT 1`; }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: `Book not found in bible_books: ${bookName}` }, { status: 404 });
    }
    const bookId = rows[0].id;

    const bookIntroEn = body.introduction || body.introduction_english || body.book_introduction || body.bookIntro || null;
    const bookIntroLg = body.introduction_luganda || body.book_introduction_luganda || null;
    const bookClosingEn = body.closing_prayer || body.closing_prayer_english || body.book_closing_prayer || body.bookClosing || null;
    const bookClosingLg = body.closing_prayer_luganda || body.book_closing_prayer_luganda || null;

    let counts = { chapters: 0, verses: 0, pray_read: 0, cross_refs: 0, chapter_intros: 0 };

    if (bookIntroEn || bookIntroLg) {
      await sql`
        INSERT INTO book_introductions (book_id, introduction_english, introduction_luganda)
        VALUES (${bookId}, ${bookIntroEn}, ${bookIntroLg})
        ON CONFLICT (book_id) DO UPDATE SET
          introduction_english = COALESCE(EXCLUDED.introduction_english, book_introductions.introduction_english),
          introduction_luganda = COALESCE(EXCLUDED.introduction_luganda, book_introductions.introduction_luganda),
          updated_at = NOW()`;
    }
    if (bookClosingEn || bookClosingLg) {
      await sql`
        INSERT INTO book_closing_prayers (book_id, prayer_english, prayer_luganda)
        VALUES (${bookId}, ${bookClosingEn}, ${bookClosingLg})
        ON CONFLICT (book_id) DO UPDATE SET
          prayer_english = COALESCE(EXCLUDED.prayer_english, book_closing_prayers.prayer_english),
          prayer_luganda = COALESCE(EXCLUDED.prayer_luganda, book_closing_prayers.prayer_luganda),
          updated_at = NOW()`;
    }

    const chapters = body.chapters || [];
    // Build a book-name -> id map once for cross-ref targets
    let allBooks: any[] = [];
    try { allBooks = await sql`SELECT id, name_english AS name, name_luganda, abbreviation_english AS abbreviation FROM bible_books`; }
    catch { try { allBooks = await sql`SELECT id, name, name_luganda, abbreviation FROM bible_books`; } catch { allBooks = await sql`SELECT id, name_english AS name FROM bible_books`; } }
    const byName = new Map<string, number>();
    for (const b of allBooks) {
      byName.set(String(b.name).toLowerCase(), b.id);
      if (b.name_luganda) byName.set(String(b.name_luganda).toLowerCase(), b.id);
      if (b.abbreviation) byName.set(String(b.abbreviation).toLowerCase().replace(/\.$/, ''), b.id);
    }
    // Short aliases
    const SHORT: Record<string, string> = { 'ex': 'Exodus', 'exod': 'Exodus', 'jn': 'John', 'jhn': 'John', 'matt': 'Matthew', 'mk': 'Mark', 'lk': 'Luke', 'rom': 'Romans', '1 cor': '1 Corinthians', '2 cor': '2 Corinthians', 'gal': 'Galatians', 'eph': 'Ephesians', 'phil': 'Philippians', 'col': 'Colossians', '1 thess': '1 Thessalonians', '2 thess': '2 Thessalonians', '1 tim': '1 Timothy', '2 tim': '2 Timothy', 'heb': 'Hebrews', 'jas': 'James', '1 pet': '1 Peter', '2 pet': '2 Peter', '1 jn': '1 John', '2 jn': '2 John', '3 jn': '3 John', 'rev': 'Revelation', 'ps': 'Psalms', 'prov': 'Proverbs', 'isa': 'Isaiah', 'jer': 'Jeremiah', 'gen': 'Genesis', 'deut': 'Deuteronomy', 'josh': 'Joshua', 'judg': 'Judges' };
    const resolveTargetId = (rawBook: string): number | null => {
      const key = rawBook.toLowerCase().trim().replace(/\.$/, '');
      if (SHORT[key]) return byName.get(SHORT[key].toLowerCase()) ?? null;
      // Longest-name-first: try full key, then try matching "1 john" style
      if (byName.has(key)) return byName.get(key)!;
      // Try stripping numbers: "John" already handled; fallback: find book whose name ends with key
      return null;
    };

    for (const ch of chapters) {
      const chapterNum = ch.chapter;
      const chIntroEn = ch.introduction || ch.introduction_english || null;
      const chIntroLg = ch.introduction_luganda || null;
      const chCloseEn = ch.closing_prayer || ch.closing_prayer_english || null;
      const chCloseLg = ch.closing_prayer_luganda || null;
      if (chIntroEn || chIntroLg || chCloseEn || chCloseLg) {
        await sql`
          INSERT INTO chapter_introductions (book_id, chapter, introduction_english, introduction_luganda, closing_prayer_english, closing_prayer_luganda)
          VALUES (${bookId}, ${chapterNum}, ${chIntroEn}, ${chIntroLg}, ${chCloseEn}, ${chCloseLg})
          ON CONFLICT (book_id, chapter) DO UPDATE SET
            introduction_english = COALESCE(EXCLUDED.introduction_english, chapter_introductions.introduction_english),
            introduction_luganda = COALESCE(EXCLUDED.introduction_luganda, chapter_introductions.introduction_luganda),
            closing_prayer_english = COALESCE(EXCLUDED.closing_prayer_english, chapter_introductions.closing_prayer_english),
            closing_prayer_luganda = COALESCE(EXCLUDED.closing_prayer_luganda, chapter_introductions.closing_prayer_luganda),
            updated_at = NOW()`;
        counts.chapter_intros++;
      }
      counts.chapters++;

      for (const v of ch.verses || []) {
        const verseNum = v.verse;
        const prayEn = v.pray_read || v.pray_read_english || v.prayer || v.prayer_passage || null;
        const prayLg = v.pray_read_luganda || v.prayer_luganda || null;
        if (prayEn || prayLg) {
          await sql`
            INSERT INTO verse_pray_read (book_id, chapter, verse, pray_read_english, pray_read_luganda)
            VALUES (${bookId}, ${chapterNum}, ${verseNum}, ${prayEn}, ${prayLg})
            ON CONFLICT (book_id, chapter, verse) DO UPDATE SET
              pray_read_english = COALESCE(EXCLUDED.pray_read_english, verse_pray_read.pray_read_english),
              pray_read_luganda = COALESCE(EXCLUDED.pray_read_luganda, verse_pray_read.pray_read_luganda),
              updated_at = NOW()`;
          counts.pray_read++;
        }
        counts.verses++;

        // Cross-refs: array of strings, or a single string with ;
        const rawRefs: string[] = Array.isArray(v.cross_references) ? v.cross_references : v.cross_references ? [String(v.cross_references)] : [];
        let lastBook: string | null = null;
        for (const refStr of rawRefs) {
          const parsed = parseRefs(String(refStr), lastBook);
          // update lastBook for bare continuations across entries
          if (parsed.length) lastBook = parsed[parsed.length - 1].book;
          for (const p of parsed) {
            const targetId = resolveTargetId(p.book);
            if (!targetId) continue;
            await sql`
              INSERT INTO cross_references (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type)
              VALUES (${bookId}, ${chapterNum}, ${verseNum}, ${targetId}, ${p.chapter}, ${p.verse}, 'related')
              ON CONFLICT (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse) DO NOTHING`;
            counts.cross_refs++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, book: bookName, book_id: bookId, counts });
  } catch (e: any) {
    console.error('book-chapter-bulk-import error', e);
    return NextResponse.json({ error: e?.message || 'Import failed' }, { status: 500 });
  }
}
