import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const { replyId } = await params;
    const { content } = await request.json();

    const result = await sql`
      UPDATE forum_replies SET content = ${content}, updated_at = NOW()
      WHERE id = ${replyId} RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating reply:', error);
    return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const { id, replyId } = await params;

    await sql`DELETE FROM forum_replies WHERE id = ${replyId}`;
    await sql`UPDATE forum_posts SET reply_count = (SELECT COUNT(*) FROM forum_replies WHERE post_id = ${id}) WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting reply:', error);
    return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
  }
}
