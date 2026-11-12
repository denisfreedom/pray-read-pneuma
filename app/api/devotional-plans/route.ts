import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// app/api/devotional-plans/route.ts — RESTORED API route (NOT a page component)
// This is an API Route Handler: it must export GET, not a React component.
// It returns the same 26 devotionals the admin saved in devotional_entries,
// shaped as "plans" so any old code fetching /api/devotional-plans keeps working.
// If the table does not exist yet, it returns [] instead of a 500.

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || '';
  if (!url) throw new Error('No database URL found in env.');
  return neon(url);
}

export async function GET() {
  try {
    const sql = getSql();
    let rows: any[] = [];
    try {
      rows = await sql`SELECT * FROM devotional_entries ORDER BY devotional_number ASC, id ASC`;
    } catch {
      rows = await sql`SELECT * FROM devotional_entries ORDER BY id ASC`;
    }
    // Shape as plans: keep all original fields, add plan-friendly aliases.
    const plans = (rows as any[]).map((e) => ({
      ...e,
      id: e.id,
      plan_id: e.devotional_number,
      devotional_number: e.devotional_number,
      title: e.title,
      description: String(e.devotional_text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
    }));
    return NextResponse.json(plans);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Table missing -> return empty list, not a crash, so the reader page shows "No devotionals yet" instead of 500.
    if (msg.includes('does not exist') && msg.includes('devotional_entries')) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
