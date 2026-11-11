"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, Book, Clock, ChevronLeft, ChevronRight, X, Share2, Mail, Copy, Linkedin, Check, CheckCircle2, Plus, Minus, Flame, Sparkles, Search, ArrowRight, BookOpen, Heart, Languages, Lock, Sun, Quote } from "lucide-react";
import { useScripturePopup, ScriptureVersePopup, ScriptureHtml } from "@/components/ScriptureVersePopup";
import { stripHtml } from "@/app/utils/stripHtml";
import { useFontSizeStore, getTextSizeClasses } from "@/app/store/fontSizeStore";

interface DevotionalPlan { id: number; title: string; description: string; thumbnail_url: string; schedule_type: string; is_active?: boolean; }
interface DevotionalEntry { id: number; plan_id: number; scheduled_date: string; title: string; devotional_text: string; devotional_text_lu?: string; scripture_book: string; scripture_chapter: number; scripture_verse: number; scripture_quotation: string; related_scriptures: any[]; further_readings: string; author: string; cover_photo_url: string; user_completed?: boolean; }
type DevotionalLang = 'both' | 'en' | 'lu';
type View = 'home' | 'grid' | 'calendar';

const FALLBACK_COVER = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778325513092_71fqsh.jpeg';
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const BOOK_ALIASES: Record<string,string> = { 'psalm':'psalms','psa':'psalms','ps':'psalms','song of solomon':'song of songs','song':'song of songs','sos':'song of songs','1samuel':'1 samuel','2samuel':'2 samuel','1kings':'1 kings','2kings':'2 kings','1chronicles':'1 chronicles','2chronicles':'2 chronicles','1corinthians':'1 corinthians','2corinthians':'2 corinthians','1thessalonians':'1 thessalonians','2thessalonians':'2 thessalonians','1timothy':'1 timothy','2timothy':'2 timothy','1peter':'1 peter','2peter':'2 peter','1john':'1 john','2john':'2 john','3john':'3 john','gen':'genesis','exod':'exodus','exo':'exodus','lev':'leviticus','num':'numbers','deut':'deuteronomy','josh':'joshua','judg':'judges','isa':'isaiah','jer':'jeremiah','lam':'lamentations','ezek':'ezekiel','dan':'daniel','hos':'hosea','obad':'obadiah','mic':'micah','nah':'nahum','hab':'habakkuk','zeph':'zephaniah','hag':'haggai','zech':'zechariah','mal':'malachi','matt':'matthew','rom':'romans','gal':'galatians','eph':'ephesians','phil':'philippians','col':'colossians','phlm':'philemon','heb':'hebrews','jas':'james','rev':'revelation' };

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const prettyDate = (s: string) => new Date(s.substring(0,10)+'T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
const cleanPreview = (raw='') => raw.replace(/<!--[\s\S]*?-->/g,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<xml[\s\S]*?<\/xml>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const sortByDateDesc = (arr:any[]) => [...arr].sort((a,b)=> new Date(b.scheduled_date).getTime()-new Date(a.scheduled_date).getTime());

/* ---------- Shared reader modal: used by BOTH grid + calendar (no more duplicated copy) ---------- */
function DevotionalReader({ entry, parsedFurther, lang, setLang, textSizes, font, onClose, onToggleComplete, onVerse, onNavigate, onShare, notice }: any) {
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose(); };
    document.addEventListener('keydown',onKey);
    const prev=document.body.style.overflow; document.body.style.overflow='hidden';
    return ()=>{ document.removeEventListener('keydown',onKey); document.body.style.overflow=prev; };
  },[onClose]);
  const completed = !!(entry as any).user_completed;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={entry.title}>
      <button aria-label="Close devotional" onClick={onClose} className="absolute inset-0 bg-[#1B1035]/70 backdrop-blur-sm" />
      <div className="relative bg-[#FFFBF2] w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] shadow-2xl animate-[slideUp_.3s_ease]">
        {/* Cover */}
        <div className="relative h-52 sm:h-64 overflow-hidden rounded-t-[28px]">
          <img src={entry.cover_photo_url || FALLBACK_COVER} alt={entry.title} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).src=FALLBACK_COVER;}} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1B1035]/90 via-[#1B1035]/30 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 text-slate-800 flex items-center justify-center shadow-lg hover:scale-105 transition"><X size={20}/></button>
          {completed && <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow"><CheckCircle2 size={14}/> Completed</span>}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <span className="inline-flex items-center gap-1.5 bg-amber-400 text-[#3B2100] text-[11px] font-extrabold tracking-widest uppercase px-3 py-1 rounded-full"><Sun size={12}/> {prettyDate(entry.scheduled_date)}</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-3 drop-shadow">{entry.title}</h2>
            {entry.author && <p className="text-amber-200 text-sm font-semibold mt-1">By {entry.author}</p>}
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-amber-100 rounded-2xl px-3 py-2 shadow-sm">
            <div className="flex items-center gap-1 bg-amber-50 rounded-full p-1">
              {([['both','BOTH'],['en','EN'],['lu','LUG']] as const).map(([v,label])=>(
                <button key={v} onClick={()=>setLang(v)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${lang===v?'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow':'text-amber-800 hover:bg-amber-100'}`}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">Text size</span>
              <button onClick={font.decrease} title="Decrease font size" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={16}/></button>
              <button onClick={font.increase} title="Increase font size" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={16}/></button>
              <button onClick={()=>onToggleComplete(entry)} className={`ml-1 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${completed?'bg-emerald-100 text-emerald-700':'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow hover:scale-[1.03]'}`}>{completed?<><CheckCircle2 size={15}/> Completed</>:<><Check size={15}/> Mark Complete</>}</button>
            </div>
          </div>
          {notice && <p className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl px-4 py-3">{notice}</p>}

          {/* Scripture */}
          {entry.scripture_book && (
            <section className="rounded-3xl overflow-hidden border border-indigo-100 shadow-sm bg-white">
              <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 px-5 py-3 flex items-center justify-between">
                <span className="text-white font-bold text-sm flex items-center gap-2"><BookOpen size={16}/> Today&apos;s Scripture</span>
                <button onClick={()=>onNavigate(entry.scripture_book, entry.scripture_chapter)} className="text-xs font-bold px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full">Full Chapter →</button>
              </div>
              <div className="bg-indigo-50/70 px-5 py-4">
                <button onClick={()=>onVerse({book:entry.scripture_book,chapter:entry.scripture_chapter,verse:entry.scripture_verse,display:`${entry.scripture_book} ${entry.scripture_chapter}:${entry.scripture_verse}`})} className={`font-black text-indigo-700 hover:underline ${textSizes.body} block`}>{entry.scripture_book} {entry.scripture_chapter}:{entry.scripture_verse}</button>
                {entry.scripture_quotation && <div className="mt-2 flex gap-2"><Quote size={18} className="text-indigo-300 shrink-0 mt-1"/><ScriptureHtml html={entry.scripture_quotation} onVerseClick={onVerse} className={`text-slate-700 italic leading-relaxed ${textSizes.body}`} /></div>}
              </div>
            </section>
          )}

          {/* Message */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 text-white flex items-center justify-center"><Sparkles size={17}/></span> Devotional Message</h3>
            {(lang==='both'||lang==='en') && entry.devotional_text && <div className="mt-4">{lang==='both' && <p className="text-[11px] font-extrabold tracking-widest uppercase text-amber-600 mb-2 flex items-center gap-1"><Languages size={12}/> English</p>}<ScriptureHtml html={entry.devotional_text} onVerseClick={onVerse} className={`text-slate-800 leading-relaxed ${textSizes.body}`} /></div>}
            {(lang==='both'||lang==='lu') && entry.devotional_text_lu && <div className="mt-5 pt-5 border-t border-dashed border-amber-200">{lang==='both' && <p className="text-[11px] font-extrabold tracking-widest uppercase text-amber-600 mb-2 flex items-center gap-1"><Languages size={12}/> Luganda</p>}<ScriptureHtml html={entry.devotional_text_lu} onVerseClick={onVerse} className={`text-slate-800 leading-relaxed ${textSizes.body}`} /></div>}
            {lang==='lu' && !entry.devotional_text_lu && <p className="text-slate-500 italic text-center py-6">Luganda translation not available for this devotional yet.</p>}
            {lang==='en' && !entry.devotional_text && <p className="text-slate-500 italic text-center py-6">English text not available for this devotional.</p>}
          </section>

          {/* Further readings */}
          {parsedFurther?.length>0 && (
            <section className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-3xl p-5 border border-teal-100">
              <h3 className={`font-black text-teal-700 mb-3 flex items-center gap-2 ${textSizes.heading}`}><Book size={18}/> Further Readings</h3>
              <div className="flex flex-wrap gap-2">{parsedFurther.map((ref:any,idx:number)=>(<button key={idx} onClick={()=>onVerse({book:ref.book,chapter:ref.chapter,verse:ref.verse,display:ref.display})} className="px-4 py-2 bg-white border-2 border-teal-200 hover:border-teal-400 text-teal-700 font-bold rounded-full text-sm shadow-sm transition">{ref.display}</button>))}</div>
            </section>
          )}

          {/* Related */}
          {Array.isArray(entry.related_scriptures) && entry.related_scriptures.length>0 && (
            <section className="bg-emerald-50/70 rounded-3xl p-5 border border-emerald-100">
              <h3 className={`font-black text-emerald-700 mb-3 flex items-center gap-2 ${textSizes.heading}`}><BookOpen size={18}/> Related Scriptures</h3>
              <div className="space-y-3">{entry.related_scriptures.map((s:any,idx:number)=>(<div key={idx} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm"><button onClick={()=>onVerse({book:s.book,chapter:s.chapter,verse:s.verse,display:`${s.book} ${s.chapter}:${s.verse}`})} className={`font-bold text-emerald-700 hover:underline block ${textSizes.body}`}>{s.book} {s.chapter}:{s.verse}</button>{s.text && <ScriptureHtml html={`"${s.text}"`} onVerseClick={onVerse} className={`text-slate-600 italic mt-1 ${textSizes.body}`} />}</div>))}</div>
            </section>
          )}

          {/* Share */}
          <section className="border-t border-amber-100 pt-5">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Share2 size={13}/> Share this devotional</p>
            <div className="flex flex-wrap gap-2">
              {([['whatsapp','WhatsApp','bg-[#25D366]'],['facebook','Facebook','bg-[#1877F2]'],['twitter','X / Twitter','bg-sky-500'],['telegram','Telegram','bg-[#229ED9]'],['linkedin','LinkedIn','bg-[#0A66C2]'],['email','Email','bg-slate-500'],['copy','Copy','bg-violet-600']] as const).map(([key,label,cls])=>(
                <button key={key} title={label} onClick={()=>onShare(key)} className={`h-10 px-4 rounded-full text-white text-xs font-bold flex items-center gap-2 shadow hover:scale-105 transition ${cls}`}>{key==='linkedin'?<Linkedin size={15}/>:key==='email'?<Mail size={15}/>:key==='copy'?<Copy size={15}/>:null}{label}</button>
              ))}
            </div>
          </section>
        </div>
      </div>
      <style jsx>{`@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

export default function DevotionalPlansPage(){
  const { popup: scripturePopup, openVerse, closePopup: closeScripturePopup } = useScripturePopup();
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSizeStore();
  const textSizes = getTextSizeClasses(fontSize);
  const [plans,setPlans]=useState<DevotionalPlan[]>([]);
  const [selectedPlan,setSelectedPlan]=useState<DevotionalPlan|null>(null);
  const [entries,setEntries]=useState<DevotionalEntry[]>([]);
  const [selectedEntry,setSelectedEntry]=useState<DevotionalEntry|null>(null);
  const [view,setView]=useState<View>('home');
  const [currentMonth,setCurrentMonth]=useState(()=>new Date().getMonth());
  const [currentYear,setCurrentYear]=useState(()=>new Date().getFullYear());
  const [parsedFurtherReadings,setParsedFurtherReadings]=useState<any[]>([]);
  const [bibleBooks,setBibleBooks]=useState<any[]>([]);
  const [recentDevotionals,setRecentDevotionals]=useState<DevotionalEntry[]>([]);
  const [displayedCount,setDisplayedCount]=useState(9);
  const [search,setSearch]=useState('');
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [devotionalStats,setDevotionalStats]=useState<any>(null);
  const [devotionalLang,setDevotionalLang]=useState<DevotionalLang>('both');
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');
  const [loadError,setLoadError]=useState('');

  const showNotice=(msg:string)=>{ setNotice(msg); window.setTimeout(()=>setNotice(''),3500); };

  const parseFurtherReadings=useCallback((text:string)=>{
    if(!text?.trim()){ setParsedFurtherReadings([]); return; }
    const clean=cleanPreview(text);
    const refs=clean.split(/[;,]|\.(?=\s[A-Z]|$)/).map((r:string)=>r.trim()).filter(Boolean);
    const out:any[]=[];
    for(const ref of refs){
      const m=ref.match(/^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)(?:-(\d+))?$/);
      if(!m) continue;
      const lower=m[1].trim().toLowerCase(); const resolved=BOOK_ALIASES[lower]||lower;
      const book=bibleBooks.find((b:any)=> b.name_english?.toLowerCase()===resolved || b.name_english?.toLowerCase()===lower || b.abbreviation_english?.toLowerCase()===resolved || b.abbreviation_english?.toLowerCase()===lower);
      if(!book) continue;
      const chapter=+m[2], verse=+m[3], end=+m[4]||verse;
      out.push({book:book.name_english,chapter,verse,display:end>verse?`${book.name_english} ${chapter}:${verse}-${end}`:`${book.name_english} ${chapter}:${verse}`,isValid:true});
    }
    setParsedFurtherReadings(out);
  },[bibleBooks]);

  const openEntry=useCallback((entry:DevotionalEntry)=>{ setSelectedEntry(entry); parseFurtherReadings(entry.further_readings||''); },[parseFurtherReadings]);

  const fetchEntries=useCallback(async(planId:number,email:string|null)=>{
    try{ const q=email?`&userEmail=${encodeURIComponent(email)}`:''; const res=await fetch(`/api/devotional-entries?planId=${planId}${q}`); if(!res.ok) throw new Error('Failed to load entries'); setEntries(await res.json()); }catch(e){ console.error(e); }
  },[]);

  const fetchRecent=useCallback(async(email:string|null)=>{
    try{
      const q=email?`&userEmail=${encodeURIComponent(email)}`:''; const res=await fetch(`/api/devotional-entries?showAll=true${q}`);
      if(!res.ok) throw new Error('Network failed');
      setRecentDevotionals(sortByDateDesc(await res.json())); setLoadError('');
    }catch{
      try{ const {getAllDevotionals}=await import('@/app/utils/offlineStorage'); const off=await getAllDevotionals(); if(off?.length){ setRecentDevotionals(sortByDateDesc(off)); setLoadError('You are offline — showing saved devotionals.'); return; } }catch{}
      setLoadError('Could not load devotionals. Check your connection and try again.');
    }
  },[]);

  const fetchStats=useCallback(async(email:string)=>{
    try{ const res=await fetch(`/api/user-devotional-progress?userEmail=${encodeURIComponent(email)}&stats=true`); const d=await res.json(); if(d.success) setDevotionalStats(d); }catch{}
  },[]);

  // Initial load — session first, then plans + books + (deep link) in parallel. No setState during render.
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      let email:string|null=null;
      try{ const r=await fetch('/api/auth/session'); const d=await r.json(); if(d.success && d.user?.email) email=d.user.email; }catch{}
      if(cancelled) return; setUserEmail(email);
      const [plansRes,booksRes]=await Promise.allSettled([fetch('/api/devotional-plans'),fetch('/api/bible-books')]);
      if(cancelled) return;
      if(plansRes.status==='fulfilled' && plansRes.value.ok){ const d=await plansRes.value.json(); setPlans((Array.isArray(d)?d:[]).filter((p:any)=>p.is_active)); }
      if(booksRes.status==='fulfilled' && booksRes.value.ok){ setBibleBooks(await booksRes.value.json()); }
      const entryId=new URLSearchParams(window.location.search).get('entryId');
      if(entryId){
        try{ const q=email?`&userEmail=${encodeURIComponent(email)}`:''; const r=await fetch(`/api/devotional-entries?entryId=${entryId}${q}`); const d=await r.json(); if(d?.length){ setSelectedEntry(d[0]); setView('grid'); } }catch{}
      }
      if(email) fetchStats(email);
      setLoading(false);
    })();
    return ()=>{ cancelled=true; };
  },[fetchStats]);

  useEffect(()=>{ if(view==='grid') fetchRecent(userEmail); },[view,userEmail,fetchRecent]);
  useEffect(()=>{ if(selectedPlan) fetchEntries(selectedPlan.id,userEmail); },[selectedPlan,userEmail,fetchEntries]);
  // Auto-select first plan when calendar view opens — in an effect, never during render.
  useEffect(()=>{ if(view==='calendar' && !selectedPlan && plans.length>0) setSelectedPlan(plans[0]); },[view,selectedPlan,plans]);

  const markComplete=async(entry:DevotionalEntry)=>{
    if(!userEmail){ showNotice('Please log in to track your progress.'); return; }
    const completed=!entry.user_completed;
    try{
      const res=await fetch('/api/user-devotional-progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userEmail,entryId:entry.id,scheduledDate:entry.scheduled_date,completed})});
      if(!res.ok) throw new Error('Save failed');
      const next={...entry,user_completed:completed};
      setSelectedEntry(next);
      setRecentDevotionals(p=>p.map(x=>x.id===entry.id?next:x));
      setEntries(p=>p.map(x=>x.id===entry.id?next:x));
      fetchStats(userEmail);
      showNotice(completed?'Well done — marked as complete. Keep the streak going!':'Marked as not yet complete.');
    }catch{ showNotice('Could not save your progress. Please try again.'); }
  };

  const handleDateSelect=async(date:Date)=>{
    const today=new Date(); today.setHours(0,0,0,0);
    const target=new Date(date); target.setHours(0,0,0,0);
    if(target>today){ showNotice('Devotionals for future dates are not available yet.'); return; }
    const dateStr=toDateStr(date);
    let entry=entries.find(e=>e.scheduled_date?.substring(0,10)===dateStr);
    if(!entry && selectedPlan){
      try{ const q=userEmail?`&userEmail=${encodeURIComponent(userEmail)}`:''; const r=await fetch(`/api/devotional-entries?planId=${selectedPlan.id}&date=${dateStr}${q}`); const d=await r.json(); if(d?.length) entry=d[0]; }catch{}
    }
    if(entry) openEntry(entry); else showNotice('No devotional available for this date.');
  };

  const navigateToVerse=(book:string,chapter:number)=>{
    fetch('/api/bible-books?full=true').then(r=>r.json()).then((books:any[])=>{ const b=books.find((x:any)=>x.name_english?.toLowerCase()===book.toLowerCase()); if(b) window.location.href=`/bible-reader/${b.book_number}/${chapter}#verse-${chapter}`; }).catch(()=>{});
  };

  const shareDevotional=async(platform:string)=>{
    if(!selectedEntry) return;
    const en=stripHtml(selectedEntry.devotional_text||''); const lu=stripHtml(selectedEntry.devotional_text_lu||''); const quote=stripHtml(selectedEntry.scripture_quotation||'');
    const link=`${window.location.origin}/devotional-plans?entryId=${selectedEntry.id}`;
    let text=`${selectedEntry.title}\n\n${selectedEntry.scripture_book} ${selectedEntry.scripture_chapter}:${selectedEntry.scripture_verse}\n"${quote}"\n\n`;
    if(en) text+=`ENGLISH:\n${en}\n\n`; if(lu) text+=`LUGANDA:\n${lu}\n\n`;
    if(selectedEntry.author) text+=`Author: ${selectedEntry.author}\n\n`;
    text+=`Read the full devotional:\n${link}\n\nA Digital Sanctuary — where the Word becomes Spirit and Life.`;
    if(platform==='copy'){ try{ await navigator.clipboard.writeText(text); showNotice('Devotional copied to clipboard!'); }catch{ showNotice('Could not copy. Please try again.'); } return; }
    const urls:Record<string,string>={ whatsapp:`https://wa.me/?text=${encodeURIComponent(text)}`, facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, twitter:`https://twitter.com/intent/tweet?text=${encodeURIComponent(text.length>280?text.slice(0,277)+'...':text)}`, telegram:`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, email:`mailto:?subject=${encodeURIComponent(selectedEntry.title)}&body=${encodeURIComponent(text)}` };
    if(urls[platform]) window.open(urls[platform],'_blank','noopener');
  };

  const todayStr=toDateStr(new Date());
  const todaysEntry=useMemo(()=> recentDevotionals.find(e=>e.scheduled_date?.substring(0,10)===todayStr) || null,[recentDevotionals,todayStr]);
  const filtered=useMemo(()=>{ const q=search.trim().toLowerCase(); if(!q) return recentDevotionals; return recentDevotionals.filter(e=> e.title.toLowerCase().includes(q) || e.author?.toLowerCase().includes(q) || `${e.scripture_book||''}`.toLowerCase().includes(q) || cleanPreview(e.devotional_text).toLowerCase().includes(q)); },[recentDevotionals,search]);
  const streak=devotionalStats?.currentStreak||0; const completedCount=devotionalStats?.stats?.total_completed||0;

  if(loading) return <div className="min-h-screen bg-[#FFFBF2] flex flex-col items-center justify-center gap-4"><div className="w-12 h-12 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin"/><p className="text-slate-500 font-semibold">Loading devotionals…</p></div>;

  /* ---------- HOME / HERO ---------- */
  if(view==='home') return (
    <main className="min-h-screen bg-[#FFFBF2] text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2B1055] via-[#5B2A86] to-[#E85D75] text-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-400/30 blur-3xl"/><div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-rose-400/30 blur-3xl"/>
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 backdrop-blur px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"><Sparkles size={13} className="text-amber-300"/> Daily Devotionals</span>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] mt-6">Start today<br/><span className="bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">in the Word.</span></h1>
          <p className="text-white/85 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mt-5">Short, rich devotionals to deepen your faith — in English and Luganda, with Scripture, further readings, and a streak to keep you going.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <button onClick={()=>setView('grid')} className="px-7 py-4 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-white font-black shadow-xl shadow-rose-500/30 hover:scale-[1.03] transition flex items-center gap-2">Explore Devotionals <ArrowRight size={18}/></button>
            <button onClick={()=>setView('calendar')} className="px-7 py-4 rounded-full bg-white/15 border border-white/30 backdrop-blur font-bold hover:bg-white/25 transition flex items-center gap-2"><Calendar size={18}/> Calendar View</button>
          </div>
          {userEmail && (streak>0 || completedCount>0) && (
            <div className="mt-8 inline-flex items-center gap-6 bg-white/10 border border-white/20 backdrop-blur rounded-2xl px-6 py-3">
              <span className="flex items-center gap-2 font-black text-amber-300"><Flame size={18}/> {streak}-day streak</span><span className="w-px h-6 bg-white/25"/><span className="flex items-center gap-2 font-bold text-emerald-300"><CheckCircle2 size={18}/> {completedCount} completed</span>
            </div>
          )}
        </div>
      </section>

      {todaysEntry && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 -mt-2 pt-10">
          <div className="flex items-center gap-2 mb-4"><span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Sun size={18}/></span><h2 className="text-xl font-black">Today&apos;s Devotional</h2><span className="text-xs font-bold bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full">TODAY</span></div>
          <button onClick={()=>openEntry(todaysEntry)} className="w-full text-left bg-white rounded-[28px] shadow-xl shadow-amber-100 border border-amber-100 overflow-hidden hover:shadow-2xl hover:-translate-y-0.5 transition grid md:grid-cols-[280px_1fr]">
            <div className="h-48 md:h-auto relative"><img src={todaysEntry.cover_photo_url||FALLBACK_COVER} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).src=FALLBACK_COVER;}}/><span className="absolute top-4 left-4 bg-white/95 text-xs font-bold px-3 py-1.5 rounded-full shadow">{todaysEntry.scripture_book} {todaysEntry.scripture_chapter}:{todaysEntry.scripture_verse}</span></div>
            <div className="p-6 sm:p-8"><h3 className="text-2xl sm:text-3xl font-black leading-tight">{todaysEntry.title}</h3>{todaysEntry.author && <p className="text-amber-600 font-bold text-sm mt-2">By {todaysEntry.author}</p>}<p className="text-slate-600 leading-relaxed mt-3 line-clamp-3">{cleanPreview(todaysEntry.devotional_text).slice(0,280)}</p><span className="inline-flex items-center gap-2 mt-5 font-black text-violet-700">Read today&apos;s devotional <ArrowRight size={17}/></span></div>
          </button>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="flex items-end justify-between gap-4 mb-5"><h2 className="text-xl font-black">Devotional Plans</h2><button onClick={()=>setView('grid')} className="text-sm font-bold text-violet-700 hover:underline">View all →</button></div>
        {plans.length===0 ? <p className="bg-white border rounded-3xl p-8 text-center text-slate-500 font-semibold">No devotional plans available yet. Check back soon.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{plans.map((p,i)=>(
            <article key={p.id} className="bg-white rounded-[26px] overflow-hidden border border-slate-100 shadow-lg shadow-slate-100 hover:-translate-y-1 hover:shadow-xl transition">
              <div className="h-40 relative overflow-hidden">{p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover"/> : <div className={`w-full h-full bg-gradient-to-br ${['from-violet-500 to-fuchsia-500','from-amber-400 to-rose-500','from-teal-400 to-cyan-500'][i%3]} flex items-center justify-center`}><Book size={44} className="text-white/90"/></div>}<span className="absolute top-3 left-3 bg-white/95 text-[11px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full">{p.schedule_type||'Daily'}</span></div>
              <div className="p-5"><h3 className="font-black text-lg leading-snug line-clamp-2">{p.title}</h3><p className="text-slate-600 text-sm leading-relaxed mt-2 line-clamp-3">{p.description}</p><button onClick={()=>{ setSelectedPlan(p); setView('calendar'); }} className="mt-4 font-black text-sm text-violet-700 inline-flex items-center gap-1.5 hover:gap-2.5 transition-all">Open calendar <ArrowRight size={15}/></button></div>
            </article>
          ))}</div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-14 grid sm:grid-cols-3 gap-4">
        {[['BookOpen','Read','Scripture first — every devotional starts with the Word.','bg-violet-100 text-violet-700'],['Heart','Reflect','A short, honest message for real life.','bg-rose-100 text-rose-600'],['Flame','Keep going','Mark it complete and build your streak.','bg-amber-100 text-amber-600']].map(([Icon,label,desc,cls]:any)=>(
          <div key={label} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm"><span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${cls}`}>{Icon==='BookOpen'?<BookOpen size={20}/>:Icon==='Heart'?<Heart size={20}/>:<Flame size={20}/>}</span><h3 className="font-black mt-3">{label}</h3><p className="text-slate-600 text-sm leading-relaxed mt-1">{desc}</p></div>
        ))}
      </section>
      {selectedEntry && <DevotionalReader entry={selectedEntry} parsedFurther={parsedFurtherReadings} lang={devotionalLang} setLang={setDevotionalLang} textSizes={textSizes} font={{increase:increaseFontSize,decrease:decreaseFontSize}} onClose={()=>setSelectedEntry(null)} onToggleComplete={markComplete} onVerse={openVerse} onNavigate={navigateToVerse} onShare={shareDevotional} notice={notice} />}
      <ScriptureVersePopup popup={scripturePopup} onClose={closeScripturePopup} />
    </main>
  );

  /* ---------- GRID ---------- */
  if(view==='grid') return (
    <main className="min-h-screen bg-[#FFFBF2] text-slate-900">
      <header className="bg-gradient-to-r from-[#2B1055] via-[#5B2A86] to-[#E85D75] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
          <button onClick={()=>setView('home')} className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white mb-4"><ChevronLeft size={16}/> Home</button>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><h1 className="text-3xl sm:text-4xl font-black">Recent Devotionals</h1><p className="text-white/80 mt-2">Browse the archive — pick one, read slowly, mark it complete.</p></div>
            <div className="flex flex-wrap items-center gap-3">
              {userEmail && <span className="inline-flex items-center gap-4 bg-white/10 border border-white/20 backdrop-blur rounded-2xl px-4 py-2.5 text-sm font-bold"><span className="flex items-center gap-1.5 text-amber-300"><Flame size={16}/> {streak} day streak</span><span className="w-px h-5 bg-white/25"/><span className="flex items-center gap-1.5 text-emerald-300"><CheckCircle2 size={16}/> {completedCount} done</span></span>}
              <button onClick={()=>setView('calendar')} className="px-5 py-3 rounded-full bg-white text-[#3B1A6B] font-black text-sm shadow hover:scale-[1.03] transition flex items-center gap-2"><Calendar size={16}/> Calendar View</button>
            </div>
          </div>
          <div className="relative mt-6 max-w-xl"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value); setDisplayedCount(9);}} placeholder="Search devotionals, authors, or Scripture…" className="w-full bg-white text-slate-900 rounded-full pl-11 pr-4 py-3.5 text-sm font-medium shadow-lg outline-none focus:ring-4 ring-amber-300/50 placeholder:text-slate-400" /></div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {loadError && <p className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold rounded-2xl px-4 py-3 mb-6">{loadError}</p>}
        {notice && <p className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl px-4 py-3 mb-6">{notice}</p>}
        {filtered.length===0 ? <div className="bg-white rounded-[28px] border p-10 text-center"><p className="text-4xl mb-3">📖</p><p className="font-black text-lg">No devotionals found</p><p className="text-slate-500 text-sm mt-1">{search?`Nothing matched “${search}”. Try another word.`:'No devotionals have been published yet.'}</p>{search && <button onClick={()=>setSearch('')} className="mt-4 px-5 py-2.5 rounded-full bg-violet-600 text-white text-sm font-bold">Clear search</button>}</div> : (
          <>
            <p className="text-sm font-bold text-slate-500 mb-4">{filtered.length} devotional{filtered.length!==1?'s':''} {search&&`for “${search}”`}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.slice(0,displayedCount).map((d,i)=>(
                <button key={d.id} onClick={()=>openEntry(d)} className="group text-left bg-white rounded-[26px] overflow-hidden border border-slate-100 shadow-lg shadow-slate-100 hover:-translate-y-1.5 hover:shadow-2xl transition">
                  <div className="relative h-48 overflow-hidden"><img src={d.cover_photo_url||FALLBACK_COVER} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" onError={(e)=>{(e.target as HTMLImageElement).src=FALLBACK_COVER;}}/><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/><span className="absolute bottom-3 left-3 bg-white/95 text-xs font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5"><Book size={12} className="text-violet-600"/>{d.scripture_book} {d.scripture_chapter}:{d.scripture_verse}</span>{d.user_completed && <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow"><CheckCircle2 size={12}/> Completed</span>}</div>
                  <div className="p-5"><p className="text-xs font-bold text-amber-600 flex items-center gap-1.5"><Calendar size={13}/> {prettyDate(d.scheduled_date)}</p><h2 className="font-black text-lg leading-snug mt-2 line-clamp-2 group-hover:text-violet-700 transition">{d.title}</h2>{d.author && <p className="text-xs font-bold text-slate-500 mt-1.5">By {d.author}</p>}<p className="text-slate-600 text-sm leading-relaxed mt-2 line-clamp-3">{cleanPreview(d.devotional_text).slice(0,160)}{cleanPreview(d.devotional_text).length>160?'…':''}</p><span className="inline-flex items-center gap-1.5 mt-4 text-sm font-black text-violet-700">Read devotional <ArrowRight size={15} className="group-hover:translate-x-0.5 transition"/></span></div>
                </button>
              ))}
            </div>
            {displayedCount<filtered.length && <div className="text-center mt-10"><button onClick={()=>setDisplayedCount(c=>c+9)} className="px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black shadow-lg hover:scale-[1.03] transition">Load more ({filtered.length-displayedCount} remaining)</button></div>}
          </>
        )}
      </section>
      {selectedEntry && <DevotionalReader entry={selectedEntry} parsedFurther={parsedFurtherReadings} lang={devotionalLang} setLang={setDevotionalLang} textSizes={textSizes} font={{increase:increaseFontSize,decrease:decreaseFontSize}} onClose={()=>setSelectedEntry(null)} onToggleComplete={markComplete} onVerse={openVerse} onNavigate={navigateToVerse} onShare={shareDevotional} notice={notice} />}
      <ScriptureVersePopup popup={scripturePopup} onClose={closeScripturePopup} />
    </main>
  );

  /* ---------- CALENDAR ---------- */
  const daysInMonth=new Date(currentYear,currentMonth+1,0).getDate();
  const firstDay=new Date(currentYear,currentMonth,1).getDay();
  const monthEntries=entries.filter(e=>{ const d=new Date(e.scheduled_date.substring(0,10)+'T12:00:00'); return d.getMonth()===currentMonth && d.getFullYear()===currentYear; });
  return (
    <main className="min-h-screen bg-[#FFFBF2] text-slate-900">
      <header className="bg-gradient-to-r from-[#2B1055] via-[#5B2A86] to-[#E85D75] text-white"><div className="max-w-7xl mx-auto px-5 sm:px-8 py-8"><button onClick={()=>setView('grid')} className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white mb-3"><ChevronLeft size={16}/> Back to devotionals</button><h1 className="text-3xl font-black">{selectedPlan?.title||'Daily Devotionals'}</h1><p className="text-white/80 mt-1 max-w-2xl">{selectedPlan?.description||'Pick a day and read that day’s devotional.'}</p>
        {plans.length>1 && <div className="flex gap-2 mt-5 overflow-x-auto pb-1">{plans.map(p=>(<button key={p.id} onClick={()=>setSelectedPlan(p)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${selectedPlan?.id===p.id?'bg-white text-[#3B1A6B] shadow':'bg-white/15 border border-white/25 hover:bg-white/25'}`}>{p.title}</button>))}</div>}
      </div></header>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {notice && <p className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl px-4 py-3 mb-5">{notice}</p>}
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-100 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center"><Calendar size={20}/></span><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Plan calendar</p><p className="text-xl font-black">{MONTH_NAMES[currentMonth]} {currentYear}</p></div></div>
            <div className="flex items-center gap-2"><button onClick={()=>{ if(currentMonth===0){setCurrentMonth(11);setCurrentYear(y=>y-1);} else setCurrentMonth(m=>m-1); }} className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-sm flex items-center gap-1"><ChevronLeft size={16}/> Prev</button><button onClick={()=>{ const n=new Date(); setCurrentMonth(n.getMonth()); setCurrentYear(n.getFullYear()); }} className="px-4 py-2.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-sm">Today</button><button onClick={()=>{ if(currentMonth===11){setCurrentMonth(0);setCurrentYear(y=>y+1);} else setCurrentMonth(m=>m+1); }} className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-sm flex items-center gap-1">Next <ChevronRight size={16}/></button></div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 mb-4"><span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-amber-400"/> Today</span><span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-100 border-2 border-emerald-400"/> Completed</span><span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-rose-50 border-2 border-rose-300"/> Available</span><span className="flex items-center gap-1.5"><Lock size={12}/> Future (locked)</span><span className="ml-auto">{monthEntries.length} in this month · {entries.length} total</span></div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="text-center text-xs font-black text-slate-400 py-2">{d}</div>)}
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth}).map((_,idx)=>{ const day=idx+1; const dateStr=`${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; const date=new Date(currentYear,currentMonth,day); const today=new Date(); today.setHours(0,0,0,0); const isToday=dateStr===toDateStr(today); const isFuture=date>today; const dayEntries=entries.filter(e=>e.scheduled_date?.substring(0,10)===dateStr); const done=dayEntries.some(e=>e.user_completed); const has=dayEntries.length>0;
              return <button key={day} disabled={isFuture} onClick={()=>handleDateSelect(date)} className={`min-h-[64px] sm:min-h-[76px] rounded-2xl border-2 p-1.5 sm:p-2 text-left transition relative ${isToday?'border-amber-400 bg-amber-50 shadow-md':has&&done?'border-emerald-300 bg-emerald-50':has?'border-rose-200 bg-rose-50/60':'border-slate-100 bg-white'} ${isFuture?'opacity-45 cursor-not-allowed':'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'}`}>
                <span className={`text-sm font-black ${isToday?'text-amber-700':'text-slate-800'}`}>{day}</span>
                {has && <span className={`mt-1 hidden sm:flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${done?'bg-emerald-500 text-white':'bg-rose-500 text-white'}`}>{done?<CheckCircle2 size={11}/>:<Book size={11}/>} {done?'Done':'Read'}</span>}
                {has && <span className={`sm:hidden absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ${done?'bg-emerald-500':'bg-rose-500'}`}/>}
                {isFuture && <Lock size={12} className="absolute bottom-1.5 right-1.5 text-slate-400"/>}
              </button>; })}
          </div>
        </div>
      </section>
      {selectedEntry && <DevotionalReader entry={selectedEntry} parsedFurther={parsedFurtherReadings} lang={devotionalLang} setLang={setDevotionalLang} textSizes={textSizes} font={{increase:increaseFontSize,decrease:decreaseFontSize}} onClose={()=>setSelectedEntry(null)} onToggleComplete={markComplete} onVerse={openVerse} onNavigate={navigateToVerse} onShare={shareDevotional} notice={notice} />}
      <ScriptureVersePopup popup={scripturePopup} onClose={closeScripturePopup} />
    </main>
  );
}
