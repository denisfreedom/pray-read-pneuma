import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_email, user_name, content, created_at } = body;

    if (!user_email || !content) {
      return NextResponse.json(
        { error: 'user_email and content are required' },
        { status: 400 }
      );
    }

    const result = created_at
      ? await sql`
          INSERT INTO forum_replies (post_id, user_email, user_name, content, created_at)
          VALUES (${id}, ${user_email}, ${user_name || 'Anonymous'}, ${content}, ${created_at})
          RETURNING *
        `
      : await sql`
          INSERT INTO forum_replies (post_id, user_email, user_name, content)
          VALUES (${id}, ${user_email}, ${user_name || 'Anonymous'}, ${content})
          RETURNING *
        `;

    // Update reply count
    await sql`
      UPDATE forum_posts 
      SET reply_count = (SELECT COUNT(*) FROM forum_replies WHERE post_id = ${id})
      WHERE id = ${id}
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}
