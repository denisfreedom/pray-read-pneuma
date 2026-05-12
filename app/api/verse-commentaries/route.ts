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
    const bookNumber = searchParams.get('book_number');

    if (bookId && chapter) {
      const commentaries = await sql`
        SELECT 
          id,
          verse_number,
          commentary_text,
          luganda_commentary_text,
          created_at,
          updated_at
        FROM verse_commentaries
        WHERE book_id = ${parseInt(bookId)} 
          AND chapter = ${parseInt(chapter)}
        ORDER BY verse_number ASC
      `;
      return NextResponse.json(commentaries, { headers });
    }

    if (bookNumber && chapter) {
      const commentaries = await sql`
        SELECT 
          vc.verse_number,
          vc.commentary_text,
          vc.luganda_commentary_text
        FROM verse_commentaries vc
        JOIN bible_books bb ON vc.book_id = bb.id
        WHERE bb.book_number = ${parseInt(bookNumber)} 
          AND vc.chapter = ${parseInt(chapter)}
        ORDER BY vc.verse_number ASC
      `;
      return NextResponse.json(commentaries, { headers });
    }

    return NextResponse.json([], { headers });
  } catch (error) {
    console.error('Error fetching commentaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commentaries' },
      { status: 500, headers }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, chapter, verse_number, commentary_text, luganda_commentary_text } = body;

    const result = await sql`
      INSERT INTO verse_commentaries (book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at)
      VALUES (${book_id}, ${chapter}, ${verse_number}, ${commentary_text}, ${luganda_commentary_text}, NOW(), NOW())
      RETURNING id, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at
    `;

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error saving commentary:', error);
    return NextResponse.json(
      { error: 'Failed to save commentary' },
      { status: 500, headers }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, commentary_text, luganda_commentary_text } = body;

    const result = await sql`
      UPDATE verse_commentaries 
      SET commentary_text = ${commentary_text},
          luganda_commentary_text = ${luganda_commentary_text},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at
    `;

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error updating commentary:', error);
    return NextResponse.json(
      { error: 'Failed to update commentary' },
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

    await sql`DELETE FROM verse_commentaries WHERE id = ${parseInt(id)}`;

    return NextResponse.json({ success: true, message: 'Commentary deleted' }, { headers });
  } catch (error) {
    console.error('Error deleting commentary:', error);
    return NextResponse.json(
      { error: 'Failed to delete commentary' },
      { status: 500, headers }
    );
  }
}
