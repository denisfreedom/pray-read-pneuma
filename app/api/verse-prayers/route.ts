import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const headers = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/verse-prayers
 * Fetch prayer passages for a specific verse or chapter
 * 
 * Query Parameters:
 * - bookId: Bible book ID
 * - chapter: Chapter number
 * - verseNumber: (Optional) Specific verse number for individual prayers
 * - book_number: (Legacy) Alternative to bookId
 * 
 * Returns:
 * - If verseNumber provided: Single prayer object {english_prayer, luganda_prayer}
 * - If only chapter provided: Array of all prayers in chapter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');
    const bookNumber = searchParams.get('book_number');
    const chapter = searchParams.get('chapter');
    const verseNumber = searchParams.get('verseNumber');

    if (!chapter) {
      return NextResponse.json(
        { error: 'Missing chapter parameter' },
        { status: 400, headers }
      );
    }

    // Determine the actual book_id to use
    let actualBookId;
    
    if (bookId) {
      // If bookId is provided directly, use it
      actualBookId = parseInt(bookId);
    } else if (bookNumber) {
      // If book_number is provided, look up the book_id from bible_books table
      const bookResult = await sql`
        SELECT id FROM bible_books WHERE book_number = ${parseInt(bookNumber)} LIMIT 1
      `;
      if (bookResult.length === 0) {
        return NextResponse.json(
          { error: `Book with number ${bookNumber} not found` },
          { status: 404, headers }
        );
      }
      actualBookId = bookResult[0].id;
    } else {
      return NextResponse.json(
        { error: 'Missing bookId or book_number parameter' },
        { status: 400, headers }
      );
    }

    // If verseNumber is provided, fetch single verse prayer
    if (verseNumber) {
      const result = await sql`
        SELECT 
          id,
          book_id,
          chapter,
          verse_number,
          english_prayer,
          luganda_prayer,
          created_at,
          updated_at
        FROM verse_prayers
        WHERE book_id = ${actualBookId}
          AND chapter = ${parseInt(chapter)}
          AND verse_number = ${parseInt(verseNumber)}
        LIMIT 1
      `;
      
      if (result.length > 0) {
        return NextResponse.json(result[0], { headers });
      } else {
        return NextResponse.json(null, { headers });
      }
    }

    // Otherwise fetch all prayers in the chapter
    const prayers = await sql`
      SELECT 
        id,
        verse_number,
        english_prayer,
        luganda_prayer,
        created_at,
        updated_at
      FROM verse_prayers
      WHERE book_id = ${actualBookId}
        AND chapter = ${parseInt(chapter)}
      ORDER BY verse_number ASC
    `;

    return NextResponse.json(prayers, { headers });
  } catch (error) {
    console.error('Error fetching verse prayers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prayers' },
      { status: 500, headers }
    );
  }
}

/**
 * POST /api/verse-prayers
 * Save or update prayer passage for a verse (UPSERT - no duplicates)
 * 
 * Body Parameters:
 * - bookId: Bible book ID
 * - chapter: Chapter number
 * - verseNumber: Verse number
 * - english_prayer: English prayer text
 * - luganda_prayer: Luganda prayer text
 * 
 * Returns: {success: true, message: string}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, book_id, chapter, verseNumber, verse_number, english_prayer, luganda_prayer } = body;

    // Support both parameter naming conventions
    const effectiveBookId = bookId || book_id;
    const effectiveVerseNumber = verseNumber || verse_number;

    if (!effectiveBookId || !chapter || effectiveVerseNumber === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, chapter, verseNumber' },
        { status: 400, headers }
      );
    }

    // Check if prayer already exists
    const existing = await sql`
      SELECT id FROM verse_prayers
      WHERE book_id = ${effectiveBookId}
        AND chapter = ${chapter}
        AND verse_number = ${effectiveVerseNumber}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update existing prayer
      await sql`
        UPDATE verse_prayers
        SET 
          english_prayer = ${english_prayer},
          luganda_prayer = ${luganda_prayer},
          updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
      return NextResponse.json(
        { success: true, message: 'Prayer passage updated successfully!' },
        { headers }
      );
    } else {
      // Insert new prayer
      await sql`
        INSERT INTO verse_prayers (book_id, chapter, verse_number, english_prayer, luganda_prayer, created_at, updated_at)
        VALUES (${effectiveBookId}, ${chapter}, ${effectiveVerseNumber}, ${english_prayer}, ${luganda_prayer}, NOW(), NOW())
      `;
      return NextResponse.json(
        { success: true, message: 'Prayer passage saved successfully!' },
        { headers }
      );
    }
  } catch (error) {
    console.error('Error saving verse prayer:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to save prayer';
    return NextResponse.json(
      { error: errorMsg, message: `Failed to save prayer: ${errorMsg}` },
      { status: 500, headers }
    );
  }
}

/**
 * DELETE /api/verse-prayers
 * Delete a prayer passage
 * 
 * Query Parameters:
 * - id: Prayer ID to delete
 * 
 * Returns: {success: true, message: string}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400, headers }
      );
    }

    const result = await sql`
      DELETE FROM verse_prayers
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse.json(
      { success: true, message: 'Prayer passage deleted successfully!' },
      { headers }
    );
  } catch (error) {
    console.error('Error deleting verse prayer:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete prayer';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500, headers }
    );
  }
}
