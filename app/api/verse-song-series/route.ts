import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

const DEFAULT_SERIES_THUMBNAIL = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/series-default-thumbnail-red_png.jpeg';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const featured = searchParams.get('featured');

    let series;

    if (id) {
      series = await sql`SELECT * FROM verse_song_series WHERE id = ${parseInt(id)} ORDER BY display_order ASC, created_at DESC`;
    } else if (featured === 'true') {
      series = await sql`SELECT * FROM verse_song_series WHERE is_featured = true ORDER BY display_order ASC, created_at DESC`;
    } else {
      series = await sql`SELECT * FROM verse_song_series ORDER BY display_order ASC, created_at DESC`;
    }

    return NextResponse.json(series);
  } catch (error) {
    console.error('Error fetching verse song series:', error);
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, thumbnail, is_featured, display_order } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO verse_song_series (title, description, thumbnail, is_featured, display_order)
      VALUES (${title}, ${description || null}, ${thumbnail || DEFAULT_SERIES_THUMBNAIL}, ${is_featured || false}, ${display_order || 0})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating verse song series:', error);
    return NextResponse.json({ error: 'Failed to create series' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, title, description, thumbnail, is_featured, display_order } = await request.json();

    if (!id || !title) {
      return NextResponse.json({ error: 'ID and title are required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE verse_song_series
      SET title = ${title},
          description = ${description || null},
          thumbnail = ${thumbnail || DEFAULT_SERIES_THUMBNAIL},
          is_featured = ${is_featured || false},
          display_order = ${display_order || 0},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating verse song series:', error);
    return NextResponse.json({ error: 'Failed to update series' }, { status: 500 });
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
      DELETE FROM verse_song_series
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Series deleted successfully' });
  } catch (error) {
    console.error('Error deleting verse song series:', error);
    return NextResponse.json({ error: 'Failed to delete series' }, { status: 500 });
  }
}
