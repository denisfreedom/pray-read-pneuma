import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const group = await sql`
      SELECT * FROM discussion_groups WHERE id = ${id}
    `;

    if (group.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(group[0]);
  } catch (error: any) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, member_count } = body;

    const result = await sql`
      UPDATE discussion_groups 
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        icon = COALESCE(${icon}, icon),
        member_count = COALESCE(${member_count ?? null}, member_count),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete all replies and posts in this group first
    const posts = await sql`SELECT id FROM forum_posts WHERE group_id = ${id}`;
    for (const post of posts) {
      await sql`DELETE FROM forum_replies WHERE post_id = ${post.id}`;
    }
    await sql`DELETE FROM forum_posts WHERE group_id = ${id}`;
    await sql`DELETE FROM group_members WHERE group_id = ${id}`;
    await sql`DELETE FROM discussion_groups WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
