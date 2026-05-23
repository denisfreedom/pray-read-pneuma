import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Never cache

export async function GET(request: NextRequest) {
  // Force fresh response - no caching
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
  try {
    const { searchParams } = request.nextUrl;

    const bookId = searchParams.get('bookId');
    const book = searchParams.get('book'); // Can be book ID or book name
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    const recent = searchParams.get('recent');
    const available = searchParams.get('available');

    // Get all books that have verses
    if (available === 'true') {
      const booksWithVerses = await sql`
        SELECT DISTINCT book_id 
        FROM bible_verses
        ORDER BY book_id
      `;
      return NextResponse.json(booksWithVerses, { headers });
    }

    // Get recent verses
    if (recent) {
      const limit = parseInt(recent);
      const verses = await sql`
        SELECT 
          v.id,
          v.book_id,
          v.chapter,
          v.verse        AS verse_number,
          v.text_english AS english_text,
          v.text_luganda AS luganda_text,
          v.created_at,
          COALESCE(b.name_english, '') AS book_name
        FROM bible_verses v
        LEFT JOIN bible_books b ON v.book_id = b.id
        ORDER BY v.created_at DESC
        LIMIT ${limit}
      `;
      return NextResponse.json({ success: true, verses }, { headers });
    }

    // Get a specific verse by book, chapter, and verse number
    if ((book || bookId) && chapter && verse) {
      const chapterInt = parseInt(chapter);
      const verseInt = parseInt(verse);
      
      let actualBookId: number;
      
      // If book is provided (can be ID or name), resolve it
      if (book) {
        const bookIdNum = parseInt(book);
        if (!isNaN(bookIdNum)) {
          // book is a number - use it as book_id
          actualBookId = bookIdNum;
        } else {
          return NextResponse.json(
            { success: false, message: 'Invalid book parameter' },
            { status: 400, headers }
          );
        }
      } else {
        actualBookId = parseInt(bookId!);
      }
      
      console.log(`📖 Fetching single verse: book_id=${actualBookId}, chapter=${chapterInt}, verse=${verseInt}`);
      
      const verses = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse,
          COALESCE(text_english, '') as text_english,
          COALESCE(text_luganda, '') as text_luganda,
          created_at
        FROM bible_verses 
        WHERE book_id = ${actualBookId} AND chapter = ${chapterInt} AND verse = ${verseInt}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      return NextResponse.json({ success: true, verses: verses || [] }, { headers });
    }

    // Get verses by book and chapter
    if ((book || bookId) && chapter) {
      let bookIdInt: number;
      
      // Resolve book parameter
      if (book) {
        bookIdInt = parseInt(book);
      } else {
        bookIdInt = parseInt(bookId!);
      }
      
      const chapterInt = parseInt(chapter);

      if (isNaN(bookIdInt) || isNaN(chapterInt)) {
        return NextResponse.json(
          { success: false, message: `Invalid parameters: book="${book || bookId}", chapter="${chapter}"` },
          { status: 400 }
        );
      }

      console.log(`📖 Fetching verses for book_number=${bookIdInt}, chapter=${chapterInt}`);

      // First, get the actual book_id from the book_number
      const bookLookup = await sql`
        SELECT id FROM bible_books WHERE book_number = ${bookIdInt}
      `;

      if (bookLookup.length === 0) {
        console.error(`❌ No book found with book_number=${bookIdInt}`);
        return NextResponse.json({ success: true, verses: [] }, { headers });
      }

      const actualBookId = bookLookup[0].id;
      console.log(`📖 Resolved book_number ${bookIdInt} to book_id ${actualBookId}`);

      const verses = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse,
          COALESCE(text_english, '') as text_english,
          COALESCE(text_luganda, '') as text_luganda,
          created_at
        FROM bible_verses 
        WHERE book_id = ${actualBookId} AND chapter = ${chapterInt} 
        ORDER BY verse ASC, created_at DESC
      `;

      // Deduplicate verses by verse (keep only the most recent one)
      const seenVerses = new Set<number>();
      const uniqueVerses = verses.filter((verse: any) => {
        if (seenVerses.has(verse.verse)) {
          console.log(`⚠️ Removing duplicate verse ${verse.verse} (ID: ${verse.id})`);
          return false;
        }
        seenVerses.add(verse.verse);
        return true;
      });

      console.log(`📊 Found ${verses.length} verses (${uniqueVerses.length} unique after deduplication)`);
      if (uniqueVerses.length > 0) {
        uniqueVerses.forEach((v, idx) => {
          if (idx < 3) { // Log first 3 verses
            console.log(`Verse ${v.verse}: EN length=${(v.text_english || '').length}, LU length=${(v.text_luganda || '').length}`);
          }
        });
      }

      return NextResponse.json({ success: true, verses: uniqueVerses || [] }, { headers });
    }

    return NextResponse.json(
      { success: false, message: `Missing required parameters. Received: book="${book || bookId}", chapter="${chapter}", verse="${verse}"` },
      { status: 400, headers }
    );
  } catch (error) {
    console.error('Error fetching verses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch verses', error: String(error) },
      { status: 500, headers }
    );
  }
}

// Helper function to clean HTML from RichTextEditor wrapper and Word/Office garbage
function cleanVerseText(text: string | undefined): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Step 1: Remove the RichTextEditor wrapper div (data-styled-content)
  cleaned = cleaned.replace(/<div[^>]*data-styled-content[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/div>\s*$/gi, '');
  
  // Step 2: Aggressively remove ALL Word/Office-specific HTML
  // Remove class="MsoXxx" and similar Word classes
  cleaned = cleaned.replace(/\s*class="[^"]*Mso[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*class="[^"]*mso[^"]*"/gi, '');
  
  // Remove style attributes containing mso-* properties
  cleaned = cleaned.replace(/\s*style="[^"]*mso-[^"]*"/gi, '');
  
  // Remove lang attributes
  cleaned = cleaned.replace(/\s*lang="[^"]*"/gi, '');
  
  // Remove Word namespace elements like <o:p></o:p>
  cleaned = cleaned.replace(/<o:p><\/o:p>/gi, '');
  cleaned = cleaned.replace(/<o:p>/gi, '');
  cleaned = cleaned.replace(/<\/o:p>/gi, '');
  
  // Remove xmlns and other namespace declarations
  cleaned = cleaned.replace(/\s*xmlns[^=]*="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*xmlns:[^=]*="[^"]*"/gi, '');
  
  // Remove line-height styles
  cleaned = cleaned.replace(/line-height:[^;]*;?/gi, '');
  
  // Remove text-indent, margin-*, padding-* with mso
  cleaned = cleaned.replace(/\s*style="[^"]*margin[^"]*"/gi, '');
  cleaned = cleaned.replace(/margin-top-alt:[^;]*;?/gi, '');
  cleaned = cleaned.replace(/margin-bottom-alt:[^;]*;?/gi, '');
  
  // Remove outline-level
  cleaned = cleaned.replace(/mso-outline-level:[^;]*;?/gi, '');
  
  // Remove empty style attributes
  cleaned = cleaned.replace(/\s*style=""\s*/gi, '');
  // Clean up multiple spaces, tabs, and excessive newlines
  cleaned = cleaned.replace(/\s\s+/g, ' ');  // Multiple spaces to single
  cleaned = cleaned.replace(/\n\n+/g, '\n'); // Multiple newlines to single
  
  // Trim whitespace from beginning and end
  cleaned = cleaned.trim();
  
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { book, chapter, verse_number, english_text, luganda_text, language = 'both' } = body;

    // Clean the text from RichTextEditor wrapper
    english_text = cleanVerseText(english_text);
    luganda_text = cleanVerseText(luganda_text);

    console.log('📝 Saving verse:', { book, chapter, verse_number, language, english_text: english_text?.substring(0, 50), luganda_text: luganda_text?.substring(0, 50) });

    if (!book || !chapter || verse_number === undefined || verse_number === null || verse_number === '') {
      return NextResponse.json(
        { success: false, message: 'Book, chapter, and verse number are required' },
        { status: 400 }
      );
    }

    // Get book_id from book name
    const bookResult = await sql`
      SELECT id FROM bible_books WHERE name_english = ${book}
    `;

    if (bookResult.length === 0) {
      return NextResponse.json(
        { success: false, message: `Book "${book}" not found` },
        { status: 404 }
      );
    }

    const bookId = bookResult[0].id;
    const verseNum = parseInt(verse_number);

    // Use PostgreSQL UPSERT to handle duplicates automatically
    // This replaces existing verses if they already exist - preventing duplicates
    const chapterNum = parseInt(chapter);
    
    if (language === 'english') {
      await sql`
        INSERT INTO bible_verses (book_id, chapter, verse, text_english, text_luganda, created_at)
        VALUES (${bookId}, ${chapterNum}, ${verseNum}, ${english_text}, '', NOW())
        ON CONFLICT (book_id, chapter, verse) DO UPDATE SET
          text_english = ${english_text},
          created_at = NOW()
      `;
      console.log('✅ English verse inserted/updated');
      return NextResponse.json({ success: true, message: 'English verse saved successfully' });
    } else if (language === 'luganda') {
      await sql`
        INSERT INTO bible_verses (book_id, chapter, verse, text_english, text_luganda, created_at)
        VALUES (${bookId}, ${chapterNum}, ${verseNum}, '', ${luganda_text}, NOW())
        ON CONFLICT (book_id, chapter, verse) DO UPDATE SET
          text_luganda = ${luganda_text},
          created_at = NOW()
      `;
      console.log('✅ Luganda verse inserted/updated');
      return NextResponse.json({ success: true, message: 'Luganda verse saved successfully' });
    } else {
      // Both languages
      await sql`
        INSERT INTO bible_verses (book_id, chapter, verse, text_english, text_luganda, created_at)
        VALUES (${bookId}, ${chapterNum}, ${verseNum}, ${english_text}, ${luganda_text}, NOW())
        ON CONFLICT (book_id, chapter, verse) DO UPDATE SET
          text_english = ${english_text},
          text_luganda = ${luganda_text},
          created_at = NOW()
      `;
      console.log('✅ Verse inserted/updated (both languages)');
      return NextResponse.json({ success: true, message: 'Verse saved successfully' });
    }
  } catch (error) {
    console.error('❌ Error saving verse:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save verse', error: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    let { bookId, chapter, verseNumber, text_english, text_luganda, formatted_content } = body;

    console.log('🔄 PUT request received:', { bookId, chapter, verseNumber });

    // Clean the text
    text_english = cleanVerseText(text_english);
    text_luganda = cleanVerseText(text_luganda);

    // Validate all required fields
    if (!bookId || bookId === undefined || bookId === null) {
      return NextResponse.json(
        { success: false, message: 'bookId is required and must not be empty' },
        { status: 400 }
      );
    }
    if (!chapter && chapter !== 0) {
      return NextResponse.json(
        { success: false, message: 'chapter is required' },
        { status: 400 }
      );
    }
    if (!verseNumber && verseNumber !== 0) {
      return NextResponse.json(
        { success: false, message: 'verseNumber is required' },
        { status: 400 }
      );
    }

    // Ensure numeric values
    const numBookId = Number(bookId);
    const numChapter = Number(chapter);
    const numVerse = Number(verseNumber);

    if (isNaN(numBookId) || isNaN(numChapter) || isNaN(numVerse)) {
      return NextResponse.json(
        { success: false, message: 'bookId, chapter, and verseNumber must be valid numbers' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed. Updating verse:', { numBookId, numChapter, numVerse });

    // Use PostgreSQL UPSERT to handle duplicates automatically
    // This replaces existing verses if they already exist - preventing duplicates
    await sql`
      INSERT INTO bible_verses (book_id, chapter, verse, text_english, text_luganda, formatted_content, created_at)
      VALUES (${numBookId}, ${numChapter}, ${numVerse}, ${text_english}, ${text_luganda}, ${JSON.stringify(formatted_content)}, NOW())
      ON CONFLICT (book_id, chapter, verse) DO UPDATE SET
        text_english = ${text_english}, 
        text_luganda = ${text_luganda},
        formatted_content = ${JSON.stringify(formatted_content)},
        created_at = NOW()
    `;
    console.log('✅ Verse inserted/updated successfully with formatting');

    return NextResponse.json({ success: true, message: 'Verse updated successfully with formatting' });
  } catch (error) {
    console.error('❌ Error updating verse:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update verse', error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Verse ID is required' },
        { status: 400 }
      );
    }

    await sql`DELETE FROM bible_verses WHERE id = ${parseInt(id)}`;

    return NextResponse.json({ success: true, message: 'Verse deleted successfully' });
  } catch (error) {
    console.error('Error deleting verse:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete verse' },
      { status: 400 }
    );
  }
}
