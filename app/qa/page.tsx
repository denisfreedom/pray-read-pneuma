'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, BookOpen, X, Share2, Check, Heart } from 'lucide-react';
import HighlightableText from '@/app/components/HighlightableText';
import AppNavbar from '@/app/components/AppNavbar';
import { ScriptureHtml, useScripturePopup, ScriptureVersePopup } from '@/components/ScriptureVersePopup';
import QAShareButton from '@/app/components/QAShareButton';


interface ScriptureRef {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
}

interface QA {
  id: number;
  topic: string;
  question: string;
  question_lu: string | null;
  answer: string;
  answer_lu: string | null;
  scripture_refs: ScriptureRef[];
  slug: string;
  is_published: boolean;
  created_at: string;
}

interface Topic {
  id: number;
  name_en: string;
  name_lu: string | null;
}

interface VersePopup {
  ref: string;
  text: string;
  loading: boolean;
}

type Lang = 'en' | 'lu' | 'both';

// Bible book names for inline scripture detection
const BIBLE_BOOKS_RE = /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s?Samuel|2\s?Samuel|1\s?Kings|2\s?Kings|1\s?Chronicles|2\s?Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s?of\s?Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s?Corinthians|2\s?Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s?Thessalonians|2\s?Thessalonians|1\s?Timothy|2\s?Timothy|Titus|Philemon|Hebrews|James|1\s?Peter|2\s?Peter|1\s?John|2\s?John|3\s?John|Jude|Revelation)\s+(\d+):(\d+)(?:-(\d+))?/g;

function stripHtmlToPlain(html: string): string {
  const NL = '\n';
  const BULLET = '\n\u2022 ';
  return html
    .replace(/<p[^>]*>/gi, NL)
    .replace(/<\/p>/gi, NL)
    .replace(/<br\s*\/?>/gi, NL)
    .replace(/<li[^>]*>/gi, BULLET)
    .replace(/<\/li>/gi, '')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (_m: string, g: string) => NL + g + NL)
    .replace(/<[^>]+>/g, '');
}

function parseInlineRefs(html: string): Array<{ type: 'text' | 'ref'; content: string; ref?: ScriptureRef }> {
  const parts: Array<{ type: 'text' | 'ref'; content: string; ref?: ScriptureRef }> = [];
  const plain = stripHtmlToPlain(html);
  let lastIndex = 0;
  BIBLE_BOOKS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BIBLE_BOOKS_RE.exec(plain)) !== null) {
    if (m.index > lastIndex) parts.push({ type: 'text', content: plain.slice(lastIndex, m.index) });
    const bookName = m[1].replace(/\s+/g, ' ').trim();
    parts.push({
      type: 'ref',
      content: m[0],
      ref: { ref: m[0], book: bookName, chapter: parseInt(m[2]), verse: parseInt(m[3]) },
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < plain.length) parts.push({ type: 'text', content: plain.slice(lastIndex) });
  return parts;
}

function AnswerBody({ html, onVerseClick, lang: _ }: { html: string; onVerseClick: (ref: ScriptureRef) => void; lang: Lang }) {
  const parts = parseInlineRefs(html);
  return (
    <div className="text-white/85 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.type === 'ref' && p.ref ? (
          <button key={i} onClick={() => onVerseClick(p.ref!)}
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 hover:bg-amber-400/25 hover:border-amber-400/70 transition-all text-xs font-semibold align-middle">
            <BookOpen className="w-3 h-3" />{p.content}
          </button>
        ) : (
          <span key={i}>{p.content}</span>
        )
      )}
    </div>
  );
}

