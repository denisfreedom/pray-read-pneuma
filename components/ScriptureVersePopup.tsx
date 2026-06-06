'use client';

import { useState, useCallback } from 'react';
import { X, BookOpen } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
export interface ScriptureRef {
  book: string;       // canonical book name (or '' if context-only)
  chapter: number;    // 0 if context-only (v. / vv.)
  verse: number;
  verseEnd?: number;  // for ranges like 1–25
  display: string;
}

interface PopupState {
  ref: ScriptureRef;
  verses: { number: number; text: string }[];
  loading: boolean;
}

// ── Context type passed to parsers ───────────────────────────────────────────
export interface ScriptureContext {
  book: string;     // e.g. "Jude"
  bookNumber: number; // e.g. 65
  chapter: number;  // e.g. 1
}

// ── Regex patterns ───────────────────────────────────────────────────────────
// 1. Full reference: "Book Chapter:Verse" or "Book Chapter:Verse–Verse"
//    e.g. "Jude 1:1", "John 3:16–21", "2 Cor. 5:1-10", "Philem. 1:18", "2 Corinthians 3:6"
//    - Book name: optional leading digit, then one or more capitalized words,
//      each optionally followed by a dot (abbreviations like "Philem.", "Cor.")
//    - Allows optional whitespace/newlines between book name and chapter number
//    - Handles both full book names and abbreviations
//    - Must have word boundaries to avoid matching partial text
//    - Enhanced with more boundary characters for better detection
export const FULL_REF_RE =
  /(?:^|(?<=[^a-zA-Z0-9])|(?<=[\\(\\[\\{,;:\\.\\?!\\s]))((?:\\d\\s*)?[A-Z][a-zA-Z]*(?:\\.|\\\\b)(?:\\s+[A-Za-z]+(?:\\.|\\\\b))*|Song\\s+of\\s+Solomon|Song\\s+of\\s+Songs)\\s+(\\d+):(\\d+)(?:\\s*(?:[–\\-—]|to)\\s*(\\d+))?(?=[^a-zA-Z0-9]|[\\)\\]\\},;:\\.\\?!\\s]|$)/g;

// 2. Chapter:Verse range without book name (context-based): "2:11", "2:11-25"
//    Must be standalone, not part of a larger number or word
const CTX_CHAPTER_VERSE_RE = /(?:^|(?<=[^a-zA-Z0-9]))(\d+):(\d+)(?:[–\-—](\d+))?(?=[^a-zA-Z0-9]|$)/g;

// 3. "vv. N–N" or "vv. N, N" or "v. N" or "v.N" (context-based, dot optional space)
//    Must be standalone
const VV_RE = /(?:^|(?<=[^a-zA-Z0-9]))vv?\.?\s*(\d+)(?:[–\-—,]\s*(\d+))?(?=[^a-zA-Z0-9]|$)/g;

// ── Strip HTML to plain text ─────────────────────────────────────────────────
export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '');
}

