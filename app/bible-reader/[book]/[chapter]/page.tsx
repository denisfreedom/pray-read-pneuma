"use client";
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// RESTORED ORIGINAL LOOK — same layout as your 3 John screenshot.
// Only the data wiring is fixed. No redesign.
// Verses: try every param/shape the bible-verses API has used, until one returns rows.
// Prayers: per-verse. Prayer button under a verse opens THAT verse's prayer
// (inline under the verse + in the right Prayer tab). NOT a list of all prayers.

function pickPrayer(row: any) {
  if (!row) return { en: '', lu: '' };
  return {
    en: row.pray_read_english || row.en_prayer || row.prayer_english || row.prayer || '',
    lu: row.pray_read_luganda || row.lu_prayer || row.prayer_luganda || '',
  };
}
function pickIntro(row: any) {
  if (!row) return { en: '', lu: '' };
  return {
    en: row.introduction_english || row.en_introduction || row.introduction || '',
    lu: row.introduction_luganda || row.lu_introduction || '',
  };
}
function pickClosing(row: any) {
  if (!row) return { en: '', lu: '' };
  return {
    en: row.closing_prayer_english || row.en_closing_prayer || row.prayer_english || row.en_prayer || row.closing_prayer || '',
    lu: row.closing_prayer_luganda || row.lu_closing_prayer || row.prayer_luganda || row.lu_prayer || '',
  };
}

