import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// app/api/verse-songs/route.ts — FIXED (songs, not series)
// The GET fixes from before are kept (no likes/favorites subqueries, NULL
// is_published counts as published, limit 100 / ?limit=all, recentlyAdded).
// WHAT WAS STILL BROKEN — the save paths:
//  1) POST never created the table. If verse_songs did not exist, every
//     save died with a 500. It now CREATEs it (and the series table the GET
//     LEFT JOINs) on first use.
//  2) PUT sets updated_at — if the table existed WITHOUT that column,
//     every edit 500d. Setup now adds any missing column.
//  3) POST only accepted series_id / title / mp3_url. If the Admin form
//     sends seriesId / series (name) / song_title / audio_url, it got 400.
//     Every field now accepts all its alias keys.
//  4) parseInt(series_id) on a series NAME gave NaN -> INSERT 500. A series
//     name is now resolved to its id through verse_song_series.
//  5) Duration "3:45" into an INT column 500d. m:ss / h:mm:ss is now
//     converted to seconds.
//  6) PUT could wipe a title with an empty string (COALESCE('', title) = '').
//     Empty title / mp3_url now mean "keep the old value".
// Same tables, same columns, same GET return shape. Nothing else changed.

const DEFAULT_THUMBNAIL = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/verse-song-default-thumbnail_png.jpeg';

function parseLimit(raw: string | null): number | null {
  if (raw === 'all') return null;
  const n = parseInt(raw || '100', 10);
  if (isNaN(n) || n <= 0) return 100;
  return Math.min(n, 500);
}

function firstText(...vals: any[]): string {
  for (const v of vals) if (typeof v === 'string' && v.trim()) return v;
  return '';
}

function asText(v: any): string | null {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return null;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function asBool(v: any, fallback = true): boolean {
  if (v === undefined || v === null) return fallback;
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
  return Boolean(v);
}

// Duration: "3:45" or "1:02:30" -> seconds; numeric string -> number;
// anything else (e.g. "3 min") is passed through for TEXT columns.
function normDuration(v: any): any {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const m = s.match(/^(?:(\d+):)?(\d+):(\d{2})$/);
  if (m) return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? s : n;
}

// Resolve a series identifier — numeric id, or the series TITLE — to its id.
async function resolveSeriesId(raw: any): Promise<number | null> {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isNaN(n) && String(n) === String(raw).trim()) {
    try {
      const r: any[] = await sql`SELECT id FROM verse_song_series WHERE id = ${n} LIMIT 1`;
      if (r[0]?.id) return Number(r[0].id);
    } catch {}
    return n;
  }
  try {
    const r: any[] = await sql`SELECT id FROM verse_song_series WHERE LOWER(title) = ${String(raw).toLowerCase()} LIMIT 1`;
    if (r[0]?.id) return Number(r[0].id);
  } catch {}
  return null;
}

