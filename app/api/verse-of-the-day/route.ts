import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get total count of pray-read verses (verses with BOTH English and Luganda text)
    const countResult = await sql`
      SELECT COUNT(*) as total FROM bible_verses
      WHERE text_english IS NOT NULL 
        AND text_english != ''
        AND text_luganda IS NOT NULL 
        AND text_luganda != ''
    `;
    const totalVerses = parseInt(countResult[0].total);
    
    if (totalVerses === 0) {
      return NextResponse.json({ error: 'No pray-read verses found' }, { status: 404 });
    }
    
    // Generate a random index
    const randomIndex = Math.floor(Math.random() * totalVerses);
    
    // Get the random pray-read verse
    const verses = await sql`
      SELECT 
        v.id,
        v.book_id,
        b.book_number,
        v.chapter,
        v.verse,
        v.text_english,
        v.text_luganda,
        b.name_english,
        b.name_luganda
      FROM bible_verses v
      JOIN bible_books b ON v.book_id = b.id
      WHERE v.text_english IS NOT NULL 
        AND v.text_english != ''
        AND v.text_luganda IS NOT NULL 
        AND v.text_luganda != ''
      ORDER BY v.id
      LIMIT 1 OFFSET ${randomIndex}
    `;
    
    if (verses.length === 0) {
      return NextResponse.json({ error: 'No pray-read verses found' }, { status: 404 });
    }
    
    return NextResponse.json(verses[0]);
  } catch (error) {
    console.error('Error fetching verse of the day:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verse of the day' },
      { status: 500 }
    );
  }
}
