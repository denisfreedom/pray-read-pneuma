import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { BUILTIN_PLANS, getPlanDays } from '../lib';

// GET /api/reading-plans/by-chapter?book=45&chapter=1&userEmail=...
// Answers the Bible reader's question: "which reading plans contain this
// chapter, which day is it in each, and has the user done that day?"
// Built-in plans are mapped from real chapter counts (lib.ts). DB plans are
// mapped from plan_days rows when that table exists.
// Returns: { success, matches: [{ plan_id, plan_title, day_number, day_label,
//   total_days, completed_days, completed, day_done, current_day, pct }] }
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const book = parseInt(String(searchParams.get('book') || searchParams.get('book_number') || ''), 10);
    const chapter = parseInt(String(searchParams.get('chapter') || ''), 10);
    const userEmail = String(searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();
    if (Number.isNaN(book) || Number.isNaN(chapter)) {
      return NextResponse.json({ success: false, error: 'book and chapter are required' }, { status: 400 });
    }

    const matches: any[] = [];

    // Built-in plans — day mapping from lib.ts (exact chapter math).
    for (const plan of BUILTIN_PLANS) {
      const days = getPlanDays(plan);
      const day = days.find((d) => d.readings.some((r) => r.book_number === book && r.chapter === chapter));
      if (!day) continue;
      let completedDays = 0;
      let dayDone = false;
      let doneSet = new Set<number>();
      if (userEmail) {
        try {
          const rows: any[] = await sql`
            SELECT day_number FROM user_reading_progress
            WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${plan.id} AND completed = true`;
          doneSet = new Set(rows.map((r: any) => Number(r.day_number)));
          completedDays = doneSet.size;
          dayDone = doneSet.has(day.day_number);
        } catch { /* progress table missing — treat as not started */ }
      }
      const totalDays = plan.duration_days;
      const completed = totalDays > 0 && completedDays >= totalDays;
      matches.push({
        plan_id: plan.id, plan_title: plan.title,
        day_number: day.day_number, day_label: day.label,
        total_days: totalDays, completed_days: completedDays,
        completed, day_done: dayDone,
        current_day: completed ? totalDays : Math.min(completedDays + 1, Math.max(totalDays, 1)),
        pct: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
      });
    }

    // DB plans — only when plan_days rows map this chapter.
    try {
      const dayRows: any[] = await sql`
        SELECT plan_id, day_number FROM plan_days
        WHERE (book_number = ${book} OR book_id = ${book})
          AND (chapter = ${chapter} OR chapter_number = ${chapter})`;
      const seen = new Set(matches.map((m) => m.plan_id));
      for (const dr of dayRows) {
        const planId = Number(dr.plan_id);
        if (seen.has(planId)) continue;
        seen.add(planId);
        let title = 'Reading Plan';
        let totalDays = 0;
        try {
          const pr: any[] = await sql`SELECT * FROM reading_plans WHERE id = ${planId} LIMIT 1`;
          if (pr[0]) {
            title = pr[0].title || pr[0].name || title;
            totalDays = Number(pr[0].duration_days ?? pr[0].duration ?? pr[0].total_days ?? pr[0].day_count ?? 0) || 0;
          }
        } catch { /* reading_plans table missing */ }
        let completedDays = 0;
        let dayDone = false;
        if (userEmail) {
          try {
            const rows: any[] = await sql`
              SELECT day_number FROM user_reading_progress
              WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${planId} AND completed = true`;
            completedDays = rows.length;
            dayDone = rows.some((r: any) => Number(r.day_number) === Number(dr.day_number));
          } catch { /* ignore */ }
        }
        const completed = totalDays > 0 && completedDays >= totalDays;
        matches.push({
          plan_id: planId, plan_title: title,
          day_number: Number(dr.day_number), day_label: `Day ${dr.day_number}`,
          total_days: totalDays, completed_days: completedDays,
          completed, day_done: dayDone,
          current_day: completed ? totalDays : Math.min(completedDays + 1, Math.max(totalDays, 1)),
          pct: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
        });
      }
    } catch { /* no plan_days table — built-ins already covered the common case */ }

    // Most specific plan first (fewest days) — the reader auto-marks that one.
    matches.sort((a, b) => (a.total_days || 9999) - (b.total_days || 9999));
    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error('Error in by-chapter lookup:', error);
    return NextResponse.json({ success: false, error: 'Failed to look up reading plans' }, { status: 500 });
  }
}
