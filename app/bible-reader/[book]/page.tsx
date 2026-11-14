'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { ChevronLeft, Menu, X, BookOpen, ScrollText, Heart, MessageSquare, Lightbulb, History } from 'lucide-react';
import TheologicalInsightsModal from '@/app/components/TheologicalInsightsModal';
import { useScripturePopup, ScriptureVersePopup } from '@/components/ScriptureVersePopup';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';


interface Book {
  id: number;
  book_number: number;
  name_english: string;
  name_luganda: string;
  testament: string;
  total_chapters: number;
}

interface BookIntroduction { en_introduction?: string; lu_introduction?: string; }
interface BookOutline { id: number; title: string; content: string; }
interface BookPrayer { en_prayer?: string; lu_prayer?: string; }
interface BookCommentary { english_commentary?: string; luganda_commentary?: string; }
interface BookTheological { english_insight?: string; luganda_insight?: string; }
interface BookHistorical { historical_background?: string; cultural_context?: string; maps_geography?: string; timeline?: string; archaeological_notes?: string; }

type SidePanelTab = 'intro' | 'outline' | 'prayer';
type BottomTab = 'commentary' | 'theological' | 'historical';

// ── SAME MARK SYSTEM AS THE CHAPTER PAGE (one store for the whole app) ──
// Marks live in localStorage under `prayread-marks-book-{bookId}` — one store for the
// whole book page, same Mark bar, same colours as the chapter page. Nothing is sent
// to the server, and no separate highlight store is used on this page anymore.
type Mark = { id: string; text: string; style: 'highlight' | 'underline'; color: string };

