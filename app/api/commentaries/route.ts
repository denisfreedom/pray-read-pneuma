import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// GET /api/commentaries?book_number=1&chapter=1&verse=1
// SERVER-SIDE FIX for the "3 John commentary appears in Genesis" bug.
//
// The old endpoint filtered by chapter + verse only and returned the first
// row it found — so a request for Genesis 1:1 could return 3 John 1:1's
// commentary ("The Epistle opens... John's love for Gaius..."), and the
// reader showed it. The reader page now ALSO verifies the book, but the API
// must never leak another book's rows at all.
//
// This route therefore:
//  1. Fetches rows by chapter + verse (the columns that certainly exist).
//  2. Keeps ONLY rows whose own book field proves they belong to the
//     requested book: book_number / book_id / book name.
//  3. Returns [] when nothing matches — an empty result is correct,
//     another book's commentary is not.
export const dynamic = 'force-dynamic';

const norm = (s: any) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function rowBelongsToBook(c: any, bookNum: number, bookId: number, bookNames: string[]): boolean {
  if (!c || typeof c !== 'object') return false;
  for (const f of [c.book_number, c.bookNumber, c.book_id, c.bookId]) {
    const n = Number(f);
    if (!Number.isNaN(n) && n > 0 && (n === bookNum || n === bookId)) return true;
  }
  const want = bookNames.map(norm).filter(Boolean);
  for (const f of [c.book_name, c.bookName, c.book_title, c.bookTitle, c.book]) {
    if (typeof f === 'string' && f.trim() && want.includes(norm(f))) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookNum = parseInt(String(searchParams.get('book_number') || searchParams.get('book') || searchParams.get('bookId') || searchParams.get('book_id') || ''), 10);
    const chapter = parseInt(String(searchParams.get('chapter') || ''), 10);
    const verse = parseInt(String(searchParams.get('verse') || searchParams.get('verse_number') || ''), 10);
    if (Number.isNaN(bookNum) || Number.isNaN(chapter) || Number.isNaN(verse)) {
      return NextResponse.json({ success: false, error: 'book, chapter and verse are required' }, { status: 400 });
    }

    // Resolve the book's id + names so name-stored rows can match too.
    // If the books table is unreachable, numeric matching still works.
    let bookId = bookNum;
    const bookNames: string[] = [];
    try {
      const b: any[] = await sql`SELECT * FROM bible_books WHERE book_number = ${bookNum} LIMIT 1`;
      if (b[0]) {
        if (b[0].id) bookId = Number(b[0].id);
        for (const k of ['name_english', 'name', 'book_name', 'name_luganda']) {
          if (b[0][k]) bookNames.push(String(b[0][k]));
        }
      }
    } catch { /* books table missing — numeric match only */ }

    // Fetch by chapter + verse. verse_number may not exist as a column, so
    // try it first and fall back to verse only.
    let rows: any[] = [];
    try {
      rows = await sql`SELECT * FROM commentaries WHERE chapter = ${chapter} AND (verse_number = ${verse} OR verse = ${verse})`;
    } catch {
      try {
        rows = await sql`SELECT * FROM commentaries WHERE chapter = ${chapter} AND verse = ${verse}`;
      } catch {
        return NextResponse.json([]);
      }
    }

    // THE FIX: drop every row that does not belong to this book.
    const kept = (Array.isArray(rows) ? rows : []).filter((c) => rowBelongsToBook(c, bookNum, bookId, bookNames));
    return NextResponse.json(kept);
  } catch (error: any) {
    console.error('Error in /api/commentaries:', error);
    return NextResponse.json({ success: false, error: 'Failed to load commentary' }, { status: 500 });
  }
}
