import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'english';
    const bookId = searchParams.get('book_id');
    const chapter = searchParams.get('chapter');

    let result;

    if (bookId) {
      if (chapter) {
        // If chapter is specified, get only chapter-specific outlines
        result = await sql`
          SELECT o.*, b.name_english as book_name, b.abbreviation_english as abbreviation
          FROM bible_outlines o 
          LEFT JOIN bible_books b ON o.book_id = b.id 
          WHERE o.language = ${language} AND o.book_id = ${parseInt(bookId)} AND o.chapter = ${parseInt(chapter)}
          ORDER BY o.order_index
        `;
      } else {
        // If no chapter specified, get only book-level outlines (where chapter is null)
        result = await sql`
          SELECT o.*, b.name_english as book_name, b.abbreviation_english as abbreviation
          FROM bible_outlines o 
          LEFT JOIN bible_books b ON o.book_id = b.id 
          WHERE o.language = ${language} AND o.book_id = ${parseInt(bookId)} AND o.chapter IS NULL
          ORDER BY o.order_index
        `;
      }
    } else {
      result = await sql`
        SELECT o.*, b.name_english as book_name, b.abbreviation_english as abbreviation
        FROM bible_outlines o 
        LEFT JOIN bible_books b ON o.book_id = b.id 
        WHERE o.language = ${language}
        ORDER BY o.book_id, o.chapter, o.order_index
      `;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching outlines:', error);
    return NextResponse.json({ error: 'Failed to fetch outlines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, chapter, title, content, language, order_index } = body;

    if (!book_id || !title || !language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO bible_outlines (book_id, chapter, title, content, language, order_index) 
      VALUES (${book_id}, ${chapter || null}, ${title}, ${content || ''}, ${language}, ${order_index || 0}) 
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating outline:', error);
    return NextResponse.json({ error: 'Failed to create outline' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, order_index } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sql`
      UPDATE bible_outlines SET title = ${title}, content = ${content || ''}, order_index = ${order_index || 0} 
      WHERE id = ${id} RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Outline not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating outline:', error);
    return NextResponse.json({ error: 'Failed to update outline' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing outline ID' }, { status: 400 });
    }

    await sql`DELETE FROM bible_outlines WHERE id = ${parseInt(id)}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting outline:', error);
    return NextResponse.json({ error: 'Failed to delete outline' }, { status: 500 });
  }
}
