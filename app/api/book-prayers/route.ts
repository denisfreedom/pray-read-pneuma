import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookIdParam = searchParams.get('bookId');
    const bookName = searchParams.get('book');

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

    if (bookId) {
      // Get specific book prayer
      const result = await sql`
        SELECT 
          id,
          book_id,
          en_prayer,
          lu_prayer,
          closing_prayer_audio_url,
          created_at,
          updated_at
        FROM book_prayers 
        WHERE book_id = ${parseInt(bookId)}
      `;
      return NextResponse.json(result[0] || null);
    } else {
      // Get all book prayers
      const result = await sql`
        SELECT 
          id,
          book_id,
          en_prayer,
          lu_prayer,
          closing_prayer_audio_url,
          created_at,
          updated_at
        FROM book_prayers 
        ORDER BY book_id
      `;
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching book prayers:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch book prayers',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Support both camelCase (old) and snake_case (new) field names
    const bookId = body.book_id || body.bookId;
    const enPrayer = body.en_prayer || body.enPrayer;
    const luPrayer = body.lu_prayer || body.luPrayer;
    const audioUrl = body.closing_prayer_audio_url || body.audioUrl;
    const id = body.id; // for updates

    if (!bookId) {
      return NextResponse.json(
        { error: 'Missing required field: book_id' },
        { status: 400 }
      );
    }

    // Check if prayer already exists
    const existing = await sql`
      SELECT id FROM book_prayers WHERE book_id = ${bookId}
    `;

    if (existing.length > 0) {
      // Update existing
      const result = await sql`
        UPDATE book_prayers 
        SET 
          en_prayer = ${enPrayer || ''},
          lu_prayer = ${luPrayer || ''},
          closing_prayer_audio_url = ${audioUrl || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ${bookId}
        RETURNING *
      `;
      return NextResponse.json({ success: true, message: 'Prayer updated', prayer: result[0] });
    } else {
      // Insert new
      const result = await sql`
        INSERT INTO book_prayers (book_id, en_prayer, lu_prayer, closing_prayer_audio_url)
        VALUES (${bookId}, ${enPrayer || ''}, ${luPrayer || ''}, ${audioUrl || null})
        RETURNING *
      `;
      return NextResponse.json({ success: true, message: 'Prayer created', prayer: result[0] });
    }
  } catch (error) {
    console.error('Error saving book prayer:', error);
    return NextResponse.json({ 
      error: 'Failed to save book prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // Support both camelCase and snake_case field names
    const id = body.id;
    const enPrayer = body.en_prayer || body.enPrayer;
    const luPrayer = body.lu_prayer || body.luPrayer;
    const audioUrl = body.closing_prayer_audio_url || body.audioUrl;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Update book prayer
    const result = await sql`
      UPDATE book_prayers 
      SET 
        en_prayer = ${enPrayer || ''},
        lu_prayer = ${luPrayer || ''},
        closing_prayer_audio_url = ${audioUrl || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Prayer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Prayer updated', prayer: result[0] });
  } catch (error) {
    console.error('Error updating book prayer:', error);
    return NextResponse.json({ 
      error: 'Failed to update book prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bookId = searchParams.get('bookId');

    if (id) {
      // Delete by id
      await sql`
        DELETE FROM book_prayers 
        WHERE id = ${parseInt(id)}
      `;
      return NextResponse.json({ success: true });
    } else if (bookId) {
      // Delete by bookId (legacy)
      await sql`
        DELETE FROM book_prayers 
        WHERE book_id = ${parseInt(bookId)}
      `;
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Missing required parameter: id or bookId' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting book prayer:', error);
    return NextResponse.json({ 
      error: 'Failed to delete book prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
