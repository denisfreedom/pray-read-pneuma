"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Search, BookOpen, ChevronLeft, X, WifiOff, Download, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
// FIXED: removed useRouter — it was imported + const router = useRouter() but never used (dead code / lint warning)

// app/bible-reader/page.tsx — BOOK LIST (NOT the chapter reader)
// This file = "Choose a book" list. Do NOT edit this to fix the duplicate sidebar.
// Duplicate sidebar lives in: app/bible-reader/[book]/[chapter]/page.tsx

interface Book {
  id: number;
  book_number: number;
  name_english: string;
  name_luganda: string;
  testament: string;
  total_chapters: number;
  abbreviation_english: string;
  abbreviation_luganda: string;
}

// FIXED: BookGrid moved OUT of BibleReaderContent so it is not re-created on every render
function BookGrid({ bookList, testament, downloadedBookIds }: { bookList: Book[]; testament: 'old' | 'new'; downloadedBookIds: Set<number> }) {
  const isOT = testament === 'old';
  return (
    <div className="grid gap-2.5 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}>
      {bookList.map(book => {
        const isDownloaded = downloadedBookIds.has(book.id);
        return (
          <Link key={book.id} href={`/bible-reader/${book.book_number}`}
            className="group relative flex flex-col items-start justify-between rounded-2xl p-3.5 min-h-[108px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 active:scale-[0.98] touch-manipulation overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${isOT ? 'bg-amber-500' : 'bg-blue-600'}`} />
            {isDownloaded && (
              <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Offline
              </span>
            )}
            <div className="mt-1">
              <span className="block text-[19px] leading-none font-extrabold tracking-tight text-slate-900">
                {book.abbreviation_english || book.name_english.substring(0, 4)}
              </span>
              <span className="block mt-1.5 text-[13px] leading-tight font-semibold text-slate-700 line-clamp-1">{book.name_english}</span>
              <span className="block text-[12px] leading-tight text-slate-500 truncate w-full">{book.name_luganda}</span>
            </div>
            <div className="flex items-center justify-between w-full mt-3">
              <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${isOT ? 'bg-amber-50 text-amber-800 border border-amber-200/70' : 'bg-blue-50 text-blue-800 border border-blue-200/70'}`}>
                {book.total_chapters} {book.total_chapters === 1 ? 'chapter' : 'chapters'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function BibleReaderContent() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'old' | 'new'>('old');
  const [isOffline, setIsOffline] = useState(false);
  const [downloadedBookIds, setDownloadedBookIds] = useState<Set<number>>(new Set());
  const ntRef = useRef<HTMLDivElement>(null);
  const otRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const response = await fetch('/api/bible-books');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) { setBooks(data); setLoading(false); return; }
        }
      } catch { console.log('Online fetch failed, trying offline cache'); }
      try {
        const { getBooks } = await import('@/app/utils/offlineStorage');
        const cachedBooks = await getBooks();
        if (cachedBooks && cachedBooks.length > 0) setBooks(cachedBooks);
      } catch (error) { console.error('Failed to load books from offline storage:', error); }
      finally { setLoading(false); }
    };
    loadBooks();
  }, []);

  useEffect(() => {
    const checkDownloadedBooks = async () => {
      try {
        const { getAllFromStore } = await import('@/app/utils/offlineStorage');
        const allVerses = await getAllFromStore('verses');
        const bookIds = new Set<number>();
        allVerses.forEach((verse: any) => { if (verse.book_id) bookIds.add(verse.book_id); });
        setDownloadedBookIds(bookIds);
      } catch (error) { console.error('Error checking downloaded books:', error); }
    };
    if (books.length > 0) checkDownloadedBooks();
  }, [books]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return books;
    return books.filter(b => b.name_english?.toLowerCase().includes(q) || b.name_luganda?.toLowerCase().includes(q) || b.abbreviation_english?.toLowerCase().includes(q) || b.abbreviation_luganda?.toLowerCase().includes(q));
  }, [books, searchTerm]);

  const oldTestament = useMemo(() => filtered.filter(b => b.testament === 'Old Testament'), [filtered]);
  const newTestament = useMemo(() => filtered.filter(b => b.testament === 'New Testament'), [filtered]);
  const otTotal = books.filter(b => b.testament === 'Old Testament').length;
  const ntTotal = books.filter(b => b.testament === 'New Testament').length;

  const switchTab = (tab: 'old' | 'new') => {
    setActiveTab(tab);
    setTimeout(() => { const ref = tab === 'old' ? otRef : ntRef; ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30"><BookOpen className="w-7 h-7 text-white" /></div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-amber-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">Loading books…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-slate-900">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-xl hover:bg-slate-800 transition-colors"><ChevronLeft className="h-4 w-4" /> Dashboard</Link>
            <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 text-[13px] font-semibold rounded-xl hover:bg-slate-200 transition-colors"><ChevronLeft className="h-4 w-4" /> Home</Link>
            <div className="ml-auto flex items-center gap-2">
              {isOffline && (<span className="hidden sm:inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold px-2.5 py-1.5 rounded-full"><WifiOff className="w-3.5 h-3.5" /> Offline · {downloadedBookIds.size} available</span>)}
              <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"><BookOpen className="w-3.5 h-3.5" /> Bible Reader</span>
            </div>
          </div>
          <div className="mt-4 mb-3 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] sm:text-[32px] leading-[1.1] font-extrabold tracking-tight text-slate-900">Choose a book<span className="block text-slate-500 font-semibold text-[15px] sm:text-base mt-1">Pray · Read · Listen — English &amp; Luganda</span></h1>
            </div>
            <div className="hidden sm:flex shrink-0 items-center gap-2 bg-slate-900 text-white rounded-2xl px-3.5 py-2.5"><Sparkles className="w-4 h-4 text-amber-400" /><div className="leading-none"><div className="text-sm font-bold">{books.length} books</div><div className="text-[11px] text-slate-400 mt-0.5">66 · OT {otTotal} · NT {ntTotal}</div></div></div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search books…  e.g. Psalms, Okubikkulirwa, Philemon" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-10 py-3 text-[14px] bg-white border border-slate-300 rounded-2xl shadow-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none placeholder:text-slate-400" />
            {searchTerm && (<button onClick={() => setSearchTerm('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X className="w-3.5 h-3.5 text-slate-600" /></button>)}
          </div>
          {searchTerm.trim() && (<p className="mt-2 text-[13px] text-slate-500 font-medium">{filtered.length} result{filtered.length === 1 ? '' : 's'} for “{searchTerm.trim()}”</p>)}
          <div className="mt-3 flex p-1 bg-slate-100 rounded-2xl">
            <button onClick={() => switchTab('old')} className={`flex-1 py-2.5 px-3 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'old' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>📖 Old Testament <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{otTotal}</span></button>
            <button onClick={() => switchTab('new')} className={`flex-1 py-2.5 px-3 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'new' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>📕 New Testament <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">{ntTotal}</span></button>
          </div>
        </div>
      </div>
      {isOffline && (<div className="bg-slate-900 text-white px-4 py-2.5 text-center text-[13px] font-medium">📵 You&apos;re offline · Only downloaded books are available{downloadedBookIds.size > 0 && <span className="ml-2 px-2 py-0.5 bg-white/15 rounded-full text-xs">{downloadedBookIds.size} book{downloadedBookIds.size > 1 ? 's' : ''} available</span>}</div>)}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-12">
        {oldTestament.length > 0 && (<section ref={otRef} className="scroll-mt-44"><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-[15px]">📖</span><h2 className="text-[17px] font-extrabold tracking-tight">Old Testament</h2></div><span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">{oldTestament.length} books</span></div><BookGrid bookList={oldTestament} testament="old" downloadedBookIds={downloadedBookIds} /></section>)}
        {newTestament.length > 0 && (<section ref={ntRef} className="scroll-mt-44"><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-[15px]">📕</span><h2 className="text-[17px] font-extrabold tracking-tight">New Testament</h2></div><span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full">{newTestament.length} books</span></div><BookGrid bookList={newTestament} testament="new" downloadedBookIds={downloadedBookIds} /></section>)}
        {filtered.length === 0 && (<div className="text-center py-14 bg-white rounded-3xl border border-slate-200"><div className="text-4xl mb-3">📖</div><p className="font-bold text-slate-800">No books found for “{searchTerm}”</p><p className="text-sm text-slate-500 mt-1">Try English, Luganda, or abbreviation — e.g. Psalms, Zabbuli, Phil</p><button onClick={() => setSearchTerm('')} className="mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl">Clear search</button></div>)}
        <div className="text-center text-[12px] text-slate-400 space-y-1.5 pt-2"><div>Tap any book to open · English name · Luganda name · Chapters</div>{downloadedBookIds.size > 0 && (<div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold"><Download className="w-3.5 h-3.5" /> {downloadedBookIds.size} book{downloadedBookIds.size > 1 ? 's' : ''} available offline</div>)}</div>
      </div>
    </div>
  );
}

export default function BibleReaderPage() {
  return (<Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#F7F5F0]">Loading...</div>}><BibleReaderContent /></Suspense>);
}
