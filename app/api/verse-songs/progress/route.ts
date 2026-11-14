import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// app/api/verse-song-progress/route.ts — FIXED
// WHAT WAS BROKEN:
//  1) The route never created the table. If user_verse_song_progress did
//     not exist, every resume / save died with a 500 and the player just
//     started every song from 0.
//  2) `completed || false` lies. A client sending the STRING "false" is
//     truthy, so a song got marked completed when it wasn't. Worse: a client
//     sending ONLY a position (no completed field) reset completed back to
//     false — a finished song un-completed itself on the next pause.
//  3) SELECT-then-INSERT races. Two quick saves could both see "no row"
//     and both INSERT — duplicate rows, and the player then read whichever
//     came first. One atomic UPSERT fixes it.
//  4) Only one key name per field. user_email / verse_song_id /
//     last_position_seconds aliases are now accepted.
//  5) play_count was never tracked, and there was no last_played_at.
//     Progress now also records plays and when the song was last played,
//     without ever resetting the count.
// Same table, same columns, same GET return shape (an array). Nothing else
// changed.
//
// CORRECT PATH: paste over the existing progress route at the SAME path it
// already lives in. Do NOT move it to a new path — the player calls the
// existing one.

function normEmail(v: any): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

function normSongId(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function normPosition(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.floor(n));
}

// completed: undefined/null -> null (means "keep the old value");
// true / "true" / 1 -> true; everything else -> false.
function normCompleted(v: any): boolean | null {
  if (v === undefined || v === null) return null;
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
  return Boolean(v);
}

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS user_verse_song_progress (id SERIAL PRIMARY KEY, user_email TEXT NOT NULL, verse_song_id INT NOT NULL, last_position_seconds INT DEFAULT 0, completed BOOLEAN DEFAULT false, play_count INT DEFAULT 0, last_played_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  // If the table already existed with fewer columns, add the missing ones —
  // otherwise the UPSERT on the missing column still 500s.
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS user_email TEXT`;
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS verse_song_id INT`;
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS last_position_seconds INT DEFAULT 0`;
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS play_count INT DEFAULT 0`;
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ`;
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE user_verse_song_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
  // One row per user per song — this is what makes the UPSERT atomic and
  // stops duplicate rows from ever appearing again.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS user_verse_song_progress_user_song_idx ON user_verse_song_progress (user_email, verse_song_id)`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = normEmail(
      searchParams.get('userEmail') ?? searchParams.get('user_email') ?? searchParams.get('email')
    );
    const verseSongId = normSongId(
      searchParams.get('verseSongId') ?? searchParams.get('verse_song_id') ?? searchParams.get('songId') ?? searchParams.get('song_id')
    );

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400, headers });
    }

    await ensureTable();

    let progress;
    if (verseSongId !== null) {
      progress = await sql`
        SELECT * FROM user_verse_song_progress
        WHERE user_email = ${userEmail} AND verse_song_id = ${verseSongId}
      `;
    } else {
      progress = await sql`
        SELECT * FROM user_verse_song_progress WHERE user_email = ${userEmail}
      `;
    }

    return NextResponse.json(progress, { headers });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userEmail = normEmail(body.userEmail ?? body.user_email ?? body.email ?? body.user);
    const verseSongId = normSongId(body.verseSongId ?? body.verse_song_id ?? body.songId ?? body.song_id ?? body.id);
    const lastPositionSeconds = normPosition(
      body.lastPositionSeconds ?? body.last_position_seconds ?? body.position ?? body.positionSeconds ?? body.currentTime ?? body.current_time
    );
    const completed = normCompleted(body.completed ?? body.is_completed ?? body.isCompleted ?? body.finished);
    // Play counter: only increments when the player says a play happened —
    // never reset by a plain position save.
    const played = body.played === true || body.played === 'true' || body.played === 1 || body.increment_play_count === true || body.incrementPlayCount === true;
    const playIncrement = played ? 1 : 0;

    if (!userEmail || verseSongId === null) {
      return NextResponse.json({ error: 'User email and song ID are required' }, { status: 400, headers });
    }

    await ensureTable();

    // One atomic UPSERT — no SELECT-then-INSERT race, no duplicate rows.
    // Fields NOT sent are kept (COALESCE), so a position-only save can
    // never un-complete a finished song, and a completed-only save can
    // never reset the position to 0.
    const result = await sql`
      INSERT INTO user_verse_song_progress (user_email, verse_song_id, last_position_seconds, completed, play_count, last_played_at)
      VALUES (${userEmail}, ${verseSongId}, ${lastPositionSeconds}, ${completed}, ${playIncrement}, NOW())
      ON CONFLICT (user_email, verse_song_id) DO UPDATE SET
        last_position_seconds = COALESCE(EXCLUDED.last_position_seconds, user_verse_song_progress.last_position_seconds),
        completed = COALESCE(EXCLUDED.completed, user_verse_song_progress.completed),
        play_count = user_verse_song_progress.play_count + EXCLUDED.play_count,
        last_played_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    // NULL means "not sent": COALESCE in the DO UPDATE keeps the old
    // value, so a position-only save can never un-complete a song and a
    // completed-only save can never reset the position to 0. A brand-new
    // row stores NULL for an unsent field, which the player reads as 0/false.
    return NextResponse.json(result[0], { status: 201, headers });
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500, headers });
  }
}
