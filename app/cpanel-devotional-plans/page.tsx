"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Plus, X, Clock, Calendar, Image as ImageIcon, Book, ChevronDown, ChevronUp, Upload, Download, FileJson, CheckCircle2, AlertTriangle, Search, Sparkles, Languages, Trash } from 'lucide-react';

/* ================= Types ================= */
interface Book { id: number; name_english: string; name_luganda: string; }
interface DevotionalPlan { id: number; title: string; description: string; thumbnail_url: string; devotional_text?: string; schedule_type: string; schedule_time: string; is_active: boolean; created_at: string; }
interface EntryRow {
  scheduled_date: string; title: string;
  devotional_text: string; devotional_text_lu: string;
  scripture_book: string; scripture_chapter: string; scripture_verse: string;
  scripture_quotation: string; further_readings: string; author: string; cover_photo_url: string;
  related_scriptures: string; // JSON text in the form, e.g. [{"book":"John","chapter":3,"verse":16,"text":"..."}]
}
type Tab = 'plans' | 'manual' | 'bulk';
type BulkMode = 'skip' | 'replace';

const EMPTY_ENTRY: EntryRow = { scheduled_date: '', title: '', devotional_text: '', devotional_text_lu: '', scripture_book: '', scripture_chapter: '', scripture_verse: '', scripture_quotation: '', further_readings: '', author: '', cover_photo_url: '', related_scriptures: '' };
const SAMPLE = {
  plan_id: null,
  note: 'plan_id is optional — if omitted, entries go to the plan selected in the Bulk tab. Dates must be YYYY-MM-DD.',
  entries: [
    { scheduled_date: '2026-12-01', title: 'Begin With God', devotional_text: '<p>Start your day…</p>', devotional_text_lu: '<p>Tandika olunaku…</p>', scripture_book: 'Psalms', scripture_chapter: 1, scripture_verse: 1, scripture_quotation: 'Blessed is the one…', further_readings: 'Proverbs 3:5; Joshua 1:8', author: 'Pray-Read Team', cover_photo_url: '', related_scriptures: [{ book: 'Proverbs', chapter: 3, verse: 5, text: 'Trust in the LORD…' }] },
    { scheduled_date: '2026-12-02', title: 'Walk By Faith', devotional_text: '<p>Faith is…</p>', devotional_text_lu: '', scripture_book: '2 Corinthians', scripture_chapter: 5, scripture_verse: 7, scripture_quotation: 'For we live by faith…', further_readings: '', author: 'Pray-Read Team', cover_photo_url: '', related_scriptures: [] },
  ],
};

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function isDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T12:00:00')); }

