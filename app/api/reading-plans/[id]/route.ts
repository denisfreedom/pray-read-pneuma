import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { getBuiltinPlan, getPlanDays } from '../lib';

// GET /api/reading-plans/[id]?userEmail=
// Returns the plan, its day-by-day readings, the user's progress and the
// books they have finished in this plan. Built-in plans generate their days
// from real chapter counts (lib.ts); DB plans use plan_days rows when that
// table exists, otherwise plain Day 1..N entries.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const planId = parseInt(params.id, 10);
    if (Number.isNaN(planId)) return NextResponse.json({ success: false, error: 'Invalid plan id' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    const userEmail = String(searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();

    let plan: any = null;
    let days: any[] = [];
    const builtin = getBuiltinPlan(planId);
    if (builtin) {
      plan = { ...builtin };
      days = getPlanDays(builtin);
    } else {
      try {
        const rows: any[] = await sql`SELECT * FROM reading_plans WHERE id = ${planId} LIMIT 1`;
        const row = rows[0];
        if (!row) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        plan = {
          id: row.id, title: row.title || row.name || 'Reading Plan',
          description: row.description || row.desc || row.summary || '',
          duration_days: Number(row.duration_days ?? row.duration ?? row.total_days ?? row.day_count ?? 0) || 0,
          icon: row.icon || row.emoji || '📖',
          day_count: Number(row.day_count ?? row.total_days ?? row.duration_days ?? 0) || 0,
          first_book: row.first_book || row.start_book || null,
          first_book_number: row.first_book_number ?? null,
        };
        try {
          const dayRows: any[] = await sql`SELECT * FROM plan_days WHERE plan_id = ${planId} ORDER BY day_number ASC`;
          const byDay = new Map<number, any[]>();
          for (const dr of dayRows) {
            if (!byDay.has(dr.day_number)) byDay.set(dr.day_number, []);
            byDay.get(dr.day_number)!.push(dr);
          }
          days = [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([dn, rs]) => ({
            day_number: dn,
            readings: rs.map((r: any) => ({ book_number: Number(r.book_number ?? r.book_id ?? 0), book_name: r.book_name || r.book || '', chapter: Number(r.chapter ?? r.chapter_number ?? 0) })),
            label: rs.map((r: any) => `${r.book_name || r.book || ''} ${r.chapter ?? ''}`.trim()).join(' · '),
          }));
        } catch { /* no plan_days table */ }
        if (!days.length && plan.duration_days > 0) {
          days = Array.from({ length: plan.duration_days }, (_, i) => ({ day_number: i + 1, readings: [], label: `Day ${i + 1}` }));
        }
      } catch {
        return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
      }
    }

    // Progress + finished books (same math as the progress route)
    let summary: any = null;
    if (userEmail) {
      try {
        const res = await fetch(`${new URL(request.url).origin}/api/reading-plans/progress?userEmail=${encodeURIComponent(userEmail)}&planId=${planId}`, { cache: 'no-store' });
        const d = await res.json().catch(() => null);
        if (d?.success) summary = d.summary;
      } catch { /* progress is best-effort here */ }
    }
    return NextResponse.json({ success: true, plan, days, summary });
  } catch (error: any) {
    console.error('Error fetching reading plan detail:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reading plan' }, { status: 500 });
  }
}
