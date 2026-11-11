// app/components/DevotionalManagement.tsx — FIXED for number-based API
// Keeps your RichTextEditor, styling, and layout. Changes:
//  1) Scheduled Date -> Devotional Number (001, 002...)
//  2) Sends devotional_number (required by /api/devotional-entries v3), no scheduled_date / is_published
//  3) related_scriptures sent as array, not string
//  4) Saved list shows #number, not Invalid Date
//  5) ADDED Bulk tab: paste JSON -> preview list -> "Import N Devotionals" button that REALLY calls /api/devotional-entries/bulk
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, BookOpen } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface Book { id: number; name: string; }

interface DevotionalEntry {
  id: number;
  devotional_number: string;
  title: string;
  devotional_text: string;
  devotional_text_lu?: string | null;
  scripture_book: string;
  scripture_chapter: number;
  scripture_verse: number;
  scripture_quotation?: string | null;
  related_scriptures?: string[] | string | null;
  further_readings?: string | null;
  author?: string | null;
  cover_photo_url?: string | null;
}

export default function DevotionalManagement({ books }: { books: Book[] }) {
  const [tab, setTab] = useState<'manual' | 'bulk'>('manual');
  const [devotionals, setDevotionals] = useState<DevotionalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Manual form — Number instead of Scheduled Date
  const [devotionalNumber, setDevotionalNumber] = useState('001');
  const [title, setTitle] = useState('');
  const [devotionalText, setDevotionalText] = useState('');
  const [devotionalTextLu, setDevotionalTextLu] = useState('');
  const [scriptureBook, setScriptureBook] = useState('');
  const [scriptureChapter, setScriptureChapter] = useState('');
  const [scriptureVerse, setScriptureVerse] = useState('');
  const [scriptureQuotation, setScriptureQuotation] = useState('');
  const [relatedScriptures, setRelatedScriptures] = useState('');
  const [furtherReadings, setFurtherReadings] = useState('');
  const [author, setAuthor] = useState('Pr. Denis');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');

  // Bulk form
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'skip' | 'replace'>('skip');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState('');

  useEffect(() => { fetchDevotionals(); }, []);

  const fetchDevotionals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devotional-entries');
      if (res.ok) { const data = await res.json(); setDevotionals(Array.isArray(data) ? data : []); }
    } catch (e) { console.error('Error fetching devotionals:', e); }
    finally { setLoading(false); }
  };

  const showMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 5000); };

  const clearForm = () => {
    setEditingId(null); setDevotionalNumber('001'); setTitle(''); setDevotionalText(''); setDevotionalTextLu('');
    setScriptureBook(''); setScriptureChapter(''); setScriptureVerse(''); setScriptureQuotation('');
    setRelatedScriptures(''); setFurtherReadings(''); setAuthor('Pr. Denis'); setCoverPhotoUrl('');
  };

  const handleSave = async () => {
    if (!/^\d{3}$/.test(devotionalNumber.padStart(3, '0')) || !title || !devotionalText || !scriptureBook || !scriptureChapter || !scriptureVerse) {
      showMessage('❌ Fill in Devotional Number (001), Title, English Text, Book, Chapter, Verse.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        devotional_number: devotionalNumber.padStart(3, '0'),
        title,
        devotional_text: devotionalText,
        devotional_text_lu: devotionalTextLu || null,
        scripture_book: scriptureBook,
        scripture_chapter: parseInt(scriptureChapter),
        scripture_verse: parseInt(scriptureVerse),
        scripture_quotation: scriptureQuotation || null,
        // API expects an ARRAY — split on ; or ,
        related_scriptures: relatedScriptures.split(/[;,]/).map(s => s.trim()).filter(Boolean),
        further_readings: furtherReadings || null,
        author: author || null,
        cover_photo_url: coverPhotoUrl || null,
      };
      const res = await fetch('/api/devotional-entries', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Failed: ${res.status}`); }
      showMessage(editingId ? '✅ Devotional updated!' : '✅ Devotional created!');
      clearForm(); fetchDevotionals();
    } catch (e) { showMessage('❌ Error: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };

  const handleEdit = (d: any) => {
    setEditingId(d.id);
    setDevotionalNumber(String(d.devotional_number || '').padStart(3, '0'));
    setTitle(d.title || ''); setDevotionalText(d.devotional_text || ''); setDevotionalTextLu(d.devotional_text_lu || '');
    setScriptureBook(d.scripture_book || ''); setScriptureChapter(String(d.scripture_chapter ?? '')); setScriptureVerse(String(d.scripture_verse ?? ''));
    setScriptureQuotation(d.scripture_quotation || '');
    setRelatedScriptures(Array.isArray(d.related_scriptures) ? d.related_scriptures.join('; ') : (d.related_scriptures || ''));
    setFurtherReadings(d.further_readings || ''); setAuthor(d.author || 'Pr. Denis'); setCoverPhotoUrl(d.cover_photo_url || '');
    setTab('manual'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this devotional?')) return;
    try {
      const res = await fetch(`/api/devotional-entries?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      showMessage('✅ Devotional deleted!'); fetchDevotionals();
    } catch (e) { showMessage('❌ Error: ' + (e instanceof Error ? e.message : String(e))); }
  };

  // ---- Bulk: parse -> preview -> import (this button REALLY calls the API) ----
  const parseBulk = (text: string) => {
    setBulkError(''); setBulkPreview([]);
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      const entries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(entries) || !entries.length) { setBulkError('No "entries" array found in that JSON.'); return; }
      setBulkPreview(entries);
    } catch { setBulkError('Paste valid JSON — the file starts with { and has "entries": [...]'); }
  };

  const runBulk = async () => {
    if (!bulkPreview.length) { showMessage('❌ Paste JSON first — preview must show your devotionals.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/devotional-entries/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: bulkMode, entries: bulkPreview }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Failed: ${res.status}`);
      showMessage(`✅ Done — inserted: ${j.inserted} · updated: ${j.updated} · skipped: ${j.skipped}` + (j.errors?.length ? ` · Errors: ${j.errors.slice(0, 3).join(' | ')}` : ''));
      setBulkText(''); setBulkPreview([]); fetchDevotionals();
    } catch (e) { showMessage('❌ Bulk error: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg font-medium ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button type="button" onClick={() => setTab('manual')} className={`px-5 py-2 rounded-full font-semibold ${tab === 'manual' ? 'bg-purple-600 text-white' : 'bg-white border border-purple-600 text-purple-600'}`}>✍️ Manual Entry</button>
        <button type="button" onClick={() => setTab('bulk')} className={`px-5 py-2 rounded-full font-semibold ${tab === 'bulk' ? 'bg-purple-600 text-white' : 'bg-white border border-purple-600 text-purple-600'}`}>📦 Bulk Import</button>
      </div>

      {tab === 'manual' && (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Calendar className="w-6 h-6" />{editingId ? 'Edit Devotional #' + devotionalNumber : 'Create New Devotional'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Devotional Number <span className="text-red-500">*</span></label>
            <input type="text" value={devotionalNumber} onChange={(e) => setDevotionalNumber(e.target.value)} placeholder="001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scripture Book <span className="text-red-500">*</span></label>
            <select value={scriptureBook} onChange={(e) => setScriptureBook(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <option value="">Select book...</option>{books.map(b => (<option key={b.id} value={b.name}>{b.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chapter <span className="text-red-500">*</span></label>
            <input type="number" value={scriptureChapter} onChange={(e) => setScriptureChapter(e.target.value)} placeholder="Chapter #" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Verse <span className="text-red-500">*</span></label>
            <input type="number" value={scriptureVerse} onChange={(e) => setScriptureVerse(e.target.value)} placeholder="Verse #" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo URL</label>
            <input type="text" value={coverPhotoUrl} onChange={(e) => setCoverPhotoUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Devotional Title <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Devotional title..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Scripture Quotation</label>
          <RichTextEditor value={scriptureQuotation} onChange={setScriptureQuotation} placeholder="Full text of the scripture verse..." minHeight="100px" />
        </div>
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
          <h4 className="font-bold text-gray-900 mb-4 text-center">📝 Devotional Text (English & Luganda)</h4>
          <p className="text-xs text-gray-600 mb-4 text-center">English is required. Luganda is optional.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">🇬🇧 English Devotional Text</label><RichTextEditor value={devotionalText} onChange={setDevotionalText} placeholder="Write your devotional content in English here..." minHeight="250px" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">🇺🇬 Luganda Devotional Text</label><RichTextEditor value={devotionalTextLu} onChange={setDevotionalTextLu} placeholder="Wandiika ebigambo by'okufumiitiriza mu Luganda wano..." minHeight="250px" /></div>
          </div>
        </div>
        <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">Related Scriptures</label><RichTextEditor value={relatedScriptures} onChange={setRelatedScriptures} placeholder="e.g., John 3:16; Romans 8:28; Philippians 4:13" minHeight="80px" /></div>
        <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">Further Readings</label><RichTextEditor value={furtherReadings} onChange={setFurtherReadings} placeholder="Suggested further reading passages..." minHeight="80px" /></div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400">{saving ? '💾 Saving...' : editingId ? '✏ Update Devotional' : '➕ Create Devotional'}</button>
          {editingId && (<button onClick={clearForm} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold">Cancel</button>)}
        </div>
      </div>
      )}

      {tab === 'bulk' && (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">📦 Bulk Import Devotionals</h3>
        <p className="text-sm text-gray-600 mb-4">Paste the whole JSON file (the one with <code>"entries": [...]</code>). Numbers must be <code>"001"</code>, <code>"002"</code>… — not dates.</p>
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={bulkMode === 'skip'} onChange={() => setBulkMode('skip')} /> Skip existing numbers</label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={bulkMode === 'replace'} onChange={() => setBulkMode('replace')} /> Replace existing numbers</label>
        </div>
        <textarea value={bulkText} onChange={(e) => { setBulkText(e.target.value); parseBulk(e.target.value); }} placeholder='Paste JSON here — { "entries": [ { "devotional_number": "001", ... } ] }' className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" style={{ minHeight: 220 }} />
        {bulkError && <div className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg">{bulkError}</div>}
        {bulkPreview.length > 0 && (
          <div className="mt-4 max-h-72 overflow-y-auto border rounded-lg">
            {bulkPreview.map((d: any, i: number) => (
              <div key={i} className="flex gap-3 px-4 py-3 border-b last:border-0">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold h-fit">#{String(d.devotional_number || '').padStart(3, '0')}</span>
                <div><div className="font-semibold">{d.title || '(no title)'}</div><div className="text-sm text-gray-600">{d.scripture_book} {d.scripture_chapter}:{d.scripture_verse} · {d.devotional_text_lu ? 'EN + LU' : 'EN only'}</div></div>
              </div>
            ))}
          </div>
        )}
        <button onClick={runBulk} disabled={saving || !bulkPreview.length} className="w-full mt-4 bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400">
          {saving ? '⏳ Importing…' : bulkPreview.length ? `Import ${bulkPreview.length} Devotionals →` : 'Import Devotionals →'}
        </button>
        <details className="mt-4 bg-gray-50 rounded-lg p-3 text-sm"><summary className="cursor-pointer font-semibold">▶ What does the JSON look like? (click to open)</summary><pre className="mt-2 overflow-x-auto">{`{ "entries": [ { "devotional_number": "001", "title": "...", "devotional_text": "...", "scripture_book": "Romans", "scripture_chapter": 6, "scripture_verse": 14 } ] }`}</pre></details>
      </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" />Saved Devotionals ({devotionals.length})</h3>
        {loading ? (<div className="text-center py-8 text-gray-600">Loading devotionals...</div>) : devotionals.length > 0 ? (
          <div className="space-y-3">{devotionals.map(d => (
            <div key={d.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3"><div className="flex-1">
                <div className="flex items-center gap-3 mb-2"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">#{String(d.devotional_number).padStart(3, '0')}</span><h4 className="font-bold text-gray-900">{d.title}</h4></div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2"><span className="flex items-center gap-1"><BookOpen size={14} />{d.scripture_book} {d.scripture_chapter}:{d.scripture_verse}</span>{d.author && (<span>By {d.author}</span>)}<span>{d.devotional_text_lu ? 'EN + LU' : 'EN only'}</span></div>
                <p className="text-gray-700 text-sm line-clamp-2">{d.devotional_text?.replace(/<[^>]+>/g, '')}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => handleEdit(d)} className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"><Edit2 size={18} /></button>
                <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
              </div></div>
            </div>
          ))}</div>
        ) : (<div className="text-center py-8 text-gray-600">No devotionals yet — use Manual for one, or Bulk for many at once.</div>)}
      </div>
    </div>
  );
}