export default function QAPage() {
  const [qaList, setQaList] = useState<QA[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState('All');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [versePopup, setVersePopup] = useState<VersePopup | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const popupRef = useRef<HTMLDivElement>(null);
  
  const { popup, openVerse, closePopup } = useScripturePopup();

  useEffect(() => {
    const fetchQAData = async () => {
      try {
        // Check if offline
        if (!navigator.onLine) {
          console.log('[QA] Device is offline, loading from IndexedDB...');
          const { getAllFromStore } = await import('@/app/utils/offlineStorage');
          const offlineQA = await getAllFromStore('qa');
          const offlineTopics = offlineQA
            .map((q: any) => q.topic)
            .filter((t: string, i: number, arr: string[]) => arr.indexOf(t) === i)
            .map((t: string, i: number) => ({ id: i + 1, name_en: t, name_lu: null }));
          
          setQaList(Array.isArray(offlineQA) ? offlineQA.filter((q: QA) => q.is_published) : []);
          setTopics(offlineTopics);
          setLoading(false);
          console.log(`[QA] Loaded ${offlineQA.length} Q&A entries from offline storage`);
          return;
        }

        // Online: fetch from API
        const [qaData, topicsData] = await Promise.all([
          fetch('/api/bible-qa').then(r => r.json()),
          fetch('/api/bible-qa?type=topics').then(r => r.json()),
        ]);

        setQaList(Array.isArray(qaData) ? qaData.filter((q: QA) => q.is_published) : []);
        setTopics(Array.isArray(topicsData) ? topicsData : []);
        setLoading(false);

        // Cache the data in IndexedDB for offline use
        const { saveToStore } = await import('@/app/utils/offlineStorage');
        for (const qa of qaData) {
          await saveToStore('qa', qa);
        }
        console.log(`[QA] Cached ${qaData.length} Q&A entries to offline storage`);
      } catch (error) {
        console.error('[QA] Error loading Q&A data:', error);
        
        // On error, try to load from offline storage as fallback
        try {
          const { getAllFromStore } = await import('@/app/utils/offlineStorage');
          const offlineQA = await getAllFromStore('qa');
          const offlineTopics = offlineQA
            .map((q: any) => q.topic)
            .filter((t: string, i: number, arr: string[]) => arr.indexOf(t) === i)
            .map((t: string, i: number) => ({ id: i + 1, name_en: t, name_lu: null }));
          
          setQaList(Array.isArray(offlineQA) ? offlineQA.filter((q: QA) => q.is_published) : []);
          setTopics(offlineTopics);
          console.log(`[QA] Loaded ${offlineQA.length} Q&A entries from offline storage (fallback)`);
        } catch (offlineError) {
          console.error('[QA] Error loading from offline storage:', offlineError);
        }
        
        setLoading(false);
      }
    };

    fetchQAData();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('q');
    if (slug && qaList.length > 0) {
      const found = qaList.find(q => q.slug === slug);
      if (found) setExpanded(found.id);
    }
  }, [qaList]);

  // Build topic list with bilingual labels
  const topicPills = [
    { key: 'All', label: 'All' },
    ...topics.map(t => ({
      key: t.name_en,
      label: lang === 'lu' && t.name_lu ? t.name_lu : lang === 'both' && t.name_lu ? `${t.name_en} / ${t.name_lu}` : t.name_en,
    })),
  ];

  const filtered = qaList.filter(q => {
    const matchesTopic = activeTopic === 'All' || q.topic === activeTopic;
    const matchesSearch = search === '' ||
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      (q.question_lu || '').toLowerCase().includes(search.toLowerCase()) ||
      q.topic.toLowerCase().includes(search.toLowerCase());
    return matchesTopic && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const grouped: Record<string, QA[]> = {};
  paginated.forEach(q => {
    if (!grouped[q.topic]) grouped[q.topic] = [];
    grouped[q.topic].push(q);
  });

  const handleTopicChange = (key: string) => { setActiveTopic(key); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearch(val); setCurrentPage(1); };

  const getTopicLabel = (topicKey: string) => {
    const t = topics.find(x => x.name_en === topicKey);
    if (!t) return topicKey;
    if (lang === 'lu' && t.name_lu) return t.name_lu;
    if (lang === 'both' && t.name_lu) return `${t.name_en} / ${t.name_lu}`;
    return t.name_en;
  };

  const fetchVerse = async (ref: ScriptureRef) => {
    setVersePopup({ ref: ref.ref, text: '', loading: true });
    try {
      const booksRes = await fetch('/api/bible-books?full=true');
      const books = await booksRes.json();
      const book = books.find((b: any) =>
        b.name_english?.toLowerCase() === ref.book.toLowerCase() ||
        b.abbreviation_english?.toLowerCase() === ref.book.toLowerCase()
      );
      if (!book) { setVersePopup({ ref: ref.ref, text: 'Verse not found in the database.', loading: false }); return; }
      const res = await fetch(`/api/bible-verses?bookId=${book.id}&chapter=${ref.chapter}&verse=${ref.verse}`);
      const data = await res.json();
      const verseData = Array.isArray(data) ? data[0] : (data.verses?.[0] ?? null);
      if (verseData) {
        const text = lang === 'lu' && verseData.text_luganda ? verseData.text_luganda
          : lang === 'both' && verseData.text_luganda ? `${verseData.text_english}\n\n${verseData.text_luganda}`
          : verseData.text_english || '';
        setVersePopup({ ref: ref.ref, text, loading: false });
      } else {
        setVersePopup({ ref: ref.ref, text: 'Verse text not available yet.', loading: false });
      }
    } catch { setVersePopup({ ref: ref.ref, text: 'Could not load verse.', loading: false }); }
  };

  const shareLink = (slug: string, id: number) => {
    const url = `${window.location.origin}/qa?q=${slug}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
  };

  const langLabels: Record<Lang, string> = { en: '🇬🇧 English', lu: '🇺🇬 Luganda', both: '🌐 Both' };

  return (
    <div className="min-h-screen text-white font-sans antialiased" style={{ background: `url('https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/qa-background_jpg.jpeg') center center / cover no-repeat fixed`, backgroundColor: '#0a0a1a' }}>
      <AppNavbar />

      {/* Dark overlay for readability */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'rgba(5,5,15,0.82)' }} />

      {/* HERO */}
      <section className="relative pt-32 pb-16 px-6 text-center overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            Bible Questions &amp; Answers
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-serif mb-4 leading-tight">
            <span className="text-white">Biblical </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 italic">Q&amp;A</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-8">
            Clear, scripture-grounded answers to your Bible questions — click any verse reference to see the full text.
          </p>

          {/* Language Toggle */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            <div className="flex items-center justify-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 w-fit">
              {(['en', 'lu', 'both'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${lang === l ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}>
                  {langLabels[l]}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input type="text" placeholder="Search questions or topics..." value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all" />
          </div>
        </div>
      </section>

      {/* TOPIC PILLS */}
      <div className="sticky top-20 z-30 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {topicPills.map(pill => (
            <button key={pill.key} onClick={() => handleTopicChange(pill.key)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTopic === pill.key
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}>
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q&A LIST */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-20 relative z-10">
        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No questions found.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([topicKey, questions]) => (
              <div key={topicKey}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                  <span className="px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-amber-400 border border-amber-400/30 bg-amber-400/5">
                    {getTopicLabel(topicKey)}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                </div>

                <div className="space-y-3">
                  {questions.map(qa => {
                    const refs: ScriptureRef[] = Array.isArray(qa.scripture_refs) ? qa.scripture_refs
                      : (typeof qa.scripture_refs === 'string' ? JSON.parse(qa.scripture_refs) : []);
                    const isOpen = expanded === qa.id;

                    // Determine which question/answer to show
                    const showQuestion = lang === 'lu' && qa.question_lu ? qa.question_lu
                      : lang === 'both' && qa.question_lu ? `${qa.question} / ${qa.question_lu}`
                      : qa.question;
                    const showAnswer = lang === 'lu' && qa.answer_lu ? qa.answer_lu : qa.answer;
                    const showAnswerLu = lang === 'both' && qa.answer_lu ? qa.answer_lu : null;

                    return (
                      <div key={qa.id}
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                          isOpen ? 'border-amber-400/40 bg-white/5' : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'
                        }`}
                        style={{ background: isOpen ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)' }}>

                        {/* Question row */}
                        <button className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-start gap-4"
                          onClick={() => setExpanded(isOpen ? null : qa.id)}>
                          <span className="shrink-0 w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xs mt-0.5">Q</span>
                          <span className="flex-1 text-white font-medium text-base sm:text-lg leading-snug pr-2">{showQuestion}</span>
                          <span className="shrink-0 text-white/40 mt-1">{isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
                        </button>

                        {/* Answer */}
                        {isOpen && (
                          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 border-t border-white/8">
                            {/* English answer */}
                            {lang !== 'lu' && (
                              <div className="flex items-start gap-4 mb-4">
                                <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-xs mt-0.5">A</span>
                                <div className="flex-1 min-w-0">
                                  {lang === 'both' && <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">🇬🇧 English</p>}
                                  <div className="max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-amber-400/30 scrollbar-track-white/5 rounded-lg">
                                    <ScriptureHtml html={qa.answer} onVerseClick={openVerse} className="text-white/85 leading-relaxed" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Luganda answer */}
                            {(lang === 'lu' || lang === 'both') && (showAnswer || showAnswerLu) && (
                              <div className={`flex items-start gap-4 mb-4 ${lang === 'both' && qa.answer_lu ? 'border-t border-white/8 pt-4 mt-4' : ''}`}>
                                {lang === 'lu' && <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-xs mt-0.5">A</span>}
                                {lang === 'both' && <span className="shrink-0 w-7 h-7 rounded-full bg-blue-400/15 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold text-xs mt-0.5">A</span>}
                                <div className="flex-1 min-w-0">
                                  {lang === 'both' && <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">🇺🇬 Luganda</p>}
                                  <div className="max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-400/30 scrollbar-track-white/5 rounded-lg">
                                    <ScriptureHtml html={lang === 'lu' ? showAnswer : (showAnswerLu || '<p><em>Okuddamu mu Luganda tekuweebwa</em></p>')} onVerseClick={openVerse} className="text-white/85 leading-relaxed italic" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Scripture References */}
                            {refs.length > 0 && (
                              <div className="mt-5 ml-11">
                                <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-medium">Scripture References</p>
                                <div className="flex flex-wrap gap-2">
                                  {refs.map((ref, i) => (
                                    <button key={i} onClick={() => fetchVerse(ref)}
                                      className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-sm hover:bg-blue-500/20 hover:border-blue-400/60 transition-all font-medium">
                                      <BookOpen className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />{ref.ref}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Share */}
                            <div className="mt-5 ml-11 flex items-center gap-3">
                              <QAShareButton
                                question={qa.question}
                                answer={qa.answer}
                                questionLu={qa.question_lu || undefined}
                                answerLu={qa.answer_lu || undefined}
                                slug={qa.slug}
                                lang={lang}
                                topic={qa.topic}
                              />
                              <button onClick={() => shareLink(qa.slug, qa.id)}
                                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition-colors">
                                {copied === qa.id
                                  ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Link copied!</span></>
                                  : <><Share2 className="w-3.5 h-3.5" />Copy permalink</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-amber-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium">
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              // Show first, last, current ±1, and ellipses
              const show = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
              const isEllipsisBefore = page === currentPage - 2 && currentPage > 4;
              const isEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 3;
              if (isEllipsisBefore || isEllipsisAfter) return <span key={page} className="text-white/30 px-1">…</span>;
              if (!show) return null;
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-amber-400/40'
                  }`}>
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-amber-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium">
              Next →
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-center text-white/25 text-sm mt-4">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} questions
          </p>
        )}
      </main>

      {/* SCRIPTURE POPUP */}
      <ScriptureVersePopup popup={popup} onClose={closePopup} variant="dark" />

      {/* OLD VERSE POPUP (kept for Scripture References section) */}
      {versePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(12px)' }}
          onClick={e => { if (e.target === e.currentTarget) setVersePopup(null); }}>
          <div ref={popupRef} className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #1c1a2e 0%, #14213e 50%, #0d2a50 100%)', border: '1px solid rgba(255,180,50,0.18)' }}>

            {/* Popup header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-tight">{versePopup.ref}</p>
                  <p className="text-amber-300/50 text-xs mt-0.5">King James Version (KJV)</p>
                </div>
              </div>
              <button onClick={() => setVersePopup(null)}
                className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-all ml-4 shrink-0">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Verse body — scrollable */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-400/25 scrollbar-track-white/5">
              {versePopup.loading ? (
                <div className="flex items-center gap-3 py-6">
                  <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                  <span className="text-white/50 text-sm">Loading verse...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-l-3 border-amber-400/60 pl-5" style={{ borderLeftWidth: 3, borderLeftColor: 'rgba(251,191,36,0.6)' }}>
                    <blockquote className="text-white/95 text-base sm:text-lg leading-loose font-serif italic whitespace-pre-line">
                      &ldquo;{versePopup.text}&rdquo;
                    </blockquote>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="text-white/30 text-xs font-medium px-2">— {versePopup.ref}</span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>
                </div>
              )}
            </div>

            {/* Popup footer */}
            <div className="px-6 pb-5 pt-2 flex justify-end">
              <button onClick={() => setVersePopup(null)}
                className="px-5 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-sm font-medium hover:bg-amber-400/20 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --qa-font-size: 16px; }
        .prose-answer strong { color: #fbbf24; font-weight: 700; }
        .prose-answer em { color: #e2e8f0; font-style: italic; }
        .prose-answer p { margin-bottom: 0.75rem; }
        .prose-answer ul, .prose-answer ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .prose-answer li { margin-bottom: 0.25rem; }
        .prose-answer h3, .prose-answer h4 { color: #f5d790; font-weight: 700; margin-bottom: 0.5rem; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 99px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.25); border-radius: 99px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(251,191,36,0.45); }
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) rgba(255,255,255,0.04); }
        
        /* Scripture reference button hover effects */
        button[data-scripture-ref]:hover {
          background: rgba(251,191,36,0.25) !important;
          border-color: rgba(251,191,36,0.7) !important;
          color: #fef3c7 !important;
          transform: scale(1.05);
        }
        button[data-scripture-ref]:active {
          transform: scale(0.95);
        }
        
        /* Ensure scripture buttons inherit font size */
        button[data-scripture-ref] {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
