'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, BookOpen, ArrowLeft, Search, Globe } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useScripturePopup, ScriptureVersePopup, ScriptureHtml } from '@/components/ScriptureVersePopup';
import HighlightableText from '@/app/components/HighlightableText';


interface BookEntry {
  book_id: number;
  book_name: string;
  book_number: number;
  testament: string;
  insight_count: number;
}

interface InsightEntry {
  id: number;
  book_id: number;
  book_name: string;
  chapter: number;
  verse_number: number;
  english_insight: string;
  luganda_insight: string;
}

type Lang = 'english' | 'luganda' | 'both';

export default function TheologicalInsightsPage() {
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookEntry | null>(null);
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [lang, setLang] = useState<Lang>('english');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { popup, openVerse, closePopup } = useScripturePopup();

  useEffect(() => {
    fetch('/api/all-theological-insights')
      .then(r => r.json())
      .then(data => { setBooks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadInsights = async (book: BookEntry) => {
    setSelectedBook(book);
    setLoadingInsights(true);
    setExpandedId(null);
    try {
      const res = await fetch(`/api/all-theological-insights?bookId=${book.book_id}`);
      const data = await res.json();
      setInsights(Array.isArray(data) ? data : []);
    } catch { setInsights([]); }
    setLoadingInsights(false);
  };

  const otBooks = books.filter(b => b.testament?.toLowerCase().includes('old'));
  const ntBooks = books.filter(b => b.testament?.toLowerCase().includes('new'));

  const filteredInsights = insights.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.english_insight || '').toLowerCase().includes(q) ||
      (i.luganda_insight || '').toLowerCase().includes(q) ||
      `${i.chapter}:${i.verse_number}`.includes(q)
    );
  });

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
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
                <span className="truncate">Theological Insights</span>
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">Doctrinal analysis &amp; biblical themes across all books</p>
            </div>
            {/* Language Toggle */}
            <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 sm:p-1 flex-shrink-0">
              {(['english','luganda','both'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    lang === l ? 'bg-amber-500 text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {l === 'both' ? 'Both' : l === 'luganda' ? 'LG' : 'EN'}
                  <span className="hidden sm:inline">{l === 'luganda' ? 'anda' : l === 'english' ? 'glish' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {!selectedBook ? (
            /* Books List */
            loading ? (
              <div className="text-center py-20 text-gray-300">Loading books…</div>
            ) : books.length === 0 ? (
              <div className="text-center py-20">
                <Lightbulb className="w-16 h-16 text-amber-400/40 mx-auto mb-4" />
                <p className="text-gray-300 text-lg">No theological insights have been added yet.</p>
                <p className="text-gray-500 text-sm mt-2">Insights will appear here once the admin adds them.</p>
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
                          onClick={() => loadInsights(book)}
                          className="group bg-white/10 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 rounded-xl p-4 text-left transition-all duration-200"
                        >
                          <p className="font-semibold text-white text-sm group-hover:text-amber-300 transition-colors line-clamp-2">{book.book_name}</p>
                          <p className="text-xs text-amber-400/70 mt-1">{book.insight_count} insight{book.insight_count !== 1 ? 's' : ''}</p>
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
                          onClick={() => loadInsights(book)}
                          className="group bg-white/10 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 rounded-xl p-4 text-left transition-all duration-200"
                        >
                          <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors line-clamp-2">{book.book_name}</p>
                          <p className="text-xs text-blue-400/70 mt-1">{book.insight_count} insight{book.insight_count !== 1 ? 's' : ''}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )
          ) : (
            /* Insights for selected book */
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => { setSelectedBook(null); setInsights([]); setSearch(''); }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedBook.book_name}</h2>
                  <p className="text-amber-400/70 text-sm">{insights.length} theological insight{insights.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search insights…"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              {loadingInsights ? (
                <div className="text-center py-20 text-gray-300">Loading insights…</div>
              ) : filteredInsights.length === 0 ? (
                <div className="text-center py-20 text-gray-400">No insights found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredInsights.map(insight => (
                    <div
                      key={insight.id}
                      className="bg-white/10 border border-white/10 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="font-semibold text-white">
                            {selectedBook.book_name} {insight.chapter}:{insight.verse_number}
                          </span>
                        </div>
                        {expandedId === insight.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        }
                      </button>
                        {expandedId === insight.id && (
                        <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
                          {(lang === 'english' || lang === 'both') && insight.english_insight && (
                            <div>
                              {lang === 'both' && <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">English</p>}
                              <HighlightableText
                                sectionKey={`theo-en-${insight.id}`}
                                html={insight.english_insight}
                                className="text-gray-200 leading-relaxed text-sm"
                                scriptureContext={{ book: selectedBook.book_name, bookNumber: selectedBook.book_number, chapter: insight.chapter }}
                                onVerseClick={openVerse}
                              />
                            </div>
                          )}
                          {(lang === 'luganda' || lang === 'both') && insight.luganda_insight && (
                            <div>
                              {lang === 'both' && <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"><Globe className="w-3 h-3" /> Luganda</p>}
                              <HighlightableText
                                sectionKey={`theo-lu-${insight.id}`}
                                html={insight.luganda_insight}
                                className="text-gray-200 leading-relaxed text-sm italic"
                                scriptureContext={{ book: selectedBook.book_name, bookNumber: selectedBook.book_number, chapter: insight.chapter }}
                                onVerseClick={openVerse}
                              />
                            </div>
                          )}
                          <div className="pt-2">
                            <Link
                              href={`/bible-reader/${selectedBook.book_name.toLowerCase().replace(/\s+/g, '-')}/${insight.chapter}`}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              <BookOpen className="w-3 h-3" /> Read this chapter
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
