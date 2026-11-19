import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

// Verse-Song Series API — FIXED
// Why Save Series failed:
//  1) The route never created the table. If verse_song_series did not exist,
//     every save died with a 500. It now CREATEs it on first save, like the
//     outlines route does.
//  2) PUT sets updated_at — if the table already existed WITHOUT that
//     column, every edit 500d. Setup now adds any missing column.
//  3) POST/PUT only accepted one key name per field (title, thumbnail...).
//     The Admin form's keys may differ (series_title, thumbnail_url, ...),
//     which made the save see `undefined` and answer 400 "Title is required".
//     Every field now accepts all its alias keys.
//  4) is_featured is normalised from true / "true" / 1 / "1" — a string
//     "false" from a form is now correctly false, not truthy.
// Same table, same columns, same return shapes. Nothing else changed.
//
// CORRECT PATH: paste over the existing series route at the SAME path it
// already lives in (app/api/verse-song-series/route.ts or wherever it is).
// Do NOT move it to a new path — the Admin panel calls the existing one.
// Note: this file is the SERIES route (Save Series). Songs inside a series
// are a different route — if saving a song fails, paste that route next.
const DEFAULT_SERIES_THUMBNAIL = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/series-default-thumbnail-red_png.jpeg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

function firstText(...vals: any[]): string {
  for (const v of vals) if (typeof v === 'string' && v.trim()) return v;
  return '';
}

function asText(v: any): string | null {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return null;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function asBool(v: any): boolean {
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
  return false;
}

function asOrder(v: any): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? 0 : n;
}

function pick(body: any) {
  return {
    title: firstText(body.title, body.series_title, body.seriesTitle, body.name, body.series_name, body.seriesName),
    description: asText(body.description ?? body.series_description ?? body.seriesDescription ?? body.desc ?? body.about ?? null),
    thumbnail: firstText(body.thumbnail, body.thumbnail_url, body.thumbnailUrl, body.image, body.image_url, body.imageUrl, body.cover, body.cover_url, body.coverUrl),
    is_featured: asBool(body.is_featured ?? body.isFeatured ?? body.featured ?? body.is_featured_series),
    display_order: asOrder(body.display_order ?? body.displayOrder ?? body.order ?? body.order_index ?? body.orderIndex ?? body.display_order_index),
  };
}

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS verse_song_series (id SERIAL PRIMARY KEY, title TEXT, description TEXT, thumbnail TEXT, is_featured BOOLEAN DEFAULT false, display_order INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  // If the table already existed with fewer columns, add the missing ones —
  // otherwise INSERT/UPDATE on the missing column still 500s.
  await sql`ALTER TABLE verse_song_series ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE verse_song_series ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE verse_song_series ADD COLUMN IF NOT EXISTS thumbnail TEXT`;
  await sql`ALTER TABLE verse_song_series ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE verse_song_series ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0`;
  await sql`ALTER TABLE verse_song_series ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE verse_song_series ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`CREATE INDEX IF NOT EXISTS verse_song_series_featured_idx ON verse_song_series (is_featured)`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const featured = searchParams.get('featured');

    let series;

    if (id) {
      series = await sql`SELECT * FROM verse_song_series WHERE id = ${parseInt(id)} ORDER BY display_order ASC, created_at DESC`;
    } else if (featured === 'true') {
      series = await sql`SELECT * FROM verse_song_series WHERE is_featured = true ORDER BY display_order ASC, created_at DESC`;
    } else {
      series = await sql`SELECT * FROM verse_song_series ORDER BY display_order ASC, created_at DESC`;
    }

    return NextResponse.json(series, { headers });
  } catch (error) {
    console.error('Error fetching verse song series:', error);
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, thumbnail, is_featured, display_order } = pick(body);

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400, headers });
    }

    await ensureTable();
    const result = await sql`
      INSERT INTO verse_song_series (title, description, thumbnail, is_featured, display_order)
      VALUES (${title}, ${description}, ${thumbnail || DEFAULT_SERIES_THUMBNAIL}, ${is_featured}, ${display_order})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201, headers });
  } catch (error) {
    console.error('Error creating verse song series:', error);
    return NextResponse.json({ error: 'Failed to create series' }, { status: 500, headers });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = body.id ?? body.series_id ?? body.seriesId ?? searchParams.get('id');
    const { title, description, thumbnail, is_featured, display_order } = pick(body);

    if (!id || !title) {
      return NextResponse.json({ error: 'ID and title are required' }, { status: 400, headers });
    }

    await ensureTable();
    const result = await sql`
      UPDATE verse_song_series
      SET title = ${title},
          description = ${description},
          thumbnail = ${thumbnail || DEFAULT_SERIES_THUMBNAIL},
          is_featured = ${is_featured},
          display_order = ${display_order},
          updated_at = NOW()
      WHERE id = ${parseInt(String(id), 10)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404, headers });
    }

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error updating verse song series:', error);
    return NextResponse.json({ error: 'Failed to update series' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await request.json();
        id = body.id ?? body.series_id ?? body.seriesId ?? null;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400, headers });
    }

    const result = await sql`
      DELETE FROM verse_song_series
      WHERE id = ${parseInt(String(id), 10)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404, headers });
    }

    return NextResponse.json({ message: 'Series deleted successfully' }, { headers });
  } catch (error) {
    console.error('Error deleting verse song series:', error);
    return NextResponse.json({ error: 'Failed to delete series' }, { status: 500, headers });
  }
}