const BOOK_NAMES = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Psalm','Proverbs','Ecclesiastes','Song of Solomon','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
// Lowercase Luganda name -> English name (keys lowercase because the regex is /i).
const LU_BOOK_MAP: Record<string, string> = { 'olubereberye': 'Genesis', 'okuva': 'Exodus', 'ebyabaleevi': 'Leviticus', 'okubala': 'Numbers', 'ekyamateeka': 'Deuteronomy', 'yoswa': 'Joshua', 'abalamuzi': 'Judges', 'ruusa': 'Ruth', 'samwiri': 'Samuel', 'bassekabaka': 'Kings', 'ebyomumirembe': 'Chronicles', 'ezera': 'Ezra', 'nekemiya': 'Nehemiah', 'eseza': 'Esther', 'yobu': 'Job', 'zabbuli': 'Psalms', 'engero': 'Proverbs', 'omubuulizi': 'Ecclesiastes', 'oluyimba': 'Song of Solomon', 'isaaya': 'Isaiah', 'yeremiya': 'Jeremiah', 'okukungubaga': 'Lamentations', 'ebyokukungubaga': 'Lamentations', 'ezekyeri': 'Ezekiel', 'danyeri': 'Daniel', 'koseya': 'Hosea', 'yoweri': 'Joel', 'amosi': 'Amos', 'obadiya': 'Obadiah', 'yona': 'Jonah', 'mika': 'Micah', 'nakumu': 'Nahum', 'abakuku': 'Habakkuk', 'zefaniya': 'Zephaniah', 'kaggayi': 'Haggai', 'zekkariya': 'Zechariah', 'malaki': 'Malachi', 'matayo': 'Matthew', 'makko': 'Mark', 'lukka': 'Luke', 'yokaana': 'John', 'ebikolwa': 'Acts', 'abaruumi': 'Romans', 'abakkolinso': 'Corinthians', 'abaggalatiya': 'Galatians', 'abaefeso': 'Ephesians', 'abafiripi': 'Philippians', 'abakkolosaayi': 'Colossians', 'abasessalonika': 'Thessalonians', 'timosewo': 'Timothy', 'tito': 'Titus', 'firemooni': 'Philemon', 'abaebbulaniya': 'Hebrews', 'yakobo': 'James', 'peetero': 'Peter', 'yuda': 'Jude', 'okubikkulirwa': 'Revelation' };
const BOOK_NUMBERS: Record<string, number> = {};
BOOK_NAMES.forEach((b, i) => { BOOK_NUMBERS[b.toLowerCase()] = i + 1; });
BOOK_NUMBERS['psalm'] = 19; BOOK_NUMBERS['song of solomon'] = 22; BOOK_NUMBERS['song of songs'] = 22; BOOK_NUMBERS['judges'] = 7;
const LU_BOOK_NUMBERS: Record<string, number> = { 'olubereberye': 1, 'okuva': 2, 'ebyabaleevi': 3, 'okubala': 4, 'ekyamateeka': 5, 'yoswa': 6, 'abalamuzi': 7, 'ruusa': 8, 'samwiri': 9, '1 samwiri': 9, '2 samwiri': 10, 'bassekabaka': 11, '1 bassekabaka': 11, '2 bassekabaka': 12, 'ebyomumirembe': 13, '1 ebyomumirembe': 13, '2 ebyomumirembe': 14, 'ezera': 15, 'nekemiya': 16, 'eseza': 17, 'yobu': 18, 'zabbuli': 19, 'engero': 20, 'omubuulizi': 21, 'oluyimba': 22, 'isaaya': 23, 'yeremiya': 24, 'okukungubaga': 25, 'ebyokukungubaga': 25, 'ezekyeri': 26, 'danyeri': 27, 'koseya': 28, 'yoweri': 29, 'amosi': 30, 'obadiya': 31, 'yona': 32, 'mika': 33, 'nakumu': 34, 'abakuku': 35, 'zefaniya': 36, 'kaggayi': 37, 'zekkariya': 38, 'malaki': 39, 'matayo': 40, 'makko': 41, 'lukka': 42, 'yokaana': 43, '1 yokaana': 62, '2 yokaana': 63, '3 yokaana': 64, 'ebikolwa': 44, 'abaruumi': 45, 'abakkolinso': 46, '1 abakkolinso': 46, '2 abakkolinso': 47, 'abaggalatiya': 48, 'abaefeso': 49, 'abafiripi': 50, 'abakkolosaayi': 51, 'abasessalonika': 52, '1 abasessalonika': 52, '2 abasessalonika': 53, 'timosewo': 54, '1 timosewo': 54, '2 timosewo': 55, 'tito': 56, 'firemooni': 57, 'abaebbulaniya': 58, 'yakobo': 59, 'peetero': 60, '1 peetero': 60, '2 peetero': 61, 'yuda': 65, 'okubikkulirwa': 66 };
const REF_RE = new RegExp('\\b((?:[123]\\s)?(?:' + [...BOOK_NAMES, ...Object.keys(LU_BOOK_MAP)].map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '))\\s+(\\d+):(\\d+(?:-\\d+)?(?:,\\s*\\d+(?:-\\d+)?)*)', 'gi');
const linkifyRefs = (html: string): string => {
  if (!html) return '';
  return html.split(/(<[^>]+>)/g).map(part => {
    if (!part || part.startsWith('<')) return part;
    return part.replace(REF_RE, (m) => `<span class="scripture-ref" data-ref="${m}" style="color:#1d4ed8;text-decoration:underline;text-underline-offset:2px;cursor:pointer;font-weight:600">${m}</span>`);
  }).join('');
};
// Whitespace-tolerant find (same as chapter page): returns match in HAYSTACK coordinates.
const findLoose = (hay: string, needle: string): { index: number; length: number } | null => {
  if (!hay || !needle) return null;
  const trimmed = needle.trim();
  if (!trimmed) return null;
  const exact = hay.indexOf(trimmed);
  if (exact !== -1) return { index: exact, length: trimmed.length };
  const hc: string[] = []; const hm: number[] = [];
  for (let i = 0; i < hay.length; i++) {
    const ch = hay[i];
    if (/\s/.test(ch)) { if (hc.length && hc[hc.length - 1] !== ' ') { hc.push(' '); hm.push(i); } continue; }
    hc.push(ch); hm.push(i);
  }
  while (hc.length && hc[0] === ' ') { hc.shift(); hm.shift(); }
  while (hc.length && hc[hc.length - 1] === ' ') { hc.pop(); hm.pop(); }
  const ncs = trimmed.replace(/\s+/g, ' ');
  const ci = hc.join('').indexOf(ncs);
  if (ci === -1) return null;
  const start = hm[ci];
  const endHay = hm[ci + ncs.length - 1];
  return { index: start, length: endHay - start + 1 };
};
// Tag-aware mark painting (same as chapter page): wraps overlapping slices of each
// text run, never breaks tags, never breaks a clickable verse ref.
const applyMarksToHtml = (html: string, marksList: Mark[]): string => {
  if (!html || !marksList.length) return html;
  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const decodeEnt = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  let out = html;
  [...marksList].sort((a, b) => b.text.length - a.text.length).forEach(m => {
    if (!m.text) return;
    const tokens = out.match(/(<[^>]+>|[^<]+)/g) || [];
    let plain = '';
    const ranges: { start: number; end: number; dec: string }[] = [];
    tokens.forEach(tok => {
      if (tok.startsWith('<')) { ranges.push({ start: -1, end: -1, dec: '' }); return; }
      const dec = decodeEnt(tok);
      ranges.push({ start: plain.length, end: plain.length + dec.length, dec });
      plain += dec;
    });
    const found = findLoose(plain, m.text);
    if (!found) return;
    const start = found.index, end = found.index + found.length;
    const cls = m.style === 'highlight' ? m.color + ' px-0.5 rounded' : 'underline decoration-2 underline-offset-4 ' + m.color;
    out = tokens.map((tok, ti) => {
      if (tok.startsWith('<')) return tok;
      const r = ranges[ti];
      const lo = Math.max(start, r.start), hi = Math.min(end, r.end);
      if (lo >= hi) return tok;
      const a = lo - r.start, b = hi - r.start;
      return escHtml(r.dec.slice(0, a)) + `<span class="${cls}">` + escHtml(r.dec.slice(a, b)) + `</span>` + escHtml(r.dec.slice(b));
    }).join('');
  });
  return out;
};

