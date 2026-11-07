import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

/* [STRIPPED 66 bytes] */
/*  BOOK CHAPTER BULK IMPORT API                                 */
/*  POST one chapter at a time (Admin Panel sends chapter batches) */
/*  Body: { book, introduction?, introduction_luganda?,           */
/*          closing_prayer?, closing_prayer_luganda?,             */
/*          chapter: { chapter, introduction?, introduction_luganda?, */
/*                     verses: [{ verse, pray_read?, pray_read_luganda?, */
/*                                cross_references?: string[] }],  */
/*                     closing_prayer?, closing_prayer_luganda? }, */
/*          overwrite?: boolean }                                 */
/*  Re-upload = UPSERT (ON CONFLICT DO UPDATE), never duplicates.  */
/* [STRIPPED 66 bytes] */

type CanonBook = { id: number; name: string; aliases: string[] };
const CANON: CanonBook[] = [
  { id: 1, name: 'Genesis', aliases: ['gen', 'ge', 'gn'] },
  { id: 2, name: 'Exodus', aliases: ['ex', 'exod', 'exo'] },
  { id: 3, name: 'Leviticus', aliases: ['lev', 'lv'] },
  { id: 4, name: 'Numbers', aliases: ['num', 'nu', 'nm'] },
  { id: 5, name: 'Deuteronomy', aliases: ['deut', 'deu', 'dt'] },
  { id: 6, name: 'Joshua', aliases: ['josh', 'jos'] },
  { id: 7, name: 'Judges', aliases: ['judg', 'jdg', 'jg'] },
  { id: 8, name: 'Ruth', aliases: ['ru'] },
  { id: 9, name: '1 Samuel', aliases: ['1 sam', '1sam', '1 sa', '1sa'] },
  { id: 10, name: '2 Samuel', aliases: ['2 sam', '2sam', '2 sa', '2sa'] },
  { id: 11, name: '1 Kings', aliases: ['1 kings', '1kings', '1 kgs', '1kgs', '1 ki', '1ki'] },
  { id: 12, name: '2 Kings', aliases: ['2 kings', '2kings', '2 kgs', '2kgs', '2 ki', '2ki'] },
  { id: 13, name: '1 Chronicles', aliases: ['1 chron', '1chron', '1 chr', '1chr', '1 ch', '1ch'] },
  { id: 14, name: '2 Chronicles', aliases: ['2 chron', '2chron', '2 chr', '2chr', '2 ch', '2ch'] },
  { id: 15, name: 'Ezra', aliases: ['ezr'] },
  { id: 16, name: 'Nehemiah', aliases: ['neh', 'ne'] },
  { id: 17, name: 'Esther', aliases: ['est', 'es'] },
  { id: 18, name: 'Job', aliases: ['jb'] },
  { id: 19, name: 'Psalms', aliases: ['ps', 'psalm', 'psa', 'psal'] },
  { id: 20, name: 'Proverbs', aliases: ['prov', 'pro', 'prv', 'pr'] },
  { id: 21, name: 'Ecclesiastes', aliases: ['eccl', 'eccles', 'ecc', 'ec'] },
  { id: 22, name: 'Song of Solomon', aliases: ['song', 'song of songs', 'sos', 'cant', 'canticles'] },
  { id: 23, name: 'Isaiah', aliases: ['isa', 'is'] },
  { id: 24, name: 'Jeremiah', aliases: ['jer', 'je'] },
  { id: 25, name: 'Lamentations', aliases: ['lam', 'la'] },
  { id: 26, name: 'Ezekiel', aliases: ['ezek', 'eze', 'ez'] },
  { id: 27, name: 'Daniel', aliases: ['dan', 'da', 'dn'] },
  { id: 28, name: 'Hosea', aliases: ['hos', 'ho'] },
  { id: 29, name: 'Joel', aliases: ['jl'] },
  { id: 30, name: 'Amos', aliases: ['am'] },
  { id: 31, name: 'Obadiah', aliases: ['obad', 'ob'] },
  { id: 32, name: 'Jonah', aliases: ['jon', 'jnh'] },
  { id: 33, name: 'Micah', aliases: ['mic', 'mi'] },
  { id: 34, name: 'Nahum', aliases: ['nah', 'na'] },
  { id: 35, name: 'Habakkuk', aliases: ['hab', 'hb'] },
  { id: 36, name: 'Zephaniah', aliases: ['zeph', 'zep', 'zp'] },
  { id: 37, name: 'Haggai', aliases: ['hag', 'hg'] },
  { id: 38, name: 'Zechariah', aliases: ['zech', 'zec', 'zc'] },
  { id: 39, name: 'Malachi', aliases: ['mal', 'ml'] },
  { id: 40, name: 'Matthew', aliases: ['matt', 'mt', 'mat'] },
  { id: 41, name: 'Mark', aliases: ['mk', 'mrk'] },
  { id: 42, name: 'Luke', aliases: ['lk', 'lu'] },
  { id: 43, name: 'John', aliases: ['jn', 'joh', 'jh'] },
  { id: 44, name: 'Acts', aliases: ['ac'] },
  { id: 45, name: 'Romans', aliases: ['rom', 'ro', 'rm'] },
  { id: 46, name: '1 Corinthians', aliases: ['1 cor', '1cor', '1 co', '1co'] },
  { id: 47, name: '2 Corinthians', aliases: ['2 cor', '2cor', '2 co', '2co'] },
  { id: 48, name: 'Galatians', aliases: ['gal', 'ga'] },
  { id: 49, name: 'Ephesians', aliases: ['eph', 'ep'] },
  { id: 50, name: 'Philippians', aliases: ['phil', 'php', 'pp'] },
  { id: 51, name: 'Colossians', aliases: ['col', 'cl'] },
  { id: 52, name: '1 Thessalonians', aliases: ['1 thess', '1thess', '1 thes', '1thes', '1 th', '1th'] },
  { id: 53, name: '2 Thessalonians', aliases: ['2 thess', '2thess', '2 thes', '2thes', '2 th', '2th'] },
  { id: 54, name: '1 Timothy', aliases: ['1 tim', '1tim', '1 ti', '1ti'] },
  { id: 55, name: '2 Timothy', aliases: ['2 tim', '2tim', '2 ti', '2ti'] },
  { id: 56, name: 'Titus', aliases: ['tit', 'ti'] },
  { id: 57, name: 'Philemon', aliases: ['phlm', 'phm', 'pm'] },
  { id: 58, name: 'Hebrews', aliases: ['heb', 'he'] },
  { id: 59, name: 'James', aliases: ['jas', 'ja', 'jm'] },
  { id: 60, name: '1 Peter', aliases: ['1 pet', '1pet', '1 pe', '1pe', '1 pt', '1pt'] },
  { id: 61, name: '2 Peter', aliases: ['2 pet', '2pet', '2 pe', '2pe', '2 pt', '2pt'] },
  { id: 62, name: '1 John', aliases: ['1 jn', '1jn', '1 jo', '1jo', '1 jh', '1jh'] },
  { id: 63, name: '2 John', aliases: ['2 jn', '2jn', '2 jo', '2jo', '2 jh', '2jh'] },
  { id: 64, name: '3 John', aliases: ['3 jn', '3jn', '3 jo', '3jo', '3 jh', '3jh'] },
  { id: 65, name: 'Jude', aliases: ['jud', 'jd'] },
  { id: 66, name: 'Revelation', aliases: ['rev', 're', 'rv', 'apoc'] },
];
function norm(s: string) { return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim(); }
function resolveBook(raw: string, dbBooks: any[]): { id: number; name: string } | null {
  const key = norm(raw);
  for (const b of dbBooks) {
    const cands = [b.name_english, b.name_luganda, b.abbreviation_english, b.abbreviation_luganda].filter(Boolean);
    for (const c of cands) if (norm(String(c)) === key) return { id: b.book_number ?? b.id, name: b.name_english };
  }
  const sorted = [...CANON].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) if (norm(c.name) === key) return { id: c.id, name: c.name };
  for (const c of sorted) if (c.aliases.some((a) => norm(a) === key)) return { id: c.id, name: c.name };
  return null;
}
function expandVerseList(list: string): number[] {
  const out: number[] = [];
  for (const part of list.split(',')) {
    const p = part.trim(); if (!p) continue;
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { const s = parseInt(m[1], 10); const e = parseInt(m[2], 10); if (e < s) { out.push(s); continue; } for (let v = s; v <= e; v++) out.push(v); }
    else if (/^\d+$/.test(p)) out.push(parseInt(p, 10));
  }
  return out;
}
// Same parser as modal + cPanel — full/short/dotted, ranges, comma-lists
function parseRefs(input: string, dbBooks: any[]) {
  const refs: Array<{ book_id: number; chapter: number; verse: number }> = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let lastBook: { id: number; name: string } | null = null;
  for (const rawChunk of input.split(/[;\n]+/)) {
    const chunk = rawChunk.trim().replace(/\s+/g, ' ');
    if (!chunk) continue;
    const m = chunk.match(/^(.+?)\s+(\d+)\s*:\s*([\d\s,\-]+)$/);
    if (!m) {
      const bare = chunk.match(/^(\d+)\s*:\s*([\d\s,\-]+)$/);
      if (bare && lastBook) {
        const ch = parseInt(bare[1], 10);
        for (const v of expandVerseList(bare[2])) {
          const k = `${lastBook.id}:${ch}:${v}`; if (seen.has(k)) continue; seen.add(k);
          refs.push({ book_id: lastBook.id, chapter: ch, verse: v });
        }
        continue;
      }
      errors.push(`Could not understand: "${chunk}"`);
      continue;
    }
    const resolved = resolveBook(m[1].trim(), dbBooks);
    if (!resolved) { errors.push(`Unknown book: "${m[1].trim()}" in "${chunk}"`); continue; }
    lastBook = resolved;
    const ch = parseInt(m[2], 10);
    for (const v of expandVerseList(m[3])) {
      const k = `${resolved.id}:${ch}:${v}`; if (seen.has(k)) continue; seen.add(k);
      refs.push({ book_id: resolved.id, chapter: ch, verse: v });
    }
  }
  return { refs, errors };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { book, chapter, overwrite = true } = body;
    if (!book || !chapter?.chapter) {
      return NextResponse.json({ error: 'Missing book or chapter.chapter' }, { status: 400 });
    }
    const dbBooks = await sql`SELECT id, name_english, name_luganda, abbreviation_english, abbreviation_luganda FROM bible_books`;
    const source = resolveBook(String(book), dbBooks);
    if (!source) return NextResponse.json({ error: `Unknown book: "${book}" — use English name, e.g. Genesis` }, { status: 400 });

    const chNum: number = chapter.chapter;
    let saved = { intros: 0, prayRead: 0, xrefs: 0, prayers: 0 };

    // 1) Book intro / book closing prayer — sent only on first / last chapter batch
    if (body.introduction || body.introduction_luganda) {
      await sql`
        INSERT INTO book_introductions (book_id, introduction_english, introduction_luganda)
        VALUES (${source.id}, ${body.introduction ?? null}, ${body.introduction_luganda ?? null})
        ON CONFLICT (book_id) DO UPDATE SET
          introduction_english = COALESCE(EXCLUDED.introduction_english, book_introductions.introduction_english),
          introduction_luganda = COALESCE(EXCLUDED.introduction_luganda, book_introductions.introduction_luganda),
          updated_at = NOW()`;
      saved.intros++;
    }
    if (body.closing_prayer || body.closing_prayer_luganda) {
      await sql`
        INSERT INTO book_closing_prayers (book_id, prayer_english, prayer_luganda)
        VALUES (${source.id}, ${body.closing_prayer ?? null}, ${body.closing_prayer_luganda ?? null})
        ON CONFLICT (book_id) DO UPDATE SET
          prayer_english = COALESCE(EXCLUDED.prayer_english, book_closing_prayers.prayer_english),
          prayer_luganda = COALESCE(EXCLUDED.prayer_luganda, book_closing_prayers.prayer_luganda),
          updated_at = NOW()`;
      saved.prayers++;
    }

    // 2) Chapter intro + chapter closing prayer
    if (chapter.introduction || chapter.introduction_luganda || chapter.closing_prayer || chapter.closing_prayer_luganda) {
      await sql`
        INSERT INTO chapter_introductions (book_id, chapter, introduction_english, introduction_luganda, closing_prayer_english, closing_prayer_luganda)
        VALUES (${source.id}, ${chNum}, ${chapter.introduction ?? null}, ${chapter.introduction_luganda ?? null}, ${chapter.closing_prayer ?? null}, ${chapter.closing_prayer_luganda ?? null})
        ON CONFLICT (book_id, chapter) DO UPDATE SET
          introduction_english = COALESCE(EXCLUDED.introduction_english, chapter_introductions.introduction_english),
          introduction_luganda = COALESCE(EXCLUDED.introduction_luganda, chapter_introductions.introduction_luganda),
          closing_prayer_english = COALESCE(EXCLUDED.closing_prayer_english, chapter_introductions.closing_prayer_english),
          closing_prayer_luganda = COALESCE(EXCLUDED.closing_prayer_luganda, chapter_introductions.closing_prayer_luganda),
          updated_at = NOW()`;
      saved.intros++;
    }

    // 3) Verses: pray-read + cross-refs
    const xrefErrors: string[] = [];
    for (const v of chapter.verses ?? []) {
      if (!v.verse) continue;
      // Pray-read
      if (v.pray_read || v.pray_read_luganda) {
        await sql`
          INSERT INTO verse_pray_read (book_id, chapter, verse, pray_read_english, pray_read_luganda)
          VALUES (${source.id}, ${chNum}, ${v.verse}, ${v.pray_read ?? null}, ${v.pray_read_luganda ?? null})
          ON CONFLICT (book_id, chapter, verse) DO UPDATE SET
            pray_read_english = COALESCE(EXCLUDED.pray_read_english, verse_pray_read.pray_read_english),
            pray_read_luganda = COALESCE(EXCLUDED.pray_read_luganda, verse_pray_read.pray_read_luganda),
            updated_at = NOW()`;
        saved.prayRead++;
      }
      // Cross-refs — array of strings, each string may itself hold many refs
      const rawList: string[] = Array.isArray(v.cross_references) ? v.cross_references : [];
      for (const raw of rawList) {
        const { refs, errors } = parseRefs(String(raw), dbBooks);
        xrefErrors.push(...errors.map((e) => `Ch ${chNum}:${v.verse} — ${e}`));
        for (const r of refs) {
          // Delete-then-insert per (source, target) keeps re-upload from duplicating
          if (overwrite) {
            await sql`DELETE FROM cross_references WHERE source_book_id = ${source.id} AND source_chapter = ${chNum} AND source_verse = ${v.verse} AND target_book_id = ${r.book_id} AND target_chapter = ${r.chapter} AND target_verse = ${r.verse}`;
          }
          await sql`
            INSERT INTO cross_references (source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes)
            VALUES (${source.id}, ${chNum}, ${v.verse}, ${r.book_id}, ${r.chapter}, ${r.verse}, 'related', 'Added via Book Chapter Bulk Import')
            ON CONFLICT DO NOTHING`;
          saved.xrefs++;
        }
      }
    }

    return NextResponse.json({ ok: true, book: source.name, chapter: chNum, saved, xrefErrors });
  } catch (e) {
    console.error('book-chapter-bulk-import error:', e);
    return NextResponse.json({ error: 'Import failed: ' + (e as Error).message }, { status: 500 });
  }
}
