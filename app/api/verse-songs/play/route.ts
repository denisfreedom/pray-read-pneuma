import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// app/api/verse-songs/play/route.ts — FIXED V3 (DEPLOY-SAFE)
// V2 refused to deploy: it imported { isDbConfigured } from "@/app/api/utils/sql",
// but that file does NOT export isDbConfigured, so the TypeScript build failed
// with "Module has no exported member 'isDbConfigured'".
// V3: ONLY the default `sql` import, which does exist. DB check is done via
// process.env directly, no named import. Same behaviour as V2 otherwise:
// POST logs the play + increments play_count + returns the song with mp3_url
// so the player has something to play. GET returns play history.
// CORRECT PATH: app/api/verse-songs/play/route.ts — do NOT move it.

function normEmail(v: any): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

function normSongId(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function normDuration(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return Number.isNaN(v) ? null : Math.max(0, Math.floor(v));
  const s = String(v).trim();
  const m = s.match(/^(?:(\d+):)?(\d+):(\d{2})$/);
  if (m) return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
  const n = Number(s);
  return Number.isNaN(n) ? null : Math.max(0, Math.floor(n));
}

function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING);
}

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS verse_songs (id SERIAL PRIMARY KEY, series_id INT, title TEXT, description TEXT, mp3_url TEXT, thumbnail TEXT, duration TEXT, is_published BOOLEAN DEFAULT true, play_count INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS user_verse_song_plays (id SERIAL PRIMARY KEY, user_email TEXT NOT NULL, verse_song_id INT NOT NULL, play_duration_seconds INT, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS play_count INT DEFAULT 0`;
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS mp3_url TEXT`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS user_email TEXT`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS verse_song_id INT`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS play_duration_seconds INT`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`CREATE INDEX IF NOT EXISTS user_verse_song_plays_user_song_idx ON user_verse_song_plays (user_email, verse_song_id)`;
}

async function fetchSong(id: number) {
  try {
    const rows: any = await sql`
      SELECT id, title, description, mp3_url, thumbnail, duration, play_count, series_id
      FROM verse_songs WHERE id = ${id}
    `;
    return rows?.[0] ?? null;
  } catch {
    try {
      const rows: any = await sql`SELECT id, title, play_count FROM verse_songs WHERE id = ${id}`;
      return rows?.[0] ?? null;
    } catch {
      return null;
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userEmail = normEmail(body.userEmail ?? body.user_email ?? body.email ?? body.user);
    const verseSongId = normSongId(body.verseSongId ?? body.verse_song_id ?? body.songId ?? body.song_id ?? body.id);
    const playDurationSeconds = normDuration(
      body.playDurationSeconds ?? body.play_duration_seconds ?? body.duration ?? body.listened_seconds ?? body.listenedSeconds ?? body.play_duration
    );

    if (verseSongId === null) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400, headers });
    }
    if (!dbConfigured()) {
      return NextResponse.json({ error: 'DATABASE_URL is not set in Vercel.' }, { status: 503, headers });
    }

    await ensureTables();

    if (userEmail) {
      await sql`
        INSERT INTO user_verse_song_plays (user_email, verse_song_id, play_duration_seconds)
        VALUES (${userEmail}, ${verseSongId}, ${playDurationSeconds})
      `;
    }

    await sql`
      UPDATE verse_songs
      SET play_count = COALESCE(play_count, 0) + 1
      WHERE id = ${verseSongId}
    `;

    const song = await fetchSong(verseSongId);

    return NextResponse.json(
      { message: 'Play recorded', song, mp3_url: song?.mp3_url ?? null },
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Error recording play:', error);
    return NextResponse.json({ error: 'Failed to record play' }, { status: 500, headers });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = normEmail(
      searchParams.get('userEmail') ?? searchParams.get('user_email') ?? searchParams.get('email')
    );
    const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isNaN(limitRaw) || limitRaw <= 0 ? 50 : Math.min(limitRaw, 200);

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400, headers });
    }
    if (!dbConfigured()) {
      return NextResponse.json({ error: 'DATABASE_URL is not set in Vercel.' }, { status: 503, headers });
    }

    await ensureTables();

    try {
      const plays: any = await sql`
        SELECT vs.*, COUNT(uvsp.id) as total_plays
        FROM verse_songs vs
        LEFT JOIN user_verse_song_plays uvsp ON vs.id = uvsp.verse_song_id AND uvsp.user_email = ${userEmail}
        GROUP BY vs.id
        ORDER BY vs.play_count DESC
        LIMIT ${limit}
      `;
      return NextResponse.json(plays, { headers });
    } catch {
      const plays: any = await sql`
        SELECT id, title, description, mp3_url, thumbnail, duration, play_count, series_id
        FROM verse_songs ORDER BY COALESCE(play_count, 0) DESC LIMIT ${limit}
      `;
      return NextResponse.json(plays, { headers });
    }
  } catch (error) {
    console.error('Error fetching play history:', error);
    return NextResponse.json({ error: 'Failed to fetch play history' }, { status: 500, headers });
  }
}
