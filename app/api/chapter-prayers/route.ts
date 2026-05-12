import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookIdParam = searchParams.get('bookId');
    const bookName = searchParams.get('book');
    const chapter = searchParams.get('chapter');

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

    if (bookId && chapter) {
      // Get specific chapter prayer
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          en_prayer,
          lu_prayer,
          chapter_closing_prayer_audio_url,
          created_at,
          updated_at
        FROM chapter_prayers 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)}
      `;
      return NextResponse.json(result[0] || null);
    } else if (bookId) {
      // Get all chapter prayers for a book
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          en_prayer,
          lu_prayer,
          chapter_closing_prayer_audio_url,
          created_at,
          updated_at
        FROM chapter_prayers 
        WHERE book_id = ${parseInt(bookId)}
        ORDER BY chapter
      `;
      return NextResponse.json(result);
    } else {
      // Get all chapter prayers
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          en_prayer,
          lu_prayer,
          chapter_closing_prayer_audio_url,
          created_at,
          updated_at
        FROM chapter_prayers 
        ORDER BY book_id, chapter
      `;
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching chapter prayers:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch chapter prayers',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Support both camelCase and snake_case
    const bookId = body.bookId || body.book_id;
    const chapter = body.chapter;
    const enPrayer = body.enPrayer || body.en_prayer;
    const luPrayer = body.luPrayer || body.lu_prayer;
    const audioUrl = body.audioUrl || body.chapter_closing_prayer_audio_url;

    if (!bookId || !chapter) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId and chapter' },
        { status: 400 }
      );
    }

    // Insert chapter prayer
    const result = await sql`
      INSERT INTO chapter_prayers (book_id, chapter, en_prayer, lu_prayer, chapter_closing_prayer_audio_url)
      VALUES (${bookId}, ${chapter}, ${enPrayer || ''}, ${luPrayer || ''}, ${audioUrl || null})
      RETURNING *
    `;

    return NextResponse.json({ success: true, prayer: result[0] });
  } catch (error) {
    console.error('Error saving chapter prayer:', error);
    return NextResponse.json({ 
      error: 'Failed to save chapter prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // Support both camelCase and snake_case
    const id = body.id;
    const enPrayer = body.enPrayer || body.en_prayer;
    const luPrayer = body.luPrayer || body.lu_prayer;
    const audioUrl = body.audioUrl || body.chapter_closing_prayer_audio_url;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Update chapter prayer
    const result = await sql`
      UPDATE chapter_prayers
      SET
        en_prayer = ${enPrayer || ''},
        lu_prayer = ${luPrayer || ''},
        chapter_closing_prayer_audio_url = ${audioUrl || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Chapter prayer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, prayer: result[0] });
  } catch (error) {
    console.error('Error updating chapter prayer:', error);
    return NextResponse.json({ 
      error: 'Failed to update chapter prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');

    // Delete by id if provided
    if (id) {
      await sql`
        DELETE FROM chapter_prayers 
        WHERE id = ${parseInt(id)}
      `;
    } else if (bookId && chapter) {
      // Delete by bookId and chapter
      await sql`
        DELETE FROM chapter_prayers 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)}
      `;
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters: id or (bookId and chapter)' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter prayer:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chapter prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
