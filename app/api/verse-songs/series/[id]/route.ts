import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// app/api/verse-songs/series/[id]/route.ts — songs in ONE series
// The verse-songs page fetches /api/verse-songs/series/{id} for every series.
// If this file is missing, that fetch 404s and the page shows
// "Couldn't load the songs" even when the main list works.
// Returns a plain JSON array of songs (same shape as the main route).

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const seriesId = parseInt(id, 10);
    if (Number.isNaN(seriesId)) {
      return NextResponse.json([], { status: 200 });
    }
    const rows: any[] = await sql`
      SELECT vs.*, vss.title as series_title
      FROM verse_songs vs
      LEFT JOIN verse_song_series vss ON vs.series_id = vss.id
      WHERE vs.series_id = ${seriesId} AND COALESCE(vs.is_published, true) = true
      ORDER BY vs.created_at DESC
      LIMIT 500
    `;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}
