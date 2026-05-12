import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';

    let messages;
    if (status === 'all') {
      messages = await sql`
        SELECT * FROM contact_messages 
        ORDER BY created_at DESC
      `;
    } else {
      messages = await sql`
        SELECT * FROM contact_messages 
        WHERE status = ${status}
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Fetch messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact messages' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { messageId, status } = await req.json();

    if (!messageId || !status) {
      return NextResponse.json(
        { error: 'Message ID and status are required' },
        { status: 400 }
      );
    }

    const repliedAt = status === 'replied' ? new Date().toISOString() : null;

    await sql`
      UPDATE contact_messages 
      SET status = ${status}, replied_at = ${repliedAt}
      WHERE id = ${messageId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { error: 'Failed to update message status' },
      { status: 500 }
    );
  }
}
