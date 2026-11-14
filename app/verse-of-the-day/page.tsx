"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

// app/verse-of-the-day/page.tsx
// The header and footer already link here (AppNavbar / AppFooter), but the page
// itself never existed — so the link 404'd. This page shows the SAME verse the
// opening popup shows (same /api/verse-of-the-day, one verse per day), so a user
// who closed the popup can still come back here any time and read, pray, share
// or open it in the Bible Reader.

type Verse = {
  id?: number; book_id?: number; book_number?: number; chapter: number; verse: number;
  text_english: string; text_luganda?: string; name_english: string; name_luganda?: string;
};

const FALLBACK: Verse = {
  id: 0, book_id: 43, book_number: 43, chapter: 3, verse: 16,
  text_english: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
  text_luganda: 'Kubanga Katonda bwe yayagala ensi, n’awa Omwana we omu yekka, buli amukkiriza aleme kuzikirira wabula abeere n’obulamu obutaggwaawo.',
  name_english: 'John', name_luganda: 'Yokaana',
};

export default function VerseOfTheDayPage() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [date, setDate] = useState('');
  const [lang, setLang] = useState<'english' | 'luganda' | 'both'>('both');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/verse-of-the-day', { cache: 'no-store' });
        const data = await res.json();
        // API returns { success, date, verse: {...} } and also the flat fields
        const v: Verse | null = data?.verse || (data?.text_english ? data : null);
        if (!cancelled && v) {
          setVerse(v);
          if (data?.date) setDate(data.date);
        } else if (!cancelled) {
          setVerse(FALLBACK);
        }
      } catch {
        if (!cancelled) setVerse(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const prettyDate = (() => {
    try {
      const d = date ? new Date(date + 'T00:00:00') : new Date();
      return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  const ref = verse ? `${verse.name_english} ${verse.chapter}:${verse.verse}` : '';
  const bookNum = verse ? (verse.book_number ?? verse.book_id ?? 1) : 1;
  const readerUrl = verse ? `/bible-reader/${bookNum}/${verse.chapter}#verse-${verse.verse}` : '/bible-reader';
  const shareText = verse ? `✨ Verse of the Day — ${ref}\n\n"${verse.text_english}"\n\n👉 Read more: https://prayreadbible.org${readerUrl}` : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText); } catch {
      const ta = document.createElement('textarea'); ta.value = shareText; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const share = (url: string) => window.open(url, '_blank', 'noopener,width=640,height=560');

  return (
    <div className="min-h-screen" style={{ background: '#FFFEF7' }}>
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        {/* ART HEADER — same navy + gold art as the popup */}
        <div className="relative overflow-hidden rounded-[28px] text-center" style={{ background: 'linear-gradient(135deg,#0F2043 0%,#1E3A6E 45%,#8A6D1B 100%)', border: '1px solid #E7C873' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 170, height: 170, borderRadius: '50%', border: '22px solid rgba(231,200,115,0.18)' }} />
          <div style={{ position: 'absolute', right: 40, top: 24, width: 90, height: 90, borderRadius: '50%', border: '2px solid rgba(231,200,115,0.35)' }} />
          <div className="relative px-6 pt-10 pb-8">
            <p style={{ margin: 0, fontSize: 11, letterSpacing: 4, color: '#E7C873', fontWeight: 800 }}>✦ PRAY-READ BIBLE ✦</p>
            <h1 style={{ margin: '10px 0 0', fontFamily: 'Georgia, serif', fontSize: 36, lineHeight: 1.1, fontWeight: 700, color: '#FFFEF7' }}>Verse of the Day</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#CBD5E1' }}>A word to pray, read, and carry through your day.</p>
            {prettyDate && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#E7C873', fontWeight: 700 }}>{prettyDate}</p>}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Loading today&apos;s verse…</div>
        ) : verse ? (
          <>
            {/* REFERENCE RIBBON */}
            <div className="flex justify-center -mt-5 relative z-10">
              <span style={{ background: 'linear-gradient(90deg,#B9972F,#E7C873)', color: '#0F2043', fontWeight: 900, fontSize: 16, padding: '10px 26px', borderRadius: 999, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', border: '2px solid #FFFEF7' }}>📖 {ref}</span>
            </div>

            {/* VERSE BODY */}
            <div className="px-2 md:px-8 pt-6">
              <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 56, lineHeight: 0.4, color: '#E7C873' }}>“</div>
              {(lang === 'english' || lang === 'both') && (
                <p style={{ margin: '8px 0 0', fontFamily: 'Georgia, serif', fontSize: 24, lineHeight: 1.65, color: '#1E293B', textAlign: 'center' }}>{verse.text_english}</p>
              )}
              {(lang === 'luganda' || lang === 'both') && verse.text_luganda && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #E7C873' }}>
                  <p style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 11, letterSpacing: 3, color: '#8A6D1B', fontWeight: 800 }}>LUGANDA</p>
                  <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 20, lineHeight: 1.65, color: '#475569', textAlign: 'center', fontStyle: 'italic' }}>{verse.text_luganda}</p>
                </div>
              )}
              {/* Language toggle */}
              <div className="flex justify-center gap-2 mt-5">
                {([['english', 'English'], ['luganda', 'Luganda'], ['both', 'Both']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setLang(k)} style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: lang === k ? '2px solid #0F2043' : '1px solid #E2E8F0', background: lang === k ? '#0F2043' : '#fff', color: lang === k ? '#fff' : '#475569' }}>{label}</button>
                ))}
              </div>
            </div>

            {/* DIVIDER ORNAMENT */}
            <div className="flex items-center gap-3 px-4 md:px-10 mt-6">
              <div style={{ flex: 1, height: 1, background: '#E7C873' }} /><span style={{ color: '#B9972F', fontSize: 16 }}>✦ ✦ ✦</span><div style={{ flex: 1, height: 1, background: '#E7C873' }} />
            </div>

            {/* ACTIONS */}
            <div className="px-2 md:px-8 pt-5 pb-2 flex flex-col gap-3">
              <Link href={readerUrl} style={{ display: 'block', textAlign: 'center', background: '#0F2043', color: '#fff', padding: '14px', borderRadius: 14, fontWeight: 800, textDecoration: 'none' }}>📖 Open in Bible Reader → {ref}</Link>
              <div className="flex gap-2 flex-wrap justify-center">
                <button onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://prayreadbible.org' + readerUrl)}&quote=${encodeURIComponent(shareText)}`)} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Facebook</button>
                <button onClick={() => share(`https://wa.me/?text=${encodeURIComponent(shareText)}`)} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>WhatsApp</button>
                <button onClick={() => share(`https://t.me/share/url?url=${encodeURIComponent('https://prayreadbible.org' + readerUrl)}&text=${encodeURIComponent(shareText)}`)} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Telegram</button>
                <button onClick={copy} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid #0F2043', background: copied ? '#DCFCE7' : '#0F2043', color: copied ? '#166534' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{copied ? '✓ Copied!' : '🔗 Copy'}</button>
              </div>
              <Link href="/bible-reader" style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: 4, textDecoration: 'none' }}>← Back to the Bible</Link>
            </div>

            <p className="text-center text-xs text-slate-400 mt-2">A new verse every day at midnight, Kampala time.</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
