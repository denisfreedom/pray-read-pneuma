// FIX: POST was INSERT-only. If a commentary already existed (loaded in the editor),
// Save called POST again -> UNIQUE violation -> 500 "Failed to save".
// POST is now an UPSERT: INSERT ... ON CONFLICT DO UPDATE. Save works for new AND existing.
// PUT kept for the admin panel's explicit edit path.
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verseNumber') || searchParams.get('verse');
    if (bookId && chapter && verse) {
      const rows = await sql`SELECT id, book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at FROM verse_commentaries WHERE book_id = ${parseInt(bookId)} AND chapter = ${parseInt(chapter)} AND verse_number = ${parseInt(verse)} LIMIT 1`;
      return NextResponse.json(rows.length > 0 ? rows[0] : null, { headers });
    }
    if (bookId && chapter) {
      const rows = await sql`SELECT id, book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at FROM verse_commentaries WHERE book_id = ${parseInt(bookId)} AND chapter = ${parseInt(chapter)} ORDER BY verse_number ASC`;
      return NextResponse.json(rows, { headers });
    }
    return NextResponse.json([], { headers });
  } catch (error) {
    console.error('Error fetching verse commentary:', error);
    return NextResponse.json({ error: 'Failed to fetch verse commentary' }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept both shapes: admin panel (commentary_text) and bulk/other (commentaryText / english_commentary)
    const book_id = body.book_id ?? body.bookId;
    const chapter = body.chapter;
    const verse_number = body.verse_number ?? body.verseNumber ?? body.verse;
    const commentary_text = body.commentary_text ?? body.commentaryText ?? body.english_commentary ?? body.commentary ?? null;
    const luganda_commentary_text = body.luganda_commentary_text ?? body.lugandaCommentaryText ?? body.luganda_commentary ?? null;
    if (!book_id || chapter === undefined || chapter === null || chapter === '' || verse_number === undefined || verse_number === null || verse_number === '') {
      return NextResponse.json({ error: 'book_id, chapter and verse_number required' }, { status: 400, headers });
    }
    await sql`CREATE TABLE IF NOT EXISTS verse_commentaries (id SERIAL PRIMARY KEY, book_id INT NOT NULL, chapter INT NOT NULL, verse_number INT NOT NULL, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS verse_commentaries_book_chapter_verse_unique ON verse_commentaries (book_id, chapter, verse_number)`;
    const result = await sql`
      INSERT INTO verse_commentaries (book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at)
      VALUES (${parseInt(book_id)}, ${parseInt(chapter)}, ${parseInt(verse_number)}, ${commentary_text}, ${luganda_commentary_text}, NOW(), NOW())
      ON CONFLICT (book_id, chapter, verse_number) DO UPDATE SET commentary_text = EXCLUDED.commentary_text, luganda_commentary_text = EXCLUDED.luganda_commentary_text, updated_at = NOW()
      RETURNING id, book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at
    `;
    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error saving verse commentary:', error);
    return NextResponse.json({ error: 'Failed to save verse commentary' }, { status: 500, headers });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    const commentary_text = body.commentary_text ?? body.commentaryText ?? body.english_commentary ?? null;
    const luganda_commentary_text = body.luganda_commentary_text ?? body.lugandaCommentaryText ?? body.luganda_commentary ?? null;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400, headers });
    const result = await sql`
      UPDATE verse_commentaries SET commentary_text = ${commentary_text}, luganda_commentary_text = ${luganda_commentary_text}, updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING id, book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at
    `;
    return NextResponse.json(result[0] ?? null, { headers });
  } catch (error) {
    console.error('Error updating verse commentary:', error);
    return NextResponse.json({ error: 'Failed to update verse commentary' }, { status: 500, headers });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400, headers });
    await sql`DELETE FROM verse_commentaries WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true, message: 'Commentary deleted' }, { headers });
  } catch (error) {
    console.error('Error deleting verse commentary:', error);
    return NextResponse.json({ error: 'Failed to delete verse commentary' }, { status: 500, headers });
  }
}
