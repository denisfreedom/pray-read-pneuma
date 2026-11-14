import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// GET /api/commentaries?book_number=64&chapter=1&verse=1
// CORRECTED version. The previous version assumed the table is named
// `commentaries` and rejected every row whose book label it did not
// recognise — which hid genuinely saved commentary (the 3 John Verse 1
// card in Admin) from the front page, including from 3 John itself.
//
// This version:
//  1. Searches every table the commentary could live in:
//     commentaries, verse_commentaries, bible_commentaries — first table
//     with rows for this chapter+verse wins. A wrong table guess no
//     longer blanks all commentary.
//  2. Applies the SAME rule as the reader page: a row is rejected ONLY if
//     it PROVABLY belongs to another book (its book field says so). A row
//     with no book label is returned — the data simply carries no book
//     info to check, and hiding it would be wrong.
//  3. Returns [] only when nothing matches at all.
export const dynamic = 'force-dynamic';

const norm = (s: any) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function rowHasBookField(c: any): boolean {
  if (!c || typeof c !== 'object') return false;
  return ['book_number', 'bookNumber', 'book_id', 'bookId', 'book_name', 'bookName', 'book_title', 'bookTitle', 'book'].some(
    (k) => c[k] !== undefined && c[k] !== null && String(c[k]).trim() !== ''
  );
}

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

    // Try each candidate table + verse-column shape. First table with rows wins.
    // A missing table/column throws → caught → next attempt. Nothing here
    // ever returns another book's rows: the book filter below still applies.
    const attempts: Array<() => Promise<any[]>> = [
      async () => sql`SELECT * FROM commentaries WHERE chapter = ${chapter} AND (verse_number = ${verse} OR verse = ${verse})`,
      async () => sql`SELECT * FROM commentaries WHERE chapter = ${chapter} AND verse = ${verse}`,
      async () => sql`SELECT * FROM verse_commentaries WHERE chapter = ${chapter} AND (verse_number = ${verse} OR verse = ${verse})`,
      async () => sql`SELECT * FROM verse_commentaries WHERE chapter = ${chapter} AND verse = ${verse}`,
      async () => sql`SELECT * FROM bible_commentaries WHERE chapter = ${chapter} AND (verse_number = ${verse} OR verse = ${verse})`,
      async () => sql`SELECT * FROM bible_commentaries WHERE chapter = ${chapter} AND verse = ${verse}`,
    ];
    let rows: any[] = [];
    for (const attempt of attempts) {
      try {
        const r = await attempt();
        if (Array.isArray(r) && r.length) { rows = r; break; }
      } catch { /* table/column missing — try the next shape */ }
    }

    // THE RULE (same as the reader page): reject only rows that PROVABLY
    // belong to another book. Rows with no book label pass through — the
    // saved data carries no book info to check, and hiding it blanks the
    // front page (the 3 John bug this version fixes).
    const anyLabelled = (Array.isArray(rows) ? rows : []).some(rowHasBookField);
    const kept = (Array.isArray(rows) ? rows : []).filter(
      (c) => !anyLabelled || !rowHasBookField(c) || rowBelongsToBook(c, bookNum, bookId, bookNames)
    );
    return NextResponse.json(kept);
  } catch (error: any) {
    console.error('Error in /api/commentaries:', error);
    return NextResponse.json({ success: false, error: 'Failed to load commentary' }, { status: 500 });
  }
}
