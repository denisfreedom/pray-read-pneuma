import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const lang = searchParams.get('lang') || 'english';

    if (bookId) {
      // Fetch insights for a specific book grouped by chapter/verse
      const result = await sql`
        SELECT vti.*, bb.name_english as book_name, bb.book_number
        FROM verse_theological_insights vti
        JOIN bible_books bb ON bb.id = vti.book_id
        WHERE vti.book_id = ${parseInt(bookId)}
          AND (vti.english_insight IS NOT NULL AND vti.english_insight != ''
            OR vti.luganda_insight IS NOT NULL AND vti.luganda_insight != '')
        ORDER BY vti.chapter ASC, vti.verse_number ASC
      `;
      return NextResponse.json(result);
    }

    // Fetch all books that have theological insights
    const result = await sql`
      SELECT 
        bb.id as book_id,
        bb.name_english as book_name,
        bb.book_number,
        bb.testament,
        COUNT(vti.id) as insight_count
      FROM bible_books bb
      INNER JOIN verse_theological_insights vti ON vti.book_id = bb.id
      WHERE (vti.english_insight IS NOT NULL AND vti.english_insight != ''
          OR vti.luganda_insight IS NOT NULL AND vti.luganda_insight != '')
      GROUP BY bb.id, bb.name_english, bb.book_number, bb.testament
      ORDER BY bb.book_number ASC
    `;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching all theological insights:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
