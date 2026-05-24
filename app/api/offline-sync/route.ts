import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    switch (type) {
      case 'sync-bookmarks': {
        const { bookmarks, userEmail } = data;
        
        // Save bookmarks to database
        for (const bookmark of bookmarks) {
          await sql`
            INSERT INTO verse_bookmarks (
              user_email, book_id, chapter, verse_number, created_at
            ) VALUES (
              ${userEmail}, ${bookmark.book_id}, ${bookmark.chapter}, 
              ${bookmark.verse_number}, ${bookmark.created_at}
            )
            ON CONFLICT (user_email, book_id, chapter, verse_number) 
            DO UPDATE SET created_at = ${bookmark.created_at}
          `;
        }

        return NextResponse.json({ success: true, synced: bookmarks.length });
      }

      case 'sync-notes': {
        const { notes, userEmail } = data;
        
        // Save notes to database
        for (const note of notes) {
          await sql`
            INSERT INTO notes (
              user_email, book_id, chapter, verse_number, note_text, created_at, updated_at
            ) VALUES (
              ${userEmail}, ${note.book_id}, ${note.chapter}, 
              ${note.verse_number}, ${note.note_text}, ${note.created_at}, ${note.updated_at}
            )
            ON CONFLICT (user_email, book_id, chapter, verse_number) 
            DO UPDATE SET 
              note_text = ${note.note_text},
              updated_at = ${note.updated_at}
          `;
        }

        return NextResponse.json({ success: true, synced: notes.length });
      }

      case 'sync-highlights': {
        const { highlights, userEmail } = data;
        
        // Save highlights to database
        for (const highlight of highlights) {
          await sql`
            INSERT INTO highlights (
              user_email, book_id, chapter, verse_number, 
              start_offset, end_offset, highlight_color, 
              text_content, is_underline, section_type, created_at
            ) VALUES (
              ${userEmail}, ${highlight.book_id}, ${highlight.chapter}, 
              ${highlight.verse_number}, ${highlight.start_offset}, 
              ${highlight.end_offset}, ${highlight.highlight_color}, 
              ${highlight.text_content}, ${highlight.is_underline || false}, 
              ${highlight.section_type || 'verse'}, ${highlight.created_at}
            )
            ON CONFLICT DO NOTHING
          `;
        }

        return NextResponse.json({ success: true, synced: highlights.length });
      }

      case 'sync-reading-progress': {
        const { progress, userEmail } = data;
        
        // Save reading progress
        for (const item of progress) {
          await sql`
            INSERT INTO reading_progress (
              user_email, plan_id, day_number, completed, completed_at
            ) VALUES (
              ${userEmail}, ${item.plan_id}, ${item.day_number}, 
              ${item.completed}, ${item.completed_at}
            )
            ON CONFLICT (user_email, plan_id, day_number) 
            DO UPDATE SET 
              completed = ${item.completed},
              completed_at = ${item.completed_at}
          `;
        }

        return NextResponse.json({ success: true, synced: progress.length });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown sync type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userEmail = searchParams.get('userEmail');
    const type = searchParams.get('type');

    if (!userEmail) {
      return NextResponse.json({ success: false, error: 'User email required' }, { status: 400 });
    }

    switch (type) {
      case 'bookmarks': {
        const bookmarks = await sql`
          SELECT * FROM verse_bookmarks 
          WHERE user_email = ${userEmail} 
          ORDER BY created_at DESC
        `;
        return NextResponse.json({ success: true, data: bookmarks });
      }

      case 'notes': {
        const notes = await sql`
          SELECT * FROM notes 
          WHERE user_email = ${userEmail} 
          ORDER BY updated_at DESC
        `;
        return NextResponse.json({ success: true, data: notes });
      }

      case 'highlights': {
        const highlights = await sql`
          SELECT * FROM highlights 
          WHERE user_email = ${userEmail} 
          ORDER BY created_at DESC
        `;
        return NextResponse.json({ success: true, data: highlights });
      }

      case 'reading-progress': {
        const progress = await sql`
          SELECT * FROM reading_progress 
          WHERE user_email = ${userEmail}
        `;
        return NextResponse.json({ success: true, data: progress });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Fetch failed' 
    }, { status: 500 });
  }
}
