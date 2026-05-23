import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');

    if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 });

    let result;
    if (chapter) {
      result = await sql`
        SELECT * FROM historical_content
        WHERE book_id = ${parseInt(bookId)} AND chapter = ${parseInt(chapter)}
        LIMIT 1
      `;
    } else {
      result = await sql`
        SELECT * FROM historical_content
        WHERE book_id = ${parseInt(bookId)} AND chapter IS NULL
        LIMIT 1
      `;
    }

    return NextResponse.json(result[0] || null);
  } catch (error) {
    console.error('Error fetching historical content:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, chapter, historical_background, cultural_context, maps_geography, timeline, archaeological_notes } = body;

    if (!book_id) return NextResponse.json({ error: 'book_id required' }, { status: 400 });

    const bg = historical_background || '';
    const culture = cultural_context || '';
    const maps = maps_geography || '';
    const tl = timeline || '';
    const arch = archaeological_notes || '';

    let result;
    if (chapter) {
      // Chapter-level: check if exists then update or insert
      const existing = await sql`
        SELECT id FROM historical_content WHERE book_id = ${book_id} AND chapter = ${parseInt(chapter)}
      `;
      if (existing.length > 0) {
        result = await sql`
          UPDATE historical_content SET
            historical_background = ${bg},
            cultural_context = ${culture},
            maps_geography = ${maps},
            timeline = ${tl},
            archaeological_notes = ${arch},
            updated_at = CURRENT_TIMESTAMP
          WHERE book_id = ${book_id} AND chapter = ${parseInt(chapter)}
          RETURNING *
        `;
      } else {
        result = await sql`
          INSERT INTO historical_content (book_id, chapter, historical_background, cultural_context, maps_geography, timeline, archaeological_notes, updated_at)
          VALUES (${book_id}, ${parseInt(chapter)}, ${bg}, ${culture}, ${maps}, ${tl}, ${arch}, CURRENT_TIMESTAMP)
          RETURNING *
        `;
      }
    } else {
      // Book-level: chapter IS NULL
      const existing = await sql`
        SELECT id FROM historical_content WHERE book_id = ${book_id} AND chapter IS NULL
      `;
      if (existing.length > 0) {
        result = await sql`
          UPDATE historical_content SET
            historical_background = ${bg},
            cultural_context = ${culture},
            maps_geography = ${maps},
            timeline = ${tl},
            archaeological_notes = ${arch},
            updated_at = CURRENT_TIMESTAMP
          WHERE book_id = ${book_id} AND chapter IS NULL
          RETURNING *
        `;
      } else {
        result = await sql`
          INSERT INTO historical_content (book_id, chapter, historical_background, cultural_context, maps_geography, timeline, archaeological_notes, updated_at)
          VALUES (${book_id}, NULL, ${bg}, ${culture}, ${maps}, ${tl}, ${arch}, CURRENT_TIMESTAMP)
          RETURNING *
        `;
      }
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error saving historical content:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`DELETE FROM historical_content WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting historical content:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
