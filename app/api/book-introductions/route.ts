import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// GET /api/book-introductions?bookId=64  OR ?book_number=64  OR ?book=3 John
// Returns BOTH English + Luganda: book intro + book closing prayer
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let bookId = searchParams.get('bookId') || searchParams.get('book_id');
    const book_number = searchParams.get('book_number');
    const bookName = searchParams.get('book');

    let bId: number | null = bookId ? parseInt(bookId) : null;
    if (!bId && book_number) {
      try {
        const rows = await sql`SELECT id FROM bible_books WHERE book_number = ${parseInt(book_number)} LIMIT 1`;
        if (rows.length) bId = rows[0].id;
      } catch {}
    }
    if (!bId && bookName) {
      try {
        const rows = await sql`SELECT id FROM bible_books WHERE LOWER(name_english) = LOWER(${bookName}) OR LOWER(name_luganda) = LOWER(${bookName}) LIMIT 1`;
        if (rows.length) bId = rows[0].id;
      } catch {}
    }
    if (!bId) return NextResponse.json(null);

    // Book Introduction — NEW table
    let introEn: string | null = null, introLu: string | null = null;
    try {
      const rows = await sql`SELECT introduction_english, introduction_luganda FROM book_introductions WHERE book_id = ${bId} LIMIT 1`;
      if (rows.length) { introEn = rows[0].introduction_english; introLu = rows[0].introduction_luganda; }
    } catch {}
    // Fallback old column names
    if (!introEn && !introLu) {
      try {
        const rows = await sql`SELECT * FROM book_introductions WHERE book_id = ${bId} LIMIT 1`;
        if (rows.length) {
          const r = rows[0];
          introEn = r.en_introduction || r.introduction_english || r.english_introduction || null;
          introLu = r.lu_introduction || r.introduction_luganda || r.luganda_introduction || null;
        }
      } catch {}
    }

    // Book Closing Prayer — NEW table
    let closeEn: string | null = null, closeLu: string | null = null;
    try {
      const rows = await sql`SELECT prayer_english, prayer_luganda FROM book_closing_prayers WHERE book_id = ${bId} LIMIT 1`;
      if (rows.length) { closeEn = rows[0].prayer_english; closeLu = rows[0].prayer_luganda; }
    } catch {}
    if (!closeEn && !closeLu) {
      try {
        const rows = await sql`SELECT * FROM book_closing_prayers WHERE book_id = ${bId} LIMIT 1`;
        if (rows.length) {
          const r = rows[0];
          closeEn = r.en_prayer || r.prayer_english || r.closing_prayer_english || null;
          closeLu = r.lu_prayer || r.prayer_luganda || r.closing_prayer_luganda || null;
        }
      } catch {}
    }

    if (!introEn && !introLu && !closeEn && !closeLu) return NextResponse.json(null);

    return NextResponse.json({
      book_id: bId,
      // Book Introduction — both languages, both naming styles for Reader compatibility
      en_introduction: introEn,
      lu_introduction: introLu,
      introduction_english: introEn,
      introduction_luganda: introLu,
      // Book Closing Prayer — both languages
      en_closing_prayer: closeEn,
      lu_closing_prayer: closeLu,
      prayer_english: closeEn,
      prayer_luganda: closeLu,
      closing_prayer_english: closeEn,
      closing_prayer_luganda: closeLu,
    });
  } catch (e: any) {
    return NextResponse.json(null, { status: 200 });
  }
}
