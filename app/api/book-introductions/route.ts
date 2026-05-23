import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const headers = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const bookName = searchParams.get('book');

    // If book name is provided, look it up
    let effectiveBookId = bookId;
    if (bookName && !effectiveBookId) {
      const bookResult = await sql`
        SELECT id FROM bible_books WHERE name_english = ${bookName}
      `;
      if (bookResult.length > 0) {
        effectiveBookId = bookResult[0].id.toString();
      }
    }

    if (effectiveBookId) {
      // Get specific book introduction
      const result = await sql`
        SELECT 
          id,
          book_id,
          en_introduction,
          lu_introduction,
          audio_url,
          created_at,
          updated_at
        FROM book_introductions 
        WHERE book_id = ${parseInt(effectiveBookId)}
      `;
      return NextResponse.json(result[0] || null, { headers });
    } else {
      // Get all book introductions
      const result = await sql`
        SELECT 
          id,
          book_id,
          en_introduction,
          lu_introduction,
          audio_url,
          created_at,
          updated_at
        FROM book_introductions 
        ORDER BY book_id
      `;
      return NextResponse.json(result, { headers });
    }
  } catch (error) {
    console.error('Error fetching book introductions:', error);
    return NextResponse.json({
      error: 'Failed to fetch book introductions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, en_introduction, lu_introduction, audio_url } = body;

    if (!book_id) {
      return NextResponse.json(
        { error: 'Missing required field: book_id' },
        { status: 400, headers }
      );
    }

    // Check if introduction already exists
    const existing = await sql`
      SELECT id FROM book_introductions
      WHERE book_id = ${book_id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update existing
      await sql`
        UPDATE book_introductions 
        SET 
          en_introduction = ${en_introduction || ''},
          lu_introduction = ${lu_introduction || ''},
          audio_url = ${audio_url || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ${book_id}
      `;
      return NextResponse.json({ success: true, message: 'Book introduction updated successfully!' }, { headers });
    } else {
      // Insert new
      await sql`
        INSERT INTO book_introductions (book_id, en_introduction, lu_introduction, audio_url, created_at, updated_at)
        VALUES (${book_id}, ${en_introduction || ''}, ${lu_introduction || ''}, ${audio_url || null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      return NextResponse.json({ success: true, message: 'Book introduction saved successfully!' }, { headers });
    }
  } catch (error) {
    console.error('Error saving book introduction:', error);
    return NextResponse.json({
      error: 'Failed to save book introduction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, book_id, en_introduction, lu_introduction, audio_url } = body;

    if (!id && !book_id) {
      return NextResponse.json(
        { error: 'Missing required field: id or book_id' },
        { status: 400, headers }
      );
    }

    const updateId = id || book_id;

    await sql`
      UPDATE book_introductions 
      SET 
        en_introduction = ${en_introduction || ''},
        lu_introduction = ${lu_introduction || ''},
        audio_url = ${audio_url || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${updateId} OR book_id = ${updateId}
    `;

    return NextResponse.json({ success: true, message: 'Book introduction updated successfully!' }, { headers });
  } catch (error) {
    console.error('Error updating book introduction:', error);
    return NextResponse.json({
      error: 'Failed to update book introduction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookId' },
        { status: 400, headers }
      );
    }

    await sql`
      DELETE FROM book_introductions 
      WHERE book_id = ${parseInt(bookId)}
    `;

    return NextResponse.json({ success: true, message: 'Book introduction deleted!' }, { headers });
  } catch (error) {
    console.error('Error deleting book introduction:', error);
    return NextResponse.json({
      error: 'Failed to delete book introduction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}
