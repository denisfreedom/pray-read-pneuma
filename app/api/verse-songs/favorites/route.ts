import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

// app/api/verse-songs/favorites/route.ts — FIXED
// WHAT WAS BROKEN:
//  1) The route never created any table. If user_verse_song_favorites did
//     not exist, GET, POST and DELETE all 500d — and the GET also joins
//     verse_songs and verse_song_series, so a missing series table took it
//     down too. The Favorites page showed nothing even with favorites saved.
//  2) SELECT-then-INSERT races. Two fast taps on the star could both see
//     "no row" and both INSERT — duplicate favorite rows. One atomic
//     INSERT ... ON CONFLICT DO NOTHING with a unique index now guarantees
//     one favorite per user per song.
//  3) No aliases and no number normalising in POST — verseSongId went
//     straight into an INT column as whatever the player sent.
//  4) DELETE always said "Removed from favorites", even if the song was
//     never favorited. It now says "Not favorited" when nothing was deleted,
//     matching the likes route.
//  5) DELETE only read the query string. Some clients send a DELETE body
//     instead — that is now accepted too.
// Same tables, same columns, same return shapes. Nothing else changed.
//
// CORRECT PATH: paste over the existing favorites route at the SAME path it
// already lives in (app/api/verse-songs/favorites/route.ts). Do NOT move it —
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
  await sql`CREATE TABLE IF NOT EXISTS verse_song_series (id SERIAL PRIMARY KEY, title TEXT, description TEXT, thumbnail TEXT, is_featured BOOLEAN DEFAULT false, display_order INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS verse_songs (id SERIAL PRIMARY KEY, series_id INT, title TEXT, description TEXT, mp3_url TEXT, thumbnail TEXT, duration TEXT, is_published BOOLEAN DEFAULT true, play_count INT DEFAULT 0, likes_count INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS user_verse_song_favorites (id SERIAL PRIMARY KEY, user_email TEXT NOT NULL, verse_song_id INT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`;
  // If the tables already existed with fewer columns, add the missing ones —
  // otherwise the INSERT / JOIN on the missing column still 500s.
  await sql`ALTER TABLE user_verse_song_favorites ADD COLUMN IF NOT EXISTS user_email TEXT`;
  await sql`ALTER TABLE user_verse_song_favorites ADD COLUMN IF NOT EXISTS verse_song_id INT`;
  await sql`ALTER TABLE user_verse_song_favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  // One favorite per user per song — this is what makes the favorite atomic
  // and stops duplicate favorite rows from ever appearing again.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS user_verse_song_favorites_user_song_idx ON user_verse_song_favorites (user_email, verse_song_id)`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = normEmail(
      searchParams.get('userEmail') ?? searchParams.get('user_email') ?? searchParams.get('email')
    );

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400, headers });
    }

    await ensureTables();

    const favorites = await sql`
      SELECT
        vs.*,
        vss.title as series_title
      FROM verse_songs vs
      LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
      INNER JOIN user_verse_song_favorites uvsf ON vs.id = uvsf.verse_song_id
      WHERE uvsf.user_email = ${userEmail}
      ORDER BY uvsf.created_at DESC
    `;

    return NextResponse.json(favorites, { headers });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500, headers });
  }
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

    // One atomic INSERT — if the favorite already exists the conflict does
    // nothing and RETURNING comes back empty, so we know it was already
    // favorited without a separate SELECT that could race.
    const inserted = await sql`
      INSERT INTO user_verse_song_favorites (user_email, verse_song_id)
      VALUES (${userEmail}, ${verseSongId})
      ON CONFLICT (user_email, verse_song_id) DO NOTHING
      RETURNING id
    `;

    if (inserted.length === 0) {
      return NextResponse.json({ message: 'Already favorited' }, { status: 200, headers });
    }

    return NextResponse.json({ message: 'Added to favorites' }, { status: 201, headers });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500, headers });
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

    // One atomic DELETE — if no row was deleted, it was never favorited.
    const deleted = await sql`
      DELETE FROM user_verse_song_favorites
      WHERE user_email = ${userEmail} AND verse_song_id = ${verseSongId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ message: 'Not favorited' }, { status: 200, headers });
    }

    return NextResponse.json({ message: 'Removed from favorites' }, { headers });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500, headers });
  }
}
