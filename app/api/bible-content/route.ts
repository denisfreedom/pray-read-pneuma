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
    const type = searchParams.get('type'); // 'book_prayer' or 'chapter_prayer'

    if (type === 'book_prayer' && book) {
      // Get book prayer
      const result = await sql`
        SELECT bp.en_prayer as english_content, bp.lu_prayer as luganda_content, bp.closing_prayer_audio_url as audio_url
        FROM book_prayers bp 
        JOIN bible_books bb ON bp.book_id = bb.id 
        WHERE bb.name_english = ${book}
        ORDER BY bp.id DESC LIMIT 1
      `;
      
      return NextResponse.json(result[0] || {});
    } else if (type === 'chapter_prayer' && book && chapter) {
      // Get chapter prayer
      const chapterNum = parseInt(chapter);
      const result = await sql`
        SELECT cp.en_prayer as english_content, cp.lu_prayer as luganda_content, cp.chapter_closing_prayer_audio_url as audio_url
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
    console.error('[bible-content GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book, chapter, verse, type, english_content, luganda_content, audio_url } = body;

    // 🔍 DETAILED PAYLOAD LOGGING
    console.log('========================================');
    console.log('📨 [bible-content POST] EXACT PAYLOAD RECEIVED:');
    console.log('========================================');
    console.log('📌 Prayer Type:', type);
    console.log('📌 Book:', book);
    console.log('📌 Chapter:', chapter);
    console.log('📌 Verse:', verse || 'NOT PROVIDED');
    console.log('📌 English Content:', english_content ? `"${english_content.substring(0, 60)}..."` : 'EMPTY');
    console.log('📌 Luganda Content:', luganda_content ? `"${luganda_content.substring(0, 60)}..."` : 'EMPTY');
    console.log('📌 Audio URL:', audio_url || 'NOT PROVIDED');
    console.log('📌 Full Body:', JSON.stringify(body, null, 2));
    console.log('========================================');

    // Determine prayer type and validate
    let prayerType = type;
    console.log('🔎 [ROUTING] Analyzing prayer type...');
    
    if (type === 'book_prayer') {
      console.log('✅ [ROUTING] → BOOK PRAYER (book_prayers table)');
      console.log('   IDs EXPECTED: book_id=' + book + ', chapter=N/A, verse=N/A');
    } else if (type === 'chapter_prayer') {
      console.log('✅ [ROUTING] → CHAPTER PRAYER (chapter_prayers table)');
      console.log('   IDs EXPECTED: book_id=' + book + ', chapter=' + chapter + ', verse=N/A');
    } else if (type === 'verse_prayer') {
      console.log('✅ [ROUTING] → VERSE PRAYER (verse_prayers table)');
      console.log('   IDs EXPECTED: book_id=' + book + ', chapter=' + chapter + ', verse=' + verse);
    } else {
      console.log('❌ [ROUTING] UNKNOWN TYPE:', type);
    }

    if (!book || !type) {
      console.error('❌ [bible-content POST] Missing required fields:', { book, type });
      return NextResponse.json({ error: 'Missing required fields', success: false }, { status: 400 });
    }

    // Get book_id from book name
    const bookResult = await sql`
      SELECT id FROM bible_books WHERE name_english = ${book}
    `;

    if (bookResult.length === 0) {
      console.error('❌ [bible-content POST] Book not found:', book);
      return NextResponse.json({ error: 'Book not found', success: false }, { status: 404 });
    }

    const bookId = bookResult[0].id;
    console.log('✅ [LOOKUP] Found book_id:', bookId, 'for book:', book);

    if (type === 'book_prayer') {
      console.log('\n========== SAVING BOOK PRAYER ==========');
      console.log('🎯 TABLE: book_prayers');
      console.log('🎯 book_id:', bookId);
      console.log('🎯 book_name:', book);
      console.log('🎯 audio_url:', audio_url || 'NOT PROVIDED');
      
      // Save/update book prayer
      const existing = await sql`
        SELECT id FROM book_prayers WHERE book_id = ${bookId}
      `;

      if (existing.length > 0) {
        // Update existing
        console.log('🔄 UPDATING existing record (id:', existing[0].id, ')');
        const updateResult = await sql`
          UPDATE book_prayers 
          SET en_prayer = ${english_content}, lu_prayer = ${luganda_content}, closing_prayer_audio_url = ${audio_url || null}, updated_at = CURRENT_TIMESTAMP 
          WHERE book_id = ${bookId}
          RETURNING id
        `;
        console.log('✅ Book prayer UPDATED successfully');
        console.log('📍 Updated records:', updateResult.length);
        console.log('📍 Fields updated: en_prayer, lu_prayer, closing_prayer_audio_url');
        console.log('========================================\n');
      } else {
        // Insert new
        console.log('✨ INSERTING new record');
        const inserted = await sql`
          INSERT INTO book_prayers (book_id, en_prayer, lu_prayer, closing_prayer_audio_url) 
          VALUES (${bookId}, ${english_content}, ${luganda_content}, ${audio_url || null})
          RETURNING id
        `;
        console.log('✅ Book prayer INSERTED successfully (id:', inserted[0]?.id, ')');
        console.log('📍 Fields: en_prayer, lu_prayer, closing_prayer_audio_url');
        console.log('========================================\n');
      }

      return NextResponse.json({ message: 'Book prayer saved successfully', success: true });
    } else if (type === 'chapter_prayer' && chapter) {
      const chapterNum = parseInt(chapter);
      console.log('\n========== SAVING CHAPTER PRAYER ==========');
      console.log('🎯 TABLE: chapter_prayers');
      console.log('🎯 book_id:', bookId);
      console.log('🎯 book_name:', book);
      console.log('🎯 chapter:', chapterNum);
      console.log('🎯 audio_url:', audio_url || 'NOT PROVIDED');
      
      // Save/update chapter prayer
      const existing = await sql`
        SELECT id FROM chapter_prayers WHERE book_id = ${bookId} AND chapter = ${chapterNum}
      `;

      if (existing.length > 0) {
        // Update existing
        console.log('🔄 UPDATING existing record (id:', existing[0].id, ')');
        const updateResult = await sql`
          UPDATE chapter_prayers 
          SET en_prayer = ${english_content}, lu_prayer = ${luganda_content}, chapter_closing_prayer_audio_url = ${audio_url || null}, updated_at = CURRENT_TIMESTAMP 
          WHERE book_id = ${bookId} AND chapter = ${chapterNum}
          RETURNING id
        `;
        console.log('✅ Chapter prayer UPDATED successfully');
        console.log('📍 Updated records:', updateResult.length);
        console.log('📍 Fields updated: en_prayer, lu_prayer, chapter_closing_prayer_audio_url');
        console.log('========================================\n');
      } else {
        // Insert new
        console.log('✨ INSERTING new record');
        const inserted = await sql`
          INSERT INTO chapter_prayers (book_id, chapter, en_prayer, lu_prayer, chapter_closing_prayer_audio_url) 
          VALUES (${bookId}, ${chapterNum}, ${english_content}, ${luganda_content}, ${audio_url || null})
          RETURNING id
        `;
        console.log('✅ Chapter prayer INSERTED successfully (id:', inserted[0]?.id, ')');
        console.log('📍 Fields: en_prayer, lu_prayer, chapter_closing_prayer_audio_url');
        console.log('========================================\n');
      }

      return NextResponse.json({ message: 'Chapter prayer saved successfully', success: true });
    } else if (type === 'verse_prayer' && chapter && verse) {
      const chapterNum = parseInt(chapter);
      const verseNum = parseInt(verse);
      console.log('\n========== SAVING VERSE PRAYER ==========');
      console.log('🎯 TABLE: verse_prayers');
      console.log('🎯 book_id:', bookId);
      console.log('🎯 book_name:', book);
      console.log('🎯 chapter:', chapterNum);
      console.log('🎯 verse:', verseNum);
      
      // Save/update verse prayer
      const existing = await sql`
        SELECT id FROM verse_prayers WHERE book_id = ${bookId} AND chapter = ${chapterNum} AND verse_number = ${verseNum}
      `;

      if (existing.length > 0) {
        // Update existing
        console.log('🔄 UPDATING existing record (id:', existing[0].id, ')');
        const updateResult = await sql`
          UPDATE verse_prayers 
          SET english_prayer = ${english_content}, luganda_prayer = ${luganda_content}, updated_at = CURRENT_TIMESTAMP 
          WHERE book_id = ${bookId} AND chapter = ${chapterNum} AND verse_number = ${verseNum}
          RETURNING id
        `;
        console.log('✅ Verse prayer UPDATED successfully');
        console.log('📍 Updated records:', updateResult.length);
        console.log('========================================\n');
      } else {
        // Insert new
        console.log('✨ INSERTING new record');
        const inserted = await sql`
          INSERT INTO verse_prayers (book_id, chapter, verse_number, english_prayer, luganda_prayer) 
          VALUES (${bookId}, ${chapterNum}, ${verseNum}, ${english_content}, ${luganda_content})
          RETURNING id
        `;
        console.log('✅ Verse prayer INSERTED successfully (id:', inserted[0]?.id, ')');
        console.log('========================================\n');
      }

      return NextResponse.json({ message: 'Verse prayer saved successfully', success: true });
    } else {
      console.error('❌ Invalid type or missing required IDs. Type:', type, 'Chapter:', chapter, 'Verse:', verse);
      return NextResponse.json({ error: 'Invalid type or missing required parameters', success: false }, { status: 400 });
    }
  } catch (error) {
    console.error('[bible-content POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save content', success: false }, { status: 500 });
  }
}
