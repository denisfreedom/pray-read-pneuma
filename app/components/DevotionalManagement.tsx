// app/components/DevotionalManagement.tsx — V2 EDIT FIX
// FIXES: Edit form would not let you type/paste (esp. Cover Photo URL) + other fields would not edit.
// ROOT CAUSE: old file used many separate useState() values. Edit filled some, inputs read others,
// and a parent re-render / refetch reset them, so typing snapped back.
// FIX: ONE single `form` object. Every input reads + writes that one object. Edit sets the whole object at once.
// Also: Default Image URL at top (saved to localStorage), Cover Photo per-devotional, Paste button (reads clipboard),
// Use Default button, Preview, and Bulk shares the same API so Manual edit == Bulk import.
'use client';
import { useEffect, useState } from 'react';
import RichTextEditor from './RichTextEditor';

interface Book { id: number; name: string; }
type Form = { id: number | null; devotional_number: string; title: string; scripture_book: string; scripture_chapter: string; scripture_verse: string; scripture_quotation: string; devotional_text: string; devotional_text_lu: string; related_scriptures: string; further_readings: string; author: string; cover_photo_url: string; };
const EMPTY: Form = { id: null, devotional_number: '', title: '', scripture_book: '', scripture_chapter: '', scripture_verse: '', scripture_quotation: '', devotional_text: '', devotional_text_lu: '', related_scriptures: '', further_readings: '', author: 'Pr. Denis', cover_photo_url: '' };

