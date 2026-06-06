import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
    }

    const [settings] = await sql`
      SELECT * FROM user_notification_settings WHERE user_email = ${userEmail}
    `;

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        books_notifications: true,
        commentaries_notifications: true,
        devotionals_notifications: true,
        prayers_notifications: true,
        qa_notifications: true,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json({ error: 'Failed to get notification settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      userEmail, 
      books_notifications, 
      commentaries_notifications, 
      devotionals_notifications, 
      prayers_notifications, 
      qa_notifications 
    } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
    }

    await sql`
      INSERT INTO user_notification_settings (
        user_email, 
        books_notifications, 
        commentaries_notifications, 
        devotionals_notifications, 
        prayers_notifications, 
        qa_notifications,
        updated_at
      )
      VALUES (
        ${userEmail}, 
        ${books_notifications ?? true}, 
        ${commentaries_notifications ?? true}, 
        ${devotionals_notifications ?? true}, 
        ${prayers_notifications ?? true}, 
        ${qa_notifications ?? true},
        NOW()
      )
      ON CONFLICT (user_email) 
      DO UPDATE SET 
        books_notifications = ${books_notifications ?? true},
        commentaries_notifications = ${commentaries_notifications ?? true},
        devotionals_notifications = ${devotionals_notifications ?? true},
        prayers_notifications = ${prayers_notifications ?? true},
        qa_notifications = ${qa_notifications ?? true},
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return NextResponse.json({ error: 'Failed to update notification settings' }, { status: 500 });
  }
}
