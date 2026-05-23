import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const type = searchParams.get('type'); // 'book_introduction', 'chapter_introduction', 'book_closing_prayer', 'chapter_concluding_prayer'

    if (type === 'book_introduction' && book) {
      // Get book introduction
      const result = await sql`
        SELECT 
          bi.en_introduction as english_introduction, 
          bi.lu_introduction as luganda_introduction,
          bi.audio_url,
          bi.closing_prayer_audio_url
        FROM book_introductions bi 
        JOIN bible_books bb ON bi.book_id = bb.id 
        WHERE bb.name_english = ${book}
        ORDER BY bi.id DESC LIMIT 1
      `;
      
      return NextResponse.json(result[0] || {});
    } else if (type === 'chapter_introduction' && book && chapter) {
      // Get chapter introduction
      const chapterNum = parseInt(chapter);
      const result = await sql`
        SELECT 
          ci.en_introduction as english_introduction, 
          ci.lu_introduction as luganda_introduction,
          ci.audio_url,
          ci.chapter_audio_url,
          ci.closing_prayer_audio_url
        FROM chapter_introductions ci 
        JOIN bible_books bb ON ci.book_id = bb.id 
        WHERE bb.name_english = ${book} AND ci.chapter = ${chapterNum}
        ORDER BY ci.id DESC LIMIT 1
      `;
      
      return NextResponse.json(result[0] || {});
    } else if (type === 'book_closing_prayer' && book) {
      // Get book closing prayer
      const result = await sql`
        SELECT bp.en_prayer as english_prayer, bp.lu_prayer as luganda_prayer 
        FROM book_prayers bp 
        JOIN bible_books bb ON bp.book_id = bb.id 
        WHERE bb.name_english = ${book}
        ORDER BY bp.id DESC LIMIT 1
      `;
      
      return NextResponse.json(result[0] || {});
    } else if (type === 'chapter_concluding_prayer' && book && chapter) {
      // Get chapter concluding prayer
      const chapterNum = parseInt(chapter);
      const result = await sql`
        SELECT cp.en_prayer as english_prayer, cp.lu_prayer as luganda_prayer 
        FROM chapter_prayers cp 
        JOIN bible_books bb ON cp.book_id = bb.id 
        WHERE bb.name_english = ${book} AND cp.chapter = ${chapterNum}
        ORDER BY cp.id DESC LIMIT 1
      `;
      
      return NextResponse.json(result[0] || {});
    } else {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('[introduction GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      book, 
      chapter, 
      type, 
      english_introduction, 
      luganda_introduction,
      audio_url,
      chapter_audio_url,
      closing_prayer_audio_url
    } = body;

    if (!book || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get book_id from book name
    const bookResult = await sql`
      SELECT id FROM bible_books WHERE name_english = ${book}
    `;

    if (bookResult.length === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookId = bookResult[0].id;

    if (type === 'book_introduction') {
      // Save/update book introduction
      const existing = await sql`
        SELECT id FROM book_introductions WHERE book_id = ${bookId}
      `;

      if (existing.length > 0) {
        // Update existing
        await sql`
          UPDATE book_introductions 
          SET 
            en_introduction = ${english_introduction}, 
            lu_introduction = ${luganda_introduction},
            audio_url = ${audio_url || null},
            closing_prayer_audio_url = ${closing_prayer_audio_url || null},
            updated_at = CURRENT_TIMESTAMP 
          WHERE book_id = ${bookId}
        `;
      } else {
        // Insert new
        await sql`
          INSERT INTO book_introductions (
            book_id, 
            en_introduction, 
            lu_introduction,
            audio_url,
            closing_prayer_audio_url
          ) 
          VALUES (
            ${bookId}, 
            ${english_introduction}, 
            ${luganda_introduction},
            ${audio_url || null},
            ${closing_prayer_audio_url || null}
          )
        `;
      }

      return NextResponse.json({ message: 'Book introduction saved successfully' });
    } else if (type === 'chapter_introduction' && chapter) {
      // Save/update chapter introduction
      const chapterNum = parseInt(chapter);
      const existing = await sql`
        SELECT id FROM chapter_introductions WHERE book_id = ${bookId} AND chapter = ${chapterNum}
      `;

      if (existing.length > 0) {
        // Update existing
        await sql`
          UPDATE chapter_introductions 
          SET 
            en_introduction = ${english_introduction}, 
            lu_introduction = ${luganda_introduction},
            audio_url = ${audio_url || null},
            chapter_audio_url = ${chapter_audio_url || null},
            closing_prayer_audio_url = ${closing_prayer_audio_url || null},
            updated_at = CURRENT_TIMESTAMP 
          WHERE book_id = ${bookId} AND chapter = ${chapterNum}
        `;
      } else {
        // Insert new
        await sql`
          INSERT INTO chapter_introductions (
            book_id, 
            chapter, 
            en_introduction, 
            lu_introduction,
            audio_url,
            chapter_audio_url,
            closing_prayer_audio_url
          ) 
          VALUES (
            ${bookId}, 
            ${chapterNum}, 
            ${english_introduction}, 
            ${luganda_introduction},
            ${audio_url || null},
            ${chapter_audio_url || null},
            ${closing_prayer_audio_url || null}
          )
        `;
      }

      return NextResponse.json({ message: 'Chapter introduction saved successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid type or missing chapter' }, { status: 400 });
    }
  } catch (error) {
    console.error('[introduction POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save introduction' }, { status: 500 });
  }
}
