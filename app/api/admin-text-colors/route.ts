import { NextRequest, NextResponse } from 'next/server';
import sql, { isDbConfigured } from '@/app/api/utils/sql';

// app/api/admin-text-colors/route.ts — FIXED
// Was: const sql = neon(process.env.DATABASE_URL!) at import time.
// That throws on import when DATABASE_URL is missing, so even a GET
// crashed the whole route. Now uses the shared @/app/api/utils/sql
// helper (lazy, never throws on import, both default + named exports).
// Also: GET returns [] instead of 500 when the table does not exist yet,
// POST validates the range + colour, DELETE validates the id.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function dbMissing() {
  return NextResponse.json(
    { error: 'DATABASE_URL is not set in Vercel. Add it in Vercel > Settings > Environment Variables, then redeploy.' },
    { status: 503 }
  );
}

function isTableMissing(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return /relation .* does not exist|table .* does not exist|42P01/i.test(msg);
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// Named admin highlight colours the reader also uses.
const NAMED_COLORS = new Set(['yellow', 'green', 'blue', 'pink', 'orange', 'purple', 'red', 'gold', 'emerald']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verseNumber = searchParams.get('verseNumber');

    if (!bookId || !chapter || !verseNumber) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    if (!isDbConfigured()) return dbMissing();

    const colors = await sql`
      SELECT * FROM admin_text_colors
      WHERE book_id = ${bookId}
      AND chapter = ${chapter}
      AND verse_number = ${verseNumber}
      ORDER BY start_offset ASC
    `;

    return NextResponse.json({ colors });
  } catch (error) {
    console.error('Error fetching admin text colors:', error);
    // Table not created yet -> reader should paint nothing, not 500.
    if (isTableMissing(error)) return NextResponse.json({ colors: [] });
    return NextResponse.json({ error: 'Failed to fetch colors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookId, chapter, verseNumber, startOffset, endOffset, color, textContent } = await request.json();

    if (!bookId || !chapter || !verseNumber || startOffset === undefined || endOffset === undefined || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = Number(startOffset);
    const end = Number(endOffset);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      return NextResponse.json({ error: 'Invalid range: endOffset must be greater than startOffset, both >= 0' }, { status: 400 });
    }
    if (!HEX_COLOR.test(String(color)) && !NAMED_COLORS.has(String(color).toLowerCase())) {
      return NextResponse.json({ error: 'Invalid color: use a hex colour like #e9c981 or a named colour' }, { status: 400 });
    }
    if (!isDbConfigured()) return dbMissing();

    // Delete existing color for this exact range
    await sql`
      DELETE FROM admin_text_colors
      WHERE book_id = ${bookId}
      AND chapter = ${chapter}
      AND verse_number = ${verseNumber}
      AND start_offset = ${start}
      AND end_offset = ${end}
    `;

    // Insert new color
    const result = await sql`
      INSERT INTO admin_text_colors (book_id, chapter, verse_number, start_offset, end_offset, color, text_content)
      VALUES (${bookId}, ${chapter}, ${verseNumber}, ${start}, ${end}, ${color}, ${textContent ?? null})
      RETURNING *
    `;

    return NextResponse.json({ success: true, color: result[0] });
  } catch (error) {
    console.error('Error saving admin text color:', error);
    if (isTableMissing(error)) {
      return NextResponse.json(
        { error: 'admin_text_colors table does not exist yet in Neon. Create it, then try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to save color' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing color ID' }, { status: 400 });
    }
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid color ID' }, { status: 400 });
    }
    if (!isDbConfigured()) return dbMissing();

    await sql`DELETE FROM admin_text_colors WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin text color:', error);
    if (isTableMissing(error)) {
      return NextResponse.json(
        { error: 'admin_text_colors table does not exist yet in Neon. Create it, then try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to delete color' }, { status: 500 });
  }
}
