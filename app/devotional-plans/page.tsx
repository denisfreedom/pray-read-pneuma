"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppFooter from '@/app/components/AppFooter';
// app/devotional-plans/page.tsx — V14 (V13 + ALWAYS-VISIBLE HIGHLIGHT BAR + selectionchange + execCommand fallback): V11 + PER-USER HIGHLIGHT/UNDERLINE + BOOKMARK TO DASHBOARD
// WHAT'S NEW IN V12 (everything from V11 is unchanged):
//  1) HIGHLIGHT / UNDERLINE in the reader popup:
//     - Select any words in the devotional text -> a small toolbar appears:
//       [🖍 Highlight] [Underline] — tap one, it saves instantly.
//     - Highlights = gold background. Underlines = gold underline.
//     - Saved PER USER: key = pr_highlights_<email-or-guest>. Two users on the
//       same phone never see each other's highlights. Guest (not logged in)
//       saves under pr_highlights_guest.
//     - Highlights survive refresh, survive closing the popup, and show again
//       next time you open the same devotional, in the same language.
//     - "My marks on this devotional" panel in the popup lists every mark,
//       tap ✕ to delete one, or "Clear all marks" to wipe this devotional.
//  2) BOOKMARK TO DASHBOARD:
//     - 🔖 Bookmark button on every card + in the popup header.
//     - Bookmarked devotionals are saved PER USER in localStorage under BOTH:
//       pr_bookmarked_devotionals_<email>  AND  pr_bookmarked_devotionals
//       (the second key is what Dashboard reads — see note below).
//     - A "🔖 Bookmarked only" filter at the top shows just your bookmarks.
//     - Dashboard: add a section that reads JSON.parse(localStorage.getItem(
//       'pr_bookmarked_devotionals') || '[]') and lists title + D-number + link
//       /devotional-plans?devotional=D-001 — no API needed.
//  3) Colours unchanged: emerald #17372f / gold #e9c981 / cream #f8f6ef.

type Entry = any;
type Mark = { id: string; num: string; lang: string; text: string; kind: 'highlight' | 'underline'; at: string };
type Bookmark = { num: string; title: string; scripture: string; at: string };

