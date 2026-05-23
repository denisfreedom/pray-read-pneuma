import sql from '@/app/api/utils/sql';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');

    // Support both bookId (from admin) and source_book_number (from bible reader)
    const sourceBookNumber = searchParams.get('source_book_number');
    const sourceChapter = searchParams.get('source_chapter');
    const sourceVerse = searchParams.get('source_verse');

    let query;
    let params: any = {};

    // If using source_book_number (from verse-cross-references endpoint), convert to book_id
    if (sourceBookNumber && sourceChapter && sourceVerse) {
      // Get the book_id from book_number
      const bookLookup = await sql`
        SELECT id FROM bible_books WHERE book_number = ${parseInt(sourceBookNumber)}
      `;
      
      if (bookLookup.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      const foundBookId = bookLookup[0].id;
      
      // Query using book_id — include verse text and book names for the modal
      query = await sql`
        SELECT 
          vcr.id,
          vcr.source_book_id,
          vcr.source_chapter,
          vcr.source_verse,
          vcr.target_book_id,
          vcr.target_chapter,
          vcr.target_verse,
          vcr.relationship_type,
          vcr.notes,
          tb.name_english as target_book_name,
          tb.name_luganda as target_book_name_luganda,
          tb.book_number as target_book_number,
          bv.text_english,
          regexp_replace(
            regexp_replace(bv.text_luganda, '<[^>]*>', '', 'g'),
            '<!--.*?-->', '', 'g'
          ) as text_luganda
        FROM verse_cross_references vcr
        JOIN bible_books tb ON vcr.target_book_id = tb.id
        LEFT JOIN bible_verses bv ON bv.book_id = vcr.target_book_id
          AND bv.chapter = vcr.target_chapter
          AND bv.verse = vcr.target_verse
        WHERE vcr.source_book_id = ${foundBookId}
          AND vcr.source_chapter = ${parseInt(sourceChapter)}
          AND vcr.source_verse = ${parseInt(sourceVerse)}
        ORDER BY tb.book_number, vcr.target_chapter, vcr.target_verse
      `;
    } else if (bookId && chapter && verse) {
      // Original bookId query (from admin panel)
      query = await sql`
        SELECT 
          vcr.*,
          sb.name_english as source_book_name,
          sb.name_luganda as source_book_name_luganda,
          sb.book_number as source_book_number,
          tb.name_english as target_book_name,
          tb.name_luganda as target_book_name_luganda,
          tb.book_number as target_book_number,
          bv.text_english,
          regexp_replace(
            regexp_replace(bv.text_luganda, '<[^>]*>', '', 'g'),
            '<!--.*?-->', '', 'g'
          ) as text_luganda
        FROM verse_cross_references vcr
        JOIN bible_books sb ON vcr.source_book_id = sb.id
        JOIN bible_books tb ON vcr.target_book_id = tb.id
        LEFT JOIN bible_verses bv ON bv.book_id = vcr.target_book_id 
          AND bv.chapter = vcr.target_chapter 
          AND bv.verse = vcr.target_verse
        WHERE vcr.source_book_id = ${parseInt(bookId)}
          AND vcr.source_chapter = ${parseInt(chapter)}
          AND vcr.source_verse = ${parseInt(verse)}
        ORDER BY tb.book_number, vcr.target_chapter, vcr.target_verse
      `;
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`✅ Cross-references API: Found ${query.length} references`);
    return NextResponse.json(query);
  } catch (error) {
    console.error('Error fetching cross-references:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-references' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceBookId,
      sourceChapter,
      sourceVerse,
      targetBookId,
      targetChapter,
      targetVerse,
      relationshipType = 'related',
      notes = ''
    } = body;

    if (!sourceBookId || !sourceChapter || !sourceVerse || !targetBookId || !targetChapter || !targetVerse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO verse_cross_references 
        (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes)
      VALUES 
        (${sourceBookId}, ${sourceChapter}, ${sourceVerse}, ${targetBookId}, ${targetChapter}, ${targetVerse}, ${relationshipType}, ${notes})
      ON CONFLICT (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse)
      DO UPDATE SET
        relationship_type = EXCLUDED.relationship_type,
        notes = EXCLUDED.notes
      RETURNING *
    `;

    return NextResponse.json({ success: true, crossReference: result[0] });
  } catch (error) {
    console.error('Error creating cross-reference:', error);
    return NextResponse.json(
      { error: 'Failed to create cross-reference' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      sourceBookId,
      sourceChapter,
      sourceVerse,
      targetBookId,
      targetChapter,
      targetVerse,
      relationshipType = 'related',
      notes = ''
    } = body;

    if (!id || !sourceBookId || !sourceChapter || !sourceVerse || !targetBookId || !targetChapter || !targetVerse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE verse_cross_references
      SET 
        source_book_id = ${sourceBookId},
        source_chapter = ${sourceChapter},
        source_verse = ${sourceVerse},
        target_book_id = ${targetBookId},
        target_chapter = ${targetChapter},
        target_verse = ${targetVerse},
        relationship_type = ${relationshipType},
        notes = ${notes}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Cross-reference not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, crossReference: result[0] });
  } catch (error) {
    console.error('Error updating cross-reference:', error);
    return NextResponse.json(
      { error: 'Failed to update cross-reference' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing cross-reference ID' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM verse_cross_references
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cross-reference:', error);
    return NextResponse.json(
      { error: 'Failed to delete cross-reference' },
      { status: 500 }
    );
  }
}
