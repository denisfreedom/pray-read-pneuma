"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

// app/components/VerseOfTheDayPopup.tsx — BEAUTIFUL ART POPUP
// Ivory + navy + gold (your theme), full of art, mobile-stacked.
// Usage (e.g. in app/page.tsx or layout):
//   import VerseOfTheDayPopup from '@/app/components/VerseOfTheDayPopup';
//   <VerseOfTheDayPopup />
// Shows once per day per browser (localStorage key includes the date).
// Props: autoOpen (default true) — pass false and control it yourself with `open` + `onClose`.

type Verse = {
  id?: number; book_id?: number; book_number?: number; chapter: number; verse: number;
  text_english: string; text_luganda?: string; name_english: string; name_luganda?: string;
};

export default function VerseOfTheDayPopup({ autoOpen = true, open: controlledOpen, onClose }: { autoOpen?: boolean; open?: boolean; onClose?: () => void }) {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [lang, setLang] = useState<'english' | 'luganda' | 'both'>('both');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const close = () => { if (onClose) onClose(); else setInternalOpen(false); };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/verse-of-the-day', { cache: 'no-store' });
        const data = await res.json();
        const v: Verse | null = data?.verse || data || null;
        if (!cancelled && v) {
          setVerse(v);
          if (autoOpen && controlledOpen === undefined) {
            // Show once per day: key includes the date from the API
            const key = `votd-seen-${data?.date || new Date().toISOString().slice(0, 10)}`;
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, '1');
              setInternalOpen(true);
            }
          }
        }
      } catch { /* keep popup hidden if API fails — page must never crash */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [autoOpen, controlledOpen]);

  if (loading || !verse || !open) return null;

  const ref = `${verse.name_english} ${verse.chapter}:${verse.verse}`;
  const bookNum = verse.book_number ?? verse.book_id ?? 1;
  const readerUrl = `/bible-reader/${bookNum}/${verse.chapter}#verse-${verse.verse}`;
  const shareText = `✨ Verse of the Day — ${ref}\n\n"${verse.text_english}"\n\n👉 Read more: https://prayreadbible.org${readerUrl}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText); } catch {
      const ta = document.createElement('textarea'); ta.value = shareText; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const share = (url: string) => window.open(url, '_blank', 'noopener,width=640,height=560');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(6px)' }} onClick={close}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 560, borderRadius: 28, overflow: 'hidden', background: '#FFFEF7', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', border: '1px solid #E7C873' }}>
        {/* ART HEADER — navy + gold, no photo needed, pure art */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg,#0F2043 0%,#1E3A6E 45%,#8A6D1B 100%)', padding: '28px 28px 22px', color: '#FFFEF7', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 170, height: 170, borderRadius: '50%', border: '22px solid rgba(231,200,115,0.18)' }} />
          <div style={{ position: 'absolute', right: 40, top: 24, width: 90, height: 90, borderRadius: '50%', border: '2px solid rgba(231,200,115,0.35)' }} />
          <div style={{ position: 'absolute', left: 26, bottom: 10, fontSize: 64, opacity: 0.12, fontFamily: 'serif' }}>✦</div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: 4, color: '#E7C873', fontWeight: 800 }}>✦ PRAY-READ BIBLE ✦</p>
          <h2 style={{ margin: '10px 0 0', fontFamily: 'Georgia, serif', fontSize: 30, lineHeight: 1.1, fontWeight: 700 }}>Verse of the Day</h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#CBD5E1' }}>A word to pray, read, and carry through your day.</p>
          <button onClick={close} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        {/* REFERENCE RIBBON */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -16, position: 'relative', zIndex: 1 }}>
          <span style={{ background: 'linear-gradient(90deg,#B9972F,#E7C873)', color: '#0F2043', fontWeight: 900, fontSize: 15, padding: '9px 22px', borderRadius: 999, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', border: '2px solid #FFFEF7' }}>📖 {ref}</span>
        </div>

        {/* VERSE BODY */}
        <div style={{ padding: '20px 28px 8px' }}>
          <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 52, lineHeight: 0.4, color: '#E7C873' }}>“</div>
          {(lang === 'english' || lang === 'both') && (
            <p style={{ margin: '6px 0 0', fontFamily: 'Georgia, serif', fontSize: 21, lineHeight: 1.65, color: '#1E293B', textAlign: 'center' }}>{verse.text_english}</p>
          )}
          {(lang === 'luganda' || lang === 'both') && verse.text_luganda && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #E7C873' }}>
              <p style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 11, letterSpacing: 3, color: '#8A6D1B', fontWeight: 800 }}>LUGANDA</p>
              <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 18, lineHeight: 1.65, color: '#475569', textAlign: 'center', fontStyle: 'italic' }}>{verse.text_luganda}</p>
            </div>
          )}
          {/* Language toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {([['english', 'English'], ['luganda', 'Luganda'], ['both', 'Both']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setLang(k)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: lang === k ? '2px solid #0F2043' : '1px solid #E2E8F0', background: lang === k ? '#0F2043' : '#fff', color: lang === k ? '#fff' : '#475569' }}>{label}</button>
            ))}
          </div>
        </div>

        {/* DIVIDER ORNAMENT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 28px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E7C873' }} /><span style={{ color: '#B9972F', fontSize: 16 }}>✦ ✦ ✦</span><div style={{ flex: 1, height: 1, background: '#E7C873' }} />
        </div>

        {/* ACTIONS — stacked on mobile */}
        <div style={{ padding: '16px 28px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href={readerUrl} onClick={close} style={{ display: 'block', textAlign: 'center', background: '#0F2043', color: '#fff', padding: '13px', borderRadius: 14, fontWeight: 800, textDecoration: 'none' }}>📖 Open in Bible Reader → {ref}</Link>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://prayreadbible.org' + readerUrl)}&quote=${encodeURIComponent(shareText)}`)} style={{ padding: '9px 14px', borderRadius: 999, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Facebook</button>
            <button onClick={() => share(`https://wa.me/?text=${encodeURIComponent(shareText)}`)} style={{ padding: '9px 14px', borderRadius: 999, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>WhatsApp</button>
            <button onClick={() => share(`https://t.me/share/url?url=${encodeURIComponent('https://prayreadbible.org' + readerUrl)}&text=${encodeURIComponent(shareText)}`)} style={{ padding: '9px 14px', borderRadius: 999, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Telegram</button>
            <button onClick={copy} style={{ padding: '9px 14px', borderRadius: 999, border: '1px solid #0F2043', background: copied ? '#DCFCE7' : '#0F2043', color: copied ? '#166534' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{copied ? '✓ Copied!' : '🔗 Copy'}</button>
          </div>
          <button onClick={close} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: 4 }}>Continue to the Bible →</button>
        </div>
      </div>
    </div>
  );
}
