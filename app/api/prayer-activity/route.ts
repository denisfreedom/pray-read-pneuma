import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/prayer-activity
 * Log when a user views or interacts with a prayer
 * Creates activity record linked to the prayer and verse
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_email,
      book_id,
      chapter,
      verse_number,
      action = 'view' // 'view', 'save', 'share'
    } = body;

    if (!user_email || !book_id || !chapter || !verse_number) {
      return NextResponse.json(
        { error: 'Missing required fields: user_email, book_id, chapter, verse_number' },
        { status: 400 }
      );
    }

    // Log the prayer activity
    const result = await sql`
      INSERT INTO prayer_activity_log (user_email, book_id, chapter, verse_number, action, created_at)
      VALUES (${user_email}, ${book_id}, ${chapter}, ${verse_number}, ${action}, NOW())
      RETURNING id, created_at
    `;

    return NextResponse.json({
      success: true,
      message: `Prayer ${action} logged successfully`,
      activityId: result[0]?.id
    });
  } catch (error) {
    console.error('Error logging prayer activity:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to log prayer activity';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