export default function DevotionalPlansManagement() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<DevotionalPlan[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const [tab, setTab] = useState<Tab>('plans');
  const [planSearch, setPlanSearch] = useState('');
  const [entrySearch, setEntrySearch] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');

  // ---- Plan form (create / edit) ----
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(''); const [devotionalText, setDevotionalText] = useState('');
  const [scheduleType, setScheduleType] = useState('daily'); const [scheduleTime, setScheduleTime] = useState('06:00');
  const [isActive, setIsActive] = useState(true); const [saving, setSaving] = useState(false);

  // ---- Manual single-entry upload ----
  const [manual, setManual] = useState<EntryRow>(EMPTY_ENTRY);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(0);

  // ---- Bulk import ----
  const [bulkPlanId, setBulkPlanId] = useState<number | ''>('');
  const [bulkMode, setBulkMode] = useState<BulkMode>('skip');
  const [bulkText, setBulkText] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // ---- Existing entries for selected plan ----
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) { fetchPlans(); fetchBooks(); } }, [mounted]);
  useEffect(() => { if (selectedPlanId) fetchEntries(Number(selectedPlanId)); else setEntries([]); }, [selectedPlanId]);
  useEffect(() => { if (plans.length && !selectedPlanId) setSelectedPlanId(plans[0].id); if (plans.length && !bulkPlanId) setBulkPlanId(plans[0].id); }, [plans]); // eslint-disable-line

  const showMsg = (type: 'ok' | 'err' | 'info', text: string) => { setMessage({ type, text }); window.setTimeout(() => setMessage(null), 6000); };

  const fetchPlans = async () => {
    try { const res = await fetch('/api/devotional-plans'); if (res.ok) setPlans(await res.json()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const fetchBooks = async () => { try { const res = await fetch('/api/bible-books?full=true'); if (res.ok) setBooks(await res.json()); } catch (e) { console.error(e); } };
  const fetchEntries = async (planId: number) => {
    setEntriesLoading(true);
    try { const res = await fetch(`/api/devotional-entries?planId=${planId}`); if (res.ok) setEntries(await res.json()); } catch (e) { console.error(e); } finally { setEntriesLoading(false); }
  };

  /* ---------- Plans ---------- */
  const resetPlanForm = () => { setEditingPlanId(null); setTitle(''); setDescription(''); setThumbnailUrl(''); setDevotionalText(''); setScheduleType('daily'); setScheduleTime('06:00'); setIsActive(true); setShowPlanForm(false); };
  const handleSavePlan = async () => {
    if (!title.trim()) { showMsg('err', 'Title is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/devotional-plans', { method: editingPlanId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingPlanId, title, description, thumbnail_url: thumbnailUrl, devotional_text: devotionalText, schedule_type: scheduleType, schedule_time: scheduleTime, is_active: isActive }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save plan');
      showMsg('ok', editingPlanId ? 'Plan updated.' : 'Plan created. Now add entries in Manual or Bulk.');
      await fetchPlans(); resetPlanForm();
    } catch (e: any) { showMsg('err', e.message || 'Error saving plan'); } finally { setSaving(false); }
  };
  const handleEditPlan = (p: DevotionalPlan) => { setEditingPlanId(p.id); setTitle(p.title); setDescription(p.description || ''); setThumbnailUrl(p.thumbnail_url || ''); setDevotionalText(p.devotional_text || ''); setScheduleType(p.schedule_type || 'daily'); setScheduleTime(p.schedule_time || '06:00'); setIsActive(p.is_active !== false); setShowPlanForm(true); setTab('plans'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeletePlan = async (id: number) => {
    if (!confirm('Delete this plan AND all its devotional entries? This cannot be undone.')) return;
    try { const res = await fetch(`/api/devotional-plans?id=${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); showMsg('ok', 'Plan deleted.'); if (selectedPlanId === id) setSelectedPlanId(''); await fetchPlans(); } catch { showMsg('err', 'Failed to delete plan.'); }
  };

  /* ---------- Manual single entry ---------- */
  const validateEntry = (e: EntryRow): string[] => {
    const errs: string[] = [];
    if (!e.scheduled_date) errs.push('Date is required.');
    else if (!isDate(e.scheduled_date)) errs.push(`Bad date “${e.scheduled_date}” — use YYYY-MM-DD.`);
    if (!e.title.trim()) errs.push('Title is required.');
    if (!e.devotional_text.trim()) errs.push('English devotional text is required.');
    if (!e.scripture_book.trim()) errs.push('Scripture book is required.');
    if (!e.scripture_chapter.trim() || Number.isNaN(Number(e.scripture_chapter))) errs.push('Scripture chapter must be a number.');
    if (!e.scripture_verse.trim() || Number.isNaN(Number(e.scripture_verse))) errs.push('Scripture verse must be a number.');
    if (e.related_scriptures.trim()) { try { const v = JSON.parse(e.related_scriptures); if (!Array.isArray(v)) errs.push('Related scriptures must be a JSON array.'); } catch { errs.push('Related scriptures is not valid JSON.'); } }
    return errs;
  };
  const entryPayload = (e: EntryRow, planId: number) => ({
    plan_id: planId, scheduled_date: e.scheduled_date, title: e.title.trim(),
    devotional_text: e.devotional_text, devotional_text_lu: e.devotional_text_lu || null,
    scripture_book: e.scripture_book.trim(), scripture_chapter: Number(e.scripture_chapter), scripture_verse: Number(e.scripture_verse),
    scripture_quotation: e.scripture_quotation || null, further_readings: e.further_readings || null,
    author: e.author || null, cover_photo_url: e.cover_photo_url || null,
    related_scriptures: e.related_scriptures.trim() ? JSON.parse(e.related_scriptures) : [],
  });
  const handleManualSave = async () => {
    if (!selectedPlanId) { showMsg('err', 'Pick a plan first (top of the page).'); return; }
    const errs = validateEntry(manual); if (errs.length) { showMsg('err', errs.join(' ')); return; }
    setManualSaving(true);
    try {
      const res = await fetch('/api/devotional-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entryPayload(manual, Number(selectedPlanId))) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save devotional.');
      setManualSaved(c => c + 1); showMsg('ok', `Saved “${manual.title}” for ${manual.scheduled_date}.`);
      // Keep author/cover/book for the next day, clear the rest, auto-advance the date by 1 day.
      const next = new Date(manual.scheduled_date + 'T12:00:00'); next.setDate(next.getDate() + 1);
      setManual({ ...EMPTY_ENTRY, scheduled_date: toDateStr(next), author: manual.author, cover_photo_url: manual.cover_photo_url, scripture_book: manual.scripture_book });
      fetchEntries(Number(selectedPlanId));
    } catch (e: any) { showMsg('err', e.message || 'Error saving devotional.'); } finally { setManualSaving(false); }
  };
  const fillToday = () => setManual(m => ({ ...m, scheduled_date: toDateStr(new Date()) }));

  /* ---------- Bulk import ---------- */
  const parseBulk = (raw: string) => {
    setBulkResult(null); setBulkErrors([]); setBulkPreview([]);
    if (!raw.trim()) { setBulkErrors(['Paste JSON or upload a .json file first.']); return; }
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { setBulkErrors(['File is not valid JSON. Check for a missing comma / bracket.']); return; }
    const list = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(list)) { setBulkErrors(['JSON must be an array, or an object with an "entries" array.']); return; }
    const errs: string[] = []; const seen = new Set<string>();
    const clean = list.map((row: any, i: number) => {
      const label = `Row ${i + 1} (${row?.scheduled_date || 'no date'})`;
      if (!isDate(String(row?.scheduled_date || ''))) errs.push(`${label}: bad or missing scheduled_date (use YYYY-MM-DD).`);
      if (!String(row?.title || '').trim()) errs.push(`${label}: missing title.`);
      if (!String(row?.devotional_text || '').trim()) errs.push(`${label}: missing devotional_text.`);
      if (!String(row?.scripture_book || '').trim()) errs.push(`${label}: missing scripture_book.`);
      if (row?.scripture_chapter == null || Number.isNaN(Number(row.scripture_chapter))) errs.push(`${label}: bad scripture_chapter.`);
      if (row?.scripture_verse == null || Number.isNaN(Number(row.scripture_verse))) errs.push(`${label}: bad scripture_verse.`);
      if (row?.related_scriptures != null && !Array.isArray(row.related_scriptures)) errs.push(`${label}: related_scriptures must be an array.`);
      const key = String(row?.scheduled_date);
      if (seen.has(key)) errs.push(`${label}: duplicate date ${key} inside this file.`);
      seen.add(key);
      return { scheduled_date: String(row?.scheduled_date || ''), title: String(row?.title || ''), devotional_text: String(row?.devotional_text || ''), devotional_text_lu: String(row?.devotional_text_lu || ''), scripture_book: String(row?.scripture_book || ''), scripture_chapter: Number(row?.scripture_chapter), scripture_verse: Number(row?.scripture_verse), scripture_quotation: row?.scripture_quotation ?? null, further_readings: row?.further_readings ?? null, author: row?.author ?? null, cover_photo_url: row?.cover_photo_url ?? null, related_scriptures: Array.isArray(row?.related_scriptures) ? row.related_scriptures : [] };
    });
    setBulkErrors(errs);
    setBulkPreview(clean);
  };
  const handleBulkFile = async (f: File | undefined) => {
    if (!f) return; setBulkFileName(f.name);
    const text = await f.text(); setBulkText(text); parseBulk(text);
  };
  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'devotional-bulk-sample.json'; a.click(); URL.revokeObjectURL(url);
  };
  const downloadTemplateMonth = (year: number, month: number) => {
    const days = new Date(year, month, 0).getDate();
    const entries = Array.from({ length: days }, (_, i) => ({ scheduled_date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, title: '', devotional_text: '', devotional_text_lu: '', scripture_book: '', scripture_chapter: 1, scripture_verse: 1, scripture_quotation: '', further_readings: '', author: '', cover_photo_url: '', related_scriptures: [] }));
    const blob = new Blob([JSON.stringify({ plan_id: null, entries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `devotional-template-${year}-${String(month).padStart(2, '0')}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const handleBulkImport = async () => {
    const planId = bulkPlanId || selectedPlanId;
    if (!planId) { showMsg('err', 'Pick a plan for the bulk import.'); return; }
    if (!bulkPreview.length) { showMsg('err', 'Nothing to import — parse a file first.'); return; }
    if (bulkErrors.length) { showMsg('err', 'Fix the errors listed above before importing.'); return; }
    if (!confirm(`Import ${bulkPreview.length} devotionals into “${plans.find(p => p.id === Number(planId))?.title}”?\nMode: ${bulkMode === 'replace' ? 'REPLACE entries on the same dates' : 'SKIP dates that already exist'}.`)) return;
    setBulkImporting(true);
    try {
      const res = await fetch('/api/devotional-entries/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan_id: Number(planId), mode: bulkMode, entries: bulkPreview }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bulk import failed.');
      setBulkResult(data);
      showMsg('ok', `Bulk import done — ${data.inserted ?? 0} added, ${data.updated ?? 0} replaced, ${data.skipped ?? 0} skipped.`);
      setBulkText(''); setBulkPreview([]); setBulkFileName('');
      if (Number(planId) === Number(selectedPlanId)) fetchEntries(Number(planId));
    } catch (e: any) { showMsg('err', e.message || 'Bulk import failed.'); } finally { setBulkImporting(false); }
  };

  /* ---------- Entries list ---------- */
  const handleDeleteEntry = async (id: number, label: string) => {
    if (!confirm(`Delete “${label}”?`)) return;
    try { const res = await fetch(`/api/devotional-entries?id=${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); showMsg('ok', 'Entry deleted.'); if (selectedPlanId) fetchEntries(Number(selectedPlanId)); } catch { showMsg('err', 'Failed to delete entry.'); }
  };
  const filteredPlans = useMemo(() => plans.filter(p => !planSearch.trim() || p.title.toLowerCase().includes(planSearch.toLowerCase())), [plans, planSearch]);
  const filteredEntries = useMemo(() => {
    const q = entrySearch.trim().toLowerCase();
    const sorted = [...entries].sort((a, b) => String(b.scheduled_date).localeCompare(String(a.scheduled_date)));
    return q ? sorted.filter(e => String(e.title || '').toLowerCase().includes(q) || String(e.scheduled_date || '').includes(q)) : sorted;
  }, [entries, entrySearch]);
  const monthGroups = useMemo(() => {
    const g: Record<string, number> = {};
    entries.forEach(e => { const k = String(e.scheduled_date || '').slice(0, 7); if (k) g[k] = (g[k] || 0) + 1; });
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  if (!mounted) return null;
  if (loading) return <div className="min-h-screen bg-[#FFFBF2] flex items-center justify-center font-semibold text-slate-500">Loading devotionals…</div>;

  return (
    <div className="min-h-screen bg-[#FFFBF2] text-slate-900">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 sm:p-6 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h1 className="text-2xl sm:text-3xl font-black">Devotional Uploads</h1><p className="text-slate-500 text-sm mt-1">Manual upload for one day — or bulk import for a whole month / months.</p></div>
          <button onClick={() => router.push('/admin-panel')} className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-sm shrink-0">← Back to Admin</button>
        </div>

        {message && <div className={`mb-5 px-4 py-3 rounded-2xl font-semibold text-sm ${message.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : message.type === 'err' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>{message.text}</div>}

        {/* Plan picker — shared by Manual + Bulk */}
        <div className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 mb-5">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Uploading into plan</label>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value ? Number(e.target.value) : '')} className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl font-semibold outline-none focus:ring-2 ring-violet-300">
              <option value="">— Select a plan —</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.title} {p.is_active ? '' : '(inactive)'}</option>)}
            </select>
            <button onClick={() => { setShowPlanForm(true); setEditingPlanId(null); setTab('plans'); }} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm flex items-center justify-center gap-1.5"><Plus size={16} /> New Plan</button>
          </div>
          {monthGroups.length > 0 && <p className="text-xs font-semibold text-slate-500 mt-3">Already in this plan: {monthGroups.map(([m, n]) => `${m} (${n})`).join('  ·  ')}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {([['plans', '📋 Plans'], ['manual', '✍️ Manual — one day'], ['bulk', '📦 Bulk — full month(s)']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 px-5 py-3 rounded-full font-bold text-sm transition ${tab === t ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>

        {/* ================= PLANS TAB ================= */}
        {tab === 'plans' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={planSearch} onChange={e => setPlanSearch(e.target.value)} placeholder="Search plans…" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 ring-violet-300" /></div>
              <button onClick={() => { setEditingPlanId(null); setTitle(''); setShowPlanForm(v => !v); }} className="px-5 py-3 rounded-full bg-violet-600 text-white font-bold text-sm flex items-center gap-1.5 justify-center"><Plus size={16} /> {showPlanForm ? 'Close form' : 'Create Plan'}</button>
            </div>

            {showPlanForm && (
              <section className="bg-white rounded-[26px] border border-violet-100 shadow-sm p-5 sm:p-6 mb-5">
                <div className="flex items-center justify-between mb-4"><h2 className="font-black text-lg">{editingPlanId ? 'Edit Plan' : 'Create Plan'}</h2><button onClick={resetPlanForm} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"><X size={18} /></button></div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="text-sm font-bold">Title *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning Grace" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-violet-300" /></div>
                  <div className="md:col-span-2"><label className="text-sm font-bold">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-violet-300" /></div>
                  <div className="md:col-span-2"><label className="text-sm font-bold flex items-center gap-1.5"><ImageIcon size={15} /> Thumbnail / Cover Image URL</label><input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-violet-300" />{thumbnailUrl && <img src={thumbnailUrl} alt="" className="mt-2 w-32 h-32 object-cover rounded-2xl shadow" />}</div>
                  <div><label className="text-sm font-bold">Schedule Type</label><select value={scheduleType} onChange={e => setScheduleType(e.target.value)} className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></div>
                  <div><label className="text-sm font-bold flex items-center gap-1.5"><Clock size={15} /> Notification Time</label><input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div>
                  <label className="md:col-span-2 flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-violet-600" /> Active (visible to users)</label>
                  <div className="md:col-span-2 flex justify-end gap-2"><button onClick={resetPlanForm} className="px-5 py-3 rounded-full bg-slate-100 font-bold text-sm">Cancel</button><button onClick={handleSavePlan} disabled={saving} className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm disabled:opacity-50">{saving ? 'Saving…' : editingPlanId ? 'Update Plan' : 'Create Plan'}</button></div>
                </div>
              </section>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {filteredPlans.map(p => (
                <article key={p.id} className="bg-white rounded-[26px] border border-slate-100 shadow-sm overflow-hidden">
                  {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-full h-36 object-cover" /> : <div className="h-24 bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center text-white"><Book size={32} /></div>}
                  <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-black text-lg leading-snug">{p.title}</h3><span className={`shrink-0 text-[11px] font-black px-2.5 py-1 rounded-full ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.is_active ? 'ACTIVE' : 'INACTIVE'}</span></div>
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{p.description || 'No description'}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1.5"><Clock size={13} /> {p.schedule_type} at {p.schedule_time || '06:00'}</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => { setSelectedPlanId(p.id); setTab('manual'); }} className="flex-1 px-3 py-2.5 rounded-full bg-violet-600 text-white text-xs font-bold">+ Add Entries</button>
                      <button onClick={() => handleEditPlan(p)} className="px-3 py-2.5 rounded-full bg-slate-100 text-xs font-bold flex items-center gap-1"><Pencil size={13} /> Edit</button>
                      <button onClick={() => handleDeletePlan(p.id)} className="px-3 py-2.5 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                    </div></div>
                </article>
              ))}
              {filteredPlans.length === 0 && <p className="md:col-span-2 bg-white rounded-3xl border p-8 text-center text-slate-500 font-semibold">No plans yet — create your first plan above.</p>}
            </div>
          </>
        )}

        {/* ================= MANUAL TAB ================= */}
        {tab === 'manual' && (
          <section className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1"><h2 className="font-black text-lg flex items-center gap-2"><Sparkles size={18} className="text-amber-500" /> Manual Upload — One Day</h2>{manualSaved > 0 && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">✓ {manualSaved} saved this session</span>}</div>
            <p className="text-slate-500 text-sm mb-5">After saving, the date auto-advances to the next day and author / cover / book stay filled — so you can enter a whole week quickly.</p>
            {!selectedPlanId && <p className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold rounded-2xl px-4 py-3 mb-4">Pick a plan at the top first.</p>}
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-sm font-bold">Date *</label><div className="flex gap-2 mt-1"><input type="date" value={manual.scheduled_date} onChange={e => setManual(m => ({ ...m, scheduled_date: e.target.value }))} className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl" /><button onClick={fillToday} className="px-4 rounded-2xl bg-slate-100 font-bold text-xs">Today</button></div></div>
              <div><label className="text-sm font-bold">Title *</label><input value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} placeholder="e.g. Begin With God" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div>
              <div className="md:col-span-2"><label className="text-sm font-bold flex items-center gap-1.5"><Languages size={15} /> English Devotional Text * <span className="text-xs font-medium text-slate-400">(HTML allowed)</span></label><textarea value={manual.devotional_text} onChange={e => setManual(m => ({ ...m, devotional_text: e.target.value }))} rows={7} placeholder="<p>Your devotional message…</p>" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div>
              <div className="md:col-span-2"><label className="text-sm font-bold flex items-center gap-1.5"><Languages size={15} /> Luganda Devotional Text <span className="text-xs font-medium text-slate-400">(optional)</span></label><textarea value={manual.devotional_text_lu} onChange={e => setManual(m => ({ ...m, devotional_text_lu: e.target.value }))} rows={5} placeholder="<p>…</p>" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div>
              <div><label className="text-sm font-bold">Scripture Book *</label><input list="dev-books" value={manual.scripture_book} onChange={e => setManual(m => ({ ...m, scripture_book: e.target.value }))} placeholder="Psalms" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /><datalist id="dev-books">{books.map(b => <option key={b.id} value={b.name_english} />)}</datalist></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-bold">Chapter *</label><input type="number" min={1} value={manual.scripture_chapter} onChange={e => setManual(m => ({ ...m, scripture_chapter: e.target.value }))} className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div><div><label className="text-sm font-bold">Verse *</label><input type="number" min={1} value={manual.scripture_verse} onChange={e => setManual(m => ({ ...m, scripture_verse: e.target.value }))} className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div></div>
              <div className="md:col-span-2"><label className="text-sm font-bold">Scripture Quotation</label><textarea value={manual.scripture_quotation} onChange={e => setManual(m => ({ ...m, scripture_quotation: e.target.value }))} rows={2} placeholder="“Blessed is the one…”" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div>
              <div><label className="text-sm font-bold">Further Readings</label><input value={manual.further_readings} onChange={e => setManual(m => ({ ...m, further_readings: e.target.value }))} placeholder="Proverbs 3:5; Joshua 1:8" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /><p className="text-[11px] text-slate-400 mt-1">Separate with ; — the app makes each one tappable.</p></div>
              <div><label className="text-sm font-bold">Author</label><input value={manual.author} onChange={e => setManual(m => ({ ...m, author: e.target.value }))} placeholder="Pray-Read Team" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" /></div>
              <div className="md:col-span-2"><label className="text-sm font-bold flex items-center gap-1.5"><ImageIcon size={15} /> Cover Photo URL</label><input value={manual.cover_photo_url} onChange={e => setManual(m => ({ ...m, cover_photo_url: e.target.value }))} placeholder="https://…" className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl" />{manual.cover_photo_url && <img src={manual.cover_photo_url} alt="" className="mt-2 w-32 h-32 object-cover rounded-2xl shadow" />}</div>
              <div className="md:col-span-2"><label className="text-sm font-bold">Related Scriptures <span className="text-xs font-medium text-slate-400">(JSON array — optional)</span></label><textarea value={manual.related_scriptures} onChange={e => setManual(m => ({ ...m, related_scriptures: e.target.value }))} rows={2} placeholder='[{"book":"Proverbs","chapter":3,"verse":5,"text":"Trust in the LORD…"}]' className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl font-mono text-xs" /></div>
              <div className="md:col-span-2 flex flex-wrap justify-end gap-2"><button onClick={() => setManual(EMPTY_ENTRY)} className="px-5 py-3 rounded-full bg-slate-100 font-bold text-sm">Clear</button><button onClick={handleManualSave} disabled={manualSaving || !selectedPlanId} className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm disabled:opacity-50">{manualSaving ? 'Saving…' : 'Save This Day →'}</button></div>
            </div>
          </section>
        )}

        {/* ================= BULK TAB ================= */}
        {tab === 'bulk' && (
          <section className="space-y-5">
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-[26px] p-5 sm:p-6 shadow-lg">
              <h2 className="font-black text-xl flex items-center gap-2"><Upload size={20} /> Bulk Import — a full month (or months) at once</h2>
              <p className="text-white/85 text-sm mt-1 leading-relaxed">Prepare one JSON file with 30 / 31 entries (or 60+ for two months), upload it, check the preview, then import. Duplicates are caught before anything is saved.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={downloadSample} className="px-4 py-2.5 rounded-full bg-white text-violet-700 font-bold text-xs flex items-center gap-1.5"><Download size={14} /> Download sample JSON</button>
                <button onClick={() => downloadTemplateMonth(new Date().getFullYear(), new Date().getMonth() + 1)} className="px-4 py-2.5 rounded-full bg-white/15 border border-white/30 font-bold text-xs flex items-center gap-1.5"><FileJson size={14} /> Blank template — this month</button>
                <button onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 1); downloadTemplateMonth(d.getFullYear(), d.getMonth() + 1); }} className="px-4 py-2.5 rounded-full bg-white/15 border border-white/30 font-bold text-xs flex items-center gap-1.5"><Calendar size={14} /> Blank template — next month</button>
              </div>
            </div>

            <div className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 sm:p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-bold">Import into plan</label><select value={bulkPlanId} onChange={e => setBulkPlanId(e.target.value ? Number(e.target.value) : '')} className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl font-semibold"><option value="">Use the plan selected above</option>{plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
                <div><label className="text-sm font-bold">If a date already exists…</label><div className="flex gap-2 mt-1"><button onClick={() => setBulkMode('skip')} className={`flex-1 px-4 py-3 rounded-2xl font-bold text-sm border ${bulkMode === 'skip' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-slate-200'}`}>⏭️ Skip it</button><button onClick={() => setBulkMode('replace')} className={`flex-1 px-4 py-3 rounded-2xl font-bold text-sm border ${bulkMode === 'replace' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-slate-200'}`}>♻️ Replace it</button></div><p className="text-[11px] text-slate-400 mt-1">{bulkMode === 'skip' ? 'Safe default — existing days are never overwritten.' : 'Use when re-uploading a corrected month.'}</p></div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold">1 · Upload a .json file</label>
                <div onClick={() => fileRef.current?.click()} className="mt-1 border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/50 rounded-3xl p-6 text-center cursor-pointer transition">
                  <Upload size={28} className="mx-auto text-violet-500 mb-2" />
                  <p className="font-bold text-sm">{bulkFileName ? `📄 ${bulkFileName}` : 'Click to choose a .json file'}</p>
                  <p className="text-xs text-slate-500 mt-1">…or paste the JSON below</p>
                </div>
                <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => handleBulkFile(e.target.files?.[0])} />
              </div>

              <div className="mt-4">
                <label className="text-sm font-bold">2 · …or paste JSON</label>
                <textarea value={bulkText} onChange={e => { setBulkText(e.target.value); setBulkFileName(''); }} rows={7} placeholder='{"entries": [ {"scheduled_date":"2026-12-01","title":"…","devotional_text":"…","scripture_book":"Psalms","scripture_chapter":1,"scripture_verse":1} ]}' className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-2xl font-mono text-xs" />
                <div className="flex flex-wrap gap-2 mt-3"><button onClick={() => parseBulk(bulkText)} className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-xs">Validate & Preview</button><button onClick={() => { setBulkText(''); setBulkPreview([]); setBulkErrors([]); setBulkFileName(''); setBulkResult(null); }} className="px-5 py-2.5 rounded-full bg-slate-100 font-bold text-xs flex items-center gap-1"><Trash size={13} /> Clear</button></div>
              </div>

              {bulkErrors.length > 0 && <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4"><p className="font-black text-red-800 text-sm flex items-center gap-1.5"><AlertTriangle size={15} /> Fix these before importing ({bulkErrors.length})</p><ul className="text-red-700 text-xs mt-2 space-y-1 list-disc pl-5">{bulkErrors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}

              {bulkPreview.length > 0 && (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h3 className="font-black flex items-center gap-1.5"><CheckCircle2 size={17} className="text-emerald-500" /> Preview — {bulkPreview.length} entries {bulkErrors.length === 0 ? '· ready to import' : '· has errors'}</h3><span className="text-xs font-bold text-slate-500">{bulkPreview[0]?.scheduled_date} → {bulkPreview[bulkPreview.length - 1]?.scheduled_date}</span></div>
                  <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50">
                    {bulkPreview.map((r, i) => (
                      <div key={i} className="flex gap-3 px-4 py-3"><span className="shrink-0 w-24 text-xs font-black bg-violet-50 text-violet-700 rounded-full px-2 py-1 text-center h-fit">{r.scheduled_date}</span><div className="min-w-0"><p className="font-bold text-sm truncate">{r.title || '(no title)'}</p><p className="text-xs text-slate-500 truncate">{r.scripture_book} {r.scripture_chapter}:{r.scripture_verse}{r.devotional_text_lu ? ' · EN + LUG' : ' · EN only'}</p></div></div>
                    ))}
                  </div>
                  <button onClick={handleBulkImport} disabled={bulkImporting || bulkErrors.length > 0} className="mt-4 w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-sm disabled:opacity-50">{bulkImporting ? 'Importing…' : `Import ${bulkPreview.length} Devotionals →`}</button>
                </div>
              )}

              {bulkResult && <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm font-semibold text-emerald-800">✅ Done — {bulkResult.inserted ?? 0} added · {bulkResult.updated ?? 0} replaced · {bulkResult.skipped ?? 0} skipped{bulkResult.errors?.length ? ` · ${bulkResult.errors.length} row errors (see below)` : ''}{bulkResult.errors?.length > 0 && <ul className="text-xs mt-2 space-y-1 list-disc pl-5">{bulkResult.errors.slice(0, 10).map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>}</div>}

              <details className="mt-5 bg-slate-50 rounded-2xl p-4 text-xs leading-relaxed text-slate-600"><summary className="font-black text-sm text-slate-800 cursor-pointer">What does the JSON look like? (click to open)</summary><pre className="mt-3 overflow-x-auto bg-white border rounded-xl p-3 font-mono">{JSON.stringify(SAMPLE, null, 2)}</pre><p className="mt-2"><b>Required per entry:</b> scheduled_date, title, devotional_text, scripture_book, scripture_chapter, scripture_verse. <b>Optional:</b> devotional_text_lu, scripture_quotation, further_readings, author, cover_photo_url, related_scriptures (array).</p></details>
            </div>
          </section>
        )}

        {/* ================= EXISTING ENTRIES (all tabs) ================= */}
        <section className="mt-6 bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-black text-lg">Entries in selected plan <span className="text-slate-400 font-bold text-sm">({entries.length})</span></h2>
            <div className="relative w-full sm:w-64"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={entrySearch} onChange={e => setEntrySearch(e.target.value)} placeholder="Search by title / date…" className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-violet-300" /></div>
          </div>
          {!selectedPlanId && <p className="text-slate-500 text-sm font-semibold">Select a plan above to see its entries.</p>}
          {selectedPlanId && entriesLoading && <p className="text-slate-500 text-sm font-semibold">Loading entries…</p>}
          {selectedPlanId && !entriesLoading && filteredEntries.length === 0 && <p className="text-slate-500 text-sm font-semibold">No entries yet — use Manual for one day, or Bulk for a whole month.</p>}
          <div className="divide-y divide-slate-50">
            {filteredEntries.map(e => {
              const open = !!expanded[e.id];
              return (
                <div key={e.id} className="py-3">
                  <button onClick={() => setExpanded(s => ({ ...s, [e.id]: !s[e.id] }))} className="w-full flex items-center gap-3 text-left">
                    <span className="shrink-0 text-xs font-black bg-violet-50 text-violet-700 rounded-full px-2.5 py-1">{String(e.scheduled_date || '').slice(0, 10)}</span>
                    <span className="flex-1 min-w-0"><span className="block font-bold text-sm truncate">{e.title}</span><span className="block text-xs text-slate-500 truncate">{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse}</span></span>
                    {open ? <ChevronUp size={17} className="text-slate-400" /> : <ChevronDown size={17} className="text-slate-400" />}
                  </button>
                  {open && (
                    <div className="pl-1 pr-1 pt-3 flex flex-wrap gap-2">
                      <button onClick={() => { setManual({ scheduled_date: String(e.scheduled_date || '').slice(0, 10), title: e.title || '', devotional_text: e.devotional_text || '', devotional_text_lu: e.devotional_text_lu || '', scripture_book: e.scripture_book || '', scripture_chapter: String(e.scripture_chapter ?? ''), scripture_verse: String(e.scripture_verse ?? ''), scripture_quotation: e.scripture_quotation || '', further_readings: e.further_readings || '', author: e.author || '', cover_photo_url: e.cover_photo_url || '', related_scriptures: e.related_scriptures ? JSON.stringify(e.related_scriptures, null, 2) : '' }); setTab('manual'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3.5 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-1"><Pencil size={13} /> Load into Manual form (edit & re-save)</button>
                      <button onClick={() => handleDeleteEntry(e.id, e.title)} className="px-3.5 py-2 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1"><Trash2 size={13} /> Delete entry</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
