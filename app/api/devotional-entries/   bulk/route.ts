import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// app/api/devotional-entries/bulk/route.ts — FIXED v3 (same fixes as single route)
//  1) Removed "::jsonb" casts — runtime syntax error in @neondatabase/serverless v1.
//  2) DATABASE_URL fallback: DATABASE_URL → POSTGRES_URL → NEON_DATABASE_URL → UNPOOLED.
//  3) Clear "table does not exist" error.

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || '';
  if (!url) throw new Error('No database URL found in env.');
  return neon(url);
}
function isMissingTable(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('does not exist') && msg.includes('devotional_entries');
}
function isNumber(s: any) { return typeof s === 'string' && /^\d{3}$/.test(s); }

export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'replace' ? 'replace' : 'skip';
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!entries.length) return NextResponse.json({ success: false, error: 'entries must be a non-empty array.' }, { status: 400 });
    if (entries.length > 400) return NextResponse.json({ success: false, error: 'Max 400 entries per import. Split into two files.' }, { status: 400 });
    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < entries.length; i++) {
      const row = entries[i] || {};
      const num = String(row.devotional_number || '').padStart(3, '0');
      const label = `Entry ${i + 1} (#${num})`;
      if (!isNumber(num)) { errors.push(`${label}: bad devotional_number — use "001", "002", etc.`); continue; }
      if (seen.has(num)) { errors.push(`${label}: duplicate number ${num} inside this file.`); continue; }
      seen.add(num);
      if (!String(row.title || '').trim()) { errors.push(`${label}: missing title.`); continue; }
      if (!String(row.devotional_text || '').trim()) { errors.push(`${label}: missing devotional_text.`); continue; }
      if (!String(row.scripture_book || '').trim()) { errors.push(`${label}: missing scripture_book.`); continue; }
      const chapter = Number(row.scripture_chapter), verse = Number(row.scripture_verse);
      if (Number.isNaN(chapter) || Number.isNaN(verse)) { errors.push(`${label}: bad scripture chapter/verse.`); continue; }
      const related = Array.isArray(row.related_scriptures) ? row.related_scriptures : [];
      const title = String(row.title), text = String(row.devotional_text);
      const textLu = row.devotional_text_lu ? String(row.devotional_text_lu) : null;
      const book = String(row.scripture_book);
      const quotation = row.scripture_quotation ? String(row.scripture_quotation) : null;
      const further = row.further_readings ? String(row.further_readings) : null;
      const author = row.author ? String(row.author) : null;
      const cover = row.cover_photo_url ? String(row.cover_photo_url) : null;
      try {
        const existing = await sql`SELECT id FROM devotional_entries WHERE devotional_number = ${num} LIMIT 1`;
        if ((existing as any[]).length) {
          if (mode === 'skip') { skipped++; continue; }
          await sql`
            UPDATE devotional_entries SET
              title = ${title}, devotional_text = ${text}, devotional_text_lu = ${textLu},
              scripture_book = ${book}, scripture_chapter = ${chapter}, scripture_verse = ${verse},
              scripture_quotation = ${quotation},
              related_scriptures = ${JSON.stringify(related)},
              further_readings = ${further}, author = ${author}, cover_photo_url = ${cover}
            WHERE id = ${(existing as any[])[0].id}`;
          updated++;
        } else {
          await sql`
            INSERT INTO devotional_entries
              (devotional_number, title, devotional_text, devotional_text_lu, scripture_book, scripture_chapter, scripture_verse, scripture_quotation, related_scriptures, further_readings, author, cover_photo_url)
            VALUES
              (${num}, ${title}, ${text}, ${textLu}, ${book}, ${chapter}, ${verse}, ${quotation}, ${JSON.stringify(related)}, ${further}, ${author}, ${cover})`;
          inserted++;
        }
      } catch (e: any) {
        if (isMissingTable(e)) return NextResponse.json({ success: false, error: 'Table devotional_entries does not exist yet. Run the CREATE TABLE SQL in Neon SQL Editor, then try again.' }, { status: 500 });
        errors.push(`${label}: ${e?.message || 'database error'}`);
      }
    }
    return NextResponse.json({ success: true, inserted, updated, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Bulk import failed.' }, { status: 500 });
  }
}
