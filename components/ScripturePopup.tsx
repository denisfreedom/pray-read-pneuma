"use client";
// components/ScripturePopup.tsx — elegant modal, keeps scroll position, prev/next ref navigation
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import type { ScriptureRef } from "@/lib/scripture-parser";
export default function ScripturePopup({refs,initialIndex,onClose}:{refs:ScriptureRef[];initialIndex:number;onClose:()=>void}){
  const [idx,setIdx]=useState(initialIndex);
  const [text,setText]=useState(""); const [loading,setLoading]=useState(true);
  const ref=refs[idx];
  useEffect(()=>{ if(!ref) return; setLoading(true);
    fetch(`/api/bible/verse?book=${encodeURIComponent(ref.book)}&chapter=${ref.chapter}&verse=${ref.verseStart}&end=${ref.verseEnd}`).then(r=>r.json()).then(d=>{setText(d.text||d.verse?.text_english||"Scripture could not be loaded. Please open the Bible reader.");}).catch(()=>setText("Scripture could not be loaded.")).finally(()=>setLoading(false));
  },[idx,ref]);
  useEffect(()=>{ const h=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose(); }; window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h); },[onClose]);
  if(!ref) return null;
  return (<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose}>
    <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl" onClick={e=>e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74826f]">Scripture</p><h3 className="mt-1 font-serif text-2xl text-[#1c382e]">{ref.book} {ref.chapter}:{ref.verseStart}{ref.verseEnd!==ref.verseStart?`–${ref.verseEnd}`:""}</h3></div><button onClick={onClose} aria-label="Close" className="rounded-full bg-[#eef1e7] p-2"><X className="h-5 w-5"/></button></div>
      <div className="mt-4 max-h-[50vh] overflow-y-auto"><p className="text-sm text-[#74826f] flex items-center gap-2"><BookOpen className="h-4 w-4"/> {loading?"Loading…":""}</p>{!loading && <p className="mt-2 font-serif text-lg leading-8 text-[#213a30]">{text}</p>}<p className="mt-4 text-xs text-[#9aa493]">Translation as used in Pray-Read Bible. Continue reading — your place in the prayer is preserved.</p></div>
      {refs.length>1 && <div className="mt-5 flex items-center justify-between"><button disabled={idx===0} onClick={()=>setIdx(idx-1)} className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4"/> Previous reference</button><span className="text-xs text-[#9aa493]">{idx+1} of {refs.length}</span><button disabled={idx===refs.length-1} onClick={()=>setIdx(idx+1)} className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm disabled:opacity-40">Next reference <ChevronRight className="h-4 w-4"/></button></div>}
    </div></div>);
}
