import sql, { isDbConfigured } from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// app/api/historical-insights/all/route.ts (or wherever this GET lives) — FIXED
// Was: JOIN bible_books bb ON bb.id = hc.book_id.
// Every other file treats book_id as bb.book_number (activity-log,
// dashboard-stats, admin/users). If bible_books keys on book_number,
// the old join returned empty even when historical_content had rows.
// Now: JOIN ON bb.book_number = hc.book_id, like the rest of the app.
// Also: missing table / missing DATABASE_URL -> [] instead of 500,
// so the Historical Context page shows empty, not a crash.
// Response shape unchanged: array of rows (same columns as before).

function isTableMissing(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return /relation .* does not exist|table .* does not exist|42P01/i.test(msg);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');

    if (!isDbConfigured()) return NextResponse.json([]);

    if (bookId) {
      const bookNum = parseInt(bookId, 10);
      if (!Number.isFinite(bookNum)) {
        return NextResponse.json({ error: 'Invalid bookId' }, { status: 400 });
      }
      // Fetch all historical content for a specific book (book-level + all chapters)
      const result = await sql`
        SELECT hc.*, bb.name_english as book_name, bb.book_number
        FROM historical_content hc
        JOIN bible_books bb ON bb.book_number = hc.book_id
        WHERE hc.book_id = ${bookNum}
        ORDER BY hc.chapter ASC NULLS FIRST
      `;
      return NextResponse.json(result);
    }

    // Fetch all books that have historical content
    const result = await sql`
      SELECT
        bb.book_number as book_id,
        bb.name_english as book_name,
        bb.book_number,
        bb.testament,
        COUNT(hc.id) as content_count
      FROM bible_books bb
      INNER JOIN historical_content hc ON hc.book_id = bb.book_number
      WHERE (hc.historical_background IS NOT NULL AND hc.historical_background != ''
          OR hc.cultural_context IS NOT NULL AND hc.cultural_context != '')
      GROUP BY bb.book_number, bb.name_english, bb.testament
      ORDER BY bb.book_number ASC
    `;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching all historical context:', error);
    // Table not created yet -> empty list, not 500.
    if (isTableMissing(error)) return NextResponse.json([]);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
