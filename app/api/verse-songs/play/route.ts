import sql, { isDbConfigured } from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// app/api/verse-songs/play/route.ts — FIXED V2
// V1 only COUNTED plays. It returned { message: 'Play recorded' } and no
// song, no mp3_url — so if the front-end Play button waited on this
// response to feed the floating player, the player got nothing to play.
// That is what your screenshot shows: button clicks, nothing plays.
// V2: POST still logs the play + increments play_count, but ALSO returns
// the song row (id, title, mp3_url, thumbnail, duration, play_count)
// so the floating player can do: const { song } = await res.json();
// audio.src = song.mp3_url; audio.play().
// Same tables, same columns. If mp3_url does not exist yet on your
// verse_songs table, POST still logs the play and returns the song
// without mp3_url (instead of 500ing) — then the fix is the column,
// not this route. See the check list below.
//
// CORRECT PATH: app/api/verse-songs/play/route.ts — do NOT move it.

function normEmail(v: any): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

function normSongId(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

// Duration: "1:30" / "1:02:30" -> seconds; numeric string -> number;
// anything else -> null (never a negative, never garbage).
function normDuration(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return Number.isNaN(v) ? null : Math.max(0, Math.floor(v));
  const s = String(v).trim();
  const m = s.match(/^(?:(\d+):)?(\d+):(\d{2})$/);
  if (m) return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
  const n = Number(s);
  return Number.isNaN(n) ? null : Math.max(0, Math.floor(n));
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

// Fetch the song the player needs. mp3_url may not exist on older tables,
// so fall back to a minimal row instead of 500ing.
async function fetchSong(id: number) {
  try {
    const [row] = await sql`
      SELECT id, title, description, mp3_url, thumbnail, duration, play_count, series_id
      FROM verse_songs WHERE id = ${id}
    `;
    return row ?? null;
  } catch {
    try {
      const [row] = await sql`SELECT id, title, play_count FROM verse_songs WHERE id = ${id}`;
      return row ?? null;
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
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'DATABASE_URL is not set in Vercel.' }, { status: 503, headers });
    }

    await ensureTables();

    // Record play event (only when we know who played it — anonymous plays
    // still count toward the song's total below).
    if (userEmail) {
      await sql`
        INSERT INTO user_verse_song_plays (user_email, verse_song_id, play_duration_seconds)
        VALUES (${userEmail}, ${verseSongId}, ${playDurationSeconds})
      `;
    }

    // Increment play count. COALESCE handles songs whose play_count was
    // never set (NULL + 1 = NULL used to freeze the count at NULL forever).
    await sql`
      UPDATE verse_songs
      SET play_count = COALESCE(play_count, 0) + 1
      WHERE id = ${verseSongId}
    `;

    // NEW: return the song so the floating player has an mp3_url to play.
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
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'DATABASE_URL is not set in Vercel.' }, { status: 503, headers });
    }

    await ensureTables();

    // NOTE: SELECT vs.* + GROUP BY vs.id relies on Postgres functional
    // dependency (id is the PK). If your verse_songs table has no PK,
    // this query 500s — the fallback below then returns a plain list.
    try {
      const plays = await sql`
        SELECT vs.*, COUNT(uvsp.id) as total_plays
        FROM verse_songs vs
        LEFT JOIN user_verse_song_plays uvsp ON vs.id = uvsp.verse_song_id AND uvsp.user_email = ${userEmail}
        GROUP BY vs.id
        ORDER BY vs.play_count DESC
        LIMIT ${limit}
      `;
      return NextResponse.json(plays, { headers });
    } catch {
      const plays = await sql`
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
