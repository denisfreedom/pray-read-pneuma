import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const verseSongId = searchParams.get('verseSongId');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    let progress;
    if (verseSongId) {
      progress = await sql`
        SELECT * FROM user_verse_song_progress 
        WHERE user_email = ${userEmail} AND verse_song_id = ${parseInt(verseSongId)}
      `;
    } else {
      progress = await sql`
        SELECT * FROM user_verse_song_progress WHERE user_email = ${userEmail}
      `;
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userEmail, verseSongId, lastPositionSeconds, completed } = await request.json();

    if (!userEmail || !verseSongId) {
      return NextResponse.json({ error: 'User email and song ID are required' }, { status: 400 });
    }

    // Check if progress exists
    const existing = await sql`
      SELECT id FROM user_verse_song_progress
      WHERE user_email = ${userEmail} AND verse_song_id = ${verseSongId}
    `;

    if (existing.length > 0) {
      // Update existing
      const result = await sql`
        UPDATE user_verse_song_progress
        SET last_position_seconds = ${lastPositionSeconds || 0},
            completed = ${completed || false},
            updated_at = NOW()
        WHERE user_email = ${userEmail} AND verse_song_id = ${verseSongId}
        RETURNING *
      `;
      return NextResponse.json(result[0]);
    } else {
      // Create new
      const result = await sql`
        INSERT INTO user_verse_song_progress (user_email, verse_song_id, last_position_seconds, completed)
        VALUES (${userEmail}, ${verseSongId}, ${lastPositionSeconds || 0}, ${completed || false})
        RETURNING *
      `;
      return NextResponse.json(result[0], { status: 201 });
    }
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
