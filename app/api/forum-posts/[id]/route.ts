import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const post = await sql`
      SELECT * FROM forum_posts WHERE id = ${id}
    `;

    if (post.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const replies = await sql`
      SELECT * FROM forum_replies 
      WHERE post_id = ${id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      ...post[0],
      replies
    });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
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
    const { title, content } = await request.json();

    const result = await sql`
      UPDATE forum_posts SET title = ${title}, content = ${content}, updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const post = await sql`SELECT group_id FROM forum_posts WHERE id = ${id}`;
    await sql`DELETE FROM forum_replies WHERE post_id = ${id}`;
    await sql`DELETE FROM forum_posts WHERE id = ${id}`;
    
    if (post.length > 0) {
      const groupId = post[0].group_id;
      await sql`UPDATE discussion_groups SET post_count = (SELECT COUNT(*) FROM forum_posts WHERE group_id = ${groupId}) WHERE id = ${groupId}`;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
