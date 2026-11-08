import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const headers = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function mapRow(r: any) {
  if (!r) return null;
  const en = r.closing_prayer_english ?? r.en_prayer ?? r.enPrayer ?? r.prayer_english ?? null;
  const lu = r.closing_prayer_luganda ?? r.lu_prayer ?? r.luPrayer ?? r.prayer_luganda ?? null;
  return {
    ...r,
    en_prayer: en,
    lu_prayer: lu,
    english_prayer: en,
    luganda_prayer: lu,
    closing_prayer_english: en,
    closing_prayer_luganda: lu,
    chapter_closing_prayer_audio_url: r.chapter_closing_prayer_audio_url ?? r.closing_prayer_audio_url ?? r.audio_url ?? null,
    closing_prayer_audio_url: r.chapter_closing_prayer_audio_url ?? r.closing_prayer_audio_url ?? r.audio_url ?? null,
  };
}

// Helper: upsert closing prayer into chapter_introductions (NEW home)
async function upsertIntoChapterIntros(bookId: number, chapter: number, en: string, lu: string, audioUrl: string | null) {
  try {
    await sql`
      INSERT INTO chapter_introductions (book_id, chapter, closing_prayer_english, closing_prayer_luganda, closing_prayer_audio_url)
      VALUES (${bookId}, ${chapter}, ${en}, ${lu}, ${audioUrl})
      ON CONFLICT (book_id, chapter) DO UPDATE SET
        closing_prayer_english = COALESCE(EXCLUDED.closing_prayer_english, chapter_introductions.closing_prayer_english),
        closing_prayer_luganda = COALESCE(EXCLUDED.closing_prayer_luganda, chapter_introductions.closing_prayer_luganda),
        closing_prayer_audio_url = COALESCE(EXCLUDED.closing_prayer_audio_url, chapter_introductions.closing_prayer_audio_url),
        updated_at = NOW()
    `;
  } catch {}
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookIdParam = searchParams.get('bookId');
    const bookName = searchParams.get('book');
    const chapter = searchParams.get('chapter');

    let bookId = bookIdParam;
    if (bookName && !bookId) {
      const bookResult = await sql`
        SELECT id FROM bible_books WHERE name_english = ${bookName}
      `;
      if (bookResult.length > 0) {
        bookId = bookResult[0].id.toString();
      }
    }

    if (bookId && chapter) {
      const bId = parseInt(bookId);
      const ch = parseInt(chapter);
      // NEW FIRST: chapter_introductions
      try {
        const rows: any[] = await sql`
          SELECT book_id, chapter, closing_prayer_english, closing_prayer_luganda, closing_prayer_audio_url, audio_url
          FROM chapter_introductions WHERE book_id = ${bId} AND chapter = ${ch}
        `;
        if (rows.length && (rows[0].closing_prayer_english || rows[0].closing_prayer_luganda)) {
          return NextResponse.json(mapRow(rows[0]), { headers });
        }
      } catch {}
      // FALLBACK OLD: chapter_prayers
      try {
        const rows: any[] = await sql`
          SELECT id, book_id, chapter, en_prayer, lu_prayer, chapter_closing_prayer_audio_url, created_at, updated_at
          FROM chapter_prayers WHERE book_id = ${bId} AND chapter = ${ch}
        `;
        return NextResponse.json(mapRow(rows[0]) || null, { headers });
      } catch {
        return NextResponse.json(null, { headers });
      }
    } else if (bookId) {
      const bId = parseInt(bookId);
      // NEW FIRST
      try {
        const rows: any[] = await sql`
          SELECT book_id, chapter, closing_prayer_english, closing_prayer_luganda, closing_prayer_audio_url
          FROM chapter_introductions WHERE book_id = ${bId} ORDER BY chapter
        `;
        const filtered = rows.filter((r: any) => r.closing_prayer_english || r.closing_prayer_luganda);
        if (filtered.length) return NextResponse.json(filtered.map(mapRow), { headers });
      } catch {}
      try {
        const rows: any[] = await sql`
          SELECT id, book_id, chapter, en_prayer, lu_prayer, chapter_closing_prayer_audio_url, created_at, updated_at
          FROM chapter_prayers WHERE book_id = ${bId} ORDER BY chapter
        `;
        return NextResponse.json(rows.map(mapRow), { headers });
      } catch {
        return NextResponse.json([], { headers });
      }
    } else {
      try {
        const rows: any[] = await sql`
          SELECT book_id, chapter, closing_prayer_english, closing_prayer_luganda, closing_prayer_audio_url
          FROM chapter_introductions ORDER BY book_id, chapter
        `;
        const filtered = rows.filter((r: any) => r.closing_prayer_english || r.closing_prayer_luganda);
        return NextResponse.json(filtered.map(mapRow), { headers });
      } catch {
        return NextResponse.json([], { headers });
      }
    }
  } catch (error) {
    console.error('Error fetching chapter prayers:', error);
    return NextResponse.json({
      error: 'Failed to fetch chapter prayers',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookId = body.bookId || body.book_id;
    const chapter = body.chapter;
    const enPrayer = body.enPrayer || body.en_prayer || body.closing_prayer_english || '';
    const luPrayer = body.luPrayer || body.lu_prayer || body.closing_prayer_luganda || '';
    const audioUrl = body.audioUrl || body.chapter_closing_prayer_audio_url || body.closing_prayer_audio_url || null;

    if (!bookId || !chapter) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId and chapter' },
        { status: 400, headers }
      );
    }

    // Write to NEW home first
    await upsertIntoChapterIntros(parseInt(bookId), parseInt(chapter), enPrayer, luPrayer, audioUrl);

    // Also keep OLD table in sync if it exists
    try {
      const result: any[] = await sql`
        INSERT INTO chapter_prayers (book_id, chapter, en_prayer, lu_prayer, chapter_closing_prayer_audio_url)
        VALUES (${bookId}, ${chapter}, ${enPrayer || ''}, ${luPrayer || ''}, ${audioUrl})
        ON CONFLICT (book_id, chapter) DO UPDATE SET en_prayer = EXCLUDED.en_prayer, lu_prayer = EXCLUDED.lu_prayer, chapter_closing_prayer_audio_url = EXCLUDED.chapter_closing_prayer_audio_url
        RETURNING *
      `;
      return NextResponse.json({ success: true, prayer: mapRow(result[0]) }, { headers });
    } catch {
      return NextResponse.json({ success: true, prayer: mapRow({ book_id: bookId, chapter, en_prayer: enPrayer, lu_prayer: luPrayer }) }, { headers });
    }
  } catch (error) {
    console.error('Error saving chapter prayer:', error);
    return NextResponse.json({
      error: 'Failed to save chapter prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;
    const bookId = body.bookId || body.book_id;
    const chapter = body.chapter;
    const enPrayer = body.enPrayer || body.en_prayer || body.closing_prayer_english || '';
    const luPrayer = body.luPrayer || body.lu_prayer || body.closing_prayer_luganda || '';
    const audioUrl = body.audioUrl || body.chapter_closing_prayer_audio_url || body.closing_prayer_audio_url || null;

    if (!id && (!bookId || !chapter)) {
      return NextResponse.json(
        { error: 'Missing required field: id or (bookId and chapter)' },
        { status: 400, headers }
      );
    }

    // Update NEW home if we know book+chapter
    if (bookId && chapter) {
      await upsertIntoChapterIntros(parseInt(bookId), parseInt(chapter), enPrayer, luPrayer, audioUrl);
    } else if (id) {
      // Resolve book+chapter from old table, then update new home
      try {
        const rows: any[] = await sql`SELECT book_id, chapter FROM chapter_prayers WHERE id = ${id} LIMIT 1`;
        if (rows.length) await upsertIntoChapterIntros(rows[0].book_id, rows[0].chapter, enPrayer, luPrayer, audioUrl);
      } catch {}
    }

    if (id) {
      try {
        const result: any[] = await sql`
          UPDATE chapter_prayers
          SET en_prayer = ${enPrayer || ''}, lu_prayer = ${luPrayer || ''}, chapter_closing_prayer_audio_url = ${audioUrl}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} RETURNING *
        `;
        if (result.length) return NextResponse.json({ success: true, prayer: mapRow(result[0]) }, { headers });
      } catch {}
    }
    return NextResponse.json({ success: true, prayer: mapRow({ en_prayer: enPrayer, lu_prayer: luPrayer }) }, { headers });
  } catch (error) {
    console.error('Error updating chapter prayer:', error);
    return NextResponse.json({
      error: 'Failed to update chapter prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');

    if (id) {
      try {
        const rows: any[] = await sql`SELECT book_id, chapter FROM chapter_prayers WHERE id = ${parseInt(id)} LIMIT 1`;
        if (rows.length) {
          await sql`UPDATE chapter_introductions SET closing_prayer_english = NULL, closing_prayer_luganda = NULL WHERE book_id = ${rows[0].book_id} AND chapter = ${rows[0].chapter}`;
        }
      } catch {}
      try { await sql`DELETE FROM chapter_prayers WHERE id = ${parseInt(id)}`; } catch {}
    } else if (bookId && chapter) {
      try { await sql`UPDATE chapter_introductions SET closing_prayer_english = NULL, closing_prayer_luganda = NULL WHERE book_id = ${parseInt(bookId)} AND chapter = ${parseInt(chapter)}`; } catch {}
      try { await sql`DELETE FROM chapter_prayers WHERE book_id = ${parseInt(bookId)} AND chapter = ${parseInt(chapter)}`; } catch {}
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters: id or (bookId and chapter)' },
        { status: 400, headers }
      );
    }

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error('Error deleting chapter prayer:', error);
    return NextResponse.json({
      error: 'Failed to delete chapter prayer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers });
  }
}
