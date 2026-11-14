// FIX: POST was INSERT-only. If a commentary already existed (loaded in the editor),
// Save called POST again -> UNIQUE violation -> 500 "Failed to save".
// POST is now an UPSERT: INSERT ... ON CONFLICT DO UPDATE. Save works for new AND existing.
// PUT kept for the admin panel's explicit edit path.
//
// V3 FIX (candidate book ids) + V2 FIX (param tolerance): the old GET only understood `bookId`. The chapter
// page and some callers send `book_number` instead — GET then saw no bookId
// and returned [] / null, so nothing displayed. This version accepts
// bookId / book_id / book_number / book, and resolves book_number -> book_id
// through bible_books. Same table, same columns, same upsert, same return
// shapes the Admin panel expects (single-verse GET -> object or null,
// chapter GET -> array). Nothing else changed.
//
// CORRECT PATH: app/api/verse-commentaries/route.ts
// Do NOT paste this into app/api/commentaries/route.ts — that path belongs
// to the verse DISPLAY route (route-commentaries-BOOK-FILTER-V2.ts), which
// is what the chapter page calls. Swapping them blanks the front page.
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

// V4: normalize rows to commentary_text / luganda_commentary_text using the
// first NON-EMPTY field — same "saved but empty" fix as the page. Bulk rows
// may carry the text under another field name or beside an empty
// commentary_text, and ?? chains would stop at that empty string.
function firstText(...vals: any[]): string {
  for (const v of vals) if (typeof v === 'string' && v.trim()) return v;
  return '';
}
function normalizeRow(c: any): any {
  if (!c || typeof c !== 'object') return c;
  return {
    ...c,
    commentary_text: firstText(c.commentary_text, c.english_commentary, c.text_english, c.commentary, c.text, c.content, c.body, c.english_text, c.en, c.commentary_html, c.html, c.explanation, c.explanation_english, c.insight, c.text_html, c.content_html, c.commentary_english, c.en_commentary, c.english),
    luganda_commentary_text: firstText(c.luganda_commentary_text, c.luganda_commentary, c.text_luganda, c.luganda, c.lu, c.luganda_text, c.lu_text, c.commentary_luganda, c.luganda_html, c.luganda_content, c.lu_commentary),
  };
}
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// Resolve whatever book identifier a caller sent into the book_id stored in
// verse_commentaries. Accepts: a bible_books id, a book_number (1-66), or a
// book name. Falls back to the raw number when bible_books has no match.
async function resolveBookId(raw: any): Promise<number | null> {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isNaN(n) && n > 0) {
    try {
      const b: any[] = await sql`SELECT id FROM bible_books WHERE book_number = ${n} LIMIT 1`;
      if (b[0]?.id) return Number(b[0].id);
    } catch { /* bible_books missing — use the number as-is */ }
    return n;
  }
  try {
    const b: any[] = await sql`SELECT id FROM bible_books WHERE LOWER(name_english) = ${String(raw).toLowerCase()} OR LOWER(name) = ${String(raw).toLowerCase()} LIMIT 1`;
    if (b[0]?.id) return Number(b[0].id);
  } catch {}
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    // Accept every param name callers have used: bookId / book_id / book_number / book
    const bookRaw = searchParams.get('bookId') ?? searchParams.get('book_id') ?? searchParams.get('book_number') ?? searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verseNumber') || searchParams.get('verse_number') || searchParams.get('verse');
    // V3: the stored book_id's numbering is not guaranteed to equal the
    // book_number or the bible_books id — Admin proved the row IS under
    // 3 John, yet the front page got nothing. So try EVERY candidate id:
    // bible_books id for the number, id for the name, and the raw number.
    // First candidate with rows wins. Giving up after one guess is what
    // blanked the front page.
    const bookName = searchParams.get('bookName') ?? searchParams.get('book_name') ?? searchParams.get('name');
    const candidates: number[] = [];
    const pushCand = (v: number | null) => { if (v && !candidates.includes(v)) candidates.push(v); };
    pushCand(await resolveBookId(bookRaw));
    if (bookName) pushCand(await resolveBookId(bookName));
    const rawN = parseInt(String(bookRaw ?? ''), 10);
    if (!Number.isNaN(rawN) && rawN > 0) pushCand(rawN);
    if (!candidates.length) return NextResponse.json([], { headers });
    if (chapter && verse) {
      for (const bookId of candidates) {
        const rows = await sql`SELECT id, book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at FROM verse_commentaries WHERE book_id = ${bookId} AND chapter = ${parseInt(chapter)} AND verse_number = ${parseInt(verse)} LIMIT 1`;
        if (rows.length > 0) return NextResponse.json(normalizeRow(rows[0]), { headers });
      }
      return NextResponse.json(null, { headers });
    }
    if (chapter) {
      for (const bookId of candidates) {
        const rows = await sql`SELECT id, book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at FROM verse_commentaries WHERE book_id = ${bookId} AND chapter = ${parseInt(chapter)} ORDER BY verse_number ASC`;
        if (rows.length > 0) return NextResponse.json(rows.map(normalizeRow), { headers });
      }
      return NextResponse.json([], { headers });
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
    // Accept every book key: book_id / bookId / book_number / book
    const bookRaw = body.book_id ?? body.bookId ?? body.book_number ?? body.book;
    const chapter = body.chapter;
    const verse_number = body.verse_number ?? body.verseNumber ?? body.verse;
    const commentary_text = body.commentary_text ?? body.commentaryText ?? body.english_commentary ?? body.commentary ?? null;
    const luganda_commentary_text = body.luganda_commentary_text ?? body.lugandaCommentaryText ?? body.luganda_commentary ?? null;
    const book_id = await resolveBookId(bookRaw);
    if (!book_id || chapter === undefined || chapter === null || chapter === '' || verse_number === undefined || verse_number === null || verse_number === '') {
      return NextResponse.json({ error: 'book_id, chapter and verse_number required' }, { status: 400, headers });
    }
    await sql`CREATE TABLE IF NOT EXISTS verse_commentaries (id SERIAL PRIMARY KEY, book_id INT NOT NULL, chapter INT NOT NULL, verse_number INT NOT NULL, commentary_text TEXT, luganda_commentary_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS verse_commentaries_book_chapter_verse_unique ON verse_commentaries (book_id, chapter, verse_number)`;
    const result = await sql`
      INSERT INTO verse_commentaries (book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at)
      VALUES (${book_id}, ${parseInt(chapter)}, ${parseInt(verse_number)}, ${commentary_text}, ${luganda_commentary_text}, NOW(), NOW())
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
