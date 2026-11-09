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
  const [fontSize, setFontSize] = useState(17);
  const [rightTab, setRightTab] = useState<'intro' | 'commentary' | 'prayer'>('intro');
  const [chapterIntro, setChapterIntro] = useState<any>(null);
  const [versePrayers, setVersePrayers] = useState<Record<number, any>>({});
  const [chapterClosing, setChapterClosing] = useState<any>(null);
  const [bookClosing, setBookClosing] = useState<any>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  // One expanded panel per verse: 'prayer' | 'crossref' | null. Second click closes. Switching buttons swaps panels.
  const [activePanel, setActivePanel] = useState<'prayer' | 'crossref' | null>(null);
  const [crossRefs, setCrossRefs] = useState<any[]>([]);
  const [loadingCross, setLoadingCross] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#EAF2FF]"><p className="text-slate-500 text-sm">Loading chapter…</p></div>;

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
    <div className="min-h-screen bg-[#EAF2FF] text-slate-900">
      {/* Header — ORIGINAL */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/bible-reader')} className="text-slate-600 text-[15px] hover:text-slate-900">‹ Back</button>
          <div className="flex-1 text-center">
            <h1 className="text-[19px] font-bold leading-tight">{bookName} {chapterNum}</h1>
            <p className="text-[12px] text-slate-500">Ch {chapterNum} of {totalChapters}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setLang(lang === 'EN' ? 'LU' : lang === 'LU' ? 'BOTH' : 'EN')} className="w-9 h-9 rounded-md bg-orange-600 text-white text-[12px] font-bold flex items-center justify-center" title="Language">{lang === 'EN' ? 'GB' : lang}</button>
            <button className="w-9 h-9 rounded-md bg-yellow-400 text-[15px] flex items-center justify-center">☀️</button>
            <button onClick={() => setFontSize(Math.max(14, fontSize - 1))} className="w-9 h-9 rounded-md bg-slate-200 text-lg flex items-center justify-center">−</button>
            <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="w-9 h-9 rounded-md bg-slate-200 text-lg flex items-center justify-center">+</button>
            <button className="w-9 h-9 rounded-md bg-orange-500 text-[15px] flex items-center justify-center">🎨</button>
            <button className="w-9 h-9 rounded-md bg-purple-600 text-[15px] flex items-center justify-center">💡</button>
            <button className="w-9 h-9 rounded-md bg-blue-600 text-white text-lg flex items-center justify-center">☰</button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-4 grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* LEFT — ORIGINAL */}
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[13px] font-semibold">{testament}</span>
          <h2 className="text-[44px] leading-[1.1] font-bold text-[#1E3A8A] mt-3">{bookName}</h2>
          <p className="text-[19px] font-bold text-blue-700 mt-1">Chapter {chapterNum}</p>
          {bookNameLu && <p className="text-slate-600 text-[15px] mt-0.5">{bookNameLu}</p>}
          <hr className="border-blue-200 my-4" />

          {verses.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <p className="font-bold">Verses could not be loaded.</p>
              <p className="text-sm text-slate-500 mt-1">Neon has the verses — this page tried 5 verse URLs and got none back. Check <code className="bg-slate-100 px-1 rounded">/api/bible-verses?book_number={bookNum}&amp;chapter={chapterNum}</code> in a new tab.</p>
              <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg">Reload</button>
            </div>
          ) : verses.map((v: any) => {
            const hasPrayer = !!(pickPrayer(versePrayers[v.verse]).en || pickPrayer(versePrayers[v.verse]).lu);
            const isSel = selectedVerse === v.verse;
            const pr = pickPrayer(versePrayers[v.verse]);
            return (
              <article key={v.verse} className={`bg-white rounded-xl p-5 shadow-sm mb-3 ${isSel ? 'ring-2 ring-amber-500' : ''}`}>
                <div className="flex gap-2">
                  <span className="text-orange-600 font-bold text-[17px] shrink-0">{v.verse}</span>
                  <div className="flex-1">
                    <p style={{ fontSize }} className="leading-relaxed text-slate-800">{verseText(v)}</p>
                    {lang === 'BOTH' && v.text_luganda && <p style={{ fontSize }} className="leading-relaxed text-slate-500 mt-2 pt-2 border-t border-slate-100">{v.text_luganda}</p>}
                  </div>
                  <button onClick={() => { navigator.clipboard?.writeText(`${bookName} ${chapterNum}:${v.verse} — ${verseText(v)}`); setCopied(v.verse); setTimeout(() => setCopied(null), 1200); }} className="text-slate-400 hover:text-slate-600 self-start text-[16px]" title="Copy">{copied === v.verse ? '✓' : '⧉'}</button>
                </div>
                <hr className="border-slate-100 my-3" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openPrayer(v.verse)} disabled={!hasPrayer} className={`px-3 py-1.5 rounded-lg text-[13.5px] font-medium ${hasPrayer ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}>♡ Prayer</button>
                  <button onClick={() => { navigator.clipboard?.writeText(`${bookName} ${chapterNum}:${v.verse} — ${verseText(v)}`); }} className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-900 text-[13.5px] font-medium">🔗 Share</button>
                  <button onClick={() => openCrossRefs(v.verse)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-[13.5px] font-medium">🔗 Cross-Ref</button>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-[13.5px] font-medium">📖 Commentary</button>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-[13.5px] font-medium">📝 Notes</button>
                  <button className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-900 text-[13.5px] font-medium">💡 Insight</button>
                </div>
                <div className="flex justify-end mt-2">
                  <button className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[13px] font-medium">🔖 Bookmark</button>
                </div>

                {/* Prayer for THIS verse — inline, under THIS verse. Nowhere else. */}
                {isSel && activePanel === 'prayer' && (
                  <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-4">
                    <p className="text-[11px] font-bold tracking-wide text-rose-700 uppercase mb-2">🙏 Pray-Read · Verse {v.verse}</p>
                    {!pr.en && !pr.lu ? <p className="text-sm text-slate-500 italic">No prayer added yet for this verse.</p> : (
                      <>
                        {pr.en && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{pr.en}</p>}
                        {pr.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${pr.en ? 'mt-3 pt-3 border-t border-rose-200/60' : ''}`}>{pr.lu}</p>}
                      </>
                    )}
                  </div>
                )}
                {/* Cross-refs for THIS verse — LIGHT PAPER card. Opens when Prayer is minimized. */}
                {isSel && activePanel === 'crossref' && (
                  <div className="mt-3 rounded-xl bg-[#FFFEF7] border border-amber-200 shadow-md p-4">
                    <p className="text-[11px] font-bold tracking-wide uppercase mb-2">🔗 Cross References · Verse {v.verse}</p>
                    {loadingCross ? <p className="text-sm text-slate-500">Loading…</p> : crossRefs.length === 0 ? <p className="text-sm text-slate-500 italic">No cross-references for this verse.</p> : (
                      <ul className="space-y-1.5">{crossRefs.map((cr: any, i: number) => (
                        <li key={i} className="text-sm"><Link href={`/bible-reader/${cr.target_book_number || cr.target_book_id}/${cr.target_chapter}`} className="font-bold text-blue-700 hover:underline">{cr.target_book_name || `Book ${cr.target_book_id}`} {cr.target_chapter}:{cr.target_verse}</Link>{cr.text_english && <span className="text-slate-600"> — {cr.text_english}</span>}</li>
                      ))}</ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* Chapter Closing Prayer — at the END of the chapter, after the last verse. Not in the prayer list. */}
          {(closing.en || closing.lu) && (
            <div className="bg-white rounded-xl p-5 shadow-sm mt-4 border-2 border-amber-200">
              <p className="text-[11px] font-bold tracking-wide text-amber-700 uppercase mb-2">🙏 Chapter {chapterNum} Closing Prayer</p>
              {closing.en && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{closing.en}</p>}
              {closing.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${closing.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{closing.lu}</p>}
            </div>
          )}
          {/* Book Closing Prayer — only after the LAST chapter */}
          {chapterNum === Number(totalChapters) && (bookClose.en || bookClose.lu) && (
            <div className="bg-white rounded-xl p-5 shadow-sm mt-3 border-2 border-purple-200">
              <p className="text-[11px] font-bold tracking-wide text-purple-700 uppercase mb-2">🙏 Book Closing Prayer — {bookName}</p>
              {bookClose.en && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{bookClose.en}</p>}
              {bookClose.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${bookClose.en ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>{bookClose.lu}</p>}
            </div>
          )}
        </div>

        {/* RIGHT — ORIGINAL tabs */}
        <aside className="lg:sticky lg:top-[70px] bg-[#F0F7FF] rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-200 bg-white">
            {([
              { id: 'intro', label: '📕 Intro' },
              { id: 'commentary', label: '📖 Commentary' },
              { id: 'prayer', label: '🙏 Prayer' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => {
                // Second click on the active Prayer tab = minimize the open prayer
                if (t.id === 'prayer' && rightTab === 'prayer' && activePanel === 'prayer') { setSelectedVerse(null); setActivePanel(null); return; }
                setRightTab(t.id);
              }} className={`flex-1 py-3 text-[14px] font-semibold ${rightTab === t.id ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-600'}`}>{t.label}</button>
            ))}
            <button className="w-[52px] bg-orange-600 text-white text-[11px] font-bold leading-tight">GB<br />EN</button>
          </div>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {rightTab === 'intro' && (
              <div>
                <p className="font-bold text-[16px] mb-3">📕 Chapter {chapterNum}</p>
                {!intro.en && !intro.lu ? <p className="text-sm text-slate-500 italic">No chapter introduction available.</p> : (
                  <>
                    {intro.en && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{intro.en}</p>}
                    {intro.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${intro.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>{intro.lu}</p>}
                  </>
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
                    <li key={i} className="text-sm"><Link href={`/bible-reader/${cr.target_book_number || cr.target_book_id}/${cr.target_chapter}`} className="font-bold text-blue-700 hover:underline">{cr.target_book_name || `Book ${cr.target_book_id}`} {cr.target_chapter}:{cr.target_verse}</Link>{cr.text_english && <span className="text-slate-600"> — {cr.text_english}</span>}</li>
                  ))}</ul>
                )}
                <button onClick={() => { setSelectedVerse(null); setActivePanel(null); }} className="mt-3 px-3 py-1.5 rounded-lg bg-slate-200 text-sm font-medium">Minimize / Close ✕</button>
              </div>
            )}
            {rightTab === 'prayer' && activePanel !== 'crossref' && (
              <div>
                {/* Prayer tab shows ONLY the selected verse's prayer. This was the bug: the modern page listed ALL prayers here. */}
                {!selectedVerse ? (
                  <div><p className="text-sm text-slate-600">Click <b>♡ Prayer</b> under any verse to pray that verse here.</p><p className="text-sm text-slate-500 italic mt-3">{Object.keys(versePrayers).length} prayers are in this chapter.</p></div>
                ) : (
                  <div>
                    <p className="font-bold text-[16px] mb-3">🙏 {bookName} {chapterNum}:{selectedVerse}</p>
                    {!selectedPrayer.en && !selectedPrayer.lu ? <p className="text-sm text-slate-500 italic">No prayer added yet for this verse.</p> : (
                      <>
                        {selectedPrayer.en && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{selectedPrayer.en}</p>}
                        {selectedPrayer.lu && <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${selectedPrayer.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>{selectedPrayer.lu}</p>}
                      </>
                    )}
                    <button onClick={() => { setSelectedVerse(null); setActivePanel(null); }} className="mt-4 px-3 py-1.5 rounded-lg bg-slate-200 text-sm font-medium">Minimize / Close ✕</button>
                  </div>
                )}
                {/* Chapter Closing lives BELOW, after the verse prayer — not mixed into it */}
                {(closing.en || closing.lu) && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <p className="font-bold text-[15px] mb-2">🙏 Chapter {chapterNum} Closing Prayer</p>
                    {closing.en && <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{closing.en}</p>}
                    {closing.lu && <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap ${closing.en ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>{closing.lu}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom nav — ORIGINAL */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200">
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
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#EAF2FF]">Loading…</div>}><ChapterContent /></Suspense>;
}
