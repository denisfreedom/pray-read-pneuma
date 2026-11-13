"use client";
import { useState, useMemo } from 'react';
import { X, Link2, Check, Share2 } from 'lucide-react';

// components/VerseShare.tsx — REDESIGNED
// Shares: VERSE + its PRAYER passage + its CROSS-REFERENCES + deep link back to that exact verse.
// Real brand icons (inline SVG, no emoji): WhatsApp, Facebook, Telegram, Instagram, X, LinkedIn + Copy Link + Native Share.
// Usage in chapter reader:
//   <VerseShare book={bookName} chapter={chapterNum} verse={v.verse} text={verseText(v)}
//     prayerEn={pr.en} prayerLu={pr.lu} crossRefs={crossRefsForVerse} isDark={theme==='dark'} />
// If crossRefs are not loaded yet, pass [] — the sheet still opens, and shows "Tap Cross-Ref first" hint.
// The parent chapter page already loads crossRefs on Cross-Ref tap; for Share we lazy-load them here too if empty.

export interface CrossRefItem {
  target_book_name?: string;
  target_book_number?: number;
  target_book_id?: number;
  target_chapter?: number;
  target_verse?: number;
  text_english?: string;
  text?: string;
}

interface VerseShareProps {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  prayerEn?: string;
  prayerLu?: string;
  crossRefs?: CrossRefItem[];
  bookNum?: number; // for lazy-loading cross-refs if parent didn't pass them
  isDark?: boolean;
}

