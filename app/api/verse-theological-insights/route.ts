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
        SELECT * FROM verse_theological_insights 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)} 
        AND verse_number = ${parseInt(verseNumber)}
      `;
      return NextResponse.json(result[0] || null);
    } else if (bookId && chapter) {
      const result = await sql`
        SELECT * FROM verse_theological_insights 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)}
        ORDER BY verse_number ASC
      `;
      return NextResponse.json(result || []);
    }
    
    return NextResponse.json(null);
  } catch (error) {
    console.error('Error fetching theological insights:', error);
    return NextResponse.json({ error: 'Failed to fetch theological insights' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapter, verseNumber, englishInsight, lugandaInsight } = body;

    if (!bookId || chapter === undefined || !verseNumber) {
      return NextResponse.json({ error: 'Missing required fields: bookId, chapter, verseNumber' }, { status: 400 });
    }

    // Check if insight already exists
    const existing = await sql`
      SELECT id FROM verse_theological_insights
      WHERE book_id = ${bookId}
        AND chapter = ${chapter}
        AND verse_number = ${verseNumber}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update existing insight
      await sql`
        UPDATE verse_theological_insights
        SET 
          english_insight = ${englishInsight},
          luganda_insight = ${lugandaInsight},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing[0].id}
      `;
      return NextResponse.json({ success: true, message: 'Theological insight updated successfully!' });
    } else {
      // Insert new insight
      await sql`
        INSERT INTO verse_theological_insights (book_id, chapter, verse_number, english_insight, luganda_insight, created_at, updated_at)
        VALUES (${bookId}, ${chapter}, ${verseNumber}, ${englishInsight}, ${lugandaInsight}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      return NextResponse.json({ success: true, message: 'Theological insight saved successfully!' });
    }
  } catch (error) {
    console.error('Error saving theological insights:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to save theological insight';
    return NextResponse.json({ 
      error: errorMsg,
      message: `Failed to save theological insight: ${errorMsg}`
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, bookId, chapter, verseNumber, englishInsight, lugandaInsight } = body;

    if (!id || !bookId || chapter === undefined || !verseNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sql`
      UPDATE verse_theological_insights
      SET 
        english_insight = ${englishInsight || ''},
        luganda_insight = ${lugandaInsight || ''},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error updating theological insights:', error);
    return NextResponse.json({ error: 'Failed to update theological insights' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM verse_theological_insights
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Theological insight deleted' });
  } catch (error) {
    console.error('Error deleting theological insights:', error);
    return NextResponse.json({ error: 'Failed to delete theological insights' }, { status: 500 });
  }
}
