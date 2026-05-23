import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

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
        bookId = bookResult[0].id.toString();
      }
    }

    if (bookId && chapter && verseNumber) {
      // Get specific verse prayer passage
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse_number,
          english_prayer,
          luganda_prayer,
          created_at,
          updated_at
        FROM verse_prayers 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)} 
        AND verse_number = ${parseInt(verseNumber)}
      `;
      return NextResponse.json(result[0] || null);
    } else if (bookId && chapter) {
      // Get all prayer passages for a chapter
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse_number,
          english_prayer,
          luganda_prayer,
          created_at,
          updated_at
        FROM verse_prayers 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)}
        ORDER BY verse_number
      `;
      return NextResponse.json(result);
    } else {
      // Get all prayer passages
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse_number,
          english_prayer,
          luganda_prayer,
          created_at,
          updated_at
        FROM verse_prayers 
        ORDER BY book_id, chapter, verse_number
      `;
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching prayer passages:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch prayer passages',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapter, verseNumber, englishPrayer, lugandaPrayer } = body;

    if (!bookId || !chapter || !verseNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Always use UPSERT to insert or update prayer passages
    const result = await sql`
      INSERT INTO verse_prayers (book_id, chapter, verse_number, english_prayer, luganda_prayer)
      VALUES (${bookId}, ${chapter}, ${verseNumber}, ${englishPrayer || ''}, ${lugandaPrayer || ''})
      ON CONFLICT (book_id, chapter, verse_number) 
      DO UPDATE SET 
        english_prayer = ${englishPrayer || ''},
        luganda_prayer = ${lugandaPrayer || ''},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    return NextResponse.json({ success: true, prayer: result[0] });
  } catch (error) {
    console.error('Error saving prayer passage:', error);
    return NextResponse.json({ 
      error: 'Failed to save prayer passage',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verseNumber = searchParams.get('verseNumber');

    if (!bookId || !chapter || !verseNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM verse_prayers 
      WHERE book_id = ${parseInt(bookId)} 
      AND chapter = ${parseInt(chapter)} 
      AND verse_number = ${parseInt(verseNumber)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prayer passage:', error);
    return NextResponse.json({ 
      error: 'Failed to delete prayer passage',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
