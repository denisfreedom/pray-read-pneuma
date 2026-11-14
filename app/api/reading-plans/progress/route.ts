import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { getBuiltinPlan, getPlanDays, getFinishedBooks } from '../lib';

// /api/reading-plans/progress — reading progress for plans, books and dashboard.
// Fixes vs the pasted version:
// 1) The table + unique index are auto-created, and the upsert falls back to
//    SELECT-then-INSERT/UPDATE — so it never 500s when the table or the unique
//    constraint was never created (the exact bug the devotional progress route
//    already fixed the same way).
// 2) GET returns a SUMMARY (completed_days, current_day, completed, pct) plus
//    finished_books — not just raw rows — so the list page, detail page and
//    dashboard can all render progress without recomputing it.
// 3) POST returns the updated summary + newly finished books, so the UI can
//    celebrate a finished book / completed plan immediately.
// 4) Email is normalised (lowercase/trimmed) and accepted as userEmail or email,
//    the same convention as /api/user-devotional-progress.
export const dynamic = 'force-dynamic';

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_reading_progress (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      plan_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`ALTER TABLE user_reading_progress ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE user_reading_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE user_reading_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS user_reading_progress_user_plan_day_unique ON user_reading_progress (user_email, plan_id, day_number)`; } catch { /* fallback upsert below handles it */ }
}

