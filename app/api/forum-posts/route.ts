import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json(
        { error: 'group_id is required' },
        { status: 400 }
      );
    }

    const posts = await sql`
      SELECT * FROM forum_posts 
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Error fetching forum posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forum posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { group_id, user_email, user_name, title, content } = body;

    if (!group_id || !user_email || !title || !content) {
      return NextResponse.json(
        { error: 'group_id, user_email, title, and content are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO forum_posts (group_id, user_email, user_name, title, content)
      VALUES (${group_id}, ${user_email}, ${user_name || 'Anonymous'}, ${title}, ${content})
      RETURNING *
    `;

    // Update post count
    await sql`
      UPDATE discussion_groups 
      SET post_count = (SELECT COUNT(*) FROM forum_posts WHERE group_id = ${group_id})
      WHERE id = ${group_id}
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating forum post:', error);
    return NextResponse.json(
      { error: 'Failed to create forum post' },
      { status: 500 }
    );
  }
}
