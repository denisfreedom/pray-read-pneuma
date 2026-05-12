import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

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

    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userEmail, verseSongId } = await request.json();

    if (!userEmail || !verseSongId) {
      return NextResponse.json({ error: 'User email and song ID are required' }, { status: 400 });
    }

    // Check if already favorited
    const existing = await sql`
      SELECT id FROM user_verse_song_favorites
      WHERE user_email = ${userEmail} AND verse_song_id = ${verseSongId}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Already favorited' }, { status: 200 });
    }

    await sql`
      INSERT INTO user_verse_song_favorites (user_email, verse_song_id)
      VALUES (${userEmail}, ${verseSongId})
    `;

    return NextResponse.json({ message: 'Added to favorites' }, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
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

    await sql`
      DELETE FROM user_verse_song_favorites
      WHERE user_email = ${userEmail} AND verse_song_id = ${parseInt(verseSongId)}
    `;

    return NextResponse.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