// Renders one book-page section (intro / commentary / theological / historical / outline):
// verse refs become clickable pills, saved marks paint from the chapter-page system.
function BookContentHtml({ html, markKey, marksStoreKey, marksTick, onSelect, onVerseClick }: {
  html: string; markKey: string; marksStoreKey: string; marksTick: number;
  onSelect: (key: string) => void; onVerseClick: (ref: string) => void;
}) {
  const marks = useMemo(() => {
    try { const all = JSON.parse(localStorage.getItem(marksStoreKey) || '{}') as Record<string, Mark[]>; return all[markKey] || []; }
    catch { return []; }
  }, [marksStoreKey, markKey, marksTick]);
  const finalHtml = useMemo(() => applyMarksToHtml(linkifyRefs(html), marks), [html, marks]);
  const handleClick = (e: React.MouseEvent) => {
    try { if (window.getSelection()?.toString().trim()) return; } catch {}
    const el = (e.target as HTMLElement).closest?.('.scripture-ref') as HTMLElement | null;
    if (el?.dataset?.ref) { e.preventDefault(); e.stopPropagation(); onVerseClick(el.dataset.ref); }
  };
  const markSection = () => {
    try {
      const el = document.querySelector(`[data-mark-key="${markKey}"]`) as HTMLElement | null;
      if (!el) return;
      const sel = window.getSelection();
      const cur = sel?.toString() || '';
      const node: any = sel?.anchorNode;
      const inSection = node && (node.nodeType === 3 ? node.parentElement : node)?.closest?.(`[data-mark-key="${markKey}"]`);
      if (cur.trim() && inSection) { onSelect(markKey); return; }
      const range = document.createRange(); range.selectNodeContents(el);
      sel?.removeAllRanges(); sel?.addRange(range);
      onSelect(markKey);
    } catch {}
  };
  return (
    <>
      <div className="flex justify-end mb-1">
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); markSection(); }} title="Select this section & mark it — highlight / underline" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 text-[14px] shrink-0" aria-label="Mark this section">🖍</button>
      </div>
      <div data-mark-key={markKey} onClick={handleClick} className="leading-relaxed text-sm select-text cursor-text" dangerouslySetInnerHTML={{ __html: finalHtml }} />
    </>
  );
}

