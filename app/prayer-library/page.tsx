 'use client';
import { useState, useEffect } from 'react';
import PrayerContent from '@/components/PrayerContent';
import AppNavbar from '@/app/components/AppNavbar';
import AppFooter from '@/app/components/AppFooter';

const CATS = [
  { slug: 'all', label: 'All Prayers' },
  { slug: 'morning', label: 'Morning Prayers' },
  { slug: 'evening', label: 'Evening Prayers' },
  { slug: 'healing', label: 'Healing' },
  { slug: 'thanksgiving', label: 'Thanksgiving' },
  { slug: 'repentance', label: 'Repentance' },
  { slug: 'intercession', label: 'Intercession' },
  { slug: 'family', label: 'Family' },
  { slug: 'children', label: 'Children' },
  { slug: 'marriage', label: 'Marriage' },
  { slug: 'work', label: 'Work & Business' },
  { slug: 'finances', label: 'Finances' },
  { slug: 'protection', label: 'Protection' },
  { slug: 'guidance', label: 'Guidance & Wisdom' },
  { slug: 'peace', label: 'Peace & Anxiety' },
  { slug: 'faith', label: 'Faith & Trust' },
  { slug: 'worship', label: 'Worship & Praise' },
  { slug: 'deliverance', label: 'Deliverance' },
  { slug: 'uganda', label: 'Uganda & Nations' },
  { slug: 'church', label: 'Church & Ministry' },
  { slug: 'seasonal', label: 'Seasonal & Special' },
];
type Prayer = { id: string; title: string; category: string; english_text: string; luganda_text: string; scripture_refs: string; is_published: boolean };
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
  const filtered = prayers.filter((p) => {
    const okCat = cat === 'all' || p.category === cat;
    const s = q.toLowerCase();
    return okCat && (!s || p.title.toLowerCase().includes(s) || p.english_text.toLowerCase().includes(s) || p.luganda_text.toLowerCase().includes(s));
  });
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <h1 className="text-4xl font-bold text-gray-900">🙏 Prayer Library</h1>
        <p className="text-gray-600 mt-2 mb-6">Scripture-based prayers. Click any Bible reference to read the verse. {prayers.length} prayers.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prayers..." className="flex-1 min-w-[220px] px-3 py-2 border rounded-lg bg-white" />
          <div className="flex bg-white border rounded-lg overflow-hidden">
            <button onClick={() => setLang('english')} className={`px-4 py-2 text-sm font-semibold ${lang === 'english' ? 'bg-amber-600 text-white' : ''}`}>English</button>
            <button onClick={() => setLang('luganda')} className={`px-4 py-2 text-sm font-semibold ${lang === 'luganda' ? 'bg-amber-600 text-white' : ''}`}>Luganda</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">{CATS.map((c) => (<button key={c.slug} onClick={() => setCat(c.slug)} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${cat === c.slug ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-700'}`}>{c.label}</button>))}</div>
        {loading ? <p className="text-center py-12 text-gray-500">Loading prayers...</p> : filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-10 text-center"><p className="text-2xl mb-2">🙏</p><p className="font-semibold">No prayers yet in this category.</p><p className="text-sm text-gray-500 mt-1">Add one in Admin Panel → 🙏 Prayer Library, then Export → paste into data/prayer-library.json</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((p) => {
            const open = openId === p.id;
            const text = lang === 'english' ? p.english_text : (p.luganda_text || p.english_text);
            return (
              <div key={p.id} className="bg-white rounded-lg shadow p-5 flex flex-col">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">{CATS.find((c) => c.slug === p.category)?.label || p.category}</span>
                <h3 className="font-bold text-lg mt-1 mb-2">{p.title}</h3>
                <div className="text-sm text-gray-700 flex-1">{open ? <PrayerContent content={text} /> : <PrayerContent content={text.slice(0, 220) + (text.length > 220 ? '...' : '')} />}</div>
                {p.scripture_refs && <p className="text-xs text-blue-700 mt-3">📖 {p.scripture_refs}</p>}
                <button onClick={() => setOpenId(open ? null : p.id)} className="mt-4 text-sm font-semibold text-amber-700 hover:underline text-left">{open ? 'Show less ↑' : 'Read full prayer →'}</button>
              </div>
            );
          })}</div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
