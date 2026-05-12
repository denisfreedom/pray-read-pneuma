import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const members = await sql`
      SELECT * FROM group_members 
      WHERE group_id = ${id}
      ORDER BY joined_at DESC
    `;

    return NextResponse.json(members);
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_email, role } = body;

    if (!user_email) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO group_members (group_id, user_email, role)
      VALUES (${id}, ${user_email}, ${role || 'member'})
      ON CONFLICT (group_id, user_email) DO NOTHING
      RETURNING *
    `;

    // Update member count
    await sql`
      UPDATE discussion_groups 
      SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ${id})
      WHERE id = ${id}
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}
