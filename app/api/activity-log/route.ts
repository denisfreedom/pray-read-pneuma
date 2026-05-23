import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/activity-log
 * Log any type of user activity (verse view, prayer expanded, devotional accessed, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_email,
      activity_type, // 'verse_view', 'prayer_view', 'prayer_expanded', 'devotional_access', 'book_visit', 'bookmark'
      book_id,
      chapter,
      verse_number,
      plan_id,
      day_number,
      metadata = {}
    } = body;

    if (!user_email || !activity_type) {
      return NextResponse.json(
        { error: 'Missing required fields: user_email, activity_type' },
        { status: 400 }
      );
    }

    let result;

    switch (activity_type) {
      case 'verse_view':
        if (!book_id || !chapter || verse_number === undefined) {
          return NextResponse.json(
            { error: 'verse_view requires: book_id, chapter, verse_number' },
            { status: 400 }
          );
        }
        result = await sql`
          INSERT INTO verse_view_log (user_email, book_id, chapter, verse_number, action)
          VALUES (${user_email}, ${book_id}, ${chapter}, ${verse_number}, 'view')
          RETURNING id, created_at
        `;
        break;

      case 'prayer_view':
      case 'prayer_expanded':
        if (!book_id || !chapter || verse_number === undefined) {
          return NextResponse.json(
            { error: 'prayer activity requires: book_id, chapter, verse_number' },
            { status: 400 }
          );
        }
        const action = activity_type === 'prayer_expanded' ? 'expand' : 'view';
        result = await sql`
          INSERT INTO prayer_activity_log (user_email, book_id, chapter, verse_number, action)
          VALUES (${user_email}, ${book_id}, ${chapter}, ${verse_number}, ${action})
          RETURNING id, created_at
        `;
        break;

      case 'book_visit':
        if (!book_id || !chapter) {
          return NextResponse.json(
            { error: 'book_visit requires: book_id, chapter' },
            { status: 400 }
          );
        }
        result = await sql`
          INSERT INTO book_visit_log (user_email, book_id, chapter)
          VALUES (${user_email}, ${book_id}, ${chapter})
          RETURNING id, visited_at as created_at
        `;
        break;

      case 'devotional_access':
        if (!plan_id || day_number === undefined) {
          return NextResponse.json(
            { error: 'devotional_access requires: plan_id, day_number' },
            { status: 400 }
          );
        }
        result = await sql`
          INSERT INTO devotional_access_log (user_email, plan_id, day_number, action)
          VALUES (${user_email}, ${plan_id}, ${day_number}, 'view')
          RETURNING id, created_at
        `;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown activity_type: ${activity_type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Activity logged: ${activity_type}`,
      activityId: result[0]?.id,
      timestamp: result[0]?.created_at
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to log activity';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/activity-log?userEmail=...
 * Get recent activity logs for a user (combined feed)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userEmail = searchParams.get('userEmail');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }

    // Fetch verse views
    const verseViews = await sql`
      SELECT 
        'verse_view' as activity_type,
        bb.name_english as book_name,
        bb.book_number,
        vvl.chapter,
        vvl.verse_number,
        vvl.created_at
      FROM verse_view_log vvl
      LEFT JOIN bible_books bb ON vvl.book_id = bb.id
      WHERE vvl.user_email = ${userEmail}
      ORDER BY vvl.created_at DESC
      LIMIT ${limit}
    `;

    // Fetch prayer views
    const prayerViews = await sql`
      SELECT 
        'prayer_view' as activity_type,
        bb.name_english as book_name,
        bb.book_number,
        pal.chapter,
        pal.verse_number,
        pal.created_at
      FROM prayer_activity_log pal
      LEFT JOIN bible_books bb ON pal.book_id = bb.id
      WHERE pal.user_email = ${userEmail} AND pal.action = 'view'
      ORDER BY pal.created_at DESC
      LIMIT ${limit}
    `;

    // Fetch prayer expansions
    const prayerExpansions = await sql`
      SELECT 
        'prayer_expanded' as activity_type,
        bb.name_english as book_name,
        bb.book_number,
        pal.chapter,
        pal.verse_number,
        pal.created_at
      FROM prayer_activity_log pal
      LEFT JOIN bible_books bb ON pal.book_id = bb.id
      WHERE pal.user_email = ${userEmail} AND pal.action = 'expand'
      ORDER BY pal.created_at DESC
      LIMIT ${limit}
    `;

    // Fetch book visits
    const bookVisits = await sql`
      SELECT 
        'book_visit' as activity_type,
        bb.name_english as book_name,
        bb.book_number,
        bvl.chapter,
        NULL as verse_number,
        bvl.visited_at as created_at
      FROM book_visit_log bvl
      LEFT JOIN bible_books bb ON bvl.book_id = bb.id
      WHERE bvl.user_email = ${userEmail}
      ORDER BY bvl.visited_at DESC
      LIMIT ${limit}
    `;

    // Fetch bookmarks
    const bookmarks = await sql`
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
      LIMIT ${limit}
    `;

    // Fetch devotional accesses
    const devotionalAccess = await sql`
      SELECT 
        'devotional_access' as activity_type,
        dp.title as book_name,
        NULL as book_number,
        dal.day_number as chapter,
        NULL as verse_number,
        dal.created_at
      FROM devotional_access_log dal
      LEFT JOIN devotional_plans dp ON dal.plan_id = dp.id
      WHERE dal.user_email = ${userEmail}
      ORDER BY dal.created_at DESC
      LIMIT ${limit}
    `;

    // Combine and sort all activities by date
    const allActivities = [
      ...verseViews,
      ...prayerViews,
      ...prayerExpansions,
      ...bookVisits,
      ...bookmarks,
      ...devotionalAccess
    ]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      activityCount: allActivities.length,
      activities: allActivities
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch activity log';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