function ChapterContent() {
  const params = useParams();
  const router = useRouter();
  const bookNum = parseInt(String(params.book));
  const chapterNum = parseInt(String(params.chapter));
  const [book, setBook] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'EN' | 'LU' | 'BOTH'>('EN');
  const [sidebarLang, setSidebarLang] = useState<'EN' | 'LU' | 'BOTH'>('EN'); // V5: sidebar ONLY — independent of main reader lang
  const [fontSize, setFontSize] = useState(17);
  const [rightTab, setRightTab] = useState<'intro' | 'commentary' | 'prayer'>('intro');
  const [chapterIntro, setChapterIntro] = useState<any>(null);
  const [versePrayers, setVersePrayers] = useState<Record<number, any>>({});
  const [chapterClosing, setChapterClosing] = useState<any>(null);
  const [bookClosing, setBookClosing] = useState<any>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  // One expanded panel per verse: 'prayer' | 'crossref' | null. Second click closes. Switching buttons swaps panels.
  const [activePanel, setActivePanel] = useState<'prayer' | 'crossref' | 'commentary' | null>(null);
  const [crossRefs, setCrossRefs] = useState<any[]>([]);
  const [loadingCross, setLoadingCross] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  // --- V3: themes, share sheet, bookmarks, commentary ---
  const [theme, setTheme] = useState<'white' | 'lightblue' | 'dark'>('lightblue');
  const [shareVerse, setShareVerse] = useState<any | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(`prayread-bookmarks-${bookNum}-${chapterNum}`) || '[]'); } catch { return []; }
  });
  const [commentary, setCommentary] = useState<Record<number, any>>({});
  // FIX: sidebar Commentary tab was hard-coded to a placeholder, and the verse panel
  // fell through to JSON.stringify() because the API returns commentary_text /
  // luganda_commentary_text, not text_english / commentary / content.
  const [chapterCommentary, setChapterCommentary] = useState<any>(null);
  // Pick the right field from ANY commentary shape (verse / chapter / book, any API).
  // Returns raw HTML (admin saves RichText) — render with dangerouslySetInnerHTML, never as plain text.
  const commHtml = (c: any, wantLu: boolean): string => {
    if (!c || typeof c !== 'object') return typeof c === 'string' ? c : '';
    if (wantLu) return c.luganda_commentary_text ?? c.luganda_commentary ?? c.text_luganda ?? c.luganda ?? c.lu ?? '';
    return c.commentary_text ?? c.english_commentary ?? c.text_english ?? c.commentary ?? c.text ?? c.content ?? '';
  };
  const commHtmlForLang = (c: any, lang: 'EN' | 'LU' | 'BOTH', markKey?: string): string => {
    if (!c) return '';
    // FIX (refs not clickable): EN and LU used to return commHtml() RAW — linkifyRefs()
    // only ran on the BOTH path. This page runs on EN (GB EN), so refs were never blue.
    // Now EVERY path goes through linkifyRefs(), then through saved highlight marks.
    let raw = '';
    if (lang === 'EN') raw = commHtml(c, false);
    else if (lang === 'LU') raw = commHtml(c, true);
    else { const en = commHtml(c, false), lu = commHtml(c, true); raw = en && lu ? en + '<hr style="margin:12px 0;opacity:.3"/>' + lu : (en || lu); }
    let html = linkifyRefs(raw);
    if (markKey) html = applyMarksToHtml(html, markKey);
    return html;
  };
  // ── RESTORED: Highlight / Underline (Mark) — select any text in a verse, prayer passage, or commentary ──
  // Private to this device/browser only: saved in localStorage, never sent to the server.
  // How to use: drag to select words (long-press + drag on phone) → the Mark bar appears at the
  // bottom → tap A (yellow/green/pink highlight) or U (orange/blue underline). Tap a mark's section
  // again and use Clear to remove. Works in verses, prayer passages, commentary, intro & closing.
  type Mark = { id: string; text: string; style: 'highlight' | 'underline'; color: string };
  const [marks, setMarks] = useState<Record<string, Mark[]>>(() => {
    try { return JSON.parse(localStorage.getItem(`prayread-marks-${bookNum}-${chapterNum}`) || '{}'); } catch { return {}; }
  });
  const [pendingMark, setPendingMark] = useState<{ key: string; text: string } | null>(null);
  const markKey = (verse: number, langKey: string) => `${verse}-${langKey}`;
  const saveMarks = (next: Record<string, Mark[]>) => { setMarks(next); try { localStorage.setItem(`prayread-marks-${bookNum}-${chapterNum}`, JSON.stringify(next)); } catch {} };
  const applyMark = (style: 'highlight' | 'underline', color: string) => {
    if (!pendingMark) return;
    const existing = marks[pendingMark.key] || [];
    if (existing.some(m => m.text === pendingMark.text && m.style === style && m.color === color)) { setPendingMark(null); return; }
    saveMarks({ ...marks, [pendingMark.key]: [...existing, { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), text: pendingMark.text, style, color }] });
    setPendingMark(null);
    try { window.getSelection()?.removeAllRanges(); } catch {}
  };
  const clearMarksForKey = (key: string) => { const next = { ...marks }; delete next[key]; saveMarks(next); };
  const onSelectGeneric = (key: string) => {
    setTimeout(() => {
      try {
        const sel = window.getSelection(); const txt = sel?.toString() || '';
        if (!txt.trim() || txt.trim().length < 2) { setPendingMark(null); return; }
        setPendingMark({ key, text: txt });
      } catch { setPendingMark(null); }
    }, 10);
  };
  const onSelectText = (verse: number, langKey: string) => onSelectGeneric(markKey(verse, langKey));
  // Plain-text sections (verses, prayers): split by saved marks and wrap matches.
  const renderMarkedByKey = (text: string, key: string): React.ReactNode => {
    const list = marks[key] || [];
    if (!text || !list.length) return <>{text}</>;
    let k = 0;
    const renderWith = (str: string, ms: Mark[]): React.ReactNode[] => {
      if (!ms.length) return [str];
      const [first, ...rest] = ms; const idx = str.indexOf(first.text);
      if (idx === -1) return renderWith(str, rest);
      return [...(str.slice(0, idx) ? renderWith(str.slice(0, idx), rest) : []),
        <span key={first.id + '-' + k++} className={first.style === 'highlight' ? `px-0.5 rounded ${first.color}` : `underline decoration-2 underline-offset-4 ${first.color}`}>{str.slice(idx, idx + first.text.length)}</span>,
        ...(str.slice(idx + first.text.length) ? renderWith(str.slice(idx + first.text.length), rest) : [])];
    };
    return <>{renderWith(text, [...list].sort((a, b) => b.text.length - a.text.length))}</>;
  };
  const renderMarked = (text: string, verse: number, langKey: string) => renderMarkedByKey(text, markKey(verse, langKey));
  // HTML sections (commentary, rich text): apply marks to TEXT between tags only, never inside tags.
  // Also skips text inside a .scripture-ref span so a mark can never break a clickable verse ref.
  const applyMarksToHtml = (html: string, key: string): string => {
    const list = marks[key] || [];
    if (!html || !list.length) return html;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return html.split(/(<[^>]+>)/g).map(part => {
      if (!part || part.startsWith('<')) return part;
      let out = part;
      [...list].sort((a, b) => b.text.length - a.text.length).forEach(m => {
        if (!m.text || !out.includes(m.text)) return;
        const cls = m.style === 'highlight' ? m.color + ' px-0.5 rounded' : 'underline decoration-2 underline-offset-4 ' + m.color;
        out = out.split(m.text).join(`<span class="${cls}">${m.text}</span>`);
      });
      return out;
    }).join('');
  };

  // ── FIX: clickable Scripture refs inside commentary ──────────────────────────
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [refPopup, setRefPopup] = useState<null | { ref: string; bookName: string; bookNum: number; chapter: number; verses: number[]; loading: boolean; text: string; error?: string }>(null);
  const BOOK_NAMES = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Psalm','Proverbs','Ecclesiastes','Song of Solomon','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
  const REF_RE = new RegExp('\\b((?:[123]\\s)?(?:' + BOOK_NAMES.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '))\\s+(\\d+):(\\d+(?:-\\d+)?(?:,\\s*\\d+(?:-\\d+)?)*)', 'gi');
  const linkifyRefs = (html: string): string => {
    if (!html) return '';
    return html.split(/(<[^>]+>)/g).map(part => {
      if (!part || part.startsWith('<')) return part;
      return part.replace(REF_RE, (m) => `<span class="scripture-ref" data-ref="${m}" style="color:#1d4ed8;text-decoration:underline;text-underline-offset:2px;cursor:pointer;font-weight:600">${m}</span>`);
    }).join('');
  };
  const parseRef = (ref: string) => {
    const m = ref.trim().match(/^((?:[123]\s)?[A-Za-z ]+?)\s+(\d+):(.+)$/);
    if (!m) return null;
    const bookName = m[1].trim().replace(/\s+/g, ' ');
    const chapter = parseInt(m[2]);
    const verses: number[] = [];
    m[3].split(',').forEach(seg => { const mm = seg.trim().match(/^(\d+)(?:-(\d+))?$/); if (mm) { const a = parseInt(mm[1]), b = mm[2] ? parseInt(mm[2]) : a; for (let v = a; v <= b; v++) verses.push(v); } });
    return { bookName, chapter, verses };
  };
  const openScriptureRef = async (ref: string) => {
    const p = parseRef(ref); if (!p) return;
    const b = allBooks.find((x: any) => (x.name || x.book_name || '').toLowerCase() === p.bookName.toLowerCase() || (x.name_english || '').toLowerCase() === p.bookName.toLowerCase()) || null;
    const bookNum = b ? (b.book_number ?? b.id ?? 0) : 0;
    setRefPopup({ ref, bookName: p.bookName, bookNum, chapter: p.chapter, verses: p.verses, loading: true, text: '' });
    try {
      const r = await fetch(`/api/bible-verses?book_number=${bookNum}&chapter=${p.chapter}`);
      const d = await r.json().catch(() => null);
      const arr = Array.isArray(d) ? d : (d?.verses || d?.data || []);
      const picked = arr.filter((v: any) => p.verses.includes(Number(v.verse ?? v.verse_number))).sort((a: any, b2: any) => (a.verse ?? a.verse_number) - (b2.verse ?? b2.verse_number));
      const text = picked.length ? picked.map((v: any) => `${v.verse ?? v.verse_number}. ${v.text ?? v.text_english ?? v.verse_text ?? ''}`).join('\n\n') : '';
      setRefPopup({ ref, bookName: p.bookName, bookNum, chapter: p.chapter, verses: p.verses, loading: false, text, error: picked.length ? undefined : 'Verse text not found.' });
    } catch { setRefPopup({ ref, bookName: p.bookName, bookNum, chapter: p.chapter, verses: p.verses, loading: false, text: '', error: 'Could not load verse text.' }); }
  };
  const handleCommentaryClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest?.('.scripture-ref') as HTMLElement | null;
    if (el?.dataset?.ref) { e.preventDefault(); e.stopPropagation(); openScriptureRef(el.dataset.ref); }
  };
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!bookNum || !chapterNum) return;
    const load = async () => {
      setLoading(true);
      try {
        // --- Books ---
        let books: any[] = [];
        try {
          const r = await fetch('/api/bible-books');
          const d = await r.json().catch(() => []);
          books = Array.isArray(d) ? d : (d.books || d.data || []);
        } catch {}
        const b = books.find((x: any) => x.book_number === bookNum || x.id === bookNum || x.book_id === bookNum) || null;
        setBook(b);
        setAllBooks(books);
        const bookId = b?.id ?? bookNum;
        // FIX: sidebar Commentary tab needs chapter commentary — fetch it once on load.
        // Never blocks the verses if it fails.
        try {
          const rr = await fetch(`/api/chapter-commentaries?bookId=${bookId}&chapter=${chapterNum}`);
          const dd = await rr.json().catch(() => null);
          const row = Array.isArray(dd) ? dd[0] : dd;
          if (row && (commHtml(row, false) || commHtml(row, true))) setChapterCommentary(row);
        } catch {}

        // --- Verses: try EVERY param style + EVERY response shape ---
        // This is the bug that blanked Esther: the old new-page only tried book_number + array.
        let vList: any[] = [];
        const verseUrls = [
          `/api/bible-verses?book_number=${bookNum}&chapter=${chapterNum}`,
          `/api/bible-verses?bookId=${bookId}&chapter=${chapterNum}`,
          `/api/bible-verses?book=${bookNum}&chapter=${chapterNum}`,
          `/api/bible-verses?id=${bookId}&chapter=${chapterNum}`,
          `/api/bible-verses?book_id=${bookId}&chapter=${chapterNum}`,
        ];
        for (const url of verseUrls) {
          try {
            const r = await fetch(url);
            const d = await r.json().catch(() => null);
            const arr = Array.isArray(d) ? d : (d?.verses || d?.data || d?.rows || []);
            if (Array.isArray(arr) && arr.length) { vList = arr; break; }
          } catch {}
        }
        // Normalise verse field names: text_english/text_luganda OR english/luganda OR text
        vList = vList.map((v: any) => ({
          ...v,
          verse: v.verse ?? v.verse_number ?? v.number,
          text_english: v.text_english || v.english || v.text_en || v.text || '',
          text_luganda: v.text_luganda || v.luganda || v.text_lu || '',
        })).sort((a: any, b: any) => a.verse - b.verse);
        setVerses(vList);

        // --- Verse prayers: same multi-fallback ---
        let prayers: any[] = [];
        const prayerUrls = [
          `/api/verse-prayers?book_number=${bookNum}&chapter=${chapterNum}`,
          `/api/prayer-passages?book_number=${bookNum}&chapter=${chapterNum}`,
          `/api/verse-prayers?bookId=${bookId}&chapter=${chapterNum}`,
          `/api/prayer-passages?bookId=${bookId}&chapter=${chapterNum}`,
          `/api/verse-prayers?book=${bookNum}&chapter=${chapterNum}`,
        ];
        for (const url of prayerUrls) {
          try {
            const r = await fetch(url);
            const d = await r.json().catch(() => null);
            const arr = Array.isArray(d) ? d : (d?.prayers || d?.data || []);
            if (Array.isArray(arr) && arr.length) { prayers = arr; break; }
          } catch {}
        }
        const map: Record<number, any> = {};
        prayers.forEach((p: any) => { const vn = p.verse ?? p.verse_number; if (vn) map[vn] = p; });
        setVersePrayers(map);

        // --- Chapter intro + closing ---
        try {
          const r = await fetch(`/api/chapter-introductions?bookId=${bookId}&chapter=${chapterNum}`);
          const d = await r.json().catch(() => null);
          if (d && !Array.isArray(d)) setChapterIntro(d);
          else if (Array.isArray(d) && d.length) setChapterIntro(d[0]);
        } catch {}
        try {
          const r = await fetch(`/api/chapter-prayers?bookId=${bookId}&chapter=${chapterNum}`);
          const d = await r.json().catch(() => null);
          if (d && (pickClosing(d).en || pickClosing(d).lu)) setChapterClosing(d);
        } catch {}
        // --- Book closing (shown at bottom of Prayer tab / Closing section) ---
        try {
          const r = await fetch(`/api/book-prayers?bookId=${bookId}`);
          const d = await r.json().catch(() => null);
          if (d && (pickClosing(d).en || pickClosing(d).lu)) setBookClosing(d);
        } catch {}
      } finally { setLoading(false); }
    };
    load();
  }, [bookNum, chapterNum]);

  const openPrayer = (verseNum: number) => {
    // Second click on the SAME verse's Prayer button = minimize / close
    if (selectedVerse === verseNum && activePanel === 'prayer') {
      setSelectedVerse(null);
      setActivePanel(null);
      return;
    }
    // Otherwise open prayer, and minimize cross-ref if it was open
    setSelectedVerse(verseNum);
    setActivePanel('prayer');
    setRightTab('prayer');
  };
  const openCrossRefs = async (verseNum: number) => {
    // Second click on the SAME verse's Cross-Ref button = minimize / close
    if (selectedVerse === verseNum && activePanel === 'crossref') {
      setSelectedVerse(null);
      setActivePanel(null);
      return;
    }
    // Otherwise: MINIMIZE prayer, open cross-ref in light paper
    setSelectedVerse(verseNum);
    setActivePanel('crossref');
    setLoadingCross(true);
    setCrossRefs([]);
    const bookId = book?.id ?? bookNum;
    const urls = [
      `/api/cross-references?source_book_number=${bookNum}&source_chapter=${chapterNum}&source_verse=${verseNum}`,
      `/api/verse-cross-references?source_book_number=${bookNum}&source_chapter=${chapterNum}&source_verse=${verseNum}`,
      `/api/cross-references?source_book_id=${bookId}&source_chapter=${chapterNum}&source_verse=${verseNum}`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url);
        const d = await r.json().catch(() => []);
        const arr = Array.isArray(d) ? d : (d?.refs || []);
        if (arr.length) { setCrossRefs(arr); break; }
      } catch {}
    }
    setLoadingCross(false);
  };

  const openCommentary = async (verseNum: number) => {
    if (selectedVerse === verseNum && activePanel === 'commentary') { setSelectedVerse(null); setActivePanel(null); return; }
    setSelectedVerse(verseNum);
    setActivePanel('commentary');
    setRightTab('commentary');
    if (commentary[verseNum]) return;
    // Try commentary API if it exists — if not, we show the built-in reading note, never a blank crash
    try {
      const r = await fetch(`/api/commentaries?book_number=${bookNum}&chapter=${chapterNum}&verse=${verseNum}`);
      const d = await r.json().catch(() => null);
      const arr = Array.isArray(d) ? d : (d ? [d] : []);
      if (arr.length) setCommentary(prev => ({ ...prev, [verseNum]: arr[0] }));
    } catch {}
  };

  const toggleBookmark = (verseNum: number) => {
    setBookmarks(prev => {
      const next = prev.includes(verseNum) ? prev.filter(v => v !== verseNum) : [...prev, verseNum];
      try { localStorage.setItem(`prayread-bookmarks-${bookNum}-${chapterNum}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const linkColor = theme === 'dark' ? 'text-orange-400' : '{linkColor}'; // V5: blue -> orange in Dark
  const crossBody = theme === 'dark' ? 'text-slate-100' : 'text-slate-700'; // V5: cross-ref body near-white in Dark
  const bodySize = fontSize; // V5 universal: base size drives verses + prayer + sidebar + cross-ref
  const smallSize = Math.max(12, fontSize - 2);
  const headingBlue = theme === 'dark' ? 'text-orange-400' : 'text-blue-800';
  // V4: Sun cycles ONLY 3 themes: White -> Light Blue (original) -> Dark (white text) -> White
  const cycleTheme = () => setTheme(t => t === 'white' ? 'lightblue' : t === 'lightblue' ? 'dark' : 'white');
  const themeClasses = theme === 'dark'
    ? { page: 'bg-slate-950 text-slate-100', card: 'bg-slate-900 text-slate-100 border-slate-800', header: 'bg-slate-950 text-slate-100 border-slate-800', text: 'text-slate-100', muted: 'text-slate-300', submuted: 'text-slate-400', paper: 'bg-slate-800 text-slate-100 border-slate-700', prayer: 'bg-rose-950/40 text-rose-100 border-rose-900/50', chip: 'bg-slate-800 text-slate-100', divider: 'border-slate-700' }
    : theme === 'white'
    ? { page: 'bg-white text-slate-900', card: 'bg-white text-slate-900 border-slate-200', header: 'bg-white text-slate-900 border-slate-200', text: 'text-slate-900', muted: 'text-slate-600', submuted: 'text-slate-500', paper: 'bg-[#FFFEF7] text-slate-900 border-amber-200', prayer: 'bg-rose-50 text-slate-900 border-rose-100', chip: 'bg-slate-100 text-slate-800', divider: 'border-slate-100' }
    : { page: 'bg-[#BDD7F5] text-slate-900', card: 'bg-[#DCEBFF] text-slate-900 border-[#A8C6EE]', header: 'bg-[#C7DEFA] text-slate-900 border-[#A8C6EE]', text: 'text-slate-900', muted: 'text-slate-700', submuted: 'text-slate-600', paper: 'bg-[#FFFEF7] text-slate-900 border-amber-200', prayer: 'bg-rose-50 text-slate-900 border-rose-100', chip: 'bg-[#C7DEFA] text-slate-800', divider: 'border-[#A8C6EE]' };

  const shareText = (v: any) => `${bookName} ${chapterNum}:${v.verse} — ${verseText(v)}`;
  const shareUrl = (v: any) => typeof window !== 'undefined' ? `${window.location.origin}/bible-reader/${bookNum}/${chapterNum}#verse-${v.verse}` : '';
  const openShare = (v: any) => setShareVerse(v);


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#BDD7F5]"><p className="text-slate-500 text-sm">Loading chapter…</p></div>;

  const bookName = book?.name_english || `Book ${bookNum}`;
  const bookNameLu = book?.name_luganda || '';
  const testament = book?.testament || (bookNum <= 39 ? 'Old Testament' : 'New Testament');
  const totalChapters = book?.total_chapters || book?.chapters || '?';
  const intro = pickIntro(chapterIntro);
  const closing = pickClosing(chapterClosing).en || pickClosing(chapterClosing).lu ? pickClosing(chapterClosing) : pickClosing(chapterIntro);
  const bookClose = pickClosing(bookClosing);
  const selectedPrayer = selectedVerse ? pickPrayer(versePrayers[selectedVerse]) : { en: '', lu: '' };
  const verseText = (v: any) => lang === 'LU' ? (v.text_luganda || v.text_english) : lang === 'BOTH' ? v.text_english : (v.text_english || v.text_luganda);

  return (
    <div className={`min-h-screen ${themeClasses.page}`}>
      {/* Header — ORIGINAL */}
      <div className={`${themeClasses.header} border-b sticky top-0 z-30`}>
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/bible-reader')} className="text-slate-600 text-[15px] hover:text-slate-900">‹ Back</button>
          <div className="flex-1 text-center">
            <h1 className="text-[19px] font-bold leading-tight">{bookName} {chapterNum}</h1>
            <p className="text-[12px] text-slate-500">Ch {chapterNum} of {totalChapters}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setLang(lang === 'EN' ? 'LU' : lang === 'LU' ? 'BOTH' : 'EN')} className="w-9 h-9 rounded-md bg-orange-600 text-white text-[12px] font-bold flex items-center justify-center" title="Language">{lang === 'EN' ? 'GB' : lang}</button>
            <button onClick={cycleTheme} title={`Theme: ${theme} — tap for White / Light Blue / Dark`} className="w-9 h-9 rounded-md bg-yellow-400 text-[15px] flex items-center justify-center">{theme === "dark" ? "🌙" : theme === "white" ? "⚪" : "☀️"}</button>
            <button onClick={() => setFontSize(Math.max(14, fontSize - 1))} className="w-9 h-9 rounded-md bg-slate-200 text-lg flex items-center justify-center">−</button>
            <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="w-9 h-9 rounded-md bg-slate-200 text-lg flex items-center justify-center">+</button>
            <button onClick={() => setMenuOpen(o => !o)} title="Menu" className="w-9 h-9 rounded-md bg-blue-600 text-white text-lg flex items-center justify-center">☰</button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-4 grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* LEFT — ORIGINAL */}
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[13px] font-semibold">{testament}</span>
          <h2 className="text-[44px] leading-[1.1] font-bold text-[#1E3A8A] mt-3">{bookName}</h2>
          <p className="text-[19px] font-bold {linkColor} mt-1">Chapter {chapterNum}</p>
          {bookNameLu && <p className="text-slate-600 text-[15px] mt-0.5">{bookNameLu}</p>}
          <hr className="border-blue-200 my-4" />

          {verses.length === 0 ? (
            <div className={`${themeClasses.card} rounded-xl p-8 text-center shadow-sm`}>
              <p className="font-bold">Verses could not be loaded.</p>
              <p className="text-sm text-slate-500 mt-1">Neon has the verses — this page tried 5 verse URLs and got none back. Check <code className="bg-slate-100 px-1 rounded">/api/bible-verses?book_number={bookNum}&amp;chapter={chapterNum}</code> in a new tab.</p>
              <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg">Reload</button>
            </div>
          ) : verses.map((v: any) => {
            const hasPrayer = !!(pickPrayer(versePrayers[v.verse]).en || pickPrayer(versePrayers[v.verse]).lu);
            const isSel = selectedVerse === v.verse;
            const pr = pickPrayer(versePrayers[v.verse]);
            return (
              <article id={`verse-${v.verse}`} key={v.verse} className={`${themeClasses.card} rounded-xl p-5 shadow-sm mb-3 ${isSel ? 'ring-2 ring-amber-500' : ''}`}>
                <div className="flex gap-2">
                  <span className="text-orange-600 font-bold text-[17px] shrink-0">{v.verse}</span>
                  <div className="flex-1">
                    <p onMouseUp={() => onSelectText(v.verse, lang === 'LU' ? 'LU' : 'EN')} onTouchEnd={() => onSelectText(v.verse, lang === 'LU' ? 'LU' : 'EN')} style={{ fontSize }} className={`leading-relaxed ${themeClasses.text} select-text cursor-text`} style={{ fontSize: bodySize }}>{renderMarked(verseText(v), v.verse, lang === 'LU' ? 'LU' : 'EN')}</p>
                    {lang === 'BOTH' && v.text_luganda && <p onMouseUp={() => onSelectText(v.verse, 'LU')} onTouchEnd={() => onSelectText(v.verse, 'LU')} style={{ fontSize }} className={`leading-relaxed ${themeClasses.muted} mt-2 pt-2 border-t ${themeClasses.divider} select-text cursor-text`}>{renderMarked(v.text_luganda, v.verse, 'LU')}</p>}
                  </div>
                  <button onClick={() => { navigator.clipboard?.writeText(`${bookName} ${chapterNum}:${v.verse} — ${verseText(v)}`); setCopied(v.verse); setTimeout(() => setCopied(null), 1200); }} className="text-slate-400 hover:text-slate-600 self-start text-[16px]" title="Copy">{copied === v.verse ? '✓' : '⧉'}</button>
                </div>
                <hr className="border-slate-100 my-3" />
                {/* V3: Notes + Insight REMOVED — Bookmark now fits on the same line */}
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => openPrayer(v.verse)} disabled={!hasPrayer} className={`px-3 py-1.5 rounded-lg text-[13.5px] font-medium ${hasPrayer ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}>♡ Prayer</button>
                  <button onClick={() => openShare(v)} className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-900 text-[13.5px] font-medium">🔗 Share</button>
                  <button onClick={() => openCrossRefs(v.verse)} className={`px-3 py-1.5 rounded-lg text-[13.5px] font-medium ${isSel && activePanel === 'crossref' ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-800'}`}>🔗 Cross-Ref</button>
                  <button onClick={() => openCommentary(v.verse)} className={`px-3 py-1.5 rounded-lg text-[13.5px] font-medium ${isSel && activePanel === 'commentary' ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-800'}`}>📖 Commentary</button>
                  <button onClick={() => toggleBookmark(v.verse)} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium ${bookmarks.includes(v.verse) ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-700'}`}>{bookmarks.includes(v.verse) ? '🔖 Saved ✓' : '🔖 Bookmark'}</button>
                </div>

                {/* Prayer for THIS verse — inline, under THIS verse. Nowhere else. */}
                {isSel && activePanel === 'prayer' && (
                  <div className={`mt-4 rounded-xl ${themeClasses.prayer} border p-4`}>
                    <p className="text-[11px] font-bold tracking-wide text-rose-500 uppercase mb-2">🙏 Pray-Read · Verse {v.verse}</p>
                    {!pr.en && !pr.lu ? <p className="text-sm text-slate-500 italic">No prayer added yet for this verse.</p> : (
                      <>
                        {pr.en && <p onMouseUp={() => onSelectGeneric(`prayer-${v.verse}-EN`)} onTouchEnd={() => onSelectGeneric(`prayer-${v.verse}-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(pr.en, `prayer-${v.verse}-EN`)}</p>}
                        {pr.lu && <p onMouseUp={() => onSelectGeneric(`prayer-${v.verse}-LU`)} onTouchEnd={() => onSelectGeneric(`prayer-${v.verse}-LU`)} className={`text-[15px] leading-relaxed whitespace-pre-wrap select-text cursor-text ${pr.en ? 'mt-3 pt-3 border-t border-rose-200/60' : ''}`}>{renderMarkedByKey(pr.lu, `prayer-${v.verse}-LU`)}</p>}
                      </>
                    )}
                  </div>
                )}
                {/* Cross-refs for THIS verse — LIGHT PAPER card. Opens when Prayer is minimized. */}
                {isSel && activePanel === 'crossref' && (
                  <div className={`mt-3 rounded-xl ${themeClasses.paper} border shadow-md p-4`}>
                    <p className="text-[11px] font-bold tracking-wide uppercase mb-2">🔗 Cross References · Verse {v.verse}</p>
                    {loadingCross ? <p className="text-sm text-slate-500">Loading…</p> : crossRefs.length === 0 ? <p className="text-sm text-slate-500 italic">No cross-references for this verse.</p> : (
                      <ul className="space-y-1.5">{crossRefs.map((cr: any, i: number) => (
                        <li key={i} className="text-sm"><Link href={`/bible-reader/${cr.target_book_number || cr.target_book_id}/${cr.target_chapter}`} className="font-bold {linkColor} hover:underline">{cr.target_book_name || `Book ${cr.target_book_id}`} {cr.target_chapter}:{cr.target_verse}</Link>{cr.text_english && <span className="text-slate-600"> — {cr.text_english}</span>}</li>
                      ))}</ul>
                    )}
                  </div>
                )}
                {/* Commentary for THIS verse — same one-panel rule */}
                {isSel && activePanel === 'commentary' && (
                  <div className={`mt-3 rounded-xl ${themeClasses.paper} border shadow-md p-4`}>
                    <p className="text-[11px] font-bold tracking-wide {linkColor} uppercase mb-2">📖 Commentary · Verse {v.verse}</p>
                    {commentary[v.verse] && commHtmlForLang(commentary[v.verse], lang) ? (
                      <div onClick={handleCommentaryClick} onMouseUp={() => onSelectGeneric(`commentary-${v.verse}-${lang === 'LU' ? 'LU' : 'EN'}`)} onTouchEnd={() => onSelectGeneric(`commentary-${v.verse}-${lang === 'LU' ? 'LU' : 'EN'}`)} className="leading-relaxed select-text cursor-text" style={{ fontSize: bodySize }} dangerouslySetInnerHTML={{ __html: commHtmlForLang(commentary[v.verse], lang, `commentary-${v.verse}-${lang === 'LU' ? 'LU' : 'EN'}`) }} />
                    ) : commentary[v.verse] ? (
                      <p className="text-sm text-slate-600 leading-relaxed">Commentary saved but empty for this verse.</p>
                    ) : (
                      <p className="text-sm text-slate-600 leading-relaxed">No written commentary saved for this verse yet. Pray-read the verse above — the Prayer tab for this verse carries the meditation for it. Commentary is added from Admin → Commentaries.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* Chapter Closing Prayer — at the END of the chapter, after the last verse. Not in the prayer list. */}
          {(closing.en || closing.lu) && (
            <div className={`${themeClasses.card} rounded-xl p-5 shadow-sm mt-4 border-2 border-amber-200`}>
              <p className="text-[11px] font-bold tracking-wide text-amber-700 uppercase mb-2">🙏 Chapter {chapterNum} Closing Prayer</p>
              {closing.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{closing.en}</p>}
              {closing.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${closing.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{closing.lu}</p>}
            </div>
          )}
          {/* Book Closing Prayer — only after the LAST chapter */}
          {chapterNum === Number(totalChapters) && (bookClose.en || bookClose.lu) && (
            <div className={`${themeClasses.card} rounded-xl p-5 shadow-sm mt-3 border-2 border-purple-200`}>
              <p className="text-[11px] font-bold tracking-wide text-purple-700 uppercase mb-2">🙏 Book Closing Prayer — {bookName}</p>
              {bookClose.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{bookClose.en}</p>}
              {bookClose.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${bookClose.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{bookClose.lu}</p>}
            </div>
          )}
        </div>

        {/* RIGHT — ORIGINAL tabs */}
        <aside className={`lg:sticky lg:top-[70px] ${themeClasses.card} rounded-xl overflow-hidden border`}>
          <div className={`flex border-b ${themeClasses.divider} ${themeClasses.header}`}>
            {([
              { id: 'intro', label: '📕 Intro' },
              { id: 'commentary', label: '📖 Commentary' },
              { id: 'prayer', label: '🙏 Prayer' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => {
                // Second click on the active Prayer tab = minimize the open prayer
                if (t.id === 'prayer' && rightTab === 'prayer' && activePanel === 'prayer') { setSelectedVerse(null); setActivePanel(null); return; }
                setRightTab(t.id);
              }} className={`flex-1 py-3 text-[14px] font-semibold ${rightTab === t.id ? `${themeClasses.text} border-b-2 border-current` : themeClasses.muted}`}>{t.label}</button>
            ))}
            <button onClick={() => setSidebarLang(sidebarLang === 'EN' ? 'LU' : sidebarLang === 'LU' ? 'BOTH' : 'EN')} title={`Sidebar language: ${sidebarLang} — tap to change (sidebar only)`} className="w-[52px] bg-orange-600 text-white text-[11px] font-bold leading-tight">GB<br />{sidebarLang}</button>
          </div>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {rightTab === 'intro' && (
              <div>
                <p className="font-bold text-[16px] mb-3">📕 Chapter {chapterNum}</p>
                {!intro.en && !intro.lu ? <p className="text-sm text-slate-500 italic">No chapter introduction available.</p> : (
                  <>
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && intro.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{intro.en}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && intro.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${(sidebarLang === 'EN' || sidebarLang === 'BOTH') && intro.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>{intro.lu}</p>}
                    {sidebarLang === 'EN' && !intro.en && intro.lu && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{intro.lu}</p>}
                    {sidebarLang === 'LU' && !intro.lu && intro.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{intro.en}</p>}
                  </>
                )}
              </div>
            )}
            {rightTab === 'commentary' && (
              <div>
                <p className="font-bold text-[16px] mb-3">📖 Commentary</p>
                {selectedVerse !== null && commentary[selectedVerse] && commHtmlForLang(commentary[selectedVerse], sidebarLang) ? (
                  <>
                    <p className="text-[11px] font-bold tracking-wide uppercase mb-2" style={{ color: '#1d4ed8' }}>Verse {selectedVerse}</p>
                    <div onClick={handleCommentaryClick} onMouseUp={() => onSelectGeneric(`commentary-${selectedVerse}-${sidebarLang === 'LU' ? 'LU' : 'EN'}`)} onTouchEnd={() => onSelectGeneric(`commentary-${selectedVerse}-${sidebarLang === 'LU' ? 'LU' : 'EN'}`)} className="leading-relaxed select-text cursor-text" style={{ fontSize: bodySize }} dangerouslySetInnerHTML={{ __html: commHtmlForLang(commentary[selectedVerse], sidebarLang, `commentary-${selectedVerse}-${sidebarLang === 'LU' ? 'LU' : 'EN'}`) }} />
                    <button onClick={() => { setSelectedVerse(null); setActivePanel(null); }} className="mt-4 text-sm font-semibold underline">← Back to Chapter Commentary</button>
                  </>
                ) : chapterCommentary && commHtmlForLang(chapterCommentary, sidebarLang) ? (
                  <>
                    <p className="text-[11px] font-bold tracking-wide uppercase mb-2" style={{ color: '#1d4ed8' }}>Chapter {chapterNum}</p>
                    <div onClick={handleCommentaryClick} onMouseUp={() => onSelectGeneric(`commentary-chapter-${sidebarLang === 'LU' ? 'LU' : 'EN'}`)} onTouchEnd={() => onSelectGeneric(`commentary-chapter-${sidebarLang === 'LU' ? 'LU' : 'EN'}`)} className="leading-relaxed select-text cursor-text" style={{ fontSize: bodySize }} dangerouslySetInnerHTML={{ __html: commHtmlForLang(chapterCommentary, sidebarLang, `commentary-chapter-${sidebarLang === 'LU' ? 'LU' : 'EN'}`) }} />
                    <p className="text-sm text-slate-500 italic mt-4">Tap any verse, then Commentary, to see that verse&apos;s commentary here.</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 italic">No chapter commentary saved yet. Select a verse and click Commentary to see its commentary.</p>
                )}
              </div>
            )}
            {rightTab === 'prayer' && activePanel === 'crossref' && selectedVerse !== null && (
              <div className="rounded-xl bg-[#FFFEF7] border border-amber-200 shadow-md p-4">
                <p className="font-bold text-[16px] mb-3">🔗 {bookName} {chapterNum}:{selectedVerse} — Cross References</p>
                {loadingCross ? <p className="text-sm text-slate-500">Loading…</p> : crossRefs.length === 0 ? <p className="text-sm text-slate-500 italic">No cross-references for this verse.</p> : (
                  <ul className="space-y-2">{crossRefs.map((cr: any, i: number) => (
                    <li key={i} className="text-sm"><Link href={`/bible-reader/${cr.target_book_number || cr.target_book_id}/${cr.target_chapter}`} className="font-bold {linkColor} hover:underline">{cr.target_book_name || `Book ${cr.target_book_id}`} {cr.target_chapter}:{cr.target_verse}</Link>{cr.text_english && <span className="text-slate-600"> — {cr.text_english}</span>}</li>
                  ))}</ul>
                )}
                <button onClick={() => { setSelectedVerse(null); setActivePanel(null); }} className="mt-3 px-3 py-1.5 rounded-lg bg-slate-200 text-sm font-medium">Minimize / Close ✕</button>
              </div>
            )}
            {rightTab === 'prayer' && activePanel !== 'crossref' && (
              <div>
                {/* Prayer tab shows ONLY the selected verse's prayer. This was the bug: the modern page listed ALL prayers here. */}
                {!selectedVerse ? (
                  <div><p className={`text-sm ${crossBody}`}>Click <b>♡ Prayer</b> under any verse to pray that verse here.</p><p className="text-sm text-slate-500 italic mt-3">{Object.keys(versePrayers).length} prayers are in this chapter.</p></div>
                ) : (
                  <div>
                    <p className="font-bold text-[16px] mb-3">🙏 {bookName} {chapterNum}:{selectedVerse}</p>
                    {!selectedPrayer.en && !selectedPrayer.lu ? <p className="text-sm text-slate-500 italic">No prayer added yet for this verse.</p> : (
                      <>
                        {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && selectedPrayer.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{selectedPrayer.en}</p>}
                        {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && selectedPrayer.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${(sidebarLang === 'EN' || sidebarLang === 'BOTH') && selectedPrayer.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>{selectedPrayer.lu}</p>}
                        {sidebarLang === 'EN' && !selectedPrayer.en && selectedPrayer.lu && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{selectedPrayer.lu}</p>}
                        {sidebarLang === 'LU' && !selectedPrayer.lu && selectedPrayer.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{selectedPrayer.en}</p>}
                      </>
                    )}
                    <button onClick={() => { setSelectedVerse(null); setActivePanel(null); }} className="mt-4 px-3 py-1.5 rounded-lg bg-slate-200 text-sm font-medium">Minimize / Close ✕</button>
                  </div>
                )}
                {/* Chapter Closing lives BELOW, after the verse prayer — not mixed into it */}
                {(closing.en || closing.lu) && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <p className="font-bold text-[15px] mb-2">🙏 Chapter {chapterNum} Closing Prayer</p>
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && closing.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{closing.en}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && closing.lu && <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap ${(sidebarLang === 'EN' || sidebarLang === 'BOTH') && closing.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>{closing.lu}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Share sheet — WhatsApp / Facebook / Telegram / Instagram / X / LinkedIn + Copy */}
      {shareVerse && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setShareVerse(null)}>
          <div className={`${themeClasses.card} rounded-2xl w-full max-w-sm p-5 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-[16px]">Share {bookName} {chapterNum}:{shareVerse.verse}</p>
              <button onClick={() => setShareVerse(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">✕</button>
            </div>
            <p className="text-[13px] text-slate-500 mb-4 line-clamp-2">“{shareText(shareVerse).slice(0, 120)}…”</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText(shareVerse) + ' ' + shareUrl(shareVerse))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366]/10 py-3 px-2"><span className="text-2xl block">💬</span><span className="text-[12px] font-semibold">WhatsApp</span></a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl(shareVerse))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#1877F2]/10 py-3 px-2"><span className="text-2xl block">📘</span><span className="text-[12px] font-semibold">Facebook</span></a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl(shareVerse))}&text=${encodeURIComponent(shareText(shareVerse))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#229ED9]/10 py-3 px-2"><span className="text-2xl block">✈️</span><span className="text-[12px] font-semibold">Telegram</span></a>
              <button onClick={() => { navigator.clipboard?.writeText(shareUrl(shareVerse)); setCopied(shareVerse.verse); }} className="rounded-xl bg-[#E1306C]/10 py-3 px-2"><span className="text-2xl block">📸</span><span className="text-[12px] font-semibold">Instagram<br /><span className="text-[10px] font-normal">Copy link</span></span></button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(shareVerse))}&url=${encodeURIComponent(shareUrl(shareVerse))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900/5 py-3 px-2"><span className="text-2xl block">𝕏</span><span className="text-[12px] font-semibold">X / Twitter</span></a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl(shareVerse))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#0A66C2]/10 py-3 px-2"><span className="text-2xl block">💼</span><span className="text-[12px] font-semibold">LinkedIn</span></a>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(shareText(shareVerse) + ' ' + shareUrl(shareVerse)); setCopied(shareVerse.verse); }} className="w-full mt-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold">{copied === shareVerse.verse ? '✓ Copied!' : '📋 Copy verse + link'}</button>
            <p className="text-[11px] text-slate-400 text-center mt-2">Instagram has no direct share link — tap it to copy the link, then paste it in Instagram.</p>
          </div>
        </div>
      )}


      {/* ── RESTORED Mark bar: appears when you select text. A = highlight, U = underline ── */}
      {pendingMark && (
        <div className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-[76px] bg-slate-900 text-white rounded-full shadow-2xl px-2 py-1.5 flex items-center gap-1 max-w-[96vw] overflow-x-auto">
          <span className="hidden sm:inline text-[11px] text-slate-300 pl-1 pr-1 whitespace-nowrap">Mark:</span>
          <button onClick={() => applyMark('highlight', 'bg-yellow-300 text-slate-900')} title="Highlight yellow" className="w-8 h-8 rounded-full bg-yellow-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
          <button onClick={() => applyMark('highlight', 'bg-green-300 text-slate-900')} title="Highlight green" className="w-8 h-8 rounded-full bg-green-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
          <button onClick={() => applyMark('highlight', 'bg-pink-300 text-slate-900')} title="Highlight pink" className="w-8 h-8 rounded-full bg-pink-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
          <button onClick={() => applyMark('underline', 'decoration-orange-500 text-inherit')} title="Underline orange" className="w-8 h-8 rounded-full bg-white text-slate-900 text-[13px] font-bold flex items-center justify-center underline decoration-orange-500">U</button>
          <button onClick={() => applyMark('underline', 'decoration-blue-500 text-inherit')} title="Underline blue" className="w-8 h-8 rounded-full bg-white text-slate-900 text-[13px] font-bold flex items-center justify-center underline decoration-blue-500">U</button>
          <button onClick={() => { clearMarksForKey(pendingMark.key); setPendingMark(null); }} title="Clear all marks in this section" className="px-2 h-8 rounded-full bg-white/15 text-[11px] font-bold flex items-center justify-center whitespace-nowrap">Clear</button>
          <button onClick={() => { try { navigator.clipboard?.writeText(pendingMark.text); } catch {} setPendingMark(null); }} title="Copy selection" className="w-8 h-8 rounded-full bg-white/15 text-[13px] flex items-center justify-center">⧉</button>
          <button onClick={() => setPendingMark(null)} title="Close" className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">✕</button>
        </div>
      )}

      {/* ── Scripture-ref POPUP ── */}
      {refPopup && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setRefPopup(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white w-full sm:max-w-[520px] max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div><p className="font-bold text-lg">{refPopup.ref}</p><p className="text-sm text-slate-500">{refPopup.bookName} {refPopup.chapter}:{refPopup.verses.join(', ')}</p></div>
              <button onClick={() => setRefPopup(null)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">✕</button>
            </div>
            {refPopup.loading ? <p className="text-sm text-slate-500">Loading verse…</p>
              : refPopup.error ? <p className="text-sm text-red-600">{refPopup.error}</p>
              : <p className="leading-relaxed whitespace-pre-wrap">{refPopup.text}</p>}
            {!refPopup.loading && refPopup.bookNum > 0 && (
              <button onClick={() => { setRefPopup(null); window.location.href = `/bible-reader/${refPopup.bookNum}/${refPopup.chapter}#verse-${refPopup.verses[0]}`; }} className="w-full mt-4 py-3 rounded-xl bg-blue-600 text-white font-semibold">Go to {refPopup.ref} →</button>
            )}
            <button onClick={() => setRefPopup(null)} className="w-full mt-2 py-2.5 rounded-xl bg-slate-100 font-semibold">Keep reading here</button>
          </div>
        </div>
      )}
      {/* Hamburger SIDE DRAWER — slides in from the right, holds Intro / Commentary / Prayer + nav */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className={`${themeClasses.card} relative w-[320px] max-w-[85vw] h-full shadow-2xl p-4 overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-[16px]">{bookName} {chapterNum}</p>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Link href="/dashboard" className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-sm font-semibold text-center">Dashboard</Link>
              <Link href="/bible-reader" className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-sm font-semibold text-center">All Books</Link>
              <button onClick={cycleTheme} className="px-3 py-2.5 rounded-xl bg-yellow-100 text-slate-800 text-sm font-semibold">☀️ Theme: {theme}</button>
              <button onClick={() => setLang(lang === 'EN' ? 'LU' : lang === 'LU' ? 'BOTH' : 'EN')} className="px-3 py-2.5 rounded-xl bg-amber-100 text-slate-800 text-sm font-semibold">Main Lang: {lang}</button>
            </div>
            <div className="flex border-b border-slate-200 mb-3">
              {(['intro','commentary','prayer'] as const).map(t => (
                <button key={t} onClick={() => { setRightTab(t); /* FIX: was setMenuOpen(false) — tapping Commentary/Prayer closed the drawer, and on mobile the desktop sidebar is hidden, so it looked like the sidebar vanished. Keep the drawer open. */ }} className={`flex-1 py-2.5 text-[13px] font-bold capitalize ${rightTab === t ? 'border-b-2 border-slate-900' : 'text-slate-500'}`}>{t}</button>
              ))}
            </div>
            {rightTab === 'intro' && (
              <div>
                <p className="font-bold mb-2">Chapter {chapterNum} — Intro</p>
                {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && intro.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{intro.en}</p>}
                {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && intro.lu && <p className="leading-relaxed whitespace-pre-wrap mt-3" style={{ fontSize: bodySize }}>{intro.lu}</p>}
                {!intro.en && !intro.lu && <p className="text-sm text-slate-500 italic">No chapter introduction available.</p>}
              </div>
            )}
            {rightTab === 'commentary' && (
              <div onClick={handleCommentaryClick}>
                <p className="font-bold mb-2">Commentary</p>
                {selectedVerse !== null && commentary[selectedVerse] && commHtmlForLang(commentary[selectedVerse], sidebarLang) ? (
                  <>
                    <p className="text-[11px] font-bold tracking-wide uppercase mb-2 text-blue-700">Verse {selectedVerse}</p>
                    <div onClick={handleCommentaryClick} className="leading-relaxed" style={{ fontSize: bodySize }} dangerouslySetInnerHTML={{ __html: commHtmlForLang(commentary[selectedVerse], sidebarLang) }} />
                    <button onClick={() => { setSelectedVerse(null); setActivePanel(null); }} className="mt-4 text-sm font-semibold underline">← Back to Chapter Commentary</button>
                  </>
                ) : chapterCommentary && commHtmlForLang(chapterCommentary, sidebarLang) ? (
                  <>
                    <p className="text-[11px] font-bold tracking-wide uppercase mb-2 text-blue-700">Chapter {chapterNum}</p>
                    <div onClick={handleCommentaryClick} className="leading-relaxed" style={{ fontSize: bodySize }} dangerouslySetInnerHTML={{ __html: commHtmlForLang(chapterCommentary, sidebarLang) }} />
                    <p className="text-sm text-slate-500 italic mt-4">Tap any verse, then Commentary, to see that verse&apos;s commentary here.</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 italic">No chapter commentary saved yet. Select a verse and tap Commentary to see its commentary.</p>
                )}
              </div>
            )}
            {rightTab === 'prayer' && (
              <div>
                {!selectedVerse ? <p className="text-sm">Tap ♡ Prayer under any verse to pray it here.</p> : (
                  <div>
                    <p className="font-bold mb-2">{bookName} {chapterNum}:{selectedVerse}</p>
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && selectedPrayer.en && <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: bodySize }}>{selectedPrayer.en}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && selectedPrayer.lu && <p className="leading-relaxed whitespace-pre-wrap mt-3" style={{ fontSize: bodySize }}>{selectedPrayer.lu}</p>}
                    {!selectedPrayer.en && !selectedPrayer.lu && <p className="text-sm italic text-slate-500">No prayer for this verse yet.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom nav — ORIGINAL */}
      <div className={`sticky bottom-0 ${themeClasses.header} border-t`}>
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <button disabled={chapterNum <= 1} onClick={() => router.push(`/bible-reader/${bookNum}/${chapterNum - 1}`)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold disabled:opacity-40">‹ Prev</button>
          <span className="text-[15px] font-bold">Chapter {chapterNum} of {totalChapters}</span>
          <button disabled={chapterNum >= Number(totalChapters)} onClick={() => router.push(`/bible-reader/${bookNum}/${chapterNum + 1}`)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold disabled:opacity-40">Next ›</button>
        </div>
      </div>
    </div>
  );
}

export default function ChapterPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#BDD7F5]">Loading…</div>}><ChapterContent /></Suspense>;
}
