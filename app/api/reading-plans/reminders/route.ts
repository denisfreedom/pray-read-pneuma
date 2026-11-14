import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// /api/reading-plans/reminders — per-plan daily reading reminders.
// The dashboard already has a Reminders entry (/reminders) and a
// NotificationManager; this is the data those surfaces (and the plan detail
// page) read and write. The browser Notification API fires the actual alert
// from the ReadingReminder component while the site is open.
// GET ?userEmail=&planId= -> one reminder | ?userEmail= -> all reminders
// POST { userEmail, planId, time: "HH:MM", enabled } -> create/update
// DELETE ?userEmail=&planId= -> remove
export const dynamic = 'force-dynamic';

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS reading_plan_reminders (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      plan_id INTEGER NOT NULL,
      reminder_time TEXT NOT NULL DEFAULT '07:00',
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`ALTER TABLE reading_plan_reminders ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '07:00'`;
  await sql`ALTER TABLE reading_plan_reminders ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE reading_plan_reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
  try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS reading_plan_reminders_user_plan_unique ON reading_plan_reminders (user_email, plan_id)`; } catch { /* fallback upsert below */ }
}

function normEmail(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = normEmail(searchParams.get('userEmail') || searchParams.get('email'));
    const planIdRaw = searchParams.get('planId');
    if (!userEmail) return NextResponse.json({ success: false, error: 'User email is required' }, { status: 400 });
    await ensureTables();
    if (planIdRaw) {
      const planId = parseInt(planIdRaw, 10);
      const rows: any[] = await sql`SELECT * FROM reading_plan_reminders WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${planId} LIMIT 1`;
      return NextResponse.json({ success: true, reminder: rows[0] || null });
    }
    const rows: any[] = await sql`SELECT * FROM reading_plan_reminders WHERE LOWER(TRIM(user_email)) = ${userEmail} ORDER BY plan_id ASC`;
    return NextResponse.json({ success: true, reminders: rows });
  } catch (error: any) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userEmail = normEmail(body.userEmail || body.email);
    const planId = parseInt(String(body.planId ?? ''), 10);
    const time = String(body.time || body.reminder_time || '07:00').trim();
    const enabled = body.enabled !== false;
    if (!userEmail || Number.isNaN(planId) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid fields (need userEmail, planId, time HH:MM)' }, { status: 400 });
    }
    await ensureTables();
    const existing: any[] = await sql`SELECT id FROM reading_plan_reminders WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${planId} LIMIT 1`;
    if (existing.length) {
      await sql`UPDATE reading_plan_reminders SET reminder_time = ${time}, enabled = ${enabled}, updated_at = NOW() WHERE id = ${existing[0].id}`;
    } else {
      await sql`INSERT INTO reading_plan_reminders (user_email, plan_id, reminder_time, enabled) VALUES (${userEmail}, ${planId}, ${time}, ${enabled})`;
    }
    return NextResponse.json({ success: true, reminder: { user_email: userEmail, plan_id: planId, reminder_time: time, enabled } });
  } catch (error: any) {
    console.error('Error saving reminder:', error);
    return NextResponse.json({ success: false, error: 'Failed to save reminder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = normEmail(searchParams.get('userEmail') || searchParams.get('email'));
    const planId = parseInt(String(searchParams.get('planId') ?? ''), 10);
    if (!userEmail || Number.isNaN(planId)) return NextResponse.json({ success: false, error: 'Missing userEmail or planId' }, { status: 400 });
    await ensureTables();
    await sql`DELETE FROM reading_plan_reminders WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${planId}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete reminder' }, { status: 500 });
  }
}
