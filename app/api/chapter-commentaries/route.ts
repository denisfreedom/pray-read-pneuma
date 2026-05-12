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
    const chapter = searchParams.get('chapter');

    if (bookId && chapter) {
      const commentary = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          english_commentary,
          luganda_commentary,
          created_at,
          updated_at
        FROM chapter_commentaries
        WHERE book_id = ${parseInt(bookId)} AND chapter = ${parseInt(chapter)}
        LIMIT 1
      `;
      return NextResponse.json(commentary.length > 0 ? commentary[0] : null, { headers });
    }

    return NextResponse.json(null, { headers });
  } catch (error) {
    console.error('Error fetching chapter commentary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter commentary' },
      { status: 500, headers }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, chapter, english_commentary, luganda_commentary } = body;

    const result = await sql`
      INSERT INTO chapter_commentaries (book_id, chapter, english_commentary, luganda_commentary, created_at, updated_at)
      VALUES (${book_id}, ${chapter}, ${english_commentary}, ${luganda_commentary}, NOW(), NOW())
      RETURNING id, book_id, chapter, english_commentary, luganda_commentary, created_at, updated_at
    `;

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error saving chapter commentary:', error);
    return NextResponse.json(
      { error: 'Failed to save chapter commentary' },
      { status: 500, headers }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, english_commentary, luganda_commentary } = body;

    const result = await sql`
      UPDATE chapter_commentaries 
      SET english_commentary = ${english_commentary},
          luganda_commentary = ${luganda_commentary},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, book_id, chapter, english_commentary, luganda_commentary, created_at, updated_at
    `;

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error updating chapter commentary:', error);
    return NextResponse.json(
      { error: 'Failed to update chapter commentary' },
      { status: 500, headers }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400, headers });
    }

    await sql`DELETE FROM chapter_commentaries WHERE id = ${parseInt(id)}`;

    return NextResponse.json({ success: true, message: 'Commentary deleted' }, { headers });
  } catch (error) {
    console.error('Error deleting chapter commentary:', error);
    return NextResponse.json(
      { error: 'Failed to delete chapter commentary' },
      { status: 500, headers }
    );
  }
}
