import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('book_id');

    if (bookId) {
      // Fetch book-level theological insights from the dedicated table
      const result = await sql`
        SELECT 
          id,
          book_id,
          english_insight,
          luganda_insight,
          created_at,
          updated_at
        FROM book_theological_insights
        WHERE book_id = ${parseInt(bookId)}
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

    // Check if book theological insight already exists
    const existing = await sql`
      SELECT id FROM book_theological_insights WHERE book_id = ${parseInt(bookId)}
    `;

    let result;
    if (existing.length > 0) {
      // Update existing insight
      result = await sql`
        UPDATE book_theological_insights
        SET 
          english_insight = ${englishInsight || ''},
          luganda_insight = ${lugandaInsight || ''},
          updated_at = NOW()
        WHERE book_id = ${parseInt(bookId)}
        RETURNING *
      `;
    } else {
      // Insert new insight
      result = await sql`
        INSERT INTO book_theological_insights (book_id, english_insight, luganda_insight)
        VALUES (${parseInt(bookId)}, ${englishInsight || ''}, ${lugandaInsight || ''})
        RETURNING *
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Book theological insights saved successfully',
      data: result[0]
    });
  } catch (error) {
    console.error('Error saving book theological insights:', error);
    return NextResponse.json({ error: 'Failed to save theological insights' }, { status: 500 });
  }
}