const LOGO = '/assets/PrayRead-logo.png';
const HERO_IMAGE = '/assets/devotional-hero.jpg';
const LOGO_FALLBACK = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';
const TABS = [
  { label: '🏠 Home', href: '/' }, { label: '📖 Bible Reader', href: '/bible-reader' },
  { label: '🙏 Devotionals', href: '/devotional-plans', active: true },
  { label: '🎵 Verse-Songs', href: '/verse-songs' }, { label: '💬 Q&A', href: '/qa' },
  { label: '👥 Community', href: '/community' }, { label: '📊 Dashboard', href: '/dashboard' },
];
const PALETTES = [
  ['#17372f','#1d4035','#e9c981'],['#1d4035','#2a5a4a','#d4af5a'],['#0f2a22','#315d4b','#e9c981'],
  ['#17372f','#a9852e','#e9c981'],['#2a4a3a','#60745e','#f2d99d'],['#1c382e','#8a6d2b','#e9c981'],
  ['#17372f','#285445','#c9a86a'],['#1d4035','#3a6b52','#e9c981'],['#0f2a22','#1d4035','#f2d99d'],['#213a30','#a9852e','#e9c981'],
];
// ── PER-USER STORAGE ──
// Who is this? Same key the rest of the site uses: localStorage "userEmail".
// Logged in  -> pr_highlights_<email> / pr_bookmarks_<email>
// Not logged -> pr_highlights_guest / pr_bookmarks_guest (still saves!)
function userKey(): string {
  try { const e = (localStorage.getItem('userEmail') || localStorage.getItem('user_email') || '').trim().toLowerCase(); if (e) return e.replace(/[^a-z0-9@._-]/g, '_'); } catch {}
  return 'guest';
}
function readJSON(key: string): any[] { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; } catch { return []; } }
function writeJSON(key: string, val: any[]) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function numOf(e: Entry) { return String(e.devotional_number || '').padStart(3, '0'); }
function dLabel(e: Entry) { return 'D-' + numOf(e); }
function paletteFor(e: Entry) { const n = parseInt(numOf(e) || '1', 10) || 1; return PALETTES[(n - 1) % PALETTES.length]; }
function Cover({ e, height = 150 }: { e: Entry; height?: number }) {
  const [c1, c2, c3] = paletteFor(e);
  if (e.cover_photo_url || e.default_image_url) {
    return (<div style={{ position: 'relative', height, overflow: 'hidden', background: '#111' }}>
      <img src={String(e.cover_photo_url || e.default_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))' }} />
      <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', color: '#1c352d', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>{dLabel(e)}</span>
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, color: '#fff' }}><div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.25 }}>{e.title}</div><div style={{ fontSize: 12, opacity: 0.9 }}>{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse}</div></div>
    </div>);
  }
  return (<div style={{ position: 'relative', height, overflow: 'hidden', background: `linear-gradient(120deg, ${c1}, ${c2} 55%, ${c3})`, color: '#fff' }}>
    <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
    <div style={{ position: 'absolute', right: 30, bottom: -40, width: 110, height: 110, borderRadius: '50%', background: 'rgba(0,0,0,0.15)' }} />
    <div style={{ position: 'absolute', right: 18, top: 12, fontSize: 44, opacity: 0.35 }}>✝</div>
    <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', color: '#1c352d', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>{dLabel(e)}</span>
    <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}><div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.25 }}>{e.title}</div><div style={{ fontSize: 12, opacity: 0.92 }}>{e.scripture_book} {e.scripture_chapter}:{e.scripture_verse} · PrayRead Devotional</div></div>
  </div>);
}
const BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
function parseRefs(text: string): string[] {
  if (!text) return [];
  const norm = String(text).replace(/[–—]/g, '-');
  const out: string[] = [];
  const sorted = [...BOOKS].sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(${sorted.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s+(\\d+)(?::(\\d+)(?:\\s*-\\s*(\\d+))?)?`, 'g');
  let m: any;
  while ((m = re.exec(norm)) !== null) { const ref = m[3] ? `${m[1]} ${m[2]}:${m[3]}${m[4] ? '-' + m[4] : ''}` : `${m[1]} ${m[2]}`; if (!out.includes(ref)) out.push(ref); }
  return out;
}
function parseRelated(val: any): { ref: string; explanation: string }[] {
  if (!val) return [];
  let arr: any[] = [];
  if (Array.isArray(val)) arr = val;
  else if (typeof val === 'string') { const s = val.trim(); if (!s || s.includes('[object Object]')) return []; try { const p = JSON.parse(s); if (Array.isArray(p)) arr = p; else arr = s.split(/\n/).filter(Boolean); } catch { arr = s.split(/\n/).filter(Boolean); } }
  else if (typeof val === 'object') arr = [val]; else return [];
  return arr.map((r: any) => {
    if (!r) return null;
    if (typeof r === 'string') { if (r.includes('[object Object]')) return null; const parts = r.split(/\s*[—–-]\s*/); const maybeRef = parts[0].trim(); const refs = parseRefs(maybeRef); if (refs.length) return { ref: refs[0], explanation: parts.slice(1).join(' — ').trim() }; return { ref: maybeRef, explanation: '' }; }
    const ref = String(r.reference || r.verse_ref || r.ref || ((r.book ? `${r.book} ${r.chapter ?? ''}${r.verse ? ':' + r.verse : ''}` : '') || '')).trim();
    const expl = String(r.text || r.explanation || r.note || r.description || '').trim();
    if (!ref && !expl) return null;
    const refs = ref ? parseRefs(ref) : [];
    return { ref: refs[0] || ref, explanation: expl };
  }).filter(Boolean) as { ref: string; explanation: string }[];
}
const BIBLE_BOOK_NUMBERS: Record<string, number> = {};
BOOKS.forEach((b, i) => { BIBLE_BOOK_NUMBERS[b.toLowerCase()] = i + 1; });
BIBLE_BOOK_NUMBERS['psalm'] = 19; BIBLE_BOOK_NUMBERS['song of solomon'] = 22; BIBLE_BOOK_NUMBERS['song of songs'] = 22; BIBLE_BOOK_NUMBERS['judges'] = 7;
function refToBibleUrl(ref: string) { const m = ref.match(/^(.+?)\s+(\d+)(?::(\d+))?/); if (!m) return '/bible-reader/1/1'; const name = m[1].trim().toLowerCase().replace(/\s+/g, ' '); const num = BIBLE_BOOK_NUMBERS[name] || 1; const ch = m[2]; const vs = m[3]; return `/bible-reader/${num}/${ch}${vs ? `#verse-${vs}` : ''}`; }
function stripHtml(html: string) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function excerpt(e: Entry) { let html = String(e.devotional_text || ''); const m = html.match(/Reflection<\/h3>([\s\S]*)/i); if (m) html = m[1]; html = html.replace(/<h3[^>]*>.*?<\/h3>/gi, ' '); html = html.replace(/Scripture Reading[^<]*/gi, ' '); let t = stripHtml(html); const q = stripHtml(String(e.scripture_quotation || '')); if (q && t.startsWith(q.slice(0, 40))) t = t.slice(q.length).trim(); return t.slice(0, 160) + (t.length > 160 ? '…' : ''); }
function fullText(e: Entry) { const body = stripHtml(String(e.devotional_text || '')).replace(/Reflection|Practical Application|Meditation|Short Prayer/g, (s) => '\n\n' + s + ': '); return body.trim(); }
function stripLeadingMarks(s: string): string { let out = s; while (out && '—–-: \t'.includes(out[0])) out = out.slice(1); return out; }
function escapeHtml(s: string) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const LU_HEADING_RES: RegExp[] = [ /Okusoma Ekyawandiikibwa(?:\s*(?:—|–|-)\s*[^"“”\n]{0,80})?/, /Okufumiitiriza/, /Okukozesa mu Bulamu/, /Okulowooza ku Kigambo|Okufumiitiriza ku Kigambo/, /Okusaba Okumpi|Okusaba/ ];
function formatLugandaBody(raw: string): string {
  let text = stripHtml(raw).replace(/emanna\.com/gi, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  type Hit = { start: number; end: number; text: string };
  const hits: Hit[] = [];
  for (const re of LU_HEADING_RES) { const g = new RegExp(re.source, 'g'); let m: any; while ((m = g.exec(text)) !== null) { const before = text.slice(0, m.index); const atBoundary = m.index === 0 || /[.!?]\s*$/.test(before); if (atBoundary) hits.push({ start: m.index, end: m.index + m[0].length, text: m[0].trim() }); if (m[0].length === 0) g.lastIndex++; } }
  hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const clean: Hit[] = []; for (const h of hits) { const prevHit = clean[clean.length - 1]; if (clean.length && prevHit && h.start < prevHit.end) continue; clean.push(h); }
  if (!clean.length) return `<p>${escapeHtml(text)}</p>`;
  let out = ''; const pre = stripLeadingMarks(text.slice(0, clean[0].start).trim());
  if (pre) { out += pre.length < 90 && !/\.\s\S/.test(pre) ? `<h3 class="dev-h3">${escapeHtml(pre)}</h3>` : `<p>${escapeHtml(pre)}</p>`; }
  for (let i = 0; i < clean.length; i++) { const h = clean[i]; const body = stripLeadingMarks(text.slice(h.end, i + 1 < clean.length ? clean[i + 1].start : undefined).trim()); out += `<h3 class="dev-h3">${escapeHtml(h.text)}</h3>`; if (!body) continue; const qm = body.match(/["“”]([^"“”]+)["“”]/); if (qm) { const qStart = qm.index ?? 0; const beforeQ = body.slice(0, qStart).trim(); const afterQ = body.slice(qStart + qm[0].length).trim(); out += `<blockquote class="dev-quote">“${escapeHtml(qm[1].trim())}”</blockquote>`; if (beforeQ) out += `<p>${escapeHtml(beforeQ)}</p>`; if (afterQ) out += `<p>${escapeHtml(afterQ)}</p>`; } else { out += `<p>${escapeHtml(body)}</p>`; } }
  return out;
}
function formatDevotionalBody(raw: any, lang: 'en' | 'lu'): string { const html = String(raw || '').replace(/emanna\.com/gi, ''); if (lang === 'lu') return formatLugandaBody(html); return html; }
// ── APPLY SAVED MARKS — DOM version (V13 FIX) ──
// V12 BUG: it did a string replace on the HTML. That fails when the selected
// text spans a line break, has different spacing in the HTML, contains an
// apostrophe/quote entity, or crosses a <p>/<h3> boundary — i.e. most real
// selections. So nothing appeared to save.
// V13: after the HTML is rendered, walk the REAL text nodes in the reader div,
// find the saved phrase inside a single text node, split that node and wrap
// just that part in <mark> / <u>. This is what the browser actually shows.
function unwrapMarks(root: HTMLElement) {
  root.querySelectorAll('mark.pr-mark-hl, u.pr-mark-u').forEach((el: any) => {
    const parent = el.parentNode; if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  try { root.normalize(); } catch {}
}
function applyMarksDOM(root: HTMLElement | null, marks: Mark[]) {
  if (!root) return;
  unwrapMarks(root);
  if (!marks.length) return;
  for (const mk of marks) {
    const needle = (mk.text || '').trim().replace(/\s+/g, ' ');
    if (!needle || needle.length < 2) continue;
    // Collect text nodes FIRST — we mutate the tree while wrapping.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes: Text[] = []; let n: any;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    let done = false;
    for (const node of nodes) {
      if (done) continue;
      // Skip text already inside a mark (we unwrapped, but be safe)
      const parent: any = node.parentElement;
      if (parent && (parent.closest && parent.closest('mark.pr-mark-hl, u.pr-mark-u'))) continue;
      const hay = (node.nodeValue || '').replace(/\s+/g, ' ');
      // Try exact match first, then case-insensitive match
      let idx = hay.indexOf(needle);
      if (idx === -1) idx = hay.toLowerCase().indexOf(needle.toLowerCase());
      if (idx === -1) continue;
      // Map the collapsed-space index back is hard — in practice the reader
      // HTML has single spaces, so use the raw node value for the split:
      const raw = node.nodeValue || '';
      let rawIdx = raw.indexOf(mk.text.trim());
      if (rawIdx === -1) rawIdx = raw.toLowerCase().indexOf(mk.text.trim().toLowerCase());
      if (rawIdx === -1) rawIdx = idx; // fall back to collapsed index
      const len = mk.text.trim().length;
      try {
        const after = node.splitText(rawIdx + len);
        const middle = node.splitText(rawIdx);
        const wrap = document.createElement(mk.kind === 'underline' ? 'u' : 'mark');
        wrap.className = mk.kind === 'underline' ? 'pr-mark-u' : 'pr-mark-hl';
        wrap.appendChild(middle);
        (node.parentNode as any)?.insertBefore(wrap, after);
        done = true;
      } catch {}
    }
  }
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
  // ── V12 state ──
  const [marks, setMarks] = useState<Mark[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [selText, setSelText] = useState('');
  const [selPos, setSelPos] = useState<{ x: number; y: number } | null>(null);
  const [markSaved, setMarkSaved] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem('pr_done_devotionals') || '[]')); } catch {}
    // Load THIS user's marks + bookmarks
    setMarks(readJSON(`pr_highlights_${userKey()}`) as Mark[]);
    setBookmarks(readJSON(`pr_bookmarks_${userKey()}`) as Bookmark[]);
    fetch('/api/devotional-entries').then(r => r.json()).then(j => { const arr = Array.isArray(j) ? j : []; let g=''; try { g = localStorage.getItem('pr_default_devotional_image') || ''; } catch {} setEntries(arr.map((e:any)=>({ ...e, default_image_url: e.default_image_url || e.cover_photo_url || g, cover_photo_url: e.cover_photo_url || e.default_image_url || g }))); }).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (!entries.length) return; const q = new URLSearchParams(window.location.search).get('devotional'); if (!q) return; const num = q.replace(/^D-?/i, '').padStart(3, '0'); const found = entries.find((e: any) => numOf(e) === num); if (found) { setOpen(found); setLang('en'); } }, [entries]);
  // Re-read marks when a different user logs in mid-session
  useEffect(() => { const t = setInterval(() => { const k = `pr_highlights_${userKey()}`; const fresh = readJSON(k) as Mark[]; setMarks(prev => JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh); }, 3000); return () => clearInterval(t); }, []);

  const filtered = useMemo(() => {
    let list = entries;
    if (showBookmarkedOnly) { const nums = new Set(bookmarks.map(b => b.num)); list = list.filter((e: any) => nums.has(numOf(e))); }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e: any) => (`${dLabel(e)} ${numOf(e)} ${e.title} ${e.scripture_book}`.toLowerCase().includes(q)));
  }, [entries, search, showBookmarkedOnly, bookmarks]);

  function toggleDone(num: string) { setDone(prev => { const next = prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]; try { localStorage.setItem('pr_done_devotionals', JSON.stringify(next)); } catch {} return next; }); }
  // ── BOOKMARKS ──
  function isBookmarked(e: Entry) { return bookmarks.some(b => b.num === numOf(e)); }
  function toggleBookmark(e: Entry) {
    const num = numOf(e);
    setBookmarks(prev => {
      let next: Bookmark[];
      if (prev.some(b => b.num === num)) next = prev.filter(b => b.num !== num);
      else next = [{ num, title: String(e.title || ''), scripture: `${e.scripture_book || ''} ${e.scripture_chapter || ''}:${e.scripture_verse || ''}`.trim(), at: new Date().toISOString() }, ...prev];
      const uk = userKey();
      writeJSON(`pr_bookmarks_${uk}`, next);
      // ALSO the shared key Dashboard reads:
      writeJSON('pr_bookmarked_devotionals', next);
      writeJSON(`pr_bookmarked_devotionals_${uk}`, next);
      return next;
    });
  }
  // ── MARKS ──
  function saveMark(kind: 'highlight' | 'underline') {
    if (!open) return;
    let text = '';
    try { text = (window.getSelection()?.toString() || '').trim(); } catch {}
    if (!text) text = selText.trim();
    if (!text) { setMarkSaved('⚠️ Select some words first — drag over the words, then tap Highlight / Underline.'); setTimeout(() => setMarkSaved(''), 3000); return; }
    text = text.slice(0, 400);
    const num = numOf(open);
    let painted = false;
    // 1) Paint it in the DOM RIGHT NOW.
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && bodyRef.current && sel.anchorNode && bodyRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        if (!range.collapsed) {
          const wrap = document.createElement(kind === 'underline' ? 'u' : 'mark');
          wrap.className = kind === 'underline' ? 'pr-mark-u' : 'pr-mark-hl';
          try { range.surroundContents(wrap); painted = true; } catch {
            // Selection spans tags — use execCommand fallback (works across nodes)
            try {
              if (kind === 'highlight') { (document as any).execCommand('hiliteColor', false, '#fde68a'); }
              else { (document as any).execCommand('underline', false, undefined); }
              painted = true;
            } catch {}
          }
        }
      }
    } catch {}
    // 2) Save per-user so it survives refresh / reopen — even if painting failed,
    //    the saved text will be painted by applyMarksDOM on the next render.
    setMarks(prev => {
      if (prev.some(m => m.num === num && m.lang === lang && m.text.replace(/\s+/g, ' ') === text.replace(/\s+/g, ' ') && m.kind === kind)) return prev;
      const next = [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, num, lang, text, kind, at: new Date().toISOString() }];
      writeJSON(`pr_highlights_${userKey()}`, next);
      return next;
    });
    setMarkSaved(painted ? (kind === 'highlight' ? '✅ Highlight saved — just for you' : '✅ Underline saved — just for you') : (kind === 'highlight' ? '✅ Highlight saved — reopen to see it' : '✅ Underline saved — reopen to see it'));
    setSelText(''); setSelPos(null);
    try { window.getSelection()?.removeAllRanges(); } catch {}
    setTimeout(() => setMarkSaved(''), 3000);
  }
  // Keep toolbar / action bar in sync while the user drags a selection (desktop + mobile).
  // onMouseUp alone misses touch selections — selectionchange catches both.
  useEffect(() => {
    if (!open) return;
    const onChange = () => {
      try {
        const sel = window.getSelection(); const t = (sel?.toString() || '').trim();
        if (!t || t.length < 2) return; // don't clear here — mouseup handler clears when selection is gone
        const node = sel?.anchorNode as Node | null;
        const el = node ? (node.nodeType === 3 ? (node as Text).parentElement : (node as Element)) : null;
        if (!el || !bodyRef.current?.contains(el)) return;
        let x = window.innerWidth / 2, y = 140;
        try { const r = sel!.getRangeAt(0).getBoundingClientRect(); if (r && r.top > 0) { x = r.left + r.width / 2; y = r.top; } } catch {}
        setSelText(t); setSelPos({ x, y });
      } catch {}
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, [open]);
  function deleteMark(id: string) { setMarks(prev => { const next = prev.filter(m => m.id !== id); writeJSON(`pr_highlights_${userKey()}`, next); return next; }); }
  function clearMarksForOpen() { if (!open) return; const num = numOf(open); setMarks(prev => { const next = prev.filter(m => !(m.num === num && m.lang === lang)); writeJSON(`pr_highlights_${userKey()}`, next); return next; }); }
  function onSelectText() {
    // Wait a tick: on touch devices the selection is not ready inside mouseup/touchend.
    setTimeout(() => {
      try {
        const sel = window.getSelection(); const t = (sel?.toString() || '').trim();
        if (!t || t.length < 2) { setSelText(''); setSelPos(null); return; }
        const node = sel?.anchorNode as Node | null;
        const el = node ? (node.nodeType === 3 ? (node as Text).parentElement : (node as Element)) : null;
        if (!el || !bodyRef.current?.contains(el)) { setSelText(''); setSelPos(null); return; }
        let x = window.innerWidth / 2, y = 120;
        try { const r = sel!.getRangeAt(0).getBoundingClientRect(); if (r && r.top > 0) { x = r.left + r.width / 2; y = r.top; } } catch {}
        setSelText(t); setSelPos({ x, y });
      } catch { setSelText(''); setSelPos(null); }
    }, 60);
  }
  const openMarks = open ? marks.filter(m => m.num === numOf(open) && m.lang === lang) : [];
  const openBodyHtml = open ? formatDevotionalBody(lang === 'lu' && open.devotional_text_lu ? open.devotional_text_lu : open.devotional_text, lang) : '';
  // V13: apply saved marks to the REAL DOM after every render / language switch / marks change
  useEffect(() => { if (open) { const t = setTimeout(() => applyMarksDOM(bodyRef.current, openMarks), 30); return () => clearTimeout(t); } }, [open, lang, marks, openBodyHtml]);

  async function openVerse(ref: string) { setVerseRef(ref); setVerseText(''); setVerseLoading(true); try { const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`); const j = await r.json().catch(() => ({})); setVerseText(j.text ? String(j.text).trim() : 'Verse text could not be loaded. Tap “Open in Bible Reader” below to read it in the app.'); } catch { setVerseText('Verse text could not be loaded offline. Tap “Open in Bible Reader” below to read it in the app.'); } setVerseLoading(false); }
  function shareUrl(e: Entry) { try { return `${window.location.origin}/devotional-plans?devotional=${dLabel(e)}`; } catch { return `/devotional-plans?devotional=${dLabel(e)}`; } }
  function shareText(e: Entry) { const further = parseRefs(String(e.further_readings || '')).join(', '); const relatedLines = parseRelated(e.related_scriptures).map((it: any) => `${it.ref}${it.explanation ? ' — ' + it.explanation : ''}`).join('\n'); const full = fullText(e); return `🙏 ${e.title} — ${e.scripture_book} ${e.scripture_chapter}:${e.scripture_verse}\n\n${full}${relatedLines ? `\n\n📖 Related Scriptures:\n${relatedLines}` : ''}${further ? `\n\n📖 Further readings: ${further}` : ''}\n\n👉 Read more devotionals here: ${shareUrl(e)}`; }
  function shareOn(e: Entry, network: string) { const url = encodeURIComponent(shareUrl(e)); const text = encodeURIComponent(shareText(e)); const links: Record<string, string> = { facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, whatsapp: `https://wa.me/?text=${text}`, telegram: `https://t.me/share/url?url=${url}&text=${text}`, linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`, instagram: `https://www.instagram.com/` }; if (network === 'instagram') { navigator.clipboard?.writeText(shareText(e)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {}); window.open(links.instagram, '_blank'); return; } window.open(links[network], '_blank', 'noopener,width=640,height=560'); }
  async function copyLink(e: Entry) { try { await navigator.clipboard.writeText(shareText(e)); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } }
  const furtherRefs = open ? parseRefs(stripHtml(String(open.further_readings || ''))) : [];
  const relatedItems = open ? parseRelated(open.related_scriptures) : [];
  const allRefs = [...new Set([...furtherRefs])];

  return (
    <div style={{ background: '#f8f6ef', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 640px) { .dev-list-card { flex-direction: column !important; } .dev-list-img { width: 100% !important; } .dev-list-img > div { height: 170px !important; } .dev-list-body { padding: 14px 16px 18px !important; } .dev-list-body h3 { font-size: 20px !important; line-height: 1.3 !important; } .dev-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; } }
        .dev-tab-row { scrollbar-width: none; -ms-overflow-style: none; } .dev-tab-row::-webkit-scrollbar { display: none; } .dev-tab { white-space: nowrap; text-decoration: none; }
        .dev-body h3, .dev-body .dev-h3 { font-size: 17px; font-weight: 800; color: #1d4035; margin: 22px 0 8px; line-height: 1.4; } .dev-body h3:first-child, .dev-body .dev-h3:first-child { margin-top: 4px; } .dev-body p { margin: 0 0 12px; } .dev-body .dev-quote { margin: 10px 0 14px; padding: 12px 16px; background: #fff; border-left: 5px solid #a9852e; border-radius: 0 10px 10px 0; font-style: italic; color: #1c352d; line-height: 1.7; }
        .pr-mark-hl { background: #fde68a; color: #1c352d; padding: 0 2px; border-radius: 3px; }
        .pr-mark-u { text-decoration: underline; text-decoration-color: #a9852e; text-decoration-thickness: 2px; text-underline-offset: 3px; }
      `}</style>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(23,55,47,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(233,201,129,0.35)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }} aria-label="Go to Home">
            <span style={{ width: 38, height: 38, borderRadius: 12, overflow: 'hidden', background: '#fff', border: '1px solid #e9c981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Pray-Read Bible" width={38} height={38} style={{ objectFit: 'contain' }} onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} />
            </span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>Pray-Read <span style={{ color: '#e9c981' }}>Bible</span></span>
          </Link>
          <span style={{ marginLeft: 'auto' }}><Link href="/dashboard" style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 999, background: '#e9c981', color: '#1c352d', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>📊 Dashboard</Link></span>
        </div>
        <nav className="dev-tab-row" style={{ maxWidth: 980, margin: '0 auto', padding: '2px 16px 10px', display: 'flex', gap: 6, overflowX: 'auto' }} aria-label="Main sections">
          {TABS.map((t) => (<Link key={t.href} href={t.href} className="dev-tab" aria-current={t.active ? 'page' : undefined} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: t.active ? 800 : 600, background: t.active ? '#e9c981' : 'rgba(255,255,255,0.10)', color: t.active ? '#1c352d' : '#fff', border: t.active ? '1px solid #e9c981' : '1px solid rgba(255,255,255,0.25)' }}>{t.label}</Link>))}
        </nav>
      </header>
      <div style={{ position: 'relative', padding: '56px 20px 64px', textAlign: 'center', color: '#fff', backgroundColor: '#17372f', backgroundImage: 'url("/assets/devotional-hero.jpg")', backgroundSize: 'cover', backgroundPosition: 'center 38%', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(16,37,31,0.78) 0%, rgba(16,37,31,0.55) 50%, rgba(16,37,31,0.82) 100%)' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 30, margin: '0 0 8px', lineHeight: 1.2 }}>Daily Devotionals</h1>
          <p style={{ maxWidth: 640, margin: '0 auto', fontSize: 20, lineHeight: 1.5 }}>Short, rich devotionals to deepen your faith — in English and Luganda, with Scripture, further readings, and a streak to keep you going.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
            <button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} style={{ border: 'none', cursor: 'pointer', padding: '14px 26px', borderRadius: 999, fontWeight: 800, fontSize: 16, background: '#e9c981', color: '#1c352d' }}>Explore Devotionals →</button>
            <button onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} style={{ cursor: 'pointer', padding: '14px 26px', borderRadius: 999, fontWeight: 700, fontSize: 16, background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)' }}>📅 {view === 'calendar' ? 'List View' : 'Calendar View'}</button>
          </div>
          {done.length > 0 && <p style={{ marginTop: 14, opacity: 0.95 }}>🔥 Your streak: {done.length} devotional{done.length === 1 ? '' : 's'} completed</p>}
          {bookmarks.length > 0 && <p style={{ marginTop: 6, opacity: 0.95 }}>🔖 {bookmarks.length} bookmarked — they also appear on your Dashboard</p>}
        </div>
      </div>
      <div id="plans" style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>Devotional Plans</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)} style={{ cursor: 'pointer', padding: '10px 16px', borderRadius: 999, border: '1px solid #1d4035', background: showBookmarkedOnly ? '#1d4035' : '#fff', color: showBookmarkedOnly ? '#fff' : '#1d4035', fontWeight: 700 }}>🔖 Bookmarked only {bookmarks.length ? `(${bookmarks.length})` : ''}</button>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title / D-001..." style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #e5e7eb', minWidth: 240 }} />
          </div>
        </div>
        {loading ? <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading devotionals…</p> : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 20, padding: 36, textAlign: 'center', color: '#6b7280', marginTop: 18 }}>{entries.length === 0 ? 'No devotionals yet. Check back soon.' : showBookmarkedOnly ? 'No bookmarks yet — tap 🔖 on any devotional to save it to your Dashboard.' : 'No devotionals match your search.'}</div>
        ) : view === 'calendar' ? (
          <div className="dev-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginTop: 18 }}>
            {filtered.map((e: any) => (
              <div key={e.id} style={{ background: '#fff', border: `1px solid ${done.includes(numOf(e)) ? '#bbf7d0' : '#eee'}`, borderRadius: 16, overflow: 'hidden' }}>
                <div onClick={() => { setOpen(e); setLang('en'); }} style={{ cursor: 'pointer' }}><Cover e={e} height={130} /></div>
                <div style={{ padding: '10px 12px 14px' }}><div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div><div style={{ color: '#6b7280', fontSize: 12 }}>{done.includes(numOf(e)) ? '✓ Completed · ' : ''}{e.devotional_text_lu ? 'EN + LU' : 'EN'}</div><button onClick={() => toggleBookmark(e)} style={{ marginTop: 8, cursor: 'pointer', border: '1px solid #1d4035', background: isBookmarked(e) ? '#e9c981' : '#fff', color: '#1d4035', borderRadius: 999, padding: '6px 12px', fontWeight: 700, fontSize: 12 }}>{isBookmarked(e) ? '🔖 Bookmarked' : '🔖 Bookmark'}</button></div>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => { setOpen(e); setLang('en'); }} style={{ cursor: 'pointer', border: '1px solid #1d4035', color: '#1d4035', background: '#fff', borderRadius: 999, padding: '7px 16px', fontWeight: 700 }}>Read →</button>
                    <button onClick={() => toggleBookmark(e)} style={{ cursor: 'pointer', border: '1px solid #1d4035', color: '#1d4035', background: isBookmarked(e) ? '#e9c981' : '#fff', borderRadius: 999, padding: '7px 16px', fontWeight: 700 }}>{isBookmarked(e) ? '🔖 Bookmarked' : '🔖 Bookmark'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 32 }}>
          {[{ i: '📖', t: 'Read', d: 'Scripture first — every devotional starts with the Word.' }, { i: '🖍', t: 'Highlight & underline', d: 'Select any words in the reader to mark them — saved just for you.' }, { i: '🔖', t: 'Bookmark', d: 'Bookmark a devotional and it appears on your Dashboard.' }].map(c => (<div key={c.t} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 16, padding: 22 }}><div style={{ fontSize: 26 }}>{c.i}</div><h3 style={{ margin: '10px 0 4px' }}>{c.t}</h3><p style={{ color: '#6b7280', margin: 0 }}>{c.d}</p></div>))}
        </div>
      </div>
      <AppFooter />
      {open && (() => { const [c1, c2, c3] = paletteFor(open); return (
        <div onClick={() => { setOpen(null); setSelText(''); setSelPos(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(16,37,31,0.65)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#f8f6ef', backdropFilter: 'blur(6px)', border: '1px solid #e8e7de', borderRadius: 22, maxWidth: 780, width: '100%', margin: '22px 0', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
            <div style={{ position: 'relative' }}>
              {(open.cover_photo_url || open.default_image_url) ? <div style={{ position: 'relative', height: 210, overflow: 'hidden' }}><img src={String(open.cover_photo_url || open.default_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(23,55,47,0.72))' }} /></div> : <div style={{ height: 210, background: `linear-gradient(120deg, ${c1}, ${c2} 55%, ${c3})`, position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} /><div style={{ position: 'absolute', right: 40, bottom: -50, width: 130, height: 130, borderRadius: '50%', background: 'rgba(0,0,0,0.16)' }} /><div style={{ position: 'absolute', right: 20, top: 14, fontSize: 56, opacity: 0.35, color: '#fff' }}>✝</div></div>}
              <button onClick={() => setOpen(null)} style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'rgba(255,255,255,0.92)', borderRadius: 999, width: 34, height: 34, cursor: 'pointer', fontSize: 16 }}>✕</button>
              <div style={{ position: 'absolute', left: 22, right: 22, bottom: 16, color: '#fff' }}>
                <span style={{ background: '#fff', color: '#1c352d', fontWeight: 800, fontSize: 12, padding: '4px 11px', borderRadius: 999 }}>{dLabel(open)}</span>
                <h2 style={{ fontSize: 28, margin: '10px 0 2px', lineHeight: 1.15 }}>{open.title}</h2>
                <button onClick={() => openVerse(`${open.scripture_book} ${open.scripture_chapter}:${open.scripture_verse}`)} title="Tap to read this verse, then open in Bible Reader" style={{ background: 'none', border: 'none', color: '#e9c981', fontWeight: 700, fontSize: 15, cursor: 'pointer', padding: 0 }}>📖 {open.scripture_book} {open.scripture_chapter}:{open.scripture_verse} — tap to read →</button>
                {open.author && <div style={{ fontSize: 13, opacity: 0.9 }}>By {open.author}</div>}
              </div>
            </div>
            <div style={{ padding: '18px 22px 24px', background: '#f8f6ef' }}>
              {/* BOOKMARK + HOW TO HIGHLIGHT */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <button onClick={() => toggleBookmark(open)} style={{ cursor: 'pointer', border: '1px solid #1d4035', background: isBookmarked(open) ? '#e9c981' : '#fff', color: '#1d4035', borderRadius: 999, padding: '9px 16px', fontWeight: 800 }}>{isBookmarked(open) ? '🔖 Bookmarked — on your Dashboard' : '🔖 Bookmark to Dashboard'}</button>
                <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>🖍 Tip: select any words below, then tap Highlight or Underline — it saves just for you.</span>
              </div>
              {markSaved && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 14, fontWeight: 700 }}>{markSaved}</div>}
              <div style={{ background: '#e9eddf', border: '1px solid #dfe3d8', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1c352d', marginBottom: 8 }}>SHARE THIS DEVOTIONAL</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => shareOn(open, 'facebook')} title="Share on Facebook" aria-label="Share on Facebook" style={{ cursor: 'pointer', border: 'none', background: '#1877f2', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>f</button>
                  <button onClick={() => shareOn(open, 'whatsapp')} title="Share on WhatsApp" aria-label="Share on WhatsApp" style={{ cursor: 'pointer', border: 'none', background: '#25d366', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💬</button>
                  <button onClick={() => shareOn(open, 'telegram')} title="Share on Telegram" aria-label="Share on Telegram" style={{ cursor: 'pointer', border: 'none', background: '#229ed9', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✈</button>
                  <button onClick={() => shareOn(open, 'instagram')} title="Share on Instagram" aria-label="Share on Instagram" style={{ cursor: 'pointer', border: 'none', background: 'linear-gradient(45deg,#f58529,#dd2a7b,#8134af)', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📸</button>
                  <button onClick={() => shareOn(open, 'linkedin')} title="Share on LinkedIn" aria-label="Share on LinkedIn" style={{ cursor: 'pointer', border: 'none', background: '#0a66c2', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>in</button>
                  <button onClick={() => copyLink(open)} title="Copy share link" aria-label="Copy share link" style={{ cursor: 'pointer', border: '1px solid #1d4035', background: '#fff', color: '#1d4035', borderRadius: '50%', width: 44, height: 44, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{copied ? '✓' : '🔗'}</button>
                </div>
              </div>
              {open.scripture_quotation && <div style={{ background: '#fff', border: '1px solid #e8e7de', borderLeft: '5px solid #a9852e', padding: '14px 16px', borderRadius: 10, marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 800, color: '#a9852e', marginBottom: 4 }}>SCRIPTURE</div><div dangerouslySetInnerHTML={{ __html: String(open.scripture_quotation) }} /></div>}
              {open.devotional_text_lu && <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><button onClick={() => setLang('en')} style={{ padding: '7px 16px', borderRadius: 999, cursor: 'pointer', border: '1px solid #1d4035', background: lang === 'en' ? '#1d4035' : '#fff', color: lang === 'en' ? '#fff' : '#1d4035', fontWeight: 700 }}>🇬🇧 English</button><button onClick={() => setLang('lu')} style={{ padding: '7px 16px', borderRadius: 999, cursor: 'pointer', border: '1px solid #1d4035', background: lang === 'lu' ? '#1d4035' : '#fff', color: lang === 'lu' ? '#fff' : '#1d4035', fontWeight: 700 }}>🇺🇬 Luganda</button></div>}
              {/* ALWAYS-VISIBLE HIGHLIGHT BAR — V14 FIX: does NOT depend on the floating toolbar.
                  If the floating bubble never appears on your phone/browser, use THESE buttons:
                  1) drag / long-press over words in the text below until they are selected
                  2) tap Highlight or Underline here — it saves instantly. */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: '1px solid #e9c981', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1d4035' }}>🖍 Mark selected words:</span>
                <button onMouseDown={e => e.preventDefault()} onClick={() => saveMark('highlight')} style={{ cursor: 'pointer', border: 'none', background: '#e9c981', color: '#1c352d', borderRadius: 999, padding: '9px 16px', fontWeight: 800, fontSize: 13 }}>🖍 Highlight</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => saveMark('underline')} style={{ cursor: 'pointer', border: '1px solid #1d4035', background: '#fff', color: '#1d4035', borderRadius: 999, padding: '9px 16px', fontWeight: 700, fontSize: 13 }}><u>Underline</u></button>
                <span style={{ fontSize: 12, color: selText ? '#166534' : '#6b7280' }}>{selText ? `Selected: “${selText.slice(0, 50)}${selText.length > 50 ? '…' : ''}” — now tap a button` : 'No words selected yet — drag over words below first'}</span>
              </div>
              {/* READER BODY — selection here triggers the Highlight/Underline toolbar */}
              <div ref={bodyRef} onMouseUp={onSelectText} onTouchEnd={onSelectText} className="dev-body" style={{ userSelect: "text", WebkitUserSelect: "text", fontSize: 16, lineHeight: 1.75, color: '#1f2937' }} dangerouslySetInnerHTML={{ __html: openBodyHtml }} />
              {/* MY MARKS ON THIS DEVOTIONAL */}
              {openMarks.length > 0 && (
                <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e9c981', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div style={{ fontWeight: 800, fontSize: 13, color: '#1d4035' }}>🖍 MY MARKS ON THIS DEVOTIONAL ({openMarks.length}) — saved just for you</div><button onClick={clearMarksForOpen} style={{ cursor: 'pointer', border: 'none', background: 'none', color: '#b91c1c', fontWeight: 700, fontSize: 12 }}>Clear all marks</button></div>
                  <div style={{ display: 'grid', gap: 8 }}>{openMarks.map(m => (<div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><span style={{ fontSize: 12, fontWeight: 800, background: '#f8f6ef', border: '1px solid #e8e7de', borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{m.kind === 'highlight' ? '🖍 Highlight' : 'Underline'}</span><span style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: '#374151' }}>“{m.text}”</span><button onClick={() => deleteMark(m.id)} style={{ cursor: 'pointer', border: 'none', background: '#fee2e2', color: '#991b1b', borderRadius: 999, width: 24, height: 24 }}>✕</button></div>))}</div>
                </div>
              )}
              {relatedItems.length > 0 && (<div style={{ marginTop: 20, background: '#fff', border: '1px solid #dfe3d8', borderRadius: 12, padding: '14px 16px' }}><div style={{ fontWeight: 800, fontSize: 13, color: '#1d4035', marginBottom: 10 }}>📖 RELATED SCRIPTURES — TAP A VERSE TO READ IT</div><div style={{ display: 'grid', gap: 10 }}>{relatedItems.map((it: { ref: string; explanation: string }, i: number) => (<div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><button onClick={() => openVerse(it.ref)} style={{ cursor: 'pointer', border: '1px solid #1d4035', background: '#e9eddf', color: '#1d4035', borderRadius: 999, padding: '6px 12px', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>{it.ref} →</button>{it.explanation && <span style={{ color: '#374151', fontSize: 14, lineHeight: 1.5 }}>{it.explanation}</span>}</div>))}</div></div>)}
              {allRefs.length > 0 && (<div style={{ marginTop: 20, background: '#fff', border: '1px solid #e9c981', borderRadius: 12, padding: '14px 16px' }}><div style={{ fontWeight: 800, fontSize: 13, color: '#7a5f1e', marginBottom: 8 }}>📖 FURTHER READINGS — TAP A VERSE TO READ IT</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{allRefs.filter((r: any) => typeof r === 'string' && r && r !== '[object Object]').map((ref: string) => (<button key={ref} onClick={() => openVerse(ref)} style={{ cursor: 'pointer', border: '1px solid #a9852e', background: '#fdf8e8', color: '#7a5f1e', borderRadius: 999, padding: '7px 13px', fontWeight: 700 }}>{ref} →</button>))}</div></div>)}
              <button onClick={() => toggleDone(numOf(open))} style={{ width: '100%', marginTop: 18, padding: 13, borderRadius: 12, border: 'none', cursor: 'pointer', background: done.includes(numOf(open)) ? '#dcfce7' : '#1d4035', color: done.includes(numOf(open)) ? '#166534' : '#fff', fontWeight: 800 }}>{done.includes(numOf(open)) ? '✓ Completed — tap to unmark' : '✓ Mark complete'}</button>
            </div>
          </div>
          {/* FLOATING HIGHLIGHT / UNDERLINE TOOLBAR — V13: onMouseDown prevents losing the selection */}
          {selText && selPos && (
            <div onClick={e => e.stopPropagation()} onMouseDown={e => e.preventDefault()} style={{ position: 'fixed', left: Math.max(12, Math.min(selPos.x - 140, window.innerWidth - 300)), top: Math.max(8, selPos.y - 72), zIndex: 90, background: '#17372f', color: '#fff', borderRadius: 14, padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 12px 30px rgba(0,0,0,0.4)', maxWidth: 300 }}>
              <div style={{ fontSize: 12, color: '#e9c981', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{selText.slice(0, 60)}{selText.length > 60 ? '…' : ''}”</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onMouseDown={e => e.preventDefault()} onClick={() => saveMark('highlight')} style={{ cursor: 'pointer', border: 'none', background: '#e9c981', color: '#1c352d', borderRadius: 999, padding: '8px 14px', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>🖍 Highlight</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => saveMark('underline')} style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff', borderRadius: 999, padding: '8px 14px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}><u>Underline</u></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => { setSelText(''); setSelPos(null); }} style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: '#fff', fontSize: 14, padding: '4px 8px' }}>✕</button>
              </div>
            </div>
          )}
        </div>
      ); })()}
      {verseRef && (<div onClick={() => setVerseRef(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}><div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 520, width: '100%', padding: 22, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, color: '#1c352d' }}>📖 {verseRef}</h3><button onClick={() => setVerseRef(null)} style={{ border: 'none', background: '#f3f4f6', borderRadius: 999, width: 30, height: 30, cursor: 'pointer' }}>✕</button></div><p style={{ fontSize: 17, lineHeight: 1.7, marginTop: 14 }}>{verseLoading ? 'Loading verse…' : verseText}</p><a href={refToBibleUrl(verseRef)} style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '12px', borderRadius: 10, background: '#1d4035', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>Open {verseRef} in Bible Reader →</a><button onClick={() => setVerseRef(null)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Close</button></div></div>)}
    </div>
  );
}