function BrandIcon({ name, size = 22 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as any;
  if (name === 'whatsapp') return (<svg {...common}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>);
  if (name === 'facebook') return (<svg {...common}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>);
  if (name === 'telegram') return (<svg {...common}><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.5.5 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>);
  if (name === 'instagram') return (<svg {...common}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>);
  if (name === 'x') return (<svg {...common}><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z"/></svg>);
  if (name === 'linkedin') return (<svg {...common}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>);
  return null;
}

export default function VerseShare({ book, chapter, verse, text, prayerEn = '', prayerLu = '', crossRefs = [], bookNum, isDark = false }: VerseShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadedRefs, setLoadedRefs] = useState<CrossRefItem[]>(crossRefs);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const ref = `${book} ${chapter}:${verse}`;
  const deepLink = typeof window !== 'undefined' ? `${window.location.origin}/bible-reader/${bookNum ?? ''}/${chapter}#verse-${verse}`.replace('//bible-reader', '/bible-reader') : '';
  // If bookNum is missing, fall back to current page URL without hash + new hash — parent should pass bookNum
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    if (bookNum) return `${window.location.origin}/bible-reader/${bookNum}/${chapter}#verse-${verse}`;
    const base = window.location.href.split('#')[0];
    return `${base}#verse-${verse}`;
  }, [bookNum, chapter, verse]);

  const refs = loadedRefs.length ? loadedRefs : crossRefs;
  const prayerText = [prayerEn?.trim(), prayerLu?.trim()].filter(Boolean).join('\n\n');
  const refsText = refs.slice(0, 6).map(r => {
    const label = `${r.target_book_name || `Book ${r.target_book_id ?? r.target_book_number ?? ''}`} ${r.target_chapter}:${r.target_verse}`;
    const t = (r.text_english || r.text || '').trim();
    return t ? `${label} — ${t}` : label;
  }).join('\n');

  const fullText = useMemo(() => {
    const parts = [`${ref}`, '', `“${(text || '').trim()}”`];
    if (prayerText) parts.push('', '🙏 PRAY-READ PRAYER:', prayerText);
    if (refsText) parts.push('', '🔗 CROSS-REFERENCES:', refsText);
    parts.push('', `Read & pray this verse: ${shareUrl}`, '', '— Shared from Pray-Read Bible');
    return parts.join('\n');
  }, [ref, text, prayerText, refsText, shareUrl]);

  const openSheet = async () => {
    setOpen(true);
    // Lazy-load cross-refs if parent didn't pass any — so Share still carries them
    if (!refs.length && bookNum) {
      setLoadingRefs(true);
      try {
        const urls = [
          `/api/cross-references?source_book_number=${bookNum}&source_chapter=${chapter}&source_verse=${verse}`,
          `/api/verse-cross-references?source_book_number=${bookNum}&source_chapter=${chapter}&source_verse=${verse}`,
        ];
        for (const u of urls) {
          try { const r = await fetch(u); const d = await r.json().catch(() => []); const arr = Array.isArray(d) ? d : (d?.refs || []); if (arr.length) { setLoadedRefs(arr); break; } } catch {}
        }
      } finally { setLoadingRefs(false); }
    }
  };

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const enc = encodeURIComponent;
  const links = {
    whatsapp: `https://wa.me/?text=${enc(fullText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(fullText)}`,
    telegram: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(fullText)}`,
    x: `https://twitter.com/intent/tweet?text=${enc(fullText)}&url=${enc(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
  };

  const btn = (label: string, color: string, icon: string, onClick: () => void, sub?: string) => (
    <button key={label} onClick={onClick} className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition hover:opacity-90 active:scale-95" style={{ background: color, color: '#fff' }}>
      <BrandIcon name={icon} />
      <span className="text-[11px] font-bold leading-tight text-center">{label}{sub ? <><br /><span className="text-[9px] font-normal opacity-90">{sub}</span></> : null}</span>
    </button>
  );

  return (
    <>
      <button onClick={openSheet} className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-900 text-[13.5px] font-medium hover:bg-purple-200 transition" title={`Share ${ref} with prayer + cross-refs`}>🔗 Share</button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className={`w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-[16px]">Share {ref}</p>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center"><X size={16} /></button>
            </div>
            <p className={`text-[12px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Verse + Prayer + Cross-References + link back to this exact verse</p>

            {/* PREVIEW — what will be shared */}
            <div className={`rounded-xl border p-3 mb-4 text-[13px] leading-relaxed whitespace-pre-wrap max-h-[220px] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className="font-bold">{ref}</p>
              <p className="italic mt-1">“{text}”</p>
              {prayerText ? <><p className="font-bold mt-3">🙏 PRAY-READ PRAYER:</p><p>{prayerText}</p></> : <p className="italic mt-2 opacity-70">No prayer added for this verse yet.</p>}
              {loadingRefs ? <p className="italic mt-2 opacity-70">Loading cross-references…</p> : refsText ? <><p className="font-bold mt-3">🔗 CROSS-REFERENCES:</p><p>{refsText}</p></> : <p className="italic mt-2 opacity-70">No cross-references for this verse.</p>}
              <p className="mt-3 text-[12px] break-all text-blue-700">{shareUrl}</p>
            </div>

            {/* BRAND BUTTONS */}
            <div className="grid grid-cols-3 gap-2.5">
              <a href={links.whatsapp} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-white hover:opacity-90 active:scale-95" style={{ background: '#25D366' }}><BrandIcon name="whatsapp" /><span className="text-[11px] font-bold">WhatsApp</span></a>
              <a href={links.facebook} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-white hover:opacity-90 active:scale-95" style={{ background: '#1877F2' }}><BrandIcon name="facebook" /><span className="text-[11px] font-bold">Facebook</span></a>
              <a href={links.telegram} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-white hover:opacity-90 active:scale-95" style={{ background: '#229ED9' }}><BrandIcon name="telegram" /><span className="text-[11px] font-bold">Telegram</span></a>
              <button onClick={async () => { await copyAll(); }} className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-white hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)' }}><BrandIcon name="instagram" /><span className="text-[11px] font-bold">Instagram</span><span className="text-[9px] opacity-90 -mt-1">Copy &amp; paste</span></button>
              <a href={links.x} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-white hover:opacity-90 active:scale-95" style={{ background: '#000' }}><BrandIcon name="x" /><span className="text-[11px] font-bold">X / Twitter</span></a>
              <a href={links.linkedin} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-white hover:opacity-90 active:scale-95" style={{ background: '#0A66C2' }}><BrandIcon name="linkedin" /><span className="text-[11px] font-bold">LinkedIn</span></a>
            </div>

            <button onClick={copyAll} className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>{copied ? <><Check size={16} /> Copied verse + prayer + cross-refs + link!</> : <><Link2 size={16} /> Copy verse + prayer + cross-refs + link</>}</button>
            <button onClick={async () => { if ((navigator as any).share) { try { await (navigator as any).share({ title: ref, text: fullText, url: shareUrl }); } catch {} } else { await copyAll(); } }} className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-800 flex items-center justify-center gap-2"><Share2 size={16} /> More / Native Share</button>
            <p className="text-[11px] text-slate-400 text-center mt-2">Instagram has no direct share link — tap it to copy everything, then paste in Instagram. Facebook / LinkedIn open with the link — paste the copied text as the caption for prayer + cross-refs.</p>
          </div>
        </div>
      )}
    </>
  );
}