// ── Clean MS Word / LibreOffice paste artifacts ───────────────────────────────
export function cleanWordHtml(html: string): string {
  return html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if[\s\S]*?\[endif\]-->/gi, '')
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<\/?[wmo]:[a-zA-Z]+[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+style="([^"]*)"/gi, (match, styles) => {
      if (/mso-|mso_/.test(styles)) return '';
      return match;
    })
    .replace(/\s+class="Mso[^"]*"/gi, '')
    .replace(/<p[^>]*>\s*(&nbsp;|\s)*\s*<\/p>/gi, '')
    .replace(/<o:p[\s\S]*?<\/o:p>/gi, '')
    .replace(/<\/o:p>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Book name alias map ───────────────────────────────────────────────────────
// Includes dotted abbreviations: strip trailing dots before lookup
const BOOK_ALIASES: Record<string, string> = {
  // Psalms
  'psalm': 'psalms', 'ps': 'psalms', 'ps.': 'psalms', 'psa': 'psalms', 'psa.': 'psalms',
  // Song of Songs
  'song of solomon': 'song of songs', 'song': 'song of songs', 'sos': 'song of songs',
  // Samuel
  '1 samuel': '1 samuel', '2 samuel': '2 samuel', '1samuel': '1 samuel', '2samuel': '2 samuel',
  '1 sam': '1 samuel', '2 sam': '2 samuel', '1 sam.': '1 samuel', '2 sam.': '2 samuel',
  // Kings
  '1 kings': '1 kings', '2 kings': '2 kings', '1kings': '1 kings', '2kings': '2 kings',
  '1 kgs': '1 kings', '2 kgs': '2 kings', '1 kgs.': '1 kings', '2 kgs.': '2 kings',
  // Chronicles
  '1 chronicles': '1 chronicles', '2 chronicles': '2 chronicles',
  '1chronicles': '1 chronicles', '2chronicles': '2 chronicles',
  '1 chr': '1 chronicles', '2 chr': '2 chronicles', '1 chron': '1 chronicles', '2 chron': '2 chronicles',
  // Corinthians
  '1 corinthians': '1 corinthians', '2 corinthians': '2 corinthians',
  '1corinthians': '1 corinthians', '2corinthians': '2 corinthians',
  '1 cor': '1 corinthians', '2 cor': '2 corinthians', '1 cor.': '1 corinthians', '2 cor.': '2 corinthians',
  // Thessalonians
  '1 thessalonians': '1 thessalonians', '2 thessalonians': '2 thessalonians',
  '1thessalonians': '1 thessalonians', '2thessalonians': '2 thessalonians',
  '1 thess': '1 thessalonians', '2 thess': '2 thessalonians',
  '1 thess.': '1 thessalonians', '2 thess.': '2 thessalonians',
  '1 th': '1 thessalonians', '2 th': '2 thessalonians',
  // Timothy
  '1 timothy': '1 timothy', '2 timothy': '2 timothy',
  '1timothy': '1 timothy', '2timothy': '2 timothy',
  '1 tim': '1 timothy', '2 tim': '2 timothy', '1 tim.': '1 timothy', '2 tim.': '2 timothy',
  // Peter
  '1 peter': '1 peter', '2 peter': '2 peter', '1peter': '1 peter', '2peter': '2 peter',
  '1 pet': '1 peter', '2 pet': '2 peter', '1 pet.': '1 peter', '2 pet.': '2 peter',
  // John epistles
  '1 john': '1 john', '2 john': '2 john', '3 john': '3 john',
  '1john': '1 john', '2john': '2 john', '3john': '3 john',
  '1 jn': '1 john', '2 jn': '2 john', '3 jn': '3 john',
  '1 jn.': '1 john', '2 jn.': '2 john', '3 jn.': '3 john',
  // OT abbreviations (with and without dots)
  'gen': 'genesis', 'gen.': 'genesis',
  'exod': 'exodus', 'exod.': 'exodus', 'exo': 'exodus', 'exo.': 'exodus',
  'lev': 'leviticus', 'lev.': 'leviticus',
  'num': 'numbers', 'num.': 'numbers',
  'deut': 'deuteronomy', 'deut.': 'deuteronomy', 'dt': 'deuteronomy',
  'josh': 'joshua', 'josh.': 'joshua', 'jos': 'joshua',
  'judg': 'judges', 'judg.': 'judges', 'jdg': 'judges',
  'isa': 'isaiah', 'isa.': 'isaiah',
  'jer': 'jeremiah', 'jer.': 'jeremiah',
  'lam': 'lamentations', 'lam.': 'lamentations',
  'ezek': 'ezekiel', 'ezek.': 'ezekiel', 'eze': 'ezekiel',
  'dan': 'daniel', 'dan.': 'daniel',
  'hos': 'hosea', 'hos.': 'hosea',
  'obad': 'obadiah', 'obad.': 'obadiah', 'ob': 'obadiah',
  'mic': 'micah', 'mic.': 'micah',
  'nah': 'nahum', 'nah.': 'nahum',
  'hab': 'habakkuk', 'hab.': 'habakkuk',
  'zeph': 'zephaniah', 'zeph.': 'zephaniah', 'zep': 'zephaniah',
  'hag': 'haggai', 'hag.': 'haggai',
  'zech': 'zechariah', 'zech.': 'zechariah', 'zec': 'zechariah',
  'mal': 'malachi', 'mal.': 'malachi',
  // NT abbreviations (with and without dots)
  'matt': 'matthew', 'matt.': 'matthew', 'mt': 'matthew',
  'mk': 'mark', 'mk.': 'mark',
  'lk': 'luke', 'lk.': 'luke',
  'jn': 'john', 'jn.': 'john',
  'rom': 'romans', 'rom.': 'romans',
  'gal': 'galatians', 'gal.': 'galatians',
  'eph': 'ephesians', 'eph.': 'ephesians',
  'phil': 'philippians', 'phil.': 'philippians',
  'col': 'colossians', 'col.': 'colossians',
  // Philemon — all common abbreviations
  'phlm': 'philemon', 'phlm.': 'philemon',
  'phm': 'philemon', 'phm.': 'philemon',
  'philem': 'philemon', 'philem.': 'philemon',
  'phile': 'philemon', 'phile.': 'philemon',
  'heb': 'hebrews', 'heb.': 'hebrews',
  'jas': 'james', 'jas.': 'james', 'jam': 'james',
  'jude': 'jude', 'jd': 'jude',
  'rev': 'revelation', 'rev.': 'revelation', 'apoc': 'revelation',
  'acts': 'acts', 'act': 'acts',
};

export function resolveBookName(name: string): string {
  const lower = name.trim().replace(/[\s\n\r]+/g, ' ').toLowerCase();
  // Direct lookup (handles "philem." etc.)
  if (BOOK_ALIASES[lower]) return BOOK_ALIASES[lower];
  // Without trailing dot: "philem." → "philem"
  const noDot = lower.replace(/\.$/, '');
  if (BOOK_ALIASES[noDot]) return BOOK_ALIASES[noDot];
  // Without spaces: "1 cor." → "1cor."
  const noSpace = lower.replace(/\s+/g, '');
  if (BOOK_ALIASES[noSpace]) return BOOK_ALIASES[noSpace];
  // Without spaces and dot: "1cor" 
  const noSpaceNoDot = noSpace.replace(/\.$/, '');
  if (BOOK_ALIASES[noSpaceNoDot]) return BOOK_ALIASES[noSpaceNoDot];
  return lower;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function lookupBookId(bookName: string): Promise<{ id: number; book_number: number } | null> {
  const res = await fetch('/api/bible-books');
  const data = await res.json();
  const books = Array.isArray(data) ? data : (data.books || []);
  const resolved = resolveBookName(bookName);
  const normalized = bookName.trim().replace(/\s+/g, ' ').toLowerCase();
  // Also try stripping trailing dot from the raw name for abbreviation matching
  const normalizedNoDot = normalized.replace(/\.$/, '');
  return books.find((b: any) => {
    const nameEn = b.name_english?.toLowerCase() || '';
    const abbr = b.abbreviation_english?.toLowerCase() || '';
    return (
      nameEn === resolved ||
      nameEn === normalized ||
      nameEn === normalizedNoDot ||
      abbr === resolved ||
      abbr === normalized ||
      abbr === normalizedNoDot
    );
  }) || null;
}

async function fetchVerseRange(
  bookId: number,
  chapter: number,
  verseStart: number,
  verseEnd: number
): Promise<{ number: number; text: string }[]> {
  const results: { number: number; text: string }[] = [];
  // The API uses ?book= (book_number) for chapter fetches, but we already have bookId (the DB id).
  // Use the specific verse endpoint for single verses, chapter endpoint for ranges.
  if (verseStart === verseEnd) {
    // Single verse: use bookId param directly
    const res = await fetch(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}&verse=${verseStart}`);
    const data = await res.json();
    const all = Array.isArray(data) ? data : (data.verses || []);
    const v = all[0];
    if (v) results.push({ number: v.verse ?? verseStart, text: v.text_english || v.text_luganda || '' });
    return results;
  }
  // For a range, fetch all verses in the chapter using bookId
  // The API: ?bookId= with ?chapter= (without ?verse=) falls to the chapter branch which reads 'book' param.
  // So pass both bookId as 'book' param (it accepts raw IDs when isNaN check passes? No — 'book' uses book_number).
  // Instead: fetch single verses in parallel for the range.
  const promises = [];
  for (let v = verseStart; v <= verseEnd; v++) {
    promises.push(
      fetch(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}&verse=${v}`)
        .then(r => r.json())
        .then(data => {
          const all = Array.isArray(data) ? data : (data.verses || []);
          const row = all[0];
          return row ? { number: v, text: row.text_english || row.text_luganda || '' } : null;
        })
        .catch(() => null)
    );
  }
  const fetched = await Promise.all(promises);
  for (const item of fetched) {
    if (item && item.text) results.push(item);
  }
  results.sort((a, b) => a.number - b.number);
  return results;
}

