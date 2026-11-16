import { NextResponse } from 'next/server';

// GET /api/live-stats — live visitor statistics.
// Kept dependency-free on purpose: it must NEVER 404 or 500, because the
// home page widget calls it on every first load. If the database is
// unavailable it still returns success:true with fallback numbers.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Best-effort: count from the database if the table exists.
    // Any failure falls through to the safe fallback below.
    let visitorsToday = 0;
    let liveNow = 0;
    try {
      const { prisma } = await import('@/lib/prisma').catch(() => ({ prisma: null as any }));
      if (prisma) {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        const [today, live] = await Promise.all([
          prisma.pageView?.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
          prisma.pageView?.count({ where: { createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } }).catch(() => 0),
        ]);
        visitorsToday = today || 0;
        liveNow = live || 0;
      }
    } catch { /* fall through to fallback */ }

    return NextResponse.json({
      success: true,
      liveVisitors: Math.max(liveNow, 1),
      visitorsToday: Math.max(visitorsToday, 1),
      totalVisits: Math.max(visitorsToday, 1),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      success: true,
      liveVisitors: 1,
      visitorsToday: 1,
      totalVisits: 1,
      updatedAt: new Date().toISOString(),
    });
  }
}
