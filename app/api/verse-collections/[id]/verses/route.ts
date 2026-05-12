import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch all verses in a collection
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const verses = await sql`
      SELECT * FROM collection_verses
      WHERE collection_id = ${id}
      ORDER BY added_at DESC
    `;

    return NextResponse.json({ verses });
  } catch (error) {
    console.error('Error fetching collection verses:', error);
    return NextResponse.json({ error: 'Failed to fetch verses' }, { status: 500 });
  }
}

// POST - Add a verse to a collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { book, chapter, verse, text } = await request.json();

    if (!book || !chapter || !verse) {
      return NextResponse.json({ error: 'Book, chapter, and verse are required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO collection_verses (collection_id, book, chapter, verse, text)
      VALUES (${id}, ${book}, ${chapter}, ${verse}, ${text || ''})
      RETURNING *
    `;

    return NextResponse.json({ verse: result[0] });
  } catch (error) {
    console.error('Error adding verse to collection:', error);
    return NextResponse.json({ error: 'Failed to add verse' }, { status: 500 });
  }
}

// DELETE - Remove a verse from a collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const verseId = searchParams.get('verseId');

    if (!verseId) {
      return NextResponse.json({ error: 'Verse ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM collection_verses WHERE id = ${verseId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing verse from collection:', error);
    return NextResponse.json({ error: 'Failed to remove verse' }, { status: 500 });
  }
}