// ── Hook: verse fetching + popup state ───────────────────────────────────────
export function useScripturePopup() {
  const [popup, setPopup] = useState<PopupState | null>(null);

  const openVerse = useCallback(async (ref: ScriptureRef) => {
    setPopup({ ref, verses: [], loading: true });
    try {
      let bookId: number | null = null;
      let bookNum: number | null = null;

      if (ref.book) {
        const b = await lookupBookId(ref.book);
        if (!b) { setPopup({ ref, verses: [{ number: 0, text: 'Book not found.' }], loading: false }); return; }
        bookId = b.id;
        bookNum = b.book_number;
      }

      if (bookId === null) {
        setPopup({ ref, verses: [{ number: 0, text: 'Could not determine book.' }], loading: false });
        return;
      }

      const chapter = ref.chapter || 1;
      const verseStart = ref.verse;
      const verseEnd = ref.verseEnd || ref.verse;

      const verses = await fetchVerseRange(bookId, chapter, verseStart, verseEnd);
      if (!verses.length) {
        setPopup({ ref, verses: [{ number: ref.verse, text: 'Verse text not available.' }], loading: false });
      } else {
        setPopup({ ref, verses, loading: false });
      }
      // Store bookNum for navigation
      if (bookNum !== null) {
        setPopup(prev => prev ? { ...prev, _bookNum: bookNum } as any : prev);
      }
    } catch {
      setPopup({ ref, verses: [{ number: 0, text: 'Could not load verse.' }], loading: false });
    }
  }, []);

  const closePopup = useCallback(() => setPopup(null), []);

  return { popup, openVerse, closePopup };
}

