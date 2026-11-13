import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// POST /api/commentaries/bulk — FIXED V3 (import fix)
// Fixes vs V1/V2:
//  0) Import: '@/lib/sql' does NOT exist in this repo. Working routes use default import from '@/app/api/utils/sql'. That was the Vercel 'Module not found' error.
// Fixes vs V1:
//  1) Removed unused `action` variable — it failed Vercel build with noUnusedLocals.
//  2) sql() result shape: @vercel/postgres returns { rows: [...] }, neon returns [...] directly.
//     V1 did rows?.[0] which is undefined for {rows} shape, so book lookup always missed.
//     V2 normalises both: Array.isArray(res) ? res : res.rows
//  3) INSERT ... RETURNING handling also normalised the same way.
// Body: { books: [{ bookName, bookNumber, book:{en,lu}, chapters:[{chapter,en,lu,verses:[{chapter,verse,en,lu}]}] }], replace: boolean }
// Distributes ONE file to 3 tables: book_commentaries, chapter_commentaries, commentaries (verse).
// replace=true (default): ON CONFLICT upsert = re-upload OVERWRITES. replace=false: DO NOTHING = skip existing.

function rowsOf(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.rows)) return res.rows;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const { books, replace = true } = await req.json().catch(() => ({} as any));
    if (!Array.isArray(books) || !books.length) return NextResponse.json({ error: 'No books in file' }, { status: 400 });

    await sql`CREATE TABLE IF NOT EXISTS book_commentaries (id SERIAL PRIMARY KEY, book_id INT, book_number INT, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(book_id))`;
    await sql`CREATE TABLE IF NOT EXISTS chapter_commentaries (id SERIAL PRIMARY KEY, book_id INT, book_number INT, chapter INT, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(book_id, chapter))`;
    await sql`CREATE TABLE IF NOT EXISTS commentaries (id SERIAL PRIMARY KEY, book_id INT, book_number INT, chapter INT, verse_number INT, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(book_id, chapter, verse_number))`;
    try { await sql`ALTER TABLE book_commentaries ADD COLUMN IF NOT EXISTS book_number INT`; } catch {}
    try { await sql`ALTER TABLE chapter_commentaries ADD COLUMN IF NOT EXISTS book_number INT`; } catch {}
    try { await sql`ALTER TABLE commentaries ADD COLUMN IF NOT EXISTS book_number INT`; } catch {}

    let bookCount = 0, chapterCount = 0, verseCount = 0, replaced = 0, skipped = 0;

    for (const b of books) {
      let bookId: number | null = null;
      try {
        const res: any = b.bookNumber
          ? await sql`SELECT id FROM bible_books WHERE book_number = ${Number(b.bookNumber)} LIMIT 1`
          : await sql`SELECT id FROM bible_books WHERE LOWER(name) = LOWER(${String(b.bookName || '')}) LIMIT 1`;
        const arr = rowsOf(res);
        bookId = arr?.[0]?.id ?? null;
      } catch {}
      if (!bookId) { skipped += 1; continue; }
      const bn = Number(b.bookNumber || 0);

      if (b.book?.en || b.book?.lu) {
        if (replace) {
          await sql`INSERT INTO book_commentaries (book_id, book_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${b.book.en || null}, ${b.book.lu || null}) ON CONFLICT (book_id) DO UPDATE SET commentary_text = EXCLUDED.commentary_text, luganda_commentary_text = EXCLUDED.luganda_commentary_text, updated_at = NOW()`;
          replaced++;
        } else {
          const r: any = await sql`INSERT INTO book_commentaries (book_id, book_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${b.book.en || null}, ${b.book.lu || null}) ON CONFLICT (book_id) DO NOTHING RETURNING id`;
          if (!rowsOf(r).length) { skipped++; continue; }
        }
        bookCount++;
      }

      for (const ch of b.chapters || []) {
        const chNum = Number(ch.chapter || 0);
        if (!chNum) continue;
        if (ch.en || ch.lu) {
          if (replace) {
            await sql`INSERT INTO chapter_commentaries (book_id, book_number, chapter, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${ch.en || null}, ${ch.lu || null}) ON CONFLICT (book_id, chapter) DO UPDATE SET commentary_text = EXCLUDED.commentary_text, luganda_commentary_text = EXCLUDED.luganda_commentary_text, updated_at = NOW()`;
            replaced++;
          } else {
            const r: any = await sql`INSERT INTO chapter_commentaries (book_id, book_number, chapter, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${ch.en || null}, ${ch.lu || null}) ON CONFLICT (book_id, chapter) DO NOTHING RETURNING id`;
            if (!rowsOf(r).length) { skipped++; continue; }
          }
          chapterCount++;
        }
        for (const v of ch.verses || []) {
          const vNum = Number(v.verse || 0);
          if (!vNum || (!v.en && !v.lu)) continue;
          if (replace) {
            await sql`INSERT INTO commentaries (book_id, book_number, chapter, verse_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${vNum}, ${v.en || null}, ${v.lu || null}) ON CONFLICT (book_id, chapter, verse_number) DO UPDATE SET commentary_text = EXCLUDED.commentary_text, luganda_commentary_text = EXCLUDED.luganda_commentary_text, updated_at = NOW()`;
            replaced++;
          } else {
            const r: any = await sql`INSERT INTO commentaries (book_id, book_number, chapter, verse_number, commentary_text, luganda_commentary_text) VALUES (${bookId}, ${bn}, ${chNum}, ${vNum}, ${v.en || null}, ${v.lu || null}) ON CONFLICT (book_id, chapter, verse_number) DO NOTHING RETURNING id`;
            if (!rowsOf(r).length) { skipped++; continue; }
          }
          verseCount++;
        }
      }
    }
    return NextResponse.json({ ok: true, book: bookCount, chapters: chapterCount, verses: verseCount, replaced, skipped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Bulk failed' }, { status: 500 });
  }
}
