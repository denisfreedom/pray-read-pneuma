import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const entryId = searchParams.get('entryId');
    const getStats = searchParams.get('stats') === 'true';

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    if (getStats) {
      // Get comprehensive devotional statistics
      const stats = await sql`
        SELECT 
          COUNT(*) as total_completed,
          COUNT(DISTINCT DATE(completed_at)) as unique_days,
          MAX(completed_at) as last_completed,
          MIN(completed_at) as first_completed
        FROM user_devotional_progress
        WHERE user_email = ${userEmail} AND completed = true
      `;

      // Get current streak
      const streakQuery = await sql`
        WITH daily_completions AS (
          SELECT DISTINCT DATE(completed_at) as completion_date
          FROM user_devotional_progress
          WHERE user_email = ${userEmail} 
            AND completed = true
            AND completed_at IS NOT NULL
          ORDER BY completion_date DESC
        ),
        date_series AS (
          SELECT 
            completion_date,
            completion_date - LAG(completion_date, 1) OVER (ORDER BY completion_date DESC) as date_diff
          FROM daily_completions
        )
        SELECT COUNT(*) + 1 as current_streak
        FROM date_series
        WHERE date_diff = -1 OR date_diff IS NULL
        LIMIT 1
      `;

      const currentStreak = streakQuery[0]?.current_streak || 0;

      // Get recent activity (last 7 days)
      const recentActivity = await sql`
        SELECT 
          udp.completed_at,
          de.title,
          de.scripture_book,
          de.scripture_chapter,
          de.scripture_verse
        FROM user_devotional_progress udp
        JOIN devotional_entries de ON udp.entry_id = de.id
        WHERE udp.user_email = ${userEmail} 
          AND udp.completed = true
          AND udp.completed_at >= NOW() - INTERVAL '7 days'
        ORDER BY udp.completed_at DESC
        LIMIT 10
      `;

      return NextResponse.json({
        success: true,
        stats: stats[0],
        currentStreak,
        recentActivity
      });
    }

    if (entryId) {
      // Get progress for specific entry
      const progress = await sql`
        SELECT * FROM user_devotional_progress
        WHERE user_email = ${userEmail} AND entry_id = ${entryId}
      `;
      return NextResponse.json(progress[0] || { completed: false });
    }

    // Get all progress for user
    const progress = await sql`
      SELECT udp.*, de.title, de.scheduled_date
      FROM user_devotional_progress udp
      JOIN devotional_entries de ON udp.entry_id = de.id
      WHERE udp.user_email = ${userEmail}
      ORDER BY de.scheduled_date DESC
    `;

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching devotional progress:', error);
    return NextResponse.json({ error: 'Failed to fetch devotional progress' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userEmail, entryId, scheduledDate, completed } = body;

    if (!userEmail || !entryId) {
      return NextResponse.json({ error: 'User email and entry ID are required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO user_devotional_progress (
        user_email,
        entry_id,
        scheduled_date,
        completed,
        completed_at,
        created_at
      ) VALUES (
        ${userEmail},
        ${entryId},
        ${scheduledDate},
        ${completed},
        ${completed ? 'NOW()' : null},
        NOW()
      )
      ON CONFLICT (user_email, entry_id)
      DO UPDATE SET
        completed = ${completed},
        completed_at = ${completed ? 'NOW()' : null}
      RETURNING *
    `;

    return NextResponse.json({ success: true, progress: result[0] });
  } catch (error) {
    console.error('Error updating devotional progress:', error);
    return NextResponse.json({ error: 'Failed to update devotional progress' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const entryId = searchParams.get('entryId');

    if (!userEmail || !entryId) {
      return NextResponse.json({ error: 'User email and entry ID are required' }, { status: 400 });
    }

    await sql`
      DELETE FROM user_devotional_progress
      WHERE user_email = ${userEmail} AND entry_id = ${entryId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devotional progress:', error);
    return NextResponse.json({ error: 'Failed to delete devotional progress' }, { status: 500 });
  }
}
