import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

// GET /api/reading-plans
// THE BUG: this route never existed, so the Reading Plans page fetched a 404
// and showed "Couldn't Load Reading Plans" forever.
// This route ALWAYS returns 200 with plans:
//   1. If a reading_plans table exists, its rows (normalized for any column names).
//   2. Otherwise, curated built-in plans (real Bible structure), so the page
//      works today and keeps working even before an admin adds plans.
// Built-ins are marked builtin: true and carry first_book_number, so the list
// page can send the reader straight to the plan's first book.
const BUILTIN = [
  { id: 1001, title: 'The Whole Bible in a Year', description: 'The full story of Scripture, Genesis to Revelation — a steady chapter-a-day rhythm that takes you through the whole Bible in one year.', duration_days: 365, icon: '📖', day_count: 365, first_book: 'Genesis', first_book_number: 1, builtin: true },
  { id: 1002, title: 'New Testament in 90 Days', description: 'From Matthew to Revelation in three focused months. A faster pace for a season when you want the whole New Testament fresh in your mind.', duration_days: 90, icon: '📘', day_count: 90, first_book: 'Matthew', first_book_number: 40, builtin: true },
  { id: 1003, title: 'Psalms in 30 Days', description: 'One month in the prayer book of the Bible — praise, lament, thanksgiving and trust, a psalm a day for thirty days.', duration_days: 30, icon: '🎵', day_count: 30, first_book: 'Psalms', first_book_number: 19, builtin: true },
  { id: 1004, title: 'Proverbs: 31 Days of Wisdom', description: 'A chapter of Proverbs a day for a month — practical wisdom for work, family, money and speech.', duration_days: 31, icon: '💡', day_count: 31, first_book: 'Proverbs', first_book_number: 20, builtin: true },
  { id: 1005, title: 'The Gospels in 60 Days', description: 'Matthew, Mark, Luke and John in two months — the life, teaching, death and resurrection of Jesus, four times over.', duration_days: 60, icon: '✝️', day_count: 60, first_book: 'Matthew', first_book_number: 40, builtin: true },
  { id: 1006, title: 'Genesis: Beginnings in 30 Days', description: 'Creation, the fall, Abraham, Jacob and Joseph — the foundations of the whole story in one month.', duration_days: 30, icon: '🌅', day_count: 30, first_book: 'Genesis', first_book_number: 1, builtin: true },
  { id: 1007, title: 'Romans in 16 Days', description: 'One chapter a day through Paul’s great letter — sin, grace, faith, and life in the Spirit.', duration_days: 16, icon: '✉️', day_count: 16, first_book: 'Romans', first_book_number: 45, builtin: true },
  { id: 1008, title: 'John in 21 Days', description: 'Three weeks in the Gospel of John — who Jesus is, in his own words and works.', duration_days: 21, icon: '❤️', day_count: 21, first_book: 'John', first_book_number: 43, builtin: true },
];

function normalizeRow(r: any, i: number) {
  return {
    id: r.id ?? 1000 + i,
    title: r.title || r.name || 'Reading Plan',
    description: r.description || r.desc || r.summary || '',
    duration_days: Number(r.duration_days ?? r.duration ?? r.total_days ?? r.day_count ?? 0) || 0,
    icon: r.icon || r.emoji || '📖',
    day_count: Number(r.day_count ?? r.total_days ?? r.duration_days ?? 0) || 0,
    first_book: r.first_book || r.start_book || null,
    first_book_number: r.first_book_number ?? null,
    enrolled: r.enrolled ?? undefined,
    completed_days: r.completed_days ?? undefined,
    current_day: r.current_day ?? undefined,
    completed: r.completed ?? undefined,
  };
}

export async function GET() {
  // Try the DB first — tolerate either table name and any column naming.
  for (const table of ['reading_plans', 'bible_reading_plans']) {
    try {
      const rows: any[] = await sql`SELECT * FROM ${sql(table)} ORDER BY id ASC`;
      if (Array.isArray(rows) && rows.length) {
        const plans = rows
          .filter((r: any) => r.is_active !== false && r.published !== false && r.is_archived !== true)
          .map(normalizeRow);
        if (plans.length) return NextResponse.json({ success: true, plans, source: 'db' });
      }
    } catch {
      // Table missing / wrong columns — try the next name, then fall through.
    }
  }
  // No DB plans yet — the page still gets real plans.
  return NextResponse.json({ success: true, plans: BUILTIN, source: 'builtin' });
}
