import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// GET  -> { activeUsers, last24Hours, recentUsers: [{ country, city, timestamp }] }
// POST -> records/refreshes one visitor heartbeat { sessionId }
// A visitor counts as "live" while they have pinged in the last 5 minutes.
// The tracker pings on page load and every 60s, so closing the tab stops
// the heartbeat and the visitor drops off the live count automatically.

const ACTIVE_WINDOW_MINUTES = 5;
const RETENTION_HOURS = 48;

function getSql() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS visitor_activity (
      session_id TEXT PRIMARY KEY,
      country TEXT NOT NULL DEFAULT 'Unknown',
      city TEXT NOT NULL DEFAULT 'Unknown',
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  // Keep the table small: drop heartbeats older than the retention window.
  await sql`
    DELETE FROM visitor_activity
    WHERE last_seen < NOW() - (${RETENTION_HOURS} || ' hours')::INTERVAL;
  `;
}

function headerLocation(req: NextRequest) {
  // Vercel fills these in on every request — no GPS / no cookies needed.
  const rawCountry = req.headers.get('x-vercel-ip-country') || '';
  const rawCity = req.headers.get('x-vercel-ip-city') || '';
  let city = rawCity;
  try {
    city = decodeURIComponent(rawCity);
  } catch {
    /* keep raw value */
  }
  return {
    country: rawCountry || 'Unknown',
    city: city || 'Unknown',
  };
}

export async function GET() {
  const sql = getSql();
  if (!sql) {
    // No DB configured yet: never 500 — the widget shows zeros + retry note.
    return NextResponse.json({ activeUsers: 0, last24Hours: 0, recentUsers: [] });
  }
  try {
    await ensureTable(sql);

    const [activeRows, dayRows, recentRows] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS count FROM visitor_activity
        WHERE last_seen > NOW() - (${ACTIVE_WINDOW_MINUTES} || ' minutes')::INTERVAL;
      `,
      sql`
        SELECT COUNT(DISTINCT session_id)::int AS count FROM visitor_activity
        WHERE last_seen > NOW() - INTERVAL '24 hours';
      `,
      sql`
        SELECT country, city, last_seen AS timestamp FROM visitor_activity
        WHERE last_seen > NOW() - INTERVAL '24 hours'
        ORDER BY last_seen DESC
        LIMIT 10;
      `,
    ]);

    return NextResponse.json({
      activeUsers: activeRows[0]?.count ?? 0,
      last24Hours: dayRows[0]?.count ?? 0,
      recentUsers: recentRows.map((r) => ({
        country: r.country as string,
        city: r.city as string,
        timestamp: new Date(r.timestamp as string).toISOString(),
      })),
    });
  } catch (error) {
    console.error('visitor-stats GET failed:', error);
    return NextResponse.json({ activeUsers: 0, last24Hours: 0, recentUsers: [] });
  }
}

export async function POST(req: NextRequest) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ ok: false, reason: 'no-db' }, { status: 200 });

  let sessionId = '';
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.sessionId === 'string') sessionId = body.sessionId.trim();
  } catch {
    /* body optional */
  }
  if (!sessionId || sessionId.length > 128) {
    return NextResponse.json({ ok: false, reason: 'missing-session' }, { status: 400 });
  }

  const { country, city } = headerLocation(req);
  try {
    await ensureTable(sql);
    // One row per browser session; every heartbeat just refreshes last_seen.
    await sql`
      INSERT INTO visitor_activity (session_id, country, city, last_seen, first_seen)
      VALUES (${sessionId}, ${country}, ${city}, NOW(), NOW())
      ON CONFLICT (session_id)
      DO UPDATE SET last_seen = NOW(), country = EXCLUDED.country, city = EXCLUDED.city;
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('visitor-stats POST failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
