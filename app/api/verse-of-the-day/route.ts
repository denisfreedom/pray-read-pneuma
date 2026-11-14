import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

// GET /api/verse-of-the-day — FIXED
// THE BUG: the old code returned { success, date, verse: v, ...v }.
// The verse object v itself has a field called `verse` (the verse NUMBER, e.g. 28),
// so spreading ...v AFTER `verse: v` overwrote the verse OBJECT with the NUMBER.
// Clients then got data.verse = 28, and read 28.name_english -> undefined,
// 28.chapter -> undefined, 28.verse -> undefined. That is exactly the
// "undefined undefined:undefined" the page showed, with no verse text.
// Fixed: spread FIRST, then put `verse: v` LAST, so data.verse is the object
// and the flat fields (data.text_english etc.) still work for older pages.
const FALLBACK = {
  id: 0, book_id: 43, book_number: 43, chapter: 3, verse: 16,
  text_english: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
  text_luganda: 'Kubanga Katonda bwe yayagala ensi, n’awa Omwana we omu yekka, buli amukkiriza aleme kuzikirira wabula abeere n’obulamu obutaggwaawo.',
  name_english: 'John', name_luganda: 'Yokaana',
};

function todayKey(): string {
  // Kampala date (Africa/Kampala, UTC+3) — day flips at Kampala midnight, not server midnight
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch { return new Date().toISOString().slice(0, 10); }
}

function daySeed(dateStr: string): number {
  // Simple stable hash of "YYYY-MM-DD" -> 0..999999
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) { h ^= dateStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

export async function GET() {
  const date = todayKey();
  try {
    const countResult: any[] = await sql`
      SELECT COUNT(*) as total FROM bible_verses
      WHERE text_english IS NOT NULL AND text_english != ''
        AND text_luganda IS NOT NULL AND text_luganda != ''`;
    const totalVerses = parseInt(String(countResult[0]?.total || '0'), 10);
    if (!totalVerses) {
      return NextResponse.json({ success: true, date, ...FALLBACK, verse: FALLBACK, fallback: true });
    }
    // Deterministic index for today — same verse for everyone, all day
    const index = daySeed(date) % totalVerses;
    const verses: any[] = await sql`
      SELECT v.id, v.book_id, b.book_number, v.chapter, v.verse,
             v.text_english, v.text_luganda, b.name_english, b.name_luganda
      FROM bible_verses v
      JOIN bible_books b ON v.book_id = b.id
      WHERE v.text_english IS NOT NULL AND v.text_english != ''
        AND v.text_luganda IS NOT NULL AND v.text_luganda != ''
      ORDER BY v.id LIMIT 1 OFFSET ${index}`;
    if (!verses.length) {
      return NextResponse.json({ success: true, date, ...FALLBACK, verse: FALLBACK, fallback: true });
    }
    const v = verses[0];
    // Spread FIRST, verse object LAST — data.verse is the full object.
    return NextResponse.json({ success: true, date, ...v, verse: v });
  } catch (error: any) {
    console.error('Error fetching verse of the day:', error);
    // Never 500 with no verse — the popup can always show the fallback
    return NextResponse.json({ success: true, date, ...FALLBACK, verse: FALLBACK, fallback: true, warning: 'Using fallback verse — DB unavailable: ' + (error.message || '') });
  }
}
