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
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { try { setDefaultImageUrl(localStorage.getItem('pr_default_devotional_image') || ''); } catch {} }, []);
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
      const r = await fetch('/api/devotional-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setMsg('✅ Saved ' + (payload.devotional_number ? 'D-' + String(payload.devotional_number).padStart(3, '0') : 'devotional') + '. It will show with the default image unless you gave it its own cover.');
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
    } catch (e: any) { setMsg('❌ ' + e.message); }
    setBusy(false);
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
          <button onClick={saveManual} disabled={busy} style={{ padding: '12px 22px', borderRadius: 12, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save Devotional'}</button>
        </div>
      ) : (
        <div>
          <p style={{ color: '#6b7280' }}>Paste JSON array. Each entry may have <code>cover_photo_url</code> and/or <code>default_image_url</code>. Empty cover = Default Image above is filled in automatically on import.</p>
          <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)} rows={14} placeholder='[{"devotional_number":257,"title":"...","scripture_book":"1 Peter",...}]' style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'monospace' }} />
          <button onClick={bulkImport} disabled={busy} style={{ marginTop: 12, padding: '12px 22px', borderRadius: 12, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Importing…' : 'Import JSON'}</button>
        </div>
      )}
      {msg && <p style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>{msg}</p>}
    </div>
  );
}
