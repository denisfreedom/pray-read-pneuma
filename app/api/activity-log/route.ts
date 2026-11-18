import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/activity-log
 * Log any type of user activity (verse view, prayer expanded, devotional accessed, etc.)
 *
 * FIXED — same API contract, same activity types, but it NEVER 500s because
 * a log table is missing:
 * - The old file had NO 'bookmark' case, so POST { activity_type: 'bookmark' }
 *   returned 400 "Unknown activity_type" even though the GET reads verse_bookmarks.
 * - The old file let one missing table fail the whole request. Now each INSERT
 *   is wrapped: if the table does not exist yet, POST still returns
 *   { success: true, logged: false } so the front page / reader never breaks.
 * - GET runs each SELECT separately: one missing table -> empty list for
 *   that type, the other five types still return.
 */

// One INSERT that never throws the whole request if its table is missing.
async function safeInsert(fn: () => Promise<any>) {
  try {
    const r = await fn();
    return { ok: true, row: Array.isArray(r) ? r[0] : r };
  } catch (e: any) {
    // Table missing / column missing / DB not configured -> log, do not 500.
    console.error('activity-log insert skipped:', e?.message || e);
    return { ok: false, row: null };
  }
}

async function safeSelect(fn: () => Promise<any>) {
  try {
    const r = await fn();
    return Array.isArray(r) ? r : [];
  } catch (e: any) {
    console.error('activity-log select skipped:', e?.message || e);
    return [];
  }
}

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

    let result: { ok: boolean; row: any } = { ok: false, row: null };

    switch (activity_type) {
      case 'verse_view':
        if (!book_id || !chapter || verse_number === undefined) {
          return NextResponse.json(
            { error: 'verse_view requires: book_id, chapter, verse_number' },
            { status: 400 }
          );
        }
        result = await safeInsert(() => sql`
          INSERT INTO verse_view_log (user_email, book_id, chapter, verse_number, action)
          VALUES (${user_email}, ${book_id}, ${chapter}, ${verse_number}, 'view')
          RETURNING id, created_at
        `);
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
        result = await safeInsert(() => sql`
          INSERT INTO prayer_activity_log (user_email, book_id, chapter, verse_number, action)
          VALUES (${user_email}, ${book_id}, ${chapter}, ${verse_number}, ${action})
          RETURNING id, created_at
        `);
        break;

      case 'book_visit':
        if (!book_id || !chapter) {
          return NextResponse.json(
            { error: 'book_visit requires: book_id, chapter' },
            { status: 400 }
          );
        }
        result = await safeInsert(() => sql`
          INSERT INTO book_visit_log (user_email, book_id, chapter)
          VALUES (${user_email}, ${book_id}, ${chapter})
          RETURNING id, visited_at as created_at
        `);
        break;

      case 'devotional_access':
        if (!plan_id || day_number === undefined) {
          return NextResponse.json(
            { error: 'devotional_access requires: plan_id, day_number' },
            { status: 400 }
          );
        }
        result = await safeInsert(() => sql`
          INSERT INTO devotional_access_log (user_email, plan_id, day_number, action)
          VALUES (${user_email}, ${plan_id}, ${day_number}, 'view')
          RETURNING id, created_at
        `);
        break;

      case 'bookmark':
        // NEW — was missing, so every bookmark log returned 400.
        // verse_bookmarks is the same table GET already reads.
        if (!book_id || !chapter || verse_number === undefined) {
          return NextResponse.json(
            { error: 'bookmark requires: book_id, chapter, verse_number' },
            { status: 400 }
          );
        }
        result = await safeInsert(() => sql`
          INSERT INTO verse_bookmarks (user_email, book_id, chapter, verse_number)
          VALUES (${user_email}, ${book_id}, ${chapter}, ${verse_number})
          ON CONFLICT (user_email, book_id, chapter, verse_number) DO NOTHING
          RETURNING id, created_at
        `);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown activity_type: ${activity_type}` },
          { status: 400 }
        );
    }

    // Never 500 because a log table is missing — the reader / front page
    // must keep working even if logging is not set up yet.
    return NextResponse.json({
      success: true,
      logged: result.ok,
      message: result.ok
        ? `Activity logged: ${activity_type}`
        : `Activity not stored (log table missing) — request accepted: ${activity_type}`,
      activityId: result.row?.id ?? null,
      timestamp: result.row?.created_at ?? null
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
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }

    // Each query runs on its own — one missing table must not wipe out
    // the other five feeds.
    const [verseViews, prayerViews, prayerExpansions, bookVisits, bookmarks, devotionalAccess] = await Promise.all([
      safeSelect(() => sql`
        SELECT
          'verse_view' as activity_type,
          bb.name_english as book_name,
          bb.book_number,
          vvl.chapter,
          vvl.verse_number,
          vvl.created_at
        FROM verse_view_log vvl
        LEFT JOIN bible_books bb ON vvl.book_id = bb.book_number
        WHERE vvl.user_email = ${userEmail}
        ORDER BY vvl.created_at DESC
        LIMIT ${limit}
      `),
      safeSelect(() => sql`
        SELECT
          'prayer_view' as activity_type,
          bb.name_english as book_name,
          bb.book_number,
          pal.chapter,
          pal.verse_number,
          pal.created_at
        FROM prayer_activity_log pal
        LEFT JOIN bible_books bb ON pal.book_id = bb.book_number
        WHERE pal.user_email = ${userEmail} AND pal.action = 'view'
        ORDER BY pal.created_at DESC
        LIMIT ${limit}
      `),
      safeSelect(() => sql`
        SELECT
          'prayer_expanded' as activity_type,
          bb.name_english as book_name,
          bb.book_number,
          pal.chapter,
          pal.verse_number,
          pal.created_at
        FROM prayer_activity_log pal
        LEFT JOIN bible_books bb ON pal.book_id = bb.book_number
        WHERE pal.user_email = ${userEmail} AND pal.action = 'expand'
        ORDER BY pal.created_at DESC
        LIMIT ${limit}
      `),
      safeSelect(() => sql`
        SELECT
          'book_visit' as activity_type,
          bb.name_english as book_name,
          bb.book_number,
          bvl.chapter,
          NULL as verse_number,
          bvl.visited_at as created_at
        FROM book_visit_log bvl
        LEFT JOIN bible_books bb ON bvl.book_id = bb.book_number
        WHERE bvl.user_email = ${userEmail}
        ORDER BY bvl.visited_at DESC
        LIMIT ${limit}
      `),
      safeSelect(() => sql`
        SELECT
          'bookmark' as activity_type,
          bb.name_english as book_name,
          bb.book_number,
          vb.chapter,
          vb.verse_number,
          vb.created_at
        FROM verse_bookmarks vb
        LEFT JOIN bible_books bb ON vb.book_id = bb.book_number
        WHERE vb.user_email = ${userEmail}
        ORDER BY vb.created_at DESC
        LIMIT ${limit}
      `),
      safeSelect(() => sql`
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
      `),
    ]);

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
