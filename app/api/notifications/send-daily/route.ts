import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import webpush from 'web-push';

// Configure web-push with VAPID keys
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
    // Verify this is an internal cron job request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get verse of the day
    const [verseOfDay] = await sql`
      SELECT bv.*, bb.name_english as book_name
      FROM bible_verses bv
      JOIN bible_books bb ON bv.book_id = bb.id
      ORDER BY RANDOM()
      LIMIT 1
    `;

    if (!verseOfDay) {
      return NextResponse.json({ error: 'No verse found' }, { status: 404 });
    }

    // Get all active subscriptions with enabled preferences
    const subscriptions = await sql`
      SELECT ps.*, np.notification_time, np.timezone
      FROM push_subscriptions ps
      JOIN notification_preferences np ON ps.user_email = np.user_email
      WHERE np.daily_verse_enabled = true
    `;

    const notificationPayload = {
      title: '📖 Daily Verse',
      body: `${verseOfDay.book_name} ${verseOfDay.chapter}:${verseOfDay.verse} - ${verseOfDay.text_english.substring(0, 100)}...`,
      url: `/bible-reader/${verseOfDay.book_name.toLowerCase().replace(/\s+/g, '-')}/${verseOfDay.chapter}`
    };

    let successCount = 0;
    let failureCount = 0;

    // Send notifications to all subscribers
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

        // Log successful notification
        await sql`
          INSERT INTO notification_history (user_email, notification_type, title, body, status)
          VALUES (${sub.user_email}, 'daily_verse', ${notificationPayload.title}, ${notificationPayload.body}, 'sent')
        `;

        successCount++;
      } catch (error: any) {
        console.error(`Failed to send to ${sub.user_email}:`, error);
        
        // If subscription is expired or invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await sql`
            DELETE FROM push_subscriptions WHERE id = ${sub.id}
          `;
        }

        // Log failed notification
        await sql`
          INSERT INTO notification_history (user_email, notification_type, title, body, status)
          VALUES (${sub.user_email}, 'daily_verse', ${notificationPayload.title}, ${notificationPayload.body}, 'failed')
        `;

        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      verse: `${verseOfDay.book_name} ${verseOfDay.chapter}:${verseOfDay.verse}`,
      sent: successCount,
      failed: failureCount,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Send daily notifications error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}

// Also allow GET for testing
export async function GET(request: NextRequest) {
  return POST(request);
}
