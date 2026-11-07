import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const cacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// FALLBACK: 66 books — so site never goes blank if DB is down
const FALLBACK_BOOKS = [
  { id: 1, book_number: 1, name_english: 'Genesis', name_luganda: 'Olubereberye', abbreviation_english: 'Gen', abbreviation_luganda: 'Olub', testament: 'Old Testament', total_chapters: 50 },
  { id: 2, book_number: 2, name_english: 'Exodus', name_luganda: 'Okuva', abbreviation_english: 'Exod', abbreviation_luganda: 'Okuv', testament: 'Old Testament', total_chapters: 40 },
  { id: 3, book_number: 3, name_english: 'Leviticus', name_luganda: 'Abaleevi', abbreviation_english: 'Lev', abbreviation_luganda: 'Abal', testament: 'Old Testament', total_chapters: 27 },
  { id: 4, book_number: 4, name_english: 'Numbers', name_luganda: 'Okubala', abbreviation_english: 'Num', abbreviation_luganda: 'Okub', testament: 'Old Testament', total_chapters: 36 },
  { id: 5, book_number: 5, name_english: 'Deuteronomy', name_luganda: 'Ekyamateeka', abbreviation_english: 'Deut', abbreviation_luganda: 'Ekyam', testament: 'Old Testament', total_chapters: 34 },
  { id: 6, book_number: 6, name_english: 'Joshua', name_luganda: 'Yoswa', abbreviation_english: 'Josh', abbreviation_luganda: 'Yosw', testament: 'Old Testament', total_chapters: 24 },
  { id: 7, book_number: 7, name_english: 'Judges', name_luganda: 'Abalamuzi', abbreviation_english: 'Judg', abbreviation_luganda: 'Abal', testament: 'Old Testament', total_chapters: 21 },
  { id: 8, book_number: 8, name_english: 'Ruth', name_luganda: 'Luusi', abbreviation_english: 'Ruth', abbreviation_luganda: 'Luus', testament: 'Old Testament', total_chapters: 4 },
  { id: 9, book_number: 9, name_english: '1 Samuel', name_luganda: '1 Samwiri', abbreviation_english: '1 Sam', abbreviation_luganda: '1 Sam', testament: 'Old Testament', total_chapters: 31 },
  { id: 10, book_number: 10, name_english: '2 Samuel', name_luganda: '2 Samwiri', abbreviation_english: '2 Sam', abbreviation_luganda: '2 Sam', testament: 'Old Testament', total_chapters: 24 },
  { id: 11, book_number: 11, name_english: '1 Kings', name_luganda: '1 Bakabaka', abbreviation_english: '1 Kings', abbreviation_luganda: '1 Baka', testament: 'Old Testament', total_chapters: 22 },
  { id: 12, book_number: 12, name_english: '2 Kings', name_luganda: '2 Bakabaka', abbreviation_english: '2 Kings', abbreviation_luganda: '2 Baka', testament: 'Old Testament', total_chapters: 25 },
  { id: 13, book_number: 13, name_english: '1 Chronicles', name_luganda: '1 Ebyomumirembe', abbreviation_english: '1 Chron', abbreviation_luganda: '1 Ebyo', testament: 'Old Testament', total_chapters: 29 },
  { id: 14, book_number: 14, name_english: '2 Chronicles', name_luganda: '2 Ebyomumirembe', abbreviation_english: '2 Chron', abbreviation_luganda: '2 Ebyo', testament: 'Old Testament', total_chapters: 36 },
  { id: 15, book_number: 15, name_english: 'Ezra', name_luganda: 'Ezera', abbreviation_english: 'Ezra', abbreviation_luganda: 'Ezer', testament: 'Old Testament', total_chapters: 10 },
  { id: 16, book_number: 16, name_english: 'Nehemiah', name_luganda: 'Nekkemiya', abbreviation_english: 'Neh', abbreviation_luganda: 'Nekk', testament: 'Old Testament', total_chapters: 13 },
  { id: 17, book_number: 17, name_english: 'Esther', name_luganda: 'Eseza', abbreviation_english: 'Esth', abbreviation_luganda: 'Esez', testament: 'Old Testament', total_chapters: 10 },
  { id: 18, book_number: 18, name_english: 'Job', name_luganda: 'Yobu', abbreviation_english: 'Job', abbreviation_luganda: 'Yobu', testament: 'Old Testament', total_chapters: 42 },
  { id: 19, book_number: 19, name_english: 'Psalms', name_luganda: 'Zabbuli', abbreviation_english: 'Ps', abbreviation_luganda: 'Zabb', testament: 'Old Testament', total_chapters: 150 },
  { id: 20, book_number: 20, name_english: 'Proverbs', name_luganda: 'Engero', abbreviation_english: 'Prov', abbreviation_luganda: 'Enge', testament: 'Old Testament', total_chapters: 31 },
  { id: 21, book_number: 21, name_english: 'Ecclesiastes', name_luganda: 'Omubuulizi', abbreviation_english: 'Eccl', abbreviation_luganda: 'Omub', testament: 'Old Testament', total_chapters: 12 },
  { id: 22, book_number: 22, name_english: 'Song of Solomon', name_luganda: 'Oluyimba', abbreviation_english: 'Song', abbreviation_luganda: 'Oluy', testament: 'Old Testament', total_chapters: 8 },
  { id: 23, book_number: 23, name_english: 'Isaiah', name_luganda: 'Isaaya', abbreviation_english: 'Isa', abbreviation_luganda: 'Isaa', testament: 'Old Testament', total_chapters: 66 },
  { id: 24, book_number: 24, name_english: 'Jeremiah', name_luganda: 'Yeremiya', abbreviation_english: 'Jer', abbreviation_luganda: 'Yere', testament: 'Old Testament', total_chapters: 52 },
  { id: 25, book_number: 25, name_english: 'Lamentations', name_luganda: 'Okukungubaga', abbreviation_english: 'Lam', abbreviation_luganda: 'Okuk', testament: 'Old Testament', total_chapters: 5 },
  { id: 26, book_number: 26, name_english: 'Ezekiel', name_luganda: 'Ezekyeri', abbreviation_english: 'Ezek', abbreviation_luganda: 'Ezek', testament: 'Old Testament', total_chapters: 48 },
  { id: 27, book_number: 27, name_english: 'Daniel', name_luganda: 'Danyeri', abbreviation_english: 'Dan', abbreviation_luganda: 'Dany', testament: 'Old Testament', total_chapters: 12 },
  { id: 28, book_number: 28, name_english: 'Hosea', name_luganda: 'Koseya', abbreviation_english: 'Hos', abbreviation_luganda: 'Kose', testament: 'Old Testament', total_chapters: 14 },
  { id: 29, book_number: 29, name_english: 'Joel', name_luganda: 'Yoweeri', abbreviation_english: 'Joel', abbreviation_luganda: 'Yowe', testament: 'Old Testament', total_chapters: 3 },
  { id: 30, book_number: 30, name_english: 'Amos', name_luganda: 'Amosi', abbreviation_english: 'Amos', abbreviation_luganda: 'Amos', testament: 'Old Testament', total_chapters: 9 },
  { id: 31, book_number: 31, name_english: 'Obadiah', name_luganda: 'Obadiya', abbreviation_english: 'Obad', abbreviation_luganda: 'Obad', testament: 'Old Testament', total_chapters: 1 },
  { id: 32, book_number: 32, name_english: 'Jonah', name_luganda: 'Yona', abbreviation_english: 'Jonah', abbreviation_luganda: 'Yona', testament: 'Old Testament', total_chapters: 4 },
  { id: 33, book_number: 33, name_english: 'Micah', name_luganda: 'Mikka', abbreviation_english: 'Mic', abbreviation_luganda: 'Mikk', testament: 'Old Testament', total_chapters: 7 },
  { id: 34, book_number: 34, name_english: 'Nahum', name_luganda: 'Nakumu', abbreviation_english: 'Nah', abbreviation_luganda: 'Naku', testament: 'Old Testament', total_chapters: 3 },
  { id: 35, book_number: 35, name_english: 'Habakkuk', name_luganda: 'Kabbakuuku', abbreviation_english: 'Hab', abbreviation_luganda: 'Kabb', testament: 'Old Testament', total_chapters: 3 },
  { id: 36, book_number: 36, name_english: 'Zephaniah', name_luganda: 'Zefaniya', abbreviation_english: 'Zeph', abbreviation_luganda: 'Zefa', testament: 'Old Testament', total_chapters: 3 },
  { id: 37, book_number: 37, name_english: 'Haggai', name_luganda: 'Kaggayi', abbreviation_english: 'Hag', abbreviation_luganda: 'Kagg', testament: 'Old Testament', total_chapters: 2 },
  { id: 38, book_number: 38, name_english: 'Zechariah', name_luganda: 'Zekkariya', abbreviation_english: 'Zech', abbreviation_luganda: 'Zekk', testament: 'Old Testament', total_chapters: 14 },
  { id: 39, book_number: 39, name_english: 'Malachi', name_luganda: 'Malaki', abbreviation_english: 'Mal', abbreviation_luganda: 'Mala', testament: 'Old Testament', total_chapters: 4 },
  { id: 40, book_number: 40, name_english: 'Matthew', name_luganda: 'Matayo', abbreviation_english: 'Matt', abbreviation_luganda: 'Mata', testament: 'New Testament', total_chapters: 28 },
  { id: 41, book_number: 41, name_english: 'Mark', name_luganda: 'Mako', abbreviation_english: 'Mark', abbreviation_luganda: 'Mako', testament: 'New Testament', total_chapters: 16 },
  { id: 42, book_number: 42, name_english: 'Luke', name_luganda: 'Lukka', abbreviation_english: 'Luke', abbreviation_luganda: 'Lukk', testament: 'New Testament', total_chapters: 24 },
  { id: 43, book_number: 43, name_english: 'John', name_luganda: 'Yokaana', abbreviation_english: 'John', abbreviation_luganda: 'Yoka', testament: 'New Testament', total_chapters: 21 },
  { id: 44, book_number: 44, name_english: 'Acts', name_luganda: 'Ebikolwa', abbreviation_english: 'Acts', abbreviation_luganda: 'Ebik', testament: 'New Testament', total_chapters: 28 },
  { id: 45, book_number: 45, name_english: 'Romans', name_luganda: 'Abaruumi', abbreviation_english: 'Rom', abbreviation_luganda: 'Abar', testament: 'New Testament', total_chapters: 16 },
  { id: 46, book_number: 46, name_english: '1 Corinthians', name_luganda: '1 Abakkolinso', abbreviation_english: '1 Cor', abbreviation_luganda: '1 Abak', testament: 'New Testament', total_chapters: 16 },
  { id: 47, book_number: 47, name_english: '2 Corinthians', name_luganda: '2 Abakkolinso', abbreviation_english: '2 Cor', abbreviation_luganda: '2 Abak', testament: 'New Testament', total_chapters: 13 },
  { id: 48, book_number: 48, name_english: 'Galatians', name_luganda: 'Abagalatiya', abbreviation_english: 'Gal', abbreviation_luganda: 'Abag', testament: 'New Testament', total_chapters: 6 },
  { id: 49, book_number: 49, name_english: 'Ephesians', name_luganda: 'Abaefeso', abbreviation_english: 'Eph', abbreviation_luganda: 'Abae', testament: 'New Testament', total_chapters: 6 },
  { id: 50, book_number: 50, name_english: 'Philippians', name_luganda: 'Abafiripi', abbreviation_english: 'Phil', abbreviation_luganda: 'Abaf', testament: 'New Testament', total_chapters: 4 },
  { id: 51, book_number: 51, name_english: 'Colossians', name_luganda: 'Abakkolosaayi', abbreviation_english: 'Col', abbreviation_luganda: 'Abak', testament: 'New Testament', total_chapters: 4 },
  { id: 52, book_number: 52, name_english: '1 Thessalonians', name_luganda: '1 Abasesaloniika', abbreviation_english: '1 Thess', abbreviation_luganda: '1 Abas', testament: 'New Testament', total_chapters: 5 },
  { id: 53, book_number: 53, name_english: '2 Thessalonians', name_luganda: '2 Abasesaloniika', abbreviation_english: '2 Thess', abbreviation_luganda: '2 Abas', testament: 'New Testament', total_chapters: 3 },
  { id: 54, book_number: 54, name_english: '1 Timothy', name_luganda: '1 Timosewo', abbreviation_english: '1 Tim', abbreviation_luganda: '1 Timo', testament: 'New Testament', total_chapters: 6 },
  { id: 55, book_number: 55, name_english: '2 Timothy', name_luganda: '2 Timosewo', abbreviation_english: '2 Tim', abbreviation_luganda: '2 Timo', testament: 'New Testament', total_chapters: 4 },
  { id: 56, book_number: 56, name_english: 'Titus', name_luganda: 'Tiito', abbreviation_english: 'Titus', abbreviation_luganda: 'Tiit', testament: 'New Testament', total_chapters: 3 },
  { id: 57, book_number: 57, name_english: 'Philemon', name_luganda: 'Firemooni', abbreviation_english: 'Phlm', abbreviation_luganda: 'Fire', testament: 'New Testament', total_chapters: 1 },
  { id: 58, book_number: 58, name_english: 'Hebrews', name_luganda: 'Abaebbulaniya', abbreviation_english: 'Heb', abbreviation_luganda: 'Abae', testament: 'New Testament', total_chapters: 13 },
  { id: 59, book_number: 59, name_english: 'James', name_luganda: 'Yakobo', abbreviation_english: 'James', abbreviation_luganda: 'Yako', testament: 'New Testament', total_chapters: 5 },
  { id: 60, book_number: 60, name_english: '1 Peter', name_luganda: '1 Peetero', abbreviation_english: '1 Pet', abbreviation_luganda: '1 Peet', testament: 'New Testament', total_chapters: 5 },
  { id: 61, book_number: 61, name_english: '2 Peter', name_luganda: '2 Peetero', abbreviation_english: '2 Pet', abbreviation_luganda: '2 Peet', testament: 'New Testament', total_chapters: 3 },
  { id: 62, book_number: 62, name_english: '1 John', name_luganda: '1 Yokaana', abbreviation_english: '1 John', abbreviation_luganda: '1 Yoka', testament: 'New Testament', total_chapters: 5 },
  { id: 63, book_number: 63, name_english: '2 John', name_luganda: '2 Yokaana', abbreviation_english: '2 John', abbreviation_luganda: '2 Yoka', testament: 'New Testament', total_chapters: 1 },
  { id: 64, book_number: 64, name_english: '3 John', name_luganda: '3 Yokaana', abbreviation_english: '3 John', abbreviation_luganda: '3 Yoka', testament: 'New Testament', total_chapters: 1 },
  { id: 65, book_number: 65, name_english: 'Jude', name_luganda: 'Yuda', abbreviation_english: 'Jude', abbreviation_luganda: 'Yuda', testament: 'New Testament', total_chapters: 1 },
  { id: 66, book_number: 66, name_english: 'Revelation', name_luganda: 'Okubikkulirwa', abbreviation_english: 'Rev', abbreviation_luganda: 'Okub', testament: 'New Testament', total_chapters: 22 },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const full = searchParams.get('full');

    // Single book by name — try DB, fallback to static list
    if (name) {
      const decodedName = decodeURIComponent(name).toLowerCase();
      try {
        const books = await sql`
          SELECT id, book_number, name_english, name_luganda, abbreviation_english, abbreviation_luganda, testament, total_chapters AS chapters
          FROM bible_books 
          WHERE LOWER(name_english) = LOWER(${decodedName}) OR LOWER(name_luganda) = LOWER(${decodedName})
          LIMIT 1
        `;
        if (books.length > 0) return NextResponse.json({ success: true, book: books[0] }, { headers: cacheHeaders });
      } catch (e) { console.error('DB fallback to static for name:', e); }
      const found = FALLBACK_BOOKS.find(b => b.name_english.toLowerCase() === decodedName || b.name_luganda.toLowerCase() === decodedName);
      if (!found) return NextResponse.json({ success: false, message: 'Book not found' }, { status: 404, headers: cacheHeaders });
      return NextResponse.json({ success: true, book: found }, { headers: cacheHeaders });
    }

    // Single book by ID
    if (id) {
      const bookId = parseInt(id);
      if (isNaN(bookId)) return NextResponse.json({ success: false, message: 'Invalid book ID' }, { status: 400 });
      try {
        const books = await sql`
          SELECT id, book_number, name_english, name_luganda, abbreviation_english, abbreviation_luganda, testament, total_chapters AS chapters
          FROM bible_books WHERE book_number = ${bookId} OR id = ${bookId} LIMIT 1
        `;
        if (books.length > 0) return NextResponse.json({ success: true, book: books[0] }, { headers: cacheHeaders });
      } catch (e) { console.error('DB fallback to static for id:', e); }
      const found = FALLBACK_BOOKS.find(b => b.book_number === bookId || b.id === bookId);
      if (!found) return NextResponse.json({ success: false, message: 'Book not found' }, { status: 404, headers: cacheHeaders });
      return NextResponse.json({ success: true, book: found }, { headers: cacheHeaders });
    }

    // All books — try DB first, fallback to static if DB fails or empty
    try {
      const books = await sql`
        SELECT id, book_number, name_english, name_luganda, abbreviation_english, abbreviation_luganda, testament, total_chapters
        FROM bible_books ORDER BY book_number
      `;
      if (books && books.length > 0) {
        return NextResponse.json(books, { headers: cacheHeaders });
      }
      console.warn('DB returned 0 books, using fallback');
    } catch (e) {
      console.error('DB error, using FALLBACK_BOOKS:', e);
    }
    // Always return array — never 500 for book list
    return NextResponse.json(FALLBACK_BOOKS, { headers: cacheHeaders });

  } catch (error) {
    console.error('Error fetching Bible books:', error);
    // Last resort: still return books so UI never blanks
    return NextResponse.json(FALLBACK_BOOKS, { headers: cacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookName, bookNumber, luBookName, testament, chapters } = body;
    if (!bookName || !bookNumber || !luBookName || !testament || !chapters) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }
    const existing = await sql`SELECT id FROM bible_books WHERE book_number = ${bookNumber}`;
    if (existing.length > 0) return NextResponse.json({ success: false, message: 'Book number already exists' }, { status: 400 });
    const enAbbr = bookName.substring(0, Math.min(4, bookName.length));
    const luAbbr = luBookName.substring(0, Math.min(4, luBookName.length));
    await sql`
      INSERT INTO bible_books (book_number, name_english, name_luganda, abbreviation_english, abbreviation_luganda, testament, total_chapters)
      VALUES (${bookNumber}, ${bookName}, ${luBookName}, ${enAbbr}, ${luAbbr}, ${testament}, ${chapters})
    `;
    return NextResponse.json({ success: true, message: 'Book added successfully' });
  } catch (error) {
    console.error('Error adding Bible book:', error);
    return NextResponse.json({ success: false, message: 'Failed to add book' }, { status: 500 });
  }
}
