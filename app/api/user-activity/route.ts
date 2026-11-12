import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// /api/user-activity — FIXED
// Old bugs:
// 1) POST wrote ONLY to `user_reading_history`, GET read ONLY from `book_visit_log`
//    -> activity was recorded but stats always read 0.
// 2) Imported sql from '@/app/api/utils/sql' — if that file is missing / exports
//    differently, the whole route 500s with HTML. Now uses neon() directly,
//    same as the fixed signup/login/session routes.
// 3) Tables were never created -> first POST/GET 500s.
// 4) GET returned visitedBooks as a raw row array, not a count.
// 5) No email normalisation, parseInt(NaN) could crash the INSERT.
// Fixed: POST writes to BOTH tables, GET reads from BOTH, tables auto-created,
// always returns JSON { success, ... }, never HTML.
async function ensureTables(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS user_reading_history (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      book_id INTEGER,
      chapter INTEGER,
      reading_duration_seconds INTEGER DEFAULT 0,
      read_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS book_visit_log (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      book_id INTEGER,
      chapter INTEGER,
      visited_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS verse_bookmarks (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      book_id INTEGER,
      chapter INTEGER,
      verse INTEGER,
      verse_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  // Add columns if the tables already existed without them
  await sql`ALTER TABLE user_reading_history ADD COLUMN IF NOT EXISTS reading_duration_seconds INTEGER DEFAULT 0`;
  await sql`ALTER TABLE user_reading_history ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE book_visit_log ADD COLUMN IF NOT EXISTS visited_at TIMESTAMPTZ DEFAULT NOW()`;
}

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

// Record reading activity
export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    if (!sql) return NextResponse.json({ success: false, error: 'Database is not configured (DATABASE_URL missing).' }, { status: 500 });
    const text = await request.text();
    if (!text || !text.trim()) return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
    let data: any;
    try { data = JSON.parse(text); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON format' }, { status: 400 }); }

    const userEmail = String(data.userEmail || data.email || '').trim().toLowerCase();
    const bookId = parseInt(String(data.bookId ?? data.book_id ?? ''), 10);
    const chapter = parseInt(String(data.chapter ?? ''), 10);
    const durationSeconds = Math.max(0, parseInt(String(data.durationSeconds ?? data.reading_duration_seconds ?? 0), 10) || 0);
    if (!userEmail || Number.isNaN(bookId) || Number.isNaN(chapter)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    try { await ensureTables(sql); } catch (e: any) { return NextResponse.json({ success: false, error: 'Could not create activity tables: ' + (e.message || '') }, { status: 500 }); }

    // Write to BOTH tables — GET reads from both, so stats stay in sync
    await sql`
      INSERT INTO user_reading_history (user_email, book_id, chapter, reading_duration_seconds, read_at)
      VALUES (${userEmail}, ${bookId}, ${chapter}, ${durationSeconds}, NOW())`;
    await sql`
      INSERT INTO book_visit_log (user_email, book_id, chapter, visited_at)
      VALUES (${userEmail}, ${bookId}, ${chapter}, NOW())`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error recording reading activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to record activity: ' + (error.message || 'server error') }, { status: 500 });
  }
}

// Get user activity stats
export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    if (!sql) return NextResponse.json({ success: false, error: 'Database is not configured (DATABASE_URL missing).' }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const userEmail = String(searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();
    if (!userEmail) return NextResponse.json({ success: false, error: 'Missing userEmail parameter' }, { status: 400 });
    try { await ensureTables(sql); } catch (e: any) { return NextResponse.json({ success: false, error: 'Could not create activity tables: ' + (e.message || '') }, { status: 500 }); }

    // Unique books from BOTH tables (a user may have rows in only one, from the old code)
    const visitedBooksRows: any[] = await sql`
      SELECT DISTINCT book_id FROM (
        SELECT book_id FROM book_visit_log WHERE LOWER(TRIM(user_email)) = ${userEmail} AND book_id IS NOT NULL
        UNION
        SELECT book_id FROM user_reading_history WHERE LOWER(TRIM(user_email)) = ${userEmail} AND book_id IS NOT NULL
      ) AS combined`;
    const visitedBooks = visitedBooksRows.length;
    const bookmarkRows: any[] = await sql`SELECT COUNT(*) as count FROM verse_bookmarks WHERE LOWER(TRIM(user_email)) = ${userEmail}`;
    const bookmarkCount = Number(bookmarkRows[0]?.count || 0);
    // Days active from BOTH tables
    const daysRows: any[] = await sql`
      SELECT COUNT(DISTINCT d) as days_count FROM (
        SELECT DATE(visited_at) AS d FROM book_visit_log WHERE LOWER(TRIM(user_email)) = ${userEmail}
        UNION
        SELECT DATE(read_at) AS d FROM user_reading_history WHERE LOWER(TRIM(user_email)) = ${userEmail}
      ) AS combined`;
    const daysActive = Number(daysRows[0]?.days_count || 0);
    // Extra stats the dashboard can use (safe if columns exist — they do after ensureTables)
    const readingRows: any[] = await sql`SELECT COALESCE(SUM(reading_duration_seconds), 0) as total_seconds, COUNT(*) as sessions FROM user_reading_history WHERE LOWER(TRIM(user_email)) = ${userEmail}`;
    const totalReadingSeconds = Number(readingRows[0]?.total_seconds || 0);
    const totalSessions = Number(readingRows[0]?.sessions || 0);

    return NextResponse.json({
      success: true,
      visitedBooks, // NUMBER now (old code returned a raw row array)
      visitedBooksList: visitedBooksRows.map((r: any) => r.book_id),
      bookmarkCount,
      days_active: daysActive,
      totalReadingSeconds,
      totalSessions,
    });
  } catch (error: any) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity: ' + (error.message || 'server error') }, { status: 500 });
  }
}
