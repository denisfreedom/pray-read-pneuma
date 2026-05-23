import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const seriesId = searchParams.get('seriesId');
    const mostPlayed = searchParams.get('mostPlayed');
    const recentlyAdded = searchParams.get('recentlyAdded');
    const limit = parseInt(searchParams.get('limit') || '10');
    const userEmail = searchParams.get('userEmail') || '';

    let songs;

    if (id) {
      const songId = parseInt(id);
      songs = await sql`
        SELECT 
          vs.*,
          vss.title as series_title,
          (SELECT COUNT(*) FROM user_verse_song_likes WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_liked,
          (SELECT COUNT(*) FROM user_verse_song_favorites WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_favorited
        FROM verse_songs vs
        LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
        WHERE vs.id = ${songId}
      `;
    } else if (seriesId) {
      const seriesIdInt = parseInt(seriesId);
      
      if (mostPlayed === 'true') {
        songs = await sql`
          SELECT 
            vs.*,
            vss.title as series_title,
            (SELECT COUNT(*) FROM user_verse_song_likes WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_liked,
            (SELECT COUNT(*) FROM user_verse_song_favorites WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_favorited
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE vs.series_id = ${seriesIdInt} AND vs.is_published = true
          ORDER BY vs.play_count DESC
          LIMIT ${limit}
        `;
      } else {
        songs = await sql`
          SELECT 
            vs.*,
            vss.title as series_title,
            (SELECT COUNT(*) FROM user_verse_song_likes WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_liked,
            (SELECT COUNT(*) FROM user_verse_song_favorites WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_favorited
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE vs.series_id = ${seriesIdInt} AND vs.is_published = true
          ORDER BY vs.created_at DESC
          LIMIT ${limit}
        `;
      }
    } else {
      if (mostPlayed === 'true') {
        songs = await sql`
          SELECT 
            vs.*,
            vss.title as series_title,
            (SELECT COUNT(*) FROM user_verse_song_likes WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_liked,
            (SELECT COUNT(*) FROM user_verse_song_favorites WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_favorited
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE vs.is_published = true
          ORDER BY vs.play_count DESC
          LIMIT ${limit}
        `;
      } else {
        songs = await sql`
          SELECT 
            vs.*,
            vss.title as series_title,
            (SELECT COUNT(*) FROM user_verse_song_likes WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_liked,
            (SELECT COUNT(*) FROM user_verse_song_favorites WHERE verse_song_id = vs.id AND user_email = ${userEmail}) as user_favorited
          FROM verse_songs vs
          LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
          WHERE vs.is_published = true
          ORDER BY vs.created_at DESC
          LIMIT ${limit}
        `;
      }
    }

    return NextResponse.json(songs);
  } catch (error) {
    console.error('Error fetching verse songs:', error);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}

const DEFAULT_THUMBNAIL = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/verse-song-default-thumbnail_png.jpeg';

export async function POST(request: Request) {
  try {
    const { series_id, title, description, mp3_url, thumbnail, duration, is_published } = await request.json();

    if (!series_id || !title || !mp3_url) {
      return NextResponse.json({ error: 'Series ID, title, and MP3 URL are required' }, { status: 400 });
    }

    const resolvedThumbnail = thumbnail && thumbnail.trim() !== '' ? thumbnail.trim() : DEFAULT_THUMBNAIL;

    const result = await sql`
      INSERT INTO verse_songs (series_id, title, description, mp3_url, thumbnail, duration, is_published)
      VALUES (${series_id}, ${title}, ${description || null}, ${mp3_url}, ${resolvedThumbnail}, ${duration || null}, ${is_published !== false})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating verse song:', error);
    return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, series_id, title, description, mp3_url, thumbnail, duration, is_published } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const resolvedThumbnail = thumbnail && thumbnail.trim() !== '' ? thumbnail.trim() : DEFAULT_THUMBNAIL;

    const result = await sql`
      UPDATE verse_songs
      SET title = ${title || null},
          series_id = ${series_id || null},
          description = ${description || null},
          mp3_url = ${mp3_url || null},
          thumbnail = ${resolvedThumbnail},
          duration = ${duration || null},
          is_published = ${is_published !== false},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating verse song:', error);
    return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM verse_songs
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting verse song:', error);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
  }
}
