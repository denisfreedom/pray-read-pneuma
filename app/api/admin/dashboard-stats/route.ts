import { NextResponse } from 'next/server';
import sql, { isDbConfigured } from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// app/api/admin/dashboard-stats/route.ts — FIXED
// ROOT CAUSE of "No stats available" in the Admin Panel Dashboard tab:
// Old file ran 13 queries in sequence. One missing table (bible_qa,
// forum_posts, verse_view_log, etc.) threw, the whole route returned 500,
// the panel saw !response.ok and set stats to null.
// Now: every query runs on its own. Missing table -> 0 / [] for that
// one stat, the other 12 still return, and the route NEVER 500s for
// a missing table. Same response shape, same field names.
// Also fixed: topBooks joined on bb.id, but every other file joins
// book_id -> bb.book_number. Now uses book_number like activity-log does.

async function safeCount(fn: () => Promise<any>): Promise<number> {
  try {
    const [row] = await fn();
    return row?.count ?? 0;
  } catch (e: any) {
    console.error('dashboard-stats count skipped:', e?.message || e);
    return 0;
  }
}

async function safeList(fn: () => Promise<any>): Promise<any[]> {
  try {
    const r = await fn();
    return Array.isArray(r) ? r : [];
  } catch (e: any) {
    console.error('dashboard-stats list skipped:', e?.message || e);
    return [];
  }
}

const ZERO_STATS = {
  totalUsers: 0,
  activeUsers: 0,
  todaySignups: 0,
  weekSignups: 0,
  unreadMessages: 0,
  totalVerseViews: 0,
  totalBookmarks: 0,
  totalVerses: 0,
  totalQA: 0,
  totalPosts: 0,
  topBooks: [],
  recentSignups: [],
  locationStats: [],
  dailyActivity: [],
};

export async function GET() {
  try {
    if (!isDbConfigured()) {
      // Return zero stats (not 500) so the panel shows 0s, not "No stats available".
      return NextResponse.json({ ...ZERO_STATS, dbConfigured: false });
    }

    const [
      usersCount,
      betterAuthCount,
      activeUsers,
      todaySignups,
      weekSignups,
      unreadMessages,
      totalVerseViews,
      totalBookmarks,
      totalVerses,
      totalQA,
      totalPosts,
      recentSignups,
      locationStats,
      topBooks,
      dailyActivity,
    ] = await Promise.all([
      safeCount(() => sql`SELECT COUNT(*)::int as count FROM users`),
      safeCount(() => sql`SELECT COUNT(*)::int as count FROM "user"`),
      safeCount(() => sql`
        SELECT COUNT(*)::int as count FROM users
        WHERE last_active > NOW() - INTERVAL '30 days'
          OR last_login > NOW() - INTERVAL '30 days'
      `),
      safeCount(() => sql`
        SELECT COUNT(*)::int as count FROM users WHERE created_at >= CURRENT_DATE
      `),
      safeCount(() => sql`
        SELECT COUNT(*)::int as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      `),
      safeCount(() => sql`
        SELECT COUNT(*)::int as count FROM contact_messages WHERE status = 'unread' OR status IS NULL
      `),
      safeCount(() => sql`SELECT COUNT(*)::int as count FROM verse_view_log`),
      safeCount(() => sql`SELECT COUNT(*)::int as count FROM verse_bookmarks`),
      safeCount(() => sql`SELECT COUNT(*)::int as count FROM bible_verses`),
      safeCount(() => sql`SELECT COUNT(*)::int as count FROM bible_qa`),
      safeCount(() => sql`SELECT COUNT(*)::int as count FROM forum_posts`),
      safeList(() => sql`
        SELECT id, name, email, country, city, created_at, last_login, is_active, last_active
        FROM users ORDER BY created_at DESC LIMIT 20
      `),
      safeList(() => sql`
        SELECT country, city, COUNT(*)::int as count
        FROM users WHERE country IS NOT NULL
        GROUP BY country, city ORDER BY count DESC LIMIT 10
      `),
      safeList(() => sql`
        SELECT bb.name_english as book_name, COUNT(*)::int as visits
        FROM book_visit_log bvl
        JOIN bible_books bb ON bvl.book_id = bb.book_number
        GROUP BY bb.name_english ORDER BY visits DESC LIMIT 5
      `),
      safeList(() => sql`
        SELECT DATE(created_at)::text as date, COUNT(*)::int as verse_views
        FROM verse_view_log
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY date ASC
      `),
    ]);

    const totalUsers = (usersCount || 0) + (betterAuthCount || 0);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      todaySignups,
      weekSignups,
      unreadMessages,
      totalVerseViews,
      totalBookmarks,
      totalVerses,
      totalQA,
      totalPosts,
      topBooks,
      recentSignups,
      locationStats,
      dailyActivity,
      dbConfigured: true,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    // Last resort: never 500 — return zero stats so the panel shows 0s.
    return NextResponse.json({ ...ZERO_STATS, dbConfigured: false });
  }
}
