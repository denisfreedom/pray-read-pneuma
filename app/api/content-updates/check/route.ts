import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
    }

    // Get user's last download dates
    const downloads = await sql`
      SELECT content_type, last_downloaded_at 
      FROM user_content_downloads 
      WHERE user_email = ${userEmail}
    `;

    const downloadMap = new Map(
      downloads.map(d => [d.content_type, d.last_downloaded_at])
    );

    // Get user's notification settings
    const [settings] = await sql`
      SELECT * FROM user_notification_settings WHERE user_email = ${userEmail}
    `;

    const defaultSettings = {
      books_notifications: true,
      commentaries_notifications: true,
      devotionals_notifications: true,
      prayers_notifications: true,
      qa_notifications: true,
    };

    const userSettings = settings || defaultSettings;

    // Check for new content in each section
    const updates = [];

    // Books
    if (userSettings.books_notifications) {
      const lastDownload = downloadMap.get('books');
      const countQuery = lastDownload
        ? await sql`SELECT COUNT(*) as count FROM bible_books WHERE created_at > ${lastDownload}`
        : await sql`SELECT COUNT(*) as count FROM bible_books`;
      
      if (parseInt(countQuery[0].count) > 0) {
        updates.push({
          contentType: 'books',
          count: parseInt(countQuery[0].count),
          message: lastDownload 
            ? `${countQuery[0].count} new book${parseInt(countQuery[0].count) > 1 ? 's' : ''} available`
            : `${countQuery[0].count} book${parseInt(countQuery[0].count) > 1 ? 's' : ''} available for download`,
        });
      }
    }

    // Commentaries
    if (userSettings.commentaries_notifications) {
      const lastDownload = downloadMap.get('commentaries');
      const countQuery = lastDownload
        ? await sql`SELECT COUNT(*) as count FROM verse_commentaries WHERE created_at > ${lastDownload}`
        : await sql`SELECT COUNT(*) as count FROM verse_commentaries`;
      
      if (parseInt(countQuery[0].count) > 0) {
        updates.push({
          contentType: 'commentaries',
          count: parseInt(countQuery[0].count),
          message: lastDownload 
            ? `${countQuery[0].count} new commentar${parseInt(countQuery[0].count) > 1 ? 'ies' : 'y'} available`
            : `${countQuery[0].count} commentar${parseInt(countQuery[0].count) > 1 ? 'ies' : 'y'} available for download`,
        });
      }
    }

    // Devotionals
    if (userSettings.devotionals_notifications) {
      const lastDownload = downloadMap.get('devotionals');
      const countQuery = lastDownload
        ? await sql`SELECT COUNT(*) as count FROM devotional_entries WHERE is_published = true AND created_at > ${lastDownload}`
        : await sql`SELECT COUNT(*) as count FROM devotional_entries WHERE is_published = true`;
      
      if (parseInt(countQuery[0].count) > 0) {
        updates.push({
          contentType: 'devotionals',
          count: parseInt(countQuery[0].count),
          message: lastDownload 
            ? `${countQuery[0].count} new devotional${parseInt(countQuery[0].count) > 1 ? 's' : ''} available`
            : `${countQuery[0].count} devotional${parseInt(countQuery[0].count) > 1 ? 's' : ''} available for download`,
        });
      }
    }

    // Verse Prayers
    if (userSettings.prayers_notifications) {
      const lastDownload = downloadMap.get('prayers');
      const countQuery = lastDownload
        ? await sql`SELECT COUNT(*) as count FROM verse_prayers WHERE created_at > ${lastDownload}`
        : await sql`SELECT COUNT(*) as count FROM verse_prayers`;
      
      if (parseInt(countQuery[0].count) > 0) {
        updates.push({
          contentType: 'prayers',
          count: parseInt(countQuery[0].count),
          message: lastDownload 
            ? `${countQuery[0].count} new prayer${parseInt(countQuery[0].count) > 1 ? 's' : ''} available`
            : `${countQuery[0].count} prayer${parseInt(countQuery[0].count) > 1 ? 's' : ''} available for download`,
        });
      }
    }

    // Q&A
    if (userSettings.qa_notifications) {
      const lastDownload = downloadMap.get('qa');
      const countQuery = lastDownload
        ? await sql`SELECT COUNT(*) as count FROM bible_qa WHERE is_published = true AND created_at > ${lastDownload}`
        : await sql`SELECT COUNT(*) as count FROM bible_qa WHERE is_published = true`;
      
      if (parseInt(countQuery[0].count) > 0) {
        updates.push({
          contentType: 'qa',
          count: parseInt(countQuery[0].count),
          message: lastDownload 
            ? `${countQuery[0].count} new Q&A${parseInt(countQuery[0].count) > 1 ? 's' : ''} available`
            : `${countQuery[0].count} Q&A${parseInt(countQuery[0].count) > 1 ? 's' : ''} available for download`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      updates,
      totalUpdates: updates.reduce((sum, u) => sum + u.count, 0),
    });
  } catch (error) {
    console.error('Check content updates error:', error);
    return NextResponse.json({ error: 'Failed to check content updates' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userEmail = searchParams.get('userEmail');

  if (!userEmail) {
    return NextResponse.json({ error: 'Missing userEmail' }, { status: 400 });
  }

  return POST(request);
}
