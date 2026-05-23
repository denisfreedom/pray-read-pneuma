'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Search, BookOpen, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

function BibleReaderContent() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'old' | 'new'>('old');
  const router = useRouter();
  const ntRef = useRef<HTMLDivElement>(null);
  const otRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/bible-books')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBooks(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = searchTerm.trim()
    ? books.filter(b =>
        b.name_english?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.name_luganda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.abbreviation_english?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : books;

  const oldTestament = filtered.filter(b => b.testament === 'Old Testament');
  const newTestament = filtered.filter(b => b.testament === 'New Testament');

  const switchTab = (tab: 'old' | 'new') => {
    setActiveTab(tab);
    setTimeout(() => {
      const ref = tab === 'old' ? otRef : ntRef;
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #0a1228 0%, #1a2a4a 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading books…</p>
        </div>
      </div>
    );
  }

  const BookGrid = ({ bookList, testament }: { bookList: Book[]; testament: 'old' | 'new' }) => {
    const isOT = testament === 'old';
    return (
      <div className={`grid gap-2`} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
        {bookList.map(book => (
          <Link
            key={book.id}
            href={`/bible-reader/${book.book_number}`}
            className={`group flex flex-col items-center justify-center rounded-lg p-2.5 text-center transition-all duration-150 active:scale-95 touch-manipulation
              ${isOT
                ? 'border border-amber-400/30 hover:border-amber-400/70 hover:bg-amber-400/20'
                : 'border border-blue-400/30 hover:border-blue-400/70 hover:bg-blue-400/20'
              }`}
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <span className={`text-sm font-bold leading-tight mb-0.5 ${isOT ? 'text-amber-300' : 'text-blue-300'}`}>
              {book.abbreviation_english || book.name_english.substring(0, 4)}
            </span>
            <span className="text-xs text-white/50 leading-tight truncate w-full text-center">
              {book.name_luganda?.substring(0, 8)}
            </span>
            <span className={`text-xs mt-0.5 ${isOT ? 'text-amber-500' : 'text-blue-500'}`}>
              {book.total_chapters}ch
            </span>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundImage: 'url(https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778322511425_qx7i4a.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-0" style={{ background: 'rgba(0,0,0,0.65)' }} />
      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md border-b border-white/10 shadow-lg" style={{ background: 'rgba(0,0,0,0.75)' }}>
        <div className="max-w-3xl mx-auto px-3 py-2">
          {/* Nav row */}
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors">
              <ChevronLeft className="h-3 w-3" />
              Dashboard
            </Link>
            <Link href="/" className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
              <ChevronLeft className="h-3 w-3" />
              Home
            </Link>
            <div className="flex items-center gap-1 ml-auto">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">Bible Reader</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-amber-400" />
            <input
              type="text"
              placeholder="Search books… (e.g. Psalms, Philemon)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-white/20 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-white placeholder-white/40"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* OT / NT tab switcher */}
          <div className="flex rounded-lg overflow-hidden border border-white/15">
            <button
              onClick={() => switchTab('old')}
              className={`flex-1 py-2 text-xs font-bold transition-all ${
                activeTab === 'old'
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-300 hover:bg-white/10'
              }`}
              style={activeTab !== 'old' ? { background: 'rgba(255,255,255,0.05)' } : {}}
            >
              📖 Old Testament <span className="opacity-70 ml-1">({books.filter(b => b.testament === 'Old Testament').length})</span>
            </button>
            <button
              onClick={() => switchTab('new')}
              className={`flex-1 py-2 text-xs font-bold transition-all ${
                activeTab === 'new'
                  ? 'bg-blue-500 text-white'
                  : 'text-blue-300 hover:bg-white/10'
              }`}
              style={activeTab !== 'new' ? { background: 'rgba(255,255,255,0.05)' } : {}}
            >
              📕 New Testament <span className="opacity-70 ml-1">({books.filter(b => b.testament === 'New Testament').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-3 py-4 space-y-6">
        {/* Old Testament */}
        {oldTestament.length > 0 && (
          <div ref={otRef}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📖</span>
              <h2 className="text-sm font-bold text-amber-300">Old Testament</h2>
              <span className="text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">{oldTestament.length} books</span>
            </div>
            <div className="rounded-xl p-3 border border-amber-400/20 shadow-lg backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <BookGrid bookList={oldTestament} testament="old" />
            </div>
          </div>
        )}

        {/* New Testament */}
        {newTestament.length > 0 && (
          <div ref={ntRef}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📕</span>
              <h2 className="text-sm font-bold text-blue-300">New Testament</h2>
              <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/30">{newTestament.length} books</span>
            </div>
            <div className="rounded-xl p-3 border border-blue-400/20 shadow-lg backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <BookGrid bookList={newTestament} testament="new" />
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No books found for "{searchTerm}"</p>
          </div>
        )}

        {/* Legend */}
        <div className="text-center text-xs text-white/30 pb-4">
          Tap any book to open · abbreviation · luganda · chapters
        </div>
      </div>
    </div>
  );
}

export default function BibleReaderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <BibleReaderContent />
    </Suspense>
  );
}
