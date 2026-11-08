"use client";

import { useState, useMemo } from 'react';

/* [STRIPPED 66 bytes] */
/*  BOOK CHAPTER BULK IMPORT — PRAY-READ                            */
/*  One JSON document per book. Paste or upload file.                */
/*  System allocates: book intro, chapter intro, verse pray-read,    */
/*  verse cross-refs, chapter closing prayer, book closing prayer.  */
/*  Same pattern as Bible Bulk Import.                               */
/* [STRIPPED 66 bytes] */

type ParsedRef = { book: string; chapter: number; verse: number };
type VerseBlock = {
  verse: number;
  pray_read?: string;
  pray_read_luganda?: string;
  cross_references?: string[]; // raw strings, e.g. "Romans 1:6" — parsed by server
};
type ChapterBlock = {
  chapter: number;
  introduction?: string;
  introduction_luganda?: string;
  verses: VerseBlock[];
  closing_prayer?: string;
  closing_prayer_luganda?: string;
};
type BookDoc = {
  book: string; // English name, e.g. "Genesis"
  introduction?: string;
  introduction_luganda?: string;
  closing_prayer?: string;
  closing_prayer_luganda?: string;
  chapters: ChapterBlock[];
};

const EXAMPLE: BookDoc = {
  book: 'Genesis',
  introduction: 'Genesis is the book of beginnings...',
  introduction_luganda: 'Olubereberye kitabo...',
  closing_prayer: 'Lord, thank You for Genesis...',
  closing_prayer_luganda: 'Mukama, webale...',
  chapters: [
    {
      chapter: 1,
      introduction: 'God creates heaven and earth...',
      introduction_luganda: 'Katonda yatonda eggulu n\'ensi...',
      verses: [
        { verse: 1, pray_read: 'In the beginning God created... Pray: Lord, You are Creator...', cross_references: ['John 1:1-3', 'Psalms 19:1'] },
        { verse: 2, pray_read: 'The Spirit hovered... Pray: Holy Spirit, hover over my life...', cross_references: ['John 3:5-8'] },
      ],
      closing_prayer: 'Father, Creator of all, I worship You...',
      closing_prayer_luganda: 'Kitange, Omutonzi wa byonna...',
    },
  ],
};

