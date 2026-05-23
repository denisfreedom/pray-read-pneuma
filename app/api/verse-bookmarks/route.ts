import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: 'userEmail is required' },
        { status: 400 }
      );
    }

    const bookmarks = await sql`
      SELECT 
        b.id,
        b.book_id,
        b.chapter,
        b.verse_number,
        b.created_at,
        v.text_english,
        v.text_luganda,
        bb.name_english,
        bb.name_luganda
      FROM verse_bookmarks b
      LEFT JOIN bible_verses v ON v.book_id = b.book_id 
        AND v.chapter = b.chapter 
        AND v.verse = b.verse_number
      LEFT JOIN bible_books bb ON b.book_id = bb.id
      WHERE b.user_email = ${userEmail}
      ORDER BY b.created_at DESC
    `;

    return NextResponse.json({ success: true, bookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bookmarks', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, bookId, chapter, verseNumber } = body;

    if (!userEmail || !bookId || !chapter || verseNumber === undefined) {
      return NextResponse.json(
        { success: false, message: 'userEmail, bookId, chapter, and verseNumber are required' },
        { status: 400 }
      );
    }

    // Check if bookmark already exists
    const existing = await sql`
      SELECT id FROM verse_bookmarks
      WHERE user_email = ${userEmail}
        AND book_id = ${bookId}
        AND chapter = ${chapter}
        AND verse_number = ${verseNumber}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Verse already bookmarked' },
        { status: 400 }
      );
    }

    // Create new bookmark
    const result = await sql`
      INSERT INTO verse_bookmarks (user_email, book_id, chapter, verse_number, created_at)
      VALUES (${userEmail}, ${bookId}, ${chapter}, ${verseNumber}, NOW())
      RETURNING *
    `;

    return NextResponse.json({ success: true, bookmark: result[0] });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create bookmark', error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userEmail = searchParams.get('userEmail');
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const verseNumber = searchParams.get('verseNumber');

    if (!userEmail || !bookId || !chapter || !verseNumber) {
      return NextResponse.json(
        { success: false, message: 'userEmail, bookId, chapter, and verseNumber are required' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM verse_bookmarks
      WHERE user_email = ${userEmail}
        AND book_id = ${parseInt(bookId)}
        AND chapter = ${parseInt(chapter)}
        AND verse_number = ${parseInt(verseNumber)}
    `;

    return NextResponse.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete bookmark', error: String(error) },
      { status: 500 }
    );
  }
}
