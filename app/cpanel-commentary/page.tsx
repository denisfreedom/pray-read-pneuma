"use client";
import { useState, useEffect, useMemo } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import { Search, Edit2, Trash2, Save, X, MessageCircle, Upload, FileJson, CheckCircle2 } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';

// app/components/CommentaryPanel.tsx — MANUAL + BULK
// Manual: 3 modes — Book Commentary | Chapter Commentary | Verse Commentary (matches admin screenshot).
// Bulk: ONE JSON file can carry book + chapter + verse commentary for a whole book.
//   On upload it DISTRIBUTES at once: book -> Book section, chapter -> Chapter section, verse -> Verse section.
//   Replace ON (default): re-uploading the same book/chapter/verse OVERWRITES it. Turn off to skip existing.
//   Edit: every uploaded row appears in the list below and can be Edited / Deleted like a manual one.
// Bulk JSON format (flexible — all key variants accepted):
// {
//   "book": "Genesis", "book_number": 1,
//   "book_commentary": {"en":"...","lu":"..."} | "plain string",
//   "chapters": [
//     { "chapter": 1, "commentary": {"en":"...","lu":"..."},
//       "verses": [ {"verse":1,"commentary":{"en":"...","lu":"..."}}, {"verse":2,"commentary":"..."} ] },
//     { "chapter": 2, "chapter_commentary": {"en":"..."}, "verses": [...] }
//   ],
//   "verses": [ {"chapter":1,"verse":1,"commentary":{"en":"..."}} ]  // flat alternative
// }
// Also accepts: [ {...book...}, {...book...} ] (array of books) or { "books": [...] }.
// Field aliases: commentary / commentary_text / text_english / en / english ; luganda / lu / text_luganda / luganda_commentary_text

type Level = 'book' | 'chapter' | 'verse';
type Mode = 'manual' | 'bulk';
interface Book { id: number; book_number: number; name: string; abbreviation?: string; testament?: string; total_chapters?: number; }
interface Row { id?: number; level: Level; book_id: number; book_number?: number; book_name?: string; chapter: number; verse_number: number; en: string; lu: string; }

const stripHtml = (h: string) => { if (!h) return ''; const d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; };
function normText(v: any): { en: string; lu: string } {
  if (!v) return { en: '', lu: '' };
  if (typeof v === 'string') return { en: v, lu: '' };
  return {
    en: v.en ?? v.english ?? v.text_english ?? v.commentary_text ?? v.commentary ?? v.text ?? '',
    lu: v.lu ?? v.luganda ?? v.text_luganda ?? v.luganda_commentary_text ?? v.luganda_text ?? v.lu_text ?? '',
  };
}
function normChapter(c: any) {
  const ch = c.chapter ?? c.chapter_number ?? c.chapterNumber ?? 0;
  const txt = normText(c.commentary ?? c.chapter_commentary ?? c.text ?? c);
  return { chapter: Number(ch), en: txt.en, lu: txt.lu, verses: Array.isArray(c.verses) ? c.verses : [] };
}
// Parse ANY bulk shape -> { bookName, bookNumber, book: {en,lu}, chapters: [{chapter,en,lu,verses:[{chapter,verse,en,lu}]}] }
function parseBulk(json: any) {
  const booksRaw = Array.isArray(json) ? json : Array.isArray(json?.books) ? json.books : [json];
  return booksRaw.map((b: any) => {
    const bookName = b.book ?? b.book_name ?? b.name ?? '';
    const bookNumber = Number(b.book_number ?? b.bookNumber ?? b.book_id ?? 0);
    const bookTxt = normText(b.book_commentary ?? b.bookCommentary ?? b.book_text ?? null);
    const chapters: any[] = [];
    (b.chapters || []).forEach((c: any) => {
      const nc = normChapter(c);
      chapters.push({ ...nc, verses: nc.verses.map((v: any) => ({ chapter: nc.chapter, verse: Number(v.verse ?? v.verse_number ?? 0), ...normText(v.commentary ?? v) })) });
    });
    // Flat verses: [{chapter, verse, commentary}]
    (b.verses || []).forEach((v: any) => {
      const ch = Number(v.chapter ?? 0);
      let target = chapters.find(x => x.chapter === ch);
      if (!target) { target = { chapter: ch, en: '', lu: '', verses: [] }; chapters.push(target); }
      const txt = normText(v.commentary ?? v);
      target.verses.push({ chapter: ch, verse: Number(v.verse ?? v.verse_number ?? 0), en: txt.en, lu: txt.lu });
    });
    // Legacy: chapter_commentary / verse_commentary single objects
    if (b.chapter_commentary && !chapters.length) { const nc = normChapter({ chapter: b.chapter ?? 1, commentary: b.chapter_commentary }); chapters.push({ ...nc, verses: [] }); }
    return { bookName, bookNumber, book: bookTxt, chapters };
  });
}