function downloadExample() {
  const blob = new Blob([JSON.stringify(EXAMPLE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'book-chapter-template-Genesis.json';
  a.click(); URL.revokeObjectURL(url);
}

export default function BookChapterBulkImport() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState('');
  const [overwrite, setOverwrite] = useState(true);

  // ---- Parse + preview (client-side, before any upload) ----
  const preview = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const doc = JSON.parse(text) as BookDoc;
      if (!doc.book || !Array.isArray(doc.chapters)) {
        return { error: 'Document must have "book" (English name) and "chapters" array.' };
      }
      let verseCount = 0, prayCount = 0, xrefCount = 0, chapterIntro = 0, closingCount = 0;
      const errors: string[] = [];
      for (const ch of doc.chapters) {
        if (!ch.chapter || !Array.isArray(ch.verses)) { errors.push(`Chapter block missing chapter number or verses array.`); continue; }
        if (ch.introduction) chapterIntro++;
        if (ch.closing_prayer) closingCount++;
        for (const v of ch.verses) {
          verseCount++;
          if (v.pray_read) prayCount++;
          if (v.cross_references) xrefCount += v.cross_references.length;
          if (!v.verse) errors.push(`Chapter ${ch.chapter}: verse block missing verse number.`);
        }
      }
      return {
        doc,
        stats: {
          book: doc.book,
          chapters: doc.chapters.length,
          verses: verseCount,
          prayRead: prayCount,
          crossRefsRaw: xrefCount,
          chapterIntros: chapterIntro,
          chapterClosings: closingCount,
          bookIntro: doc.introduction ? 1 : 0,
          bookClosing: doc.closing_prayer ? 1 : 0,
        },
        errors,
      };
    } catch (e) {
      return { error: `Invalid JSON: ${(e as Error).message}` };
    }
  }, [text]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult('');
    const t = await file.text();
    setText(t);
  };

  const handleImport = async () => {
    if (!preview || 'error' in preview || !preview.doc) return;
    if (preview.errors.length > 0 && !confirm(`${preview.errors.length} warning(s) found. Continue anyway?`)) return;
    setImporting(true);
    setResult('');
    try {
      // Send in chapter batches so a 50-chapter book never times out.
      const doc = preview.doc;
      let doneChapters = 0;
      for (const ch of doc.chapters) {
        setProgress(`Uploading ${doc.book} chapter ${ch.chapter} (${doneChapters + 1}/${doc.chapters.length})…`);
        const res = await fetch('/api/book-chapter-bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book: doc.book,
            introduction: doneChapters === 0 ? doc.introduction : undefined,
            introduction_luganda: doneChapters === 0 ? doc.introduction_luganda : undefined,
            closing_prayer: doneChapters === doc.chapters.length - 1 ? doc.closing_prayer : undefined,
            closing_prayer_luganda: doneChapters === doc.chapters.length - 1 ? doc.closing_prayer_luganda : undefined,
            chapter: ch,
            overwrite,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Chapter ${ch.chapter} failed (${res.status})`);
        doneChapters++;
      }
      setProgress('');
      setResult(`✅ DONE — ${doc.book}: ${preview.stats.chapters} chapters, ${preview.stats.verses} verses, ${preview.stats.prayRead} pray-read passages, ${preview.stats.crossRefsRaw} cross-ref entries, ${preview.stats.chapterIntros} chapter intros, ${preview.stats.chapterClosings} chapter closing prayers${preview.stats.bookIntro ? ', book intro' : ''}${preview.stats.bookClosing ? ', book closing prayer' : ''} saved. Re-uploading overwrites, never duplicates.`);
      setText(''); setFileName('');
    } catch (e) {
      setResult(`❌ Import stopped: ${(e as Error).message}. Chapters already uploaded stayed saved — fix the file and re-upload, it will overwrite only what you send.`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">📚 Book Chapter Bulk Import</h2>
          <p className="text-sm text-gray-600 mt-1">
            One document per book. System allocates everything to its chapter &amp; verse automatically.
            No verse-by-verse clicking.
          </p>
        </div>
        <button onClick={downloadExample} className="px-4 py-2 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-200 text-sm font-medium">
          ⬇ Download Template (Genesis example)
        </button>
      </div>

      {/* Format help */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <summary className="cursor-pointer font-semibold">📖 Document format — click to open</summary>
        <pre className="mt-3 bg-white p-3 rounded overflow-x-auto text-xs">{`{
  "book": "Genesis",                       // English name ONLY
  "introduction": "Book intro (English)...",
  "introduction_luganda": "Book intro (Luganda)...",
  "closing_prayer": "Book closing prayer (English)...",
  "closing_prayer_luganda": "Book closing prayer (Luganda)...",
  "chapters": [
    {
      "chapter": 1,
      "introduction": "Chapter 1 intro...",
      "introduction_luganda": "Chapter 1 intro Luganda...",
      "verses": [
        {
          "verse": 1,
          "pray_read": "Pray-read passage for Gen 1:1...",
          "pray_read_luganda": "Pray-read Luganda...",
          "cross_references": ["John 1:1-3", "Psalms 19:1", "Ex. 3:5"]
        }
      ],
      "closing_prayer": "Chapter 1 closing prayer...",
      "closing_prayer_luganda": "Chapter 1 closing Luganda..."
    }
  ]
}`}</pre>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>book</strong> must be English (Genesis, not Olubereberye) — same rule as Bible import.</li>
          <li><strong>cross_references</strong> use the SAME parser as the modal/cPanel: full or short names, ranges <code>John 17:11-12</code>, lists <code>John 8:1-5,6,7-8</code>, dotted <code>Ex. 3:5</code>, <code>Jn 6:4</code>.</li>
          <li>Every field is optional except <code>book</code>, <code>chapters[].chapter</code>, <code>verses[].verse</code>. Send only what you have.</li>
          <li>Re-uploading overwrites, never duplicates.</li>
        </ul>
      </details>

      {/* Upload */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-semibold">
          📂 Choose .json file
          <input type="file" accept=".json,application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
        {fileName && <span className="text-sm text-gray-600">📄 {fileName}</span>}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          Overwrite existing content for these chapters
        </label>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setResult(''); }}
        rows={10}
        placeholder='Paste your book document here, or choose a .json file above…'
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
      />

      {/* Preview */}
      {preview && 'error' in preview && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">❌ {preview.error}</div>
      )}
      {preview && !('error' in preview) && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-sm space-y-1">
          <p className="font-semibold text-green-900">👀 Preview — {preview.stats.book}</p>
          <p className="text-green-800">
            {preview.stats.chapters} chapters · {preview.stats.verses} verses · {preview.stats.prayRead} pray-read passages · {preview.stats.crossRefsRaw} cross-ref entries · {preview.stats.chapterIntros} chapter intros · {preview.stats.chapterClosings} chapter closing prayers · {preview.stats.bookIntro ? 'book intro ✓' : 'no book intro'} · {preview.stats.bookClosing ? 'book closing prayer ✓' : 'no book closing prayer'}
          </p>
          {preview.errors.length > 0 && preview.errors.map((e, i) => (<p key={i} className="text-amber-700">⚠️ {e}</p>))}
        </div>
      )}

      {progress && <p className="text-sm text-blue-700">{progress}</p>}
      {result && (
        <div className={`p-4 rounded-lg text-sm ${result.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {result}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={importing || !preview || 'error' in preview}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
      >
        {importing ? 'Importing…' : '🚀 Import Whole Book'}
      </button>
      <p className="text-xs text-gray-500 text-center">
        Tip: do one book at a time. Genesis → check in Bible Reader → next book. If a chapter fails, fix it and re-upload — already-saved chapters stay saved.
      </p>
    </div>
  );
}
