// API route to support offline syncing and data pre-caching
import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// GET: Fetch essential data for offline caching (books list)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'books') {
      // Fetch all Bible books for offline use
      const books = await sql`
        SELECT 
          id, 
          book_number, 
          name_english, 
          name_luganda, 
          abbreviation_english, 
          abbreviation_luganda,
          testament, 
          total_chapters 
        FROM bible_books 
        ORDER BY book_number ASC
      `;

      return NextResponse.json({ success: true, books });
    }

    if (type === 'chapter') {
      const bookId = parseInt(searchParams.get('bookId') || '0');
      const chapter = parseInt(searchParams.get('chapter') || '0');

      if (!bookId || !chapter) {
        return NextResponse.json({ error: 'Missing bookId or chapter' }, { status: 400 });
      }

      // Fetch complete chapter data for offline use
      const [verses, prayers, commentaries, intro] = await Promise.all([
        sql`SELECT * FROM bible_verses WHERE book_id = ${bookId} AND chapter = ${chapter} ORDER BY verse_number ASC`,
        sql`SELECT * FROM verse_prayers WHERE book_id = ${bookId} AND chapter = ${chapter}`,
        sql`SELECT * FROM verse_commentaries WHERE book_id = ${bookId} AND chapter = ${chapter}`,
        sql`SELECT * FROM chapter_introductions WHERE book_id = ${bookId} AND chapter = ${chapter}`,
      ]);

      return NextResponse.json({
        success: true,
        data: {
          verses,
          prayers,
          commentaries,
          introduction: intro[0] || null,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Offline sync error:', error);
    return NextResponse.json({ error: 'Failed to fetch data for offline sync' }, { status: 500 });
  }
}

// POST: Accept sync data from client (e.g., user highlights, notes made offline)
export async function POST(request: Request) {
  try {
    const { type, data } = await request.json();

    if (type === 'highlights') {
      // Sync highlights made offline
      const highlights = Array.isArray(data) ? data : [data];
      
      for (const highlight of highlights) {
        // Insert or update highlight
        await sql`
          INSERT INTO user_highlights (
            book_id, chapter, verse_number, start_offset, end_offset,
            highlight_color, text_content, user_email, is_underline, section_type
          ) VALUES (
            ${highlight.book_id}, ${highlight.chapter}, ${highlight.verse_number},
            ${highlight.start_offset}, ${highlight.end_offset}, ${highlight.highlight_color},
            ${highlight.text_content}, ${highlight.user_email || null}, ${highlight.is_underline || false},
            ${highlight.section_type || 'verse'}
          )
          ON CONFLICT (book_id, chapter, verse_number, start_offset, user_email) 
          DO UPDATE SET
            end_offset = EXCLUDED.end_offset,
            highlight_color = EXCLUDED.highlight_color,
            text_content = EXCLUDED.text_content,
            is_underline = EXCLUDED.is_underline,
            updated_at = NOW()
        `;
      }

      return NextResponse.json({ success: true, synced: highlights.length });
    }

    if (type === 'reading_activity') {
      // Sync reading activity tracked offline
      const activities = Array.isArray(data) ? data : [data];

      for (const activity of activities) {
        await sql`
          INSERT INTO user_activity (
            user_email, book_id, chapter, duration_seconds, activity_date
          ) VALUES (
            ${activity.user_email}, ${activity.book_id}, ${activity.chapter},
            ${activity.duration_seconds}, ${activity.activity_date || 'NOW()'}
          )
        `;
      }

      return NextResponse.json({ success: true, synced: activities.length });
    }

    return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
  } catch (error) {
    console.error('Offline sync POST error:', error);
    return NextResponse.json({ error: 'Failed to sync offline data' }, { status: 500 });
  }
}
