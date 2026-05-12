import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch text colors for a chapter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');

    if (!bookId || !chapter) {
      return NextResponse.json(
        { success: false, error: 'Missing bookId or chapter' },
        { status: 400 }
      );
    }

    const colors = await sql`
      SELECT * FROM text_colors 
      WHERE book_id = ${parseInt(bookId)}
      AND chapter = ${parseInt(chapter)}
      ORDER BY verse_number ASC, start_offset ASC
    `;

    return NextResponse.json({ success: true, colors });
  } catch (error) {
    console.error('Error fetching text colors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch text colors' },
      { status: 500 }
    );
  }
}

// POST - Save a text color
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapter, verseNumber, startOffset, endOffset, color, textContent } = body;

    if (!bookId || !chapter || !verseNumber || startOffset === undefined || endOffset === undefined || !color) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert text color
    const inserted = await sql`
      INSERT INTO text_colors (
        book_id, 
        chapter, 
        verse_number, 
        start_offset, 
        end_offset, 
        color, 
        text_content,
        created_at,
        updated_at
      )
      VALUES (
        ${parseInt(bookId)}, 
        ${parseInt(chapter)}, 
        ${parseInt(verseNumber)}, 
        ${parseInt(startOffset)}, 
        ${parseInt(endOffset)}, 
        ${color}, 
        ${textContent || ''},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, color: inserted[0] });
  } catch (error) {
    console.error('Error saving text color:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save text color' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a text color
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colorId = searchParams.get('colorId');

    if (!colorId) {
      return NextResponse.json(
        { success: false, error: 'Missing colorId' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM text_colors 
      WHERE id = ${parseInt(colorId)}
    `;

    return NextResponse.json({ success: true, message: 'Text color removed' });
  } catch (error) {
    console.error('Error deleting text color:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete text color' },
      { status: 500 }
    );
  }
}
