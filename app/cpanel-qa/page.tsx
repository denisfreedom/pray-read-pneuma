// app/cpanel-qa/page.tsx — Bible Q&A Management (ADMIN)
// Same layout as your screenshot: Questions / Topics tabs, New Q&A / New Topic,
// topic table (English Name / Luganda Name / Actions), topic filter pills.
// Colours moved to front colours: emerald #17372f header, gold #e9c981
// buttons, cream #faf8f2 page. NO icon library.
// Talks to the SAME route file the fixed route.ts was pasted into:
// it tries /api/bible-qa first, then /api/qa (whichever exists in your repo).
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const ENDPOINTS = ['/api/bible-qa', '/api/qa'];
async function api(path: string, init?: RequestInit) {
  let lastErr: any = null;
  for (const base of ENDPOINTS) {
    try {
      const res = await fetch(base + path, init);
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
      return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Q&A API not found');
}
const asArray = (d: any): any[] => Array.isArray(d) ? d : Array.isArray(d?.questions) ? d.questions : Array.isArray(d?.data) ? d.data : Array.isArray(d?.rows) ? d.rows : [];
const refsOf = (v: any): string[] => Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : [];

interface Topic { id: number; name_en: string; name_lu?: string | null; }
interface QA { id: number; topic: string; question: string; question_lu?: string | null; answer: string; answer_lu?: string | null; scripture_refs?: any; is_published?: boolean; }

const emptyForm = { topic: '', question: '', question_lu: '', answer: '', answer_lu: '', refs: '', is_published: true };

export default function CpanelQA() {
  const [tab, setTab] = useState<'questions' | 'topics'>('questions');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [items, setItems] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [topicForm, setTopicForm] = useState({ name_en: '', name_lu: '' });
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [t, q] = await Promise.all([api('?type=topics'), api('')]);
      const ts = asArray(t).map((x: any) => ({ id: Number(x.id), name_en: x.name_en || '', name_lu: x.name_lu || '' }));
      setTopics(ts);
      setItems(asArray(q).map((x: any) => ({ ...x, id: Number(x.id) })));
    } catch (e: any) {
      setError(e?.message || 'Failed to load Q&A entries');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => topicFilter === 'All' ? items : items.filter(i => i.topic === topicFilter), [items, topicFilter]);
  const topicNames = useMemo(() => topics.map(t => t.name_en), [topics]);

  async function saveQA(e: React.FormEvent) {
    e.preventDefault();
    if (!form.topic || !form.question.trim() || !form.answer.trim()) { setError('Topic, question and answer are required.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = { ...form, topic: form.topic, scripture_refs: refsOf(form.refs) };
      if (editingId) await api('', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: editingId }) });
      else await api('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setNotice(editingId ? 'Q&A updated.' : 'Q&A created.');
      setForm(emptyForm); setEditingId(null); setShowForm(false);
      await load();
    } catch (e: any) { setError(e?.message || 'Failed to save Q&A'); }
    finally { setSaving(false); }
  }

  async function saveTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicForm.name_en.trim()) { setError('Topic English name is required.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      if (editingTopicId) await api('', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'topic', id: editingTopicId, ...topicForm }) });
      else await api('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'topic', ...topicForm }) });
      setNotice(editingTopicId ? 'Topic updated.' : 'Topic created.');
      setTopicForm({ name_en: '', name_lu: '' }); setEditingTopicId(null); setShowTopicForm(false);
      await load();
    } catch (e: any) { setError(e?.message || 'Failed to save topic'); }
    finally { setSaving(false); }
  }

  async function delQA(id: number) {
    if (!confirm('Delete this Q&A?')) return;
    try { await api(`?id=${id}`, { method: 'DELETE' }); setNotice('Q&A deleted.'); await load(); }
    catch (e: any) { setError(e?.message || 'Failed to delete'); }
  }
  async function delTopic(id: number) {
    if (!confirm('Delete this topic? Questions using it will keep its name.')) return;
    try { await api(`?type=topic&topicId=${id}`, { method: 'DELETE' }); setNotice('Topic deleted.'); await load(); }
    catch (e: any) { setError(e?.message || 'Failed to delete topic'); }
  }
  async function togglePublish(q: QA) {
    try {
      await api('', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...q, scripture_refs: refsOf(q.scripture_refs), is_published: !q.is_published }) });
      await load();
    } catch (e: any) { setError(e?.message || 'Failed to update'); }
  }

  function startEdit(q: QA) {
    setForm({ topic: q.topic, question: q.question, question_lu: q.question_lu || '', answer: q.answer, answer_lu: q.answer_lu || '', refs: refsOf(q.scripture_refs).join(', '), is_published: q.is_published !== false });
    setEditingId(q.id); setShowForm(true); setTab('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-[#faf8f2] text-[#1a1a1a]">
      {/* Admin header — front colours */}
      <header className="bg-[#17372f] text-[#fdf6e3] border-b-4 border-[#e9c981]">
        <p className="text-center text-[11px] tracking-[3px] text-[#e9c981] pt-2">SCRIPTURE · PRAYER · COMMUNITY</p>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold text-lg">
            <img src="/assets/PrayRead-logo.png" alt="Pray-Read Bible" width={40} height={40} className="object-contain rounded" />
            <span>Pray-Read Bible <span className="block text-[10px] tracking-[3px] text-[#e9c981]">READ · PRAY · GROW</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <Link href="/" className="hover:text-[#e9c981]">Home</Link>
            <Link href="/about" className="hover:text-[#e9c981]">About Us</Link>
            <Link href="/admin-panel" className="text-[#e9c981] underline underline-offset-4">Admin Panel</Link>
            <Link href="/admin-panel/settings" className="hover:text-[#e9c981]">Settings</Link>
          </nav>
          <Link href="/login" className="px-4 py-2 rounded-full bg-black/60 text-[#fdf6e3] text-sm font-bold">Logout</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bible Q&amp;A Management</h1>
            <p className="text-[#1a1a1a]/60 mt-1">Create bilingual questions with formatted answers and scripture references</p>
          </div>
          <div className="flex gap-2">
            <Link href="/qa" className="px-4 py-2.5 rounded-full border border-[#1a1a1a]/20 bg-white text-sm font-semibold hover:border-[#a9852e]">👁 View Frontend</Link>
            {tab === 'questions'
              ? <button onClick={() => { setShowForm(v => !v); setEditingId(null); setForm(emptyForm); }} className="px-4 py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold shadow hover:scale-105 transition">+ New Q&amp;A</button>
              : <button onClick={() => { setShowTopicForm(v => !v); setEditingTopicId(null); setTopicForm({ name_en: '', name_lu: '' }); }} className="px-4 py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold shadow hover:scale-105 transition">+ New Topic</button>}
          </div>
        </div>

        <div className="inline-flex gap-1 mt-6 p-1 rounded-full border border-[#1a1a1a]/10 bg-white">
          <button onClick={() => setTab('questions')} className={`px-5 py-2 rounded-full text-sm font-bold ${tab === 'questions' ? 'bg-[#e9c981] text-[#1a1a1a]' : 'text-[#1a1a1a]/60'}`}>❓ Questions</button>
          <button onClick={() => setTab('topics')} className={`px-5 py-2 rounded-full text-sm font-bold ${tab === 'topics' ? 'bg-[#e9c981] text-[#1a1a1a]' : 'text-[#1a1a1a]/60'}`}>🏷 Topics</button>
        </div>

        {error && <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">❌ {error} <button onClick={load} className="ml-2 font-bold underline">Retry</button></div>}
        {notice && <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">✓ {notice}</div>}

        {tab === 'questions' && (
          <>
            {showForm && (
              <form onSubmit={saveQA} className="mt-6 bg-white border border-[#1a1a1a]/10 rounded-2xl p-5 grid gap-4">
                <h2 className="font-bold text-lg">{editingId ? 'Edit Q&A' : 'New Q&A'}</h2>
                <label className="grid gap-1 text-sm font-semibold">Topic *
                  <select value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className="border rounded-xl px-3 py-2.5 font-normal">
                    <option value="">Select a topic…</option>
                    {topicNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {topicNames.length === 0 && <span className="text-xs font-normal text-[#a9852e]">No topics yet — create one on the Topics tab first.</span>}
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="grid gap-1 text-sm font-semibold">Question (English) *
                    <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className="border rounded-xl px-3 py-2.5 font-normal" placeholder="e.g. What does John 3:16 teach us?" />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Question (Luganda)
                    <input value={form.question_lu} onChange={e => setForm({ ...form, question_lu: e.target.value })} className="border rounded-xl px-3 py-2.5 font-normal" placeholder="Ekibuuzo mu Luganda" />
                  </label>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="grid gap-1 text-sm font-semibold">Answer (English) *
                    <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} rows={6} className="border rounded-xl px-3 py-2.5 font-normal" />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Answer (Luganda)
                    <textarea value={form.answer_lu} onChange={e => setForm({ ...form, answer_lu: e.target.value })} rows={6} className="border rounded-xl px-3 py-2.5 font-normal" />
                  </label>
                </div>
                <label className="grid gap-1 text-sm font-semibold">Scripture references (comma-separated)
                  <input value={form.refs} onChange={e => setForm({ ...form, refs: e.target.value })} className="border rounded-xl px-3 py-2.5 font-normal" placeholder="John 3:16, Romans 8:28" />
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4 accent-[#1d4035]" />
                  Published (visible on the frontend)
                </label>
                <div className="flex gap-2">
                  <button disabled={saving} className="px-5 py-2.5 rounded-full bg-[#1d4035] text-white text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Update Q&A' : 'Save Q&A'}</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="px-5 py-2.5 rounded-full border text-sm font-semibold">Cancel</button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap gap-2 mt-6">
              <button onClick={() => setTopicFilter('All')} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${topicFilter === 'All' ? 'bg-[#e9c981] text-[#1a1a1a]' : 'bg-white border'}`}>All</button>
              {topicNames.map(n => (
                <button key={n} onClick={() => setTopicFilter(n)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${topicFilter === n ? 'bg-[#e9c981] text-[#1a1a1a]' : 'bg-white border'}`}>{n}</button>
              ))}
            </div>

            {loading ? <p className="mt-8 text-center text-[#1a1a1a]/50">Loading…</p>
              : filtered.length === 0 ? <p className="mt-8 text-center text-[#1a1a1a]/50">No questions yet{topicFilter !== 'All' ? ` in “${topicFilter}”` : ''}. Click “+ New Q&A” to add the first one.</p>
              : <div className="grid gap-4 mt-6">{filtered.map(q => (
                <article key={q.id} className="bg-white border border-[#1a1a1a]/10 rounded-2xl p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#1d4035] text-[#fdf6e3] text-xs font-bold">{q.topic}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${q.is_published !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{q.is_published !== false ? 'Published' : 'Draft'}</span>
                    {refsOf(q.scripture_refs).map(r => <span key={r} className="px-3 py-1 rounded-full bg-[#faf8f2] border text-xs font-semibold">{r}</span>)}
                  </div>
                  <h3 className="font-bold mt-3">{q.question}</h3>
                  {q.question_lu && <p className="text-sm text-[#1a1a1a]/60 mt-1">{q.question_lu}</p>}
                  <p className="text-sm text-[#1a1a1a]/70 mt-2 line-clamp-3 whitespace-pre-line">{q.answer}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => startEdit(q)} className="px-4 py-1.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-xs font-bold">Edit</button>
                    <button onClick={() => togglePublish(q)} className="px-4 py-1.5 rounded-full border text-xs font-bold">{q.is_published !== false ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => delQA(q.id)} className="px-4 py-1.5 rounded-full border border-red-300 text-red-600 text-xs font-bold">Delete</button>
                  </div>
                </article>
              ))}</div>}
          </>
        )}

        {tab === 'topics' && (
          <>
            {showTopicForm && (
              <form onSubmit={saveTopic} className="mt-6 bg-white border border-[#1a1a1a]/10 rounded-2xl p-5 grid gap-4">
                <h2 className="font-bold text-lg">{editingTopicId ? 'Edit Topic' : 'New Topic'}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="grid gap-1 text-sm font-semibold">English Name *
                    <input value={topicForm.name_en} onChange={e => setTopicForm({ ...topicForm, name_en: e.target.value })} className="border rounded-xl px-3 py-2.5 font-normal" placeholder="e.g. Salvation" />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Luganda Name
                    <input value={topicForm.name_lu} onChange={e => setTopicForm({ ...topicForm, name_lu: e.target.value })} className="border rounded-xl px-3 py-2.5 font-normal" placeholder="e.g. Obulokozi" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button disabled={saving} className="px-5 py-2.5 rounded-full bg-[#1d4035] text-white text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : editingTopicId ? 'Update Topic' : 'Save Topic'}</button>
                  <button type="button" onClick={() => { setShowTopicForm(false); setEditingTopicId(null); setTopicForm({ name_en: '', name_lu: '' }); }} className="px-5 py-2.5 rounded-full border text-sm font-semibold">Cancel</button>
                </div>
              </form>
            )}
            <div className="mt-6 bg-white border border-[#1a1a1a]/10 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 font-bold text-sm border-b bg-[#faf8f2]">
                <span>English Name</span><span>Luganda Name</span><span>Actions</span>
              </div>
              {loading ? <p className="px-5 py-8 text-center text-[#1a1a1a]/50">Loading…</p>
                : topics.length === 0 ? <p className="px-5 py-8 text-center text-[#1a1a1a]/50">No topics yet</p>
                : topics.map(t => (
                  <div key={t.id} className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 border-b last:border-0 items-center text-sm">
                    <span className="font-semibold">{t.name_en}</span>
                    <span className="text-[#1a1a1a]/60">{t.name_lu || '—'}</span>
                    <span className="flex gap-2">
                      <button onClick={() => { setTopicForm({ name_en: t.name_en, name_lu: t.name_lu || '' }); setEditingTopicId(t.id); setShowTopicForm(true); }} className="px-3 py-1 rounded-full bg-[#e9c981] text-[#1a1a1a] text-xs font-bold">Edit</button>
                      <button onClick={() => delTopic(t.id)} className="px-3 py-1 rounded-full border border-red-300 text-red-600 text-xs font-bold">Delete</button>
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
