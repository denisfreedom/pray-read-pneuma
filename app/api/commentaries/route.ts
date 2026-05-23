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
      // Get specific verse commentary
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse_number,
          commentary_text,
          luganda_commentary_text,
          created_at,
          updated_at
        FROM verse_commentaries 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)} 
        AND verse_number = ${parseInt(verseNumber)}
      `;
      return NextResponse.json(result[0] || null);
    } else if (bookId && chapter) {
      // Get all commentaries for a chapter
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse_number,
          commentary_text,
          luganda_commentary_text,
          created_at,
          updated_at
        FROM verse_commentaries 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)}
        ORDER BY verse_number
      `;
      return NextResponse.json(result);
    } else {
      // Get all commentaries
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse_number,
          commentary_text,
          luganda_commentary_text,
          created_at,
          updated_at
        FROM verse_commentaries 
        ORDER BY book_id, chapter, verse_number
      `;
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching commentaries:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch commentaries',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapter, verseNumber, commentaryText, lugandaCommentaryText } = body;

    if (!bookId || !chapter || !verseNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Always use UPSERT to insert or update commentaries
    const result = await sql`
      INSERT INTO verse_commentaries (book_id, chapter, verse_number, commentary_text, luganda_commentary_text)
      VALUES (${bookId}, ${chapter}, ${verseNumber}, ${commentaryText || ''}, ${lugandaCommentaryText || ''})
      ON CONFLICT (book_id, chapter, verse_number) 
      DO UPDATE SET 
        commentary_text = ${commentaryText || ''},
        luganda_commentary_text = ${lugandaCommentaryText || ''},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    return NextResponse.json({ success: true, commentary: result[0] });
  } catch (error) {
    console.error('Error saving commentary:', error);
    return NextResponse.json({ 
      error: 'Failed to save commentary',
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
      DELETE FROM verse_commentaries 
      WHERE book_id = ${parseInt(bookId)} 
      AND chapter = ${parseInt(chapter)} 
      AND verse_number = ${parseInt(verseNumber)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting commentary:', error);
    return NextResponse.json({ 
      error: 'Failed to delete commentary',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
