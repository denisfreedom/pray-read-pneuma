// app/qa/page.tsx — Biblical Q&A (FRONTEND)
// Same layout as your screenshot: "Biblical Q&A" hero, English / Luganda /
// Both toggle, search, topic pills, accordion answers, clickable scripture
// refs that fetch the full verse text. Colours moved to front colours:
// emerald #17372f / #1d4035, gold #e9c981 / #a9852e, cream #faf8f2,
// logo /assets/PrayRead-logo.png.
// Only PUBLISHED Q&A are fetched (?published=true). Drafts stay in admin.
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const ENDPOINTS = ['/api/bible-qa', '/api/qa'];
async function api(path: string) {
  let lastErr: any = null;
  for (const base of ENDPOINTS) {
    try {
      const res = await fetch(base + path);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Q&A API not found');
}
const asArray = (d: any): any[] => Array.isArray(d) ? d : Array.isArray(d?.questions) ? d.questions : Array.isArray(d?.data) ? d.data : [];
const refsOf = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') { try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String); } catch {} return v.split(',').map(s => s.trim()).filter(Boolean); }
  return [];
};

interface QA { id: number; topic: string; question: string; question_lu?: string | null; answer: string; answer_lu?: string | null; scripture_refs?: any; }

export default function BibleQAFront() {
  const [items, setItems] = useState<QA[]>([]);
  const [topics, setTopics] = useState<{ name_en: string; name_lu?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'en' | 'lu' | 'both'>('en');
  const [topic, setTopic] = useState('All');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});
  const [verseLoading, setVerseLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const [q, t] = await Promise.all([
          api('?published=true'),
          api('?type=topics').catch(() => []),
        ]);
        setItems(asArray(q).map((x: any) => ({ ...x, id: Number(x.id) })));
        setTopics(asArray(t).map((x: any) => ({ name_en: x.name_en || '', name_lu: x.name_lu || '' })));
      } catch (e: any) { setError(e?.message || 'Failed to load Q&A'); }
      finally { setLoading(false); }
    })();
  }, []);

  const topicNames = useMemo(() => {
    const fromTopics = topics.map(t => t.name_en).filter(Boolean);
    if (fromTopics.length) return fromTopics;
    return Array.from(new Set(items.map(i => i.topic))).filter(Boolean).sort();
  }, [topics, items]);

  const topicLabel = (name: string) => {
    if (lang === 'lu') {
      const t = topics.find(x => x.name_en === name);
      return (t?.name_lu || name);
    }
    return name;
  };

  const filtered = useMemo(() => items.filter(i => {
    if (topic !== 'All' && i.topic !== topic) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [i.question, i.question_lu, i.answer, i.answer_lu, i.topic].filter(Boolean).join(' ').toLowerCase().includes(q);
  }), [items, topic, query]);

  async function loadVerse(ref: string) {
    if (verseTexts[ref] || verseLoading[ref]) return;
    setVerseLoading(v => ({ ...v, [ref]: true }));
    try {
      const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
      const d = await r.json().catch(() => ({}));
      setVerseTexts(v => ({ ...v, [ref]: d?.text ? String(d.text).trim() : 'Verse text not found.' }));
    } catch {
      setVerseTexts(v => ({ ...v, [ref]: 'Could not load verse text.' }));
    } finally {
      setVerseLoading(v => ({ ...v, [ref]: false }));
    }
  }

  const showEn = lang === 'en' || lang === 'both';
  const showLu = lang === 'lu' || lang === 'both';

  return (
    <div className="min-h-screen bg-[#faf8f2] text-[#1a1a1a]">
      {/* Header — front colours */}
      <header className="bg-[#17372f] text-[#fdf6e3] sticky top-0 z-40 border-b-4 border-[#e9c981]">
        <p className="text-center text-[11px] tracking-[3px] text-[#e9c981] pt-2">SCRIPTURE · PRAYER · COMMUNITY</p>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold text-lg">
            <img src="/assets/PrayRead-logo.png" alt="Pray-Read Bible" width={42} height={42} className="object-contain rounded" />
            <span>Pray-Read <span className="text-[#e9c981]">Bible</span><span className="block text-[10px] tracking-[3px] text-[#e9c981] font-semibold">ENCOUNTER THE LIVING WORD</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold">
            <Link href="/" className="hover:text-[#e9c981]">Home</Link>
            <Link href="/bible" className="hover:text-[#e9c981]">Read Bible</Link>
            <Link href="/devotionals" className="hover:text-[#e9c981]">Devotionals</Link>
            <Link href="/verse-of-the-day" className="hover:text-[#e9c981]">Verse of the Day</Link>
            <Link href="/verse-songs" className="hover:text-[#e9c981]">Verse-Songs</Link>
            <Link href="/qa" className="text-[#e9c981] underline underline-offset-4">Q&amp;A</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block text-sm font-semibold hover:text-[#e9c981]">Log In</Link>
            <Link href="/signup" className="px-4 py-2 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundImage: "url(/assets/verse-songs-bg.jpg)", backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[#022c22]/80" />
        <div className="relative max-w-6xl mx-auto px-4 py-14 sm:py-20 text-center text-[#fdf6e3]">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#e9c981]/60 text-[#e9c981] text-xs font-bold tracking-wide">📖 Bible Questions &amp; Answers</span>
          <h1 className="text-4xl sm:text-6xl font-bold mt-5">Biblical <span className="text-[#e9c981] italic">Q&amp;A</span></h1>
          <p className="text-[#fdf6e3]/80 mt-4 max-w-2xl mx-auto">Clear, scripture-grounded answers to your Bible questions — click any verse reference to see the full text.</p>

          <div className="inline-flex gap-1 mt-8 p-1 rounded-full bg-black/50 border border-white/20">
            {([['en', 'GB English'], ['lu', 'UG Luganda'], ['both', '🌐 Both']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setLang(v)} className={`px-4 py-2 rounded-full text-sm font-bold transition ${lang === v ? 'bg-[#e9c981] text-[#1a1a1a]' : 'text-[#fdf6e3] hover:text-[#e9c981]'}`}>{label}</button>
            ))}
          </div>

          <div className="max-w-xl mx-auto mt-6">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search questions or topics…" className="w-full px-5 py-3.5 rounded-full bg-black/50 border border-white/20 text-[#fdf6e3] placeholder:text-[#fdf6e3]/50 outline-none focus:border-[#e9c981]" />
          </div>
        </div>
      </section>

      {/* Topic pills */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTopic('All')} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${topic === 'All' ? 'bg-[#e9c981] text-[#1a1a1a]' : 'bg-white border'}`}>All</button>
          {topicNames.map(n => (
            <button key={n} onClick={() => setTopic(n)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${topic === n ? 'bg-[#e9c981] text-[#1a1a1a]' : 'bg-white border'}`}>{topicLabel(n)}</button>
          ))}
        </div>
        <p className="text-xs text-[#1a1a1a]/50 mt-3">{loading ? 'Loading…' : `${filtered.length} question${filtered.length === 1 ? '' : 's'}`}{topic !== 'All' ? ` in “${topicLabel(topic)}”` : ''}</p>
      </div>

      {/* Questions */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-20">
        {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">❌ {error} <button onClick={() => window.location.reload()} className="ml-2 font-bold underline">Retry</button></div>}
        {loading ? <p className="text-center text-[#1a1a1a]/50 py-16">Loading questions…</p>
          : filtered.length === 0 ? (
            <div className="text-center py-16 text-[#1a1a1a]/50">
              <p className="text-5xl mb-4">📖</p>
              <p>No questions yet{topic !== 'All' ? ` in “${topicLabel(topic)}”` : ''}.</p>
              <p className="text-sm mt-1">New questions appear here once they are published from the Admin Panel.</p>
            </div>
          ) : (
            <div className="grid gap-4">{filtered.map(q => {
              const open = openId === q.id;
              const refs = refsOf(q.scripture_refs);
              return (
                <article key={q.id} className="bg-white border border-[#1a1a1a]/10 rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenId(open ? null : q.id)} className="w-full text-left px-5 py-4 flex items-start justify-between gap-4">
                    <span>
                      <span className="inline-block px-3 py-1 rounded-full bg-[#1d4035] text-[#fdf6e3] text-xs font-bold mb-2">{topicLabel(q.topic)}</span>
                      {showEn && <span className="block font-bold">{q.question}</span>}
                      {showLu && q.question_lu && <span className={`block ${showEn ? 'text-sm text-[#1a1a1a]/60 mt-1' : 'font-bold'}`}>{q.question_lu}</span>}
                    </span>
                    <span className="text-[#a9852e] font-bold text-xl shrink-0">{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <div className="px-5 pb-5 border-t border-[#1a1a1a]/10 pt-4">
                      {showEn && <p className="whitespace-pre-line text-[#1a1a1a]/80">{q.answer}</p>}
                      {showLu && q.answer_lu && <p className={`whitespace-pre-line text-[#1a1a1a]/70 ${showEn ? 'mt-4 pt-4 border-t border-dashed' : ''}`}>{q.answer_lu}</p>}
                      {refs.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-bold tracking-wide text-[#a9852e] uppercase mb-2">Scripture</p>
                          <div className="flex flex-wrap gap-2">
                            {refs.map(r => (
                              <button key={r} onClick={() => loadVerse(r)} className="px-3 py-1.5 rounded-full bg-[#faf8f2] border border-[#a9852e]/40 text-xs font-bold hover:bg-[#e9c981] hover:text-[#1a1a1a] transition">{r}</button>
                            ))}
                          </div>
                          {refs.map(r => verseTexts[r] ? (
                            <p key={r} className="mt-3 px-4 py-3 rounded-xl bg-[#faf8f2] border text-sm"><span className="font-bold text-[#1d4035]">{r} — </span><span className="italic">“{verseTexts[r]}”</span></p>
                          ) : verseLoading[r] ? <p key={r} className="mt-3 text-xs text-[#1a1a1a]/50">Loading {r}…</p> : null)}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}</div>
          )}
      </main>
    </div>
  );
}
