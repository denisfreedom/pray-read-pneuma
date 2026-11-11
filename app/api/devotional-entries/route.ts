import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db'; // <-- keep YOUR existing db helper import.

// app/api/devotional-entries/route.ts
// GET  /api/devotional-entries              → list, ordered by devotional_number
// POST /api/devotional-entries              → create ONE (manual form)
// PUT  /api/devotional-entries              → update ONE  (body includes id)
// DELETE /api/devotional-entries?id=123     → delete ONE
// All writes use devotional_number, NOT scheduled_date.

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM devotional_entries ORDER BY devotional_number ASC`;
    return NextResponse.json(rows);
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'Failed to load.' }, { status: 500 }); }
}

function clean(body: any) {
  const num = String(body.devotional_number || '').padStart(3, '0');
  if (!/^\d{3}$/.test(num)) throw new Error('devotional_number must be 3 digits, e.g. 001.');
  if (!String(body.title || '').trim()) throw new Error('Title is required.');
  if (!String(body.devotional_text || '').trim()) throw new Error('Devotional text is required.');
  if (!String(body.scripture_book || '').trim()) throw new Error('Scripture book is required.');
  const chapter = Number(body.scripture_chapter), verse = Number(body.scripture_verse);
  if (Number.isNaN(chapter) || Number.isNaN(verse)) throw new Error('Chapter / Verse must be numbers.');
  return { num, title: String(body.title).trim(), text: String(body.devotional_text), textLu: body.devotional_text_lu ? String(body.devotional_text_lu) : null, book: String(body.scripture_book).trim(), chapter, verse, quotation: body.scripture_quotation ? String(body.scripture_quotation) : null, further: body.further_readings ? String(body.further_readings) : null, author: body.author ? String(body.author) : null, cover: body.cover_photo_url ? String(body.cover_photo_url) : null, related: Array.isArray(body.related_scriptures) ? body.related_scriptures : [] };
}

export async function POST(req: NextRequest) {
  try {
    const c = clean(await req.json().catch(() => ({})));
    const dup = await sql`SELECT id FROM devotional_entries WHERE devotional_number = ${c.num} LIMIT 1`;
    if (dup.length) return NextResponse.json({ error: `Devotional #${c.num} already exists. Edit it, or use Bulk → Replace.` }, { status: 409 });
    const rows = await sql`INSERT INTO devotional_entries (devotional_number, title, devotional_text, devotional_text_lu, scripture_book, scripture_chapter, scripture_verse, scripture_quotation, related_scriptures, further_readings, author, cover_photo_url) VALUES (${c.num}, ${c.title}, ${c.text}, ${c.textLu}, ${c.book}, ${c.chapter}, ${c.verse}, ${c.quotation}, ${JSON.stringify(c.related)}::jsonb, ${c.further}, ${c.author}, ${c.cover}) RETURNING *`;
    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'Failed to save.' }, { status: 400 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    const c = clean(body);
    const rows = await sql`UPDATE devotional_entries SET devotional_number = ${c.num}, title = ${c.title}, devotional_text = ${c.text}, devotional_text_lu = ${c.textLu}, scripture_book = ${c.book}, scripture_chapter = ${c.chapter}, scripture_verse = ${c.verse}, scripture_quotation = ${c.quotation}, related_scriptures = ${JSON.stringify(c.related)}::jsonb, further_readings = ${c.further}, author = ${c.author}, cover_photo_url = ${c.cover} WHERE id = ${Number(body.id)} RETURNING *`;
    if (!rows.length) return NextResponse.json({ error: 'Devotional not found.' }, { status: 404 });
    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'Failed to update.' }, { status: 400 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    await sql`DELETE FROM devotional_entries WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'Failed to delete.' }, { status: 500 }); }
}
