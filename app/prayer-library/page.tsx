 'use client';
import { useState, useEffect, useMemo } from 'react';
import AppNavbar from '@/app/components/AppNavbar';
import AppFooter from '@/app/components/AppFooter';

const CATS = [
  { slug: 'all', label: 'All Prayers', icon: '✨' },
  { slug: 'morning', label: 'Morning Prayers', icon: '🌅' },
  { slug: 'evening', label: 'Evening Prayers', icon: '🌙' },
  { slug: 'healing', label: 'Healing', icon: '💚' },
  { slug: 'thanksgiving', label: 'Thanksgiving', icon: '🙌' },
  { slug: 'repentance', label: 'Repentance', icon: '💧' },
  { slug: 'intercession', label: 'Intercession', icon: '🤲' },
  { slug: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { slug: 'children', label: 'Children', icon: '👶' },
  { slug: 'marriage', label: 'Marriage', icon: '💍' },
  { slug: 'work', label: 'Work & Business', icon: '💼' },
  { slug: 'finances', label: 'Finances', icon: '💰' },
  { slug: 'protection', label: 'Protection', icon: '🛡️' },
  { slug: 'guidance', label: 'Guidance & Wisdom', icon: '🧭' },
  { slug: 'peace', label: 'Peace & Anxiety', icon: '🕊️' },
  { slug: 'faith', label: 'Faith & Trust', icon: '✝️' },
  { slug: 'worship', label: 'Worship & Praise', icon: '🎶' },
  { slug: 'deliverance', label: 'Deliverance', icon: '🔥' },
  { slug: 'uganda', label: 'Uganda & Nations', icon: '🇺🇬' },
  { slug: 'church', label: 'Church & Ministry', icon: '⛪' },
  { slug: 'seasonal', label: 'Seasonal & Special', icon: '🎄' },
];
type Prayer = { id: string; title: string; category: string; english_text: string; luganda_text: string; scripture_refs: string; is_published: boolean };

function renderText(text: string) {
  const parts = text.split(/((?:[1-3]\s)?[A-Z][a-z]+\s\d+:\d+(?:-\d+)?)/g);
  return parts.map((part, i) => {
    if (/^(?:[1-3]\s)?[A-Z][a-z]+\s\d+:\d+/.test(part)) {
      return <a key={i} href={`/bible-reader?ref=${encodeURIComponent(part)}`} className="text-amber-700 underline decoration-amber-300 underline-offset-2 font-semibold hover:text-amber-800">{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PrayerLibraryPage() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [lang, setLang] = useState<'english' | 'luganda'>('english');
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/prayer-library');
        if (res.ok) { const d = await res.json(); const list = Array.isArray(d) ? d : d.prayers || []; setPrayers(list.filter((p: Prayer) => p.is_published !== false)); }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    prayers.forEach((p) => { m[p.category] = (m[p.category] || 0) + 1; });
    return m;
  }, [prayers]);
  const filtered = prayers.filter((p) => {
    const okCat = cat === 'all' || p.category === cat;
    const s = q.toLowerCase();
    return okCat && (!s || p.title.toLowerCase().includes(s) || p.english_text.toLowerCase().includes(s) || (p.luganda_text || '').toLowerCase().includes(s));
  });
  const activeCat = CATS.find((c) => c.slug === cat);
  return (
    <div className="min-h-screen bg-[#f8f5ef]">
      <AppNavbar />
      {/* HERO */}
      <section className="pt-28 pb-10 px-4 bg-gradient-to-b from-[#0f2340] via-[#162f52] to-[#1e3a5f] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #d4af37 0, transparent 30%), radial-gradient(circle at 85% 30%, #d4af37 0, transparent 25%)' }} />
        <div className="max-w-6xl mx-auto relative">
          <p className="text-[#d4af37] tracking-[0.25em] text-xs font-bold uppercase mb-3">✦ Pray • Read • Encounter ✦</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">Prayer Library</h1>
          <p className="text-white/80 mt-3 max-w-2xl text-[15px] leading-relaxed">Scripture-based prayers for every season of life — morning and evening, healing and thanksgiving, family, work, and the nation. Click any Bible reference to read the verse.</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <span className="bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm">📖 {prayers.length} prayers</span>
            <span className="bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm">🗂️ 20 categories</span>
            <span className="bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm">🌍 English • Luganda</span>
          </div>
          {/* SEARCH */}
          <div className="mt-7 bg-white rounded-2xl shadow-xl p-2 flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 px-3"><span className="text-lg">🔍</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prayers — e.g. healing, morning, family..." className="w-full py-3 outline-none text-gray-900 text-[15px] placeholder:text-gray-400" /></div>
            <div className="flex bg-[#f1ead8] rounded-xl p-1">
              <button onClick={() => setLang('english')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition ${lang === 'english' ? 'bg-[#0f2340] text-white shadow' : 'text-gray-700'}`}>English</button>
              <button onClick={() => setLang('luganda')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition ${lang === 'luganda' ? 'bg-[#0f2340] text-white shadow' : 'text-gray-700'}`}>Luganda</button>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-6xl mx-auto px-4 -mt-1 pt-6 pb-2">
        <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-3">Browse by category</p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{CATS.map((c) => {
          const active = cat === c.slug;
          const n = c.slug === 'all' ? prayers.length : (counts[c.slug] || 0);
          return <button key={c.slug} onClick={() => setCat(c.slug)} className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition ${active ? 'bg-[#0f2340] text-white border-[#0f2340] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:shadow-sm'}`}><span>{c.icon}</span>{c.label}<span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{n}</span></button>;
        })}</div>
      </section>

      {/* RESULTS */}
      <main className="max-w-6xl mx-auto px-4 pb-16 pt-4">
        <div className="flex items-end justify-between mb-5">
          <div><h2 className="text-xl font-serif font-bold text-gray-900">{activeCat?.icon} {activeCat?.label}</h2><p className="text-sm text-gray-500">{filtered.length} prayer{filtered.length === 1 ? '' : 's'} {q ? `for “${q}”` : ''}</p></div>
          {filtered.length > 0 && <span className="hidden md:block text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">Click a reference to open the verse →</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="bg-white rounded-2xl p-6 animate-pulse"><div className="h-3 w-24 bg-gray-100 rounded mb-3" /><div className="h-5 w-3/4 bg-gray-100 rounded mb-3" /><div className="h-3 w-full bg-gray-50 rounded mb-2" /><div className="h-3 w-5/6 bg-gray-50 rounded" /></div>)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-amber-100 shadow-sm px-6 py-14 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#fdf6e3] flex items-center justify-center text-3xl mb-4">🙏</div>
            <h3 className="font-serif font-bold text-xl text-gray-900">No prayers yet in this category</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">This category is waiting for its first prayer. Add one in Admin Panel → Prayer Library, then Export → paste into <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">data/prayer-library.json</code></p>
            <a href="/admin_panel" className="inline-block mt-5 bg-[#0f2340] text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-[#1a365d]">Go to Admin Panel →</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map((p) => {
            const open = openId === p.id;
            const text = lang === 'english' ? p.english_text : (p.luganda_text || p.english_text);
            const shown = open ? text : text.slice(0, 240) + (text.length > 240 ? '…' : '');
            const catInfo = CATS.find((c) => c.slug === p.category);
            return (
              <article key={p.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition overflow-hidden flex flex-col">
                <div className="h-1 bg-gradient-to-r from-[#d4af37] via-[#f0d98c] to-[#0f2340]" />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">{catInfo?.icon} {catInfo?.label || p.category}</span><span className="text-gray-300 text-lg">✦</span></div>
                  <h3 className="font-serif font-bold text-[19px] leading-snug text-gray-900 group-hover:text-[#0f2340]">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 mt-3 flex-1 whitespace-pre-wrap font-serif">{renderText(shown)}</p>
                  {p.scripture_refs && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-500"><span className="font-bold text-gray-700">📖 Scripture:</span> <span className="text-blue-700 font-medium">{p.scripture_refs}</span></p></div>}
                  <button onClick={() => setOpenId(open ? null : p.id)} className="mt-4 self-start inline-flex items-center gap-1.5 text-sm font-bold text-[#0f2340] hover:text-amber-700">{open ? 'Show less ↑' : 'Read full prayer'} <span className="text-amber-600">→</span></button>
                </div>
              </article>
            );
          })}</div>
        )}

        {/* BOTTOM CTA */}
        <div className="mt-12 rounded-3xl bg-[#0f2340] text-white p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 90% 0%, #d4af37 0, transparent 35%)' }} />
          <div className="relative"><h3 className="font-serif font-bold text-2xl">Need a prayer for today?</h3><p className="text-white/75 text-sm mt-1 max-w-md">Start with Morning Prayers, or find peace in Peace &amp; Anxiety. Every prayer is rooted in Scripture.</p></div>
          <div className="relative flex gap-3"><button onClick={() => { setCat('morning'); window.scrollTo({ top: 380, behavior: 'smooth' }); }} className="bg-[#d4af37] text-[#0f2340] font-bold text-sm px-5 py-3 rounded-full hover:bg-[#e6c85a]">🌅 Morning Prayers</button><button onClick={() => { setCat('peace'); window.scrollTo({ top: 380, behavior: 'smooth' }); }} className="bg-white/10 border border-white/20 font-bold text-sm px-5 py-3 rounded-full hover:bg-white/20">🕊️ Find Peace</button></div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