// ── ScriptureVersePopup modal component ──────────────────────────────────────
interface Props {
  popup: (PopupState & { _bookNum?: number }) | null;
  onClose: () => void;
  variant?: 'light' | 'dark';
}

export function ScriptureVersePopup({ popup, onClose, variant = 'light' }: Props) {
  if (!popup) return null;

  const { ref, verses, loading, _bookNum } = popup as PopupState & { _bookNum?: number };

  const navigateTo = () => {
    if (!ref.book && !_bookNum) { onClose(); return; }
    const go = (bookNumber: number) => {
      window.location.href = `/bible-reader/${bookNumber}/${ref.chapter || 1}?verse=${ref.verse}`;
    };
    if (_bookNum) { go(_bookNum); return; }
    lookupBookId(ref.book).then(b => { if (b) go(b.book_number); }).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" style={{ animation: 'fadeInZoom 0.15s ease' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-indigo-200 text-[10px] font-semibold uppercase tracking-widest">Scripture</p>
              <h3 className="text-white font-bold text-base leading-tight">{ref.display}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-500 text-sm">Loading…</span>
            </div>
          ) : verses.length === 1 ? (
            <p className="text-gray-800 leading-relaxed text-sm italic">
              &ldquo;{verses[0].text}&rdquo;
            </p>
          ) : (
            <div className="space-y-2">
              {verses.map(v => (
                <div key={v.number} className="flex gap-2.5">
                  <span className="text-indigo-500 font-bold text-xs mt-0.5 min-w-[1.5rem]">{v.number}</span>
                  <p className="text-gray-800 leading-relaxed text-sm italic flex-1">{v.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all"
          >
            Close
          </button>
          <button
            onClick={navigateTo}
            className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 text-sm font-semibold transition-all shadow"
          >
            Open in Bible →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared button class ───────────────────────────────────────────────────────
const PILL =
  'inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-700 hover:bg-indigo-200 hover:border-indigo-400 transition-all text-xs font-semibold align-middle cursor-pointer';

// ── parseAllRefs: find ALL types of references in text ────────────────────────
// Returns array of {index, length, ref} sorted by position.
function parseAllRefs(
  text: string,
  ctx?: ScriptureContext
): Array<{ index: number; length: number; ref: ScriptureRef }> {
  const hits: Array<{ index: number; length: number; ref: ScriptureRef }> = [];

  // 1. Full refs: "Book Chapter:Verse" or "Book Chapter:Verse–Verse"
  {
    const re = new RegExp(FULL_REF_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const book = m[1].trim().replace(/\.$/, ''); // Remove trailing dot from abbreviations
      const chapter = parseInt(m[2]);
      const verse = parseInt(m[3]);
      const verseEnd = m[4] ? parseInt(m[4]) : undefined;
      const display = m[0];
      hits.push({
        index: m.index,
        length: m[0].length,
        ref: { book, chapter, verse, verseEnd, display },
      });
    }
  }

  // 2. Context-based Chapter:Verse refs (no book name), e.g. "2:11–25"
  if (ctx) {
    const re = new RegExp(CTX_CHAPTER_VERSE_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Skip if already covered by a full ref
      if (hits.some(h => m!.index >= h.index && m!.index < h.index + h.length)) continue;
      const chapter = parseInt(m[1]);
      const verse = parseInt(m[2]);
      const verseEnd = m[3] ? parseInt(m[3]) : undefined;
      const display = verseEnd ? `${ctx.book} ${chapter}:${verse}–${verseEnd}` : `${ctx.book} ${chapter}:${verse}`;
      hits.push({
        index: m.index,
        length: m[0].length,
        ref: { book: ctx.book, chapter, verse, verseEnd, display },
      });
    }
  }

  // 3. "vv. N–N" / "v. N" context-based
  if (ctx) {
    const re = new RegExp(VV_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (hits.some(h => m!.index >= h.index && m!.index < h.index + h.length)) continue;
      const verse = parseInt(m[1]);
      const verseEnd = m[2] ? parseInt(m[2]) : undefined;
      const rawDisplay = m[0]; // e.g. "vv. 1–2"
      const fullDisplay = verseEnd
        ? `${ctx.book} ${ctx.chapter}:${verse}–${verseEnd}`
        : `${ctx.book} ${ctx.chapter}:${verse}`;
      hits.push({
        index: m.index,
        length: m[0].length,
        ref: { book: ctx.book, chapter: ctx.chapter, verse, verseEnd, display: fullDisplay },
      });
      // Override display text shown in button to the original abbreviation
      hits[hits.length - 1].ref.display = fullDisplay;
      // Keep original text as button label separately — we embed it in _rawText
      (hits[hits.length - 1] as any)._rawText = rawDisplay;
    }
  }

  // Sort by position
  hits.sort((a, b) => a.index - b.index);

  // Remove overlaps: skip any hit whose range overlaps a previous one
  const filtered: typeof hits = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.index >= cursor) {
      filtered.push(h);
      cursor = h.index + h.length;
    }
  }
  return filtered;
}

// ── ScriptureText: renders plain text with clickable refs ─────────────────────
interface ScriptureTextProps {
  text: string;
  onVerseClick: (ref: ScriptureRef) => void;
  className?: string;
  context?: ScriptureContext;
}

export function ScriptureText({ text, onVerseClick, className = '', context }: ScriptureTextProps) {
  const refs = parseAllRefs(text, context);
  if (!refs.length) return <span className={className}>{text}</span>;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const hit of refs) {
    if (hit.index > cursor) nodes.push(<span key={`t${cursor}`}>{text.slice(cursor, hit.index)}</span>);
    const label = (hit as any)._rawText || hit.ref.display;
    nodes.push(
      <button key={`r${hit.index}`} onClick={() => onVerseClick(hit.ref)} className={PILL} title={`Click to read ${hit.ref.display}`}>
        <BookOpen className="w-2.5 h-2.5" />
        {label}
      </button>
    );
    cursor = hit.index + hit.length;
  }
  if (cursor < text.length) nodes.push(<span key={`t${cursor}`}>{text.slice(cursor)}</span>);

  return <span className={className}>{nodes}</span>;
}

// ── ScriptureHtml: renders HTML with clickable refs injected ──────────────────
interface ScriptureHtmlProps {
  html: string;
  onVerseClick: (ref: ScriptureRef) => void;
  className?: string;
  context?: ScriptureContext;
}

export function ScriptureHtml({ html, onVerseClick, className = '', context }: ScriptureHtmlProps) {
  const cleaned = cleanWordHtml(html);
  const isRealHtml =
    /<(p|div|ul|ol|li|b|strong|em|i|h[1-6]|br|span|font|table|tr|td)\b/i.test(cleaned) ||
    /<(p|div|ul|ol|li|b|strong|em|i|h[1-6]|br|span|font|table|tr|td)\b/i.test(html);

  if (isRealHtml) {
    const htmlToUse = cleaned.length > 50 ? cleaned : html;

    // Simple approach: use a global regex replacement directly on the HTML
    // This handles verse references even when they're wrapped in spans with color styling
    let processed = htmlToUse;

    // Replace verse references - match them across simple tags like <span style="color:red">
    // Pattern: optionally preceded by >, then the verse reference, optionally followed by <
    // Enhanced to handle more book name variations and edge cases
    processed = processed.replace(
      /(>|^|\\s|[\\(\\[\\{,;:\\.\\?!])(((?:\\d\\s*)?[A-Z][a-zA-Z]*(?:\\.\\s?)?(?:\\s+[A-Za-z]+(?:\\.\\s?)?)*)\\s+(\\d+):(\\d+)(?:\\s*(?:[–\\-—]|to)\\s*(\\d+))?)([\\s<\\)\\]\\},;:\\.\\?!]|$)/gi,
      (fullMatch, before, verseRef, book, chapter, verse, verseEnd, after) => {
        // Skip if we're inside an HTML tag attribute (e.g., inside href="" or data-*)
        if (before.includes('=') || before.includes('"')) return fullMatch;
        
        const ref: ScriptureRef = {
          book: book.trim().replace(/\\.$/, '').replace(/\\s+/g, ' '),
          chapter: parseInt(chapter),
          verse: parseInt(verse),
          verseEnd: verseEnd ? parseInt(verseEnd) : undefined,
          display: verseRef.trim(),
        };
        return before + makeRefButton(ref, verseRef.trim()) + after;
      }
    );

    // Also handle verse references that may have opening/closing spans around them
    // Pattern: <span [attributes]>Book Chapter:Verse</span>
    processed = processed.replace(
      /<span([^>]*)>((?:\d\s*)?[A-Z][a-zA-Z]*(?:\.\s?)?(?:\s+[A-Za-z]+(?:\.\s?)?)*\s+\d+:\d+(?:\s*(?:[–\-—]|to)\s*\d+)?)<\/span>/gi,
      (fullMatch, attributes, verseRef) => {
        // Check if this matches our verse reference pattern
        const parts = verseRef.match(/^((?:\d\s*)?[A-Z][a-zA-Z]*(?:\.\s?)?(?:\s+[A-Za-z]+(?:\.\s?)?)*)\s+(\d+):(\d+)(?:\s*(?:[–\-—]|to)\s*(\d+))?$/i);
        if (parts) {
          const book = parts[1].trim().replace(/\.$/, '').replace(/\s+/g, ' ');
          const chapter = parseInt(parts[2]);
          const verse = parseInt(parts[3]);
          const verseEnd = parts[4] ? parseInt(parts[4]) : undefined;
          const ref: ScriptureRef = {
            book,
            chapter,
            verse,
            verseEnd,
            display: verseRef.trim(),
          };
          return makeRefButton(ref, verseRef.trim());
        }
        return fullMatch;
      }
    );

    // Handle context-based references if context is provided
    if (context) {
      // Context chapter:verse refs - enhanced to handle more boundary cases
      processed = processed.replace(
        /(>|^|\\s|[\\(\\[\\{,;:\\.\\?!])(\\d+:\\d+(?:\\s*(?:[–\\-—]|to)\\s*\\d+)?)([\\s<\\)\\]\\},;:\\.\\?!]|$)/g,
        (fullMatch, before, verseRef, after) => {
          if (before.includes('=') || before.includes('"')) return fullMatch;
          // Skip if already inside a scripture button
          if (fullMatch.includes('data-scripture-ref')) return fullMatch;
          
          const parts = verseRef.match(/^(\\d+):(\\d+)(?:\\s*(?:[–\\-—]|to)\\s*(\\d+))?$/);
          if (parts) {
            const chapter = parseInt(parts[1]);
            const verse = parseInt(parts[2]);
            const verseEnd = parts[3] ? parseInt(parts[3]) : undefined;
            const display = verseEnd ? `${context.book} ${chapter}:${verse}–${verseEnd}` : `${context.book} ${chapter}:${verse}`;
            const ref: ScriptureRef = { book: context.book, chapter, verse, verseEnd, display };
            return before + makeRefButton(ref, verseRef.trim()) + after;
          }
          return fullMatch;
        }
      );

      // vv./v. patterns
      processed = processed.replace(
        /(>|^|\s)(vv?\\.?\\s*\\d+(?:\\s*(?:[–\-—]|to)\\s*\\d+)?)([\s<])/gi,
        (fullMatch, before, verseRef, after) => {
          if (before.includes('=') || before.includes('"')) return fullMatch;
          
          const parts = verseRef.match(/vv?\\.?\\s*(\\d+)(?:\\s*(?:[–\-—]|to)\\s*(\\d+))?/i);
          if (parts) {
            const verse = parseInt(parts[1]);
            const verseEnd = parts[2] ? parseInt(parts[2]) : undefined;
            const display = verseEnd
              ? `${context.book} ${context.chapter}:${verse}–${verseEnd}`
              : `${context.book} ${context.chapter}:${verse}`;
            const ref: ScriptureRef = { book: context.book, chapter: context.chapter, verse, verseEnd, display };
            return before + makeRefButton(ref, verseRef.trim()) + after;
          }
          return fullMatch;
        }
      );
    }

    return (
      <div
        className={`prose prose-sm max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: processed }}
        style={{ fontFamily: 'inherit' }}
        onClick={(e) => {
          const btn = (e.target as HTMLElement).closest('[data-scripture-ref]');
          if (btn) {
            try {
              const ref: ScriptureRef = JSON.parse(decodeURIComponent(btn.getAttribute('data-scripture-ref') || ''));
              onVerseClick(ref);
            } catch {}
          }
        }}
      />
    );
  }

  // Plain text fallback
  const plain = htmlToPlain(cleaned);
  return <ScriptureText text={plain} onVerseClick={onVerseClick} className={className} context={context} />;
}

function makeRefButton(ref: ScriptureRef, label: string): string {
  const encoded = encodeURIComponent(JSON.stringify(ref));
  // Use amber/orange colors for Q&A dark theme compatibility
  return `<button data-scripture-ref="${encoded}" class="scripture-ref-btn" title="Click to read ${ref.display}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;margin:0 2px;border-radius:9999px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);color:#fcd34d;font-size:0.75rem;font-weight:600;cursor:pointer;vertical-align:middle;line-height:1.5;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;opacity:0.7;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${label}</button>`;
}

// Legacy export kept for compatibility
export const SCRIPTURE_RE = FULL_REF_RE;
export function parseScriptureRefs(text: string) {
  return parseAllRefs(text);
}

// ── injectScriptureRefs: inject clickable scripture buttons into an HTML string ──
// Use this when you have raw HTML (e.g. dangerouslySetInnerHTML) and want
// scripture references to be clickable without converting to React nodes.
export function injectScriptureRefs(html: string, context?: ScriptureContext): string {
  if (!html) return html;

  // Split on HTML tags so we only process text nodes
  const parts = html.split(/(<[^>]+>)/g);
  const processed = parts.map((part, i) => {
    if (i % 2 !== 0) return part; // it's a tag — skip

    let result = part;

    // Track positions of already-replaced refs to avoid double-replacement
    const replacedRanges: Array<{ start: number; end: number }> = [];
    
    const isOverlapping = (start: number, end: number) => {
      return replacedRanges.some(r => 
        (start >= r.start && start < r.end) || 
        (end > r.start && end <= r.end) ||
        (start <= r.start && end >= r.end)
      );
    };

    // 1. Full refs: "Book Chapter:Verse" or "Book Chapter:Verse–Verse"
    // Must match complete book+chapter:verse with proper boundaries
    const fullRefRegex = /(?:^|[\s\(\[\{,;:\.\?!])((?:\d\s*)?[A-Z][a-zA-Z]*(?:\.)?\s+(?:[A-Za-z]+(?:\.)?\s+)?(?:[A-Za-z]+(?:\.)?\s+)?)\s*(\d+):(\d+)(?:\s*(?:[–\-—]|to)\s*(\d+))?(?=[\s\)\]\},;:\.\?!]|$)/g;
    
    const fullMatches: Array<{ match: string; index: number; ref: ScriptureRef }> = [];
    let m;
    while ((m = fullRefRegex.exec(part)) !== null) {
      const fullMatch = m[0];
      const prefix = fullMatch.match(/^[\s\(\[\{,;:\.\?!]/)?.[0] || '';
      const actualRef = fullMatch.slice(prefix.length);
      const book = m[1].trim().replace(/\.$/, '');
      const chapter = parseInt(m[2]);
      const verse = parseInt(m[3]);
      const verseEnd = m[4] ? parseInt(m[4]) : undefined;
      
      fullMatches.push({
        match: actualRef,
        index: m.index + prefix.length,
        ref: { book, chapter, verse, verseEnd, display: actualRef.trim() }
      });
    }

    // Sort by index descending so we can replace from end to start (preserves indices)
    fullMatches.sort((a, b) => b.index - a.index);
    
    for (const { match, index, ref } of fullMatches) {
      if (!isOverlapping(index, index + match.length)) {
        const button = makeRefButton(ref, match.trim());
        result = result.slice(0, index) + button + result.slice(index + match.length);
        replacedRanges.push({ start: index, end: index + button.length });
      }
    }

    if (context) {
      // 2. Context chapter:verse refs like "2:11" or "2:11–25"
      // Only match standalone numbers, not part of larger text
      const ctxMatches: Array<{ match: string; index: number; ref: ScriptureRef }> = [];
      const ctxRegex = /(?:^|[\s\(\[\{,;:\.\?!])(\d+):(\d+)(?:[–\-—](\d+))?(?=[\s\)\]\},;:\.\?!]|$)/g;
      
      while ((m = ctxRegex.exec(part)) !== null) {
        const fullMatch = m[0];
        const prefix = fullMatch.match(/^[\s\(\[\{,;:\.\?!]/)?.[0] || '';
        const actualRef = fullMatch.slice(prefix.length);
        const ch = m[1];
        const v = m[2];
        const ve = m[3];
        
        ctxMatches.push({
          match: actualRef,
          index: m.index + prefix.length,
          ref: {
            book: context.book,
            chapter: parseInt(ch),
            verse: parseInt(v),
            verseEnd: ve ? parseInt(ve) : undefined,
            display: ve ? `${context.book} ${ch}:${v}–${ve}` : `${context.book} ${ch}:${v}`
          }
        });
      }

      ctxMatches.sort((a, b) => b.index - a.index);
      
      for (const { match, index, ref } of ctxMatches) {
        if (!isOverlapping(index, index + match.length)) {
          const button = makeRefButton(ref, match);
          result = result.slice(0, index) + button + result.slice(index + match.length);
          replacedRanges.push({ start: index, end: index + button.length });
        }
      }

      // 3. "vv. N–N" / "v. N" patterns
      const vvMatches: Array<{ match: string; index: number; ref: ScriptureRef }> = [];
      const vvRegex = /(?:^|[\s\(\[\{,;:\.\?!])(vv?\.?\s*\d+(?:[–\-—,]\s*\d+)?)(?=[\s\)\]\},;:\.\?!]|$)/gi;
      
      while ((m = vvRegex.exec(part)) !== null) {
        const fullMatch = m[0];
        const prefix = fullMatch.match(/^[\s\(\[\{,;:\.\?!]/)?.[0] || '';
        const actualRef = fullMatch.slice(prefix.length);
        const vParts = actualRef.match(/vv?\.?\s*(\d+)(?:[–\-—,]\s*(\d+))?/i);
        if (vParts) {
          const verse = parseInt(vParts[1]);
          const verseEnd = vParts[2] ? parseInt(vParts[2]) : undefined;
          const display = verseEnd
            ? `${context.book} ${context.chapter}:${verse}–${verseEnd}`
            : `${context.book} ${context.chapter}:${verse}`;
          
          vvMatches.push({
            match: actualRef,
            index: m.index + prefix.length,
            ref: { book: context.book, chapter: context.chapter, verse, verseEnd, display }
          });
        }
      }

      vvMatches.sort((a, b) => b.index - a.index);
      
      for (const { match, index, ref } of vvMatches) {
        if (!isOverlapping(index, index + match.length)) {
          const button = makeRefButton(ref, match);
          result = result.slice(0, index) + button + result.slice(index + match.length);
          replacedRanges.push({ start: index, end: index + button.length });
        }
      }
    }

    return result;
  });

  return processed.join('');
}
