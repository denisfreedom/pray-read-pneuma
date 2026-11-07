// components/BookChapterBulkImport.tsx
'use client';
import { useState } from 'react';

export default function BookChapterBulkImport() {
  const [fileName, setFileName] = useState('');
  const [data, setData] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  function countRefs(v: any) {
    if (!v?.cross_references) return 0;
    return Array.isArray(v.cross_references) ? v.cross_references.length : 1;
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setStatus('');
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(String(r.result));
        setData(j);
        const chapters = j.chapters || [];
        const verses = chapters.reduce((a: number, c: any) => a + (c.verses?.length || 0), 0);
        const pray = chapters.reduce((a: number, c: any) => a + (c.verses?.filter((v: any) => v.pray_read || v.pray_read_english)?.length || 0), 0);
        const xrefs = chapters.reduce((a: number, c: any) => a + (c.verses?.reduce((b: number, v: any) => b + countRefs(v), 0) || 0), 0);
        setPreview({
          book: j.book || j.book_name || '?',
          chapters: chapters.length,
          verses, pray, xrefs,
          hasBookIntro: !!(j.introduction || j.introduction_english),
          hasBookClosing: !!(j.closing_prayer || j.closing_prayer_english),
          hasChapterIntro: chapters.filter((c: any) => c.introduction || c.introduction_english).length,
          hasChapterClosing: chapters.filter((c: any) => c.closing_prayer || c.closing_prayer_english).length,
        });
      } catch (err: any) { setStatus('❌ Invalid JSON: ' + err.message); }
    };
    r.readAsText(f);
  }

  async function doImport() {
    if (!data) return;
    setBusy(true); setStatus('⏳ Importing…');
    try {
      const res = await fetch('/api/book-chapter-bulk-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await res.json();
      if (!res.ok) setStatus('❌ ' + (j.error || 'Import failed'));
      else setStatus(`✅ Imported ${j.book} — chapters: ${j.counts.chapters}, verses: ${j.counts.verses}, pray-read: ${j.counts.pray_read}, cross-refs: ${j.counts.cross_refs}`);
    } catch (e: any) { setStatus('❌ ' + e.message); }
    setBusy(false);
  }

  function downloadTemplate() {
    const tpl = { book: '3 John', introduction: 'Book introduction…', closing_prayer: 'Book closing prayer…', chapters: [{ chapter: 1, introduction: 'Chapter intro…', closing_prayer: 'Chapter closing…', verses: [{ verse: 1, pray_read: 'Prayer…', cross_references: ['John 14:6', '1 John 3:18'] }] }] };
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'book-chapter-bulk-import-template.json'; a.click();
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, margin: '16px 0', background: '#fff' }}>
      <h3 style={{ margin: '0 0 8px' }}>📚 Book Chapter Bulk Import</h3>
      <p style={{ margin: '0 0 12px', color: '#555' }}>Upload ONE JSON per book: Book Intro + Chapter Intro + Verse Pray-Read + Cross-References + Chapter Closing + Book Closing. It allocates to the right tabs automatically.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={downloadTemplate} style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>⬇️ Download Template</button>
        <label style={{ padding: '8px 14px', borderRadius: 8, background: '#111', color: '#fff', cursor: 'pointer' }}>📂 Choose JSON File<input type="file" accept=".json,application/json" onChange={onFile} style={{ display: 'none' }} /></label>
      </div>
      {fileName && <p style={{ marginTop: 10 }}>File: <b>{fileName}</b></p>}
      {preview && (
        <div style={{ marginTop: 12, background: '#f6f6f6', borderRadius: 8, padding: 12 }}>
          <b>Preview — {preview.book}</b>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>{preview.chapters} chapter(s) · {preview.verses} verses · {preview.pray} pray-read · {preview.xrefs} cross-ref entries</li>
            <li>Book intro: {preview.hasBookIntro ? '✓' : '—'} · Book closing: {preview.hasBookClosing ? '✓' : '—'}</li>
            <li>Chapter intros: {preview.hasChapterIntro} · Chapter closings: {preview.hasChapterClosing}</li>
          </ul>
        </div>
      )}
      {preview && <button onClick={doImport} disabled={busy} style={{ marginTop: 12, padding: '10px 18px', borderRadius: 8, background: '#0a7a42', color: '#fff', cursor: 'pointer', border: 'none' }}>{busy ? 'Importing…' : '🚀 Import Whole Book'}</button>}
      {status && <p style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{status}</p>}
    </div>
  );
}
