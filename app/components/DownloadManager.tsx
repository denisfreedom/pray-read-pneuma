"use client";
import { useState } from 'react';
import { saveBooks, saveChapterVerses, saveDevotional, saveCommentary, saveQA, saveVerseOfTheDay, setMeta } from '@/app/utils/offlineStorage';
// app/components/DownloadManager.tsx — V5 CHUNKED DOWNLOADER for REAL TABLES
// Fetches /api/offline-sync?table=X&offset=N&limit=5000 chunk by chunk.
// Tables: bible_books, bible_verses (31115), cross_references (75008),
// verse_pray_read (14601), chapter_introductions, book_introductions,
// book_commentaries, chapter_commentaries, verse_commentaries,
// book_closing_prayers, bible_outlines, devotional_entries, bible_qa, qa_topics.
// Verse-Songs audio is ONLINE-ONLY — we do not download mp3s.
const TABLES = [
  { table:'bible_books', label:'Books' },
  { table:'bible_verses', label:'Verses' },
  { table:'cross_references', label:'Cross-references' },
  { table:'verse_pray_read', label:'Pray-Read' },
  { table:'chapter_introductions', label:'Chapter introductions' },
  { table:'book_introductions', label:'Book introductions' },
  { table:'book_commentaries', label:'Book commentaries' },
  { table:'chapter_commentaries', label:'Chapter commentaries' },
  { table:'verse_commentaries', label:'Verse commentaries' },
  { table:'book_closing_prayers', label:'Closing prayers' },
  { table:'bible_outlines', label:'Outlines' },
  { table:'devotional_entries', label:'Devotionals' },
  { table:'bible_qa', label:'Q&A' },
  { table:'qa_topics', label:'Q&A topics' },
];
export default function DownloadManager(props:any={}){
  const [downloading,setDownloading]=useState(false);
  const [pct,setPct]=useState(0);
  const [status,setStatus]=useState('');
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [done,setDone]=useState(false);
  const onClose = props.onClose || (()=>{});
  if(props.isOpen===false) return null;

  const downloadAll = async()=>{
    setDownloading(true); setDone(false); setPct(1); setStatus('Starting — getting counts…'); setCounts({});
    const totalCounts:Record<string,number>={};
    try{
      // Get totals first (fast)
      const cr = await fetch('/api/offline-sync',{cache:'no-store'}); const cj = await cr.json().catch(()=>({}));
      const totals = cj?.counts || cj?.data?.counts || {};
      // Download table by table, chunk by chunk
      let doneTables=0;
      for(const {table,label} of TABLES){
        const total = totals[table] || 0;
        setStatus(`Downloading ${label} (0 / ${total||'?'})…`);
        let offset=0; let fetched=0; let tableRows:any[]=[];
        // If totals unknown, fetch until hasMore=false
        while(true){
          const r = await fetch(`/api/offline-sync?table=${table}&offset=${offset}&limit=5000`,{cache:'no-store'});
          const j = await r.json().catch(()=>null);
          const rows = j?.rows || j?.data?.rows || [];
          const t = j?.total || total || 0;
          if(!rows.length) break;
          tableRows.push(...rows); fetched+=rows.length; offset+=rows.length;
          setPct(Math.min(99, Math.round(((doneTables + (t? fetched/t : 0)) / TABLES.length)*100)));
          setStatus(`Downloading ${label} (${fetched} / ${t||'?'})…`);
          if(!j?.hasMore || rows.length<5000) break;
          // Safety: never loop forever
          if(offset>200000) break;
        }
        totalCounts[table]=fetched; setCounts({...totalCounts});
        // Save to IndexedDB in the right store
        if(table==='bible_books' && tableRows.length) await saveBooks(tableRows);
        else if(table==='bible_verses' && tableRows.length){
          const byKey=new Map<string,any[]>(); for(const v of tableRows){ const k=`${v.book_id}-${v.chapter}`; if(!byKey.has(k)) byKey.set(k,[]); byKey.get(k)!.push(v); }
          for(const [k,list] of byKey){ const [bid,ch]=k.split('-').map(Number); await saveChapterVerses(bid,ch,list); }
        }
        else if(table==='devotional_entries'){ for(const x of tableRows) await saveDevotional(x); }
        else if(table==='bible_qa'){ for(const x of tableRows) await saveQA(x); }
        else {
          // Everything else = commentary / pray-read / prayers / cross-refs / outlines
          for(const x of tableRows) await saveCommentary({ id:`${table}-${x.id}`, _table:table, ...x });
        }
        doneTables++;
      }
      await setMeta('lastFullDownload', new Date().toLocaleString('en-GB'));
      await setMeta('lastDownloadCounts', totalCounts);
      setPct(100); setDone(true);
      setStatus(`Done — Books: ${totalCounts.bible_books||0}, Verses: ${totalCounts.bible_verses||0}, Cross-refs: ${totalCounts.cross_references||0}, Pray-Read: ${totalCounts.verse_pray_read||0}, Devotionals: ${totalCounts.devotional_entries||0}, Q&A: ${totalCounts.bible_qa||0}. Go offline now.`);
    }catch(e:any){ setStatus('Download paused: '+String(e?.message||e)+' — tap Download again to resume. Nothing already saved was lost.'); }
    setDownloading(false);
  };

  return(
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex justify-between"><h2 className="text-xl font-bold" style={{color:'#17372f'}}>Offline Content</h2><button onClick={onClose} className="text-2xl px-2">×</button></div>
      <div className="mt-3 p-4 rounded-xl border" style={{borderColor:'#e9c981',background:'#faf8f2'}}><p className="text-sm font-bold">📖 Bilingual Content</p><p className="text-sm">All downloaded content includes both <b>English</b> and <b>Luganda</b>. Switch anytime, even offline!</p></div>
      <button onClick={downloadAll} disabled={downloading} className="w-full mt-4 py-3.5 rounded-xl font-extrabold text-white disabled:opacity-60" style={{background:'#17372f'}}>{downloading?`Downloading… ${pct}%`:'⬇ Download All Bible Content'}</button>
      <p className="text-xs text-gray-600 mt-2">Downloads all 66 books, 31,115 verses, 75,008 cross-references, Pray-Read, commentaries, prayers, outlines, devotionals, and Q&A in English &amp; Luganda. Verse-Songs audio stays online-only.</p>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3"><div className="h-2.5 rounded-full transition-all" style={{width:pct+'%',background:'linear-gradient(90deg,#a9852e,#e9c981)'}}/></div>
      {status && <p className="text-sm mt-2" style={{color:'#17372f'}}>{status}</p>}
      {Object.keys(counts).length>0 && <div className="mt-3 grid grid-cols-2 gap-2 text-xs">{Object.entries(counts).map(([k,v])=>(<div key={k} className="p-2 rounded bg-gray-50 border"><b>{k}</b>: {v}</div>))}</div>}
      {done && <p className="text-sm font-bold mt-2" style={{color:'#166534'}}>✓ Ready — try Airplane Mode now.</p>}
      <p className="text-xs mt-3 text-gray-600">Online-only: Verse-Songs audio, login/sync, live stats. Everything else works offline after this download.</p>
    </div>
  );
}
