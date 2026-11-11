"use client";
// ─────────────────────────────────────────────────────────────────────────────
// DevotionalAdminTab — DROP-IN REPLACEMENT for the Devotional tab inside
// your Admin Control Panel (app/admin-panel/page.tsx).
//
// WHAT IT REPLACES: the "Create New Devotional" form in your screenshot
// (Scheduled Date + Scripture Book + Chapter + Verse + Author + Cover + Title).
//
// WHAT IT ADDS:  [ Manual | Bulk ] subtabs. Manual keeps your exact fields,
// but Scheduled Date → Devotional Number (001, 002…). Bulk imports a whole
// batch (001–026, or a full month) from one JSON file.
//
// HOW TO WIRE IT IN (2 minutes):
//   1. Save this file as:  app/components/DevotionalAdminTab.tsx
//   2. In app/admin-panel/page.tsx find where the Devotional tab renders
//      (search for "Create New Devotional") and replace that whole block with:
//          {activeTab === 'devotional' && <DevotionalAdminTab />}
//      (use whatever your tab variable/value is — keep your tab buttons as-is)
//   3. Add at the top of admin-panel/page.tsx:
//          import DevotionalAdminTab from '@/app/components/DevotionalAdminTab';
//   4. Replace the two API routes with the files below (see bottom of this file).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Download, FileJson, CheckCircle2, AlertTriangle, Search, Trash2, Pencil, X, Calendar, Languages, Image as ImageIcon } from 'lucide-react';

interface Book { id: number; name_english: string; name_luganda?: string; }
interface Entry { id?: number; devotional_number: string; title: string; devotional_text: string; devotional_text_lu?: string; scripture_book: string; scripture_chapter: number; scripture_verse: number; scripture_quotation?: string; further_readings?: string; author?: string; cover_photo_url?: string; related_scriptures?: any[]; scheduled_date?: string | null; }

const EMPTY = { devotional_number: '', title: '', devotional_text: '', devotional_text_lu: '', scripture_book: '', scripture_chapter: '', scripture_verse: '', scripture_quotation: '', further_readings: '', author: 'Pr. Denis', cover_photo_url: '', related_scriptures: '' };
const SAMPLE = { note: 'Entries are ordered by devotional_number (001, 002...). No scheduled_date.', entries: [{ devotional_number: '001', title: 'An Established Heart', devotional_text: '<h3>Scripture Reading — 1 Thessalonians 3:13 (KJV)</h3>\n<p>“...”</p>\n\n<h3>Reflection</h3>\n<p>...</p>\n\n<h3>Practical Application</h3>\n<p>...</p>\n\n<h3>Meditation</h3>\n<p>...</p>\n\n<h3>Short Prayer</h3>\n<p>... In the name of the Lord Jesus Christ, Amen.</p>', devotional_text_lu: '', scripture_book: '1 Thessalonians', scripture_chapter: 3, scripture_verse: 13, scripture_quotation: 'To the end he may stablish your hearts...', further_readings: 'Hebrews 13:8; Psalms 112:6–8', author: 'Pr. Denis', cover_photo_url: '', related_scriptures: [{ book: 'Hebrews', chapter: 13, verse: 8, text: 'Reminds us that Jesus Christ remains the same forever.' }] }] };

function nextNumber(list: Entry[]) {
  let max = 0;
  list.forEach(e => { const n = parseInt(String(e.devotional_number || '0'), 10); if (!Number.isNaN(n)) max = Math.max(max, n); });
  return String(max + 1).padStart(3, '0');
}
function isNumber(s: string) { return /^\d{3}$/.test(s); }

