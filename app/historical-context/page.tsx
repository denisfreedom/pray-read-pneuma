'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, BookOpen, ArrowLeft, Search, Globe, MapPin, ScrollText, Microscope } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useScripturePopup, ScriptureVersePopup, ScriptureHtml } from '@/components/ScriptureVersePopup';
import HighlightableText from '@/app/components/HighlightableText';

interface BookEntry {
  book_id: number;
  book_name: string;
  book_number: number;
  testament: string;
  content_count: number;
}

interface HistoricalEntry {
  id: number;
  book_id: number;
  book_name: string;
  chapter: number | null;
  historical_background: string;
  cultural_context: string;
  maps_geography: string;
  timeline: string;
  archaeological_notes: string;
}

type Lang = 'english' | 'luganda' | 'both';

const TABS = [
  { key: 'historical_background', label: 'Background', icon: ScrollText },
  { key: 'cultural_context', label: 'Culture', icon: Globe },
  { key: 'maps_geography', label: 'Geography', icon: MapPin },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'archaeological_notes', label: 'Archaeology', icon: Microscope },
];

export default function HistoricalContextPage() {
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookEntry | null>(null);
  const [entries, setEntries] = useState<HistoricalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('historical_background');
  const { popup, openVerse, closePopup } = useScripturePopup();

  useEffect(() => {
    fetch('/api/all-historical-context')
      .then(r => r.json())
      .then(data => { setBooks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadEntries = async (book: BookEntry) => {
    setSelectedBook(book);
    setLoadingEntries(true);
    setExpandedId(null);
    try {
      const res = await fetch(`/api/all-historical-context?bookId=${book.book_id}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch { setEntries([]); }
    setLoadingEntries(false);
  };

  const otBooks = books.filter(b => b.testament?.toLowerCase().includes('old'));
  const ntBooks = books.filter(b => b.testament?.toLowerCase().includes('new'));

  const filteredEntries = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.historical_background, e.cultural_context, e.maps_geography, e.timeline, e.archaeological_notes]
      .some(field => (field || '').toLowerCase().includes(q));
  });

  const getTabContent = (entry: HistoricalEntry) => {
    const map: Record<string, string> = {
      historical_background: entry.historical_background,
      cultural_context: entry.cultural_context,
      maps_geography: entry.maps_geography,
      timeline: entry.timeline,
      archaeological_notes: entry.archaeological_notes,
    };
    return map[activeTab] || '';
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop)' }}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-900/85 via-slate-900/80 to-slate-950/90">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-6xl mx-auto px-3 py-3 flex items-center gap-2 sm:gap-4">
            <Link href="/" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-7 h-7 sm:w-8 sm:h-8 relative flex-shrink-0">
              <Image
                src="https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778051598093_zhqn2c.png"
                alt="Logo" fill className="object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-xl font-bold text-white flex items-center gap-1.5 truncate">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                <span className="truncate">Historical Context</span>
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">Cultural &amp; historical background of scriptures</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {!selectedBook ? (
            loading ? (
              <div className="text-center py-20 text-gray-300">Loading books…</div>
            ) : books.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-16 h-16 text-blue-400/40 mx-auto mb-4" />
                <p className="text-gray-300 text-lg">No historical context has been added yet.</p>
                <p className="text-gray-500 text-sm mt-2">Content will appear here once the admin adds it.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {otBooks.length > 0 && (
                  <section>
                    <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Old Testament
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {otBooks.map(book => (
                        <button
                          key={book.book_id}
                          onClick={() => loadEntries(book)}
                          className="group bg-white/10 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 rounded-xl p-4 text-left transition-all duration-200"
                        >
                          <p className="font-semibold text-white text-sm group-hover:text-amber-300 transition-colors line-clamp-2">{book.book_name}</p>
                          <p className="text-xs text-amber-400/70 mt-1">{book.content_count} section{book.content_count !== 1 ? 's' : ''}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {ntBooks.length > 0 && (
                  <section>
                    <h2 className="text-blue-300 font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> New Testament
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {ntBooks.map(book => (
                        <button
                          key={book.book_id}
                          onClick={() => loadEntries(book)}
                          className="group bg-white/10 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 rounded-xl p-4 text-left transition-all duration-200"
                        >
                          <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors line-clamp-2">{book.book_name}</p>
                          <p className="text-xs text-blue-400/70 mt-1">{book.content_count} section{book.content_count !== 1 ? 's' : ''}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => { setSelectedBook(null); setEntries([]); setSearch(''); }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedBook.book_name}</h2>
                  <p className="text-blue-400/70 text-sm">{entries.length} historical section{entries.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        activeTab === tab.key
                          ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                          : 'bg-white/10 text-gray-400 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className="w-3 h-3" /> {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search historical content…"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                />
              </div>

              {loadingEntries ? (
                <div className="text-center py-20 text-gray-300">Loading content…</div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-20 text-gray-400">No content found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map(entry => {
                    const content = getTabContent(entry);
                    return (
                      <div
                        key={entry.id}
                        className="bg-white/10 border border-white/10 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="font-semibold text-white">
                              {entry.chapter == null
                                ? `${selectedBook.book_name} — Book Overview`
                                : `${selectedBook.book_name} — Chapter ${entry.chapter}`}
                            </span>
                          </div>
                          {expandedId === entry.id
                            ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          }
                        </button>

                        {expandedId === entry.id && (
                          <div className="px-5 pb-5 border-t border-white/10 pt-4">
                            {content ? (
                              <HighlightableText
                                sectionKey={`hist-${entry.id}-${activeTab}`}
                                html={content}
                                className="text-gray-200 leading-relaxed text-sm"
                                scriptureContext={{ book: selectedBook.book_name, bookNumber: selectedBook.book_number, chapter: entry.chapter ?? 1 }}
                                onVerseClick={openVerse}
                              />
                            ) : (
                              <p className="text-gray-500 italic">No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} content available for this section.</p>
                            )}
                            {entry.chapter != null && (
                              <div className="pt-4">
                                <Link
                                  href={`/bible-reader/${selectedBook.book_name.toLowerCase().replace(/\s+/g, '-')}/${entry.chapter}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <BookOpen className="w-3 h-3" /> Read Chapter {entry.chapter}
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ScriptureVersePopup popup={popup} onClose={closePopup} />
    </div>
  );
}
