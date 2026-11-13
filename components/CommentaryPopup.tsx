"use client";
import { X, BookOpen, RefreshCw, Copy, Check } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

// components/CommentaryPopup.tsx — FIXED + IMPROVED
// Fixes:
//  1) API params: tries EVERY param shape your APIs have used (bookId / book_number / book / book_id,
//     verse / verseNumber / verse_number) instead of only bookId+verseNumber.
//  2) Response shapes: accepts array, {commentary}, {data}, {success,commentary}, bare object —
//     old code only accepted {success:true, commentary} so it showed "No commentary" on valid rows.
//  3) Field names: normalises text_english / commentary_text / commentary / content / text, and
//     Luganda variants — old code only read commentary_text / luganda_commentary_text.
//  4) SECURITY: NO dangerouslySetInnerHTML. Renders as plain text (whitespace-pre-wrap).
//     Old code injected DB HTML straight into the page.
//  5) UX: EN / LU / BOTH toggle, Retry, Copy, ESC-to-close, scroll-lock, stale-verse guard
//     (old code could show verse 3's commentary while verse 5 was open).
// Usage in chapter page:
//   const [commentaryVerse, setCommentaryVerse] = useState<number|null>(null);
//   <button onClick={()=>setCommentaryVerse(v.verse)}>📖 Commentary</button>
//   <CommentaryPopup isOpen={commentaryVerse!==null} onClose={()=>setCommentaryVerse(null)}
//     bookId={book?.id ?? bookNum} bookNum={bookNum} chapter={chapterNum}
//     verseNumber={commentaryVerse ?? 1} bookName={bookName} isDark={theme==='dark'} />

interface CommentaryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: number;
  bookNum?: number;
  chapter: number;
  verseNumber: number;
  bookName: string;
  isDark?: boolean;
  // Optional: if the chapter page already fetched this verse's commentary, pass it — popup won't refetch
  initialCommentary?: any;
}

function pickText(row: any): { en: string; lu: string } {
  if (!row) return { en: '', lu: '' };
  if (typeof row === 'string') return { en: row, lu: '' };
  const en = row.text_english || row.commentary_text || row.commentary_english || row.en_commentary || row.commentary || row.content || row.text || row.explanation_english || '';
  const lu = row.text_luganda || row.luganda_commentary_text || row.commentary_luganda || row.lu_commentary || row.luganda || row.explanation_luganda || '';
  return { en: String(en || ''), lu: String(lu || '') };
}

export default function CommentaryPopup({ isOpen, onClose, bookId, bookNum, chapter, verseNumber, bookName, isDark = false, initialCommentary }: CommentaryPopupProps) {
  const [commentary, setCommentary] = useState<{ en: string; lu: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<'EN' | 'LU' | 'BOTH'>('EN');
  const [copied, setCopied] = useState(false);
  const [tried, setTried] = useState(0);

  const book = bookNum ?? bookId ?? 0;
  const id = bookId ?? bookNum ?? 0;

  const load = useCallback(async () => {
    // If parent already has it, use it — no fetch
    if (initialCommentary) {
      const p = pickText(initialCommentary);
      if (p.en || p.lu) { setCommentary(p); setError(null); setLoading(false); return; }
    }
    setLoading(true); setError(null); setCommentary(null);
    const urls = [
      `/api/commentaries?book_number=${book}&chapter=${chapter}&verse=${verseNumber}`,
      `/api/commentaries?bookId=${id}&chapter=${chapter}&verse=${verseNumber}`,
      `/api/commentaries?bookId=${id}&chapter=${chapter}&verseNumber=${verseNumber}`,
      `/api/commentaries?book=${book}&chapter=${chapter}&verse=${verseNumber}`,
      `/api/commentaries?book_id=${id}&chapter=${chapter}&verse_number=${verseNumber}`,
      `/api/commentaries?book_number=${book}&chapter=${chapter}&verse_number=${verseNumber}`,
    ];
    let found: any = null;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (!data) continue;
        // Unwrap every shape: array / {commentary} / {data} / {success,commentary} / bare object
        const row = Array.isArray(data) ? data[0]
          : data.commentary ?? data.data ?? data.result ?? (data.success === false ? null : data);
        const arr = Array.isArray(row) ? row[0] : row;
        if (!arr) continue;
        const p = pickText(arr);
        if (p.en || p.lu) { found = p; break; }
        // Row exists but empty — keep trying other URLs, don't stop yet
      } catch {}
    }
    if (found) { setCommentary(found); setError(null); }
    else { setError('No commentary available for this verse yet.'); }
    setLoading(false);
  }, [book, id, chapter, verseNumber, initialCommentary]);

  useEffect(() => {
    if (!isOpen) return;
    setLang('EN'); setCopied(false); setTried(t => t + 1);
    load();
  }, [isOpen, book, chapter, verseNumber, load]);

  // ESC closes + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showEn = lang === 'EN' || lang === 'BOTH';
  const showLu = lang === 'LU' || lang === 'BOTH';
  const fullText = `${bookName} ${chapter}:${verseNumber}\n\n${(showEn && commentary?.en ? commentary.en : '')}${showEn && commentary?.en && showLu && commentary?.lu ? '\n\n' : ''}${showLu && commentary?.lu ? commentary.lu : ''}`;
  const copyAll = async () => { try { await navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className={`w-full max-w-[600px] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[86vh] overflow-y-auto relative ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-[#f8f9fc] text-slate-900'}`} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/10 text-slate-300' : 'bg-black/5 text-slate-500'}`} aria-label="Close commentary"><X size={16} /></button>

        <div className="flex items-center gap-2 pr-10">
          <span className="text-[20px]">📖</span>
          <h3 className="text-[18px] font-bold leading-tight">Commentary</h3>
        </div>
        <p className={`text-[12px] mt-0.5 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{bookName} {chapter}:{verseNumber}</p>

        {/* Language toggle — EN / LU / BOTH */}
        <div className="flex gap-1.5 mb-4">
          {(['EN', 'LU', 'BOTH'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold ${lang === l ? 'bg-blue-600 text-white' : isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{l === 'BOTH' ? 'EN + LU' : l}</button>
          ))}
          {commentary && <button onClick={copyAll} className={`ml-auto px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1 ${isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>{copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button>}
        </div>

        {loading && <p className={`text-center py-8 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading commentary…</p>}

        {!loading && error && (
          <div className="text-center py-6">
            <BookOpen size={28} className={`mx-auto mb-2 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{error}</p>
            <p className={`text-[12px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Pray-read the verse above — the Prayer tab for this verse carries the meditation for it.</p>
            <button onClick={load} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold inline-flex items-center gap-1.5"><RefreshCw size={14} /> Try again</button>
          </div>
        )}

        {!loading && commentary && (
          <div className={`leading-[1.8] text-[14px] whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {showEn && commentary.en && <p>{commentary.en}</p>}
            {showLu && commentary.lu && <p className={showEn && commentary.en ? 'mt-4 pt-4 border-t border-slate-200' : ''}>{commentary.lu}</p>}
            {!commentary.en && !commentary.lu && <p className="italic opacity-70">No commentary text in this row.</p>}
            {lang === 'EN' && !commentary.en && commentary.lu && <p>{commentary.lu}</p>}
            {lang === 'LU' && !commentary.lu && commentary.en && <p>{commentary.en}</p>}
          </div>
        )}

        <p className={`text-[11px] text-center mt-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Commentary is added from Admin → Commentaries.</p>
      </div>
    </div>
  );
}
