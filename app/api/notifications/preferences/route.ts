import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
    }

    const [prefs] = await sql`
      SELECT * FROM notification_preferences WHERE user_email = ${userEmail}
    `;

    if (!prefs) {
      return NextResponse.json({
        daily_verse_enabled: true,
        notification_time: '08:00:00',
        timezone: 'UTC'
      });
    }

    return NextResponse.json(prefs);
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userEmail, daily_verse_enabled, notification_time, timezone } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
    }

    await sql`
      INSERT INTO notification_preferences (user_email, daily_verse_enabled, notification_time, timezone, updated_at)
      VALUES (${userEmail}, ${daily_verse_enabled}, ${notification_time || '08:00:00'}, ${timezone || 'UTC'}, NOW())
      ON CONFLICT (user_email) 
      DO UPDATE SET 
        daily_verse_enabled = ${daily_verse_enabled},
        notification_time = ${notification_time || '08:00:00'},
        timezone = ${timezone || 'UTC'},
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
