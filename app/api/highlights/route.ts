import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// GET - Fetch highlights for a chapter (optionally by user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const userEmail = searchParams.get('userEmail');

    if (!bookId || !chapter) {
      return NextResponse.json({ success: false, error: 'bookId and chapter required' }, { status: 400 });
    }

    let highlights;
    if (userEmail) {
      // Return user's highlights AND anonymous highlights for this chapter
      highlights = await sql`
        SELECT * FROM text_highlights 
        WHERE book_id = ${parseInt(bookId)}
        AND chapter = ${parseInt(chapter)}
        AND (user_email = ${userEmail} OR user_email IS NULL OR user_email = '')
        ORDER BY verse_number ASC, start_offset ASC
      `;
    } else {
      // Return all highlights for this chapter (guests see everything)
      highlights = await sql`
        SELECT * FROM text_highlights 
        WHERE book_id = ${parseInt(bookId)}
        AND chapter = ${parseInt(chapter)}
        ORDER BY verse_number ASC, start_offset ASC
      `;
    }

    return NextResponse.json({ success: true, highlights });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch highlights' }, { status: 500 });
  }
}

// POST - Save a highlight or underline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapter, verseNumber, startOffset, endOffset, highlightColor, textContent, userEmail, isUnderline, sectionType } = body;

    if (!bookId || !chapter || !verseNumber || startOffset === undefined || endOffset === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO text_highlights (
        book_id, chapter, verse_number, start_offset, end_offset,
        highlight_color, text_content, user_email, is_underline, section_type,
        created_at, updated_at
      )
      VALUES (
        ${parseInt(bookId)}, ${parseInt(chapter)}, ${parseInt(verseNumber)},
        ${parseInt(startOffset)}, ${parseInt(endOffset)},
        ${isUnderline ? 'underline' : (highlightColor || 'yellow')},
        ${textContent || ''},
        ${userEmail || null},
        ${isUnderline ? true : false},
        ${sectionType || 'verse'},
        NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, highlight: inserted[0] });
  } catch (error) {
    console.error('Error saving highlight:', error);
    return NextResponse.json({ success: false, error: 'Failed to save highlight' }, { status: 500 });
  }
}

// DELETE - Remove a highlight
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const highlightId = searchParams.get('highlightId');

    if (!highlightId) {
      return NextResponse.json({ success: false, error: 'Missing highlightId' }, { status: 400 });
    }

    await sql`DELETE FROM text_highlights WHERE id = ${parseInt(highlightId)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete highlight' }, { status: 500 });
  }
}
