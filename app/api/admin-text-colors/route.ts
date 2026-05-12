import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verseNumber = searchParams.get('verseNumber');

    if (!bookId || !chapter || !verseNumber) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const colors = await sql`
      SELECT * FROM admin_text_colors
      WHERE book_id = ${bookId}
      AND chapter = ${chapter}
      AND verse_number = ${verseNumber}
      ORDER BY start_offset ASC
    `;

    return NextResponse.json({ colors });
  } catch (error) {
    console.error('Error fetching admin text colors:', error);
    return NextResponse.json({ error: 'Failed to fetch colors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookId, chapter, verseNumber, startOffset, endOffset, color, textContent } = await request.json();

    if (!bookId || !chapter || !verseNumber || startOffset === undefined || endOffset === undefined || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Delete existing color for this exact range
    await sql`
      DELETE FROM admin_text_colors
      WHERE book_id = ${bookId}
      AND chapter = ${chapter}
      AND verse_number = ${verseNumber}
      AND start_offset = ${startOffset}
      AND end_offset = ${endOffset}
    `;

    // Insert new color
    const result = await sql`
      INSERT INTO admin_text_colors (book_id, chapter, verse_number, start_offset, end_offset, color, text_content)
      VALUES (${bookId}, ${chapter}, ${verseNumber}, ${startOffset}, ${endOffset}, ${color}, ${textContent})
      RETURNING *
    `;

    return NextResponse.json({ success: true, color: result[0] });
  } catch (error) {
    console.error('Error saving admin text color:', error);
    return NextResponse.json({ error: 'Failed to save color' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing color ID' }, { status: 400 });
    }

    await sql`DELETE FROM admin_text_colors WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin text color:', error);
    return NextResponse.json({ error: 'Failed to delete color' }, { status: 500 });
  }
}
