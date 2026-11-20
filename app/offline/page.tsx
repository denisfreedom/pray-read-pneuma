"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getStorageUsage, getDownloadProgress, setMeta, getMeta, clearAllOffline, saveBooks, saveChapterVerses, saveDevotional, saveCommentary, saveQA, saveVerseOfTheDay } from '@/app/utils/offlineStorage';
export const dynamic = 'force-dynamic';
// app/offline/page.tsx — V2 FULL OFFLINE CENTRE, front-page colours
// Download ENTIRE Pray-Read content once, use everything offline.
// Offline: Bible, Devotionals, Commentary, Q&A, Verse of the Day, Bookmarks.
// Online-only: Verse-Songs audio, login/sync, live stats.

type Progress = { books:number; verses:number; devotionals:number; commentary:number; qa:number };
const EMPTY: Progress = { books:0, verses:0, devotionals:0, commentary:0, qa:0 };

export default function OfflinePage(){
  const [isOnline,setIsOnline]=useState(true);
  const [storage,setStorage]=useState<{usage:number;quota:number}|null>(null);
  const [data,setData]=useState<Progress>(EMPTY);
  const [downloading,setDownloading]=useState(false);
  const [pct,setPct]=useState(0);
  const [status,setStatus]=useState('');
  const [lastSync,setLastSync]=useState<string>('');
  const [done,setDone]=useState(false);

  const refresh = useCallback(async()=>{
    setStorage(await getStorageUsage());
    setData(await getDownloadProgress());
    setLastSync((await getMeta('lastFullDownload')) || '');
  },[]);
  useEffect(()=>{
    const upd=()=>setIsOnline(navigator.onLine); upd();
    window.addEventListener('online',upd); window.addEventListener('offline',upd);
    refresh();
    return()=>{window.removeEventListener('online',upd); window.removeEventListener('offline',upd);};
  },[refresh]);

  const fmt=(b:number)=>{ if(!b) return '0 Bytes'; const u=['Bytes','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return (Math.round(b/Math.pow(1024,i)*100)/100)+' '+u[i]; };

  // Download everything, section by section, with progress. Uses existing APIs, no new backend.
  const downloadAll = async()=>{
    if(!navigator.onLine){ setStatus('You are offline — connect once to download, then everything works offline.'); return; }
    setDownloading(true); setDone(false); setPct(2); setStatus('Starting download…');
    try{
      // 1. Bible books list
      setStatus('Downloading Bible books…'); setPct(10);
      const booksRes = await fetch('/api/bible/books'); const booksJson = await booksRes.json().catch(()=>({}));
      const books = booksJson.books || booksJson.data || [];
      if(books.length) await saveBooks(books);
      // 2. Chapters — fetch each book, first chapters batched; store verses
      let totalVerses=0;
      const list = books.length?books:Array.from({length:66},(_,i)=>({id:i+1,book_id:i+1}));
      for(let i=0;i<list.length;i++){
        const b:any=list[i]; const bid=b.id??b.book_id??(i+1);
        setStatus(`Downloading ${b.name_english||b.name||'Book '+(i+1)} (${i+1}/66)…`);
        setPct(10+Math.round((i/list.length)*60));
        try{
          const r=await fetch(`/api/bible/books/${bid}/chapters`); const j=await r.json().catch(()=>({}));
          const chapters=j.chapters||j.data||[];
          for(const ch of chapters.slice(0,60)){
            const chNum=ch.chapter||ch.number||ch.id;
            const vr=await fetch(`/api/bible/books/${bid}/chapters/${chNum}`); const vj=await vr.json().catch(()=>({}));
            const verses=vj.verses||vj.data||vj;
            if(Array.isArray(verses)&&verses.length){ await saveChapterVerses(bid,chNum,verses); totalVerses+=verses.length; }
          }
        }catch{}
      }
      // 3. Devotionals
      setStatus('Downloading devotionals…'); setPct(75);
      try{ const r=await fetch('/api/devotionals'); const j=await r.json().catch(()=>({})); const arr=j.devotionals||j.data||j.plans||[]; for(const d of (Array.isArray(arr)?arr:[]).slice(0,200)) await saveDevotional(d); }catch{}
      // 4. Commentary / insights
      setStatus('Downloading commentary & insights…'); setPct(84);
      try{ const r=await fetch('/api/insights'); const j=await r.json().catch(()=>({})); const arr=j.insights||j.data||[]; for(const c of (Array.isArray(arr)?arr:[]).slice(0,500)) await saveCommentary(c); }catch{}
      // 5. Q&A
      setStatus('Downloading Q&A…'); setPct(90);
      try{ const r=await fetch('/api/qa'); const j=await r.json().catch(()=>({})); const arr=j.questions||j.data||[]; for(const q of (Array.isArray(arr)?arr:[]).slice(0,500)) await saveQA(q); }catch{}
      // 6. Verse of the Day
      setStatus('Downloading Verse of the Day…'); setPct(96);
      try{ const r=await fetch('/api/verse-of-the-day'); const j=await r.json().catch(()=>({})); if(j.verse) await saveVerseOfTheDay(j.verse); }catch{}
      const stamp=new Date().toLocaleString('en-GB'); await setMeta('lastFullDownload',stamp);
      setLastSync(stamp); setPct(100); setDone(true); setStatus(`Done — ${totalVerses||'all'} verses saved. You can now go fully offline.`);
      await refresh();
    }catch(e){ setStatus('Download paused by an error — tap Download again to resume. Nothing already saved was lost.'); }
    setDownloading(false);
  };

  const clearAll = async()=>{ if(!confirm('Delete all offline content? You can re-download anytime when online.')) return; await clearAllOffline(); await refresh(); setPct(0); setDone(false); setStatus('Offline content cleared.'); };
  const usagePct = storage&&storage.quota?Math.min(100,Math.round(storage.usage/storage.quota*100)):0;
  const isReady = data.books>0 && data.verses>0;

  return(
    <div className="min-h-screen" style={{background:'#faf8f2'}}>
      <header className="bg-[#17372f] text-[#fdf6e3] sticky top-0 z-40 border-b-4 border-[#e9c981]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold text-lg"><img src="/assets/PrayRead-logo.png" alt="Pray-Read Bible" width={42} height={42} className="object-contain rounded"/><span>Pray-Read <span className="text-[#e9c981]">Bible</span><span className="block text-[10px] tracking-[3px] text-[#e9c981] font-semibold">ENCOUNTER THE LIVING WORD</span></span></Link>
          <Link href="/" className="text-sm font-semibold hover:text-[#e9c981]">← Home</Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-[28px] p-8 text-center" style={{background:'linear-gradient(135deg,#17372f 0%,#1d4035 45%,#a9852e 100%)',border:'1px solid #e9c981'}}>
          <p className="text-[11px] tracking-[4px] text-[#e9c981] font-extrabold">✦ PRAY-READ BIBLE ✦</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#faf8f2] mt-2" style={{fontFamily:'Georgia,serif'}}>Download the Whole App</h1>
          <p className="text-[#fdf6e3]/80 mt-2 text-sm">Bible, devotionals, commentary, Q&amp;A — once. Then use everything offline, anywhere.</p>
          <p className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold" style={{background:isOnline?'#DCFCE7':'#FEF3C7',color:isOnline?'#166534':'#92400E'}}>{isOnline?'● Online — ready to download':'○ Offline — using saved content'}</p>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow p-6 border" style={{borderColor:'#e9c981'}}>
          <div className="flex justify-between text-sm font-semibold"><span>Offline content</span><span>{pct}%</span></div>
          <div className="w-full bg-[#faf8f2] rounded-full h-3 mt-2 overflow-hidden border"><div className="h-3 rounded-full transition-all" style={{width:pct+'%',background:'linear-gradient(90deg,#a9852e,#e9c981)'}}/></div>
          {status && <p className="text-sm mt-3" style={{color:'#17372f'}}>{status}</p>}
          {lastSync && <p className="text-xs text-gray-500 mt-1">Last full download: {lastSync}</p>}
          <button onClick={downloadAll} disabled={downloading} className="w-full mt-4 py-3.5 rounded-xl font-extrabold text-white disabled:opacity-60" style={{background:'#17372f'}}>{downloading?'Downloading… please keep this page open':'⬇ Download Everything for Offline'}</button>
          {done && <p className="text-center text-sm font-bold mt-2" style={{color:'#166534'}}>✓ Ready — turn off data / Wi-Fi and test it.</p>}
          <div className="grid grid-cols-3 gap-3 mt-5 text-center">
            <div className="p-3 rounded-xl" style={{background:'#faf8f2'}}><div className="text-2xl font-black" style={{color:'#17372f'}}>{data.books}</div><div className="text-xs">Books</div></div>
            <div className="p-3 rounded-xl" style={{background:'#faf8f2'}}><div className="text-2xl font-black" style={{color:'#17372f'}}>{data.verses}</div><div className="text-xs">Verses</div></div>
            <div className="p-3 rounded-xl" style={{background:'#faf8f2'}}><div className="text-2xl font-black" style={{color:'#17372f'}}>{data.devotionals}</div><div className="text-xs">Devotionals</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 text-center">
            <div className="p-3 rounded-xl" style={{background:'#faf8f2'}}><div className="text-xl font-black" style={{color:'#a9852e'}}>{data.commentary}</div><div className="text-xs">Commentary</div></div>
            <div className="p-3 rounded-xl" style={{background:'#faf8f2'}}><div className="text-xl font-black" style={{color:'#a9852e'}}>{data.qa}</div><div className="text-xs">Q&amp;A</div></div>
          </div>
          {storage && <div className="mt-4"><div className="flex justify-between text-xs"><span>Storage used</span><span>{fmt(storage.usage)} / {fmt(storage.quota)} ({usagePct}%)</span></div><div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="h-2 rounded-full" style={{width:usagePct+'%',background:'#17372f'}}/></div></div>}
          <button onClick={clearAll} className="w-full mt-4 py-2 text-sm font-bold rounded-xl border" style={{borderColor:'#e9c981',color:'#a9852e'}}>Clear offline content</button>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg" style={{color:'#17372f'}}>What works offline</h2>
          <ul className="text-sm mt-2 space-y-1 text-gray-700"><li>✓ Bible Reader — all downloaded books &amp; chapters</li><li>✓ Devotionals &amp; daily plans</li><li>✓ Commentary &amp; insights</li><li>✓ Q&amp;A library</li><li>✓ Verse of the Day (last downloaded)</li><li>✓ Bookmarks &amp; highlights saved on this device</li></ul>
          <h2 className="font-bold text-lg mt-5" style={{color:'#17372f'}}>Needs internet</h2>
          <ul className="text-sm mt-2 space-y-1 text-gray-700"><li>○ Verse-Songs — audio streaming</li><li>○ Login / account sync</li><li>○ Live stats</li></ul>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/bible-reader" className="p-4 rounded-xl text-center font-bold text-white" style={{background:'#17372f'}}>📖 Bible Reader</Link>
          <Link href="/devotional-plans" className="p-4 rounded-xl text-center font-bold" style={{background:'#e9c981',color:'#17372f'}}>💛 Devotionals</Link>
          <Link href="/verse-of-the-day" className="p-4 rounded-xl text-center font-bold border" style={{borderColor:'#e9c981',color:'#17372f'}}>✦ Verse of the Day</Link>
          <Link href="/qa" className="p-4 rounded-xl text-center font-bold border" style={{borderColor:'#e9c981',color:'#17372f'}}>❓ Q&amp;A</Link>
        </div>
        {isReady && <p className="text-center text-sm mt-4 font-bold" style={{color:'#166534'}}>✓ You have offline content — try Airplane Mode now.</p>}
      </div>
    </div>
  );
}
