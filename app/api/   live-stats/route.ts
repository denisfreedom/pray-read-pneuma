import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
export const dynamic = 'force-dynamic';

// app/api/live-stats/route.ts — REDEVELOPED (the chain that makes the numbers move)
// WHY THE OLD ONE SHOWED 0 EVERYWHERE:
//   1) It only counted a visit if this route was deployed AND the table existed.
//      If either failed it silently returned zeros — forever.
//   2) "Verses read today" queried a user_activity table that NOTHING ever writes
//      to, so that number was hard-wired to stay 0.
//   3) "Today" used the database server's timezone, not Kampala time.
// THIS VERSION:
//   - Creates its own tables on first call (no manual SQL step needed).
//   - POST records ONE visit per visitor per 30 minutes (refreshes don't inflate it).
//   - "Today" = Kampala day (Africa/Kampala, UTC+3), not server time.
//   - Verses read today = explicit verse_read events if any exist, otherwise
//     Bible Reader page visits today (works with ZERO changes to other pages).
//   - GET never crashes the footer: on DB failure it returns the last-known shape.

type Stats = { onlineNow: number; visitorsToday: number; totalVisits: number; versesReadToday: number; updatedAt: string };
const FALLBACK: Stats = { onlineNow: 0, visitorsToday: 0, totalVisits: 0, versesReadToday: 0, updatedAt: new Date().toISOString() };

function kampalaDayStart(): Date {
  // Kampala is UTC+3 year-round (no DST): Kampala midnight = 21:00 UTC the day before.
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 3 * 3600 * 1000);
}

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS site_visits (id SERIAL PRIMARY KEY, visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), path TEXT, visitor_key TEXT, user_agent TEXT)`;
  await sql`CREATE TABLE IF NOT EXISTS verse_reads (id SERIAL PRIMARY KEY, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), path TEXT, visitor_key TEXT)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON site_visits (visited_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON site_visits (visitor_key, visited_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_verse_reads_read_at ON verse_reads (read_at)`;
}

async function compute(): Promise<Stats & { debug: { visitsTable: boolean; verseReadsTable: boolean } }> {
  try {
    await ensureTables();
    const dayStart = kampalaDayStart().toISOString();
    const [todayRows, totalRows, onlineRows, verseEventRows, readerVisitRows] = await Promise.all([
      sql`SELECT COUNT(DISTINCT COALESCE(visitor_key, 'anon-' || id::text))::int AS c FROM site_visits WHERE visited_at >= ${dayStart}`.catch(() => [{ c: 0 }]),
      sql`SELECT COUNT(*)::int AS c FROM site_visits`.catch(() => [{ c: 0 }]),
      sql`SELECT COUNT(DISTINCT COALESCE(visitor_key, 'anon-' || id::text))::int AS c FROM site_visits WHERE visited_at >= NOW() - INTERVAL '5 minutes'`.catch(() => [{ c: 0 }]),
      sql`SELECT COUNT(*)::int AS c FROM verse_reads WHERE read_at >= ${dayStart}`.catch(() => [{ c: 0 }]),
      sql`SELECT COUNT(*)::int AS c FROM site_visits WHERE visited_at >= ${dayStart} AND path LIKE '/bible-reader%'`.catch(() => [{ c: 0 }]),
    ]);
    const verseEvents = verseEventRows[0]?.c || 0;
    const readerVisits = readerVisitRows[0]?.c || 0;
    return {
      onlineNow: onlineRows[0]?.c || 0,
      visitorsToday: todayRows[0]?.c || 0,
      totalVisits: totalRows[0]?.c || 0,
      // Prefer explicit verse-read events; fall back to Bible Reader visits (no double-count).
      versesReadToday: verseEvents > 0 ? verseEvents : readerVisits,
      updatedAt: new Date().toISOString(),
      debug: { visitsTable: true, verseReadsTable: true },
    };
  } catch {
    return { ...FALLBACK, debug: { visitsTable: false, verseReadsTable: false } };
  }
}

export async function GET() {
  const stats = await compute();
  return NextResponse.json({ success: true, stats }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json().catch(() => ({}));
    const path = String(body?.path || '/').slice(0, 200);
    const visitorKey = String(body?.visitorKey || '').slice(0, 100) || null;
    const event = String(body?.event || '');
    await ensureTables();
    if (event === 'verse_read') {
      // Explicit "a verse was read" event (the reader page can dispatch it — see widget notes).
      await sql`INSERT INTO verse_reads (path, visitor_key) VALUES (${path}, ${visitorKey})`;
    } else {
      // Dedupe: one counted visit per visitor per 30 minutes — refreshes don't inflate.
      const recent: any[] = visitorKey
        ? await sql`SELECT 1 FROM site_visits WHERE visitor_key = ${visitorKey} AND visited_at >= NOW() - INTERVAL '30 minutes' LIMIT 1`.catch(() => [])
        : [];
      if (!recent.length) {
        await sql`INSERT INTO site_visits (path, visitor_key, user_agent) VALUES (${path}, ${visitorKey}, ${String(req.headers.get('user-agent') || '').slice(0, 200)})`;
      }
    }
  } catch { /* counting a visit must never break the page */ }
  const stats = await compute();
  return NextResponse.json({ success: true, stats }, { headers: { 'Cache-Control': 'no-store' } });
}

// ── ONLY if the API can't create tables itself (DB permissions) — run ONCE in Neon SQL Editor ──
// CREATE TABLE IF NOT EXISTS site_visits (id SERIAL PRIMARY KEY, visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), path TEXT, visitor_key TEXT, user_agent TEXT);
// CREATE TABLE IF NOT EXISTS verse_reads (id SERIAL PRIMARY KEY, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), path TEXT, visitor_key TEXT);
// CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON site_visits (visited_at);
// CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON site_visits (visitor_key, visited_at);
// CREATE INDEX IF NOT EXISTS idx_verse_reads_read_at ON verse_reads (read_at);
