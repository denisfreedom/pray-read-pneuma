import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const headers = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    const sourceBookNumber = searchParams.get('source_book_number');
    const sourceChapter = searchParams.get('source_chapter');
    const sourceVerse = searchParams.get('source_verse');

    let foundBookId: number | null = null;
    let ch: number | null = null;
    let v: number | null = null;

    if (sourceBookNumber && sourceChapter && sourceVerse) {
      const bookLookup: any[] = await sql`SELECT id FROM bible_books WHERE book_number = ${parseInt(sourceBookNumber)}`;
      if (bookLookup.length === 0) return NextResponse.json([], { status: 200, headers });
      foundBookId = bookLookup[0].id;
      ch = parseInt(sourceChapter);
      v = parseInt(sourceVerse);
    } else if (bookId && chapter && verse) {
      foundBookId = parseInt(bookId);
      ch = parseInt(chapter);
      v = parseInt(verse);
    } else if (bookId && chapter) {
      // Chapter-wide: all verses in chapter
      foundBookId = parseInt(bookId);
      ch = parseInt(chapter);
      v = null;
    } else {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400, headers });
    }

    // NEW TABLE FIRST: cross_references (Bulk Import home) — with verse text
    try {
      const rows: any[] = v !== null
        ? await sql`
            SELECT cr.id, cr.source_book_id, cr.source_chapter, cr.source_verse, cr.target_book_id, cr.target_chapter, cr.target_verse, cr.relationship_type, cr.notes,
                   tb.name_english as target_book_name, tb.name_luganda as target_book_name_luganda, tb.book_number as target_book_number,
                   sb.name_english as source_book_name, sb.name_luganda as source_book_name_luganda, sb.book_number as source_book_number,
                   bv.text_english,
                   regexp_replace(regexp_replace(bv.text_luganda, '<[^>]*>', '', 'g'), '<!--.*?-->', '', 'g') as text_luganda
            FROM cross_references cr
            JOIN bible_books tb ON cr.target_book_id = tb.id
            JOIN bible_books sb ON cr.source_book_id = sb.id
            LEFT JOIN bible_verses bv ON bv.book_id = cr.target_book_id AND bv.chapter = cr.target_chapter AND bv.verse = cr.target_verse
            WHERE cr.source_book_id = ${foundBookId} AND cr.source_chapter = ${ch} AND cr.source_verse = ${v}
            ORDER BY tb.book_number, cr.target_chapter, cr.target_verse`
        : await sql`
            SELECT cr.id, cr.source_book_id, cr.source_chapter, cr.source_verse, cr.target_book_id, cr.target_chapter, cr.target_verse, cr.relationship_type, cr.notes,
                   tb.name_english as target_book_name, tb.name_luganda as target_book_name_luganda, tb.book_number as target_book_number,
                   sb.name_english as source_book_name, sb.name_luganda as source_book_name_luganda, sb.book_number as source_book_number,
                   bv.text_english,
                   regexp_replace(regexp_replace(bv.text_luganda, '<[^>]*>', '', 'g'), '<!--.*?-->', '', 'g') as text_luganda
            FROM cross_references cr
            JOIN bible_books tb ON cr.target_book_id = tb.id
            JOIN bible_books sb ON cr.source_book_id = sb.id
            LEFT JOIN bible_verses bv ON bv.book_id = cr.target_book_id AND bv.chapter = cr.target_chapter AND bv.verse = cr.target_verse
            WHERE cr.source_book_id = ${foundBookId} AND cr.source_chapter = ${ch}
            ORDER BY cr.source_verse, tb.book_number, cr.target_chapter, cr.target_verse`;
      if (rows.length) return NextResponse.json(rows, { headers });
    } catch {}

    // FALLBACK OLD TABLE: verse_cross_references
    try {
      const rows: any[] = v !== null
        ? await sql`
            SELECT vcr.id, vcr.source_book_id, vcr.source_chapter, vcr.source_verse, vcr.target_book_id, vcr.target_chapter, vcr.target_verse, vcr.relationship_type, vcr.notes,
                   tb.name_english as target_book_name, tb.name_luganda as target_book_name_luganda, tb.book_number as target_book_number,
                   sb.name_english as source_book_name, sb.name_luganda as source_book_name_luganda, sb.book_number as source_book_number,
                   bv.text_english,
                   regexp_replace(regexp_replace(bv.text_luganda, '<[^>]*>', '', 'g'), '<!--.*?-->', '', 'g') as text_luganda
            FROM verse_cross_references vcr
            JOIN bible_books sb ON vcr.source_book_id = sb.id
            JOIN bible_books tb ON vcr.target_book_id = tb.id
            LEFT JOIN bible_verses bv ON bv.book_id = vcr.target_book_id AND bv.chapter = vcr.target_chapter AND bv.verse = vcr.target_verse
            WHERE vcr.source_book_id = ${foundBookId} AND vcr.source_chapter = ${ch} AND vcr.source_verse = ${v}
            ORDER BY tb.book_number, vcr.target_chapter, vcr.target_verse`
        : await sql`
            SELECT vcr.id, vcr.source_book_id, vcr.source_chapter, vcr.source_verse, vcr.target_book_id, vcr.target_chapter, vcr.target_verse, vcr.relationship_type, vcr.notes,
                   tb.name_english as target_book_name, tb.name_luganda as target_book_name_luganda, tb.book_number as target_book_number,
                   sb.name_english as source_book_name, sb.name_luganda as source_book_name_luganda, sb.book_number as source_book_number,
                   bv.text_english,
                   regexp_replace(regexp_replace(bv.text_luganda, '<[^>]*>', '', 'g'), '<!--.*?-->', '', 'g') as text_luganda
            FROM verse_cross_references vcr
            JOIN bible_books sb ON vcr.source_book_id = sb.id
            JOIN bible_books tb ON vcr.target_book_id = tb.id
            LEFT JOIN bible_verses bv ON bv.book_id = vcr.target_book_id AND bv.chapter = vcr.target_chapter AND bv.verse = vcr.target_verse
            WHERE vcr.source_book_id = ${foundBookId} AND vcr.source_chapter = ${ch}
            ORDER BY vcr.source_verse, tb.book_number, vcr.target_chapter, vcr.target_verse`;
      return NextResponse.json(rows, { headers });
    } catch {
      return NextResponse.json([], { headers });
    }
  } catch (error) {
    console.error('Error fetching cross-references:', error);
    return NextResponse.json({ error: 'Failed to fetch cross-references' }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Support both camelCase (this file) and snake_case (Bulk Import / Admin)
    const sourceBookId = body.sourceBookId || body.source_book_id;
    const sourceChapter = body.sourceChapter || body.source_chapter;
    const sourceVerse = body.sourceVerse || body.source_verse;
    const targetBookId = body.targetBookId || body.target_book_id;
    const targetChapter = body.targetChapter || body.target_chapter;
    const targetVerse = body.targetVerse || body.target_verse;
    const relationshipType = body.relationshipType || body.relationship_type || 'related';
    const notes = body.notes || '';

    if (!sourceBookId || !sourceChapter || !sourceVerse || !targetBookId || !targetChapter || !targetVerse) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
    }

    // Write to NEW table first
    try {
      const result: any[] = await sql`
        INSERT INTO cross_references (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes)
        VALUES (${sourceBookId}, ${sourceChapter}, ${sourceVerse}, ${targetBookId}, ${targetChapter}, ${targetVerse}, ${relationshipType}, ${notes})
        ON CONFLICT (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse)
        DO UPDATE SET relationship_type = EXCLUDED.relationship_type, notes = EXCLUDED.notes
        RETURNING *
      `;
      return NextResponse.json({ success: true, crossReference: result[0] }, { headers });
    } catch {
      const result: any[] = await sql`
        INSERT INTO verse_cross_references (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes)
        VALUES (${sourceBookId}, ${sourceChapter}, ${sourceVerse}, ${targetBookId}, ${targetChapter}, ${targetVerse}, ${relationshipType}, ${notes})
        ON CONFLICT (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse)
        DO UPDATE SET relationship_type = EXCLUDED.relationship_type, notes = EXCLUDED.notes
        RETURNING *
      `;
      return NextResponse.json({ success: true, crossReference: result[0] }, { headers });
    }
  } catch (error) {
    console.error('Error creating cross-reference:', error);
    return NextResponse.json({ error: 'Failed to create cross-reference' }, { status: 500, headers });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;
    const sourceBookId = body.sourceBookId || body.source_book_id;
    const sourceChapter = body.sourceChapter || body.source_chapter;
    const sourceVerse = body.sourceVerse || body.source_verse;
    const targetBookId = body.targetBookId || body.target_book_id;
    const targetChapter = body.targetChapter || body.target_chapter;
    const targetVerse = body.targetVerse || body.target_verse;
    const relationshipType = body.relationshipType || body.relationship_type || 'related';
    const notes = body.notes || '';

    if (!id || !sourceBookId || !sourceChapter || !sourceVerse || !targetBookId || !targetChapter || !targetVerse) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
    }

    try {
      const result: any[] = await sql`
        UPDATE cross_references SET source_book_id = ${sourceBookId}, source_chapter = ${sourceChapter}, source_verse = ${sourceVerse}, target_book_id = ${targetBookId}, target_chapter = ${targetChapter}, target_verse = ${targetVerse}, relationship_type = ${relationshipType}, notes = ${notes}
        WHERE id = ${id} RETURNING *
      `;
      if (result.length) return NextResponse.json({ success: true, crossReference: result[0] }, { headers });
    } catch {}
    const result: any[] = await sql`
      UPDATE verse_cross_references SET source_book_id = ${sourceBookId}, source_chapter = ${sourceChapter}, source_verse = ${sourceVerse}, target_book_id = ${targetBookId}, target_chapter = ${targetChapter}, target_verse = ${targetVerse}, relationship_type = ${relationshipType}, notes = ${notes}
      WHERE id = ${id} RETURNING *
    `;
    if (result.length === 0) return NextResponse.json({ error: 'Cross-reference not found' }, { status: 404, headers });
    return NextResponse.json({ success: true, crossReference: result[0] }, { headers });
  } catch (error) {
    console.error('Error updating cross-reference:', error);
    return NextResponse.json({ error: 'Failed to update cross-reference' }, { status: 500, headers });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing cross-reference ID' }, { status: 400, headers });
    try { await sql`DELETE FROM cross_references WHERE id = ${id}`; } catch {}
    try { await sql`DELETE FROM verse_cross_references WHERE id = ${id}`; } catch {}
    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error('Error deleting cross-reference:', error);
    return NextResponse.json({ error: 'Failed to delete cross-reference' }, { status: 500, headers });
  }
}
