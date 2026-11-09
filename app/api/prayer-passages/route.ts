import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };
function mapRow(r: any) {
  if (!r) return null;
  const en = r.pray_read_english ?? r.en_prayer ?? r.prayer_english ?? r.pray_read ?? null;
  const lu = r.pray_read_luganda ?? r.lu_prayer ?? r.prayer_luganda ?? null;
  return { ...r, en_prayer: en, lu_prayer: lu, pray_read_english: en, pray_read_luganda: lu, prayer_english: en, prayer_luganda: lu, pray_read: en };
}
async function resolveBookId(params: URLSearchParams): Promise<number | null> {
  const bookIdParam = params.get('bookId') || params.get('book_id') || params.get('bookIdParam');
  const bookNumber = params.get('book_number') || params.get('bookNumber');
  const bookName = params.get('book') || params.get('bookName') || params.get('name');
  // 1. Explicit book_number wins
  if (bookNumber) {
    try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE book_number = ${parseInt(bookNumber)} LIMIT 1`; if (rows.length) return rows[0].id; } catch {}
    // Fallback: treat book_number value as id directly
    try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE id = ${parseInt(bookNumber)} LIMIT 1`; if (rows.length) return rows[0].id; } catch {}
  }
  // 2. bookId could be id OR book_number — try both
  if (bookIdParam) {
    const n = parseInt(bookIdParam);
    if (!isNaN(n)) {
      try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE id = ${n} LIMIT 1`; if (rows.length) return rows[0].id; } catch {}
      try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE book_number = ${n} LIMIT 1`; if (rows.length) return rows[0].id; } catch {}
    } else {
      // bookId is actually a name
      try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE name_english = ${bookIdParam} OR name_luganda = ${bookIdParam} LIMIT 1`; if (rows.length) return rows[0].id; } catch {}
    }
  }
  // 3. book name
  if (bookName) {
    try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE name_english = ${bookName} OR name_luganda = ${bookName} OR abbreviation_english = ${bookName} LIMIT 1`; if (rows.length) return rows[0].id; } catch {}
  }
  return null;
}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    const bookId = await resolveBookId(searchParams);
    if (!bookId || !chapter) return NextResponse.json([], { headers });
    const ch = parseInt(chapter);
    const v = verse ? parseInt(verse) : null;
    try {
      const rows: any[] = v !== null
        ? await sql`SELECT book_id, chapter, verse, pray_read_english, pray_read_luganda FROM verse_pray_read WHERE book_id = ${bookId} AND chapter = ${ch} AND verse = ${v} ORDER BY verse`
        : await sql`SELECT book_id, chapter, verse, pray_read_english, pray_read_luganda FROM verse_pray_read WHERE book_id = ${bookId} AND chapter = ${ch} ORDER BY verse`;
      if (rows.length) return NextResponse.json(v !== null ? mapRow(rows[0]) : rows.map(mapRow), { headers });
    } catch {}
    try {
      const rows: any[] = v !== null ? await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM verse_prayers WHERE book_id = ${bookId} AND chapter = ${ch} AND verse = ${v} ORDER BY verse` : await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM verse_prayers WHERE book_id = ${bookId} AND chapter = ${ch} ORDER BY verse`;
      if (rows.length) return NextResponse.json(v !== null ? mapRow(rows[0]) : rows.map(mapRow), { headers });
    } catch {}
    try {
      const rows: any[] = v !== null ? await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM prayer_passages WHERE book_id = ${bookId} AND chapter = ${ch} AND verse = ${v} ORDER BY verse` : await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM prayer_passages WHERE book_id = ${bookId} AND chapter = ${ch} ORDER BY verse`;
      if (rows.length) return NextResponse.json(v !== null ? mapRow(rows[0]) : rows.map(mapRow), { headers });
    } catch {}
    return NextResponse.json(v !== null ? null : [], { headers });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Failed to fetch verse prayers' }, { status: 500, headers }); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chapter = body.chapter; const verse = body.verse;
    const en = body.enPrayer || body.en_prayer || body.pray_read_english || body.prayer_english || body.pray_read || '';
    const lu = body.luPrayer || body.lu_prayer || body.pray_read_luganda || body.prayer_luganda || '';
    // Resolve bookId from body (could be id, book_number, or name)
    let bookId: number | null = null;
    const raw = body.bookId || body.book_id || body.book_number || body.book;
    if (raw) {
      if (typeof raw === 'number' || /^\d+$/.test(String(raw))) {
        const n = parseInt(String(raw));
        try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE id = ${n} LIMIT 1`; if (rows.length) bookId = rows[0].id; } catch {}
        if (!bookId) { try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE book_number = ${n} LIMIT 1`; if (rows.length) bookId = rows[0].id; } catch {} }
      } else {
        try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE name_english = ${String(raw)} OR name_luganda = ${String(raw)} LIMIT 1`; if (rows.length) bookId = rows[0].id; } catch {}
      }
    }
    if (!bookId || !chapter || !verse) return NextResponse.json({ error: 'Missing bookId/chapter/verse' }, { status: 400, headers });
    await sql`INSERT INTO verse_pray_read (book_id, chapter, verse, pray_read_english, pray_read_luganda) VALUES (${bookId}, ${chapter}, ${verse}, ${en}, ${lu}) ON CONFLICT (book_id, chapter, verse) DO UPDATE SET pray_read_english = EXCLUDED.pray_read_english, pray_read_luganda = EXCLUDED.pray_read_luganda, updated_at = NOW()`;
    return NextResponse.json({ success: true, prayer: mapRow({ book_id: bookId, chapter, verse, pray_read_english: en, pray_read_luganda: lu }) }, { headers });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Failed to save' }, { status: 500, headers }); }
}
export async function PUT(request: NextRequest) { return POST(request); }
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = await resolveBookId(searchParams);
    const chapter = searchParams.get('chapter'); const verse = searchParams.get('verse');
    if (!bookId || !chapter || !verse) return NextResponse.json({ error: 'Missing params' }, { status: 400, headers });
    await sql`DELETE FROM verse_pray_read WHERE book_id = ${bookId} AND chapter = ${parseInt(chapter)} AND verse = ${parseInt(verse)}`;
    return NextResponse.json({ success: true }, { headers });
  } catch (e) { return NextResponse.json({ error: 'Failed to delete' }, { status: 500, headers }); }
}
