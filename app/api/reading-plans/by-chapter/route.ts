import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { BUILTIN_PLANS, getPlanDays } from '../lib';

// GET /api/reading-plans/by-chapter?book=1&chapter=5&userEmail=...
// Answers the Bible reader's question: "which reading plans contain this
// chapter, which day is it in each, and has the user done that day?"
// ALSO answers the follow-up the reader needs: "where does this chapter sit
// inside that day's reading?" — so the reader can show a green plan indicator
// on every chapter of the day, but only offer "Mark complete" on the LAST
// chapter of the day (e.g. Day 3 = Genesis 5–6 → the button appears at the
// end of Genesis 6, not Genesis 5).
// Returns: { success, matches: [{ plan_id, plan_title, day_number, day_label,
//   total_days, completed_days, completed, day_done, current_day, pct,
//   day_readings: [{book_number, chapter}], day_chapter_index,
//   day_chapter_count, is_last_chapter_of_day,
//   next_chapter: {book_number, chapter} | null }] }
export const dynamic = 'force-dynamic';

type Reading = { book_number: number; chapter: number };

function dayPosition(readings: Reading[], book: number, chapter: number) {
  const idx = readings.findIndex((r) => r.book_number === book && r.chapter === chapter);
  const index = idx === -1 ? 1 : idx + 1;
  const count = Math.max(readings.length, 1);
  return {
    day_readings: readings,
    day_chapter_index: index,
    day_chapter_count: count,
    is_last_chapter_of_day: idx !== -1 && idx === readings.length - 1,
    next_chapter: idx !== -1 && idx < readings.length - 1 ? readings[idx + 1] : null,
  };
}

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
      if (userEmail) {
        try {
          const rows: any[] = await sql`
            SELECT day_number FROM user_reading_progress
            WHERE LOWER(TRIM(user_email)) = ${userEmail} AND plan_id = ${plan.id} AND completed = true`;
          const doneSet = new Set(rows.map((r: any) => Number(r.day_number)));
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
        ...dayPosition(day.readings as Reading[], book, chapter),
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
        // Whole day's readings, in order, so we know if this is the last chapter.
        let dayReadings: Reading[] = [{ book_number: book, chapter }];
        try {
          const all: any[] = await sql`
            SELECT book_number, book_id, chapter, chapter_number FROM plan_days
            WHERE plan_id = ${planId} AND day_number = ${Number(dr.day_number)}
            ORDER BY id ASC`;
          if (all.length) {
            dayReadings = all.map((r: any) => ({
              book_number: Number(r.book_number ?? r.book_id),
              chapter: Number(r.chapter ?? r.chapter_number),
            }));
          }
        } catch { /* fall back to this chapter alone */ }
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
          ...dayPosition(dayReadings, book, chapter),
        });
      }
    } catch { /* no plan_days table — built-ins already covered the common case */ }

    // Most specific plan first (fewest days) — the reader treats that one as primary.
    matches.sort((a, b) => (a.total_days || 9999) - (b.total_days || 9999));
    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error('Error in by-chapter lookup:', error);
    return NextResponse.json({ success: false, error: 'Failed to look up reading plans' }, { status: 500 });
  }
}
