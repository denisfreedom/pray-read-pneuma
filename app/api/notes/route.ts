import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// GET - Fetch notes for a specific chapter or verse
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verseNumber = searchParams.get('verseNumber');

    if (!bookId || !chapter) {
      return NextResponse.json(
        { success: false, error: 'Missing bookId or chapter parameter' },
        { status: 400 }
      );
    }

    let notes;
    if (verseNumber) {
      // Get note for specific verse
      notes = await sql`
        SELECT * FROM notes 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)}
        AND verse_number = ${parseInt(verseNumber)}
        ORDER BY created_at DESC
      `;
    } else {
      // Get all notes for chapter
      notes = await sql`
        SELECT * FROM notes 
        WHERE book_id = ${parseInt(bookId)} 
        AND chapter = ${parseInt(chapter)}
        ORDER BY verse_number ASC, created_at DESC
      `;
    }

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST - Create or update a note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, chapter, verseNumber, noteText, noteId } = body;

    if (!bookId || !chapter || !verseNumber || !noteText) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (noteId) {
      // Update existing note
      const updated = await sql`
        UPDATE notes 
        SET note_text = ${noteText},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${noteId}
        RETURNING *
      `;
      return NextResponse.json({ success: true, note: updated[0] });
    } else {
      // Create new note
      const inserted = await sql`
        INSERT INTO notes (book_id, chapter, verse_number, note_text)
        VALUES (${bookId}, ${chapter}, ${verseNumber}, ${noteText})
        RETURNING *
      `;
      return NextResponse.json({ success: true, note: inserted[0] });
    }
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save note' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a note
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'Missing noteId parameter' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM notes 
      WHERE id = ${parseInt(noteId)}
    `;

    return NextResponse.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
