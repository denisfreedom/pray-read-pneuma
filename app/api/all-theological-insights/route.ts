import sql, { isDbConfigured } from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Theological insights "all" route — FIXED
// 1) Join used the wrong key: JOIN bb.id = vti.book_id, but every other
//    file treats book_id as bb.book_number. Now JOIN ON bb.book_number.
// 2) List returned bb.id as book_id, detail expected a book_number.
//    Now both use bb.book_number, so the ID from the list is exactly
//    the ID the detail query expects.
// 3) ?lang= was read but never used, so the English/Luganda toggle
//    did nothing. Now lang=luganda filters to rows with a Luganda
//    insight, lang=english (default) filters to rows with an English
//    insight. Any other lang value falls back to "either".
// 4) Missing table / missing DATABASE_URL -> [] instead of 500.

function isTableMissing(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return /relation .* does not exist|table .* does not exist|42P01/i.test(msg);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const lang = (searchParams.get('lang') || 'english').toLowerCase();

    if (!isDbConfigured()) return NextResponse.json([]);

    if (bookId) {
      const bookNum = parseInt(bookId, 10);
      if (!Number.isFinite(bookNum)) {
        return NextResponse.json({ error: 'Invalid bookId' }, { status: 400 });
      }
      // Fetch insights for a specific book grouped by chapter/verse
      let result;
      if (lang === 'luganda') {
        result = await sql`
          SELECT vti.*, bb.name_english as book_name, bb.book_number
          FROM verse_theological_insights vti
          JOIN bible_books bb ON bb.book_number = vti.book_id
          WHERE vti.book_id = ${bookNum}
            AND vti.luganda_insight IS NOT NULL AND vti.luganda_insight != ''
          ORDER BY vti.chapter ASC, vti.verse_number ASC
        `;
      } else if (lang === 'english') {
        result = await sql`
          SELECT vti.*, bb.name_english as book_name, bb.book_number
          FROM verse_theological_insights vti
          JOIN bible_books bb ON bb.book_number = vti.book_id
          WHERE vti.book_id = ${bookNum}
            AND vti.english_insight IS NOT NULL AND vti.english_insight != ''
          ORDER BY vti.chapter ASC, vti.verse_number ASC
        `;
      } else {
        result = await sql`
          SELECT vti.*, bb.name_english as book_name, bb.book_number
          FROM verse_theological_insights vti
          JOIN bible_books bb ON bb.book_number = vti.book_id
          WHERE vti.book_id = ${bookNum}
            AND (vti.english_insight IS NOT NULL AND vti.english_insight != ''
              OR vti.luganda_insight IS NOT NULL AND vti.luganda_insight != '')
          ORDER BY vti.chapter ASC, vti.verse_number ASC
        `;
      }
      return NextResponse.json(result);
    }

    // Fetch all books that have theological insights
    let result;
    if (lang === 'luganda') {
      result = await sql`
        SELECT
          bb.book_number as book_id,
          bb.name_english as book_name,
          bb.book_number,
          bb.testament,
          COUNT(vti.id) as insight_count
        FROM bible_books bb
        INNER JOIN verse_theological_insights vti ON vti.book_id = bb.book_number
        WHERE vti.luganda_insight IS NOT NULL AND vti.luganda_insight != ''
        GROUP BY bb.book_number, bb.name_english, bb.testament
        ORDER BY bb.book_number ASC
      `;
    } else if (lang === 'english') {
      result = await sql`
        SELECT
          bb.book_number as book_id,
          bb.name_english as book_name,
          bb.book_number,
          bb.testament,
          COUNT(vti.id) as insight_count
        FROM bible_books bb
        INNER JOIN verse_theological_insights vti ON vti.book_id = bb.book_number
        WHERE vti.english_insight IS NOT NULL AND vti.english_insight != ''
        GROUP BY bb.book_number, bb.name_english, bb.testament
        ORDER BY bb.book_number ASC
      `;
    } else {
      result = await sql`
        SELECT
          bb.book_number as book_id,
          bb.name_english as book_name,
          bb.book_number,
          bb.testament,
          COUNT(vti.id) as insight_count
        FROM bible_books bb
        INNER JOIN verse_theological_insights vti ON vti.book_id = bb.book_number
        WHERE (vti.english_insight IS NOT NULL AND vti.english_insight != ''
            OR vti.luganda_insight IS NOT NULL AND vti.luganda_insight != '')
        GROUP BY bb.book_number, bb.name_english, bb.testament
        ORDER BY bb.book_number ASC
      `;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching all theological insights:', error);
    // Table not created yet -> empty list, not 500.
    if (isTableMissing(error)) return NextResponse.json([]);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
