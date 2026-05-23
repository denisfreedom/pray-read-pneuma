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

    if (bookId) {
      const commentary = await sql`
        SELECT 
          id,
          book_id,
          english_commentary,
          luganda_commentary,
          created_at,
          updated_at
        FROM book_commentaries
        WHERE book_id = ${parseInt(bookId)}
        LIMIT 1
      `;
      return NextResponse.json(commentary.length > 0 ? commentary[0] : null, { headers });
    }

    return NextResponse.json(null, { headers });
  } catch (error) {
    console.error('Error fetching book commentary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book commentary' },
      { status: 500, headers }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, english_commentary, luganda_commentary } = body;

    const result = await sql`
      INSERT INTO book_commentaries (book_id, english_commentary, luganda_commentary, created_at, updated_at)
      VALUES (${book_id}, ${english_commentary}, ${luganda_commentary}, NOW(), NOW())
      RETURNING id, book_id, english_commentary, luganda_commentary, created_at, updated_at
    `;

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error saving book commentary:', error);
    return NextResponse.json(
      { error: 'Failed to save book commentary' },
      { status: 500, headers }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, english_commentary, luganda_commentary } = body;

    const result = await sql`
      UPDATE book_commentaries 
      SET english_commentary = ${english_commentary},
          luganda_commentary = ${luganda_commentary},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, book_id, english_commentary, luganda_commentary, created_at, updated_at
    `;

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error updating book commentary:', error);
    return NextResponse.json(
      { error: 'Failed to update book commentary' },
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

    await sql`DELETE FROM book_commentaries WHERE id = ${parseInt(id)}`;

    return NextResponse.json({ success: true, message: 'Commentary deleted' }, { headers });
  } catch (error) {
    console.error('Error deleting book commentary:', error);
    return NextResponse.json(
      { error: 'Failed to delete book commentary' },
      { status: 500, headers }
    );
  }
}
