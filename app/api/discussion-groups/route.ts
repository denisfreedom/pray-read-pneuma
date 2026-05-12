import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const groups = await sql`
      SELECT * FROM discussion_groups 
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('Error fetching discussion groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussion groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, created_by, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO discussion_groups (name, description, created_by, icon)
      VALUES (${name}, ${description || ''}, ${created_by || ''}, ${icon || '💬'})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating discussion group:', error);
    return NextResponse.json(
      { error: 'Failed to create discussion group' },
      { status: 500 }
    );
  }
}
