import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/sql';

// POST /api/commentaries/bulk
// Body: { books: [{ bookName, bookNumber, book:{en,lu}, chapters:[{chapter,en,lu,verses:[{chapter,verse,en,lu}]}] }], replace: boolean }
// Distributes ONE file to 3 tables at once: book_commentaries, chapter_commentaries, commentaries (verse).
// replace=true (default): ON CONFLICT upsert = re-upload OVERWRITES. replace=false: ON CONFLICT DO NOTHING = skip existing.
// Creates tables if they don't exist yet (so bulk works even before Manual saves).
export async function POST(req: NextRequest) {
  try {
    const { books, replace = true } = await req.json().catch(() => ({}));
    if (!Array.isArray(books) || !books.length) return NextResponse.json({ error: 'No books in file' }, { status: 400 });

    await sql`CREATE TABLE IF NOT EXISTS book_commentaries (id SERIAL PRIMARY KEY, book_id INT, book_number INT, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(book_id))`;
    await sql`CREATE TABLE IF NOT EXISTS chapter_commentaries (id SERIAL PRIMARY KEY, book_id INT, book_number INT, chapter INT, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(book_id, chapter))`;
    await sql`CREATE TABLE IF NOT EXISTS commentaries (id SERIAL PRIMARY KEY, book_id INT, book_number INT, chapter INT, verse_number INT, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(book_id, chapter, verse_number))`;
    // Older installs may lack book_number column — add it if missing (safe, idempotent)
    try { await sql`ALTER TABLE book_commentaries ADD COLUMN IF NOT EXISTS book_number INT`; } catch {}
    try { await sql`ALTER TABLE chapter_commentaries ADD COLUMN IF NOT EXISTS book_number INT`; } catch {}
    try { await sql`ALTER TABLE commentaries ADD COLUMN IF NOT EXISTS book_number INT`; } catch {}

    let bookCount = 0, chapterCount = 0, verseCount = 0, replaced = 0, skipped = 0;
    const action = replace ? 'replaced' : 'skipped';

    for (const b of books) {
      // Resolve book_id from bible_books by number or name
      let bookId: number | null = null;
      try {
        const rows: any = b.bookNumber
          ? await sql`SELECT id FROM bible_books WHERE book_number = ${Number(b.bookNumber)} LIMIT 1`
          : await sql`SELECT id FROM bible_books WHERE LOWER(name) = LOWER(${String(b.bookName || '')}) LIMIT 1`;
        bookId = rows?.[0]?.id ?? null;
      } catch {}
      if (!bookId) { skipped += 1; continue; }
      const bn = Number(b.bookNumber || 0);

      // 1) BOOK
      if (b.book?.en || b.book?.lu) {
        if (replace) { await sql`INSERT INTO book_commentaries (book_id, book_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${b.book.en || null}, ${b.book.lu || null}) ON CONFLICT (book_id) DO UPDATE SET commentary_text = EXCLUDED.commentary_text, luganda_commentary_text = EXCLUDED.luganda_commentary_text, updated_at = NOW()`; replaced++; }
        else { const r: any = await sql`INSERT INTO book_commentaries (book_id, book_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${b.book.en || null}, ${b.book.lu || null}) ON CONFLICT (book_id) DO NOTHING RETURNING id`; if (r.length) bookCount++; else skipped++; continue; }
        bookCount++;
      }
      // 2) CHAPTERS + 3) VERSES
      for (const ch of b.chapters || []) {
        const chNum = Number(ch.chapter || 0); if (!chNum) continue;
        if (ch.en || ch.lu) {
          if (replace) { await sql`INSERT INTO chapter_commentaries (book_id, book_number, chapter, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${ch.en || null}, ${ch.lu || null}) ON CONFLICT (book_id, chapter) DO UPDATE SET commentary_text = EXCLUDED.commentary_text, luganda_commentary_text = EXCLUDED.luganda_commentary_text, updated_at = NOW()`; replaced++; }
          else { const r: any = await sql`INSERT INTO chapter_commentaries (book_id, book_number, chapter, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${ch.en || null}, ${ch.lu || null}) ON CONFLICT (book_id, chapter) DO NOTHING RETURNING id`; if (!r.length) { skipped++; } else chapterCount++; continue; }
          chapterCount++;
        }
        for (const v of ch.verses || []) {
          const vNum = Number(v.verse || 0); if (!vNum || (!v.en && !v.lu)) continue;
          if (replace) { await sql`INSERT INTO commentaries (book_id, book_number, chapter, verse_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${vNum}, ${v.en || null}, ${v.lu || null}) ON CONFLICT (book_id, chapter, verse_number) DO UPDATE SET commentary_text = EXCLUDED.commentary_text, luganda_commentary_text = EXCLUDED.luganda_commentary_text, updated_at = NOW()`; replaced++; }
          else { const r: any = await sql`INSERT INTO commentaries (book_id, book_number, chapter, verse_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${vNum}, ${v.en || null}, ${v.lu || null}) ON CONFLICT (book_id, chapter, verse_number) DO NOTHING RETURNING id`; if (!r.length) { skipped++; continue; } }
          verseCount++;
        }
      }
    }
    return NextResponse.json({ ok: true, book: bookCount, chapters: chapterCount, verses: verseCount, replaced, skipped, action });
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Bulk failed' }, { status: 500 }); }
}
