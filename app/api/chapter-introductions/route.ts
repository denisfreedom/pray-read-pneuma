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
    const chapter = searchParams.get('chapter');

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

    if (effectiveBookId && chapter) {
      // Get specific chapter introduction
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          en_introduction,
          lu_introduction,
          audio_url,
          chapter_audio_url,
          closing_prayer_audio_url,
          created_at,
          updated_at
        FROM chapter_introductions 
        WHERE book_id = ${parseInt(effectiveBookId)} 
        AND chapter = ${parseInt(chapter)}
      `;
      return NextResponse.json(result[0] || null, { headers });
    } else if (effectiveBookId) {
      // Get all chapter introductions for a book
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          en_introduction,
          lu_introduction,
          audio_url,
          chapter_audio_url,
          closing_prayer_audio_url,
          created_at,
          updated_at
        FROM chapter_introductions 
        WHERE book_id = ${parseInt(effectiveBookId)}
        ORDER BY chapter
      `;
      return NextResponse.json(result, { headers });
    } else {
      // Get all chapter introductions
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          en_introduction,
          lu_introduction,
          audio_url,
          chapter_audio_url,
          closing_prayer_audio_url,
          created_at,
          updated_at
        FROM chapter_introductions 
        ORDER BY book_id, chapter
      `;
      return NextResponse.json(result, { headers });
    }
  } catch (error) {
    console.error('Error fetching chapter introductions:', error);
    return NextResponse.json({
      error: 'Failed to fetch chapter introductions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, chapter, en_introduction, lu_introduction, audio_url, chapter_audio_url, closing_prayer_audio_url } = body;

    if (!book_id || !chapter) {
      return NextResponse.json(
        { error: 'Missing required fields: book_id and chapter' },
        { status: 400, headers }
      );
    }

    // Check if introduction already exists
    const existing = await sql`
      SELECT id FROM chapter_introductions
      WHERE book_id = ${book_id}
      AND chapter = ${chapter}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update existing
      await sql`
        UPDATE chapter_introductions 
        SET 
          en_introduction = ${en_introduction || ''},
          lu_introduction = ${lu_introduction || ''},
          audio_url = ${audio_url || null},
          chapter_audio_url = ${chapter_audio_url || null},
          closing_prayer_audio_url = ${closing_prayer_audio_url || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ${book_id}
        AND chapter = ${chapter}
      `;
      return NextResponse.json({ success: true, message: 'Chapter introduction updated successfully!' }, { headers });
    } else {
      // Insert new
      await sql`
        INSERT INTO chapter_introductions (book_id, chapter, en_introduction, lu_introduction, audio_url, chapter_audio_url, closing_prayer_audio_url, created_at, updated_at)
        VALUES (${book_id}, ${chapter}, ${en_introduction || ''}, ${lu_introduction || ''}, ${audio_url || null}, ${chapter_audio_url || null}, ${closing_prayer_audio_url || null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      return NextResponse.json({ success: true, message: 'Chapter introduction saved successfully!' }, { headers });
    }
  } catch (error) {
    console.error('Error saving chapter introduction:', error);
    return NextResponse.json({
      error: 'Failed to save chapter introduction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, book_id, chapter, en_introduction, lu_introduction, audio_url, chapter_audio_url, closing_prayer_audio_url } = body;

    if (!id && (!book_id || !chapter)) {
      return NextResponse.json(
        { error: 'Missing required fields: id or (book_id and chapter)' },
        { status: 400, headers }
      );
    }

    if (id) {
      await sql`
        UPDATE chapter_introductions 
        SET 
          en_introduction = ${en_introduction || ''},
          lu_introduction = ${lu_introduction || ''},
          audio_url = ${audio_url || null},
          chapter_audio_url = ${chapter_audio_url || null},
          closing_prayer_audio_url = ${closing_prayer_audio_url || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE chapter_introductions 
        SET 
          en_introduction = ${en_introduction || ''},
          lu_introduction = ${lu_introduction || ''},
          audio_url = ${audio_url || null},
          chapter_audio_url = ${chapter_audio_url || null},
          closing_prayer_audio_url = ${closing_prayer_audio_url || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ${book_id}
        AND chapter = ${chapter}
      `;
    }

    return NextResponse.json({ success: true, message: 'Chapter introduction updated successfully!' }, { headers });
  } catch (error) {
    console.error('Error updating chapter introduction:', error);
    return NextResponse.json({
      error: 'Failed to update chapter introduction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');

    if (!bookId || !chapter) {
      return NextResponse.json(
        { error: 'Missing required parameters: bookId and chapter' },
        { status: 400, headers }
      );
    }

    await sql`
      DELETE FROM chapter_introductions 
      WHERE book_id = ${parseInt(bookId)} 
      AND chapter = ${parseInt(chapter)}
    `;

    return NextResponse.json({ success: true, message: 'Chapter introduction deleted!' }, { headers });
  } catch (error) {
    console.error('Error deleting chapter introduction:', error);
    return NextResponse.json({
      error: 'Failed to delete chapter introduction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}
