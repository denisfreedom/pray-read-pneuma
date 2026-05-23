import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@bibleapp.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
    }

    // Get user's subscriptions
    const subscriptions = await sql`
      SELECT * FROM push_subscriptions WHERE user_email = ${userEmail}
    `;

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'No subscriptions found' }, { status: 404 });
    }

    const notificationPayload = {
      title: '🔔 Test Notification',
      body: 'This is a test notification from your Bible app!',
      url: '/'
    };

    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify(notificationPayload)
        );
        successCount++;
      } catch (error) {
        console.error('Test notification error:', error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent: successCount,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 });
  }
}
