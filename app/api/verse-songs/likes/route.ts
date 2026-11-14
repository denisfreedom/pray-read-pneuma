import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// app/api/verse-songs/likes/route.ts — FIXED
// WHAT WAS BROKEN:
//  1) The route never created any table. If user_verse_song_likes did not
//     exist, the SELECT 500d; if verse_songs.likes_count did not exist,
//     the UPDATE 500d. Likes silently never saved.
//  2) `likes_count + 1` breaks on NULL. A song whose likes_count was never
//     set has NULL, and NULL + 1 = NULL — the count froze at NULL forever,
//     no matter how many likes it got. Now COALESCE(likes_count, 0) + 1.
//  3) SELECT-then-INSERT races. Two fast taps on Like could both see "no
//     row" and both INSERT — duplicate like rows, and the count inflated.
//     One atomic INSERT ... ON CONFLICT DO NOTHING with a unique index
//     now guarantees one like per user per song.
//  4) No aliases and no number normalising in POST — verseSongId went
//     straight into an INT column as whatever the player sent.
//  5) DELETE only read the query string. Some clients send a DELETE body
//     instead — that is now accepted too.
// Same tables, same columns, same return shapes ("Liked" / "Already liked"
// / "Unliked" / "Not liked"). Nothing else changed.
//
// CORRECT PATH: paste over the existing likes route at the SAME path it
// already lives in (app/api/verse-songs/likes/route.ts). Do NOT move it —
// the player calls the existing one.

function normEmail(v: any): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

function normSongId(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS verse_songs (id SERIAL PRIMARY KEY, series_id INT, title TEXT, description TEXT, mp3_url TEXT, thumbnail TEXT, duration TEXT, is_published BOOLEAN DEFAULT true, play_count INT DEFAULT 0, likes_count INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS user_verse_song_likes (id SERIAL PRIMARY KEY, user_email TEXT NOT NULL, verse_song_id INT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`;
  // If the tables already existed with fewer columns, add the missing ones —
  // otherwise the INSERT / UPDATE on the missing column still 500s.
  await sql`ALTER TABLE verse_songs ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0`;
  await sql`ALTER TABLE user_verse_song_likes ADD COLUMN IF NOT EXISTS user_email TEXT`;
  await sql`ALTER TABLE user_verse_song_likes ADD COLUMN IF NOT EXISTS verse_song_id INT`;
  await sql`ALTER TABLE user_verse_song_likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  // One like per user per song — this is what makes the like atomic and
  // stops duplicate like rows from ever appearing again.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS user_verse_song_likes_user_song_idx ON user_verse_song_likes (user_email, verse_song_id)`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userEmail = normEmail(body.userEmail ?? body.user_email ?? body.email ?? body.user);
    const verseSongId = normSongId(body.verseSongId ?? body.verse_song_id ?? body.songId ?? body.song_id ?? body.id);

    if (!userEmail || verseSongId === null) {
      return NextResponse.json({ error: 'User email and song ID are required' }, { status: 400, headers });
    }

    await ensureTables();

    // One atomic INSERT — if the like already exists the conflict does
    // nothing and RETURNING comes back empty, so we know it was already
    // liked without a separate SELECT that could race.
    const inserted = await sql`
      INSERT INTO user_verse_song_likes (user_email, verse_song_id)
      VALUES (${userEmail}, ${verseSongId})
      ON CONFLICT (user_email, verse_song_id) DO NOTHING
      RETURNING id
    `;

    if (inserted.length === 0) {
      return NextResponse.json({ message: 'Already liked' }, { status: 200, headers });
    }

    // Increment likes count. COALESCE handles songs whose likes_count was
    // never set (NULL + 1 = NULL used to freeze the count at NULL forever).
    await sql`
      UPDATE verse_songs
      SET likes_count = COALESCE(likes_count, 0) + 1
      WHERE id = ${verseSongId}
    `;

    return NextResponse.json({ message: 'Liked' }, { status: 201, headers });
  } catch (error) {
    console.error('Error liking song:', error);
    return NextResponse.json({ error: 'Failed to like song' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let userEmail = normEmail(
      searchParams.get('userEmail') ?? searchParams.get('user_email') ?? searchParams.get('email')
    );
    let verseSongId = normSongId(
      searchParams.get('verseSongId') ?? searchParams.get('verse_song_id') ?? searchParams.get('songId') ?? searchParams.get('song_id')
    );
    // Some clients send a DELETE body instead of a query string.
    if (!userEmail || verseSongId === null) {
      try {
        const body = await request.json();
        if (!userEmail) userEmail = normEmail(body.userEmail ?? body.user_email ?? body.email ?? body.user);
        if (verseSongId === null) verseSongId = normSongId(body.verseSongId ?? body.verse_song_id ?? body.songId ?? body.song_id ?? body.id);
      } catch {}
    }

    if (!userEmail || verseSongId === null) {
      return NextResponse.json({ error: 'User email and song ID are required' }, { status: 400, headers });
    }

    await ensureTables();

    // One atomic DELETE — if no row was deleted, it was never liked.
    // No separate SELECT, so nothing can race between check and delete.
    const deleted = await sql`
      DELETE FROM user_verse_song_likes
      WHERE user_email = ${userEmail} AND verse_song_id = ${verseSongId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ message: 'Not liked' }, { status: 200, headers });
    }

    // Decrement likes count, never below 0, and never stuck on NULL.
    await sql`
      UPDATE verse_songs
      SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
      WHERE id = ${verseSongId}
    `;

    return NextResponse.json({ message: 'Unliked' }, { headers });
  } catch (error) {
    console.error('Error unliking song:', error);
    return NextResponse.json({ error: 'Failed to unlike song' }, { status: 500, headers });
  }
}
