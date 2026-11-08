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
    const sourceBookId = searchParams.get('source_book_id');
    const sourceChapter = searchParams.get('source_chapter');
    const sourceVerse = searchParams.get('source_verse') || searchParams.get('verse');

    // Resolve source_book_id from book_number if needed
    let sbId: number | null = sourceBookId ? parseInt(sourceBookId) : null;
    if (!sbId && sourceBookNumber) {
      try {
        const rows: any[] = await sql`SELECT id FROM bible_books WHERE book_number = ${parseInt(sourceBookNumber)} LIMIT 1`;
        if (rows.length) sbId = rows[0].id;
      } catch {}
    }
    if (!sbId || !sourceChapter) return NextResponse.json([], { headers });

    const ch = parseInt(sourceChapter);
    const v = sourceVerse ? parseInt(sourceVerse) : null;

    // NEW TABLE FIRST: cross_references (where Bulk Import writes)
    try {
      const rows: any[] = v !== null
        ? await sql`
            SELECT source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes,
                   (SELECT book_number FROM bible_books WHERE id = cross_references.target_book_id) AS target_book_number
            FROM cross_references
            WHERE source_book_id = ${sbId} AND source_chapter = ${ch} AND source_verse = ${v}
            ORDER BY source_verse ASC, target_book_id ASC, target_chapter ASC, target_verse ASC`
        : await sql`
            SELECT source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes,
                   (SELECT book_number FROM bible_books WHERE id = cross_references.target_book_id) AS target_book_number
            FROM cross_references
            WHERE source_book_id = ${sbId} AND source_chapter = ${ch}
            ORDER BY source_verse ASC, target_book_id ASC, target_chapter ASC, target_verse ASC`;
      if (rows.length) return NextResponse.json(rows, { headers });
    } catch {}

    // FALLBACK OLD TABLE: verse_cross_references
    try {
      const rows: any[] = v !== null
        ? await sql`
            SELECT vcr.source_verse, vcr.target_book_id, vcr.target_chapter, vcr.target_verse, vcr.relationship_type, vcr.notes,
                   tb.book_number AS target_book_number
            FROM verse_cross_references vcr
            JOIN bible_books sb ON vcr.source_book_id = sb.id
            JOIN bible_books tb ON vcr.target_book_id = tb.id
            WHERE vcr.source_book_id = ${sbId} AND vcr.source_chapter = ${ch} AND vcr.source_verse = ${v}
            ORDER BY vcr.source_verse ASC`
        : await sql`
            SELECT vcr.source_verse, vcr.target_book_id, vcr.target_chapter, vcr.target_verse, vcr.relationship_type, vcr.notes,
                   tb.book_number AS target_book_number
            FROM verse_cross_references vcr
            JOIN bible_books sb ON vcr.source_book_id = sb.id
            JOIN bible_books tb ON vcr.target_book_id = tb.id
            WHERE vcr.source_book_id = ${sbId} AND vcr.source_chapter = ${ch}
            ORDER BY vcr.source_verse ASC`;
      return NextResponse.json(rows, { headers });
    } catch {
      return NextResponse.json([], { headers });
    }
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

    // Write to NEW table first (where Bulk Import reads from)
    try {
      const result: any[] = await sql`
        INSERT INTO cross_references (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes, created_at)
        VALUES (${source_book_id}, ${source_chapter}, ${source_verse}, ${target_book_id}, ${target_chapter}, ${target_verse}, ${relationship_type || 'related'}, ${notes || ''}, NOW())
        ON CONFLICT (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse)
        DO UPDATE SET relationship_type = ${relationship_type || 'related'}, notes = ${notes || ''}
        RETURNING *
      `;
      return NextResponse.json({ success: true, message: 'Cross-reference saved', data: result[0] }, { headers });
    } catch (e) {
      // Fallback to OLD table if new table missing
      const result: any[] = await sql`
        INSERT INTO verse_cross_references (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes, created_at)
        VALUES (${source_book_id}, ${source_chapter}, ${source_verse}, ${target_book_id}, ${target_chapter}, ${target_verse}, ${relationship_type || ''}, ${notes || ''}, NOW())
        ON CONFLICT (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse)
        DO UPDATE SET relationship_type = ${relationship_type || ''}, notes = ${notes || ''}
        RETURNING *
      `;
      return NextResponse.json({ success: true, message: 'Cross-reference saved', data: result[0] }, { headers });
    }
  } catch (error) {
    console.error('Error saving cross-reference:', error);
    return NextResponse.json(
      { error: 'Failed to save cross-reference' },
      { status: 500, headers }
    );
  }
}
