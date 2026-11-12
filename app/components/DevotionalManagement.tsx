// app/admin/.../DevotionalAdminTab.tsx — V3: Default Image URL + Cover Photo URL
// Paste this over your existing DevotionalAdminTab file. One file, one commit.
// - DEFAULT IMAGE URL: paste once, saved in browser + sent with bulk import. Used for EVERY devotional that has no Cover Photo.
// - COVER PHOTO URL: per-devotional. If filled, it wins over the default.
// - Both fields accept a direct image link (https://...jpg / .png / .webp). Preview shows below the field.
'use client';
import { useEffect, useState } from 'react';

export default function DevotionalAdminTab() {
  const [tab, setTab] = useState<'manual' | 'bulk'>('manual');
  const [defaultImageUrl, setDefaultImageUrl] = useState('');
  const [form, setForm] = useState({ devotional_number: '', title: '', scripture_book: '', scripture_chapter: '', scripture_verse: '', scripture_quotation: '', devotional_text: '', devotional_text_lu: '', further_readings: '', related_scriptures: '', cover_photo_url: '', author: 'Pr. Denis' });
  const [bulkJson, setBulkJson] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  // --- SAVED LIST (was missing entirely) ---
  const [saved, setSaved] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<'recent' | 'number'>('recent');
  const PAGE_SIZE = 30;
  async function fetchSaved() {
    setListLoading(true);
    try { const r = await fetch('/api/devotional-entries'); const j = await r.json().catch(() => []); setSaved(Array.isArray(j) ? j : []); setPage(1); } catch {}
    setListLoading(false);
  }
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { try { setDefaultImageUrl(localStorage.getItem('pr_default_devotional_image') || ''); } catch {} fetchSaved(); }, []);
  function saveDefault(url: string) {
    setDefaultImageUrl(url);
    try { localStorage.setItem('pr_default_devotional_image', url); } catch {}
  }
  function set(key: string, val: string) { setForm((p: any) => ({ ...p, [key]: val })); }

  // Wrap plain subheadings in bold purple <h3> before saving — so pasted text like
  // "Reflection\n..." becomes <h3 style="color:#6d28d9...">Reflection</h3>
  function formatHeadings(text: string) {
    let t = String(text || '');
    const heads = ['Reflection', 'Practical Application', 'Meditation', 'Short Prayer', 'Related Scriptures', 'Further Reading', 'Further Reading Scriptures', 'Prayer', 'Application'];
    heads.forEach(h => {
      const re = new RegExp(`(^|\\n)\\s*${h}\\s*(\\n|:)`, 'gi');
      t = t.replace(re, `$1<h3 style="color:#6d28d9;font-weight:800;font-size:18px;margin:18px 0 6px;">${h}</h3>`);
    });
    return t;
  }

  async function saveManual() {
    setBusy(true); setMsg('');
    try {
      const payload = { ...form, devotional_number: parseInt(form.devotional_number, 10), scripture_chapter: parseInt(form.scripture_chapter, 10) || 0, scripture_verse: parseInt(form.scripture_verse, 10) || 0, devotional_text: formatHeadings(form.devotional_text), default_image_url: defaultImageUrl, cover_photo_url: form.cover_photo_url || defaultImageUrl };
      const r = await fetch('/api/devotional-entries', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setMsg('✅ Saved ' + (payload.devotional_number ? 'D-' + String(payload.devotional_number).padStart(3, '0') : 'devotional') + '. It will show with the default image unless you gave it its own cover.');
      setEditingId(null); fetchSaved();
    } catch (e: any) { setMsg('❌ ' + e.message); }
    setBusy(false);
  }

  async function bulkImport() {
    setBusy(true); setMsg('');
    try {
      let arr = JSON.parse(bulkJson);
      if (!Array.isArray(arr)) arr = [arr];
      // Fill default_image_url into every entry that has no cover
      arr = arr.map((e: any) => ({ ...e, default_image_url: e.default_image_url || defaultImageUrl, cover_photo_url: e.cover_photo_url || e.default_image_url || defaultImageUrl, devotional_text: formatHeadings(e.devotional_text || '') }));
      const r = await fetch('/api/devotional-entries/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Bulk import failed');
      setMsg('✅ Bulk import done: ' + JSON.stringify(j));
      setBulkJson(''); fetchSaved();
    } catch (e: any) { setMsg('❌ ' + e.message); }
    setBusy(false);
  }

  function startEdit(d: any) {
    setForm({
      devotional_number: String(d.devotional_number ?? '').padStart(3, '0'),
      title: d.title || '',
      scripture_book: d.scripture_book || '',
      scripture_chapter: String(d.scripture_chapter ?? ''),
      scripture_verse: String(d.scripture_verse ?? ''),
      scripture_quotation: d.scripture_quotation || '',
      devotional_text: d.devotional_text || '',
      devotional_text_lu: d.devotional_text_lu || '',
      further_readings: d.further_readings || '',
      related_scriptures: Array.isArray(d.related_scriptures) ? d.related_scriptures.join('\n') : String(d.related_scriptures || ''),
      cover_photo_url: d.cover_photo_url || '',
      author: d.author || 'Pr. Denis',
    });
    setEditingId(d.id ?? null);
    setTab('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMsg('✏️ Editing D-' + String(d.devotional_number).padStart(3, '0') + ' — change anything, then Save Devotional.');
  }
  async function deleteSaved(id: number) {
    if (!confirm('Delete this devotional?')) return;
    try { const r = await fetch(`/api/devotional-entries?id=${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error('Delete failed'); setMsg('✅ Deleted'); fetchSaved(); } catch (e: any) { setMsg('❌ ' + e.message); }
  }
  const field = (label: string, key: string, ph = '', ta = false) => (
    <label style={{ display: 'block', marginBottom: 12 }}>{label}
      {ta
        ? <textarea value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph} rows={6} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb', marginTop: 4 }} />
        : <input value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb', marginTop: 4 }} />}
    </label>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: '0 0 4px' }}>Devotionals — Admin</h3>
      <p style={{ color: '#6b7280', margin: '0 0 16px' }}>Upload one by one, or paste a whole month as JSON.</p>

      {/* DEFAULT IMAGE — NEW */}
      <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <label style={{ fontWeight: 800, color: '#4c1d95' }}>🖼️ Default Image URL (applies to ALL devotionals without their own cover)</label>
        <input value={defaultImageUrl} onChange={e => saveDefault(e.target.value)} placeholder="Paste image link here — e.g. https://your-site.com/images/default-devotional.jpg" style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd6fe', marginTop: 8 }} />
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Tip: upload the image to your site / Vercel / Cloudinary first, then paste its direct link here. It is saved automatically and sent with every manual + bulk save.</div>
        {defaultImageUrl && <div style={{ marginTop: 10 }}><div style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95' }}>PREVIEW — this is what devotionals without a cover will show:</div><img src={defaultImageUrl} alt="Default preview" style={{ width: '100%', maxWidth: 420, height: 180, objectFit: 'cover', borderRadius: 12, marginTop: 6 }} /></div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('manual')} style={{ padding: '8px 18px', borderRadius: 999, cursor: 'pointer', border: '1px solid #7c3aed', background: tab === 'manual' ? '#7c3aed' : '#fff', color: tab === 'manual' ? '#fff' : '#7c3aed', fontWeight: 700 }}>Manual Upload</button>
        <button onClick={() => setTab('bulk')} style={{ padding: '8px 18px', borderRadius: 999, cursor: 'pointer', border: '1px solid #7c3aed', background: tab === 'bulk' ? '#7c3aed' : '#fff', color: tab === 'bulk' ? '#fff' : '#7c3aed', fontWeight: 700 }}>Bulk Import (JSON)</button>
      </div>

      {tab === 'manual' ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {field('Devotional Number (e.g. 257 → shows as D-257)', 'devotional_number', '257')}
            {field('Title', 'title', 'Serving in the Strength God Supplies')}
            {field('Scripture Book', 'scripture_book', '1 Peter')}
            {field('Scripture Chapter', 'scripture_chapter', '4')}
            {field('Scripture Verse', 'scripture_verse', '11')}
            {field('Author', 'author', 'Pr. Denis')}
          </div>
          {field('Scripture Quotation (KJV)', 'scripture_quotation', '“If any man speak…”', true)}
          {field('Devotional Text — paste with Reflection / Practical Application / Meditation / Short Prayer on their own lines. Headings become bold purple automatically.', 'devotional_text', 'Reflection\n...', true)}
          {field('Luganda Text (optional)', 'devotional_text_lu', '', true)}
          {field('Related Scriptures (one per line)', 'related_scriptures', 'Colossians 3:17 — ...', true)}
          {field('Further Readings (e.g. 1 Peter 4:10–11; Colossians 3:16–17; …)', 'further_readings', '1 Peter 4:10–11; Colossians 3:16–17; …')}
          <label style={{ display: 'block', marginBottom: 12 }}>🖼️ Cover Photo URL (this devotional only — leave empty to use Default Image above)
            <input value={form.cover_photo_url} onChange={e => set('cover_photo_url', e.target.value)} placeholder="https://…/this-devotional.jpg  — leave empty = use Default Image" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb', marginTop: 4 }} />
          </label>
          {(form.cover_photo_url || defaultImageUrl) && <img src={form.cover_photo_url || defaultImageUrl} alt="Cover preview" style={{ width: '100%', maxWidth: 420, height: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />}
          <button onClick={saveManual} disabled={busy} style={{ padding: '12px 22px', borderRadius: 12, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Saving…' : editingId ? '✏️ Update Devotional' : 'Save Devotional'}</button>
        </div>
      ) : (
        <div>
          <p style={{ color: '#6b7280' }}>Paste JSON array. Each entry may have <code>cover_photo_url</code> and/or <code>default_image_url</code>. Empty cover = Default Image above is filled in automatically on import.</p>
          <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)} rows={14} placeholder='[{"devotional_number":257,"title":"...","scripture_book":"1 Peter",...}]' style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'monospace' }} />
          <button onClick={bulkImport} disabled={busy} style={{ marginTop: 12, padding: '12px 22px', borderRadius: 12, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Importing…' : 'Import JSON'}</button>
        </div>
      )}
      {/* SAVED / ALREADY UPLOADED — 30 per page, Next = older */}
      <div style={{ marginTop: 22, borderTop: '1px solid #eee', paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0 }}>📚 Already Uploaded Devotionals ({saved.length})</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setSortMode('recent'); setPage(1); }} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, border: '1px solid #7c3aed', background: sortMode === 'recent' ? '#7c3aed' : '#fff', color: sortMode === 'recent' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🕒 Most Recent First</button>
            <button onClick={() => { setSortMode('number'); setPage(1); }} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, border: '1px solid #7c3aed', background: sortMode === 'number' ? '#7c3aed' : '#fff', color: sortMode === 'number' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🔢 D-001 →</button>
            <button onClick={fetchSaved} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff' }}>↻ Refresh</button>
          </div>
        </div>
        {(() => {
          const sorted = [...saved].sort((a: any, b: any) => {
            if (sortMode === 'number') return (parseInt(String(a.devotional_number) || '0', 10) || 0) - (parseInt(String(b.devotional_number) || '0', 10) || 0);
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
            {listLoading ? <p>Loading…</p> : sorted.length === 0 ? <p>No devotionals saved yet. Upload one above.</p> : items.map((d: any) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid #eee', borderRadius: 12, padding: 12, marginTop: 8, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}><strong>D-{String(d.devotional_number).padStart(3, '0')}</strong> — {d.title} <span style={{ color: '#6b7280' }}>· {d.scripture_book} {d.scripture_chapter}:{d.scripture_verse} {d.cover_photo_url ? '🖼️' : '— no cover (uses Default)'}</span></div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}><button onClick={() => startEdit(d)} style={{ cursor: 'pointer' }}>✏️ Edit</button><button onClick={() => deleteSaved(d.id)} style={{ cursor: 'pointer', color: '#dc2626' }}>🗑️ Delete</button></div>
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
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 8 }}>Tap ✏️ Edit on any row — it loads into the Manual form above.</p>
          </>);
        })()}
      </div>
      {msg && <p style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>{msg}</p>}
    </div>
  );
}
