"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

// app/components/VerseOfTheDayPopup.tsx — BEAUTIFIED
// Same blue identity as the live popup, but with a proper layout:
//  - the card never overflows: header + scrollable verse body + STICKY footer,
//    so the orange "Pray-Read" button is never cut off at the bottom
//  - soft white verse cards (readable) instead of heavy dark slabs
//  - real date line from the API (Kampala date), language toggle, share row
// Usage (mount ONCE, e.g. in app/page.tsx or layout):
//   import VerseOfTheDayPopup from '@/components/VerseOfTheDayPopup';
//   <VerseOfTheDayPopup />
// Shows once per day per browser (localStorage key includes the date).
// Props: autoOpen (default true) — pass false and control it yourself with `open` + `onClose`.

type Verse = {
  id?: number; book_id?: number; book_number?: number; chapter: number; verse: number;
  text_english: string; text_luganda?: string; name_english: string; name_luganda?: string;
};

function formatDateLabel(iso?: string): string {
  // "2026-11-13" -> "Friday, November 13, 2026" (parsed as local date, no timezone shift)
  try {
    const [y, m, d] = (iso || '').split('-').map(Number);
    const dt = y && m && d ? new Date(y, m - 1, d) : new Date();
    return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
}

export default function VerseOfTheDayPopup({ autoOpen = true, open: controlledOpen, onClose }: { autoOpen?: boolean; open?: boolean; onClose?: () => void }) {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [dateLabel, setDateLabel] = useState('');
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
          setDateLabel(formatDateLabel(data?.date));
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
  const refLu = `${verse.name_luganda || verse.name_english} ${verse.chapter}:${verse.verse}`;
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

  const showEnglish = lang === 'english' || lang === 'both' || !verse.text_luganda;
  const showLuganda = (lang === 'luganda' || lang === 'both') && !!verse.text_luganda;

  const glassBtn: React.CSSProperties = { padding: '9px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(8,12,30,0.72)', backdropFilter: 'blur(8px)' }} onClick={close}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Verse of the Day" style={{ position: 'relative', width: '100%', maxWidth: 580, borderRadius: 28, overflow: 'hidden', background: 'linear-gradient(165deg,#1E3A8A 0%,#1D4ED8 52%,#1E40AF 100%)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', flexDirection: 'column', maxHeight: 'min(92vh, 740px)' }}>

        {/* ── HEADER ── */}
        <div style={{ position: 'relative', padding: '26px 28px 6px', textAlign: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {/* soft gold rings, purely decorative */}
          <div style={{ position: 'absolute', right: -34, top: -34, width: 150, height: 150, borderRadius: '50%', border: '20px solid rgba(252,211,77,0.16)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 34, top: 22, width: 78, height: 78, borderRadius: '50%', border: '2px solid rgba(252,211,77,0.35)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: 26, top: 30, fontSize: 56, opacity: 0.14, fontFamily: 'Georgia, serif', color: '#FCD34D', pointerEvents: 'none' }}>✦</div>
          <button onClick={close} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 18, lineHeight: 1, cursor: 'pointer', zIndex: 2 }}>×</button>

          <p style={{ margin: 0, fontSize: 11, letterSpacing: 4, color: '#FCD34D', fontWeight: 800 }}>✦ PRAY-READ BIBLE ✦</p>
          <h2 style={{ margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: 34, lineHeight: 1.1, fontWeight: 700, color: '#fff' }}>Verse of the Day</h2>
          {dateLabel && <p style={{ margin: '12px 0 0' }}><span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', color: '#E0E7FF', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{dateLabel}</span></p>}
        </div>

        {/* ── SCROLLABLE VERSE BODY (only this part scrolls) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Language toggle */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: 4 }}>
              {([['english', 'English'], ['luganda', 'Luganda'], ['both', 'Both']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setLang(k)} style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: lang === k ? '#fff' : 'transparent', color: lang === k ? '#1E3A8A' : '#E0E7FF' }}>{label}</button>
              ))}
            </div>
          </div>

          {showEnglish && (
            <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px 22px 18px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 44, lineHeight: 0.5, color: '#F59E0B' }}>“</div>
              <p style={{ margin: '10px 0 0', fontFamily: 'Georgia, serif', fontSize: 20, lineHeight: 1.6, color: '#1E293B', fontStyle: 'italic' }}>{verse.text_english}</p>
              <p style={{ margin: '14px 0 0', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#EA580C' }}>— {ref}</p>
            </div>
          )}

          {showLuganda && (
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 18, padding: '18px 22px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: 3, color: '#B45309', fontWeight: 800 }}>LUGANDA</p>
              <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 17.5, lineHeight: 1.65, color: '#334155', fontStyle: 'italic' }}>{verse.text_luganda}</p>
              <p style={{ margin: '12px 0 0', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#EA580C' }}>— {refLu}</p>
            </div>
          )}

          <p style={{ margin: '2px 0 0', textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontStyle: 'italic' }}>A word to pray, read, and carry through your day.</p>
        </div>

        {/* ── STICKY FOOTER — the button can never be cut off ── */}
        <div style={{ flexShrink: 0, padding: '14px 22px 20px', background: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.22))', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <Link href={readerUrl} onClick={close} style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(90deg,#F97316,#EA580C)', color: '#fff', padding: '14px', borderRadius: 14, fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 10px 24px rgba(234,88,12,0.45)' }}>🙏 Pray-Read This Verse →</Link>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            <button onClick={copy} style={{ ...glassBtn, ...(copied ? { background: '#DCFCE7', color: '#166534', border: '1px solid transparent' } : {}) }}>{copied ? '✓ Copied!' : '🔗 Copy'}</button>
            <button onClick={() => share(`https://wa.me/?text=${encodeURIComponent(shareText)}`)} style={glassBtn}>WhatsApp</button>
            <button onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://prayreadbible.org' + readerUrl)}&quote=${encodeURIComponent(shareText)}`)} style={glassBtn}>Facebook</button>
            <button onClick={() => share(`https://t.me/share/url?url=${encodeURIComponent('https://prayreadbible.org' + readerUrl)}&text=${encodeURIComponent(shareText)}`)} style={glassBtn}>Telegram</button>
          </div>
          <button onClick={close} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', padding: 4 }}>Continue to the Bible →</button>
        </div>
      </div>
    </div>
  );
}
