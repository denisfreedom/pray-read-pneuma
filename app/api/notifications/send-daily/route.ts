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
    // Verify this is a cron job or authenticated request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get verse of the day
    const [verseOfDay] = await sql`
      SELECT * FROM verse_of_the_day 
      WHERE date = CURRENT_DATE
      ORDER BY date DESC 
      LIMIT 1
    `;

    let verse;
    if (verseOfDay) {
      // Get the verse details
      [verse] = await sql`
        SELECT v.*, b.name_english, b.name_luganda, b.book_number
        FROM bible_verses v
        JOIN bible_books b ON v.book_id = b.id
        WHERE v.id = ${verseOfDay.verse_id}
      `;
    } else {
      // Fallback to random verse if no verse of the day set
      [verse] = await sql`
        SELECT v.*, b.name_english, b.name_luganda, b.book_number
        FROM bible_verses v
        JOIN bible_books b ON v.book_id = b.id
        ORDER BY RANDOM() 
        LIMIT 1
      `;
    }

    if (!verse) {
      return NextResponse.json({ error: 'No verse found' }, { status: 404 });
    }

    // Get all active subscriptions with enabled daily verse notifications
    const subscriptions = await sql`
      SELECT ps.*, np.notification_time, np.timezone
      FROM push_subscriptions ps
      JOIN notification_preferences np ON ps.user_email = np.user_email
      WHERE np.daily_verse_enabled = true
    `;

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active subscriptions',
        sent: 0 
      });
    }

    // Send notification to all subscriptions
    const promises = subscriptions.map(async (sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const payload = JSON.stringify({
        title: '🙏 Daily Verse - Pray Read Bible',
        body: `${verse.text_english.substring(0, 120)}... - ${verse.name_english} ${verse.chapter}:${verse.verse}`,
        url: `/bible-reader/${verse.book_number}/${verse.chapter}?verse=${verse.verse}`,
        bookNumber: verse.book_number,
        chapter: verse.chapter,
        verse: verse.verse,
        icon: '/icon-192.png'
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        return { success: true, userEmail: sub.user_email };
      } catch (error: any) {
        console.error(`Send notification error for ${sub.user_email}:`, error);
        // If subscription is invalid (expired or unsubscribed), delete it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await sql`
            DELETE FROM push_subscriptions 
            WHERE endpoint = ${sub.endpoint}
          `;
        }
        return { success: false, userEmail: sub.user_email, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({ 
      success: true,
      verse: {
        reference: `${verse.name_english} ${verse.chapter}:${verse.verse}`,
        text: verse.text_english.substring(0, 100)
      },
      sent: successCount,
      total: subscriptions.length,
      failed: subscriptions.length - successCount
    });
  } catch (error) {
    console.error('Send daily notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send daily notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support GET for manual trigger during testing
export async function GET(request: NextRequest) {
  return POST(request);
}
