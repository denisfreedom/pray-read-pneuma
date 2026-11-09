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
  const [bookIntro, setBookIntro] = useState<any>(null); // V7: Book Introduction, shown in sidebar Intro tab
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
  const [menuOpen, setMenuOpen] = useState(false);
  // V6/V8: Select / Highlight / Underline — PRIVATE to this device/browser only.
  // Saved in localStorage on THIS phone/browser only. Never sent to Neon / server, never shared with other users.
  // Another user on another phone sees a clean page. Clearing browser data clears your marks.
  type Mark = { id: string; text: string; style: 'highlight' | 'underline'; color: string };
  const [marks, setMarks] = useState<Record<string, Mark[]>>(() => {
    try { return JSON.parse(localStorage.getItem(`prayread-marks-${bookNum}-${chapterNum}`) || '{}'); } catch { return {}; }
  });
  const [pendingMark, setPendingMark] = useState<{ key: string; verse: number; langKey: string; text: string; x: number; y: number } | null>(null);
  const markKey = (verse: number, langKey: string) => `${verse}-${langKey}`;
  // V7: generic keys for every section — prayer-1-EN, intro-ch-EN, closing-ch-EN, book-intro-EN, book-closing-EN, commentary-1-EN, crossref-1-EN
  // Verse keys stay as "1-EN" so V6 marks are kept.
  const saveMarks = (next: Record<string, Mark[]>) => {
    setMarks(next);
    try { localStorage.setItem(`prayread-marks-${bookNum}-${chapterNum}`, JSON.stringify(next)); } catch {}
  };
  const applyMark = (style: 'highlight' | 'underline', color: string) => {
    if (!pendingMark) return;
    const key = pendingMark.key || markKey(pendingMark.verse, pendingMark.langKey);
    const existing = marks[key] || [];
    // Don't duplicate the exact same mark
    if (existing.some(m => m.text === pendingMark.text && m.style === style && m.color === color)) { setPendingMark(null); return; }
    saveMarks({ ...marks, [key]: [...existing, { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), text: pendingMark.text, style, color }] });
    setPendingMark(null);
    try { window.getSelection()?.removeAllRanges(); } catch {}
  };
  const clearMarks = (verse: number, langKey: string) => {
    const next = { ...marks }; delete next[markKey(verse, langKey)]; saveMarks(next);
  };
  // Split a verse string by its saved marks and wrap each match
  const renderMarked = (text: string, verse: number, langKey: string) => {
    const list = marks[markKey(verse, langKey)] || [];
    if (!text || !list.length) return <>{text}</>;
    // Build segments: walk through text, cutting out each mark in order of first occurrence
    let remaining = text;
    const out: React.ReactNode[] = [];
    let k = 0;
    // Apply marks one by one, longest first so a full-verse mark wins over a word mark
    const sorted = [...list].sort((a, b) => b.text.length - a.text.length);
    // Simple non-overlapping approach: for the longest mark still present, split once, recurse on the pieces
    const renderWith = (str: string, ms: Mark[]): React.ReactNode[] => {
      if (!ms.length) return [str];
      const [first, ...rest] = ms;
      const idx = str.indexOf(first.text);
      if (idx === -1) return renderWith(str, rest);
      const before = str.slice(0, idx);
      const match = str.slice(idx, idx + first.text.length);
      const after = str.slice(idx + first.text.length);
      return [
        ...(before ? renderWith(before, rest) : []),
        <span key={first.id + '-' + k++} className={first.style === 'highlight' ? `px-0.5 rounded ${first.color}` : `underline decoration-2 underline-offset-4 ${first.color}`}>{match}</span>,
        ...(after ? renderWith(after, rest) : []),
      ];
    };
    return <>{renderWith(remaining, sorted)}</>;
  };
  const onSelectText = (verse: number, langKey: string) => {
    // Runs on mouseUp / touchEnd inside a verse paragraph
    setTimeout(() => {
      try {
        const sel = window.getSelection();
        const txt = sel?.toString() || '';
        if (!txt.trim() || txt.trim().length < 2) { setPendingMark(null); return; }
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // Only accept selections that are inside this verse's paragraph (anchor node inside the page)
        setPendingMark({ key: markKey(verse, langKey), verse, langKey, text: txt, x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
      } catch { setPendingMark(null); }
    }, 10);
  };

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
        const bookId = b?.id ?? bookNum;

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
        try {
          const r = await fetch(`/api/book-introductions?bookId=${bookId}`);
          const d = await r.json().catch(() => null);
          if (d && (pickIntro(d).en || pickIntro(d).lu)) setBookIntro(d);
          else if (Array.isArray(d) && d.length) setBookIntro(d[0]);
        } catch {}
      } finally { setLoading(false); }
    };
    load();
  }, [bookNum, chapterNum]);


  // V7 generic: any section can be selected
  const onSelectGeneric = (key: string) => {
    setTimeout(() => {
      try {
        const sel = window.getSelection();
        const txt = sel?.toString() || '';
        if (!txt.trim() || txt.trim().length < 2) { setPendingMark(null); return; }
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setPendingMark({ key, verse: 0, langKey: '', text: txt, x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
      } catch { setPendingMark(null); }
    }, 10);
  };

  // V8 mobile: tap 🖍️ Mark = mark the WHOLE verse without dragging. Toolbar appears at the bottom, not under your finger.
  const markWholeVerse = (v: any) => {
    const txt = verseText(v);
    if (!txt) return;
    setPendingMark({ key: markKey(v.verse, lang === 'LU' ? 'LU' : 'EN'), verse: v.verse, langKey: lang === 'LU' ? 'LU' : 'EN', text: txt, x: 0, y: 0 });
  };
  const markWholeText = (key: string, txt: string) => {
    if (!txt) return;
    setPendingMark({ key, verse: 0, langKey: '', text: txt, x: 0, y: 0 });
  };
  const renderMarkedByKey = (text: string, key: string) => {
    const list = marks[key] || [];
    if (!text || !list.length) return <>{text}</>;
    const sorted = [...list].sort((a, b) => b.text.length - a.text.length);
    let k = 0;
    const renderWith = (str: string, ms: Mark[]): React.ReactNode[] => {
      if (!ms.length) return [str];
      const [first, ...rest] = ms;
      const idx = str.indexOf(first.text);
      if (idx === -1) return renderWith(str, rest);
      const before = str.slice(0, idx);
      const match = str.slice(idx, idx + first.text.length);
      const after = str.slice(idx + first.text.length);
      return [
        ...(before ? renderWith(before, rest) : []),
        <span key={first.id + '-' + k++} className={first.style === 'highlight' ? `px-0.5 rounded ${first.color}` : `underline decoration-2 underline-offset-4 ${first.color}`}>{match}</span>,
        ...(after ? renderWith(after, rest) : []),
      ];
    };
    return <>{renderWith(text, sorted)}</>;
  };
  const clearMarksByKey = (key: string) => {
    const next = { ...marks }; delete next[key]; saveMarks(next);
  };
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

  const linkColor = theme === 'dark' ? 'text-orange-400' : 'text-blue-700'; // V5: blue -> orange in Dark
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
  const bookIntroVal = pickIntro(bookIntro);
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
          <p className={`text-[19px] font-bold ${linkColor} mt-1`}>Chapter {chapterNum}</p>
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
                    <p onMouseUp={() => onSelectText(v.verse, lang === 'LU' ? 'LU' : 'EN')} onTouchEnd={() => onSelectText(v.verse, lang === 'LU' ? 'LU' : 'EN')} className={`leading-relaxed ${themeClasses.text} select-text cursor-text`} style={{ fontSize: bodySize }}>{renderMarked(verseText(v), v.verse, lang === 'LU' ? 'LU' : 'EN')}</p>
                    {lang === 'BOTH' && v.text_luganda && <p onMouseUp={() => onSelectText(v.verse, 'LU')} onTouchEnd={() => onSelectText(v.verse, 'LU')} className={`leading-relaxed ${themeClasses.muted} mt-2 pt-2 border-t ${themeClasses.divider} select-text cursor-text`} style={{ fontSize: bodySize }}>{renderMarked(v.text_luganda, v.verse, 'LU')}</p>}
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
                  {(marks[markKey(v.verse, 'EN')]?.length || marks[markKey(v.verse, 'LU')]?.length) ? (
                    <button onClick={() => { clearMarks(v.verse, 'EN'); clearMarks(v.verse, 'LU'); }} className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-yellow-100 text-yellow-900">✏️ Clear marks ✕</button>
                  ) : null}
                  <button onClick={() => markWholeVerse(v)} title="Mark this whole verse — no dragging needed" className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-yellow-200 text-yellow-950">🖍️ Mark</button>
                </div>

                {/* Prayer for THIS verse — inline, under THIS verse. Nowhere else. */}
                {isSel && activePanel === 'prayer' && (
                  <div className={`mt-4 rounded-xl ${themeClasses.prayer} border p-4`}>
                    <p className="text-[11px] font-bold tracking-wide text-rose-500 uppercase mb-2 flex items-center justify-between">🙏 Pray-Read · Verse {v.verse} <button onClick={() => markWholeText(`prayer-${v.verse}-${lang === 'LU' ? 'LU' : 'EN'}`, lang === 'LU' ? pr.lu : pr.en)} className="normal-case tracking-normal px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-950 text-[11px] font-bold">🖍️ Mark prayer</button></p>
                    {!pr.en && !pr.lu ? <p className="text-sm text-slate-500 italic">No prayer added yet for this verse.</p> : (
                      <>
                        {pr.en && <p onMouseUp={() => onSelectGeneric(`prayer-${v.verse}-EN`)} onTouchEnd={() => onSelectGeneric(`prayer-${v.verse}-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(pr.en, `prayer-${v.verse}-EN`)}</p>}
                        {pr.lu && <p onMouseUp={() => onSelectGeneric(`prayer-${v.verse}-LU`)} onTouchEnd={() => onSelectGeneric(`prayer-${v.verse}-LU`)} className={`leading-relaxed whitespace-pre-wrap select-text cursor-text ${pr.en ? 'mt-3 pt-3 border-t border-rose-200/60' : ''}`} style={{ fontSize: bodySize }}>{renderMarkedByKey(pr.lu, `prayer-${v.verse}-LU`)}</p>}
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
                        <li key={i} className="text-sm"><Link href={`/bible-reader/${cr.target_book_number || cr.target_book_id}/${cr.target_chapter}`} className={`font-bold ${linkColor} hover:underline`}>{cr.target_book_name || `Book ${cr.target_book_id}`} {cr.target_chapter}:{cr.target_verse}</Link>{cr.text_english && <span onMouseUp={() => onSelectGeneric(`crossref-${selectedVerse}-EN`)} onTouchEnd={() => onSelectGeneric(`crossref-${selectedVerse}-EN`)} className={`${crossBody} select-text cursor-text`}> — {renderMarkedByKey(cr.text_english, `crossref-${selectedVerse}-EN`)}</span>}</li>
                      ))}</ul>
                    )}
                  </div>
                )}
                {/* Commentary for THIS verse — same one-panel rule */}
                {isSel && activePanel === 'commentary' && (
                  <div className={`mt-3 rounded-xl ${themeClasses.paper} border shadow-md p-4`}>
                    <p className={`text-[11px] font-bold tracking-wide ${linkColor} uppercase mb-2`}>📖 Commentary · Verse {v.verse}</p>
                    {commentary[v.verse] ? (
                      <p onMouseUp={() => onSelectGeneric(`commentary-${v.verse}-EN`)} onTouchEnd={() => onSelectGeneric(`commentary-${v.verse}-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(commentary[v.verse].text_english || commentary[v.verse].commentary || commentary[v.verse].content || JSON.stringify(commentary[v.verse]), `commentary-${v.verse}-EN`)}</p>
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
              {closing.en && <p onMouseUp={() => onSelectGeneric(`closing-ch-EN`)} onTouchEnd={() => onSelectGeneric(`closing-ch-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(closing.en, `closing-ch-EN`)}</p>}
              {closing.lu && <p onMouseUp={() => onSelectGeneric(`closing-ch-LU`)} onTouchEnd={() => onSelectGeneric(`closing-ch-LU`)} className={`leading-relaxed whitespace-pre-wrap select-text cursor-text ${closing.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`} style={{ fontSize: bodySize }}>{renderMarkedByKey(closing.lu, `closing-ch-LU`)}</p>}
            </div>
          )}
          {/* Book Closing Prayer — only after the LAST chapter */}
          {chapterNum === Number(totalChapters) && (bookClose.en || bookClose.lu) && (
            <div className={`${themeClasses.card} rounded-xl p-5 shadow-sm mt-3 border-2 border-purple-200`}>
              <p className="text-[11px] font-bold tracking-wide text-purple-700 uppercase mb-2">🙏 Book Closing Prayer — {bookName}</p>
              {bookClose.en && <p onMouseUp={() => onSelectGeneric(`book-closing-EN`)} onTouchEnd={() => onSelectGeneric(`book-closing-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(bookClose.en, `book-closing-EN`)}</p>}
              {bookClose.lu && <p onMouseUp={() => onSelectGeneric(`book-closing-LU`)} onTouchEnd={() => onSelectGeneric(`book-closing-LU`)} className={`leading-relaxed whitespace-pre-wrap select-text cursor-text ${bookClose.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`} style={{ fontSize: bodySize }}>{renderMarkedByKey(bookClose.lu, `book-closing-LU`)}</p>}
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
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && intro.en && <p onMouseUp={() => onSelectGeneric(`intro-ch-EN`)} onTouchEnd={() => onSelectGeneric(`intro-ch-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(intro.en, `intro-ch-EN`)}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && intro.lu && <p onMouseUp={() => onSelectGeneric(`intro-ch-LU`)} onTouchEnd={() => onSelectGeneric(`intro-ch-LU`)} className={`leading-relaxed whitespace-pre-wrap select-text cursor-text ${(sidebarLang === 'EN' || sidebarLang === 'BOTH') && intro.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`} style={{ fontSize: bodySize }}>{renderMarkedByKey(intro.lu, `intro-ch-LU`)}</p>}
                    {sidebarLang === 'EN' && !intro.en && intro.lu && <p onMouseUp={() => onSelectGeneric(`intro-ch-LU`)} onTouchEnd={() => onSelectGeneric(`intro-ch-LU`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(intro.lu, `intro-ch-LU`)}</p>}
                    {sidebarLang === 'LU' && !intro.lu && intro.en && <p onMouseUp={() => onSelectGeneric(`intro-ch-EN`)} onTouchEnd={() => onSelectGeneric(`intro-ch-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(intro.en, `intro-ch-EN`)}</p>}
                  </>
                )}
                {/* V7: Book Introduction — same sidebar, selectable */}
                {(bookIntroVal.en || bookIntroVal.lu) && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <p className="font-bold text-[15px] mb-2">📘 Book Introduction — {bookName}</p>
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && bookIntroVal.en && <p onMouseUp={() => onSelectGeneric(`book-intro-EN`)} onTouchEnd={() => onSelectGeneric(`book-intro-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(bookIntroVal.en, `book-intro-EN`)}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && bookIntroVal.lu && <p onMouseUp={() => onSelectGeneric(`book-intro-LU`)} onTouchEnd={() => onSelectGeneric(`book-intro-LU`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text mt-3" style={{ fontSize: bodySize }}>{renderMarkedByKey(bookIntroVal.lu, `book-intro-LU`)}</p>}
                  </div>
                )}
              </div>
            )}
            {rightTab === 'commentary' && (
              <div><p className="font-bold text-[16px] mb-3">📖 Commentary</p><p className="text-sm text-slate-500 italic">Select a verse and click Commentary to see its commentary.</p></div>
            )}
            {rightTab === 'prayer' && activePanel === 'crossref' && selectedVerse !== null && (
              <div className="rounded-xl bg-[#FFFEF7] border border-amber-200 shadow-md p-4">
                <p className="font-bold text-[16px] mb-3">🔗 {bookName} {chapterNum}:{selectedVerse} — Cross References</p>
                {loadingCross ? <p className="text-sm text-slate-500">Loading…</p> : crossRefs.length === 0 ? <p className="text-sm text-slate-500 italic">No cross-references for this verse.</p> : (
                  <ul className="space-y-2">{crossRefs.map((cr: any, i: number) => (
                    <li key={i} className="text-sm"><Link href={`/bible-reader/${cr.target_book_number || cr.target_book_id}/${cr.target_chapter}`} className={`font-bold ${linkColor} hover:underline`}>{cr.target_book_name || `Book ${cr.target_book_id}`} {cr.target_chapter}:{cr.target_verse}</Link>{cr.text_english && <span onMouseUp={() => onSelectGeneric(`crossref-${selectedVerse}-EN`)} onTouchEnd={() => onSelectGeneric(`crossref-${selectedVerse}-EN`)} className={`${crossBody} select-text cursor-text`}> — {renderMarkedByKey(cr.text_english, `crossref-${selectedVerse}-EN`)}</span>}</li>
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
                        {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && selectedPrayer.en && <p onMouseUp={() => onSelectGeneric(`prayer-${selectedVerse}-EN`)} onTouchEnd={() => onSelectGeneric(`prayer-${selectedVerse}-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(selectedPrayer.en, `prayer-${selectedVerse}-EN`)}</p>}
                        {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && selectedPrayer.lu && <p onMouseUp={() => onSelectGeneric(`prayer-${selectedVerse}-LU`)} onTouchEnd={() => onSelectGeneric(`prayer-${selectedVerse}-LU`)} className={`leading-relaxed whitespace-pre-wrap select-text cursor-text ${(sidebarLang === 'EN' || sidebarLang === 'BOTH') && selectedPrayer.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`} style={{ fontSize: bodySize }}>{renderMarkedByKey(selectedPrayer.lu, `prayer-${selectedVerse}-LU`)}</p>}
                        {sidebarLang === 'EN' && !selectedPrayer.en && selectedPrayer.lu && <p onMouseUp={() => onSelectGeneric(`prayer-${selectedVerse}-LU`)} onTouchEnd={() => onSelectGeneric(`prayer-${selectedVerse}-LU`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(selectedPrayer.lu, `prayer-${selectedVerse}-LU`)}</p>}
                        {sidebarLang === 'LU' && !selectedPrayer.lu && selectedPrayer.en && <p onMouseUp={() => onSelectGeneric(`prayer-${selectedVerse}-EN`)} onTouchEnd={() => onSelectGeneric(`prayer-${selectedVerse}-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(selectedPrayer.en, `prayer-${selectedVerse}-EN`)}</p>}
                      </>
                    )}
                    <button onClick={() => { setSelectedVerse(null); setActivePanel(null); }} className="mt-4 px-3 py-1.5 rounded-lg bg-slate-200 text-sm font-medium">Minimize / Close ✕</button>
                  </div>
                )}
                {/* Chapter Closing lives BELOW, after the verse prayer — not mixed into it */}
                {(closing.en || closing.lu) && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <p className="font-bold text-[15px] mb-2">🙏 Chapter {chapterNum} Closing Prayer</p>
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && closing.en && <p onMouseUp={() => onSelectGeneric(`closing-ch-EN`)} onTouchEnd={() => onSelectGeneric(`closing-ch-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(closing.en, `closing-ch-EN`)}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && closing.lu && <p onMouseUp={() => onSelectGeneric(`closing-ch-LU`)} onTouchEnd={() => onSelectGeneric(`closing-ch-LU`)} className={`leading-relaxed whitespace-pre-wrap select-text cursor-text ${(sidebarLang === 'EN' || sidebarLang === 'BOTH') && closing.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`} style={{ fontSize: bodySize }}>{renderMarkedByKey(closing.lu, `closing-ch-LU`)}</p>}
                  </div>
                )}
                {/* V7: Book Closing Prayer — in sidebar too, selectable */}
                {(bookClose.en || bookClose.lu) && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <p className="font-bold text-[15px] mb-2">🙏 Book Closing Prayer — {bookName}</p>
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && bookClose.en && <p onMouseUp={() => onSelectGeneric(`book-closing-EN`)} onTouchEnd={() => onSelectGeneric(`book-closing-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(bookClose.en, `book-closing-EN`)}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && bookClose.lu && <p onMouseUp={() => onSelectGeneric(`book-closing-LU`)} onTouchEnd={() => onSelectGeneric(`book-closing-LU`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text mt-3" style={{ fontSize: bodySize }}>{renderMarkedByKey(bookClose.lu, `book-closing-LU`)}</p>}
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
                <button key={t} onClick={() => { setRightTab(t); setMenuOpen(false); document.getElementById('right-panel')?.scrollIntoView({ behavior: 'smooth' }); }} className={`flex-1 py-2.5 text-[13px] font-bold capitalize ${rightTab === t ? 'border-b-2 border-slate-900' : 'text-slate-500'}`}>{t}</button>
              ))}
            </div>
            {rightTab === 'intro' && (
              <div>
                <p className="font-bold mb-2">Chapter {chapterNum} — Intro</p>
                {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && intro.en && <p onMouseUp={() => onSelectGeneric(`intro-ch-EN`)} onTouchEnd={() => onSelectGeneric(`intro-ch-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(intro.en, `intro-ch-EN`)}</p>}
                {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && intro.lu && <p onMouseUp={() => onSelectGeneric(`intro-ch-LU`)} onTouchEnd={() => onSelectGeneric(`intro-ch-LU`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text mt-3" style={{ fontSize: bodySize }}>{renderMarkedByKey(intro.lu, `intro-ch-LU`)}</p>}
                {!intro.en && !intro.lu && <p className="text-sm text-slate-500 italic">No chapter introduction available.</p>}
              </div>
            )}
            {rightTab === 'commentary' && <p className="text-sm text-slate-500">Select a verse and tap Commentary to read it here.</p>}
            {rightTab === 'prayer' && (
              <div>
                {!selectedVerse ? <p className="text-sm">Tap ♡ Prayer under any verse to pray it here.</p> : (
                  <div>
                    <p className="font-bold mb-2">{bookName} {chapterNum}:{selectedVerse}</p>
                    {(sidebarLang === 'EN' || sidebarLang === 'BOTH') && selectedPrayer.en && <p onMouseUp={() => onSelectGeneric(`prayer-${selectedVerse}-EN`)} onTouchEnd={() => onSelectGeneric(`prayer-${selectedVerse}-EN`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text" style={{ fontSize: bodySize }}>{renderMarkedByKey(selectedPrayer.en, `prayer-${selectedVerse}-EN`)}</p>}
                    {(sidebarLang === 'LU' || sidebarLang === 'BOTH') && selectedPrayer.lu && <p onMouseUp={() => onSelectGeneric(`prayer-${selectedVerse}-LU`)} onTouchEnd={() => onSelectGeneric(`prayer-${selectedVerse}-LU`)} className="leading-relaxed whitespace-pre-wrap select-text cursor-text mt-3" style={{ fontSize: bodySize }}>{renderMarkedByKey(selectedPrayer.lu, `prayer-${selectedVerse}-LU`)}</p>}
                    {!selectedPrayer.en && !selectedPrayer.lu && <p className="text-sm italic text-slate-500">No prayer for this verse yet.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* V8: Highlight / Underline toolbar — FIXED AT BOTTOM so the Android Copy/Select-all popup never covers it. Private: marks stay on this device only. */}
      {pendingMark && (
        <div className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-[76px] bg-slate-900 text-white rounded-full shadow-2xl px-2 py-1.5 flex items-center gap-1 max-w-[96vw] overflow-x-auto">
          <span className="hidden sm:inline text-[11px] text-slate-300 pl-1 pr-1 whitespace-nowrap">Mark:</span>
          <button onClick={() => applyMark('highlight', 'bg-yellow-300 text-slate-900')} title="Highlight yellow" className="w-8 h-8 rounded-full bg-yellow-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
          <button onClick={() => applyMark('highlight', 'bg-green-300 text-slate-900')} title="Highlight green" className="w-8 h-8 rounded-full bg-green-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
          <button onClick={() => applyMark('highlight', 'bg-pink-300 text-slate-900')} title="Highlight pink" className="w-8 h-8 rounded-full bg-pink-300 text-slate-900 text-[13px] font-bold flex items-center justify-center">A</button>
          <button onClick={() => applyMark('underline', 'decoration-orange-500 text-inherit')} title="Underline orange" className="w-8 h-8 rounded-full bg-white text-slate-900 text-[13px] font-bold flex items-center justify-center underline decoration-orange-500">U</button>
          <button onClick={() => applyMark('underline', 'decoration-blue-500 text-inherit')} title="Underline blue" className="w-8 h-8 rounded-full bg-white text-slate-900 text-[13px] font-bold flex items-center justify-center underline decoration-blue-500">U</button>
          <button onClick={() => { try { navigator.clipboard?.writeText(pendingMark.text); } catch {} setPendingMark(null); }} title="Copy selection" className="w-8 h-8 rounded-full bg-white/15 text-[13px] flex items-center justify-center">⧉</button>
          <button onClick={() => setPendingMark(null)} title="Close" className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">✕</button>
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