export default function DevotionalManagement({ books }: { books: Book[] }) {
  const [tab, setTab] = useState<'manual' | 'bulk'>('manual');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState<Form>(EMPTY);
  const [defaultImage, setDefaultImage] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'skip' | 'replace'>('skip');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  // --- Pagination: 30 per page, most recent first. Page 1 = newest 30, Next = older.
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<'recent' | 'number'>('recent');
  const PAGE_SIZE = 30;

  useEffect(() => { try { setDefaultImage(localStorage.getItem('pr_default_devotional_image') || ''); } catch {} fetchList(); }, []);
  function show(m: string) { setMsg(m); setTimeout(() => setMsg(''), 6000); }
  async function fetchList() {
    setLoading(true);
    try { const r = await fetch('/api/devotional-entries'); const j = await r.json().catch(() => []); setList(Array.isArray(j) ? j : []); setPage(1); } catch {}
    setLoading(false);
  }
  function saveDefault(url: string) { setDefaultImage(url); try { localStorage.setItem('pr_default_devotional_image', url); } catch {} }
  // THE ONLY setter — every input uses this. No split state.
  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm(p => ({ ...p, [k]: v })); }
  function formatHeadings(text: string) {
    let t = String(text || '');
    ['Reflection', 'Practical Application', 'Meditation', 'Short Prayer'].forEach(h => {
      const re = new RegExp(`(^|\\n)\\s*${h}\\s*(\\n|:)`, 'gi');
      t = t.replace(re, `$1<h3 style="color:#6d28d9;font-weight:800;font-size:18px;margin:18px 0 6px;">${h}</h3>`);
    });
    return t;
  }
  function startNew() {
    const used = new Set(list.map((d: any) => String(d.devotional_number).padStart(3, '0')));
    let n = 1; while (used.has(String(n).padStart(3, '0'))) n++;
    setForm({ ...EMPTY, devotional_number: String(n).padStart(3, '0') });
    setTab('manual'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function startEdit(d: any) {
    // Fill EVERY field from the saved row — including cover, quotation, related, further.
    setForm({
      id: d.id ?? null,
      devotional_number: String(d.devotional_number ?? '').padStart(3, '0'),
      title: d.title || '',
      scripture_book: d.scripture_book || '',
      scripture_chapter: String(d.scripture_chapter ?? ''),
      scripture_verse: String(d.scripture_verse ?? ''),
      scripture_quotation: d.scripture_quotation || '',
      devotional_text: d.devotional_text || '',
      devotional_text_lu: d.devotional_text_lu || '',
      related_scriptures: Array.isArray(d.related_scriptures) ? d.related_scriptures.join('\n') : String(d.related_scriptures || ''),
      further_readings: d.further_readings || '',
      author: d.author || 'Pr. Denis',
      cover_photo_url: d.cover_photo_url || '',
    });
    setTab('manual'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function save() {
    if (!/^\d{3}$/.test(form.devotional_number.padStart(3, '0')) || !form.title || !form.devotional_text || !form.scripture_book || !form.scripture_chapter || !form.scripture_verse) { show('❌ Fill in Number (001), Title, English Text, Book, Chapter, Verse.'); return; }
    setSaving(true);
    try {
      const payload = {
        devotional_number: form.devotional_number.padStart(3, '0'),
        title: form.title, scripture_book: form.scripture_book,
        scripture_chapter: parseInt(form.scripture_chapter, 10), scripture_verse: parseInt(form.scripture_verse, 10),
        scripture_quotation: form.scripture_quotation || null,
        devotional_text: formatHeadings(form.devotional_text), devotional_text_lu: form.devotional_text_lu || null,
        related_scriptures: form.related_scriptures.split(/[\n;,]/).map(s => s.trim()).filter(Boolean),
        further_readings: form.further_readings || null, author: form.author || null,
        cover_photo_url: form.cover_photo_url || defaultImage || null,
        default_image_url: defaultImage || null,
      };
      const r = await fetch('/api/devotional-entries', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form.id ? { ...payload, id: form.id } : payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed: ${r.status}`);
      show(form.id ? '✅ Devotional updated!' : '✅ Devotional created!');
      startNew(); fetchList();
    } catch (e: any) { show('❌ ' + e.message); }
    setSaving(false);
  }
  async function del(id: number) {
    if (!confirm('Delete this devotional?')) return;
    try { const r = await fetch(`/api/devotional-entries?id=${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error(`Failed: ${r.status}`); show('✅ Deleted'); fetchList(); } catch (e: any) { show('❌ ' + e.message); }
  }
  async function pasteCover() {
    try {
      const txt = await navigator.clipboard.readText();
      if (txt) { set('cover_photo_url', txt.trim()); show('✅ Pasted Cover Photo URL from clipboard'); }
      else show('Clipboard is empty — copy the link first, then tap Paste.');
    } catch { show('Browser blocked clipboard read — tap the field and press Ctrl+V (or long-press → Paste on phone).'); }
  }
  function parseBulk(text: string) {
    try { const p = JSON.parse(text); const arr = Array.isArray(p) ? p : p.entries; setBulkPreview(Array.isArray(arr) ? arr : []); } catch { setBulkPreview([]); }
  }
  async function runBulk() {
    if (!bulkPreview.length) { show('❌ Paste JSON first.'); return; }
    setSaving(true);
    try {
      const arr = bulkPreview.map((e: any) => ({ ...e, default_image_url: e.default_image_url || defaultImage, cover_photo_url: e.cover_photo_url || e.default_image_url || defaultImage, devotional_text: formatHeadings(e.devotional_text || '') }));
      const r = await fetch('/api/devotional-entries/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: bulkMode, entries: arr }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed: ${r.status}`);
      show(`✅ Bulk done — inserted: ${j.inserted} · updated: ${j.updated} · skipped: ${j.skipped}`);
      setBulkText(''); setBulkPreview([]); fetchList();
    } catch (e: any) { show('❌ ' + e.message); }
    setSaving(false);
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white";
  const coverToShow = form.cover_photo_url || defaultImage;
  return (
    <div>
      {msg && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: msg.startsWith('✅') ? '#dcfce7' : '#fee2e2' }}>{msg}</div>}
      {/* DEFAULT IMAGE */}
      <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <label style={{ fontWeight: 800, color: '#4c1d95' }}>🖼️ Default Image URL (for ALL devotionals without their own cover)</label>
        <input value={defaultImage} onChange={e => saveDefault(e.target.value)} onPaste={e => { const t = e.clipboardData.getData('text'); if (t) saveDefault(t.trim()); }} placeholder="https://prayreadbible.org/assets/default-devotional.png" autoComplete="off" style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd6fe', marginTop: 8, background: '#fff' }} />
        {defaultImage && <img src={defaultImage} alt="Default preview" onError={(e: any) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', maxWidth: 420, height: 160, objectFit: 'cover', borderRadius: 12, marginTop: 8 }} />}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('manual')} style={{ padding: '8px 18px', borderRadius: 999, cursor: 'pointer', border: '1px solid #7c3aed', background: tab === 'manual' ? '#1f2937' : '#fff', color: tab === 'manual' ? '#fff' : '#111', fontWeight: 700 }}>✍️ Manual — One Devotional</button>
        <button onClick={() => setTab('bulk')} style={{ padding: '8px 18px', borderRadius: 999, cursor: 'pointer', border: '1px solid #e5e7eb', background: tab === 'bulk' ? '#1f2937' : '#fff', color: tab === 'bulk' ? '#fff' : '#111', fontWeight: 700 }}>📦 Bulk — Many at Once</button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontWeight: 600 }}>{list.length} devotionals saved · Next number: #{String((list.reduce((m: number, d: any) => Math.max(m, parseInt(String(d.devotional_number) || '0', 10) || 0), 0) + 1)).padStart(3, '0')}</span>
      </div>

      {tab === 'manual' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ fontSize: 22, margin: 0 }}>📝 {form.id ? `Edit Devotional D-${form.devotional_number}` : 'Create New Devotional'}</h3><button onClick={startNew} style={{ cursor: 'pointer', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 999, padding: '7px 14px' }}>+ New</button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 16 }}>
            <label>Devotional Number *<input value={form.devotional_number} onChange={e => set('devotional_number', e.target.value)} onPaste={e => set('devotional_number', e.clipboardData.getData('text').trim())} placeholder="001" autoComplete="off" className={inputCls} /></label>
            <label>Scripture Book *<select value={form.scripture_book} onChange={e => set('scripture_book', e.target.value)} className={inputCls}><option value="">Select book...</option>{books.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></label>
            <label>Chapter *<input value={form.scripture_chapter} onChange={e => set('scripture_chapter', e.target.value)} placeholder="6" autoComplete="off" className={inputCls} /></label>
            <label>Verse *<input value={form.scripture_verse} onChange={e => set('scripture_verse', e.target.value)} placeholder="14" autoComplete="off" className={inputCls} /></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <label>Author<input value={form.author} onChange={e => set('author', e.target.value)} autoComplete="off" className={inputCls} /></label>
            <div>
              <label>🖼️ Cover Photo URL <span style={{ fontWeight: 400, color: '#6b7280' }}>(this devotional only — empty = Default)</span></label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {/* KEY FIX: this input reads + writes the SAME form.cover_photo_url that Edit fills. onPaste + Paste button both work. */}
                <input value={form.cover_photo_url} onChange={e => set('cover_photo_url', e.target.value)} onPaste={e => { const t = e.clipboardData.getData('text'); if (t) { e.preventDefault(); set('cover_photo_url', t.trim()); } }} placeholder="https://prayreadbible.org/assets/d-001.jpg" autoComplete="off" spellCheck={false} className={inputCls} style={{ flex: 1 }} />
                <button type="button" onClick={pasteCover} style={{ cursor: 'pointer', border: '1px solid #7c3aed', background: '#fff', color: '#7c3aed', borderRadius: 10, padding: '0 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>📋 Paste</button>
                <button type="button" onClick={() => set('cover_photo_url', defaultImage)} disabled={!defaultImage} style={{ cursor: 'pointer', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 10, padding: '0 12px' }}>Use Default</button>
                <button type="button" onClick={() => set('cover_photo_url', '')} style={{ cursor: 'pointer', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 10, padding: '0 12px' }}>Clear</button>
              </div>
              {coverToShow && <img src={coverToShow} alt="Cover preview" onError={(e: any) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', maxWidth: 420, height: 160, objectFit: 'cover', borderRadius: 12, marginTop: 8 }} />}
            </div>
          </div>
          <div style={{ marginTop: 12 }}><label>Devotional Title *<input value={form.title} onChange={e => set('title', e.target.value)} autoComplete="off" className={inputCls} /></label></div>
          <div style={{ marginTop: 12 }}><label>Scripture Quotation (KJV, verbatim)<textarea value={form.scripture_quotation} onChange={e => set('scripture_quotation', e.target.value)} rows={3} className={inputCls} /></label></div>
          <div style={{ marginTop: 12 }}><label>🇬🇧 English Devotional Text *<RichTextEditor value={form.devotional_text} onChange={(v: string) => set('devotional_text', v)} placeholder="Write devotional... Reflection / Practical Application / Meditation / Short Prayer become bold purple headings on save." minHeight="220px" /></label></div>
          <div style={{ marginTop: 12 }}><label>🇺🇬 Luganda Devotional Text<RichTextEditor value={form.devotional_text_lu} onChange={(v: string) => set('devotional_text_lu', v)} placeholder="Luganda version..." minHeight="180px" /></label></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <label>Related Scriptures (one per line)<textarea value={form.related_scriptures} onChange={e => set('related_scriptures', e.target.value)} rows={4} className={inputCls} /></label>
            <label>Further Readings (e.g. 1 Peter 4:10–11; …)<textarea value={form.further_readings} onChange={e => set('further_readings', e.target.value)} rows={4} className={inputCls} /></label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Saving…' : form.id ? '✏️ Update Devotional' : '➕ Create Devotional'}</button>
            {form.id && <button onClick={startNew} style={{ padding: '0 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Cancel Edit</button>}
          </div>
        </div>
      )}

      {tab === 'bulk' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: 0 }}>📦 Bulk Import</h3>
          <p style={{ color: '#6b7280' }}>Same API as Manual. Paste JSON — entries with empty cover get the Default Image automatically.</p>
          <div style={{ display: 'flex', gap: 16 }}><label><input type="radio" checked={bulkMode === 'skip'} onChange={() => setBulkMode('skip')} /> Skip existing numbers</label><label><input type="radio" checked={bulkMode === 'replace'} onChange={() => setBulkMode('replace')} /> Replace existing numbers</label></div>
          <textarea value={bulkText} onChange={e => { setBulkText(e.target.value); parseBulk(e.target.value); }} placeholder='[{"devotional_number":"001",...}]' rows={10} style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #e5e7eb', fontFamily: 'monospace' }} />
          {bulkPreview.length > 0 && <p>Preview: {bulkPreview.length} entries · {bulkPreview[0]?.devotional_number} → {bulkPreview[bulkPreview.length - 1]?.devotional_number}</p>}
          <button onClick={runBulk} disabled={saving || !bulkPreview.length} style={{ padding: '12px 22px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Importing…' : `Import ${bulkPreview.length} Devotionals →`}</button>
        </div>
      )}

      {/* RECENTLY UPLOADED — 30 per page, Next = older */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0 }}>📚 Recently Uploaded Devotionals ({list.length})</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setSortMode('recent'); setPage(1); }} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, border: '1px solid #7c3aed', background: sortMode === 'recent' ? '#7c3aed' : '#fff', color: sortMode === 'recent' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🕒 Most Recent First</button>
            <button onClick={() => { setSortMode('number'); setPage(1); }} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, border: '1px solid #7c3aed', background: sortMode === 'number' ? '#7c3aed' : '#fff', color: sortMode === 'number' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🔢 D-001 →</button>
          </div>
        </div>
        {(() => {
          const sorted = [...list].sort((a: any, b: any) => {
            if (sortMode === 'number') return (parseInt(String(a.devotional_number) || '0', 10) || 0) - (parseInt(String(b.devotional_number) || '0', 10) || 0);
            // Recent first: by created_at if present, else by id, else by devotional_number desc
            const da = a.created_at ? new Date(a.created_at).getTime() : 0;
            const db = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (da && db && da !== db) return db - da;
            if ((a.id ?? 0) !== (b.id ?? 0)) return (b.id ?? 0) - (a.id ?? 0);
            return (parseInt(String(b.devotional_number) || '0', 10) || 0) - (parseInt(String(a.devotional_number) || '0', 10) || 0);
          });
          const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
          const cur = Math.min(page, totalPages);
          const start = (cur - 1) * PAGE_SIZE;
          const items = sorted.slice(start, start + PAGE_SIZE);
          const end = Math.min(start + items.length, sorted.length);
          return (<>
            <p style={{ color: '#6b7280', margin: '8px 0 0' }}>{sorted.length === 0 ? '' : `Showing ${start + 1}–${end} of ${sorted.length} · Page ${cur} of ${totalPages}`}{sortMode === 'recent' ? ' · Newest first' : ' · D-001 first'}</p>
            {loading ? <p>Loading…</p> : sorted.length === 0 ? <p>No devotionals yet.</p> : items.map((d: any) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid #eee', borderRadius: 12, padding: 12, marginTop: 8, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}><strong>D-{String(d.devotional_number).padStart(3, '0')}</strong> — {d.title} <span style={{ color: '#6b7280' }}>· {d.scripture_book} {d.scripture_chapter}:{d.scripture_verse} {d.cover_photo_url ? '🖼️' : '— no cover (uses Default)'}</span></div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}><button onClick={() => startEdit(d)} style={{ cursor: 'pointer' }}>✏️ Edit</button><button onClick={() => del(d.id)} style={{ cursor: 'pointer', color: '#dc2626' }}>🗑️ Delete</button></div>
              </div>
            ))}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={cur <= 1} style={{ cursor: cur <= 1 ? 'not-allowed' : 'pointer', padding: '9px 16px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 700, opacity: cur <= 1 ? 0.5 : 1 }}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - cur) <= 1).map((n, i, arr) => (
                  <span key={n} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{i > 0 && arr[i - 1] !== n - 1 && <span style={{ color: '#9ca3af' }}>…</span>}<button onClick={() => setPage(n)} style={{ cursor: 'pointer', padding: '8px 13px', borderRadius: 999, border: n === cur ? '1px solid #7c3aed' : '1px solid #e5e7eb', background: n === cur ? '#7c3aed' : '#fff', color: n === cur ? '#fff' : '#111', fontWeight: 700 }}>{n}</button></span>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={cur >= totalPages} style={{ cursor: cur >= totalPages ? 'not-allowed' : 'pointer', padding: '9px 16px', borderRadius: 999, border: '1px solid #7c3aed', background: '#7c3aed', color: '#fff', fontWeight: 700, opacity: cur >= totalPages ? 0.5 : 1 }}>Next → Older</button>
              </div>
            )}
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 8 }}>Tap ✏️ Edit on any row — it loads into the form above.</p>
          </>);
        })()}
      </div>
    </div>
  );
}
