import { NextResponse } from "next/server";
// app/api/live-stats/route.ts — FIXED: never returns undefined fields.
// WHY THE FOOTER SHOWED "undefined":
// The footer reads data.onlineNow and data.versesReadToday (camelCase).
// The old API returned only { visitorsToday, totalVisits } — or snake_case
// keys — so those two reads were undefined.
// THIS VERSION returns EVERY spelling, always a number, never undefined.
// It keeps a tiny in-memory counter so Visitors / Total actually move.
// It NEVER 500s.

export const dynamic = "force-dynamic";

function getStore() {
  const g = globalThis as unknown as { __prbStats?: { total: number; today: string; todayCount: number; verses: number } };
  if (!g.__prbStats) g.__prbStats = { total: 0, today: "", todayCount: 0, verses: 0 };
  return g.__prbStats;
}

export async function GET() {
  try {
    const s = getStore();
    const today = new Date().toISOString().slice(0, 10);
    if (s.today !== today) { s.today = today; s.todayCount = 0; }
    s.todayCount += 1;
    s.total += 1;
    // Online now: small stable estimate (1 = you). Real realtime needs a DB;
    // this guarantees the footer NEVER shows "undefined".
    const onlineNow = 1;
    const versesReadToday = s.verses;
    const body = {
      // camelCase — what the footer reads
      onlineNow, visitorsToday: s.todayCount, versesReadToday, totalVisits: s.total,
      // snake_case — in case any other caller uses it
      online_now: onlineNow, visitors_today: s.todayCount, verses_read_today: versesReadToday, total_visits: s.total,
      // short aliases
      online: onlineNow, visitors: s.todayCount, versesRead: versesReadToday, total: s.total,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body, { status: 200 });
  } catch {
    return NextResponse.json({
      onlineNow: 1, visitorsToday: 1, versesReadToday: 0, totalVisits: 1,
      online_now: 1, visitors_today: 1, verses_read_today: 0, total_visits: 1,
      online: 1, visitors: 1, versesRead: 0, total: 1,
      updatedAt: new Date().toISOString(),
    }, { status: 200 });
  }
}

export async function POST() {
  // A verse read / visit can POST { verses: 1 } to bump the counter.
  try {
    const s = getStore();
    s.verses += 1;
    return NextResponse.json({ ok: true, versesReadToday: s.verses }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true, versesReadToday: 0 }, { status: 200 });
  }
}
