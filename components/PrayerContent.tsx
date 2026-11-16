"use client";
// components/PrayerContent.tsx — renders prayer HTML, turns every Scripture ref into a clickable popup trigger
import { useMemo, useState } from "react";
import { parseScriptureRefs, type ScriptureRef } from "@/lib/scripture-parser";
import ScripturePopup from "./ScripturePopup";
export default function PrayerContent({html}:{html:string}){
  const [popup,setPopup]=useState<{refs:ScriptureRef[];index:number}|null>(null);
  const refs=useMemo(()=>parseScriptureRefs(html.replace(/<[^>]+>/g," ")),[html]);
  // Lightweight approach: render HTML, then attach click handling via delegation.
  // Each ref in order gets a button overlay — simplest reliable method: replace refs with buttons in the HTML string.
  const rendered=useMemo(()=>{
    let out=html; let offset=0;
    // Work on plain-text version is complex with HTML — instead we enhance after mount via DOM walk.
    return out;
  },[html]);
  return (<div>
    <div className="prayer-scroll prose prose-lg max-w-none font-serif leading-8 text-[#213a30] [&_blockquote]:border-l-4 [&_blockquote]:border-[#e9c981] [&_blockquote]:pl-4 [&_blockquote]:italic [&_h3]:font-sans [&_h3]:text-xl [&_h3]:font-semibold"
      dangerouslySetInnerHTML={{__html:rendered}}
      ref={(el)=>{ if(!el) return; const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); const nodes: Text[]=[]; let n; while((n=walker.nextNode())) nodes.push(n as Text);
        nodes.forEach(node=>{ const r=parseScriptureRefs(node.textContent||""); if(!r.length) return; const frag=document.createDocumentFragment(); let last=0;
          r.forEach((ref,ri)=>{ frag.appendChild(document.createTextNode(node.textContent!.slice(last,ref.start))); const b=document.createElement("button"); b.type="button"; b.textContent=ref.raw; b.className="scripture-ref font-sans font-semibold text-[#315d4b] underline decoration-[#e9c981] decoration-2 underline-offset-4 hover:text-[#1d4035]"; b.onclick=()=>setPopup({refs:refsInOrder(),index:indexInOrder(ref)}); frag.appendChild(b); last=ref.end; });
          frag.appendChild(document.createTextNode(node.textContent!.slice(last))); node.replaceWith(frag); });
        function refsInOrder(){ return parseScriptureRefs(el.textContent||""); } function indexInOrder(target:ScriptureRef){ const all=refsInOrder(); return Math.max(0,all.findIndex(x=>x.raw===target.raw&&x.chapter===target.chapter)); }
      }} />
    {popup && <ScripturePopup refs={popup.refs} initialIndex={popup.index} onClose={()=>setPopup(null)} />}
    <style jsx>{`.prayer-scroll p{margin-bottom:1.25rem}`}</style>
  </div>);
}
