import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Never cache

const cacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const language = searchParams.get('language') || 'english';
    const full = searchParams.get('full');

    // If requesting a specific book by name (for deep linking)
    if (name) {
      const decodedName = decodeURIComponent(name);
      const books = await sql`
        SELECT 
          id,
          book_number,
          name_english,
          name_luganda,
          abbreviation_english,
          abbreviation_luganda,
          testament,
          total_chapters AS chapters
        FROM bible_books 
        WHERE LOWER(name_english) = LOWER(${decodedName}) 
           OR LOWER(name_luganda) = LOWER(${decodedName})
        LIMIT 1
      `;

      if (books.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Book not found' },
          { status: 404, headers: cacheHeaders }
        );
      }

      return NextResponse.json({
        success: true,
        book: books[0]
      }, { headers: cacheHeaders });
    }

    // If requesting a specific book by ID or book_number
    if (id) {
      const bookId = parseInt(id);
      if (isNaN(bookId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid book ID' },
          { status: 400 }
        );
      }

      // Try to find by book_number first (new URL pattern), then by id (legacy)
      const books = await sql`
        SELECT 
          id,
          book_number,
          name_english,
          name_luganda,
          abbreviation_english,
          abbreviation_luganda,
          testament,
          total_chapters AS chapters
        FROM bible_books 
        WHERE book_number = ${bookId} OR id = ${bookId}
        LIMIT 1
      `;

      if (books.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Book not found' },
          { status: 404, headers: cacheHeaders }
        );
      }

      return NextResponse.json({
        success: true,
        book: books[0]
      }, { headers: cacheHeaders });
    }

    // If full=true, return all book details (for admin panel)
    if (full === 'true') {
      const books = await sql`
        SELECT 
          id,
          book_number,
          name_english,
          name_luganda,
          abbreviation_english,
          abbreviation_luganda,
          testament,
          total_chapters
        FROM bible_books 
        ORDER BY book_number
      `;
      return NextResponse.json(books, { headers: cacheHeaders });
    }

    // Otherwise, return all books with full details
    const books = await sql`
      SELECT 
        id,
        book_number,
        name_english,
        name_luganda,
        abbreviation_english,
        abbreviation_luganda,
        testament,
        total_chapters
      FROM bible_books 
      ORDER BY book_number
    `;

    return NextResponse.json(books, { headers: cacheHeaders });
  } catch (error) {
    console.error('Error fetching Bible books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Bible books' },
      { status: 500, headers: cacheHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookName, bookNumber, luBookName, testament, chapters } = body;

    // Validate required fields
    if (!bookName || !bookNumber || !luBookName || !testament || !chapters) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if book number already exists
    const existing = await sql`
      SELECT id FROM bible_books WHERE book_number = ${bookNumber}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Book number already exists' },
        { status: 400 }
      );
    }

    // Generate abbreviations (first 4 letters or less)
    const enAbbr = bookName.substring(0, Math.min(4, bookName.length));
    const luAbbr = luBookName.substring(0, Math.min(4, luBookName.length));

    // Insert the new book
    await sql`
      INSERT INTO bible_books (
        book_number,
        name_english,
        name_luganda,
        abbreviation_english,
        abbreviation_luganda,
        testament,
        total_chapters
      ) VALUES (
        ${bookNumber},
        ${bookName},
        ${luBookName},
        ${enAbbr},
        ${luAbbr},
        ${testament},
        ${chapters}
      )
    `;

    return NextResponse.json({
      success: true,
      message: 'Book added successfully'
    });
  } catch (error) {
    console.error('Error adding Bible book:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add book' },
      { status: 500 }
    );
  }
}
