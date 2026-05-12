import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userEmail, verseSongId } = await request.json();

    if (!userEmail || !verseSongId) {
      return NextResponse.json({ error: 'User email and song ID are required' }, { status: 400 });
    }

    // Check if already liked
    const existing = await sql`
      SELECT id FROM user_verse_song_likes
      WHERE user_email = ${userEmail} AND verse_song_id = ${verseSongId}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Already liked' }, { status: 200 });
    }

    // Add like
    await sql`
      INSERT INTO user_verse_song_likes (user_email, verse_song_id)
      VALUES (${userEmail}, ${verseSongId})
    `;

    // Increment likes count
    await sql`
      UPDATE verse_songs
      SET likes_count = likes_count + 1
      WHERE id = ${verseSongId}
    `;

    return NextResponse.json({ message: 'Liked' }, { status: 201 });
  } catch (error) {
    console.error('Error liking song:', error);
    return NextResponse.json({ error: 'Failed to like song' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const verseSongId = searchParams.get('verseSongId');

    if (!userEmail || !verseSongId) {
      return NextResponse.json({ error: 'User email and song ID are required' }, { status: 400 });
    }

    const songId = parseInt(verseSongId);

    // Check if liked
    const existing = await sql`
      SELECT id FROM user_verse_song_likes
      WHERE user_email = ${userEmail} AND verse_song_id = ${songId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ message: 'Not liked' }, { status: 200 });
    }

    // Remove like
    await sql`
      DELETE FROM user_verse_song_likes
      WHERE user_email = ${userEmail} AND verse_song_id = ${songId}
    `;

    // Decrement likes count
    await sql`
      UPDATE verse_songs
      SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END
      WHERE id = ${songId}
    `;

    return NextResponse.json({ message: 'Unliked' });
  } catch (error) {
    console.error('Error unliking song:', error);
    return NextResponse.json({ error: 'Failed to unlike song' }, { status: 500 });
  }
}
