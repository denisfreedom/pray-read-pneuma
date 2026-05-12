import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const plans = await sql`
      SELECT 
        dp.*,
        bb.name_english as book_name,
        bb.name_luganda as book_name_luganda
      FROM devotional_plans dp
      LEFT JOIN bible_books bb ON dp.scripture_book_id = bb.id
      WHERE dp.id = ${id}
    `;

    if (plans.length === 0) {
      return NextResponse.json({ error: 'Devotional plan not found' }, { status: 404 });
    }

    // Also fetch the actual verse text if scripture reference exists
    if (plans[0].scripture_book_id && plans[0].scripture_chapter && plans[0].scripture_verse) {
      const verses = await sql`
        SELECT text_english, text_luganda
        FROM bible_verses
        WHERE book_id = ${plans[0].scripture_book_id}
          AND chapter = ${plans[0].scripture_chapter}
          AND verse = ${plans[0].scripture_verse}
      `;

      if (verses.length > 0) {
        plans[0].verse_text_english = verses[0].text_english;
        plans[0].verse_text_luganda = verses[0].text_luganda;
      }
    }

    return NextResponse.json(plans[0]);
  } catch (error) {
    console.error('Error fetching devotional plan:', error);
    return NextResponse.json({ error: 'Failed to fetch devotional plan' }, { status: 500 });
  }
}
