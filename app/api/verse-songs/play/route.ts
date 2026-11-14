import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// app/api/verse-songs/play/route.ts — FIXED
// WHAT WAS BROKEN:
//  1) The route never created any table. If user_verse_song_plays did not
//     exist, the INSERT 500d; if verse_songs.play_count did not exist, the
//     UPDATE 500d; and the GET joins the plays table, so it 500d too.
//     Every play was silently lost.
//  2) `play_count + 1` breaks on NULL. A song whose play_count was never
//     set has NULL, and NULL + 1 = NULL — the count never moved. Now
//     COALESCE(play_count, 0) + 1.
//  3) No aliases and no number normalising. verseSongId went straight into
//     an INT column as whatever the player sent, and a duration sent as a
//     string ("1:30") or "45" could 500 the insert.
//  4) A negative or garbage duration could be stored. It is now clamped to
//     >= 0, and "m:ss" is converted to seconds.
// Same tables, same columns, same return shapes. Nothing else changed.
//
// CORRECT PATH: paste over the existing play route at the SAME path it
// already lives in (app/api/verse-songs/play/route.ts). Do NOT move it —
// the player calls the existing one.

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
  // If the tables already existed with fewer columns, add the missing ones —
  // otherwise the INSERT / UPDATE on the missing column still 500s.
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS play_count INT DEFAULT 0`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS user_email TEXT`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS verse_song_id INT`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS play_duration_seconds INT`;
  await sql`ALTER TABLE user_verse_song_plays ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`CREATE INDEX IF NOT EXISTS user_verse_song_plays_user_song_idx ON user_verse_song_plays (user_email, verse_song_id)`;
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

    return NextResponse.json({ message: 'Play recorded' }, { status: 201, headers });
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

    await ensureTables();

    const plays = await sql`
      SELECT vs.*, COUNT(uvsp.id) as total_plays
      FROM verse_songs vs
      LEFT JOIN user_verse_song_plays uvsp ON vs.id = uvsp.verse_song_id AND uvsp.user_email = ${userEmail}
      GROUP BY vs.id
      ORDER BY vs.play_count DESC
      LIMIT ${limit}
    `;

    return NextResponse.json(plays, { headers });
  } catch (error) {
    console.error('Error fetching play history:', error);
    return NextResponse.json({ error: 'Failed to fetch play history' }, { status: 500, headers });
  }
}
