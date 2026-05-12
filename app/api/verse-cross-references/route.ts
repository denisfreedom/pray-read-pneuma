import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const headers = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sourceBookNumber = searchParams.get('source_book_number');
    const sourceChapter = searchParams.get('source_chapter');

    if (sourceBookNumber && sourceChapter) {
      const crossRefs = await sql`
        SELECT 
          vcr.source_verse,
          vcr.target_book_id,
          vcr.target_chapter,
          vcr.target_verse,
          vcr.relationship_type,
          vcr.notes,
          tb.book_number AS target_book_number
        FROM verse_cross_references vcr
        JOIN bible_books sb ON vcr.source_book_id = sb.id
        JOIN bible_books tb ON vcr.target_book_id = tb.id
        WHERE sb.book_number = ${parseInt(sourceBookNumber)} 
          AND vcr.source_chapter = ${parseInt(sourceChapter)}
        ORDER BY vcr.source_verse ASC
      `;
      return NextResponse.json(crossRefs, { headers });
    }

    return NextResponse.json([], { headers });
  } catch (error) {
    console.error('Error fetching cross-references:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-references' },
      { status: 500, headers }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes } = body;

    // Insert or update cross-reference using UPSERT
    const result = await sql`
      INSERT INTO verse_cross_references (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes, created_at)
      VALUES (${source_book_id}, ${source_chapter}, ${source_verse}, ${target_book_id}, ${target_chapter}, ${target_verse}, ${relationship_type || ''}, ${notes || ''}, NOW())
      ON CONFLICT (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse)
      DO UPDATE SET
        relationship_type = ${relationship_type || ''},
        notes = ${notes || ''}
      RETURNING *
    `;

    return NextResponse.json({ success: true, message: 'Cross-reference saved', data: result[0] }, { headers });
  } catch (error) {
    console.error('Error saving cross-reference:', error);
    return NextResponse.json(
      { error: 'Failed to save cross-reference' },
      { status: 500, headers }
    );
  }
}
