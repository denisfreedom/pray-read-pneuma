'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppFooter from '@/app/components/AppFooter';

// app/devotional-plans/page.tsx — V9: V2 + STICKY HEADER + FOOTER
// WHAT WAS WRONG: the page had NO header. Once you landed on Devotionals you
// could not get back to Home, Bible Reader, Verse-Songs, Q&A, Community or
// Dashboard except with the browser Back button.
// THIS VERSION ADDS:
//   1) A sticky top header (stays visible while you scroll) with the Pray-Read
//      logo + "Pray-Read Bible" — tap the logo to go Home.
//   2) A scrollable tab bar under the header with every section:
//      Home · Bible Reader · Devotionals (active) · Verse-Songs · Q&A ·
//      Community · Dashboard. On mobile it scrolls sideways; on desktop it
//      shows all tabs in one row.
//   3) The AppFooter at the bottom, like the other pages (it was missing too).
//   4) A real "Daily Devotionals" heading in the hero (it only had a paragraph).
// EVERYTHING ELSE IS UNCHANGED FROM V2:
//   D-001 numbering · auto gradient covers · clickable scriptures -> floating
//   verse window -> Open in Bible Reader · share row FIRST in the popup
//   (Facebook, WhatsApp, Telegram, Instagram, LinkedIn, Copy Link).

type Entry = any;

const LOGO = '/assets/PrayRead-logo.png';
const LOGO_FALLBACK = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

// The app's main tabs — the same destinations the other pages link to.
const TABS = [
  { label: '🏠 Home', href: '/' },
  { label: '📖 Bible Reader', href: '/bible-reader' },
  { label: '🙏 Devotionals', href: '/devotional-plans', active: true },
  { label: '🎵 Verse-Songs', href: '/verse-songs' },
  { label: '💬 Q&A', href: '/qa' },
  { label: '👥 Community', href: '/community' },
  { label: '📊 Dashboard', href: '/dashboard' },
];

const PALETTES = [
  ['#6d28d9', '#db2777', '#f59e0b'], ['#0e7490', '#059669', '#facc15'], ['#9f1239', '#ea580c', '#facc15'],
  ['#1d4ed8', '#7c3aed', '#ec4899'], ['#065f46', '#0d9488', '#a3e635'], ['#7f1d1d', '#b45309', '#fbbf24'],
  ['#312e81', '#4f46e5', '#06b6d4'], ['#701a75', '#c026d3', '#fb7185'], ['#134e4a', '#059669', '#fde68a'],
  ['#1e3a8a', '#0284c7', '#34d399'],
];
function numOf(e: Entry) { return String(e.devotional_number || '').padStart(3, '0'); }
function dLabel(e: Entry) { return 'D-' + numOf(e); }
function paletteFor(e: Entry) { const n = parseInt(numOf(e) || '1', 10) || 1; return PALETTES[(n - 1) % PALETTES.length]; }

function Cover({ e, height = 150 }: { e: Entry; height?: number }) {
  const [c1, c2, c3] = paletteFor(e);
  if (e.cover_photo_url || e.default_image_url) {
    return (<div style={{ position: 'relative', height, overflow: 'hidden', background: '#111' }}>
      <img src={String(e.cover_photo_url || e.default_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))' }} />
      <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', color: '#4c1d95', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>{dLabel(e)}</span>
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, color: '#fff' }}><div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.25 }}>{e.title}</div><div style={{ fontSize: 12, opacity: 0.9 }}>{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse}</div></div>
    </div>);
  }
  return (<div style={{ position: 'relative', height, overflow: 'hidden', background: `linear-gradient(120deg, ${c1}, ${c2} 55%, ${c3})`, color: '#fff' }}>
    <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
    <div style={{ position: 'absolute', right: 30, bottom: -40, width: 110, height: 110, borderRadius: '50%', background: 'rgba(0,0,0,0.15)' }} />
    <div style={{ position: 'absolute', right: 18, top: 12, fontSize: 44, opacity: 0.35 }}>✝</div>
    <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', color: '#4c1d95', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>{dLabel(e)}</span>
    <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}><div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.25 }}>{e.title}</div><div style={{ fontSize: 12, opacity: 0.92 }}>{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse} · PrayRead Devotional</div></div>
  </div>);
}

const BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
function parseRefs(text: string): string[] {
  if (!text) return [];
  // Normalise en-dash / em-dash to hyphen so "1 Peter 4:10–11" parses as one range, not "1 Peter 4:10" + stray "11"
  const norm = String(text).replace(/[–—]/g, '-');
  const out: string[] = [];
  const sorted = [...BOOKS].sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(${sorted.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s+(\\d+)(?::(\\d+)(?:\\s*-\\s*(\\d+))?)?`, 'g');
  let m: any;
  while ((m = re.exec(norm)) !== null) {
    const ref = m[3] ? `${m[1]} ${m[2]}:${m[3]}${m[4] ? '-' + m[4] : ''}` : `${m[1]} ${m[2]}`;
    if (!out.includes(ref)) out.push(ref);
  }
  // NO fallback that pushes raw pieces — that is what created bare "2", "16", "9" pills.
  // If no book name was found, return [] (the Related section below handles plain lines).
  return out;
}
// NEW: Normalise Related Scriptures to { ref, explanation } for display.
// Accepts: "Colossians 3:17 — Encourages..." (string) OR {book,chapter,verse,text} OR {reference,text}
function parseRelated(val: any): { ref: string; explanation: string }[] {
  if (!val) return [];
  let arr: any[] = [];
  if (Array.isArray(val)) arr = val;
  else if (typeof val === 'string') {
    const s = val.trim();
    if (!s || s.includes('[object Object]')) return [];
    // String may be JSON array or newline-separated lines
    try { const p = JSON.parse(s); if (Array.isArray(p)) arr = p; else arr = s.split(/\n/).filter(Boolean); } catch { arr = s.split(/\n/).filter(Boolean); }
  } else if (typeof val === 'object') arr = [val];
  else return [];
  return arr.map((r: any) => {
    if (!r) return null;
    if (typeof r === 'string') {
      if (r.includes('[object Object]')) return null;
      const parts = r.split(/\s*[—–-]\s*/);
      // First part is the ref if it looks like "Colossians 3:17", rest is explanation
      const maybeRef = parts[0].trim();
      const refs = parseRefs(maybeRef);
      if (refs.length) return { ref: refs[0], explanation: parts.slice(1).join(' — ').trim() };
      return { ref: maybeRef, explanation: '' };
    }
    const ref = String(r.reference || r.verse_ref || r.ref || ((r.book ? `${r.book} ${r.chapter ?? ''}${r.verse ? ':' + r.verse : ''}` : '') || '')).trim();
    const expl = String(r.text || r.explanation || r.note || r.description || '').trim();
    if (!ref && !expl) return null;
    const refs = ref ? parseRefs(ref) : [];
    return { ref: refs[0] || ref, explanation: expl };
  }).filter(Boolean) as { ref: string; explanation: string }[];
}
// FIXED: Bible reader is /bible-reader/{bookNumber}/{chapter}#verse-{verse}
// OLD route /bible?book=... does NOT exist -> 404, do NOT use it. Book name -> number 1-66.
const BIBLE_BOOK_NUMBERS: Record<string, number> = {};
BOOKS.forEach((b, i) => { BIBLE_BOOK_NUMBERS[b.toLowerCase()] = i + 1; });
BIBLE_BOOK_NUMBERS['psalm'] = 19; BIBLE_BOOK_NUMBERS['song of solomon'] = 22; BIBLE_BOOK_NUMBERS['song of songs'] = 22; BIBLE_BOOK_NUMBERS['judges'] = 7;
function refToBibleUrl(ref: string) {
  const m = ref.match(/^(.+?)\s+(\d+)(?::(\d+))?/);
  if (!m) return '/bible-reader/1/1';
  const name = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
  const num = BIBLE_BOOK_NUMBERS[name] || 1;
  const ch = m[2]; const vs = m[3];
  return `/bible-reader/${num}/${ch}${vs ? `#verse-${vs}` : ''}`;
}
function stripHtml(html: string) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function excerpt(e: Entry) {
  let html = String(e.devotional_text || '');
  // Take text AFTER the Reflection heading if present, else whole body
  const m = html.match(/Reflection<\/h3>([\s\S]*)/i);
  if (m) html = m[1];
  // Drop any remaining headings + Scripture Reading lines + quotation
  html = html.replace(/<h3[^>]*>.*?<\/h3>/gi, ' ');
  html = html.replace(/Scripture Reading[^<]*/gi, ' ');
  let t = stripHtml(html);
  // Also drop the scripture quotation if it leaked in
  const q = stripHtml(String(e.scripture_quotation || ''));
  if (q && t.startsWith(q.slice(0, 40))) t = t.slice(q.length).trim();
  return t.slice(0, 160) + (t.length > 160 ? '…' : '');
}
function fullText(e: Entry) {
  // Full readable message for sharing: title + scripture + body without HTML
  const body = stripHtml(String(e.devotional_text || '')).replace(/Reflection|Practical Application|Meditation|Short Prayer/g, (s) => '\n\n' + s + ': ');
  return body.trim();
}
function imageUrl(e: Entry) {
  const u = String(e.cover_photo_url || e.default_image_url || '');
  if (u) return u;
  try { return `${window.location.origin}/assets/default-devotional.png`; } catch { return '/assets/default-devotional.png'; }
}

export default function DevotionalPlansPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [open, setOpen] = useState<Entry | null>(null);
  const [lang, setLang] = useState<'en' | 'lu'>('en');
  const [done, setDone] = useState<string[]>([]);
  const [verseRef, setVerseRef] = useState<string | null>(null);
  const [verseText, setVerseText] = useState('');
  const [verseLoading, setVerseLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO);

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem('pr_done_devotionals') || '[]')); } catch {}
    fetch('/api/devotional-entries').then(r => r.json()).then(j => { const arr = Array.isArray(j) ? j : []; let g=''; try { g = localStorage.getItem('pr_default_devotional_image') || ''; } catch {} setEntries(arr.map((e:any)=>({ ...e, default_image_url: e.default_image_url || e.cover_photo_url || g, cover_photo_url: e.cover_photo_url || e.default_image_url || g }))); }).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);
  // Deep link: ?devotional=D-001
  useEffect(() => {
    if (!entries.length) return;
    const q = new URLSearchParams(window.location.search).get('devotional');
    if (!q) return;
    const num = q.replace(/^D-?/i, '').padStart(3, '0');
    const found = entries.find((e: any) => numOf(e) === num);
    if (found) { setOpen(found); setLang('en'); }
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e: any) => (`${dLabel(e)} ${numOf(e)} ${e.title} ${e.scripture_book}`.toLowerCase().includes(q)));
  }, [entries, search]);

  function toggleDone(num: string) {
    setDone(prev => { const next = prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]; try { localStorage.setItem('pr_done_devotionals', JSON.stringify(next)); } catch {} return next; });
  }
  async function openVerse(ref: string) {
    setVerseRef(ref); setVerseText(''); setVerseLoading(true);
    try {
      const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
      const j = await r.json().catch(() => ({}));
      setVerseText(j.text ? String(j.text).trim() : 'Verse text could not be loaded. Tap “Open in Bible Reader” below to read it in the app.');
    } catch { setVerseText('Verse text could not be loaded offline. Tap “Open in Bible Reader” below to read it in the app.'); }
    setVerseLoading(false);
  }
  function shareUrl(e: Entry) {
    try { return `${window.location.origin}/devotional-plans?devotional=${dLabel(e)}`; } catch { return `/devotional-plans?devotional=${dLabel(e)}`; }
  }
  function shareText(e: Entry) {
    const further = parseRefs(String(e.further_readings || '')).join(', ');
    const relatedLines = parseRelated(e.related_scriptures).map((it: any) => `${it.ref}${it.explanation ? ' — ' + it.explanation : ''}`).join('\n');
    const full = fullText(e);
    // NO raw image link in the text — WhatsApp shows it as a broken link line.
    // The image comes from the link preview (OG image = app logo / default image in layout).
    // One link only, at the end.
    return `🙏 ${e.title} — ${e.scripture_book} ${e.scripture_chapter}:${e.scripture_verse}\n\n${full}${relatedLines ? `\n\n📖 Related Scriptures:\n${relatedLines}` : ''}${further ? `\n\n📖 Further readings: ${further}` : ''}\n\n👉 Read more devotionals here: ${shareUrl(e)}`;
  }
  function shareOn(e: Entry, network: string) {
    const url = encodeURIComponent(shareUrl(e)); const text = encodeURIComponent(shareText(e));
    const links: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      instagram: `https://www.instagram.com/`,
    };
    if (network === 'instagram') {
      // Instagram has no web share endpoint — copy the share text so they can paste it in IG.
      navigator.clipboard?.writeText(shareText(e)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {});
      window.open(links.instagram, '_blank');
      return;
    }
    window.open(links[network], '_blank', 'noopener,width=640,height=560');
  }
  async function copyLink(e: Entry) {
    try { await navigator.clipboard.writeText(shareText(e)); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setCopied(false); }
  }

  const furtherRefs = open ? parseRefs(stripHtml(String(open.further_readings || ''))) : [];
  // Related is SEPARATE from Further — it has its own section with explanations.
  const relatedItems = open ? parseRelated(open.related_scriptures) : [];
  const allRefs = [...new Set([...furtherRefs])];

  return (
    <div style={{ background: '#fffdf5', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 640px) {
          .dev-list-card { flex-direction: column !important; }
          .dev-list-img { width: 100% !important; }
          .dev-list-img > div { height: 170px !important; }
          .dev-list-body { padding: 14px 16px 18px !important; }
          .dev-list-body h3 { font-size: 20px !important; line-height: 1.3 !important; }
          .dev-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
        }
        .dev-tab-row { scrollbar-width: none; -ms-overflow-style: none; }
        .dev-tab-row::-webkit-scrollbar { display: none; }
        .dev-tab { white-space: nowrap; text-decoration: none; }
      `}</style>

      {/* ── STICKY HEADER — NEW: gets you back to every other tab ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(15,32,67,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(231,200,115,0.35)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }} aria-label="Go to Home">
            <span style={{ width: 38, height: 38, borderRadius: 12, overflow: 'hidden', background: '#fff', border: '1px solid #E7C873', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Pray-Read Bible" width={38} height={38} style={{ objectFit: 'contain' }} onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} />
            </span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>Pray-Read <span style={{ color: '#E7C873' }}>Bible</span></span>
          </Link>
          <span style={{ marginLeft: 'auto' }}>
            <Link href="/dashboard" style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 999, background: 'linear-gradient(90deg,#f59e0b,#f43f5e)', color: '#fff', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>📊 Dashboard</Link>
          </span>
        </div>
        {/* Tab bar — scrolls sideways on mobile, shows all tabs on desktop */}
        <nav className="dev-tab-row" style={{ maxWidth: 980, margin: '0 auto', padding: '2px 16px 10px', display: 'flex', gap: 6, overflowX: 'auto' }} aria-label="Main sections">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="dev-tab" aria-current={t.active ? 'page' : undefined} style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: t.active ? 800 : 600,
              background: t.active ? '#E7C873' : 'rgba(255,255,255,0.10)',
              color: t.active ? '#0F2043' : '#fff',
              border: t.active ? '1px solid #E7C873' : '1px solid rgba(255,255,255,0.25)',
            }}>{t.label}</Link>
          ))}
        </nav>
      </header>

      <div style={{ background: 'linear-gradient(100deg,#6d28d9,#a21caf 55%,#f43f5e)', padding: '40px 20px 56px', textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 30, margin: '0 0 8px', lineHeight: 1.2 }}>Daily Devotionals</h1>
        <p style={{ maxWidth: 640, margin: '0 auto', fontSize: 20, lineHeight: 1.5 }}>Short, rich devotionals to deepen your faith — in English and Luganda, with Scripture, further readings, and a streak to keep you going.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          <button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} style={{ border: 'none', cursor: 'pointer', padding: '14px 26px', borderRadius: 999, fontWeight: 800, fontSize: 16, background: 'linear-gradient(90deg,#facc15,#f43f5e)', color: '#fff' }}>Explore Devotionals →</button>
          <button onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} style={{ cursor: 'pointer', padding: '14px 26px', borderRadius: 999, fontWeight: 700, fontSize: 16, background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)' }}>📅 {view === 'calendar' ? 'List View' : 'Calendar View'}</button>
        </div>
        {done.length > 0 && <p style={{ marginTop: 14, opacity: 0.95 }}>🔥 Your streak: {done.length} devotional{done.length === 1 ? '' : 's'} completed</p>}
      </div>

      <div id="plans" style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>Devotional Plans</h2>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title / D-001..." style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #e5e7eb', minWidth: 240 }} />
        </div>

        {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading devotionals…</p> : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 20, padding: 36, textAlign: 'center', color: '#6b7280', marginTop: 18 }}>{entries.length === 0 ? 'No devotionals yet. Check back soon.' : 'No devotionals match your search.'}</div>
        ) : view === 'calendar' ? (
          <div className="dev-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginTop: 18 }}>
            {filtered.map((e: any) => (
              <div key={e.id} onClick={() => { setOpen(e); setLang('en'); }} style={{ cursor: 'pointer', background: '#fff', border: `1px solid ${done.includes(numOf(e)) ? '#bbf7d0' : '#eee'}`, borderRadius: 16, overflow: 'hidden' }}>
                <Cover e={e} height={130} />
                <div style={{ padding: '10px 12px 14px' }}><div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div><div style={{ color: '#6b7280', fontSize: 12 }}>{done.includes(numOf(e)) ? '✓ Completed · ' : ''}{e.devotional_text_lu ? 'EN + LU' : 'EN'}</div></div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            {filtered.map((e: any) => (
              <div key={e.id} className="dev-list-card" style={{ background: '#fff', border: '1px solid #eee', borderRadius: 16, overflow: 'hidden', display: 'flex', gap: 0 }}>
                <div className="dev-list-img" style={{ width: 230, flexShrink: 0, cursor: 'pointer' }} onClick={() => { setOpen(e); setLang('en'); }}><Cover e={e} height={140} /></div>
                <div className="dev-list-body" style={{ padding: '14px 16px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{done.includes(numOf(e)) && <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>✓ Completed</span>}</div>
                  <h3 style={{ margin: '4px 0 2px', fontSize: 18 }}>{e.title}</h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse} · {e.devotional_text_lu ? 'English + Luganda' : 'English'}</p>
                  <p style={{ margin: '6px 0 0', color: '#374151', fontSize: 14, lineHeight: 1.5 }}>{excerpt(e)}</p>
                  <button onClick={() => { setOpen(e); setLang('en'); }} style={{ marginTop: 10, cursor: 'pointer', border: '1px solid #7c3aed', color: '#7c3aed', background: '#fff', borderRadius: 999, padding: '7px 16px', fontWeight: 700 }}>Read →</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 32 }}>
          {[{ i: '📖', t: 'Read', d: 'Scripture first — every devotional starts with the Word.' }, { i: '❤', t: 'Reflect', d: 'A short, honest message for real life.' }, { i: '🔥', t: 'Keep going', d: 'Mark it complete and build your streak.' }].map(c => (
            <div key={c.t} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 16, padding: 22 }}><div style={{ fontSize: 26 }}>{c.i}</div><h3 style={{ margin: '10px 0 4px' }}>{c.t}</h3><p style={{ color: '#6b7280', margin: 0 }}>{c.d}</p></div>
          ))}
        </div>
      </div>

      {/* Footer — was missing too */}
      <AppFooter />

      {/* Beautiful popup */}
      {open && (() => { const [c1, c2, c3] = paletteFor(open); return (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,10,40,0.62)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(224,242,254,0.92)', backdropFilter: 'blur(6px)', border: '1px solid rgba(147,197,253,0.6)', borderRadius: 22, maxWidth: 780, width: '100%', margin: '22px 0', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
            {/* Header = auto cover */}
            <div style={{ position: 'relative' }}>
              {(open.cover_photo_url || open.default_image_url)
                ? <div style={{ position: 'relative', height: 210, overflow: 'hidden' }}><img src={String(open.cover_photo_url || open.default_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(30,10,60,0.72))' }} /></div>
                : <div style={{ height: 210, background: `linear-gradient(120deg, ${c1}, ${c2} 55%, ${c3})`, position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} /><div style={{ position: 'absolute', right: 40, bottom: -50, width: 130, height: 130, borderRadius: '50%', background: 'rgba(0,0,0,0.16)' }} /><div style={{ position: 'absolute', right: 20, top: 14, fontSize: 56, opacity: 0.35, color: '#fff' }}>✝</div></div>}
              <button onClick={() => setOpen(null)} style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'rgba(255,255,255,0.92)', borderRadius: 999, width: 34, height: 34, cursor: 'pointer', fontSize: 16 }}>✕</button>
              <div style={{ position: 'absolute', left: 22, right: 22, bottom: 16, color: '#fff' }}>
                <span style={{ background: '#fff', color: '#4c1d95', fontWeight: 800, fontSize: 12, padding: '4px 11px', borderRadius: 999 }}>{dLabel(open)}</span>
                <h2 style={{ fontSize: 28, margin: '10px 0 2px', lineHeight: 1.15 }}>{open.title}</h2>
                <button onClick={() => openVerse(`${open.scripture_book} ${open.scripture_chapter}:${open.scripture_verse}`)} title="Tap to read this verse, then open in Bible Reader" style={{ background: 'none', border: 'none', color: '#fde68a', fontWeight: 700, fontSize: 15, cursor: 'pointer', padding: 0 }}>📖 {open.scripture_book} {open.scripture_chapter}:{open.scripture_verse} — tap to read →</button>
                {open.author && <div style={{ fontSize: 13, opacity: 0.9 }}>By {open.author}</div>}
              </div>
            </div>

            <div style={{ padding: '18px 22px 24px', background: 'rgba(224,242,254,0.55)' }}>
              {/* SHARE ROW — FIRST */}
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#4c1d95', marginBottom: 8 }}>SHARE THIS DEVOTIONAL</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => shareOn(open, 'facebook')} title="Share on Facebook" aria-label="Share on Facebook" style={{ cursor: 'pointer', border: 'none', background: '#1877f2', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>f</button>
                  <button onClick={() => shareOn(open, 'whatsapp')} title="Share on WhatsApp" aria-label="Share on WhatsApp" style={{ cursor: 'pointer', border: 'none', background: '#25d366', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💬</button>
                  <button onClick={() => shareOn(open, 'telegram')} title="Share on Telegram" aria-label="Share on Telegram" style={{ cursor: 'pointer', border: 'none', background: '#229ed9', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✈</button>
                  <button onClick={() => shareOn(open, 'instagram')} title="Share on Instagram" aria-label="Share on Instagram" style={{ cursor: 'pointer', border: 'none', background: 'linear-gradient(45deg,#f58529,#dd2a7b,#8134af)', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📸</button>
                  <button onClick={() => shareOn(open, 'linkedin')} title="Share on LinkedIn" aria-label="Share on LinkedIn" style={{ cursor: 'pointer', border: 'none', background: '#0a66c2', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>in</button>
                  <button onClick={() => copyLink(open)} title="Copy share link" aria-label="Copy share link" style={{ cursor: 'pointer', border: '1px solid #7c3aed', background: '#fff', color: '#7c3aed', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{copied ? '✓' : '🔗'}</button>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 7 }}></div>
              </div>

              {open.scripture_quotation && <div style={{ background: '#fff', border: '1px solid #ede9fe', borderLeft: '5px solid #7c3aed', padding: '14px 16px', borderRadius: 10, marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>SCRIPTURE</div><div dangerouslySetInnerHTML={{ __html: String(open.scripture_quotation) }} /></div>}
              {open.devotional_text_lu && <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><button onClick={() => setLang('en')} style={{ padding: '7px 16px', borderRadius: 999, cursor: 'pointer', border: '1px solid #7c3aed', background: lang === 'en' ? '#7c3aed' : '#fff', color: lang === 'en' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🇬🇧 English</button><button onClick={() => setLang('lu')} style={{ padding: '7px 16px', borderRadius: 999, cursor: 'pointer', border: '1px solid #7c3aed', background: lang === 'lu' ? '#7c3aed' : '#fff', color: lang === 'lu' ? '#fff' : '#7c3aed', fontWeight: 700 }}>🇺🇬 Luganda</button></div>}
              <div style={{ fontSize: 16, lineHeight: 1.75, color: '#1f2937' }} dangerouslySetInnerHTML={{ __html: String(lang === 'lu' && open.devotional_text_lu ? open.devotional_text_lu : open.devotional_text) }} />

              {relatedItems.length > 0 && (
                <div style={{ marginTop: 20, background: '#fff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#4338ca', marginBottom: 10 }}>📖 RELATED SCRIPTURES — TAP A VERSE TO READ IT</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {relatedItems.map((it: { ref: string; explanation: string }, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <button onClick={() => openVerse(it.ref)} style={{ cursor: 'pointer', border: '1px solid #6366f1', background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '6px 12px', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>{it.ref} →</button>
                        {it.explanation && <span style={{ color: '#374151', fontSize: 14, lineHeight: 1.5 }}>{it.explanation}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {allRefs.length > 0 && (
                <div style={{ marginTop: 20, background: '#fff', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#92400e', marginBottom: 8 }}>📖 FURTHER READINGS — TAP A VERSE TO READ IT</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {allRefs.filter((r: any) => typeof r === 'string' && r && r !== '[object Object]').map((ref: string) => (
                      <button key={ref} onClick={() => openVerse(ref)} style={{ cursor: 'pointer', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', borderRadius: 999, padding: '7px 13px', fontWeight: 700 }}>{ref} →</button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => toggleDone(numOf(open))} style={{ width: '100%', marginTop: 18, padding: 13, borderRadius: 12, border: 'none', cursor: 'pointer', background: done.includes(numOf(open)) ? '#dcfce7' : '#7c3aed', color: done.includes(numOf(open)) ? '#166534' : '#fff', fontWeight: 800 }}>{done.includes(numOf(open)) ? '✓ Completed — tap to unmark' : '✓ Mark complete'}</button>
            </div>
          </div>
        </div>
      ); })()}

      {/* Floating verse window */}
      {verseRef && (
        <div onClick={() => setVerseRef(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 520, width: '100%', padding: 22, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, color: '#4c1d95' }}>📖 {verseRef}</h3><button onClick={() => setVerseRef(null)} style={{ border: 'none', background: '#f3f4f6', borderRadius: 999, width: 30, height: 30, cursor: 'pointer' }}>✕</button></div>
            <p style={{ fontSize: 17, lineHeight: 1.7, marginTop: 14 }}>{verseLoading ? 'Loading verse…' : verseText}</p>
            <a href={refToBibleUrl(verseRef)} style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '12px', borderRadius: 10, background: '#7c3aed', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>Open {verseRef} in Bible Reader →</a>
            <button onClick={() => setVerseRef(null)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
