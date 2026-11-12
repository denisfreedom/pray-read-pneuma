import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// /api/user-devotional-progress — FIXED
// Old bugs:
// 1) import sql from '@/app/api/utils/sql' -> whole route 500s if that file is missing/different.
// 2) POST did completed_at = ${completed ? 'NOW()' : null} -> stored the literal TEXT 'NOW()',
//    not a timestamp, so streak / recent / last_completed broke.
// 3) POST relied on ON CONFLICT (user_email, entry_id) -> 500s if that unique constraint
//    was never created on the table.
// 4) GET ordered by de.scheduled_date -> 500s now devotionals are number-based (D-001),
//    and JOIN dropped progress rows whose devotional was deleted.
// 5) entryId can arrive as "D-001", "001" or 1 — old code inserted it raw, so an
//    INTEGER entry_id column rejected "D-001".
// Fixed: neon() directly, table + unique index auto-created, real NOW(), LEFT JOIN,
// entryId normalised to a number when it looks like D-001, email normalised.
function getSql() { return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null; }

// entryId "D-001" / "001" / 1 -> 1. Anything else -> keep as-is (string) so it never crashes.
function normaliseEntryId(raw: any): number | string {
  const s = String(raw ?? '').trim();
  const m = s.match(/^D-?0*(\d+)$/i) || s.match(/^0*(\d+)$/);
  if (m) return parseInt(m[1], 10);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? s : n;
}
async function ensureTables(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS user_devotional_progress (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      entry_id TEXT NOT NULL,
      scheduled_date DATE,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`ALTER TABLE user_devotional_progress ADD COLUMN IF NOT EXISTS scheduled_date DATE`;
  await sql`ALTER TABLE user_devotional_progress ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE user_devotional_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE user_devotional_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  // Unique index for ON CONFLICT — safe if it already exists
  try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS user_devotional_progress_user_entry_unique ON user_devotional_progress (user_email, entry_id)`; } catch { /* older table: fallback upsert below handles it */ }
  // entry_id may have been created as INTEGER in an old table — make it TEXT so "D-001" never fails.
  // If the column is INTEGER, this ALTER will fail safely and normaliseEntryId (number) still works.
  try { await sql`ALTER TABLE user_devotional_progress ALTER COLUMN entry_id TYPE TEXT USING entry_id::TEXT`; } catch { /* already TEXT or locked */ }
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    if (!sql) return NextResponse.json({ success: false, error: 'Database is not configured (DATABASE_URL missing).' }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const userEmail = String(searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();
    const entryIdRaw = searchParams.get('entryId');
    const getStats = searchParams.get('stats') === 'true';
    if (!userEmail) return NextResponse.json({ success: false, error: 'User email is required' }, { status: 400 });
    try { await ensureTables(sql); } catch (e: any) { return NextResponse.json({ success: false, error: 'Could not create progress table: ' + (e.message || '') }, { status: 500 }); }

    if (getStats) {
      const statsRows: any[] = await sql`
        SELECT COUNT(*) as total_completed, COUNT(DISTINCT DATE(completed_at)) as unique_days,
               MAX(completed_at) as last_completed, MIN(completed_at) as first_completed
        FROM user_devotional_progress
        WHERE LOWER(TRIM(user_email)) = ${userEmail} AND completed = true`;
      const stats = { total_completed: Number(statsRows[0]?.total_completed || 0), unique_days: Number(statsRows[0]?.unique_days || 0), last_completed: statsRows[0]?.last_completed || null, first_completed: statsRows[0]?.first_completed || null };
      // Streak: count consecutive days ending today or yesterday (robust, no LAG trick)
      const dayRows: any[] = await sql`
        SELECT DISTINCT DATE(completed_at) as d FROM user_devotional_progress
        WHERE LOWER(TRIM(user_email)) = ${userEmail} AND completed = true AND completed_at IS NOT NULL ORDER BY d DESC LIMIT 365`;
      const days = new Set(dayRows.map((r: any) => String(r.d).slice(0, 10)));
      let currentStreak = 0;
      const cursor = new Date(); cursor.setUTCHours(0, 0, 0, 0);
      // If today has no completion yet, streak is counted from yesterday
      if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
      while (days.has(cursor.toISOString().slice(0, 10))) { currentStreak++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
      // Recent activity (last 7 days) — LEFT JOIN so a deleted devotional does not hide the row
      const recentActivity: any[] = await sql`
        SELECT udp.completed_at, udp.entry_id, de.title, de.scripture_book, de.scripture_chapter, de.scripture_verse
        FROM user_devotional_progress udp
        LEFT JOIN devotional_entries de ON de.id::TEXT = udp.entry_id::TEXT OR de.number::TEXT = udp.entry_id::TEXT
        WHERE LOWER(TRIM(udp.user_email)) = ${userEmail} AND udp.completed = true AND udp.completed_at >= NOW() - INTERVAL '7 days'
        ORDER BY udp.completed_at DESC LIMIT 10`;
      return NextResponse.json({ success: true, stats, currentStreak, recentActivity });
    }

    if (entryIdRaw) {
      const entryId = normaliseEntryId(entryIdRaw);
      const progress: any[] = await sql`
        SELECT * FROM user_devotional_progress
        WHERE LOWER(TRIM(user_email)) = ${userEmail} AND entry_id::TEXT = ${String(entryId)}`;
      const row = progress[0];
      return NextResponse.json(row ? { success: true, ...row } : { success: true, completed: false });
    }

    // All progress — LEFT JOIN, order by completion (not scheduled_date, which may not exist)
    const progress: any[] = await sql`
      SELECT udp.*, de.title
      FROM user_devotional_progress udp
      LEFT JOIN devotional_entries de ON de.id::TEXT = udp.entry_id::TEXT OR de.number::TEXT = udp.entry_id::TEXT
      WHERE LOWER(TRIM(udp.user_email)) = ${userEmail}
      ORDER BY udp.completed_at DESC NULLS LAST, udp.created_at DESC`;
    return NextResponse.json(progress);
  } catch (error: any) {
    console.error('Error fetching devotional progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch devotional progress: ' + (error.message || 'server error') }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    if (!sql) return NextResponse.json({ success: false, error: 'Database is not configured (DATABASE_URL missing).' }, { status: 500 });
    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 }); }
    const userEmail = String(body.userEmail || body.email || '').trim().toLowerCase();
    const entryId = normaliseEntryId(body.entryId ?? body.entry_id);
    const scheduledDate = body.scheduledDate || body.scheduled_date || null;
    const completed = Boolean(body.completed);
    if (!userEmail || entryId === '' || entryId === null) return NextResponse.json({ success: false, error: 'User email and entry ID are required' }, { status: 400 });
    try { await ensureTables(sql); } catch (e: any) { return NextResponse.json({ success: false, error: 'Could not create progress table: ' + (e.message || '') }, { status: 500 }); }
    const entryIdStr = String(entryId);
    // FIX: real NOW() via CASE, not the string 'NOW()'. And if ON CONFLICT fails
    // (no unique constraint on an old table), fall back to manual SELECT + UPDATE/INSERT.
    try {
      const result: any[] = await sql`
        INSERT INTO user_devotional_progress (user_email, entry_id, scheduled_date, completed, completed_at, created_at)
        VALUES (${userEmail}, ${entryIdStr}, ${scheduledDate}, ${completed}, CASE WHEN ${completed} THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (user_email, entry_id)
        DO UPDATE SET completed = ${completed}, completed_at = CASE WHEN ${completed} THEN NOW() ELSE NULL END
        RETURNING *`;
      return NextResponse.json({ success: true, progress: result[0] });
    } catch (conflictErr: any) {
      const msg = String(conflictErr.message || '');
      if (!msg.includes('ON CONFLICT') && !msg.toLowerCase().includes('unique') && !msg.toLowerCase().includes('constraint')) throw conflictErr;
      const existing: any[] = await sql`SELECT id FROM user_devotional_progress WHERE LOWER(TRIM(user_email)) = ${userEmail} AND entry_id::TEXT = ${entryIdStr} LIMIT 1`;
      if (existing.length) {
        const updated: any[] = await sql`
          UPDATE user_devotional_progress SET completed = ${completed}, completed_at = CASE WHEN ${completed} THEN NOW() ELSE NULL END WHERE id = ${existing[0].id} RETURNING *`;
        return NextResponse.json({ success: true, progress: updated[0] });
      }
      const inserted: any[] = await sql`
        INSERT INTO user_devotional_progress (user_email, entry_id, scheduled_date, completed, completed_at, created_at)
        VALUES (${userEmail}, ${entryIdStr}, ${scheduledDate}, ${completed}, CASE WHEN ${completed} THEN NOW() ELSE NULL END, NOW()) RETURNING *`;
      return NextResponse.json({ success: true, progress: inserted[0] });
    }
  } catch (error: any) {
    console.error('Error updating devotional progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to update devotional progress: ' + (error.message || 'server error') }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getSql();
    if (!sql) return NextResponse.json({ success: false, error: 'Database is not configured (DATABASE_URL missing).' }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const userEmail = String(searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();
    const entryIdRaw = searchParams.get('entryId');
    if (!userEmail || !entryIdRaw) return NextResponse.json({ success: false, error: 'User email and entry ID are required' }, { status: 400 });
    try { await ensureTables(sql); } catch { /* ignore */ }
    const entryIdStr = String(normaliseEntryId(entryIdRaw));
    await sql`DELETE FROM user_devotional_progress WHERE LOWER(TRIM(user_email)) = ${userEmail} AND entry_id::TEXT = ${entryIdStr}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting devotional progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete devotional progress: ' + (error.message || 'server error') }, { status: 500 });
  }
}
