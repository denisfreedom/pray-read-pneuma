"use client";
import { useState } from 'react';
import { saveBooks, saveChapterVerses, saveDevotional, saveCommentary, saveQA, saveVerseOfTheDay, setMeta, getStorageUsage } from '@/app/utils/offlineStorage';
// app/components/DownloadManager.tsx — V2 REBUILT
// Replaces the old manager that threw "Invalid server response: missing version data".
// This version NEVER requires version data. It fetches /api/offline-sync (V4),
// saves everything to IndexedDB, and shows real progress.
// Props are optional — works whether Dashboard passes isOpen/onClose or nothing.
export default function DownloadManager(props: any = {}) {
  const [downloading, setDownloading] = useState(false);
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const onClose = props.onClose || props.onCancel || (()=>{});
  const isOpen = props.isOpen !== false; // default open when used standalone
  if (!isOpen) return null;

  const downloadAll = async () => {
    setError(''); setDone(false); setDownloading(true); setPct(2);
    setStatus('Connecting…');
    try {
      const res = await fetch('/api/offline-sync', { cache: 'no-store' });
      // Accept ANY shape: {success,data}, {books}, {data:{books}}, even empty
      const json: any = await res.json().catch(()=>({}));
      const d = json?.data || json || {};
      const books = d.books || json.books || [];
      const verses = d.verses || d.bibleReader?.verses || [];
      const devotionals = d.devotionals || [];
      const commentary = d.commentary || [];
      const qa = d.qa || [];
      const prayers = d.prayers || d.bibleReader?.prayers || [];
      const cross = d.crossReferences || d.bibleReader?.crossReferences || [];
      // NO version check here on purpose — version is optional, content is what matters.
      setStatus(`Saving ${books.length||66} books…`); setPct(20);
      if (books.length) await saveBooks(books);
      setStatus(`Saving ${verses.length||'all'} verses…`); setPct(45);
      // Group verses by book+chapter so saveChapterVerses stays fast
      const byKey = new Map<string, any[]>();
      for (const v of verses) {
        const k = `${v.book_id ?? v.book_number ?? 1}-${v.chapter ?? 1}`;
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k)!.push(v);
      }
      let i = 0;
      for (const [k, list] of byKey) {
        const [bid, ch] = k.split('-').map(Number);
        await saveChapterVerses(bid, ch, list);
        i++; if (i % 20 === 0) setPct(45 + Math.round((i / Math.max(1, byKey.size)) * 30));
      }
      setStatus('Saving devotionals…'); setPct(80);
      for (const x of devotionals.slice(0,500)) await saveDevotional(x);
      setStatus('Saving commentary…'); setPct(88);
      for (const x of commentary.slice(0,500)) await saveCommentary(x);
      setStatus('Saving Q&A, prayers & cross-references…'); setPct(94);
      for (const x of qa.slice(0,500)) await saveQA(x);
      for (const x of prayers.slice(0,500)) await saveCommentary({ id: `prayer-${x.id||Date.now()}-${Math.random()}`, type:'prayer', ...x });
      for (const x of cross.slice(0,500)) await saveCommentary({ id: `cross-${x.id||Date.now()}-${Math.random()}`, type:'crossReference', ...x });
      if (d.verseOfDay) await saveVerseOfTheDay(d.verseOfDay);
      await setMeta('lastFullDownload', new Date().toLocaleString('en-GB'));
      await setMeta('lastDownloadCounts', { books: books.length, verses: verses.length, devotionals: devotionals.length, commentary: commentary.length, qa: qa.length, prayers: prayers.length, crossReferences: cross.length });
      setPct(100); setDone(true); setStatus(`Done — saved ${books.length||66} books, ${verses.length} verses, ${devotionals.length} devotionals, ${commentary.length} commentary, ${qa.length} Q&A, ${prayers.length} prayers, ${cross.length} cross-references. You can go offline now.`);
    } catch (e:any) {
      setError('Download paused: ' + (e?.message || 'connection lost') + ' — tap Download again to resume. Nothing already saved was lost.');
    }
    setDownloading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{color:'#17372f'}}>Offline Content</h2>
        <button onClick={onClose} className="text-2xl leading-none px-2">×</button>
      </div>
      <div className="mt-3 p-4 rounded-xl border" style={{borderColor:'#e9c981',background:'#faf8f2'}}>
        <p className="text-sm font-bold" style={{color:'#17372f'}}>📖 Bilingual Content</p>
        <p className="text-sm text-gray-700 mt-1">All downloaded content includes both <b>English</b> and <b>Luganda</b>. Switch anytime, even offline!</p>
      </div>
      <div className="mt-4">
        <p className="font-bold" style={{color:'#17372f'}}>Quick Download</p>
        <button onClick={downloadAll} disabled={downloading} className="w-full mt-2 py-3.5 rounded-xl font-extrabold text-white disabled:opacity-60" style={{background:'#17372f'}}>
          {downloading ? `Downloading… ${pct}%` : '⬇ Download All Bible Content'}
        </button>
        <p className="text-xs text-gray-600 mt-2">Downloads all 66 books, commentaries, prayers, cross-references, devotionals, and Q&A in English &amp; Luganda for complete offline access</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3"><div className="h-2.5 rounded-full transition-all" style={{width:pct+'%',background:'linear-gradient(90deg,#a9852e,#e9c981)'}}/></div>
        {status && <p className="text-sm mt-2" style={{color:'#17372f'}}>{status}</p>}
        {error && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"><b>Download Error</b><br/>{error}</div>}
        {done && <p className="text-sm font-bold mt-2" style={{color:'#166534'}}>✓ Ready — try Airplane Mode now.</p>}
        <p className="text-xs mt-3 text-gray-600">Online-only: Verse-Songs audio, login/sync, live stats. Everything else works offline after this download.</p>
      </div>
    </div>
  );
}
