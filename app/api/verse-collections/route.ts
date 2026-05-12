import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch all collections for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || 'demo@example.com';

    const collections = await sql`
      SELECT 
        vc.*,
        COUNT(cv.id) as verse_count
      FROM verse_collections vc
      LEFT JOIN collection_verses cv ON vc.id = cv.collection_id
      WHERE vc.user_email = ${userEmail}
      GROUP BY vc.id
      ORDER BY vc.created_at DESC
    `;

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

// POST - Create a new collection
export async function POST(request: Request) {
  try {
    const { name, description, userEmail = 'demo@example.com' } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO verse_collections (user_email, name, description)
      VALUES (${userEmail}, ${name}, ${description || ''})
      RETURNING *
    `;

    return NextResponse.json({ collection: result[0] });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}

// DELETE - Delete a collection
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM verse_collections WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}

// PATCH - Update a collection
export async function PATCH(request: Request) {
  try {
    const { id, name, description } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE verse_collections 
      SET name = ${name}, description = ${description}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({ collection: result[0] });
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}
