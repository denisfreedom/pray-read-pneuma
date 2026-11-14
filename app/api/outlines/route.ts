import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

// Outline (Book Outline Management) API — FIXED
// Why Save Outline failed:
//  1) The route never created the table. If bible_outlines did not exist,
//     every save died with a 500. It now CREATEs it on first save, like the
//     verse-commentaries route does.
//  2) POST only accepted `book_id`. If the Admin form sends bookId,
//     book_number, or the book NAME ("Genesis"), it got 400 "book_id
//     required" — or a name into an INT column, which 500s. Now every book
//     key is accepted and resolved to the numeric book_id via bible_books.
//  3) Title / content / order keys are aliased too (title / outline_title,
//     content / outline_content / body, order_index / display_order).
//  4) Language is normalised to lowercase ("English" -> "english") so the
//     GET filter and the saved row always agree.
// Same table, same columns, same return shapes. Nothing else changed.
//
// CORRECT PATH: paste over the existing outlines route at the SAME path it
// already lives in (app/api/outlines/route.ts or app/api/bible-outlines/).
// Do NOT move it to a new path — the Admin panel calls the existing one.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// Resolve whatever book identifier a caller sent into the numeric book_id
// stored in bible_outlines. Accepts: a bible_books id, a book_number (1-66),
// or a book name. Falls back to the raw number when bible_books has no match.
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

function firstText(...vals: any[]): string {
  for (const v of vals) if (typeof v === 'string' && v.trim()) return v;
  return '';
}

function asText(v: any): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  try { return JSON.stringify(v); } catch { return String(v); }
}

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS bible_outlines (id SERIAL PRIMARY KEY, book_id INT NOT NULL, chapter INT, title TEXT, content TEXT, language TEXT DEFAULT 'english', order_index INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  // If the table already existed with fewer columns, add the missing ones —
  // otherwise INSERT/UPDATE on the missing column still 500s.
  await sql`ALTER TABLE bible_outlines ADD COLUMN IF NOT EXISTS chapter INT`;
  await sql`ALTER TABLE bible_outlines ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE bible_outlines ADD COLUMN IF NOT EXISTS content TEXT`;
  await sql`ALTER TABLE bible_outlines ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'english'`;
  await sql`ALTER TABLE bible_outlines ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0`;
  await sql`ALTER TABLE bible_outlines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE bible_outlines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`CREATE INDEX IF NOT EXISTS bible_outlines_book_chapter_idx ON bible_outlines (book_id, chapter)`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookRaw = searchParams.get("book_id") ?? searchParams.get("bookId") ?? searchParams.get("book_number") ?? searchParams.get("book");
    const chapter = searchParams.get("chapter");
    const language = (searchParams.get("language") || searchParams.get("lang") || "english").toLowerCase();
    const bookId = await resolveBookId(bookRaw);

    if (!bookId) {
      return NextResponse.json(
        { success: false, message: "book_id is required" },
        { status: 400, headers }
      );
    }

    let outlines;
    if (chapter) {
      // Get chapter-specific outlines
      outlines = await sql`
        SELECT * FROM bible_outlines
        WHERE book_id = ${bookId}
        AND chapter = ${chapter}
        AND (language = ${language} OR language IS NULL)
        ORDER BY order_index ASC, id ASC
      `;
    } else {
      // Get all outlines for the book
      outlines = await sql`
        SELECT * FROM bible_outlines
        WHERE book_id = ${bookId}
        AND (language = ${language} OR language IS NULL)
        ORDER BY chapter ASC, order_index ASC, id ASC
      `;
    }

    return NextResponse.json(outlines, { headers });
  } catch (error) {
    console.error("Error fetching outlines:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch outlines" },
      { status: 500, headers }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookRaw = body.book_id ?? body.bookId ?? body.book_number ?? body.book;
    const chapter = body.chapter;
    const title = firstText(body.title, body.outline_title, body.outlineTitle, body.name);
    const content = asText(body.content ?? body.outline_content ?? body.outlineContent ?? body.body ?? body.text ?? body.html);
    const language = String(body.language ?? body.lang ?? 'english').toLowerCase();
    const orderRaw = body.order_index ?? body.orderIndex ?? body.display_order ?? body.displayOrder ?? body.order;
    const order_index = orderRaw === undefined || orderRaw === null || orderRaw === '' ? 0 : parseInt(String(orderRaw), 10) || 0;
    const book_id = await resolveBookId(bookRaw);

    if (!book_id || !title || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "book_id, title, and content are required" },
        { status: 400, headers }
      );
    }

    await ensureTable();
    const result = await sql`
      INSERT INTO bible_outlines (book_id, chapter, title, content, language, order_index, created_at)
      VALUES (
        ${book_id},
        ${chapter === undefined || chapter === null || chapter === '' ? null : parseInt(String(chapter), 10)},
        ${title},
        ${content},
        ${language},
        ${order_index},
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      outline: result[0],
    }, { headers });
  } catch (error) {
    console.error("Error creating outline:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create outline" },
      { status: 500, headers }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = body.id ?? body.outline_id ?? body.outlineId ?? searchParams.get("id");
    const title = firstText(body.title, body.outline_title, body.outlineTitle, body.name);
    const content = asText(body.content ?? body.outline_content ?? body.outlineContent ?? body.body ?? body.text ?? body.html);
    const orderRaw = body.order_index ?? body.orderIndex ?? body.display_order ?? body.displayOrder ?? body.order;
    const order_index = orderRaw === undefined || orderRaw === null || orderRaw === '' ? 0 : parseInt(String(orderRaw), 10) || 0;

    if (!id || !title || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "id, title, and content are required" },
        { status: 400, headers }
      );
    }

    await ensureTable();
    const result = await sql`
      UPDATE bible_outlines
      SET
        title = ${title},
        content = ${content},
        order_index = ${order_index},
        updated_at = NOW()
      WHERE id = ${parseInt(String(id), 10)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "Outline not found" },
        { status: 404, headers }
      );
    }

    return NextResponse.json({
      success: true,
      outline: result[0],
    }, { headers });
  } catch (error) {
    console.error("Error updating outline:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update outline" },
      { status: 500, headers }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await request.json();
        id = body.id ?? body.outline_id ?? body.outlineId ?? null;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "id is required" },
        { status: 400, headers }
      );
    }

    await sql`DELETE FROM bible_outlines WHERE id = ${parseInt(String(id), 10)}`;

    return NextResponse.json({
      success: true,
      message: "Outline deleted successfully",
    }, { headers });
  } catch (error) {
    console.error("Error deleting outline:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete outline" },
      { status: 500, headers }
    );
  }
}
