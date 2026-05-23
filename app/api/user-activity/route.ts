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

// Get user's reading history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing email parameter' },
        { status: 400 }
      );
    }

    const history = await sql`
      SELECT 
        h.book_id,
        h.chapter,
        h.read_at,
        h.reading_duration_seconds,
        b.name_english as book_name,
        b.book_number
      FROM user_reading_history h
      LEFT JOIN bible_books b ON h.book_id = b.id
      WHERE h.user_email = ${userEmail}
      ORDER BY h.read_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching reading history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
