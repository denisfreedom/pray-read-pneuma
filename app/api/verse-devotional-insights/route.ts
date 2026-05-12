import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verseNumber = searchParams.get('verseNumber');

    if (bookId && chapter && verseNumber) {
      const result = await sql`
        SELECT * FROM verse_devotional_insights 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)} 
        AND verse_number = ${parseInt(verseNumber)}
      `;
      return NextResponse.json(result[0] || null);
    }
    
    return NextResponse.json(null);
  } catch (error) {
    console.error('Error fetching devotional insights:', error);
    return NextResponse.json({ error: 'Failed to fetch devotional insights' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapter, verseNumber, englishDevotional, lugandaDevotional } = body;

    if (!bookId || !chapter || !verseNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO verse_devotional_insights (book_id, chapter, verse_number, english_devotional, luganda_devotional)
      VALUES (${bookId}, ${chapter}, ${verseNumber}, ${englishDevotional || ''}, ${lugandaDevotional || ''})
      ON CONFLICT (book_id, chapter, verse_number) 
      DO UPDATE SET 
        english_devotional = ${englishDevotional || ''},
        luganda_devotional = ${lugandaDevotional || ''},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error saving devotional insights:', error);
    return NextResponse.json({ error: 'Failed to save devotional insights' }, { status: 500 });
  }
}