export default function CommentaryPanel() {
  const [books, setBooks] = useState<Book[]>([]);
  const [mode, setMode] = useState<Mode>('manual');
  const [level, setLevel] = useState<Level>('book'); // manual mode tab
  const [selectedBook, setSelectedBook] = useState('');
  const [chapter, setChapter] = useState('1');
  const [verseNumber, setVerseNumber] = useState('1');
  const [en, setEn] = useState(''); const [lu, setLu] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); const [filterLevel, setFilterLevel] = useState<'all' | Level>('all');
  // Bulk
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsed, setBulkParsed] = useState<any[] | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 4000); };
  const fetchBooks = async () => { try { const r = await fetch('/api/bible-books'); const d = await r.json(); setBooks(Array.isArray(d) ? d : (d.books || [])); } catch {} };
  const fetchRows = async () => {
    // Fetch all 3 levels in parallel; each endpoint may 404 if not yet created — treat as empty
    const urls: [Level, string][] = [['book', '/api/book-commentaries'], ['chapter', '/api/chapter-commentaries'], ['verse', '/api/commentaries']];
    const all: Row[] = [];
    for (const [lvl, url] of urls) {
      try {
        const r = await fetch(url); if (!r.ok) continue; const d = await r.json().catch(() => null);
        const arr = Array.isArray(d) ? d : (d?.commentaries || d?.data || d?.rows || (d && typeof d === 'object' ? [d] : []));
        arr.forEach((c: any) => {
          const t = normText(c.commentary ?? c);
          // Some rows store en/lu under commentary_text fields — normText already handles it
          const en2 = c.commentary_text ?? c.text_english ?? t.en; const lu2 = c.luganda_commentary_text ?? c.text_luganda ?? t.lu;
          const bn = Number(c.book_number ?? c.bookNumber ?? 0);
          const book = books.find(b => b.id === c.book_id || b.book_number === bn || b.name === c.book_name);
          all.push({ id: c.id, level: lvl, book_id: c.book_id ?? book?.id ?? 0, book_number: bn || book?.book_number, book_name: c.book_name || book?.name || '', chapter: Number(c.chapter ?? 0), verse_number: Number(c.verse_number ?? c.verse ?? 0), en: String(en2 || ''), lu: String(lu2 || '') });
        });
      } catch {}
    }
    setRows(all);
  };
  useEffect(() => { fetchBooks(); }, []);
  useEffect(() => { if (books.length) fetchRows(); }, [books.length]);

  // Load existing row into manual form when book/chapter/verse/level changes
  useEffect(() => {
    if (mode !== 'manual' || !selectedBook) return;
    const book = books.find(b => b.name === selectedBook); if (!book) return;
    const found = rows.find(r => r.level === level && r.book_id === book.id && r.chapter === Number(chapter || 0) && (level === 'verse' ? r.verse_number === Number(verseNumber || 0) : true));
    setEn(found?.en || ''); setLu(found?.lu || ''); setEditing(found || null);
  }, [selectedBook, chapter, verseNumber, level, mode, rows.length]);

  const saveManual = async () => {
    const book = books.find(b => b.name === selectedBook);
    if (!book) return flash('❌ Please select a book');
    if (level !== 'book' && !chapter) return flash('❌ Please enter chapter');
    if (level === 'verse' && !verseNumber) return flash('❌ Please enter verse');
    if (!en.trim() && !lu.trim()) return flash('❌ Enter at least English or Luganda commentary');
    setSaving(true);
    try {
      const endpoint = level === 'book' ? '/api/book-commentaries' : level === 'chapter' ? '/api/chapter-commentaries' : '/api/commentaries';
      const body: any = level === 'book'
        ? { bookId: book.id, book_number: book.book_number, commentaryText: en.trim() || null, lugandaCommentaryText: lu.trim() || null, commentary_text: en.trim() || null, luganda_commentary_text: lu.trim() || null }
        : level === 'chapter'
        ? { bookId: book.id, book_number: book.book_number, chapter: Number(chapter), commentaryText: en.trim() || null, lugandaCommentaryText: lu.trim() || null, commentary_text: en.trim() || null, luganda_commentary_text: lu.trim() || null }
        : { bookId: book.id, book_number: book.book_number, chapter: Number(chapter), verseNumber: Number(verseNumber), verse_number: Number(verseNumber), commentaryText: en.trim() || null, lugandaCommentaryText: lu.trim() || null, commentary_text: en.trim() || null, luganda_commentary_text: lu.trim() || null };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text().catch(() => 'Save failed'));
      flash('✅ Commentary saved');
      await fetchRows();
    } catch (e: any) { flash('❌ ' + (e.message || 'Save failed')); } finally { setSaving(false); }
  };

  const editRow = (r: Row) => {
    setMode('manual'); setLevel(r.level);
    const book = books.find(b => b.id === r.book_id); if (book) setSelectedBook(book.name);
    setChapter(String(r.chapter || 1)); setVerseNumber(String(r.verse_number || 1));
    setEn(r.en); setLu(r.lu); setEditing(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const deleteRow = async (r: Row) => {
    if (!confirm(`Delete ${r.level} commentary for ${r.book_name} ${r.level === 'book' ? '' : r.chapter}${r.level === 'verse' ? ':' + r.verse_number : ''}?`)) return;
    try {
      const endpoint = r.level === 'book' ? `/api/book-commentaries?bookId=${r.book_id}` : r.level === 'chapter' ? `/api/chapter-commentaries?bookId=${r.book_id}&chapter=${r.chapter}` : `/api/commentaries?bookId=${r.book_id}&chapter=${r.chapter}&verseNumber=${r.verse_number}`;
      const res = await fetch(endpoint, { method: 'DELETE' }); if (!res.ok) throw new Error('Delete failed');
      flash('✅ Deleted'); await fetchRows();
    } catch (e: any) { flash('❌ ' + e.message); }
  };

  // ---- BULK ----
  const onBulkFile = async (f: File | null) => {
    setBulkFile(f); setBulkResult(null); setBulkParsed(null);
    if (!f) return;
    try { const txt = await f.text(); const json = JSON.parse(txt); setBulkParsed(parseBulk(json)); }
    catch { flash('❌ That file is not valid JSON'); }
  };
  const bulkCounts = useMemo(() => {
    if (!bulkParsed) return null;
    let b = 0, c = 0, v = 0;
    bulkParsed.forEach((bk: any) => { if (bk.book.en || bk.book.lu) b++; bk.chapters.forEach((ch: any) => { if (ch.en || ch.lu) c++; v += ch.verses.filter((x: any) => x.en || x.lu).length; }); });
    return { books: b, chapters: c, verses: v, total: b + c + v };
  }, [bulkParsed]);
  const uploadBulk = async () => {
    if (!bulkParsed) return flash('❌ Choose a JSON file first');
    setUploading(true); setBulkResult(null);
    try {
      const res = await fetch('/api/commentaries/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ books: bulkParsed, replace: replaceExisting }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bulk upload failed');
      setBulkResult(data);
      flash(`✅ Bulk done — ${data.book ?? 0} book, ${data.chapters ?? 0} chapters, ${data.verses ?? 0} verses (${data.replaced ?? 0} replaced, ${data.skipped ?? 0} skipped)`);
      await fetchRows();
    } catch (e: any) { flash('❌ ' + e.message); } finally { setUploading(false); }
  };

  const filtered = rows.filter(r =>
    (filterLevel === 'all' || r.level === filterLevel) &&
    (!searchTerm || `${r.book_name} ${r.chapter}:${r.verse_number} ${stripHtml(r.en)} ${stripHtml(r.lu)}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const book = books.find(b => b.name === selectedBook);
  const levelLabel = level === 'book' ? 'Book Commentary' : level === 'chapter' ? 'Chapter Commentary' : 'Verse Commentary';

  return (
    <div className="min-h-screen bg-gray-50"><AdminNavbar />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="text-blue-600" /> Commentary Management</h2>
          {message && <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${message.startsWith('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}
          {/* Mode tabs: Manual | Bulk */}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>✏️ Manual Entry</button>
            <button onClick={() => setMode('bulk')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${mode === 'bulk' ? 'bg-teal-600 text-white' : 'bg-slate-100'}`}>📦 Bulk Upload (JSON)</button>
          </div>
        </div>

        {mode === 'manual' ? (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            {/* Level tabs: Book | Chapter | Verse — matches screenshot */}
            <div className="flex flex-wrap gap-2 mb-5">
              {([['book', '📕 Book Commentary'], ['chapter', '📄 Chapter Commentary'], ['verse', '✝ Verse Commentary']] as [Level, string][]).map(([l, label]) => (
                <button key={l} onClick={() => setLevel(l)} className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${level === l ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 text-slate-700'}`}>{label}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div><label className="block text-sm font-medium mb-1">Book</label><select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} className="w-full px-3 py-2 border rounded-lg"><option value="">Select book…</option>{books.map(b => <option key={b.id} value={b.name}>{b.book_number}. {b.name}</option>)}</select></div>
              {level !== 'book' && <div><label className="block text-sm font-medium mb-1">Chapter</label><input type="number" min={1} max={book?.total_chapters || 150} value={chapter} onChange={e => setChapter(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>}
              {level === 'verse' && <div><label className="block text-sm font-medium mb-1">Verse</label><input type="number" min={1} value={verseNumber} onChange={e => setVerseNumber(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>}
            </div>
            {editing && <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">✏️ Editing existing {level} commentary — Save will <b>replace</b> it.</p>}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-blue-300 rounded-lg p-4 bg-blue-50"><h4 className="font-semibold text-blue-900 mb-2">English — {levelLabel}</h4><RichTextEditor value={en} onChange={setEn} placeholder="Enter English commentary…" defaultColor="blue" /></div>
              <div className="border border-purple-300 rounded-lg p-4 bg-purple-50"><h4 className="font-semibold text-purple-900 mb-2">Luganda — {levelLabel}</h4><RichTextEditor value={lu} onChange={setLu} placeholder="Wandiika kunnyonnyola mu Luganda…" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveManual} disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"><Save size={18} />{saving ? 'Saving…' : editing ? 'Update Commentary (Replace)' : 'Save Commentary'}</button>
              <button onClick={() => { setEn(''); setLu(''); setEditing(null); }} className="px-5 py-3 bg-gray-200 rounded-lg font-medium flex items-center gap-2"><X size={18} /> Clear</button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-bold text-lg mb-1">📦 Bulk Upload — Book + Chapter + Verse in one file</h3>
            <p className="text-sm text-slate-500 mb-4">One JSON file can carry a whole book. On upload it distributes at once: <b>book_commentary → Book</b>, <b>chapters[].commentary → Chapter</b>, <b>chapters[].verses[] → Verse</b>. Re-uploading replaces what’s there.</p>
            <label className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-teal-300 rounded-xl bg-teal-50 cursor-pointer hover:bg-teal-100">
              <Upload size={20} className="text-teal-700" /><span className="font-semibold text-teal-800">{bulkFile ? bulkFile.name : 'Choose JSON File'}</span>
              <input type="file" accept=".json,application/json" className="hidden" onChange={e => onBulkFile(e.target.files?.[0] || null)} />
            </label>
            {bulkParsed && bulkCounts && (
              <div className="mt-4 rounded-xl border p-4 bg-slate-50">
                <p className="font-semibold text-sm mb-2 flex items-center gap-2"><FileJson size={16} /> Preview — will distribute to:</p>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-white rounded-lg p-3"><p className="text-2xl font-bold text-teal-700">{bulkCounts.books}</p><p className="text-slate-500">Book</p></div>
                  <div className="bg-white rounded-lg p-3"><p className="text-2xl font-bold text-blue-700">{bulkCounts.chapters}</p><p className="text-slate-500">Chapters</p></div>
                  <div className="bg-white rounded-lg p-3"><p className="text-2xl font-bold text-purple-700">{bulkCounts.verses}</p><p className="text-slate-500">Verses</p></div>
                </div>
                {bulkParsed.map((b: any, i: number) => <p key={i} className="text-[12px] text-slate-500 mt-2">📕 {b.bookName || `Book ${b.bookNumber}`} — {b.chapters.length} chapter(s) in file</p>)}
                <label className="flex items-center gap-2 mt-3 text-sm font-medium"><input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} /> Replace existing commentary on re-upload (recommended)</label>
                {!replaceExisting && <p className="text-[12px] text-amber-600 mt-1">With replace OFF, rows that already exist are skipped, not overwritten.</p>}
                <button onClick={uploadBulk} disabled={uploading} className="w-full mt-3 py-3 rounded-lg bg-teal-600 text-white font-semibold disabled:opacity-50">{uploading ? 'Uploading…' : `Upload & Distribute (${bulkCounts.total} items)`}</button>
              </div>
            )}
            {bulkResult && <p className="mt-3 text-sm text-green-700 flex items-center gap-1.5"><CheckCircle2 size={16} /> Saved: {bulkResult.book ?? 0} book · {bulkResult.chapters ?? 0} chapters · {bulkResult.verses ?? 0} verses · {bulkResult.replaced ?? 0} replaced · {bulkResult.skipped ?? 0} skipped</p>}
            <details className="mt-4 text-[12px] text-slate-500"><summary className="cursor-pointer font-semibold text-slate-700">See JSON format</summary><pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">{`{
  "book": "Genesis", "book_number": 1,
  "book_commentary": { "en": "Genesis is...", "lu": "..." },
  "chapters": [
    { "chapter": 1, "commentary": { "en": "Chapter 1...", "lu": "..." },
      "verses": [
        { "verse": 1, "commentary": { "en": "In the beginning...", "lu": "..." } }
      ] }
  ]
}`}</pre></details>
          </div>
        )}

        {/* List — all levels, editable */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold">Existing Commentaries ({filtered.length})</h3>
            <div className="flex gap-1 ml-auto">
              {(['all', 'book', 'chapter', 'verse'] as const).map(l => <button key={l} onClick={() => setFilterLevel(l)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize ${filterLevel === l ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{l}</button>)}
            </div>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-9 pr-3 py-2 border rounded-lg text-sm w-[220px]" /></div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-100 border-b"><th className="px-3 py-2 text-left">LEVEL</th><th className="px-3 py-2 text-left">REFERENCE</th><th className="px-3 py-2 text-left">ENGLISH</th><th className="px-3 py-2 text-left">LUGANDA</th><th className="px-3 py-2 text-left">ACTIONS</th></tr></thead>
            <tbody>{filtered.length ? filtered.map((r, i) => (
              <tr key={`${r.level}-${r.book_id}-${r.chapter}-${r.verse_number}-${i}`} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${r.level === 'book' ? 'bg-teal-100 text-teal-800' : r.level === 'chapter' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{r.level}</span></td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{r.book_name || `Book ${r.book_id}`} {r.level === 'book' ? '' : r.chapter}{r.level === 'verse' ? `:${r.verse_number}` : ''}</td>
                <td className="px-3 py-2 text-slate-600">{stripHtml(r.en).slice(0, 80) || <span className="italic text-slate-400">No English</span>}</td>
                <td className="px-3 py-2 text-slate-600">{stripHtml(r.lu).slice(0, 80) || <span className="italic text-slate-400">No Luganda</span>}</td>
                <td className="px-3 py-2"><div className="flex gap-1.5"><button onClick={() => editRow(r)} className="px-2.5 py-1 bg-blue-500 text-white rounded flex items-center gap-1 text-[12px]"><Edit2 size={12} /> Edit</button><button onClick={() => deleteRow(r)} className="px-2.5 py-1 bg-red-500 text-white rounded flex items-center gap-1 text-[12px]"><Trash2 size={12} /> Delete</button></div></td>
              </tr>
            )) : <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No commentaries yet.</td></tr>}</tbody></table></div>
        </div>
      </div>
    </div>
  );
}