export default function DevotionalAdminTab() {
  const [subTab, setSubTab] = useState<'manual' | 'bulk'>('manual');
  const [books, setBooks] = useState<Book[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  // Manual form
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Bulk
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulkMode, setBulkMode] = useState<'skip' | 'replace'>('skip');
  const [bulkText, setBulkText] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const showMsg = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000); };

  const fetchEntries = async () => {
    try { const res = await fetch('/api/devotional-entries'); if (res.ok) setEntries(await res.json()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => {
    fetchEntries();
    (async () => { try { const r = await fetch('/api/bible-books?full=true'); if (r.ok) setBooks(await r.json()); } catch {} })();
  }, []);
  // Auto-fill next number when list loads and form is fresh
  useEffect(() => { if (entries.length && !form.devotional_number && !editingId) setForm(f => ({ ...f, devotional_number: nextNumber(entries) })); }, [entries]); // eslint-disable-line

  /* ── MANUAL ── */
  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));
  const validate = (): string[] => {
    const e: string[] = [];
    if (!isNumber(form.devotional_number)) e.push('Devotional Number must be 3 digits, e.g. 001.');
    if (!form.title.trim()) e.push('Devotional Title is required.');
    if (!form.devotional_text.trim()) e.push('Devotional Text is required.');
    if (!form.scripture_book.trim()) e.push('Scripture Book is required.');
    if (!form.scripture_chapter.trim() || Number.isNaN(Number(form.scripture_chapter))) e.push('Chapter must be a number.');
    if (!form.scripture_verse.trim() || Number.isNaN(Number(form.scripture_verse))) e.push('Verse must be a number.');
    if (form.related_scriptures.trim()) { try { const v = JSON.parse(form.related_scriptures); if (!Array.isArray(v)) e.push('Related Scriptures must be a JSON array.'); } catch { e.push('Related Scriptures is not valid JSON.'); } }
    return e;
  };
  const handleManualSave = async () => {
    const errs = validate(); if (errs.length) { showMsg('err', errs.join(' ')); return; }
    // Duplicate number check (only when creating, not when editing that same entry)
    if (!editingId && entries.some(e => String(e.devotional_number) === form.devotional_number)) { showMsg('err', `Devotional #${form.devotional_number} already exists. Use Replace in Bulk, or edit it from the list below.`); return; }
    setSaving(true);
    try {
      const payload = { id: editingId, devotional_number: form.devotional_number, title: form.title.trim(), devotional_text: form.devotional_text, devotional_text_lu: form.devotional_text_lu || null, scripture_book: form.scripture_book.trim(), scripture_chapter: Number(form.scripture_chapter), scripture_verse: Number(form.scripture_verse), scripture_quotation: form.scripture_quotation || null, further_readings: form.further_readings || null, author: form.author || null, cover_photo_url: form.cover_photo_url || null, related_scriptures: form.related_scriptures.trim() ? JSON.parse(form.related_scriptures) : [] };
      const res = await fetch('/api/devotional-entries', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save devotional.');
      setSavedCount(c => c + 1);
      showMsg('ok', editingId ? `Updated #${form.devotional_number} — ${form.title}.` : `Saved #${form.devotional_number} — ${form.title}.`);
      // Next-number behaviour: keep Author / Cover / Book, clear the rest, advance number +1
      const next = String(parseInt(form.devotional_number, 10) + 1).padStart(3, '0');
      setForm({ ...EMPTY, devotional_number: next, author: form.author, cover_photo_url: form.cover_photo_url, scripture_book: form.scripture_book });
      setEditingId(null);
      fetchEntries();
    } catch (e: any) { showMsg('err', e.message || 'Error saving.'); } finally { setSaving(false); }
  };
  const loadIntoForm = (e: Entry) => {
    setEditingId(e.id ?? null);
    setForm({ devotional_number: String(e.devotional_number || ''), title: e.title || '', devotional_text: e.devotional_text || '', devotional_text_lu: e.devotional_text_lu || '', scripture_book: e.scripture_book || '', scripture_chapter: String(e.scripture_chapter ?? ''), scripture_verse: String(e.scripture_verse ?? ''), scripture_quotation: e.scripture_quotation || '', further_readings: e.further_readings || '', author: e.author || 'Pr. Denis', cover_photo_url: e.cover_photo_url || '', related_scriptures: e.related_scriptures ? JSON.stringify(e.related_scriptures, null, 2) : '' });
    setSubTab('manual'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const deleteEntry = async (e: Entry) => {
    if (!confirm(`Delete #${e.devotional_number} — “${e.title}”?`)) return;
    try { const res = await fetch(`/api/devotional-entries?id=${e.id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); showMsg('ok', `Deleted #${e.devotional_number}.`); fetchEntries(); } catch { showMsg('err', 'Failed to delete.'); }
  };

  /* ── BULK ── */
  const parseBulk = (raw: string) => {
    setBulkResult(null); setBulkErrors([]); setBulkPreview([]);
    if (!raw.trim()) { setBulkErrors(['Paste JSON or upload a .json file first.']); return; }
    let parsed: any; try { parsed = JSON.parse(raw); } catch { setBulkErrors(['File is not valid JSON. Check for a missing comma / bracket.']); return; }
    const list = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(list)) { setBulkErrors(['JSON must be an array, or an object with an "entries" array.']); return; }
    const errs: string[] = []; const seen = new Set<string>();
    const clean = list.map((row: any, i: number) => {
      const num = String(row?.devotional_number || '').padStart(3, '0');
      const label = `Entry ${i + 1} (#${num})`;
      if (!isNumber(num)) errs.push(`${label}: bad devotional_number — use "001", "002", etc.`);
      if (!String(row?.title || '').trim()) errs.push(`${label}: missing title.`);
      if (!String(row?.devotional_text || '').trim()) errs.push(`${label}: missing devotional_text.`);
      if (!String(row?.scripture_book || '').trim()) errs.push(`${label}: missing scripture_book.`);
      if (row?.scripture_chapter == null || Number.isNaN(Number(row.scripture_chapter))) errs.push(`${label}: bad scripture_chapter.`);
      if (row?.scripture_verse == null || Number.isNaN(Number(row.scripture_verse))) errs.push(`${label}: bad scripture_verse.`);
      if (row?.related_scriptures != null && !Array.isArray(row.related_scriptures)) errs.push(`${label}: related_scriptures must be an array.`);
      if (seen.has(num)) errs.push(`${label}: duplicate number ${num} inside this file.`);
      seen.add(num);
      return { devotional_number: num, title: String(row?.title || ''), devotional_text: String(row?.devotional_text || ''), devotional_text_lu: String(row?.devotional_text_lu || ''), scripture_book: String(row?.scripture_book || ''), scripture_chapter: Number(row?.scripture_chapter), scripture_verse: Number(row?.scripture_verse), scripture_quotation: row?.scripture_quotation ?? null, further_readings: row?.further_readings ?? null, author: row?.author ?? 'Pr. Denis', cover_photo_url: row?.cover_photo_url ?? null, related_scriptures: Array.isArray(row?.related_scriptures) ? row.related_scriptures : [] };
    });
    setBulkErrors(errs); setBulkPreview(clean);
  };
  const handleBulkFile = async (f: File | undefined) => { if (!f) return; setBulkFileName(f.name); const t = await f.text(); setBulkText(t); parseBulk(t); };
  const downloadSample = () => { const b = new Blob([JSON.stringify(SAMPLE, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'devotional-bulk-sample.json'; a.click(); URL.revokeObjectURL(u); };
  const downloadTemplate = (count: number) => {
    const start = entries.length ? parseInt(nextNumber(entries), 10) : 1;
    const list = Array.from({ length: count }, (_, i) => ({ devotional_number: String(start + i).padStart(3, '0'), title: '', devotional_text: '', devotional_text_lu: '', scripture_book: '', scripture_chapter: 1, scripture_verse: 1, scripture_quotation: '', further_readings: '', author: 'Pr. Denis', cover_photo_url: '', related_scriptures: [] }));
    const b = new Blob([JSON.stringify({ entries: list }, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `devotional-template-${String(start).padStart(3, '0')}-${String(start + count - 1).padStart(3, '0')}.json`; a.click(); URL.revokeObjectURL(u);
  };
  const handleBulkImport = async () => {
    if (!bulkPreview.length) { showMsg('err', 'Nothing to import — parse a file first.'); return; }
    if (bulkErrors.length) { showMsg('err', 'Fix the errors listed above before importing.'); return; }
    if (!confirm(`Import ${bulkPreview.length} devotionals (#${bulkPreview[0]?.devotional_number} → #${bulkPreview[bulkPreview.length - 1]?.devotional_number})?\nMode: ${bulkMode === 'replace' ? 'REPLACE devotionals with the same numbers' : 'SKIP numbers that already exist'}.`)) return;
    setBulkImporting(true);
    try {
      const res = await fetch('/api/devotional-entries/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: bulkMode, entries: bulkPreview }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bulk import failed.');
      setBulkResult(data); showMsg('ok', `Bulk import done — ${data.inserted ?? 0} added, ${data.updated ?? 0} replaced, ${data.skipped ?? 0} skipped.`);
      setBulkText(''); setBulkPreview([]); setBulkFileName(''); fetchEntries();
    } catch (e: any) { showMsg('err', e.message || 'Bulk import failed.'); } finally { setBulkImporting(false); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...entries].sort((a, b) => String(a.devotional_number).localeCompare(String(b.devotional_number)));
    return q ? sorted.filter(e => String(e.title || '').toLowerCase().includes(q) || String(e.devotional_number || '').includes(q)) : sorted;
  }, [entries, search]);

  const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div>
      {/* Sub-tabs: Manual | Bulk */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setSubTab('manual')} className={`px-5 py-2.5 rounded-full font-bold text-sm transition ${subTab === 'manual' ? 'bg-slate-900 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}>✍️ Manual — One Devotional</button>
        <button onClick={() => setSubTab('bulk')} className={`px-5 py-2.5 rounded-full font-bold text-sm transition ${subTab === 'bulk' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}>📦 Bulk — Many at Once</button>
        <span className="ml-auto self-center text-sm font-semibold text-gray-500">{entries.length} devotionals saved · Next number: <b className="text-violet-700">#{nextNumber(entries)}</b></span>
      </div>

      {msg && <div className={`mb-5 px-4 py-3 rounded-lg font-medium text-sm ${msg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>}

      {/* ══════════ MANUAL ══════════ */}
      {subTab === 'manual' && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">📖 {editingId ? `Edit Devotional #${form.devotional_number}` : 'Create New Devotional'}</h2>
            {savedCount > 0 && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">✓ {savedCount} saved this session</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Devotional Number — REPLACES Scheduled Date */}
            <div>
              <label className={labelCls}>Devotional Number * <span className="text-xs font-normal text-gray-400">(001, 002…)</span></label>
              <input type="text" inputMode="numeric" maxLength={3} value={form.devotional_number} onChange={e => set(e, 'devotional_number', e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="001" className={inputCls} />
              <p className="text-[11px] text-gray-400 mt-1">Auto-filled with the next free number. Type to override.</p>
            </div>
            <div>
              <label className={labelCls}>Scripture Book *</label>
              <select value={form.scripture_book} onChange={e => set(e, 'scripture_book', e.target.value)} className={inputCls}>
                <option value="">Select book...</option>
                {books.map(b => <option key={b.id} value={b.name_english}>{b.name_english}</option>)}
                {!books.length && <option value="1 Thessalonians">1 Thessalonians</option>}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Chapter *</label><input type="number" min={1} value={form.scripture_chapter} onChange={e => set(e, 'scripture_chapter', e.target.value)} placeholder="Chapter #" className={inputCls} /></div>
              <div><label className={labelCls}>Verse *</label><input type="number" min={1} value={form.scripture_verse} onChange={e => set(e, 'scripture_verse', e.target.value)} placeholder="Verse #" className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Author</label><input value={form.author} onChange={e => set(e, 'author', e.target.value)} placeholder="Pr. Denis" className={inputCls} /></div>
            <div className="md:col-span-2"><label className={labelCls + ' flex items-center gap-1.5'}><ImageIcon size={15} /> Cover Photo URL</label><input value={form.cover_photo_url} onChange={e => set(e, 'cover_photo_url', e.target.value)} placeholder="https://example.com/image.jpg" className={inputCls} />{form.cover_photo_url && <img src={form.cover_photo_url} alt="" className="mt-2 w-32 h-32 object-cover rounded-lg shadow" />}</div>
            <div className="md:col-span-3"><label className={labelCls}>Devotional Title *</label><input value={form.title} onChange={e => set(e, 'title', e.target.value)} placeholder="Devotional title..." className={inputCls} /></div>
            <div className="md:col-span-3"><label className={labelCls}>Scripture Quotation <span className="text-xs font-normal text-gray-400">(KJV, verbatim)</span></label><textarea value={form.scripture_quotation} onChange={e => set(e, 'scripture_quotation', e.target.value)} rows={2} placeholder="“To the end he may stablish your hearts…”" className={inputCls} /></div>
            <div className="md:col-span-3"><label className={labelCls + ' flex items-center gap-1.5'}><Languages size={15} /> Devotional Text (English) * <span className="text-xs font-normal text-gray-400">Use the 5 sections: Scripture Reading / Reflection / Practical Application / Meditation / Short Prayer</span></label><textarea value={form.devotional_text} onChange={e => set(e, 'devotional_text', e.target.value)} rows={10} placeholder="<h3>Scripture Reading — ...</h3>..." className={inputCls} /></div>
            <div className="md:col-span-3"><label className={labelCls + ' flex items-center gap-1.5'}><Languages size={15} /> Devotional Text (Luganda) <span className="text-xs font-normal text-gray-400">(optional — leave blank, do not invent)</span></label><textarea value={form.devotional_text_lu} onChange={e => set(e, 'devotional_text_lu', e.target.value)} rows={5} className={inputCls} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Further Reading Scriptures</label><input value={form.further_readings} onChange={e => set(e, 'further_readings', e.target.value)} placeholder="Hebrews 13:8; Psalms 112:6–8" className={inputCls} /><p className="text-[11px] text-gray-400 mt-1">Separate with ; — the app makes each one tappable.</p></div>
            <div><label className={labelCls}>Related Scriptures <span className="text-xs font-normal text-gray-400">(JSON array, optional)</span></label><textarea value={form.related_scriptures} onChange={e => set(e, 'related_scriptures', e.target.value)} rows={2} placeholder='[{"book":"Hebrews","chapter":13,"verse":8,"text":"..."}]' className={inputCls + ' font-mono text-xs'} /></div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 mt-6">
            {editingId && <button onClick={() => { setEditingId(null); setForm({ ...EMPTY, devotional_number: nextNumber(entries) }); }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold">Cancel edit</button>}
            <button onClick={() => setForm({ ...EMPTY, devotional_number: nextNumber(entries) })} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold">Clear</button>
            <button onClick={handleManualSave} disabled={saving} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update Devotional' : 'Save Devotional →'}</button>
          </div>
          <p className="text-xs text-gray-400 mt-3">After saving, the number auto-advances (+1) and Author / Cover / Book stay filled — so you can enter the next one quickly.</p>
        </div>
      )}

      {/* ══════════ BULK ══════════ */}
      {subTab === 'bulk' && (
        <div className="space-y-5 mb-8">
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg p-5 sm:p-6 shadow-lg">
            <h2 className="font-bold text-xl flex items-center gap-2"><Upload size={20} /> Bulk Import — many devotionals at once</h2>
            <p className="text-white/85 text-sm mt-1">Prepare one JSON file with entries numbered 001, 002, 003… (e.g. a full month = 30 entries), upload it, check the preview, then import. Duplicates are caught before anything is saved.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={downloadSample} className="px-4 py-2.5 rounded-full bg-white text-violet-700 font-bold text-xs flex items-center gap-1.5"><Download size={14} /> Download sample JSON</button>
              <button onClick={() => downloadTemplate(30)} className="px-4 py-2.5 rounded-full bg-white/15 border border-white/30 font-bold text-xs flex items-center gap-1.5"><FileJson size={14} /> Blank template — next 30 numbers</button>
              <button onClick={() => downloadTemplate(31)} className="px-4 py-2.5 rounded-full bg-white/15 border border-white/30 font-bold text-xs flex items-center gap-1.5"><Calendar size={14} /> Blank template — next 31 numbers</button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-5 sm:p-6">
            <label className="text-sm font-bold">If a number already exists…</label>
            <div className="flex gap-2 mt-1 max-w-md"><button onClick={() => setBulkMode('skip')} className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm border ${bulkMode === 'skip' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-300'}`}>⏭️ Skip it</button><button onClick={() => setBulkMode('replace')} className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm border ${bulkMode === 'replace' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-300'}`}>♻️ Replace it</button></div>
            <p className="text-[11px] text-gray-400 mt-1">{bulkMode === 'skip' ? 'Safe default — existing numbers are never overwritten.' : 'Use when re-uploading a corrected batch.'}</p>

            <div className="mt-5"><label className="text-sm font-bold">1 · Upload a .json file</label>
              <div onClick={() => fileRef.current?.click()} className="mt-1 border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/50 rounded-2xl p-6 text-center cursor-pointer transition"><Upload size={28} className="mx-auto text-violet-500 mb-2" /><p className="font-bold text-sm">{bulkFileName ? `📄 ${bulkFileName}` : 'Click to choose a .json file'}</p><p className="text-xs text-gray-500 mt-1">…or paste the JSON below</p></div>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => handleBulkFile(e.target.files?.[0])} />
            </div>
            <div className="mt-4"><label className="text-sm font-bold">2 · …or paste JSON</label><textarea value={bulkText} onChange={e => { setBulkText(e.target.value); setBulkFileName(''); }} rows={7} placeholder='{"entries": [ {"devotional_number":"001","title":"…","devotional_text":"…","scripture_book":"Psalms","scripture_chapter":1,"scripture_verse":1} ]}' className={inputCls + ' font-mono text-xs'} />
              <div className="flex flex-wrap gap-2 mt-3"><button onClick={() => parseBulk(bulkText)} className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-xs">Validate & Preview</button><button onClick={() => { setBulkText(''); setBulkPreview([]); setBulkErrors([]); setBulkFileName(''); setBulkResult(null); }} className="px-5 py-2.5 rounded-full bg-gray-100 font-bold text-xs flex items-center gap-1"><Trash2 size={13} /> Clear</button></div>
            </div>
            {bulkErrors.length > 0 && <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4"><p className="font-bold text-red-800 text-sm flex items-center gap-1.5"><AlertTriangle size={15} /> Fix these before importing ({bulkErrors.length})</p><ul className="text-red-700 text-xs mt-2 space-y-1 list-disc pl-5">{bulkErrors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
            {bulkPreview.length > 0 && (
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h3 className="font-bold flex items-center gap-1.5"><CheckCircle2 size={17} className="text-emerald-500" /> Preview — {bulkPreview.length} entries {bulkErrors.length === 0 ? '· ready to import' : '· has errors'}</h3><span className="text-xs font-bold text-gray-500">#{bulkPreview[0]?.devotional_number} → #{bulkPreview[bulkPreview.length - 1]?.devotional_number}</span></div>
                <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">{bulkPreview.map((r, i) => (<div key={i} className="flex gap-3 px-4 py-3"><span className="shrink-0 w-16 text-xs font-bold bg-violet-50 text-violet-700 rounded-full px-2 py-1 text-center h-fit">#{r.devotional_number}</span><div className="min-w-0"><p className="font-bold text-sm truncate">{r.title || '(no title)'}</p><p className="text-xs text-gray-500 truncate">{r.scripture_book} {r.scripture_chapter}:{r.scripture_verse}{r.devotional_text_lu ? ' · EN + LUG' : ' · EN only'}</p></div></div>))}</div>
                <button onClick={handleBulkImport} disabled={bulkImporting || bulkErrors.length > 0} className="mt-4 w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm disabled:opacity-50">{bulkImporting ? 'Importing…' : `Import ${bulkPreview.length} Devotionals →`}</button>
              </div>
            )}
            {bulkResult && <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm font-semibold text-emerald-800">✅ Done — {bulkResult.inserted ?? 0} added · {bulkResult.updated ?? 0} replaced · {bulkResult.skipped ?? 0} skipped{bulkResult.errors?.length ? ` · ${bulkResult.errors.length} row errors` : ''}</div>}
            <details className="mt-5 bg-gray-50 rounded-lg p-4 text-xs leading-relaxed text-gray-600"><summary className="font-bold text-sm text-gray-800 cursor-pointer">What does the JSON look like? (click to open)</summary><pre className="mt-3 overflow-x-auto bg-white border rounded-lg p-3 font-mono">{JSON.stringify(SAMPLE, null, 2)}</pre><p className="mt-2"><b>Required per entry:</b> devotional_number, title, devotional_text, scripture_book, scripture_chapter, scripture_verse. <b>Optional:</b> devotional_text_lu, scripture_quotation, further_readings, author, cover_photo_url, related_scriptures.</p></details>
          </div>
        </div>
      )}

      {/* ══════════ SAVED LIST ══════════ */}
      <div className="bg-white rounded-lg shadow-lg p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-lg">Saved Devotionals <span className="text-gray-400 font-semibold text-sm">({entries.length})</span></h2>
          <div className="relative w-full sm:w-64"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title / number…" className="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-blue-300" /></div>
        </div>
        {loading && <p className="text-gray-500 text-sm font-semibold">Loading…</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm font-semibold">No devotionals yet — use Manual for one, or Bulk for many at once.</p>}
        <div className="divide-y divide-gray-50">
          {filtered.map(e => (
            <div key={e.id ?? e.devotional_number} className="flex items-center gap-3 py-3">
              <span className="shrink-0 text-xs font-bold bg-violet-50 text-violet-700 rounded-full px-2.5 py-1">#{String(e.devotional_number || '')}</span>
              <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{e.title}</p><p className="text-xs text-gray-500 truncate">{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse}{e.author ? ` · ${e.author}` : ''}</p></div>
              <button onClick={() => loadIntoForm(e)} className="px-3 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-1"><Pencil size={13} /> Edit</button>
              <button onClick={() => deleteEntry(e)} className="px-3 py-2 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1"><Trash2 size={13} /> Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES NEEDED (save these two files, replacing your old ones):
//
// 1) app/api/devotional-entries/route.ts  — GET list + POST one + PUT edit + DELETE
//    Your current GET probably already works. Add/keep POST + PUT handling
//    devotional_number (not scheduled_date). If your table still REQUIRES
//    scheduled_date, make it nullable in Neon first (SQL below).
//
// 2) app/api/devotional-entries/bulk/route.ts — POST { mode, entries[] }
//    See: route-bulk-devotional-entries-BY-NUMBER.ts (already given, plan_id optional)
//
// NEON SQL (run once):
//   ALTER TABLE devotional_entries ADD COLUMN IF NOT EXISTS devotional_number TEXT;
//   CREATE UNIQUE INDEX IF NOT EXISTS uq_devotional_entries_number
//     ON devotional_entries (devotional_number);
//   ALTER TABLE devotional_entries ALTER COLUMN scheduled_date DROP NOT NULL;
// ─────────────────────────────────────────────────────────────────────────────
