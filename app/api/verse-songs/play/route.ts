import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userEmail, verseSongId, playDurationSeconds } = await request.json();

    if (!verseSongId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Record play event
    if (userEmail) {
      await sql`
        INSERT INTO user_verse_song_plays (user_email, verse_song_id, play_duration_seconds)
        VALUES (${userEmail}, ${verseSongId}, ${playDurationSeconds || null})
      `;
    }

    // Increment play count
    await sql`
      UPDATE verse_songs
      SET play_count = play_count + 1
      WHERE id = ${verseSongId}
    `;

    return NextResponse.json({ message: 'Play recorded' }, { status: 201 });
  } catch (error) {
    console.error('Error recording play:', error);
    return NextResponse.json({ error: 'Failed to record play' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const plays = await sql`
      SELECT vs.*, COUNT(uvsp.id) as total_plays
      FROM verse_songs vs
      LEFT JOIN user_verse_song_plays uvsp ON vs.id = uvsp.verse_song_id AND uvsp.user_email = ${userEmail}
      GROUP BY vs.id
      ORDER BY vs.play_count DESC
      LIMIT 50
    `;

    return NextResponse.json(plays);
  } catch (error) {
    console.error('Error fetching play history:', error);
    return NextResponse.json({ error: 'Failed to fetch play history' }, { status: 500 });
  }
}
