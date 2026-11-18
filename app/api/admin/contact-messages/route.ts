import { NextRequest, NextResponse } from 'next/server';
import sql, { isDbConfigured } from '@/app/api/utils/sql';

// app/api/admin/contact-messages/route.ts — FIXED
// Was: const sql = neon(process.env.DATABASE_URL!) at import time.
// That throws on import when DATABASE_URL is missing, so even a GET
// crashed the whole route. Now uses the shared @/app/api/utils/sql
// helper (lazy, never throws on import).
// Also: GET returns [] instead of 500 when contact_messages does not
// exist yet, PATCH validates status + id, and PATCH no longer wipes
// replied_at when you move a message from Replied back to Read.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_STATUSES = new Set(['unread', 'read', 'replied']);

function dbMissing() {
  return NextResponse.json(
    { error: 'DATABASE_URL is not set in Vercel. Add it in Vercel > Settings > Environment Variables, then redeploy.' },
    { status: 503 }
  );
}

function isTableMissing(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return /relation .* does not exist|table .* does not exist|42P01/i.test(msg);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';

    if (status !== 'all' && !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Use all, unread, read, or replied.` },
        { status: 400 }
      );
    }
    if (!isDbConfigured()) return dbMissing();

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
    // Table not created yet -> show empty inbox, not 500.
    if (isTableMissing(error)) return NextResponse.json({ messages: [] });
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
    if (!VALID_STATUSES.has(String(status))) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Use unread, read, or replied.` },
        { status: 400 }
      );
    }
    if (!/^\d+$/.test(String(messageId))) {
      return NextResponse.json(
        { error: 'Invalid message ID' },
        { status: 400 }
      );
    }
    if (!isDbConfigured()) return dbMissing();

    // Old code always set replied_at = null when status != 'replied',
    // which wiped the reply time if you moved a message Replied -> Read.
    // Now: only touch replied_at when marking as replied.
    if (status === 'replied') {
      const repliedAt = new Date().toISOString();
      await sql`
        UPDATE contact_messages
        SET status = ${status}, replied_at = ${repliedAt}
        WHERE id = ${messageId}
      `;
    } else {
      await sql`
        UPDATE contact_messages
        SET status = ${status}
        WHERE id = ${messageId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update message error:', error);
    if (isTableMissing(error)) {
      return NextResponse.json(
        { error: 'contact_messages table does not exist yet in Neon. Create it, then try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update message status' },
      { status: 500 }
    );
  }
}
