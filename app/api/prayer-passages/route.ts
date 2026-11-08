import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookIdParam = searchParams.get('bookId');
    const bookName = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const verseNumberParam = searchParams.get('verseNumber');
    const verseParam = searchParams.get('verse');

    // Support both 'verseNumber' and 'verse' parameter names
    const verseNumber = verseNumberParam || verseParam;

    // If book name is provided instead of bookId, look it up
    let bookId = bookIdParam;
    if (bookName && !bookId) {
      const bookResult = await sql`
        SELECT id FROM bible_books WHERE name_english = ${bookName}
      `;
      if (bookResult.length > 0) {
        bookId = String(bookResult[0].id);
      }
    }

    if (!bookId || !chapter) {
      return NextResponse.json({ error: 'Missing bookId/book and chapter' }, { status: 400 });
    }

    const bId = parseInt(bookId);
    const ch = parseInt(chapter);
    const v = verseNumber ? parseInt(verseNumber) : null;

    // NEW TABLE FIRST: verse_pray_read
    if (v !== null) {
      try {
        const rows: any[] = await sql`
          SELECT book_id, chapter, verse as verse_number,
                 pray_read_english as english_prayer,
                 pray_read_luganda as luganda_prayer,
                 pray_read_english as prayer_text,
                 pray_read_english as english_prayer_text,
                 pray_read_luganda as luganda_prayer_text
          FROM verse_pray_read
          WHERE book_id = ${bId} AND chapter = ${ch} AND verse = ${v}
          LIMIT 1
        `;
        if (rows.length) return NextResponse.json(rows[0]);
      } catch {}
      // FALLBACK: old prayer_passages / verse_prayers tables
      try {
        const rows: any[] = await sql`
          SELECT * FROM prayer_passages
          WHERE book_id = ${bId} AND chapter = ${ch} AND verse_number = ${v}
          LIMIT 1
        `;
        if (rows.length) return NextResponse.json(rows[0]);
      } catch {}
      try {
        const rows: any[] = await sql`
          SELECT verse_number, english_prayer, luganda_prayer
          FROM verse_prayers
          WHERE book_id = ${bId} AND chapter = ${ch} AND verse_number = ${v}
          LIMIT 1
        `;
        if (rows.length) return NextResponse.json(rows[0]);
      } catch {}
      return NextResponse.json(null);
    }

    // No single verse requested — return whole chapter list (same shape as verse-prayers)
    try {
      const rows: any[] = await sql`
        SELECT verse as verse_number,
               pray_read_english as english_prayer,
               pray_read_luganda as luganda_prayer
        FROM verse_pray_read
        WHERE book_id = ${bId} AND chapter = ${ch}
        ORDER BY verse
      `;
      if (rows.length) return NextResponse.json(rows);
    } catch {}
    return NextResponse.json([]);
  } catch (e: any) {
    console.error('prayer-passages error', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
