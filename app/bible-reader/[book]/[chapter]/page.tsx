"use client";
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, BookOpen, Heart, Share2, Link2, MessageSquare, Bookmark, Copy, Check, Languages, Sun, Moon, Minus, Plus } from 'lucide-react';

interface Verse { book_id: number; chapter: number; verse: number; text_english: string; text_luganda: string; }
interface Book { id: number; book_number: number; name_english: string; name_luganda: string; testament: string; total_chapters: number; }

function pickText(row: any): { en: string; lu: string } {
  if (!row) return { en: '', lu: '' };
  return {
    en: row.pray_read_english || row.en_prayer || row.prayer_english || row.closing_prayer_english || row.introduction_english || row.en_introduction || row.introduction || '',
    lu: row.pray_read_luganda || row.lu_prayer || row.prayer_luganda || row.closing_prayer_luganda || row.introduction_luganda || row.lu_introduction || '',
  };
}

function ChapterContent() {
  const params = useParams();
  const router = useRouter();
  const bookNum = parseInt(String(params.book));
  const chapterNum = parseInt(String(params.chapter));
  const [book, setBook] = useState<Book | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'EN' | 'LU' | 'BOTH'>('EN');
  const [fontSize, setFontSize] = useState(17);
  const [dark, setDark] = useState(false);
  const [rightTab, setRightTab] = useState<'intro' | 'prayer' | 'closing' | 'book'>('prayer');
  const [chapterIntro, setChapterIntro] = useState<any>(null);
  const [bookIntro, setBookIntro] = useState<any>(null);
  const [versePrayers, setVersePrayers] = useState<Record<number, any>>({});
  const [chapterClosing, setChapterClosing] = useState<any>(null);
  const [bookClosing, setBookClosing] = useState<any>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [crossRefs, setCrossRefs] = useState<any[]>([]);
  const [loadingCross, setLoadingCross] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Load everything — all APIs, all param styles, so it works no matter what
  useEffect(() => {
    if (!bookNum || !chapterNum) return;
    const load = async () => {
      setLoading(true);
      try {
        const [booksRes, versesRes] = await Promise.all([
          fetch('/api/bible-books').then(r => r.json()).catch(() => []),
          fetch(`/api/bible-verses?book_number=${bookNum}&chapter=${chapterNum}`).then(r => r.json()).catch(() => []),
        ]);
        const b = Array.isArray(booksRes) ? booksRes.find((x: any) => x.book_number === bookNum) : null;
        setBook(b || null);
        const vList = Array.isArray(versesRes) ? versesRes : (versesRes.verses || []);
        setVerses(vList);
        const bookId = b?.id || bookNum;

        // Verse prayers — try both endpoints, both param styles
        let prayers: any[] = [];
        try {
          const r1 = await fetch(`/api/verse-prayers?book_number=${bookNum}&chapter=${chapterNum}`);
          const d1 = await r1.json().catch(() => []);
          if (Array.isArray(d1) && d1.length) prayers = d1;
        } catch {}
        if (!prayers.length) {
          try {
            const r2 = await fetch(`/api/prayer-passages?book_number=${bookNum}&chapter=${chapterNum}`);
            const d2 = await r2.json().catch(() => []);
            if (Array.isArray(d2) && d2.length) prayers = d2;
          } catch {}
        }
        if (!prayers.length) {
          try {
            const r3 = await fetch(`/api/verse-prayers?bookId=${bookId}&chapter=${chapterNum}`);
            const d3 = await r3.json().catch(() => []);
            if (Array.isArray(d3) && d3.length) prayers = d3;
          } catch {}
        }
        const map: Record<number, any> = {};
        prayers.forEach((p: any) => { if (p.verse) map[p.verse] = p; });
        setVersePrayers(map);

        // Chapter intro
        try {
          const r = await fetch(`/api/chapter-introductions?bookId=${bookId}&chapter=${chapterNum}`);
          const d = await r.json().catch(() => null);
          if (d) setChapterIntro(d);
        } catch {}
        // Chapter closing — from chapter-prayers, fallback to chapter-intro closing fields
        try {
          const r = await fetch(`/api/chapter-prayers?bookId=${bookId}&chapter=${chapterNum}`);
          const d = await r.json().catch(() => null);
          if (d && (pickText(d).en || pickText(d).lu)) setChapterClosing(d);
        } catch {}
        if (!chapterClosing) {
          // will be filled from chapterIntro below via render fallback
        }
        // Book intro + book closing
        try {
          const r = await fetch(`/api/book-introductions?bookId=${bookId}`);
          const d = await r.json().catch(() => null);
          if (d) setBookIntro(d);
        } catch {}
        try {
          const r = await fetch(`/api/book-prayers?bookId=${bookId}`);
          const d = await r.json().catch(() => null);
          if (d && (pickText(d).en || pickText(d).lu)) setBookClosing(d);
        } catch {}
      } finally { setLoading(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookNum, chapterNum]);

  const openCrossRefs = async (verseNum: number) => {
    setSelectedVerse(verseNum);
    setLoadingCross(true);
    setCrossRefs([]);
    try {
      const r = await fetch(`/api/cross-references?source_book_number=${bookNum}&source_chapter=${chapterNum}&source_verse=${verseNum}`);
      const d = await r.json().catch(() => []);
      if (Array.isArray(d) && d.length) { setCrossRefs(d); setLoadingCross(false); return; }
    } catch {}
    try {
      const r = await fetch(`/api/verse-cross-references?source_book_number=${bookNum}&source_chapter=${chapterNum}&source_verse=${verseNum}`);
      const d = await r.json().catch(() => []);
      if (Array.isArray(d)) setCrossRefs(d);
    } catch {}
    setLoadingCross(false);
  };

  const openPrayer = (verseNum: number) => {
    setSelectedVerse(verseNum);
    setRightTab('prayer');
    document.getElementById('right-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const verseText = (v: Verse) => {
    if (lang === 'EN') return v.text_english;
    if (lang === 'LU') return v.text_luganda;
    return v.text_english; // BOTH handled in render
  };

  const filteredVerses = useMemo(() => {
    if (!search.trim()) return verses;
    const q = search.trim().toLowerCase();
    return verses.filter(v => v.text_english?.toLowerCase().includes(q) || v.text_luganda?.toLowerCase().includes(q) || String(v.verse).includes(q));
  }, [verses, search]);

  const chapterClosingText = pickText(chapterClosing) .en ? pickText(chapterClosing) : pickText(chapterIntro);
  // chapterIntro may itself carry closing_prayer_* fields
  const chapterClosingDisplay = (() => {
    const fromPrayers = pickText(chapterClosing);
    if (fromPrayers.en || fromPrayers.lu) return fromPrayers;
    const fromIntro: any = chapterIntro || {};
    return { en: fromIntro.closing_prayer_english || fromIntro.en_closing_prayer || '', lu: fromIntro.closing_prayer_luganda || fromIntro.lu_closing_prayer || '' };
  })();
  const bookClosingDisplay = pickText(bookClosing).en || pickText(bookClosing).lu ? pickText(bookClosing) : (() => {
    const b: any = bookIntro || {};
    return { en: b.closing_prayer_english || '', lu: b.closing_prayer_luganda || '' };
  })();
  const chapterIntroDisplay = (() => {
    const c: any = chapterIntro || {};
    return { en: c.introduction_english || c.en_introduction || c.introduction || '', lu: c.introduction_luganda || c.lu_introduction || '' };
  })();
  const bookIntroDisplay = (() => {
    const b: any = bookIntro || {};
    return { en: b.introduction_english || b.en_introduction || b.introduction || '', lu: b.introduction_luganda || b.lu_introduction || '' };
  })();

  const hasAnyPrayer = Object.keys(versePrayers).length > 0;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-amber-500 mx-auto mb-3" /><p className="text-slate-500 text-sm">Loading chapter…</p></div></div>;
  }

  const bg = dark ? 'bg-slate-950 text-slate-100' : 'bg-[#F7F5F0] text-slate-900';
  const card = dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 backdrop-blur-md border-b ${dark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => router.push(`/bible-reader/${bookNum}`)} className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"><ChevronLeft className="w-4 h-4" /> Back</button>
          <Link href="/dashboard" className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200">Dashboard</Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">{book?.name_english || `Book ${bookNum}`} {chapterNum}</h1>
            <p className={`text-xs ${muted}`}>{book?.name_luganda || ''} · Chapter {chapterNum} of {book?.total_chapters || '?'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setLang(lang === 'EN' ? 'LU' : lang === 'LU' ? 'BOTH' : 'EN')} className="px-2.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center gap-1"><Languages className="w-3.5 h-3.5" />{lang === 'EN' ? 'EN' : lang === 'LU' ? 'LU' : 'BOTH'}</button>
            <button onClick={() => setDark(!dark)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200">{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
            <button onClick={() => setFontSize(Math.max(14, fontSize - 1))} className="p-2 rounded-xl bg-slate-100 text-slate-700"><Minus className="w-4 h-4" /></button>
            <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="p-2 rounded-xl bg-slate-100 text-slate-700"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
        {/* Chapter nav */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex items-center justify-between gap-2">
          <button disabled={chapterNum <= 1} onClick={() => router.push(`/bible-reader/${bookNum}/${chapterNum - 1}`)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-semibold disabled:opacity-40 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search in this chapter…" className={`flex-1 max-w-xs px-3 py-1.5 text-sm rounded-lg border outline-none ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
          <button disabled={book && chapterNum >= book.total_chapters} onClick={() => router.push(`/bible-reader/${bookNum}/${chapterNum + 1}`)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        {/* Verses */}
        <div className="space-y-3">
          {filteredVerses.map(v => {
            const prayer = versePrayers[v.verse];
            const hasPrayer = !!prayer && !!(pickText(prayer).en || pickText(prayer).lu);
            const isSelected = selectedVerse === v.verse;
            return (
              <article key={v.verse} className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${card} ${isSelected ? 'ring-2 ring-amber-500' : ''}`}>
                <div className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold mt-0.5">{v.verse}</span>
                  <div className="flex-1 min-w-0">
                    {lang === 'BOTH' ? (
                      <>
                        <p style={{ fontSize }} className="leading-relaxed font-medium">{v.text_english}</p>
                        <p style={{ fontSize }} className={`leading-relaxed mt-2 pt-2 border-t ${dark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'}`}>{v.text_luganda}</p>
                      </>
                    ) : (
                      <p style={{ fontSize }} className="leading-relaxed font-medium">{verseText(v)}</p>
                    )}
                  </div>
                  <button onClick={() => { navigator.clipboard?.writeText(`${book?.name_english} ${chapterNum}:${v.verse} — ${verseText(v)}`); setCopied(v.verse); setTimeout(() => setCopied(null), 1500); }} className={`shrink-0 p-2 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-100'} hover:bg-slate-200`} title="Copy verse">{copied === v.verse ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => openPrayer(v.verse)} disabled={!hasPrayer} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ${hasPrayer ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}><Heart className="w-3.5 h-3.5" /> Prayer {hasPrayer ? '' : '· none'}</button>
                  <button onClick={() => openCrossRefs(v.verse)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-slate-100 hover:bg-slate-200"><Link2 className="w-3.5 h-3.5" /> Cross-Ref</button>
                  <button onClick={() => { navigator.clipboard?.writeText(`${book?.name_english} ${chapterNum}:${v.verse} — ${verseText(v)}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-slate-100 hover:bg-slate-200"><Share2 className="w-3.5 h-3.5" /> Share</button>
                  <button onClick={() => openCrossRefs(v.verse)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-violet-100 text-violet-800 hover:bg-violet-200"><MessageSquare className="w-3.5 h-3.5" /> Commentary</button>
                </div>

                {/* Inline Prayer — shows right under the verse when selected */}
                {isSelected && hasPrayer && (
                  <div className={`mt-4 rounded-xl p-4 ${dark ? 'bg-rose-950/30 border border-rose-900/40' : 'bg-rose-50 border border-rose-100'}`}>
                    <p className="text-xs font-bold tracking-wide text-rose-700 uppercase mb-2">🙏 Pray-Read · Verse {v.verse}</p>
                    {(lang === 'EN' || lang === 'BOTH') && pickText(prayer).en && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{pickText(prayer).en}</p>}
                    {(lang === 'LU' || lang === 'BOTH') && pickText(prayer).lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${lang === 'BOTH' ? 'mt-3 pt-3 border-t border-rose-200/60' : ''}`}>{pickText(prayer).lu}</p>}
                    {lang === 'EN' && !pickText(prayer).en && pickText(prayer).lu && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{pickText(prayer).lu}</p>}
                  </div>
                )}
                {isSelected && !hasPrayer && (
                  <p className="mt-3 text-sm text-slate-500 italic">No prayer for this verse yet.</p>
                )}

                {/* Inline Cross-Refs */}
                {isSelected && (
                  <div className={`mt-3 rounded-xl p-4 ${dark ? 'bg-slate-800/60' : 'bg-slate-50 border border-slate-100'}`}>
                    <p className="text-xs font-bold tracking-wide uppercase mb-2">🔗 Cross References · Verse {v.verse}</p>
                    {loadingCross ? <p className="text-sm text-slate-500">Loading…</p> : crossRefs.length === 0 ? <p className="text-sm text-slate-500 italic">No cross-references for this verse.</p> : (
                      <ul className="space-y-2">{crossRefs.map((cr: any, i: number) => (
                        <li key={i} className="text-sm leading-relaxed">
                          <Link href={`/bible-reader/${cr.target_book_number || cr.target_book_id}/${cr.target_chapter}`} className="font-bold text-blue-700 hover:underline">{cr.target_book_name || `Book ${cr.target_book_id}`} {cr.target_chapter}:{cr.target_verse}</Link>
                          {cr.text_english && <span className="text-slate-600"> — {cr.text_english}</span>}
                        </li>
                      ))}</ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {filteredVerses.length === 0 && <div className={`rounded-2xl border p-8 text-center ${card}`}><p className="font-bold">No verses found for “{search}”</p><button onClick={() => setSearch('')} className="mt-3 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl">Clear search</button></div>}
        </div>

        {/* Right panel */}
        <aside id="right-panel" className={`lg:sticky lg:top-[132px] rounded-2xl border shadow-sm overflow-hidden ${card}`}>
          <div className="flex border-b border-slate-200/70">
            {([
              { id: 'intro', label: '📖 Intro' },
              { id: 'prayer', label: '🙏 Prayer' },
              { id: 'closing', label: '🙏 Closing' },
              { id: 'book', label: '📘 Book' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setRightTab(t.id)} className={`flex-1 py-3 text-[13px] font-bold ${rightTab === t.id ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{t.label}</button>
            ))}
          </div>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {rightTab === 'intro' && (
              <div>
                <h3 className="font-extrabold text-[15px] mb-2">Chapter {chapterNum} Introduction</h3>
                {!chapterIntroDisplay.en && !chapterIntroDisplay.lu ? <p className="text-sm text-slate-500 italic">No chapter introduction available.</p> : (
                  <>
                    {chapterIntroDisplay.en && <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{chapterIntroDisplay.en}</p>}
                    {chapterIntroDisplay.lu && <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap ${chapterIntroDisplay.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{chapterIntroDisplay.lu}</p>}
                  </>
                )}
              </div>
            )}
            {rightTab === 'prayer' && (
              <div>
                <h3 className="font-extrabold text-[15px] mb-1">Pray-Read Passages · Chapter {chapterNum}</h3>
                <p className={`text-xs mb-3 ${muted}`}>{hasAnyPrayer ? `${Object.keys(versePrayers).length} prayers in this chapter` : 'Prayers are the core of Pray-Read.'}</p>
                {!hasAnyPrayer ? (
                  <p className="text-sm text-slate-500 italic">No prayers added yet for this chapter.</p>
                ) : (
                  <div className="space-y-4">{Object.entries(versePrayers).sort((a, b) => Number(a[0]) - Number(b[0])).map(([vn, p]) => {
                    const t = pickText(p);
                    return (
                      <div key={vn} className={`rounded-xl p-3 border ${dark ? 'border-slate-700' : 'border-slate-100 bg-slate-50/60'}`}>
                        <button onClick={() => setSelectedVerse(Number(vn))} className="text-sm font-bold text-rose-700 hover:underline">Verse {vn} — Pray-Read →</button>
                        {t.en && <p className="text-[14px] leading-relaxed whitespace-pre-wrap mt-1.5 line-clamp-4">{t.en}</p>}
                        {t.lu && <p className="text-[13px] leading-relaxed whitespace-pre-wrap mt-2 text-slate-500 line-clamp-3">{t.lu}</p>}
                      </div>
                    );
                  })}</div>
                )}
              </div>
            )}
            {rightTab === 'closing' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-extrabold text-[15px] mb-2">🙏 Chapter {chapterNum} Closing Prayer</h3>
                  {!chapterClosingDisplay.en && !chapterClosingDisplay.lu ? <p className="text-sm text-slate-500 italic">No chapter closing prayer added yet.</p> : (
                    <>
                      {chapterClosingDisplay.en && <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{chapterClosingDisplay.en}</p>}
                      {chapterClosingDisplay.lu && <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap ${chapterClosingDisplay.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{chapterClosingDisplay.lu}</p>}
                    </>
                  )}
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-extrabold text-[15px] mb-2">🙏 Book Closing Prayer — {book?.name_english}</h3>
                  {!bookClosingDisplay.en && !bookClosingDisplay.lu ? <p className="text-sm text-slate-500 italic">No book closing prayer added yet.</p> : (
                    <>
                      {bookClosingDisplay.en && <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{bookClosingDisplay.en}</p>}
                      {bookClosingDisplay.lu && <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap ${bookClosingDisplay.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{bookClosingDisplay.lu}</p>}
                    </>
                  )}
                </div>
              </div>
            )}
            {rightTab === 'book' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-extrabold text-[15px] mb-2">📘 Book Introduction — {book?.name_english}</h3>
                  {!bookIntroDisplay.en && !bookIntroDisplay.lu ? <p className="text-sm text-slate-500 italic">No book introduction available.</p> : (
                    <>
                      {bookIntroDisplay.en && <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{bookIntroDisplay.en}</p>}
                      {bookIntroDisplay.lu && <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap ${bookIntroDisplay.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{bookIntroDisplay.lu}</p>}
                    </>
                  )}
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-extrabold text-[15px] mb-2">🙏 Book Closing Prayer</h3>
                  {!bookClosingDisplay.en && !bookClosingDisplay.lu ? <p className="text-sm text-slate-500 italic">No book closing prayer added yet.</p> : (
                    <>
                      {bookClosingDisplay.en && <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{bookClosingDisplay.en}</p>}
                      {bookClosingDisplay.lu && <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap ${bookClosingDisplay.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{bookClosingDisplay.lu}</p>}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom nav */}
      <div className={`sticky bottom-0 border-t ${dark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button disabled={chapterNum <= 1} onClick={() => router.push(`/bible-reader/${bookNum}/${chapterNum - 1}`)} className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold disabled:opacity-40 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
          <span className="text-sm font-bold">Chapter {chapterNum} of {book?.total_chapters || '?'}</span>
          <button disabled={book && chapterNum >= book.total_chapters} onClick={() => router.push(`/bible-reader/${bookNum}/${chapterNum + 1}`)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

export default function ChapterPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}><ChapterContent /></Suspense>;
}
