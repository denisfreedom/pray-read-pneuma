import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// Record reading activity
export async function POST(request: NextRequest) {
  try {
    // Check if request body exists
    const text = await request.text();
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    const { userEmail, bookId, chapter, durationSeconds } = data;

    if (!userEmail || !bookId || !chapter) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO user_reading_history (user_email, book_id, chapter, reading_duration_seconds, read_at)
      VALUES (${userEmail}, ${parseInt(bookId)}, ${parseInt(chapter)}, ${durationSeconds || 0}, NOW())
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording reading activity:', error);
    return NextResponse.json(
      { error: 'Failed to record activity' },
      { status: 500 }
    );
  }
}

// Get user activity stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing userEmail parameter' },
        { status: 400 }
      );
    }

    // Get unique books visited
    const visitedBooksResult = await sql`
      SELECT DISTINCT book_id
      FROM book_visit_log
      WHERE user_email = ${userEmail}
      AND book_id IS NOT NULL
    `;

    // Get bookmark count
    const bookmarkResult = await sql`
      SELECT COUNT(*) as count
      FROM verse_bookmarks
      WHERE user_email = ${userEmail}
    `;

    // Calculate days active (unique calendar dates with any activity)
    const daysActiveResult = await sql`
      SELECT COUNT(DISTINCT DATE(visited_at)) as days_count
      FROM book_visit_log
      WHERE user_email = ${userEmail}
    `;

    const stats = {
      visitedBooks: visitedBooksResult,
      bookmarkCount: bookmarkResult[0]?.count || 0,
      days_active: daysActiveResult[0]?.days_count || 0
    };

    return NextResponse.json({ 
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
