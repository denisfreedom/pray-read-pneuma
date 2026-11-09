import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };
function mapRow(r: any) {
  if (!r) return null;
  const en = r.pray_read_english ?? r.en_prayer ?? r.prayer_english ?? r.pray_read ?? null;
  const lu = r.pray_read_luganda ?? r.lu_prayer ?? r.prayer_luganda ?? null;
  return { ...r, en_prayer: en, lu_prayer: lu, pray_read_english: en, pray_read_luganda: lu, prayer_english: en, prayer_luganda: lu };
}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookNumber = searchParams.get('book_number') || searchParams.get('bookNumber');
    const bookIdParam = searchParams.get('bookId') || searchParams.get('book_id');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    let bookId: number | null = bookIdParam ? parseInt(bookIdParam) : null;
    if (!bookId && bookNumber) {
      try { const rows: any[] = await sql`SELECT id FROM bible_books WHERE book_number = ${parseInt(bookNumber)} LIMIT 1`; if (rows.length) bookId = rows[0].id; } catch {}
    }
    if (!bookId || !chapter) return NextResponse.json([], { headers });
    const ch = parseInt(chapter);
    const v = verse ? parseInt(verse) : null;
    // NEW FIRST: verse_pray_read (Bulk Import home)
    try {
      const rows: any[] = v !== null
        ? await sql`SELECT book_id, chapter, verse, pray_read_english, pray_read_luganda FROM verse_pray_read WHERE book_id = ${bookId} AND chapter = ${ch} AND verse = ${v} ORDER BY verse`
        : await sql`SELECT book_id, chapter, verse, pray_read_english, pray_read_luganda FROM verse_pray_read WHERE book_id = ${bookId} AND chapter = ${ch} ORDER BY verse`;
      if (rows.length) return NextResponse.json(v !== null ? mapRow(rows[0]) : rows.map(mapRow), { headers });
    } catch {}
    // FALLBACK OLD tables
    try { const rows: any[] = v !== null ? await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM verse_prayers WHERE book_id = ${bookId} AND chapter = ${ch} AND verse = ${v} ORDER BY verse` : await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM verse_prayers WHERE book_id = ${bookId} AND chapter = ${ch} ORDER BY verse`; if (rows.length) return NextResponse.json(v !== null ? mapRow(rows[0]) : rows.map(mapRow), { headers }); } catch {}
    try { const rows: any[] = v !== null ? await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM prayer_passages WHERE book_id = ${bookId} AND chapter = ${ch} AND verse = ${v} ORDER BY verse` : await sql`SELECT book_id, chapter, verse, en_prayer, lu_prayer FROM prayer_passages WHERE book_id = ${bookId} AND chapter = ${ch} ORDER BY verse`; if (rows.length) return NextResponse.json(v !== null ? mapRow(rows[0]) : rows.map(mapRow), { headers }); } catch {}
    return NextResponse.json(v !== null ? null : [], { headers });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Failed to fetch verse prayers' }, { status: 500, headers }); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookId = body.bookId || body.book_id;
    const chapter = body.chapter; const verse = body.verse;
    const en = body.enPrayer || body.en_prayer || body.pray_read_english || body.prayer_english || '';
    const lu = body.luPrayer || body.lu_prayer || body.pray_read_luganda || body.prayer_luganda || '';
    if (!bookId || !chapter || !verse) return NextResponse.json({ error: 'Missing bookId/chapter/verse' }, { status: 400, headers });
    await sql`INSERT INTO verse_pray_read (book_id, chapter, verse, pray_read_english, pray_read_luganda) VALUES (${bookId}, ${chapter}, ${verse}, ${en}, ${lu}) ON CONFLICT (book_id, chapter, verse) DO UPDATE SET pray_read_english = EXCLUDED.pray_read_english, pray_read_luganda = EXCLUDED.pray_read_luganda, updated_at = NOW()`;
    return NextResponse.json({ success: true, prayer: mapRow({ book_id: bookId, chapter, verse, pray_read_english: en, pray_read_luganda: lu }) }, { headers });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Failed to save' }, { status: 500, headers }); }
}
export async function PUT(request: NextRequest) { return POST(request); }
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId'); const chapter = searchParams.get('chapter'); const verse = searchParams.get('verse');
    if (!bookId || !chapter || !verse) return NextResponse.json({ error: 'Missing params' }, { status: 400, headers });
    await sql`DELETE FROM verse_pray_read WHERE book_id = ${parseInt(bookId)} AND chapter = ${parseInt(chapter)} AND verse = ${parseInt(verse)}`;
    return NextResponse.json({ success: true }, { headers });
  } catch (e) { return NextResponse.json({ error: 'Failed to delete' }, { status: 500, headers }); }
}
