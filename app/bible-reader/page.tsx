"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
// app/bible-reader/page.tsx — V3 FULL-FEATURED OFFLINE-FIRST, SINGLE PAGE
// Views: 'books' (grid) + 'chapter' — switching views NEVER navigates, so offline never shows the splash.
// DB: prayread-offline v2 (same as offlineStorage V2 + DownloadManager V5)
// Features: book grid, search, OT/NT, chapter intro, highlight, underline, bookmark,
// Pray-Read, cross-refs, commentary, copy. Highlights/bookmarks saved in IndexedDB.

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open('prayread-offline', 2);
    req.onerror = () => rej(req.error);
    req.onsuccess = () => res(req.result);
    req.onupgradeneeded = () => { const db = req.result; for (const s of ['books','chapters','verses','devotionals','commentary','qa','verseOfDay','meta','highlights','bookmarks']) { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); } };
  });
}
async function getAll(store: string): Promise<any[]> {
  try { const db = await openDB(); return await new Promise((res) => { const tx = db.transaction(store, 'readonly'); const req = tx.objectStore(store).getAll(); req.onsuccess = () => res((req.result as any[]) || []); req.onerror = () => res([]); }); } catch { return []; }
}
async function putIn(store: string, value: any) {
  try { const db = await openDB(); await new Promise<void>((res) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch {}
}
async function delFrom(store: string, key: string) {
  try { const db = await openDB(); await new Promise<void>((res) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch {}
}
async function getOne(store: string, key: string): Promise<any | null> {
  try { const db = await openDB(); return await new Promise((res) => { const tx = db.transaction(store, 'readonly'); const req = tx.objectStore(store).get(key); req.onsuccess = () => res(req.result || null); req.onerror = () => res(null); }); } catch { return null; }
}

export default function BibleReaderPage() {
  const [view, setView] = useState<'books' | 'chapter'>('books');
  const [books, setBooks] = useState<any[]>([]);
  const [bookId, setBookId] = useState<number>(1);
  const [chapter, setChapter] = useState<number>(1);
  const [verses, setVerses] = useState<any[]>([]);
  const [intro, setIntro] = useState<any | null>(null);
  const [bookIntro, setBookIntro] = useState<any | null>(null);
  const [lang, setLang] = useState<'english' | 'luganda' | 'both'>('both');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [diag, setDiag] = useState('');
  const [search, setSearch] = useState('');
  const [testament, setTestament] = useState<'OT' | 'NT'>('OT');
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [panel, setPanel] = useState<'pray' | 'cross' | 'commentary' | null>(null);
  const [panelData, setPanelData] = useState<any>(null);
  const [highlights, setHighlights] = useState<Record<string, 'highlight' | 'underline'>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  const verseKey = (v: number) => `${bookId}-${chapter}-${v}`;

  const loadChapter = useCallback(async (bid: number, ch: number) => {
    setLoading(true);
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    let list: any[] = [];
    try { const db = await openDB(); const chap: any = await new Promise((res) => { const tx = db.transaction('chapters', 'readonly'); const req = tx.objectStore('chapters').get(`chapter-${bid}-${ch}`); req.onsuccess = () => res(req.result || null); req.onerror = () => res(null); }); if (chap?.verses?.length) list = chap.verses; } catch {}
    if (!list.length) { const allVerses = await getAll('verses'); list = (allVerses || []).filter((v: any) => Number(v.book_id ?? v.bookId) === Number(bid) && Number(v.chapter) === Number(ch)).sort((a: any, b: any) => Number(a.verse) - Number(b.verse)); }
    else list = [...list].sort((a: any, b: any) => Number(a.verse) - Number(b.verse));
    setVerses(list);
    const allCom = await getAll('commentary');
    setIntro((allCom || []).find((c: any) => c._table === 'chapter_introductions' && Number(c.book_id) === Number(bid) && Number(c.chapter) === Number(ch)) || null);
    setBookIntro((allCom || []).find((c: any) => (c._table === 'book_introductions' || c._table === 'book_commentaries') && Number(c.book_id) === Number(bid)) || null);
    const hl = await getAll('highlights'); const hmap: Record<string, 'highlight' | 'underline'> = {}; hl.forEach((h: any) => { if (h?.verseKey) hmap[h.verseKey] = h.kind || 'highlight'; }); setHighlights(hmap);
    const bm = await getAll('bookmarks'); const bmap: Record<string, boolean> = {}; bm.forEach((b: any) => { if (b?.verseKey) bmap[b.verseKey] = true; }); setBookmarks(bmap);
    setLoading(false);
  }, []);

  useEffect(() => { (async () => { const list = await getAll('books'); const sorted = (list || []).sort((a: any, b: any) => (a.book_number ?? a.id) - (b.book_number ?? b.id)); setBooks(sorted); setHasData(sorted.length > 0); const chaps = await getAll('chapters'); const vers = await getAll('verses'); setDiag(`Saved — Books: ${sorted.length} · Chapters: ${chaps.length} · Verses: ${vers.length}`); setLoading(false); })(); }, []);
  useEffect(() => { const upd = () => { setOffline(!navigator.onLine); if (!navigator.onLine && view === 'chapter') loadChapter(bookId, chapter); }; window.addEventListener('online', upd); window.addEventListener('offline', upd); return () => { window.removeEventListener('online', upd); window.removeEventListener('offline', upd); }; }, [bookId, chapter, view, loadChapter]);

  const openBook = async (bid: number) => { setBookId(bid); setChapter(1); setSelectedVerse(null); setPanel(null); setView('chapter'); await loadChapter(bid, 1); };
  const goChapter = async (ch: number) => { setChapter(ch); setSelectedVerse(null); setPanel(null); await loadChapter(bookId, ch); };

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };
  const toggleHighlight = async (kind: 'highlight' | 'underline') => {
    if (selectedVerse == null) return; const k = verseKey(selectedVerse);
    if (highlights[k] === kind) { const nh = { ...highlights }; delete nh[k]; setHighlights(nh); await delFrom('highlights', k); }
    else { setHighlights({ ...highlights, [k]: kind }); await putIn('highlights', { id: k, verseKey: k, bookId, chapter, verse: selectedVerse, kind, savedAt: Date.now() }); }
  };
  const toggleBookmark = async () => {
    if (selectedVerse == null) return; const k = verseKey(selectedVerse);
    if (bookmarks[k]) { const nb = { ...bookmarks }; delete nb[k]; setBookmarks(nb); await delFrom('bookmarks', k); showToast('Bookmark removed'); }
    else { setBookmarks({ ...bookmarks, [k]: true }); await putIn('bookmarks', { id: k, verseKey: k, bookId, chapter, verse: selectedVerse, savedAt: Date.now() }); showToast('Bookmarked ✓'); }
  };
  const openPanel = async (kind: 'pray' | 'cross' | 'commentary') => {
    if (selectedVerse == null) return; setPanel(kind);
    const allCom = await getAll('commentary');
    if (kind === 'pray') setPanelData((allCom || []).find((c: any) => c._table === 'verse_pray_read' && Number(c.book_id) === Number(bookId) && Number(c.chapter) === Number(chapter) && Number(c.verse) === Number(selectedVerse)) || null);
    if (kind === 'commentary') setPanelData((allCom || []).find((c: any) => c._table === 'verse_commentaries' && Number(c.book_id) === Number(bookId) && Number(c.chapter) === Number(chapter) && Number(c.verse) === Number(selectedVerse)) || (allCom || []).find((c: any) => c._table === 'chapter_commentaries' && Number(c.book_id) === Number(bookId) && Number(c.chapter) === Number(chapter)) || null);
    if (kind === 'cross') {
      const refs = (allCom || []).filter((c: any) => c._table === 'cross_references' && ((Number(c.from_book_id) === Number(bookId) && Number(c.from_chapter) === Number(chapter) && Number(c.from_verse) === Number(selectedVerse)) || (Number(c.book_id) === Number(bookId) && Number(c.chapter) === Number(chapter) && Number(c.verse) === Number(selectedVerse)) || (Number(c.from_book_id) === Number(bookId) && Number(c.from_chapter) === Number(chapter))));
      setPanelData(refs.slice(0, 30));
    }
  };
  const copyVerse = async () => {
    if (selectedVerse == null) return; const v = verses.find((x: any) => Number(x.verse) === selectedVerse); if (!v) return;
    const text = `${book?.name_english} ${chapter}:${selectedVerse} — ${v.text_english}${v.text_luganda ? `\n${v.text_luganda}` : ''}`;
    try { await navigator.clipboard.writeText(text); showToast('Copied ✓'); } catch { showToast('Copy not available offline'); }
  };

  const book = books.find((b: any) => Number(b.book_number ?? b.id) === Number(bookId)) || books[0];
  const totalCh = book?.total_chapters || book?.chapters || 50;
  const filteredBooks = books.filter((b: any) => { const n = Number(b.book_number ?? b.id); const isOT = n <= 39; if (testament === 'OT' && !isOT) return false; if (testament === 'NT' && isOT) return false; if (search) { const q = search.toLowerCase(); return String(b.name_english || '').toLowerCase().includes(q) || String(b.name_luganda || '').toLowerCase().includes(q); } return true; });

  if (!hasData && !loading) return (<div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#faf8f2' }}><div className="max-w-md text-center bg-white rounded-2xl shadow p-8"><p className="text-4xl">📖</p><h1 className="text-2xl font-bold mt-2" style={{ color: '#17372f' }}>No offline Bible yet</h1><p className="text-sm text-gray-600 mt-2">Connect once, go to Dashboard → Offline Content → Download All Bible Content, then come back here.</p><Link href="/dashboard" className="inline-block mt-4 px-5 py-3 rounded-xl font-bold text-white" style={{ background: '#17372f' }}>Go to Dashboard → Download</Link></div></div>);

  return (
    <div className="min-h-screen" style={{ background: '#faf8f2' }}>
      <header className="bg-[#17372f] text-[#fdf6e3] sticky top-0 z-40 border-b-4 border-[#e9c981]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {view === 'chapter' ? <button onClick={() => { setView('books'); setPanel(null); }} className="font-bold text-sm px-3 py-2 rounded-lg" style={{ background: '#e9c981', color: '#17372f' }}>← Books</button> : <Link href="/" className="flex items-center gap-2 font-bold"><img src="/assets/PrayRead-logo.png" alt="Pray-Read" width={38} height={38} className="object-contain rounded" /><span>Pray-Read <span className="text-[#e9c981]">Bible</span></span></Link>}
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: offline ? '#FEF3C7' : '#DCFCE7', color: offline ? '#92400E' : '#166534' }}>{offline ? '○ Offline — reading saved Bible' : '● Online'}</span>
        </div>
      </header>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-bold text-white shadow" style={{ background: '#17372f' }}>{toast}</div>}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {diag && <p className="text-center text-xs font-bold mb-3" style={{ color: '#17372f' }}>{diag}</p>}

        {view === 'books' ? (
          <div>
            <div className="bg-[#1d4035] rounded-2xl p-4 shadow">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books... (e.g. Psalms, Philemon)" className="w-full p-3 rounded-xl text-sm" style={{ background: '#faf8f2' }} />
              <div className="flex gap-2 mt-3"><button onClick={() => setTestament('OT')} className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{ background: testament === 'OT' ? '#e9c981' : '#17372f', color: testament === 'OT' ? '#17372f' : '#fdf6e3', border: '1px solid #e9c981' }}>📖 Old Testament (39)</button><button onClick={() => setTestament('NT')} className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{ background: testament === 'NT' ? '#e9c981' : '#17372f', color: testament === 'NT' ? '#17372f' : '#fdf6e3', border: '1px solid #e9c981' }}>📕 New Testament (27)</button></div>
            </div>
            <h2 className="font-bold mt-5 mb-3" style={{ color: '#17372f' }}>{testament === 'OT' ? '📖 Old Testament' : '📕 New Testament'} — {filteredBooks.length} books</h2>
            <div className="grid grid-cols-3 gap-3">{filteredBooks.map((b: any) => { const id = Number(b.book_number ?? b.id); const short = String(b.abbreviation || b.name_english || '').slice(0, 6); return (<button key={id} onClick={() => openBook(id)} className="bg-white rounded-2xl shadow p-3 text-center border" style={{ borderColor: '#e9c981' }}><p className="font-extrabold" style={{ color: '#a9852e' }}>{short}</p><p className="text-xs text-gray-600 truncate">{b.name_luganda || b.name_english}</p><p className="text-xs font-bold mt-1" style={{ color: '#17372f' }}>{b.total_chapters || b.chapters || ''}ch</p><p className="text-[11px] font-bold" style={{ color: '#166534' }}>✓ Offline</p></button>); })}</div>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-2xl shadow p-4">
              <label className="text-xs font-bold tracking-widest" style={{ color: '#a9852e' }}>BOOK — {book?.name_english}{book?.name_luganda ? ` — ${book.name_luganda}` : ''}</label>
              <div className="flex gap-2 mt-2"><button onClick={() => setView('books')} className="px-3 py-2 rounded-xl text-sm font-bold border" style={{ borderColor: '#e9c981' }}>Change Book</button><select value={bookId} onChange={e => goChapter(1) || setBookId(Number(e.target.value))} onChangeCapture={(e: any) => { setBookId(Number(e.target.value)); loadChapter(Number(e.target.value), 1); }} className="flex-1 p-2 rounded-xl border font-bold" style={{ borderColor: '#e9c981' }}>{books.map((b: any) => { const id = b.book_number ?? b.id; return <option key={id} value={id}>{b.name_english}{b.name_luganda ? ` — ${b.name_luganda}` : ''}</option>; })}</select></div>
              <label className="text-xs font-bold tracking-widest mt-4 block" style={{ color: '#a9852e' }}>CHAPTER</label>
              <div className="flex flex-wrap gap-2 mt-1">{Array.from({ length: Math.min(Number(totalCh) || 50, 150) }, (_, i) => i + 1).map(ch => (<button key={ch} onClick={() => goChapter(ch)} className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: ch === chapter ? '#17372f' : '#faf8f2', color: ch === chapter ? '#fff' : '#17372f', border: '1px solid #e9c981' }}>{ch}</button>))}</div>
              <div className="flex gap-2 mt-4">{(['english', 'luganda', 'both'] as const).map(k => (<button key={k} onClick={() => setLang(k)} className="px-4 py-2 rounded-full text-sm font-bold" style={{ background: lang === k ? '#17372f' : '#fff', color: lang === k ? '#fff' : '#17372f', border: '1px solid #e9c981' }}>{k === 'english' ? 'English' : k === 'luganda' ? 'Luganda' : 'Both'}</button>))}</div>
            </div>

            {loading ? <p className="text-center py-10 text-gray-500">Loading {book?.name_english} {chapter}…</p> : verses.length === 0 ? <div className="bg-white rounded-2xl shadow p-6 mt-4 text-center"><p className="font-bold" style={{ color: '#17372f' }}>This chapter is not downloaded yet.</p><Link href="/dashboard" className="inline-block mt-3 px-4 py-2 rounded-xl font-bold text-white" style={{ background: '#17372f' }}>Download</Link></div> : (
              <>
                {(intro || bookIntro) && <div className="bg-white rounded-2xl shadow p-5 mt-4"><h2 className="font-bold" style={{ color: '#17372f' }}>{intro ? 'Chapter Introduction' : 'Book Introduction'}</h2><p className="text-sm mt-1 text-gray-700">{String((intro?.introduction_english || intro?.content || '') || (bookIntro?.introduction_english || bookIntro?.content || '')).slice(0, 900)}</p>{bookIntro && intro && <details className="mt-3"><summary className="text-sm font-bold cursor-pointer" style={{ color: '#a9852e' }}>Book Introduction — {book?.name_english}</summary><p className="text-sm mt-2 text-gray-700">{String(bookIntro?.introduction_english || bookIntro?.content || '').slice(0, 1200)}</p></details>}</div>}
                <div className="bg-white rounded-2xl shadow p-5 md:p-8 mt-4">
                  <h1 className="text-2xl font-bold text-center" style={{ color: '#17372f', fontFamily: 'Georgia,serif' }}>{book?.name_english} {chapter}</h1>
                  <p className="text-center text-xs text-gray-500 mt-1">Tap a verse to highlight, pray, cross-reference, or bookmark — all saved offline.</p>
                  <div className="mt-4 space-y-4">{verses.map((v: any) => { const k = verseKey(Number(v.verse)); const hl = highlights[k]; const bm = bookmarks[k]; return (
                    <div key={v.id || `${v.chapter}-${v.verse}`} onClick={() => { setSelectedVerse(Number(v.verse)); setPanel(null); }} className="cursor-pointer rounded-xl p-3" style={{ background: hl === 'highlight' ? '#FEF08A' : selectedVerse === Number(v.verse) ? '#faf8f2' : 'transparent', border: selectedVerse === Number(v.verse) ? '1px solid #e9c981' : '1px solid transparent', textDecoration: hl === 'underline' ? 'underline' : 'none', textDecorationColor: '#a9852e', textDecorationThickness: '2px' }}>
                      <p className="text-lg leading-relaxed" style={{ fontFamily: 'Georgia,serif' }}><sup className="font-bold mr-1" style={{ color: '#a9852e' }}>{v.verse}</sup>{bm && ' 🔖 '}{(lang === 'english' || lang === 'both') && <span>{v.text_english}</span>}{(lang === 'both') && v.text_luganda && <><br /><span className="italic text-gray-600">{v.text_luganda}</span></>}{(lang === 'luganda') && <span className="italic">{v.text_luganda}</span>}</p>
                    </div>); })}</div>

                  {selectedVerse != null && (
                    <div className="sticky bottom-4 mt-6 p-3 rounded-2xl shadow-lg bg-white border" style={{ borderColor: '#e9c981' }}>
                      <p className="text-sm font-bold text-center" style={{ color: '#17372f' }}>Verse {selectedVerse} — Tools</p>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        <button onClick={() => toggleHighlight('highlight')} className="px-3 py-2 rounded-full text-xs font-bold" style={{ background: highlights[verseKey(selectedVerse)] === 'highlight' ? '#FEF08A' : '#faf8f2', border: '1px solid #e9c981' }}>🖍 Highlight</button>
                        <button onClick={() => toggleHighlight('underline')} className="px-3 py-2 rounded-full text-xs font-bold" style={{ background: '#faf8f2', border: '1px solid #e9c981', textDecoration: 'underline' }}>✏ Underline</button>
                        <button onClick={() => openPanel('pray')} className="px-3 py-2 rounded-full text-xs font-bold text-white" style={{ background: '#17372f' }}>🙏 Pray-Read</button>
                        <button onClick={() => openPanel('cross')} className="px-3 py-2 rounded-full text-xs font-bold" style={{ background: '#faf8f2', border: '1px solid #e9c981' }}>🔗 Cross-refs</button>
                        <button onClick={() => openPanel('commentary')} className="px-3 py-2 rounded-full text-xs font-bold" style={{ background: '#faf8f2', border: '1px solid #e9c981' }}>📖 Commentary</button>
                        <button onClick={toggleBookmark} className="px-3 py-2 rounded-full text-xs font-bold" style={{ background: '#faf8f2', border: '1px solid #e9c981' }}>{bookmarks[verseKey(selectedVerse)] ? '🔖 Saved' : '🔖 Bookmark'}</button>
                        <button onClick={copyVerse} className="px-3 py-2 rounded-full text-xs font-bold" style={{ background: '#faf8f2', border: '1px solid #e9c981' }}>📋 Copy</button>
                      </div>
                      {panel === 'pray' && <div className="mt-3 p-3 rounded-xl" style={{ background: '#faf8f2', border: '1px solid #e9c981' }}><h3 className="font-bold text-sm" style={{ color: '#17372f' }}>🙏 Pray-Read — Verse {selectedVerse}</h3>{panelData ? <><p className="text-sm mt-1">{panelData.pray_read_english || panelData.content || panelData.text_english}</p>{panelData.pray_read_luganda && <p className="text-sm italic text-gray-600 mt-2">{panelData.pray_read_luganda}</p>}</> : <p className="text-sm mt-1 text-gray-600">No Pray-Read saved for this verse yet — check Dashboard → Download again while online.</p>}</div>}
                      {panel === 'commentary' && <div className="mt-3 p-3 rounded-xl" style={{ background: '#faf8f2', border: '1px solid #e9c981' }}><h3 className="font-bold text-sm" style={{ color: '#17372f' }}>📖 Commentary — Verse {selectedVerse}</h3>{panelData ? <p className="text-sm mt-1">{String(panelData.commentary_english || panelData.content || panelData.text_english || '').slice(0, 1500)}</p> : <p className="text-sm mt-1 text-gray-600">No commentary saved for this verse yet.</p>}</div>}
                      {panel === 'cross' && <div className="mt-3 p-3 rounded-xl" style={{ background: '#faf8f2', border: '1px solid #e9c981' }}><h3 className="font-bold text-sm" style={{ color: '#17372f' }}>🔗 Cross-references — Verse {selectedVerse}</h3>{Array.isArray(panelData) && panelData.length ? panelData.map((r: any, i: number) => <p key={i} className="text-sm mt-1">• {r.to_book || r.to_book_name || r.reference || r.ref_text || `${r.to_book_id || r.to_book} ${r.to_chapter}:${r.to_verse}`} {r.to_text_english ? `— ${String(r.to_text_english).slice(0, 200)}` : ''}</p>) : <p className="text-sm mt-1 text-gray-600">No cross-references saved for this verse yet.</p>}</div>}
                    </div>
                  )}
                  <div className="flex justify-between mt-6"><button disabled={chapter <= 1} onClick={() => goChapter(chapter - 1)} className="px-4 py-2 rounded-xl font-bold border disabled:opacity-40" style={{ borderColor: '#e9c981' }}>← Prev</button><button disabled={chapter >= Number(totalCh)} onClick={() => goChapter(chapter + 1)} className="px-4 py-2 rounded-xl font-bold text-white disabled:opacity-40" style={{ background: '#17372f' }}>Next →</button></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
