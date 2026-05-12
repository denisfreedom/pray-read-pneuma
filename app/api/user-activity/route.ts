import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: 'userEmail is required' },
        { status: 400 }
      );
    }

    // Get user's bookmarks
    const bookmarks = await sql`
      SELECT COUNT(*) as count FROM verse_bookmarks WHERE user_email = ${userEmail}
    `;

    // Get user's reading plans enrolled
    const readingPlans = await sql`
      SELECT DISTINCT rp.id, rp.title, rp.description, rp.duration_days, rp.icon,
        COUNT(CASE WHEN urp.completed = true THEN 1 END)::integer as completed_days,
        COUNT(urp.day_number)::integer as total_days
      FROM reading_plans rp
      LEFT JOIN user_reading_progress urp ON rp.id = urp.plan_id AND urp.user_email = ${userEmail}
      WHERE urp.user_email = ${userEmail} OR urp.user_email IS NULL
      GROUP BY rp.id, rp.title, rp.description, rp.duration_days, rp.icon
      LIMIT 10
    `;

    // Get user's visited books (from bookmarks and progress)
    const visitedBooks = await sql`
      SELECT DISTINCT bb.id, bb.book_number, bb.name_english, bb.name_luganda, 
        COUNT(DISTINCT vb.verse_number) as bookmark_count
      FROM bible_books bb
      LEFT JOIN verse_bookmarks vb ON bb.id = vb.book_id AND vb.user_email = ${userEmail}
      WHERE vb.user_email = ${userEmail}
      GROUP BY bb.id, bb.book_number, bb.name_english, bb.name_luganda
      ORDER BY bookmark_count DESC
      LIMIT 12
    `;

    // Get user's recent activity (activity history) - UNION of bookmarks and prayer views
    const bookmarkActivity = await sql`
      SELECT 
        'bookmark' as activity_type,
        bb.name_english as book_name,
        bb.book_number,
        vb.chapter,
        vb.verse_number,
        vb.created_at
      FROM verse_bookmarks vb
      LEFT JOIN bible_books bb ON vb.book_id = bb.id
      WHERE vb.user_email = ${userEmail}
      ORDER BY vb.created_at DESC
      LIMIT 20
    `;

    // Get prayer activity if the table exists
    let prayerActivity = [];
    try {
      prayerActivity = await sql`
        SELECT 
          'prayer' as activity_type,
          bb.name_english as book_name,
          bb.book_number,
          pal.chapter,
          pal.verse_number,
          pal.created_at
        FROM prayer_activity_log pal
        LEFT JOIN bible_books bb ON pal.book_id = bb.id
        WHERE pal.user_email = ${userEmail}
        ORDER BY pal.created_at DESC
        LIMIT 20
      `;
    } catch (e) {
      // Table might not exist yet, continue without prayer activity
      prayerActivity = [];
    }

    // Combine and sort by date
    const combinedActivity = [...bookmarkActivity, ...prayerActivity]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);

    // Calculate reading streak and time spent (days active)
    const activityStats = await sql`
      SELECT 
        COUNT(DISTINCT DATE(created_at))::integer as days_active,
        MAX(created_at) as last_activity,
        COUNT(*)::integer as total_bookmarks
      FROM verse_bookmarks
      WHERE user_email = ${userEmail}
    `;

    return NextResponse.json({
      success: true,
      bookmarkCount: bookmarks[0]?.count || 0,
      readingPlans: readingPlans || [],
      visitedBooks: visitedBooks || [],
      activityHistory: combinedActivity || [],
      stats: activityStats[0] || { days_active: 0, last_activity: null, total_bookmarks: 0 }
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user activity', error: String(error) },
      { status: 500 }
    );
  }
}
