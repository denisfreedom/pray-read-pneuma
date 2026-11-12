// app/devotional-plans/page.tsx — FIXED: reader page now reads from /api/devotional-entries
// (the same table the admin writes to). Before, it read from devotional_plans,
// which is empty, so it always said "No devotional plans available yet."
// Keeps the design from the screenshot: purple-pink hero, Explore + Calendar View,
// Devotional Plans list, Read / Reflect / Keep going cards. Adds: reader modal,
// EN/LU toggle, Mark complete -> streak in localStorage.
'use client';
import { useEffect, useMemo, useState } from 'react';

type Entry = any;

export default function DevotionalPlansPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [open, setOpen] = useState<Entry | null>(null);
  const [lang, setLang] = useState<'en' | 'lu'>('en');
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem('pr_done_devotionals') || '[]')); } catch {}
    fetch('/api/devotional-entries').then(r => r.json()).then(j => setEntries(Array.isArray(j) ? j : [])).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e: any) => (`${e.devotional_number} ${e.title} ${e.scripture_book}`.toLowerCase().includes(q)));
  }, [entries, search]);

  function toggleDone(num: string) {
    setDone(prev => {
      const next = prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num];
      try { localStorage.setItem('pr_done_devotionals', JSON.stringify(next)); } catch {}
      return next;
    });
  }
  const strip = (html: string) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <div style={{ background: '#fffdf5', minHeight: '100vh' }}>
      {/* Hero — same as screenshot */}
      <div style={{ background: 'linear-gradient(100deg,#6d28d9,#a21caf 55%,#f43f5e)', padding: '48px 20px 56px', textAlign: 'center', color: '#fff' }}>
        <p style={{ maxWidth: 640, margin: '0 auto', fontSize: 20, lineHeight: 1.5 }}>Short, rich devotionals to deepen your faith — in English and Luganda, with Scripture, further readings, and a streak to keep you going.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          <button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} style={{ border: 'none', cursor: 'pointer', padding: '14px 26px', borderRadius: 999, fontWeight: 800, fontSize: 16, background: 'linear-gradient(90deg,#facc15,#f43f5e)', color: '#fff' }}>Explore Devotionals →</button>
          <button onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} style={{ cursor: 'pointer', padding: '14px 26px', borderRadius: 999, fontWeight: 700, fontSize: 16, background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)' }}>📅 {view === 'calendar' ? 'List View' : 'Calendar View'}</button>
        </div>
        {done.length > 0 && <p style={{ marginTop: 14, opacity: 0.95 }}>🔥 Your streak: {done.length} devotional{done.length === 1 ? '' : 's'} completed</p>}
      </div>

      <div id="plans" style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>Devotional Plans</h2>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title / number..." style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #e5e7eb', minWidth: 240 }} />
        </div>

        {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading devotionals…</p> : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 20, padding: 36, textAlign: 'center', color: '#6b7280', marginTop: 18 }}>
            {entries.length === 0 ? 'No devotionals yet. Check back soon.' : 'No devotionals match your search.'}
          </div>
        ) : view === 'calendar' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginTop: 18 }}>
            {filtered.map((e: any) => (
              <button key={e.id} onClick={() => { setOpen(e); setLang('en'); }} style={{ textAlign: 'left', cursor: 'pointer', background: done.includes(String(e.devotional_number)) ? '#dcfce7' : '#fff', border: '1px solid #eee', borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800, color: '#7c3aed' }}>#{String(e.devotional_number).padStart(3, '0')} {done.includes(String(e.devotional_number)) ? '✓' : ''}</div>
                <div style={{ fontWeight: 700, marginTop: 6, fontSize: 14 }}>{e.title}</div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            {filtered.map((e: any) => (
              <div key={e.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 16, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 800, fontSize: 13, padding: '4px 10px', borderRadius: 999 }}>#{String(e.devotional_number).padStart(3, '0')}</span>{done.includes(String(e.devotional_number)) && <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>✓ Completed</span>}</div>
                  <h3 style={{ margin: '8px 0 2px', fontSize: 18 }}>{e.title}</h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse} · {e.devotional_text_lu ? 'English + Luganda' : 'English'} · {strip(e.devotional_text).slice(0, 110)}…</p>
                </div>
                <button onClick={() => { setOpen(e); setLang('en'); }} style={{ flexShrink: 0, cursor: 'pointer', border: '1px solid #7c3aed', color: '#7c3aed', background: '#fff', borderRadius: 999, padding: '8px 16px', fontWeight: 700 }}>Read →</button>
              </div>
            ))}
          </div>
        )}

        {/* Read / Reflect / Keep going — same as screenshot */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 32 }}>
          {[{ i: '📖', t: 'Read', d: 'Scripture first — every devotional starts with the Word.' }, { i: '❤️', t: 'Reflect', d: 'A short, honest message for real life.' }, { i: '🔥', t: 'Keep going', d: 'Mark it complete and build your streak.' }].map(c => (
            <div key={c.t} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 16, padding: 22 }}><div style={{ fontSize: 26 }}>{c.i}</div><h3 style={{ margin: '10px 0 4px' }}>{c.t}</h3><p style={{ color: '#6b7280', margin: 0 }}>{c.d}</p></div>
          ))}
        </div>
      </div>

      {/* Reader modal */}
      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 760, width: '100%', padding: 24, margin: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 800, fontSize: 13, padding: '4px 10px', borderRadius: 999 }}>#{String(open.devotional_number).padStart(3, '0')}</span><button onClick={() => setOpen(null)} style={{ border: 'none', background: '#f3f4f6', borderRadius: 999, width: 32, height: 32, cursor: 'pointer' }}>✕</button></div>
            <h2 style={{ fontSize: 24, margin: '14px 0 4px' }}>{open.title}</h2>
            <p style={{ color: '#6b7280', marginTop: 0 }}>{open.scripture_book} {open.scripture_chapter}:{open.scripture_verse}{open.author ? ` · By ${open.author}` : ''}</p>
            {open.scripture_quotation && <div style={{ background: '#f5f3ff', borderLeft: '4px solid #7c3aed', padding: '12px 14px', borderRadius: 8, marginBottom: 14 }} dangerouslySetInnerHTML={{ __html: String(open.scripture_quotation) }} />}
            {open.devotional_text_lu && <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><button onClick={() => setLang('en')} style={{ padding: '6px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid #7c3aed', background: lang === 'en' ? '#7c3aed' : '#fff', color: lang === 'en' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🇬🇧 English</button><button onClick={() => setLang('lu')} style={{ padding: '6px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid #7c3aed', background: lang === 'lu' ? '#7c3aed' : '#fff', color: lang === 'lu' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🇺🇬 Luganda</button></div>}
            <div dangerouslySetInnerHTML={{ __html: String(lang === 'lu' && open.devotional_text_lu ? open.devotional_text_lu : open.devotional_text) }} />
            {open.further_readings && <p style={{ color: '#6b7280', marginTop: 18 }}><strong>Further readings:</strong> {strip(String(open.further_readings))}</p>}
            <button onClick={() => toggleDone(String(open.devotional_number))} style={{ width: '100%', marginTop: 16, padding: 13, borderRadius: 10, border: 'none', cursor: 'pointer', background: done.includes(String(open.devotional_number)) ? '#dcfce7' : '#7c3aed', color: done.includes(String(open.devotional_number)) ? '#166534' : '#fff', fontWeight: 800 }}>{done.includes(String(open.devotional_number)) ? '✓ Completed — tap to unmark' : '✓ Mark complete'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
