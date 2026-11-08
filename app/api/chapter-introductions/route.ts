import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const headers = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Map a DB row (either old or new column names) to what the Reader expects
function mapRow(r: any) {
  if (!r) return null;
  const en_intro = r.introduction_english ?? r.en_introduction ?? r.english_introduction ?? null;
  const lu_intro = r.introduction_luganda ?? r.lu_introduction ?? r.luganda_introduction ?? null;
  const en_close = r.closing_prayer_english ?? r.en_prayer ?? r.en_closing_prayer ?? null;
  const lu_close = r.closing_prayer_luganda ?? r.lu_prayer ?? r.lu_closing_prayer ?? null;
  return {
    ...r,
    // Reader expects these
    en_introduction: en_intro,
    lu_introduction: lu_intro,
    en_prayer: en_close,
    lu_prayer: lu_close,
    // New names too
    introduction_english: en_intro,
    introduction_luganda: lu_intro,
    closing_prayer_english: en_close,
    closing_prayer_luganda: lu_close,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const bookName = searchParams.get('book');
    const chapter = searchParams.get('chapter');

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
      const result: any[] = await sql`
        SELECT * FROM chapter_introductions
        WHERE book_id = ${parseInt(effectiveBookId)}
        AND chapter = ${parseInt(chapter)}
      `;
      return NextResponse.json(mapRow(result[0]) || null, { headers });
    } else if (effectiveBookId) {
      const result: any[] = await sql`
        SELECT * FROM chapter_introductions
        WHERE book_id = ${parseInt(effectiveBookId)}
        ORDER BY chapter
      `;
      return NextResponse.json(result.map(mapRow), { headers });
    } else {
      const result: any[] = await sql`
        SELECT * FROM chapter_introductions
        ORDER BY book_id, chapter
      `;
      return NextResponse.json(result.map(mapRow), { headers });
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
    // Accept BOTH old and new field names
    const book_id = body.book_id;
    const chapter = body.chapter;
    const en_introduction = body.en_introduction ?? body.introduction_english ?? body.english_introduction ?? '';
    const lu_introduction = body.lu_introduction ?? body.introduction_luganda ?? body.luganda_introduction ?? '';
    const en_close = body.en_prayer ?? body.closing_prayer_english ?? body.en_closing_prayer ?? null;
    const lu_close = body.lu_prayer ?? body.closing_prayer_luganda ?? body.lu_closing_prayer ?? null;
    const audio_url = body.audio_url ?? null;
    const chapter_audio_url = body.chapter_audio_url ?? null;
    const closing_prayer_audio_url = body.closing_prayer_audio_url ?? null;

    if (!book_id || !chapter) {
      return NextResponse.json(
        { error: 'Missing required fields: book_id and chapter' },
        { status: 400, headers }
      );
    }

    const existing: any[] = await sql`
      SELECT id FROM chapter_introductions
      WHERE book_id = ${book_id}
      AND chapter = ${chapter}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE chapter_introductions
        SET
          introduction_english = ${en_introduction || ''},
          introduction_luganda = ${lu_introduction || ''},
          closing_prayer_english = ${en_close},
          closing_prayer_luganda = ${lu_close},
          audio_url = ${audio_url},
          chapter_audio_url = ${chapter_audio_url},
          closing_prayer_audio_url = ${closing_prayer_audio_url},
          updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ${book_id}
        AND chapter = ${chapter}
      `;
      return NextResponse.json({ success: true, message: 'Chapter introduction updated successfully!' }, { headers });
    } else {
      await sql`
        INSERT INTO chapter_introductions (book_id, chapter, introduction_english, introduction_luganda, closing_prayer_english, closing_prayer_luganda, audio_url, chapter_audio_url, closing_prayer_audio_url, created_at, updated_at)
        VALUES (${book_id}, ${chapter}, ${en_introduction || ''}, ${lu_introduction || ''}, ${en_close}, ${lu_close}, ${audio_url}, ${chapter_audio_url}, ${closing_prayer_audio_url}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
    const id = body.id;
    const book_id = body.book_id;
    const chapter = body.chapter;
    const en_introduction = body.en_introduction ?? body.introduction_english ?? '';
    const lu_introduction = body.lu_introduction ?? body.introduction_luganda ?? '';
    const en_close = body.en_prayer ?? body.closing_prayer_english ?? null;
    const lu_close = body.lu_prayer ?? body.closing_prayer_luganda ?? null;
    const audio_url = body.audio_url ?? null;
    const chapter_audio_url = body.chapter_audio_url ?? null;
    const closing_prayer_audio_url = body.closing_prayer_audio_url ?? null;

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
          introduction_english = ${en_introduction || ''},
          introduction_luganda = ${lu_introduction || ''},
          closing_prayer_english = ${en_close},
          closing_prayer_luganda = ${lu_close},
          audio_url = ${audio_url},
          chapter_audio_url = ${chapter_audio_url},
          closing_prayer_audio_url = ${closing_prayer_audio_url},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE chapter_introductions
        SET
          introduction_english = ${en_introduction || ''},
          introduction_luganda = ${lu_introduction || ''},
          closing_prayer_english = ${en_close},
          closing_prayer_luganda = ${lu_close},
          audio_url = ${audio_url},
          chapter_audio_url = ${chapter_audio_url},
          closing_prayer_audio_url = ${closing_prayer_audio_url},
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