function BookChaptersContent() {
  const params = useParams();
  const router = useRouter();
  const bookNumber = parseInt(params.book as string);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookIntroduction, setBookIntroduction] = useState<BookIntroduction | null>(null);
  const [bookOutlines, setBookOutlines] = useState<BookOutline[]>([]);
  const [bookPrayers, setBookPrayers] = useState<BookPrayer | null>(null);
  const [bookCommentary, setBookCommentary] = useState<BookCommentary | null>(null);
  const [bookTheological, setBookTheological] = useState<BookTheological | null>(null);
  const [bookHistorical, setBookHistorical] = useState<BookHistorical | null>(null);

  const [language, setLanguage] = useState<'english' | 'luganda' | 'both'>('english');
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<SidePanelTab>('intro');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('commentary');
  const [showBottomSection, setShowBottomSection] = useState(false);
  const [bookTheologicalModalOpen, setBookTheologicalModalOpen] = useState(false);
  const { popup: scripturePopup, openVerse: openScriptureVerse, closePopup: closeScripturePopup } = useScripturePopup();

  // ── Marks (chapter-page system) ────────────────────────────────────────────
  const marksStoreKey = `prayread-marks-book-${book?.id ?? bookNumber}`;
  const [pendingMark, setPendingMark] = useState<{ key: string; text: string } | null>(null);
  const [marksTick, setMarksTick] = useState(0);
  const readMarksAll = (): Record<string, Mark[]> => {
    try { return JSON.parse(localStorage.getItem(marksStoreKey) || '{}'); } catch { return {}; }
  };
  const onSelectMark = (key: string) => {
    setTimeout(() => {
      try {
        const sel = window.getSelection(); const txt = sel?.toString() || '';
        if (!txt.trim() || txt.trim().length < 2) { setPendingMark(null); return; }
        setPendingMark({ key, text: txt });
      } catch { setPendingMark(null); }
    }, 10);
  };
  const applyMark = (style: 'highlight' | 'underline', color: string) => {
    if (!pendingMark) return;
    const all = readMarksAll();
    const existing = all[pendingMark.key] || [];
    if (existing.some(m => m.text === pendingMark.text && m.style === style && m.color === color)) { setPendingMark(null); return; }
    const next = { ...all, [pendingMark.key]: [...existing, { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), text: pendingMark.text, style, color }] };
    try { localStorage.setItem(marksStoreKey, JSON.stringify(next)); } catch {}
    setMarksTick(t => t + 1);
    setPendingMark(null);
    try { window.getSelection()?.removeAllRanges(); } catch {}
  };
  const clearMarksForKey = (key: string) => {
    const all = readMarksAll(); delete all[key];
    try { localStorage.setItem(marksStoreKey, JSON.stringify(all)); } catch {}
    setMarksTick(t => t + 1);
  };
  // Catch a drag-select in ANY book section (same as chapter page).
  useEffect(() => {
    const onUp = () => {
      setTimeout(() => {
        try {
          const sel = window.getSelection(); const txt = sel?.toString() || '';
          if (!txt.trim() || txt.trim().length < 2) return;
          const node: any = sel?.anchorNode;
          const el: any = node ? (node.nodeType === 3 ? node.parentElement : node) : null;
          const holder = el?.closest?.('[data-mark-key]') as HTMLElement | null;
          if (!holder) return;
          setPendingMark({ key: holder.dataset.markKey as string, text: txt });
        } catch {}
      }, 90);
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    return () => { document.removeEventListener('mouseup', onUp); document.removeEventListener('touchend', onUp); };
  }, []);

  // ── FIX: verse refs must jump to the EXACT verse, not just the chapter ─────
  // The shared popup's "Open in Bible Reader" button only carries the chapter, and
  // this page cannot change the popup's own code — so when the popup is open, a
  // capture-phase click listener appends #verse-N to that button's link (or, if it
  // is a plain button, navigates directly). The chapter page then scrolls to the
  // verse and flash-highlights it, exactly like the chapter-page refs do.
  const lastVerseRef = useRef<{ bookNumber: number; chapter: number; verse: number } | null>(null);
  const parseVerseRef = (ref: string) => {
    const m = ref.trim().match(/^((?:[123]\s)?[A-Za-z' ]+?)\s+(\d+):(\d+)(?:\s*[-,].*)?$/);
    if (!m) return null;
    const raw = m[1].trim().replace(/\s+/g, ' ');
    const lower = raw.toLowerCase();
    const num = BOOK_NUMBERS[lower] ?? LU_BOOK_NUMBERS[lower];
    if (!num) return null;
    return { bookNumber: num, chapter: parseInt(m[2]), verse: parseInt(m[3]) };
  };
  const translateLuRef = (ref: string) => {
    const m = ref.trim().match(/^((?:[123]\s)?[A-Za-z' ]+?)\s+(\d+):(.+)$/);
    if (!m) return ref;
    const raw = m[1].trim().replace(/\s+/g, ' ');
    const numPrefix = raw.match(/^[123]\s+/)?.[0] || '';
    const base = raw.replace(/^[123]\s+/, '').toLowerCase();
    const eng = LU_BOOK_MAP[base];
    if (!eng) return ref;
    return `${numPrefix}${eng} ${m[2]}:${m[3]}`;
  };
  const handleVerseClick = (ref: string) => {
    const parsed = parseVerseRef(ref);
    if (parsed) lastVerseRef.current = parsed;
    // Shared popup resolves English book names — translate Luganda refs ("Yokaana" -> "John").
    openScriptureVerse(translateLuRef(ref));
  };
  useEffect(() => {
    if (!scripturePopup) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest?.('a[href*="/bible-reader/"]') as HTMLAnchorElement | null;
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        const m = href.match(/\/bible-reader\/\d+\/\d+/);
        if (m && !href.includes('#verse-') && lastVerseRef.current) {
          e.preventDefault(); e.stopPropagation();
          closeScripturePopup();
          router.push(`${m[0]}#verse-${lastVerseRef.current.verse}`);
        }
        return;
      }
      const btn = target.closest?.('button') as HTMLButtonElement | null;
      if (btn && /bible reader|go to|open/i.test(btn.textContent || '') && lastVerseRef.current) {
        e.preventDefault(); e.stopPropagation();
        const v = lastVerseRef.current;
        closeScripturePopup();
        router.push(`/bible-reader/${v.bookNumber}/${v.chapter}#verse-${v.verse}`);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [scripturePopup]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bibleFontSize') as 'small' | 'medium' | 'large' | null;
      if (saved) { setFontSize(saved); applyFontSize(saved); }
    }
  }, []);

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    const map = { small: '14px', medium: '16px', large: '18px' };
    if (typeof window !== 'undefined') document.documentElement.style.setProperty('--bible-font-size', map[size]);
  };

  const cycleFontSize = () => {
    const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    const next = sizes[(sizes.indexOf(fontSize) + 1) % sizes.length];
    setFontSize(next); applyFontSize(next);
    if (typeof window !== 'undefined') localStorage.setItem('bibleFontSize', next);
  };

  const cycleLanguage = () => {
    const langs: Array<'english' | 'luganda' | 'both'> = ['english', 'luganda', 'both'];
    setLanguage(langs[(langs.indexOf(language) + 1) % langs.length]);
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'sepia' | 'dark'> = ['light', 'sepia', 'dark'];
    setTheme(themes[(themes.indexOf(theme) + 1) % themes.length]);
  };

  // Track book visit on mount
  useEffect(() => {
    const logBookVisit = async () => {
      try {
        // Get session
        const sessionRes = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
        if (!sessionRes.ok) return;
        const sessionData = await sessionRes.json();
        if (!sessionData.success || !sessionData.user?.email) return;

        // Log book visit (no chapter means viewing book overview)
        await fetch('/api/activity-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_email: sessionData.user.email,
            activity_type: 'book_visit',
            book_id: bookNumber,
            chapter: null
          })
        });
      } catch (error) {
        console.error('Error logging book visit:', error);
      }
    };

    logBookVisit();
  }, [bookNumber]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        // Always try online fetch (no connectivity checks)
        const response = await fetch(`/api/bible-books?id=${bookNumber}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.book) {
          const bookData: Book = {
            id: data.book.id,
            book_number: data.book.book_number,
            name_english: data.book.name_english,
            name_luganda: data.book.name_luganda,
            testament: data.book.testament,
            total_chapters: data.book.chapters || data.book.total_chapters
          };
          setBook(bookData);

          // Fetch all secondary data in parallel (optional, non-blocking)
          Promise.allSettled([
            fetch(`/api/book-introductions?bookId=${bookData.id}`).then(r => r.json()).then(d => setBookIntroduction(d)),
            fetch(`/api/outlines?book_id=${bookData.id}&language=english`).then(r => r.json()).then(d => Array.isArray(d) && setBookOutlines(d)),
            fetch(`/api/book-prayers?bookId=${bookData.id}`).then(r => r.json()).then(d => setBookPrayers(d)),
            fetch(`/api/book-commentaries?bookId=${bookData.id}`).then(r => r.json()).then(d => setBookCommentary(d)),
            fetch(`/api/book-theological-insights?book_id=${bookData.id}`).then(r => r.json()).then(d => setBookTheological(d)),
            fetch(`/api/historical-content?bookId=${bookData.id}`).then(r => r.json()).then(d => setBookHistorical(d)),
          ]).catch(err => console.warn('Secondary data fetch failed:', err));
        }
      } catch (error) {
        console.error('Error fetching book online, trying offline cache:', error);
        
        // Only fall back to IndexedDB if online fetch fails
        try {
          const { getBooks } = await import('@/app/utils/offlineStorage');
          const cachedBooks = await getBooks();
          const cachedBook = cachedBooks.find((b: any) => b.book_number === bookNumber);
          
          if (cachedBook) {
            const bookData: Book = {
              id: cachedBook.id,
              book_number: cachedBook.book_number,
              name_english: cachedBook.name_english,
              name_luganda: cachedBook.name_luganda,
              testament: cachedBook.testament,
              total_chapters: cachedBook.total_chapters
            };
            setBook(bookData);
            console.log('✅ [OFFLINE] Loaded book from cache:', bookData.name_english);
          } else {
            console.error('❌ Book not found in cache');
          }
        } catch (offlineError) {
          console.error('❌ Offline storage unavailable:', offlineError);
        }
      } finally {
        setLoading(false);
      }
    };
    if (bookNumber) fetchBook();
  }, [bookNumber]);

  // Theme helpers
  const isOT = book?.testament === 'Old Testament';
  const bg = () => theme === 'sepia' ? 'bg-blue-50' : theme === 'dark' ? 'bg-gray-900' : isOT ? 'bg-gradient-to-b from-orange-50 to-white' : 'bg-gradient-to-b from-blue-50 to-white';
  const border = () => theme === 'dark' ? 'border-gray-700' : theme === 'sepia' ? 'border-blue-300' : isOT ? 'border-orange-200' : 'border-blue-200';
  const btnColor = () => isOT ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
  const badge = () => theme === 'dark' ? 'bg-indigo-900 text-indigo-300 border-indigo-700' : theme === 'sepia' ? (isOT ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-100 text-blue-800 border-blue-300') : (isOT ? 'bg-orange-100 text-orange-600 border-orange-300' : 'bg-blue-100 text-blue-600 border-blue-300');
  const hdr = () => theme === 'dark' ? 'text-gray-100' : theme === 'sepia' ? (isOT ? 'text-blue-900' : 'text-blue-900') : (isOT ? 'text-orange-900' : 'text-blue-900');
  const txt = () => theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-700';
  const panelBg = () => theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'sepia' ? 'bg-blue-100 border-blue-300' : 'border-indigo-200';
  const tabActive = () => theme === 'dark' ? 'border-indigo-500 text-indigo-400' : theme === 'sepia' ? 'border-blue-700 text-blue-800' : 'border-indigo-600 text-indigo-600';
  const tabInactive = () => theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-300' : theme === 'sepia' ? 'border-transparent text-blue-800 hover:text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-800';
  const cardBg = () => theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-white text-gray-700 border-indigo-100';

  const langText = (en?: string | null, lu?: string | null) => {
    if (language === 'luganda' && lu) return lu;
    if (language === 'both' && en && lu) return `${en}

---

${lu}`;
    return en || null;
  };

  // Clean HTML content by removing wrapper div and excessive styles
  const cleanHtmlContent = (html: string | null | undefined): string | null => {
    if (!html) return null;
    let cleaned = html;
    
    // Remove the RichTextEditor wrapper div
    cleaned = cleaned.replace(/<div[^>]*data-styled-content[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/div>\s*$/gi, '');
    
    // Remove HTML comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n\n\n+/g, '\n\n');
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  // Render rich HTML content with the chapter-page mark system (highlight / underline).
  const renderContent = (content: string | null | undefined, sectionKey?: string) => {
    if (!content) return null;
    const cleanedContent = cleanHtmlContent(content);
    if (!cleanedContent) return null;
    return (
      <BookContentHtml
        html={cleanedContent}
        markKey={sectionKey || `book-content-${book?.id ?? bookNumber}`}
        marksStoreKey={marksStoreKey}
        marksTick={marksTick}
        onSelect={onSelectMark}
        onVerseClick={handleVerseClick}
      />
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading book chapters...</p>
      </div>
    </div>
  );

  if (!book) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600 text-lg font-semibold">❌ Book not found</p>
        <Link href="/bible-reader" className="text-orange-600 hover:text-orange-800 mt-4 inline-block">← Back to Bible Reader</Link>
      </div>
    </div>
  );

  // Side panel tab content renderer
  const renderSidePanelContent = () => {
    if (activeTab === 'intro') return (
      <div className="space-y-4">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-indigo-300' : theme === 'sepia' ? 'text-amber-900' : 'text-indigo-900'}`}>📖 {book.name_english}</h3>
        {bookIntroduction ? (
          <div className={`leading-relaxed rounded-lg p-4 border ${cardBg()}`}>
            {renderContent(langText(bookIntroduction.en_introduction, bookIntroduction.lu_introduction), `book-intro-${book?.id}-${language}`) || <span className="text-gray-500">No introduction available</span>}
          </div>
        ) : <p className={`text-sm italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No introduction added yet</p>}
      </div>
    );

    if (activeTab === 'outline') return (
      <div className="space-y-4">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-indigo-300' : theme === 'sepia' ? 'text-amber-900' : 'text-indigo-900'}`}>📋 {book.name_english} Outline</h3>
        {bookOutlines.length > 0 ? (
          <div className="space-y-3">
            {bookOutlines.map(o => {
              const cleanedContent = cleanHtmlContent(o.content);
              return (
                <div key={o.id} className={`rounded-lg p-4 border ${cardBg()}`}>
                  <h4 className={`font-bold mb-2 ${theme === 'dark' ? 'text-indigo-300' : theme === 'sepia' ? 'text-amber-800' : 'text-indigo-700'}`}>{o.title}</h4>
                  <BookContentHtml
                    html={cleanedContent || ''}
                    markKey={`book-outline-${o.id}`}
                    marksStoreKey={marksStoreKey}
                    marksTick={marksTick}
                    onSelect={onSelectMark}
                    onVerseClick={handleVerseClick}
                  />
                </div>
              );
            })}
          </div>
        ) : <p className={`text-sm italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No outlines added yet</p>}
      </div>
    );

    if (activeTab === 'prayer') return (
      <div className="space-y-4">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-pink-300' : theme === 'sepia' ? 'text-pink-800' : 'text-pink-900'}`}>🙏 {book.name_english} Closing Prayer</h3>
        {bookPrayers && (bookPrayers.en_prayer || bookPrayers.lu_prayer) ? (
          <div className={`leading-relaxed rounded-lg p-4 border ${theme === 'dark' ? 'bg-pink-900 text-gray-300 border-pink-700' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-pink-50 text-gray-700 border-pink-200'}`}>
            {renderContent(langText(bookPrayers.en_prayer, bookPrayers.lu_prayer), `book-prayer-${book?.id}-${language}`) || <span>No prayer available</span>}
          </div>
        ) : <p className={`text-sm italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No closing prayer added yet</p>}
      </div>
    );
  };

  const SidePanelTabs = () => (
    <div className={`flex gap-1 mb-6 border-b ${border()}`}>
      {([['intro', '📖', 'Intro'], ['outline', '📋', 'Outline'], ['prayer', '🙏', 'Prayer']] as const).map(([tab, icon, label]) => (
        <button key={tab} onClick={() => setActiveTab(tab)}
          className={`px-3 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab ? tabActive() : tabInactive()}`}>
          {icon} {label}
        </button>
      ))}
    </div>
  );

  const bottomTabs: Array<{ id: BottomTab; icon: React.ReactNode; label: string; color: string }> = [
    { id: 'commentary', icon: <MessageSquare className="h-4 w-4" />, label: "Commentary", color: "text-blue-600 border-blue-600" },
    { id: 'theological', icon: <Lightbulb className="h-4 w-4" />, label: "Theological", color: "text-purple-600 border-purple-600" },
    { id: 'historical', icon: <History className="h-4 w-4" />, label: "Historical", color: "text-amber-600 border-amber-600" },
  ];

  return (
    <div className={`min-h-screen ${bg()} p-4 md:p-8`} style={{ '--bible-font-size': fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px' } as React.CSSProperties}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className={`sticky top-0 border-b p-2 sm:p-3 md:p-4 flex items-center justify-between z-10 mb-6 gap-2 ${theme === 'sepia' ? 'bg-blue-100 border-blue-300' : theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <Link href="/bible-reader" className={`inline-flex items-center transition-colors flex-shrink-0 text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-orange-400' : 'text-gray-600 hover:text-orange-600'}`}>
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-0.5" />
            <span className="hidden xs:inline">Back</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* All Books */}
            <button onClick={() => router.push('/bible-reader')} className="px-2 sm:px-4 py-1.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1 font-semibold text-xs sm:text-sm">
              📚 <span className="hidden sm:inline">All </span>Books
            </button>

            {/* Language Toggle */}
            <button onClick={cycleLanguage}
              title={`Language: ${language}`}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-semibold transition-colors border-2 ${
                language === 'english' ? 'bg-blue-600 text-white border-blue-700' :
                language === 'luganda' ? 'bg-green-600 text-white border-green-700' :
                'bg-purple-600 text-white border-purple-700'
              }`}>
              {language === 'english' ? '🇬🇧 EN' : language === 'luganda' ? '🇺🇬 LU' : '🔀'}
            </button>

            {/* Theme */}
            <button onClick={cycleTheme}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-semibold transition-colors ${theme === 'light' ? 'bg-yellow-400 text-gray-900' : theme === 'sepia' ? 'bg-blue-600 text-white' : 'bg-indigo-700 text-white'}`}>
              {theme === 'light' ? '☀' : theme === 'sepia' ? '📄' : '🌙'}
            </button>

            {/* Font Size */}
            <button onClick={cycleFontSize}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-semibold transition-colors ${fontSize === 'small' ? 'bg-green-600 text-white' : fontSize === 'large' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
              A<span className="text-xs">{fontSize === 'small' ? '↓' : fontSize === 'large' ? '↑' : ''}</span>
            </button>

            {/* Book Theological Insights */}
            <button onClick={() => setBookTheologicalModalOpen(true)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-semibold transition-colors ${theme === 'dark' ? 'bg-purple-700 text-white hover:bg-purple-800' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
              title="Book Theological Insights">
              💡
            </button>

            {/* Mobile info toggle */}
            <button onClick={() => setShowSidePanel(!showSidePanel)}
              className={`md:hidden px-2 py-1.5 rounded text-xs sm:text-sm font-semibold ${theme === 'dark' ? 'bg-indigo-700 text-white' : 'bg-indigo-600 text-white'}`}>
              {showSidePanel ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* ── Main Content ── */}
          <div className="flex-1 min-w-0 mb-20">

            {/* Book Header */}
            <div className={`mb-8 pb-6 border-b-2 ${border()}`}>
              <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-3 border-2 ${badge()}`}>{book.testament}</div>
              <h1 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-2 ${hdr()}`}>{book.name_english}</h1>
              <p className={`text-xl font-semibold mb-1 ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>{book.name_luganda}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Select a chapter to begin reading ({book.total_chapters} chapter{book.total_chapters !== 1 ? 's' : ''})
              </p>
            </div>

            {/* Chapters Grid */}
            <div className={`rounded-2xl p-4 sm:p-6 mb-12 ${
              theme === 'dark'
                ? 'bg-gray-800/80 border border-gray-700'
                : theme === 'sepia'
                ? 'bg-blue-100/60 border border-blue-200'
                : isOT
                ? 'bg-gradient-to-br from-orange-50 via-amber-50/60 to-orange-100/40 border border-orange-200/60'
                : 'bg-gradient-to-br from-blue-50 via-indigo-50/60 to-blue-100/40 border border-blue-200/60'
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${
                theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : isOT ? 'text-orange-500' : 'text-blue-500'
              }`}>Select a Chapter</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center sm:justify-start">
                {Array.from({ length: book.total_chapters }, (_, i) => i + 1).map((chapter) => (
                  <Link key={chapter} href={`/bible-reader/${book.book_number}/${chapter}`}
                    className={`group relative flex items-center justify-center rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-md text-white font-semibold text-xs sm:text-sm overflow-hidden ${btnColor()}`}
                    style={{ width: '2.75rem', height: '2.75rem', flexShrink: 0 }}
                    title={`Chapter ${chapter}`}>
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-all duration-200 rounded-lg"></div>
                    <span className="relative z-10 leading-none">{chapter}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Quick Navigation ── */}
            <div className={`pt-8 border-t-2 ${border()}`}>
              <h3 className={`text-lg font-semibold mb-4 ${hdr()}`}>Quick Navigation</h3>
              <div className="flex flex-wrap gap-3 mb-8">
                <Link href={`/bible-reader/${book.book_number}/1`} className={`px-4 py-2 rounded font-semibold transition-all ${btnColor()} text-white hover:shadow-lg`}>
                  📖 Start Reading
                </Link>
                {book.total_chapters > 1 && (
                  <Link href={`/bible-reader/${book.book_number}/${Math.ceil(book.total_chapters / 2)}`} className="px-4 py-2 rounded font-semibold transition-all bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg">
                    ⏭ Middle
                  </Link>
                )}
                <Link href={`/bible-reader/${book.book_number}/${book.total_chapters}`} className="px-4 py-2 rounded font-semibold transition-all bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg">
                  🏁 Last Chapter
                </Link>
              </div>
            </div>

            {/* ── Book Study Sections (Commentary / Theological / Historical) ── */}
            <div className={`mt-4 rounded-2xl border-2 overflow-hidden ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : theme === 'sepia' ? 'border-blue-300 bg-blue-50' : 'border-indigo-100 bg-white'}`}>
              {/* Section header */}
              <button
                onClick={() => setShowBottomSection(!showBottomSection)}
                className={`w-full flex items-center justify-between px-6 py-4 font-semibold text-left ${theme === 'dark' ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-100 text-blue-900 hover:bg-blue-200' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'} transition-colors`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Book Study Resources
                </span>
                <span className={`transform transition-transform duration-200 text-lg ${showBottomSection ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {showBottomSection && (
                <div>
                  {/* Tab bar */}
                  <div className={`flex border-b ${border()}`}>
                    {bottomTabs.map(({ id, icon, label, color }) => (
                      <button key={id} onClick={() => setActiveBottomTab(id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                          activeBottomTab === id
                            ? `${color} bg-opacity-5`
                            : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`
                        }`}>
                        {icon}
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div className="p-6">
                    {/* Commentary */}
                    {activeBottomTab === 'commentary' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                          <h3 className={`text-lg font-bold ${hdr()}`}>{book.name_english} — Commentary</h3>
                        </div>
                        {bookCommentary && (bookCommentary.english_commentary || bookCommentary.luganda_commentary) ? (
                          <div className={`leading-relaxed rounded-xl p-5 border ${cardBg()}`}>
                            {renderContent(langText(bookCommentary.english_commentary, bookCommentary.luganda_commentary), `book-commentary-${book?.id}-${language}`) || <span>No commentary available</span>}
                          </div>
                        ) : (
                          <div className={`rounded-xl p-6 border-2 border-dashed text-center ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-blue-200 text-gray-400'}`}>
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No commentary added yet for {book.name_english}.</p>
                            <p className="text-xs mt-1 opacity-70">Commentary can be added via the Admin Panel.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Theological */}
                    {activeBottomTab === 'theological' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-5 w-5 text-purple-600" />
                          <h3 className={`text-lg font-bold ${hdr()}`}>{book.name_english} — Theological Insights</h3>
                        </div>
                        {bookTheological && (bookTheological.english_insight || bookTheological.luganda_insight) ? (
                          <div className={`leading-relaxed rounded-xl p-5 border ${cardBg()}`}>
                            {renderContent(langText(bookTheological.english_insight, bookTheological.luganda_insight), `book-theo-${book?.id}-${language}`) || <span>No insights available</span>}
                          </div>
                        ) : (
                          <div className={`rounded-xl p-6 border-2 border-dashed text-center ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-purple-200 text-gray-400'}`}>
                            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No theological insights added yet for {book.name_english}.</p>
                            <p className="text-xs mt-1 opacity-70">Insights can be added via the Admin Panel.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Historical — Live data from historical_content table */}
                    {activeBottomTab === 'historical' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <History className="h-5 w-5 text-amber-600" />
                          <h3 className={`text-lg font-bold ${hdr()}`}>{book.name_english} — Historical Context</h3>
                        </div>
                        {bookHistorical && (bookHistorical.historical_background || bookHistorical.cultural_context || bookHistorical.maps_geography || bookHistorical.timeline || bookHistorical.archaeological_notes) ? (
                          <div className="space-y-4">
                            {[
                              { key: 'historical_background', label: '🏺 Historical Background', icon: '🏺', color: theme === 'dark' ? 'border-amber-700 bg-amber-950/20' : 'border-amber-200 bg-amber-50' },
                              { key: 'cultural_context', label: '🌍 Cultural Context', icon: '🌍', color: theme === 'dark' ? 'border-orange-700 bg-orange-950/20' : 'border-orange-200 bg-orange-50' },
                              { key: 'maps_geography', label: '🗺 Maps & Geography', icon: '🗺', color: theme === 'dark' ? 'border-green-800 bg-green-950/20' : 'border-green-200 bg-green-50' },
                              { key: 'timeline', label: '📅 Timeline', icon: '📅', color: theme === 'dark' ? 'border-blue-800 bg-blue-950/20' : 'border-blue-200 bg-blue-50' },
                              { key: 'archaeological_notes', label: '⛏ Archaeological Notes', icon: '⛏', color: theme === 'dark' ? 'border-purple-800 bg-purple-950/20' : 'border-purple-200 bg-purple-50' },
                            ].map(({ key, label, color }) => {
                              const val = bookHistorical[key as keyof BookHistorical];
                              if (!val) return null;
                              return (
                                <div key={key} className={`rounded-xl p-5 border ${color}`}>
                                  <h4 className={`font-bold text-sm mb-3 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-800'}`}>{label}</h4>
                                  <div className={`leading-relaxed text-sm ${txt()}`}>{renderContent(val, `book-hist-${book?.id}-${key}`)}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={`rounded-xl p-6 border-2 border-dashed text-center ${theme === 'dark' ? 'border-amber-800 text-gray-400' : 'border-amber-200 text-gray-400'}`}>
                            <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No historical content added yet for {book.name_english}.</p>
                            <p className="text-xs mt-1 opacity-70">Historical content can be added via Admin Panel → Historical Context.</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              {['Historical Background', 'Cultural Context', 'Maps & Geography', 'Timeline', 'Archaeological Notes'].map(tag => (
                                <span key={tag} className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-700 border border-amber-300'}`}>{tag}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── Desktop Side Panel ── */}
          <div className={`hidden md:block w-88 border-l p-6 sticky top-24 max-h-[calc(100vh-100px)] overflow-y-auto shrink-0 ${panelBg()}`} style={{width:'22rem', ...(theme === 'light' ? { background: 'rgba(219, 234, 254, 0.25)' } : {})}}>
            <SidePanelTabs />
            {renderSidePanelContent()}
          </div>
        </div>

        {/* ── Mobile Side Panel ── */}
        {showSidePanel && <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowSidePanel(false)} />}
        {showSidePanel && (
          <div className={`md:hidden fixed right-0 top-0 h-full w-80 shadow-lg z-50 overflow-y-auto pt-20 pb-20 ${theme === 'dark' ? 'bg-gray-800' : theme === 'sepia' ? 'bg-blue-100' : ''}`} style={theme === 'light' ? { background: 'rgba(219, 234, 254, 0.92)' } : {}}>
            <button onClick={() => setShowSidePanel(false)} className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-800">
              <X className="h-6 w-6" />
            </button>
            <div className="p-4">
              <SidePanelTabs />
              {renderSidePanelContent()}
            </div>
          </div>
        )}

        {/* Book-level Theological Insights Modal */}
        {book && (
          <TheologicalInsightsModal
            isOpen={bookTheologicalModalOpen}
            onClose={() => setBookTheologicalModalOpen(false)}
            mode="book"
            bookId={book.id}
            bookName={book.name_english}
            theme={theme}
            language={language}
          />
        )}

        {/* Mark bar — same as chapter page: appears when you select text */}
        {pendingMark && (
          <div className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-[76px] bg-slate-900 text-white rounded-full shadow-2xl px-2 py-1.5 flex items-center gap-1 max-w-[96vw] overflow-x-auto">
            <span className="hidden sm:inline text-[11px] text-slate-300 pl-1 pr-1 whitespace-nowrap">Mark:</span>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyMark('highlight', 'bg-yellow-300 text-slate-900')} title="Highlight yellow" className="w-8 h-8 rounded-full bg-yellow-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyMark('highlight', 'bg-green-300 text-slate-900')} title="Highlight green" className="w-8 h-8 rounded-full bg-green-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyMark('highlight', 'bg-pink-300 text-slate-900')} title="Highlight pink" className="w-8 h-8 rounded-full bg-pink-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyMark('underline', 'decoration-orange-500 text-inherit')} title="Underline orange" className="w-8 h-8 rounded-full bg-white text-slate-900 text-[13px] font-bold flex items-center justify-center underline decoration-orange-500">U</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyMark('underline', 'decoration-blue-500 text-inherit')} title="Underline blue" className="w-8 h-8 rounded-full bg-white text-slate-900 text-[13px] font-bold flex items-center justify-center underline decoration-blue-500">U</button>
            <button onClick={() => { clearMarksForKey(pendingMark.key); setPendingMark(null); }} title="Clear all marks in this section" className="px-2 h-8 rounded-full bg-white/15 text-[11px] font-bold flex items-center justify-center whitespace-nowrap">Clear</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => { try { navigator.clipboard?.writeText(pendingMark.text); } catch {} setPendingMark(null); }} title="Copy selection" className="w-8 h-8 rounded-full bg-white/15 text-[13px] flex items-center justify-center">⧉</button>
            <button onClick={() => setPendingMark(null)} title="Close" className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">✕</button>
          </div>
        )}

        {/* Scripture Verse Popup */}
        <ScriptureVersePopup popup={scripturePopup} onClose={closeScripturePopup} />

      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <BookChaptersContent />
    </Suspense>
  );
}
