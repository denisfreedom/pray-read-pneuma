import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// Get user progress for a specific plan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const planId = searchParams.get('planId');

    if (!userEmail || !planId) {
      return NextResponse.json(
        { error: 'Missing email or planId' },
        { status: 400 }
      );
    }

    const progress = await sql`
      SELECT * FROM user_reading_progress 
      WHERE user_email = ${userEmail} AND plan_id = ${parseInt(planId)}
      ORDER BY day_number ASC
    `;

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading progress' },
      { status: 500 }
    );
  }
}

// Mark a day as complete
export async function POST(request: NextRequest) {
  try {
    const { userEmail, planId, dayNumber, completed } = await request.json();

    if (!userEmail || !planId || dayNumber === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (completed) {
      await sql`
        INSERT INTO user_reading_progress (user_email, plan_id, day_number, completed, completed_at)
        VALUES (${userEmail}, ${planId}, ${dayNumber}, true, NOW())
        ON CONFLICT (user_email, plan_id, day_number) 
        DO UPDATE SET completed = true, completed_at = NOW()
      `;
    } else {
      await sql`
        INSERT INTO user_reading_progress (user_email, plan_id, day_number, completed)
        VALUES (${userEmail}, ${planId}, ${dayNumber}, false)
        ON CONFLICT (user_email, plan_id, day_number) 
        DO UPDATE SET completed = false, completed_at = NULL
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating reading progress:', error);
    return NextResponse.json(
      { error: 'Failed to update reading progress' },
      { status: 500 }
    );
  }
}