function normEmail(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

// Resolve a plan's total days + day list: built-in plans from lib, DB plans
// from reading_plans (duration) + plan_days rows when that table exists.
async function resolvePlan(planId: number): Promise<{ totalDays: number; days: ReturnType<typeof getPlanDays>; title: string } | null> {
  const builtin = getBuiltinPlan(planId);
  if (builtin) {
    return { totalDays: builtin.duration_days, days: getPlanDays(builtin), title: builtin.title };
  }
  try {
    const rows: any[] = await sql`SELECT * FROM reading_plans WHERE id = ${planId} LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    const totalDays = Number(row.duration_days ?? row.duration ?? row.total_days ?? row.day_count ?? 0) || 0;
    let days: ReturnType<typeof getPlanDays> = [];
    try {
      const dayRows: any[] = await sql`SELECT * FROM plan_days WHERE plan_id = ${planId} ORDER BY day_number ASC`;
      if (dayRows.length) {
        const byDay = new Map<number, any[]>();
        for (const dr of dayRows) {
          if (!byDay.has(dr.day_number)) byDay.set(dr.day_number, []);
          byDay.get(dr.day_number)!.push(dr);
        }
        days = [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([dn, rs]) => ({
          day_number: dn,
          readings: rs.map((r: any) => ({
            book_number: Number(r.book_number ?? r.book_id ?? 0),
            book_name: r.book_name || r.book || '',
            chapter: Number(r.chapter ?? r.chapter_number ?? 0),
          })),
          label: rs.map((r: any) => `${r.book_name || r.book || ''} ${r.chapter ?? ''}`.trim()).join(' · '),
        }));
      }
    } catch { /* no plan_days table — days stay empty, marking still works */ }
    if (!days.length && totalDays > 0) {
      days = Array.from({ length: totalDays }, (_, i) => ({ day_number: i + 1, readings: [], label: `Day ${i + 1}` }));
    }
    return { totalDays, days, title: row.title || row.name || 'Reading Plan' };
  } catch {
    return null;
  }
}

async function planSummary(userEmail: string, planId: number) {
  const rows: any[] = await sql`
    SELECT day_number, completed, completed_at FROM user_reading_progress
    WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${planId}`;
  const completedMap = new Map<number, string>();
  for (const r of rows) {
    if (r.completed) completedMap.set(Number(r.day_number), r.completed_at ? String(r.completed_at) : new Date().toISOString());
  }
  const plan = await resolvePlan(planId);
  const totalDays = plan?.totalDays ?? 0;
  const completedDays = completedMap.size;
  const completed = totalDays > 0 && completedDays >= totalDays;
  const currentDay = completed ? totalDays : Math.min(completedDays + 1, Math.max(totalDays, 1));
  const finishedBooks = plan ? getFinishedBooks(plan.days, completedMap) : [];
  return {
    plan_id: planId,
    plan_title: plan?.title ?? null,
    total_days: totalDays,
    completed_days: completedDays,
    current_day: currentDay,
    completed,
    pct: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
    finished_books: finishedBooks,
    completed_day_numbers: [...completedMap.keys()].sort((a, b) => a - b),
  };
}

// GET ?userEmail=&planId=  -> one plan's progress + finished books
// GET ?userEmail=          -> every plan's summary (list page badges)
// GET ?userEmail=&stats=true -> dashboard: per-plan summaries + all finished
// books + completed plans + streak inputs (last completion dates).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = normEmail(searchParams.get('userEmail') || searchParams.get('email'));
    const planIdRaw = searchParams.get('planId');
    const stats = searchParams.get('stats') === 'true';
    if (!userEmail) return NextResponse.json({ success: false, error: 'User email is required' }, { status: 400 });
    await ensureTables();

    if (planIdRaw) {
      const planId = parseInt(planIdRaw, 10);
      if (Number.isNaN(planId)) return NextResponse.json({ success: false, error: 'Invalid planId' }, { status: 400 });
      const summary = await planSummary(userEmail, planId);
      const progress: any[] = await sql`
        SELECT day_number, completed, completed_at FROM user_reading_progress
        WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${planId}
        ORDER BY day_number ASC`;
      return NextResponse.json({ success: true, progress, summary });
    }

    // All plans for this user
    const rows: any[] = await sql`
      SELECT plan_id, day_number, completed, completed_at FROM user_reading_progress
      WHERE LOWER(TRIM(user_email)) = ${userEmail} AND completed = true`;
    const byPlan = new Map<number, Map<number, string>>();
    for (const r of rows) {
      if (!byPlan.has(Number(r.plan_id))) byPlan.set(Number(r.plan_id), new Map());
      byPlan.get(Number(r.plan_id))!.set(Number(r.day_number), r.completed_at ? String(r.completed_at) : new Date().toISOString());
    }
    const progress: any[] = [];
    const summaries: any[] = [];
    for (const [planId, completedMap] of byPlan) {
      const plan = await resolvePlan(planId);
      const totalDays = plan?.totalDays ?? 0;
      const completedDays = completedMap.size;
      const completed = totalDays > 0 && completedDays >= totalDays;
      progress.push({ plan_id: planId, completed_days: completedDays, current_day: completed ? totalDays : Math.min(completedDays + 1, Math.max(totalDays, 1)), completed });
      summaries.push({
        plan_id: planId, plan_title: plan?.title ?? null, total_days: totalDays,
        completed_days: completedDays, completed, pct: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
        finished_books: plan ? getFinishedBooks(plan.days, completedMap) : [],
      });
    }
    if (!stats) return NextResponse.json({ success: true, progress, summaries });
    const completedPlans = summaries.filter((s) => s.completed);
    const allFinishedBooks: any[] = [];
    for (const s of summaries) for (const b of s.finished_books) allFinishedBooks.push({ ...b, plan_id: s.plan_id, plan_title: s.plan_title });
    return NextResponse.json({ success: true, progress, summaries, completed_plans: completedPlans, finished_books: allFinishedBooks });
  } catch (error: any) {
    console.error('Error fetching reading progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reading progress' }, { status: 500 });
  }
}

// POST { userEmail, planId, dayNumber, completed } — mark one day done / undone.
// Returns the updated summary + newly finished books so the UI can celebrate.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userEmail = normEmail(body.userEmail || body.email);
    const planId = parseInt(String(body.planId ?? ''), 10);
    const dayNumber = parseInt(String(body.dayNumber ?? ''), 10);
    const completed = body.completed !== false;
    if (!userEmail || Number.isNaN(planId) || Number.isNaN(dayNumber)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    await ensureTables();
    const before = await planSummary(userEmail, planId);
    const beforeFinished = new Set(before.finished_books.map((b: any) => b.book_number));

    // Fallback upsert: works with or without the unique index.
    const existing: any[] = await sql`
      SELECT id FROM user_reading_progress
      WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${planId} AND day_number = ${dayNumber} LIMIT 1`;
    if (existing.length) {
      if (completed) {
        await sql`UPDATE user_reading_progress SET completed = true, completed_at = NOW() WHERE id = ${existing[0].id}`;
      } else {
        await sql`UPDATE user_reading_progress SET completed = false, completed_at = NULL WHERE id = ${existing[0].id}`;
      }
    } else {
      if (completed) {
        await sql`INSERT INTO user_reading_progress (user_email, plan_id, day_number, completed, completed_at) VALUES (${userEmail}, ${planId}, ${dayNumber}, true, NOW())`;
      } else {
        await sql`INSERT INTO user_reading_progress (user_email, plan_id, day_number, completed, completed_at) VALUES (${userEmail}, ${planId}, ${dayNumber}, false, NULL)`;
      }
    }

    const after = await planSummary(userEmail, planId);
    const newlyFinished = after.finished_books.filter((b: any) => !beforeFinished.has(b.book_number));
    return NextResponse.json({
      success: true, summary: after,
      plan_completed: after.completed,
      newly_finished_books: newlyFinished,
    });
  } catch (error: any) {
    console.error('Error updating reading progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to update reading progress' }, { status: 500 });
  }
}
