import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import webpush from 'web-push';

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@prayreadbible.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
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

    // Get today's verse
    const [verse] = await sql`
      SELECT v.*, b.name_english, b.name_luganda, b.book_number
      FROM bible_verses v
      JOIN bible_books b ON v.book_id = b.id
      WHERE v.id = (
        SELECT id FROM bible_verses 
        ORDER BY RANDOM() 
        LIMIT 1
      )
    `;

    if (!verse) {
      return NextResponse.json({ error: 'No verse found' }, { status: 404 });
    }

    // Send notification to all user's subscriptions
    const promises = subscriptions.map(async (sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const payload = JSON.stringify({
        title: 'Daily Verse - Pray Read Bible',
        body: `${verse.text_english.substring(0, 100)}... - ${verse.name_english} ${verse.chapter}:${verse.verse}`,
        url: `/bible-reader/${verse.book_number}/${verse.chapter}?verse=${verse.verse}`,
        bookNumber: verse.book_number,
        chapter: verse.chapter,
        verse: verse.verse
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        return { success: true };
      } catch (error: any) {
        console.error('Send notification error:', error);
        // If subscription is invalid, delete it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await sql`
            DELETE FROM push_subscriptions 
            WHERE endpoint = ${sub.endpoint}
          `;
        }
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;

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
