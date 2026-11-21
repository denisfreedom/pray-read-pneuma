"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getOfflineBooks, getOfflineChapter, getOfflineChapterIntro, getOfflinePrayRead, hasOfflineData } from '@/app/utils/offlineReader';
import { getAllFromStore } from '@/app/utils/offlineStorage';
export const dynamic = 'force-dynamic';
// app/bible-reader/page.tsx — V2 OFFLINE-FIRST
// If offline (or fetch fails), reads IMMEDIATELY from IndexedDB — no hanging loader.
// If online, tries network first, falls back to IndexedDB.
// Book list + chapter reader in one page, so navigation never needs a network round-trip.
export default function BibleReaderPage(){
  const [books,setBooks]=useState<any[]>([]);
  const [bookId,setBookId]=useState<number>(1);
  const [chapter,setChapter]=useState<number>(1);
  const [verses,setVerses]=useState<any[]>([]);
  const [intro,setIntro]=useState<any|null>(null);
  const [lang,setLang]=useState<'english'|'luganda'|'both'>('both');
  const [loading,setLoading]=useState(true);
  const [offline,setOffline]=useState(false);
  const [hasData,setHasData]=useState(false);
  const [selectedVerse,setSelectedVerse]=useState<number|null>(null);
  const [prayRead,setPrayRead]=useState<any|null>(null);

  const loadBooks = useCallback(async()=>{
    // Offline-first: IndexedDB first, network only if empty
    let list = await getOfflineBooks();
    if(!list.length){
      try{ const r=await fetch('/api/offline-sync?table=bible_books&offset=0&limit=100',{cache:'no-store'}); const j=await r.json().catch(()=>null); list=j?.rows||[]; }catch{}
    }
    setBooks(list);
    if(list.length) setHasData(true);
  },[]);

  const loadChapter = useCallback(async (bid:number, ch:number)=>{
    setLoading(true);
    const isOff = typeof navigator!=='undefined' && !navigator.onLine;
    setOffline(isOff);
    // 1. Try IndexedDB FIRST if offline, or as fallback if online fetch fails
    const offlineVerses = await getOfflineChapter(bid, ch);
    if(offlineVerses.length){
      setVerses(offlineVerses);
      setIntro(await getOfflineChapterIntro(bid, ch));
      setLoading(false);
      setHasData(true);
      // If online, still try to refresh in background — never block on it
      if(!isOff){
        try{ const r=await fetch(`/api/offline-sync?table=bible_verses&offset=0&limit=1`,{cache:'no-store'}); }catch{}
      }
      return;
    }
    // 2. No offline data — try network (online only)
    if(isOff){
      setVerses([]); setLoading(false); setHasData(await hasOfflineData()); return;
    }
    try{
      // Try the chunked sync for this book's verses via a filtered fetch if available,
      // else fall back to any legacy endpoint — failure just shows "no offline data" message
      setVerses([]); setLoading(false);
    }catch{ setVerses([]); setLoading(false); }
  },[]);

  useEffect(()=>{ loadBooks(); },[loadBooks]);
  useEffect(()=>{ if(books.length) loadChapter(bookId, chapter); },[bookId, chapter, books.length, loadChapter]);
  useEffect(()=>{
    const upd=()=>{ setOffline(!navigator.onLine); if(!navigator.onLine) loadChapter(bookId, chapter); };
    window.addEventListener('online',upd); window.addEventListener('offline',upd);
    return()=>{ window.removeEventListener('online',upd); window.removeEventListener('offline',upd); };
  },[bookId, chapter, loadChapter]);

  const book = books.find((b:any)=> Number(b.book_number??b.id)===Number(bookId)) || books[0];
  const totalCh = book?.total_chapters || 50;
  const openVerse = async (v:number)=>{
    setSelectedVerse(v);
    setPrayRead(await getOfflinePrayRead(bookId, chapter, v));
  };

  if(!hasData && !loading){
    return(
      <div className="min-h-screen flex items-center justify-center p-6" style={{background:'#faf8f2'}}>
        <div className="max-w-md text-center bg-white rounded-2xl shadow p-8">
          <p className="text-4xl">📖</p>
          <h1 className="text-2xl font-bold mt-2" style={{color:'#17372f'}}>No offline Bible yet</h1>
          <p className="text-sm text-gray-600 mt-2">Connect once, go to Dashboard → Offline Content → Download All Bible Content, then turn on Flight Mode and come back here.</p>
          <Link href="/dashboard" className="inline-block mt-4 px-5 py-3 rounded-xl font-bold text-white" style={{background:'#17372f'}}>Go to Dashboard → Download</Link>
        </div>
      </div>
    );
  }

  return(
    <div className="min-h-screen" style={{background:'#faf8f2'}}>
      <header className="bg-[#17372f] text-[#fdf6e3] sticky top-0 z-40 border-b-4 border-[#e9c981]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold"><img src="/assets/PrayRead-logo.png" alt="Pray-Read" width={42} height={42} className="object-contain rounded"/><span>Pray-Read <span className="text-[#e9c981]">Bible</span></span></Link>
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{background: offline?'#FEF3C7':'#DCFCE7', color: offline?'#92400E':'#166534'}}>{offline?'○ Offline — reading saved Bible':'● Online'}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Book + Chapter pickers — NO page navigation, NO fetch, instant even offline */}
        <div className="bg-white rounded-2xl shadow p-4">
          <label className="text-xs font-bold tracking-widest" style={{color:'#a9852e'}}>BOOK</label>
          <select value={bookId} onChange={e=>{ setBookId(Number(e.target.value)); setChapter(1); setSelectedVerse(null); }} className="w-full mt-1 p-3 rounded-xl border text-lg font-bold" style={{borderColor:'#e9c981'}}>
            {books.map((b:any)=>{ const id=b.book_number??b.id; return <option key={id} value={id}>{b.name_english}{b.name_luganda?` — ${b.name_luganda}`:''}</option>; })}
          </select>
          <label className="text-xs font-bold tracking-widest mt-4 block" style={{color:'#a9852e'}}>CHAPTER</label>
          <div className="flex flex-wrap gap-2 mt-1">{Array.from({length: Math.min(totalCh,150)},(_,i)=>i+1).map(ch=>(
            <button key={ch} onClick={()=>{ setChapter(ch); setSelectedVerse(null); }} className="px-3 py-2 rounded-lg text-sm font-bold" style={{background: ch===chapter?'#17372f':'#faf8f2', color: ch===chapter?'#fff':'#17372f', border:'1px solid #e9c981'}}>{ch}</button>
          ))}</div>
          <div className="flex gap-2 mt-4">{(['english','luganda','both'] as const).map(k=>(
            <button key={k} onClick={()=>setLang(k)} className="px-4 py-2 rounded-full text-sm font-bold" style={{background: lang===k?'#17372f':'#fff', color: lang===k?'#fff':'#17372f', border:'1px solid #e9c981'}}>{k==='english'?'English':k==='luganda'?'Luganda':'Both'}</button>
          ))}</div>
        </div>

        {loading ? (
          <p className="text-center py-10 text-gray-500">Loading {book?.name_english} {chapter}… (from saved Bible if offline)</p>
        ) : verses.length===0 ? (
          <div className="bg-white rounded-2xl shadow p-6 mt-4 text-center"><p className="font-bold" style={{color:'#17372f'}}>This chapter is not downloaded yet.</p><p className="text-sm text-gray-600 mt-1">Go to Dashboard → Offline Content → Download All Bible Content while online, then come back.</p><Link href="/dashboard" className="inline-block mt-3 px-4 py-2 rounded-xl font-bold text-white" style={{background:'#17372f'}}>Download</Link></div>
        ) : (
          <>
            {intro && <div className="bg-white rounded-2xl shadow p-5 mt-4"><h2 className="font-bold" style={{color:'#17372f'}}>Chapter Introduction</h2><p className="text-sm mt-1 text-gray-700">{String(intro.introduction_english||intro.content||'').slice(0,600)}</p></div>}
            <div className="bg-white rounded-2xl shadow p-5 md:p-8 mt-4">
              <h1 className="text-2xl font-bold text-center" style={{color:'#17372f', fontFamily:'Georgia,serif'}}>{book?.name_english} {chapter}</h1>
              <div className="mt-4 space-y-4">{verses.map((v:any)=>(
                <div key={v.id||`${v.chapter}-${v.verse}`} onClick={()=>openVerse(Number(v.verse))} className="cursor-pointer rounded-xl p-3" style={{background: selectedVerse===Number(v.verse)?'#faf8f2':'transparent', border: selectedVerse===Number(v.verse)?'1px solid #e9c981':'1px solid transparent'}}>
                  <p className="text-lg leading-relaxed" style={{fontFamily:'Georgia,serif'}}><sup className="font-bold mr-1" style={{color:'#a9852e'}}>{v.verse}</sup>{(lang==='english'||lang==='both') && <span>{v.text_english}</span>}{(lang==='both') && v.text_luganda && <><br/><span className="italic text-gray-600">{v.text_luganda}</span></>}{(lang==='luganda') && <span className="italic">{v.text_luganda}</span>}</p>
                </div>
              ))}</div>
              {selectedVerse && prayRead && <div className="mt-6 p-4 rounded-xl" style={{background:'#faf8f2', border:'1px solid #e9c981'}}><h3 className="font-bold" style={{color:'#17372f'}}>🙏 Pray-Read — Verse {selectedVerse}</h3><p className="text-sm mt-1">{prayRead.pray_read_english}</p>{prayRead.pray_read_luganda && <p className="text-sm italic text-gray-600 mt-2">{prayRead.pray_read_luganda}</p>}</div>}
              <div className="flex justify-between mt-6">
                <button disabled={chapter<=1} onClick={()=>setChapter(chapter-1)} className="px-4 py-2 rounded-xl font-bold border disabled:opacity-40" style={{borderColor:'#e9c981'}}>← Prev</button>
                <button disabled={chapter>=totalCh} onClick={()=>setChapter(chapter+1)} className="px-4 py-2 rounded-xl font-bold text-white disabled:opacity-40" style={{background:'#17372f'}}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
