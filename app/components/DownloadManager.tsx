"use client";
import { useState } from 'react';
import { saveBooks, saveChapterVerses, saveDevotional, saveCommentary, saveQA, saveVerseOfTheDay, setMeta } from '@/app/utils/offlineStorage';
// app/components/DownloadManager.tsx — V4 DIAGNOSTIC + AUTO-DISCOVERY
// Same UI as V3. New: before downloading, it PROBES all known Bible endpoints
// for Genesis 1 and shows you which one returns verses. Then it downloads
// from the WORKING endpoint only. If none work, it shows the probe results
// so we know the real endpoint — instead of silently saving 0.

const PROBES = [
  '/api/offline-sync',
  '/api/bible/books',
  '/api/bible/books/1/chapters/1',
  '/api/bible/books/1/chapters',
  '/api/bible/1/1',
  '/api/bible/1/chapters/1',
  '/api/verses?book=1&chapter=1',
  '/api/verses?book_id=1&chapter=1',
  '/api/bible/verses?book_id=1&chapter=1',
  '/api/chapters?book=1&chapter=1',
  '/api/bible/chapters?book_id=1&chapter=1',
  '/api/bible-reader/1/1',
  '/api/books/1/chapters/1',
];

export default function DownloadManager(props:any={}){
  const [downloading,setDownloading]=useState(false);
  const [pct,setPct]=useState(0);
  const [status,setStatus]=useState('');
  const [probe,setProbe]=useState<string[]>([]);
  const [done,setDone]=useState(false);
  const onClose = props.onClose || (()=>{});
  if(props.isOpen===false) return null;

  const probeOne = async (url:string): Promise<{url:string, ok:boolean, verses:number, sample:string}>=>{
    try{
      const r = await fetch(url,{cache:'no-store'});
      const j = await r.json().catch(()=>null);
      const s = JSON.stringify(j||{}).slice(0,300);
      const verses = j?.verses || j?.data?.verses || j?.data || j?.chapter?.verses || (Array.isArray(j)?j:[]);
      const n = Array.isArray(verses)?verses.length:0;
      const books = j?.books?.length || j?.data?.books?.length || 0;
      return { url, ok:r.ok, verses:n, sample:`HTTP ${r.status} | books:${books} verses:${n} | ${s}` };
    }catch(e:any){ return { url, ok:false, verses:0, sample:'FETCH FAILED: '+String(e?.message||e) }; }
  };

  const downloadAll = async()=>{
    setDownloading(true); setPct(1); setDone(false); setProbe([]); setStatus('Probing Bible endpoints for Genesis 1…');
    const results:any[]=[];
    for(const u of PROBES){
      const r = await probeOne(u);
      results.push(r);
      setProbe(results.map(x=>`${x.ok?'✓':'✗'} ${x.url} → ${x.sample}`));
      if(r.url==='/api/offline-sync' && r.verses===0){
        // offline-sync returns verses at top level, not in verses array shape — check counts
        try{ const rr=await fetch('/api/offline-sync',{cache:'no-store'}); const jj=await rr.json().catch(()=>({})); const c=jj?.counts||jj?.data?.counts; if(c) setProbe(prev=>[...prev, `ℹ offline-sync counts: ${JSON.stringify(c)} source:${jj?.source||jj?.data?.source||'?'}`]); }catch{}
      }
    }
    // Find working chapter endpoint: first probe with verses>0 for a chapter URL
    const working = results.find(r=>r.verses>0 && r.url.includes('chapter'));
    const syncVerses = results.find(r=>r.url==='/api/offline-sync')?.verses||0;
    setStatus(working?`Found working endpoint: ${working.url} — downloading all books from it…` : syncVerses? 'Using /api/offline-sync verses…' : 'No chapter endpoint returned verses — see probe results below. Sending what offline-sync gave…');
    try{
      // Save whatever offline-sync gave
      const sr = await fetch('/api/offline-sync',{cache:'no-store'}); const sj = await sr.json().catch(()=>({})); const d = sj?.data||sj||{};
      const books = d.books||[]; if(books.length) await saveBooks(books);
      const syncList = d.verses||d.bibleReader?.verses||[];
      if(syncList.length){
        const byKey=new Map<string,any[]>(); for(const v of syncList){ const k=`${v.book_id??v.book_number??1}-${v.chapter??1}`; if(!byKey.has(k)) byKey.set(k,[]); byKey.get(k)!.push(v); }
        for(const [k,list] of byKey){ const [bid,ch]=k.split('-').map(Number); await saveChapterVerses(bid,ch,list); }
      } else if(working){
        // Download all chapters via the working pattern: replace /1/1 or chapter=1 with real book/chapter
        const pattern = working.url; // e.g. /api/bible/books/1/chapters/1
        const BOOK_CH = [[50],[40],[27],[36],[34],[24],[21],[4],[31],[24],[22],[25],[29],[36],[10],[13],[10],[42],[150],[31],[12],[8],[66],[52],[5],[48],[12],[14],[3],[9],[1],[4],[7],[3],[3],[3],[2],[14],[4],[28],[16],[24],[21],[28],[16],[16],[13],[6],[6],[4],[4],[5],[3],[6],[4],[3],[1],[13],[5],[5],[3],[5],[1],[1],[1],[22]] as any;
        let total=0;
        for(let bi=0; bi<66; bi++){
          const chCount = BOOK_CH[bi][0];
          setStatus(`Downloading book ${bi+1}/66, chapter pattern ${pattern}…`); setPct(5+Math.round((bi/66)*85));
          for(let ch=1; ch<=chCount; ch++){
            let url = pattern.replace('/1/chapters/1', `/${bi+1}/chapters/${ch}`).replace('/1/1', `/${bi+1}/${ch}`).replace('book=1&chapter=1', `book=${bi+1}&chapter=${ch}`).replace('book_id=1&chapter=1', `book_id=${bi+1}&chapter=${ch}`);
            try{ const r=await fetch(url,{cache:'no-store'}); const j=await r.json().catch(()=>null); const vs=j?.verses||j?.data||j?.chapter?.verses||(Array.isArray(j)?j:[]); if(Array.isArray(vs)&&vs.length){ await saveChapterVerses(bi+1,ch,vs); total+=vs.length; } }catch{}
          }
        }
        setStatus(`Done via ${pattern} — saved ${total} verses.`);
      }
      // Devotionals / QA / commentary from their APIs if sync gave none
      if((d.devotionals||[]).length) for(const x of d.devotionals.slice(0,500)) await saveDevotional(x);
      if((d.commentary||[]).length) for(const x of d.commentary.slice(0,500)) await saveCommentary(x);
      if((d.qa||[]).length) for(const x of d.qa.slice(0,500)) await saveQA(x);
      if(d.verseOfDay) await saveVerseOfTheDay(d.verseOfDay);
      await setMeta('lastFullDownload', new Date().toLocaleString('en-GB'));
      setPct(100); setDone(true);
      if(!working && !syncList.length) setStatus('Probe finished — NO endpoint returned verses. Copy the probe list below and send it to me, I will fix the exact endpoint.');
    }catch(e:any){ setStatus('Download paused: '+String(e?.message||e)); }
    setDownloading(false);
  };

  return(
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex justify-between"><h2 className="text-xl font-bold" style={{color:'#17372f'}}>Offline Content</h2><button onClick={onClose} className="text-2xl px-2">×</button></div>
      <div className="mt-3 p-4 rounded-xl border" style={{borderColor:'#e9c981',background:'#faf8f2'}}><p className="text-sm font-bold">📖 Bilingual Content</p><p className="text-sm">All downloaded content includes both <b>English</b> and <b>Luganda</b>.</p></div>
      <button onClick={downloadAll} disabled={downloading} className="w-full mt-4 py-3.5 rounded-xl font-extrabold text-white disabled:opacity-60" style={{background:'#17372f'}}>{downloading?`Probing / Downloading… ${pct}%`:'⬇ Download All Bible Content'}</button>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3"><div className="h-2.5 rounded-full" style={{width:pct+'%',background:'linear-gradient(90deg,#a9852e,#e9c981)'}}/></div>
      {status && <p className="text-sm mt-2" style={{color:'#17372f'}}>{status}</p>}
      {done && <p className="text-sm font-bold mt-2" style={{color:'#166534'}}>✓ Done — check counts above. Try Airplane Mode.</p>}
      {probe.length>0 && <div className="mt-4 p-3 rounded-xl bg-gray-50 border text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto">{probe.join('\n')}</div>}
      <p className="text-xs mt-3 text-gray-600">If probe shows all ✗ / 0 verses, screenshot this box — it tells me the real Bible endpoint.</p>
    </div>
  );
}
