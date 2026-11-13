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
    if (bookId) {
      const commentary = await sql`SELECT id, book_id, english_commentary, luganda_commentary, created_at, updated_at FROM book_commentaries WHERE book_id = ${parseInt(bookId)} LIMIT 1`;
      return NextResponse.json(commentary.length > 0 ? commentary[0] : null, { headers });
    }
    return NextResponse.json(null, { headers });
  } catch (error) {
    console.error('Error fetching book commentary:', error);
    return NextResponse.json({ error: 'Failed to fetch book commentary' }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, english_commentary, luganda_commentary } = body;
    if (!book_id) return NextResponse.json({ error: 'book_id required' }, { status: 400, headers });
    // Ensure table + unique key exist so ON CONFLICT works even on old DBs
    await sql`CREATE TABLE IF NOT EXISTS book_commentaries (id SERIAL PRIMARY KEY, book_id INT NOT NULL, english_commentary TEXT, luganda_commentary TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS book_commentaries_book_id_unique ON book_commentaries (book_id)`;
    const result = await sql`
      INSERT INTO book_commentaries (book_id, english_commentary, luganda_commentary, created_at, updated_at)
      VALUES (${parseInt(book_id)}, ${english_commentary ?? null}, ${luganda_commentary ?? null}, NOW(), NOW())
      ON CONFLICT (book_id) DO UPDATE SET english_commentary = EXCLUDED.english_commentary, luganda_commentary = EXCLUDED.luganda_commentary, updated_at = NOW()
      RETURNING id, book_id, english_commentary, luganda_commentary, created_at, updated_at
    `;
    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error saving book commentary:', error);
    return NextResponse.json({ error: 'Failed to save book commentary' }, { status: 500, headers });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, english_commentary, luganda_commentary } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400, headers });
    const result = await sql`
      UPDATE book_commentaries SET english_commentary = ${english_commentary ?? null}, luganda_commentary = ${luganda_commentary ?? null}, updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING id, book_id, english_commentary, luganda_commentary, created_at, updated_at
    `;
    return NextResponse.json(result[0] ?? null, { headers });
  } catch (error) {
    console.error('Error updating book commentary:', error);
    return NextResponse.json({ error: 'Failed to update book commentary' }, { status: 500, headers });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400, headers });
    await sql`DELETE FROM book_commentaries WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true, message: 'Commentary deleted' }, { headers });
  } catch (error) {
    console.error('Error deleting book commentary:', error);
    return NextResponse.json({ error: 'Failed to delete book commentary' }, { status: 500, headers });
  }
}
