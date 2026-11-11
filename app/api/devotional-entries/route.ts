import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// app/api/devotional-entries/route.ts — FIXED v3
// Fixes vs the version you just pasted:
//  1) REMOVED "::jsonb" casts — they cause a runtime syntax error in
//     @neondatabase/serverless v1. Postgres casts a JSON string to jsonb
//     automatically on INSERT/UPDATE, so no cast is needed.
//  2) DATABASE_URL fallback — tries DATABASE_URL, then POSTGRES_URL,
//     then NEON_DATABASE_URL, then DATABASE_URL_UNPOOLED. Your Bible routes
//     work, so ONE of these exists — this file now finds it instead of
//     failing with neon('').
//  3) Clear error when the table does not exist yet, so the admin does not
//     show a cryptic 500: "Table devotional_entries does not exist — run the
//     CREATE SQL in Neon."

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
  if (!url) throw new Error('No database URL found in env (checked DATABASE_URL, POSTGRES_URL, NEON_DATABASE_URL).');
  return neon(url);
}

function isMissingTable(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('does not exist') && msg.includes('devotional_entries');
}
function tableMissingResponse() {
  return NextResponse.json(
    { error: 'Table devotional_entries does not exist yet. Run the CREATE TABLE SQL in Neon SQL Editor, then try again.' },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const sql = getSql();
    try {
      const rows = await sql`SELECT * FROM devotional_entries ORDER BY devotional_number ASC, id ASC`;
      return NextResponse.json(rows);
    } catch {
      const rows = await sql`SELECT * FROM devotional_entries ORDER BY id ASC`;
      return NextResponse.json(rows);
    }
  } catch (e: unknown) {
    if (isMissingTable(e)) return tableMissingResponse();
    const msg = e instanceof Error ? e.message : 'Failed to load.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function clean(body: any) {
  const num = String(body.devotional_number || '').padStart(3, '0');
  if (!/^\d{3}$/.test(num)) throw new Error('devotional_number must be 3 digits, e.g. 001.');
  if (!String(body.title || '').trim()) throw new Error('Title is required.');
  if (!String(body.devotional_text || '').trim()) throw new Error('Devotional text is required.');
  if (!String(body.scripture_book || '').trim()) throw new Error('Scripture book is required.');
  const chapter = Number(body.scripture_chapter);
  const verse = Number(body.scripture_verse);
  if (Number.isNaN(chapter) || Number.isNaN(verse)) throw new Error('Chapter / Verse must be numbers.');
  return {
    num, title: String(body.title).trim(), text: String(body.devotional_text),
    textLu: body.devotional_text_lu ? String(body.devotional_text_lu) : null,
    book: String(body.scripture_book).trim(), chapter, verse,
    quotation: body.scripture_quotation ? String(body.scripture_quotation) : null,
    further: body.further_readings ? String(body.further_readings) : null,
    author: body.author ? String(body.author) : null,
    cover: body.cover_photo_url ? String(body.cover_photo_url) : null,
    related: Array.isArray(body.related_scriptures) ? body.related_scriptures : [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const c = clean(await req.json().catch(() => ({})));
    const dup = await sql`SELECT id FROM devotional_entries WHERE devotional_number = ${c.num} LIMIT 1`;
    if ((dup as any[]).length) {
      return NextResponse.json({ error: `Devotional #${c.num} already exists. Edit it, or use Bulk → Replace.` }, { status: 409 });
    }
    // NOTE: no ::jsonb cast — Postgres casts the JSON string automatically.
    const rows = await sql`
      INSERT INTO devotional_entries
        (devotional_number, title, devotional_text, devotional_text_lu, scripture_book, scripture_chapter, scripture_verse, scripture_quotation, related_scriptures, further_readings, author, cover_photo_url)
      VALUES
        (${c.num}, ${c.title}, ${c.text}, ${c.textLu}, ${c.book}, ${c.chapter}, ${c.verse}, ${c.quotation}, ${JSON.stringify(c.related)}, ${c.further}, ${c.author}, ${c.cover})
      RETURNING *`;
    return NextResponse.json({ success: true, entry: (rows as any[])[0] ?? null });
  } catch (e: unknown) {
    if (isMissingTable(e)) return tableMissingResponse();
    const msg = e instanceof Error ? e.message : 'Failed to save.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sql = getSql();
    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    const c = clean(body);
    const rows = await sql`
      UPDATE devotional_entries SET
        devotional_number = ${c.num}, title = ${c.title}, devotional_text = ${c.text},
        devotional_text_lu = ${c.textLu}, scripture_book = ${c.book},
        scripture_chapter = ${c.chapter}, scripture_verse = ${c.verse},
        scripture_quotation = ${c.quotation},
        related_scriptures = ${JSON.stringify(c.related)},
        further_readings = ${c.further}, author = ${c.author}, cover_photo_url = ${c.cover}
      WHERE id = ${Number(body.id)} RETURNING *`;
    if (!(rows as any[]).length) return NextResponse.json({ error: 'Devotional not found.' }, { status: 404 });
    return NextResponse.json({ success: true, entry: (rows as any[])[0] });
  } catch (e: unknown) {
    if (isMissingTable(e)) return tableMissingResponse();
    const msg = e instanceof Error ? e.message : 'Failed to update.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sql = getSql();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    await sql`DELETE FROM devotional_entries WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (isMissingTable(e)) return tableMissingResponse();
    const msg = e instanceof Error ? e.message : 'Failed to delete.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
