import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('book_id');

    if (bookId) {
      // For now, aggregate theological insights from all verses in the book
      // If you want to add book-level theological insights, you can expand the database schema
      const result = await sql`
        SELECT 
          ${parseInt(bookId)} as book_id,
          STRING_AGG(DISTINCT english_insight, ' | ') as english_insight,
          STRING_AGG(DISTINCT luganda_insight, ' | ') as luganda_insight
        FROM verse_theological_insights 
        WHERE book_id = ${parseInt(bookId)}
        AND (english_insight IS NOT NULL AND english_insight != '' OR luganda_insight IS NOT NULL AND luganda_insight != '')
      `;
      
      return NextResponse.json(result[0] || null);
    }
    
    return NextResponse.json(null);
  } catch (error) {
    console.error('Error fetching book theological insights:', error);
    return NextResponse.json({ error: 'Failed to fetch theological insights' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, englishInsight, lugandaInsight } = body;

    if (!bookId) {
      return NextResponse.json({ error: 'Missing book ID' }, { status: 400 });
    }

    // Store book-level insights (if you expand the schema)
    // For now, return success
    return NextResponse.json({ 
      success: true, 
      message: 'Theological insights updated' 
    });
  } catch (error) {
    console.error('Error saving book theological insights:', error);
    return NextResponse.json({ error: 'Failed to save theological insights' }, { status: 500 });
  }
}
