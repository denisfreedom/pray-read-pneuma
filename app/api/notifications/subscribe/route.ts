import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function POST(request: NextRequest) {
  try {
    const { subscription, userEmail } = await request.json();

    if (!subscription || !userEmail) {
      return NextResponse.json({ error: 'Missing subscription or userEmail' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Upsert subscription
    await sql`
      INSERT INTO push_subscriptions (user_email, endpoint, p256dh, auth, updated_at)
      VALUES (${userEmail}, ${endpoint}, ${p256dh}, ${auth}, NOW())
      ON CONFLICT (user_email, endpoint) 
      DO UPDATE SET p256dh = ${p256dh}, auth = ${auth}, updated_at = NOW()
    `;

    // Create default notification preferences if they don't exist
    await sql`
      INSERT INTO notification_preferences (user_email, daily_verse_enabled, notification_time)
      VALUES (${userEmail}, true, '08:00:00')
      ON CONFLICT (user_email) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint, userEmail } = await request.json();

    if (!endpoint || !userEmail) {
      return NextResponse.json({ error: 'Missing endpoint or userEmail' }, { status: 400 });
    }

    await sql`
      DELETE FROM push_subscriptions 
      WHERE user_email = ${userEmail} AND endpoint = ${endpoint}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
