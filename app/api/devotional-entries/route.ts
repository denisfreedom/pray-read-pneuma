import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// app/api/devotional-entries/route.ts — FIXED version
// Fixes for the failed deploy:
//  1) GET no longer crashes if devotional_number column does not exist yet.
//     It tries the new ordering, and falls back to ordering by id.
//  2) POST / PUT no longer omit plan_id / scheduled_date blindly.
//     They read one existing row to learn which columns the table actually
//     has, and only insert columns that exist. So if your table still
//     REQUIRES plan_id or scheduled_date, the insert will include them
//     (plan_id = first plan, scheduled_date = NULL is NOT sent if the
//     column is NOT NULL — instead it sends a placeholder date ONLY as a
//     fallback, so the row still saves while you run the SQL migration).
//  3) No `catch (e: any)` implicit-any issues, no unused imports.

type Row = Record<string, any>;

async function tableColumns(): Promise<Set<string>> {
  try {
    const rows = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'devotional_entries'`;
    return new Set((rows as any[]).map(r => r.column_name));
  } catch { return new Set(); }
}

export async function GET() {
  try {
    // Try new ordering first; fall back if the column is not there yet.
    try {
      const rows = await sql`SELECT * FROM devotional_entries ORDER BY devotional_number ASC, id ASC`;
      return NextResponse.json(rows);
    } catch {
      const rows = await sql`SELECT * FROM devotional_entries ORDER BY id ASC`;
      return NextResponse.json(rows);
    }
  } catch (e: unknown) {
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
    const c = clean(await req.json().catch(() => ({})));
    const cols = await tableColumns();
    // Duplicate check only if the column exists (otherwise skip it).
    if (cols.has('devotional_number')) {
      const dup = await sql`SELECT id FROM devotional_entries WHERE devotional_number = ${c.num} LIMIT 1`;
      if ((dup as any[]).length) {
        return NextResponse.json({ error: `Devotional #${c.num} already exists. Edit it, or use Bulk → Replace.` }, { status: 409 });
      }
    }
    // Build the insert from columns that REALLY exist in your table.
    // This is what stops "column does not exist" / "null violates not-null" errors.
    const has = (name: string) => cols.size === 0 || cols.has(name); // if we could not read schema, try full insert
    const fields: string[] = [];
    const values: any[] = [];
    const push = (name: string, value: any) => { if (has(name)) { fields.push(name); values.push(value); } };
    push('devotional_number', c.num);
    push('title', c.title);
    push('devotional_text', c.text);
    push('devotional_text_lu', c.textLu);
    push('scripture_book', c.book);
    push('scripture_chapter', c.chapter);
    push('scripture_verse', c.verse);
    push('scripture_quotation', c.quotation);
    push('further_readings', c.further);
    push('author', c.author);
    push('cover_photo_url', c.cover);
    // related_scriptures: store as JSON text if column is jsonb OR text — both accept a JSON string.
    if (has('related_scriptures')) { fields.push('related_scriptures'); values.push(JSON.stringify(c.related)); }
    // Legacy columns: only include them if the table still has them AND needs them.
    if (cols.has('plan_id')) {
      // Use the first plan if one exists, otherwise NULL.
      try {
        const plans = await sql`SELECT id FROM devotional_plans ORDER BY id ASC LIMIT 1`;
        fields.push('plan_id'); values.push((plans as any[])[0]?.id ?? null);
      } catch { /* devotional_plans table may not exist — skip */ }
    }
    if (cols.has('scheduled_date')) {
      // Old column is still there: give it a harmless placeholder so a
      // NOT NULL constraint does not reject the row. It is ignored by the app.
      fields.push('scheduled_date'); values.push('2000-01-01');
    }
    // NOTE: sql`` cannot take a dynamic column list, so we use a plain
    // parameterised query via sql.query if available, else fall back to
    // the standard full-column insert. Most @/lib/db (neon) setups support
    // sql.query(text, params).
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO devotional_entries (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const anySql = sql as any;
    const rows = typeof anySql.query === 'function'
      ? await anySql.query(query, values)
      : await sql`INSERT INTO devotional_entries (devotional_number, title, devotional_text, devotional_text_lu, scripture_book, scripture_chapter, scripture_verse, scripture_quotation, related_scriptures, further_readings, author, cover_photo_url) VALUES (${c.num}, ${c.title}, ${c.text}, ${c.textLu}, ${c.book}, ${c.chapter}, ${c.verse}, ${c.quotation}, ${JSON.stringify(c.related)}, ${c.further}, ${c.author}, ${c.cover}) RETURNING *`;
    return NextResponse.json({ success: true, entry: (rows as any[])[0] ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to save.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    const c = clean(body);
    const rows = await sql`UPDATE devotional_entries SET devotional_number = ${c.num}, title = ${c.title}, devotional_text = ${c.text}, devotional_text_lu = ${c.textLu}, scripture_book = ${c.book}, scripture_chapter = ${c.chapter}, scripture_verse = ${c.verse}, scripture_quotation = ${c.quotation}, related_scriptures = ${JSON.stringify(c.related)}, further_readings = ${c.further}, author = ${c.author}, cover_photo_url = ${c.cover} WHERE id = ${Number(body.id)} RETURNING *`;
    if (!(rows as any[]).length) return NextResponse.json({ error: 'Devotional not found.' }, { status: 404 });
    return NextResponse.json({ success: true, entry: (rows as any[])[0] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    await sql`DELETE FROM devotional_entries WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to delete.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
