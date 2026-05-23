import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [usersCount] = await sql`SELECT COUNT(*)::int as count FROM users`;
    const [betterAuthCount] = await sql`SELECT COUNT(*)::int as count FROM "user"`;
    const totalUsers = (usersCount?.count || 0) + (betterAuthCount?.count || 0);

    const [activeUsersResult] = await sql`
      SELECT COUNT(*)::int as count FROM users 
      WHERE last_active > NOW() - INTERVAL '30 days'
        OR last_login > NOW() - INTERVAL '30 days'
    `;
    const activeUsers = activeUsersResult?.count || 0;

    const [todaySignups] = await sql`
      SELECT COUNT(*)::int as count FROM users WHERE created_at >= CURRENT_DATE
    `;
    const [weekSignups] = await sql`
      SELECT COUNT(*)::int as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

    const [unreadMessagesResult] = await sql`
      SELECT COUNT(*)::int as count FROM contact_messages WHERE status = 'unread' OR status IS NULL
    `;

    const recentSignups = await sql`
      SELECT id, name, email, country, city, created_at, last_login, is_active, last_active
      FROM users ORDER BY created_at DESC LIMIT 20
    `;

    const locationStats = await sql`
      SELECT country, city, COUNT(*)::int as count 
      FROM users WHERE country IS NOT NULL 
      GROUP BY country, city ORDER BY count DESC LIMIT 10
    `;

    const [verseViewsResult] = await sql`SELECT COUNT(*)::int as count FROM verse_view_log`;
    const [bookmarksResult] = await sql`SELECT COUNT(*)::int as count FROM verse_bookmarks`;
    const [totalVerses] = await sql`SELECT COUNT(*)::int as count FROM bible_verses`;
    const [totalQA] = await sql`SELECT COUNT(*)::int as count FROM bible_qa`;
    const [totalPosts] = await sql`SELECT COUNT(*)::int as count FROM forum_posts`;

    const topBooks = await sql`
      SELECT bb.name_english as book_name, COUNT(*)::int as visits
      FROM book_visit_log bvl
      JOIN bible_books bb ON bvl.book_id = bb.id
      GROUP BY bb.name_english ORDER BY visits DESC LIMIT 5
    `;

    const dailyActivity = await sql`
      SELECT DATE(created_at)::text as date, COUNT(*)::int as verse_views
      FROM verse_view_log
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at) ORDER BY date ASC
    `;

    return NextResponse.json({
      totalUsers,
      activeUsers,
      todaySignups: todaySignups?.count || 0,
      weekSignups: weekSignups?.count || 0,
      unreadMessages: unreadMessagesResult?.count || 0,
      totalVerseViews: verseViewsResult?.count || 0,
      totalBookmarks: bookmarksResult?.count || 0,
      totalVerses: totalVerses?.count || 0,
      totalQA: totalQA?.count || 0,
      totalPosts: totalPosts?.count || 0,
      topBooks,
      recentSignups,
      locationStats,
      dailyActivity,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
