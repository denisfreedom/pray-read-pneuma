import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');

    if (bookId) {
      // Fetch all historical content for a specific book (book-level + all chapters)
      const result = await sql`
        SELECT hc.*, bb.name_english as book_name, bb.book_number
        FROM historical_content hc
        JOIN bible_books bb ON bb.id = hc.book_id
        WHERE hc.book_id = ${parseInt(bookId)}
        ORDER BY hc.chapter ASC NULLS FIRST
      `;
      return NextResponse.json(result);
    }

    // Fetch all books that have historical content
    const result = await sql`
      SELECT 
        bb.id as book_id,
        bb.name_english as book_name,
        bb.book_number,
        bb.testament,
        COUNT(hc.id) as content_count
      FROM bible_books bb
      INNER JOIN historical_content hc ON hc.book_id = bb.id
      WHERE (hc.historical_background IS NOT NULL AND hc.historical_background != ''
          OR hc.cultural_context IS NOT NULL AND hc.cultural_context != '')
      GROUP BY bb.id, bb.name_english, bb.book_number, bb.testament
      ORDER BY bb.book_number ASC
    `;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching all historical context:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