function pickSong(body: any) {
  return {
    title: firstText(body.title, body.song_title, body.songTitle, body.name, body.song_name, body.songName),
    description: asText(body.description ?? body.desc ?? body.about ?? null),
    mp3_url: firstText(body.mp3_url, body.mp3Url, body.mp3, body.audio_url, body.audioUrl, body.audio, body.file_url, body.fileUrl, body.song_url, body.songUrl, body.url),
    thumbnail: firstText(body.thumbnail, body.thumbnail_url, body.thumbnailUrl, body.image, body.image_url, body.imageUrl, body.cover, body.cover_url, body.coverUrl),
    duration: normDuration(body.duration ?? body.length ?? body.duration_seconds),
    is_published: asBool(body.is_published ?? body.isPublished ?? body.published, true),
  };
}

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS verse_song_series (id SERIAL PRIMARY KEY, title TEXT, description TEXT, thumbnail TEXT, is_featured BOOLEAN DEFAULT false, display_order INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS verse_songs (id SERIAL PRIMARY KEY, series_id INT, title TEXT, description TEXT, mp3_url TEXT, thumbnail TEXT, duration TEXT, is_published BOOLEAN DEFAULT true, play_count INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  // If verse_songs already existed with fewer columns, add the missing ones —
  // otherwise INSERT/UPDATE on the missing column still 500s.
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS series_id INT`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS mp3_url TEXT`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS thumbnail TEXT`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS duration TEXT`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS play_count INT DEFAULT 0`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const seriesId = searchParams.get('seriesId');
    const mostPlayed = searchParams.get('mostPlayed') === 'true';
    const recentlyAdded = searchParams.get('recentlyAdded') === 'true';
    const limit = parseLimit(searchParams.get('limit'));
    const userEmail = searchParams.get('userEmail') || '';

    // Tables must exist before the LEFT JOIN can run — create if missing.
    await ensureTables();

    // ── Main query: no likes/favorites subqueries, so a missing likes table
    //    can never take down the whole library again. ──
    const runMain = async (orderByPlayCount: boolean) => {
      const orderClause = orderByPlayCount ? 'ORDER BY COALESCE(vs.play_count, 0) DESC' : 'ORDER BY vs.created_at DESC';
      if (id) {
        const songId = parseInt(id);
        // Single song: no published filter (so an unpublished song can still be previewed)
        if (limit === null) {
          return await sql`
            SELECT vs.*, vss.title as series_title
            FROM verse_songs vs
            LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
            WHERE vs.id = ${songId}
          `;
        }
        return await sql`
          SELECT vs.*, vss.title as series_title
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE vs.id = ${songId}
          LIMIT ${limit}
        `;
      }
      if (seriesId) {
        const seriesIdInt = parseInt(seriesId);
        if (orderByPlayCount) {
          if (limit === null) {
            return await sql`
              SELECT vs.*, vss.title as series_title
              FROM verse_songs vs
              LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
              WHERE vs.series_id = ${seriesIdInt} AND COALESCE(vs.is_published, true) = true
              ORDER BY COALESCE(vs.play_count, 0) DESC
            `;
          }
          return await sql`
            SELECT vs.*, vss.title as series_title
            FROM verse_songs vs
            LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
            WHERE vs.series_id = ${seriesIdInt} AND COALESCE(vs.is_published, true) = true
            ORDER BY COALESCE(vs.play_count, 0) DESC
            LIMIT ${limit}
          `;
        }
        if (limit === null) {
          return await sql`
            SELECT vs.*, vss.title as series_title
            FROM verse_songs vs
            LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
            WHERE vs.series_id = ${seriesIdInt} AND COALESCE(vs.is_published, true) = true
            ORDER BY vs.created_at DESC
          `;
        }
        return await sql`
          SELECT vs.*, vss.title as series_title
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE vs.series_id = ${seriesIdInt} AND COALESCE(vs.is_published, true) = true
          ORDER BY vs.created_at DESC
          LIMIT ${limit}
        `;
      }
      // All songs. recentlyAdded and the default both order by newest first;
      // mostPlayed orders by play_count (with fallback below).
      if (orderByPlayCount) {
        if (limit === null) {
          return await sql`
            SELECT vs.*, vss.title as series_title
            FROM verse_songs vs
            LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
            WHERE COALESCE(vs.is_published, true) = true
            ORDER BY COALESCE(vs.play_count, 0) DESC
          `;
        }
        return await sql`
          SELECT vs.*, vss.title as series_title
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE COALESCE(vs.is_published, true) = true
          ORDER BY COALESCE(vs.play_count, 0) DESC
          LIMIT ${limit}
        `;
      }
      if (limit === null) {
        return await sql`
          SELECT vs.*, vss.title as series_title
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE COALESCE(vs.is_published, true) = true
          ORDER BY vs.created_at DESC
        `;
      }
      return await sql`
        SELECT vs.*, vss.title as series_title
        FROM verse_songs vs
        LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
        WHERE COALESCE(vs.is_published, true) = true
        ORDER BY vs.created_at DESC
        LIMIT ${limit}
      `;
    };

    let songs: any[];
    try {
      // mostPlayed (and recentlyAdded) both funnel through here; mostPlayed
      // tries play_count ordering first.
      songs = await runMain(mostPlayed);
    } catch (e) {
      // play_count column (or something else in that ordering) doesn't exist —
      // fall back to newest-first instead of 500ing the whole page.
      songs = await runMain(false);
    }

    // ── Likes / favorites: best-effort only. Missing tables -> 0, never a 500. ──
    if (userEmail && songs.length > 0) {
      const liked = new Set<number>();
      const faved = new Set<number>();
      try {
        const rows: any[] = await sql`SELECT verse_song_id FROM user_verse_song_likes WHERE user_email = ${userEmail}`;
        rows.forEach((r) => liked.add(Number(r.verse_song_id)));
      } catch { /* likes table missing — leave all 0 */ }
      try {
        const rows: any[] = await sql`SELECT verse_song_id FROM user_verse_song_favorites WHERE user_email = ${userEmail}`;
        rows.forEach((r) => faved.add(Number(r.verse_song_id)));
      } catch { /* favorites table missing — leave all 0 */ }
      songs = songs.map((s: any) => ({
        ...s,
        user_liked: liked.has(Number(s.id)) ? 1 : 0,
        user_favorited: faved.has(Number(s.id)) ? 1 : 0,
      }));
    } else {
      songs = songs.map((s: any) => ({ ...s, user_liked: s.user_liked ?? 0, user_favorited: s.user_favorited ?? 0 }));
    }

    return NextResponse.json(songs, { headers });
  } catch (error) {
    console.error('Error fetching verse songs:', error);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const seriesRaw = body.series_id ?? body.seriesId ?? body.series ?? body.series_name ?? body.seriesName;
    const series_id = await resolveSeriesId(seriesRaw);
    const { title, description, mp3_url, thumbnail, duration, is_published } = pickSong(body);

    if (!series_id || !title || !mp3_url) {
      return NextResponse.json({ error: 'Series ID, title, and MP3 URL are required' }, { status: 400, headers });
    }

    const resolvedThumbnail = thumbnail && thumbnail.trim() !== '' ? thumbnail.trim() : DEFAULT_THUMBNAIL;

    await ensureTables();
    const result = await sql`
      INSERT INTO verse_songs (series_id, title, description, mp3_url, thumbnail, duration, is_published)
      VALUES (${series_id}, ${title}, ${description}, ${mp3_url}, ${resolvedThumbnail}, ${duration}, ${is_published})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201, headers });
  } catch (error) {
    console.error('Error creating verse song:', error);
    return NextResponse.json({ error: 'Failed to create song' }, { status: 500, headers });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = body.id ?? body.song_id ?? body.songId ?? searchParams.get('id');
    const seriesRaw = body.series_id ?? body.seriesId ?? body.series ?? body.series_name ?? body.seriesName;
    const series_id = seriesRaw !== undefined && seriesRaw !== null && seriesRaw !== '' ? await resolveSeriesId(seriesRaw) : null;
    const { title, description, mp3_url, thumbnail, duration, is_published } = pickSong(body);

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400, headers });
    }

    // Partial update: COALESCE keeps the old value for any field not sent.
    // Empty title / mp3_url mean "keep the old value" — they can no longer
    // wipe the field to ''. (Empty description still clears it, on purpose.)
    const resolvedThumbnail = thumbnail && thumbnail.trim() !== '' ? thumbnail.trim() : null;

    await ensureTables();
    const result = await sql`
      UPDATE verse_songs
      SET title = COALESCE(${title || null}, title),
          series_id = COALESCE(${series_id}, series_id),
          description = COALESCE(${description}, description),
          mp3_url = COALESCE(${mp3_url || null}, mp3_url),
          thumbnail = COALESCE(${resolvedThumbnail}, thumbnail),
          duration = COALESCE(${duration}, duration),
          is_published = COALESCE(${body.is_published ?? body.isPublished ?? body.published ?? null}, is_published),
          updated_at = NOW()
      WHERE id = ${parseInt(String(id), 10)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404, headers });
    }

    return NextResponse.json(result[0], { headers });
  } catch (error) {
    console.error('Error updating verse song:', error);
    return NextResponse.json({ error: 'Failed to update song' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await request.json();
        id = body.id ?? body.song_id ?? body.songId ?? null;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400, headers });
    }

    const result = await sql`
      DELETE FROM verse_songs
      WHERE id = ${parseInt(String(id), 10)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404, headers });
    }

    return NextResponse.json({ message: 'Song deleted successfully' }, { headers });
  } catch (error) {
    console.error('Error deleting verse song:', error);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500, headers });
  }
}
