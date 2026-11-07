"use client";

import { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useScripturePopup, ScriptureVersePopup, ScriptureText } from '@/components/ScriptureVersePopup';

interface CrossReference {
  id?: number;
  source_book_id: number;
  source_chapter: number;
  source_verse: number;
  target_book_id: number;
  target_chapter: number;
  target_verse: number;
  target_book_number?: number;
  relationship_type: string;
  notes: string;
  source_book_name?: string;
  target_book_name?: string;
  text_english?: string;
  text_luganda?: string;
}

interface Book {
  id: number;
  name_english: string;
  book_number?: number;
  name_luganda?: string;
  abbreviation_english?: string;
  abbreviation_luganda?: string;
}

interface CrossReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBookId: number;
  sourceChapter: number;
  sourceVerse: number;
  sourceBookName: string;
  books?: Book[];
  theme?: 'light' | 'sepia' | 'dark';
  onRefresh?: () => void;
}

/* ------------------------------------------------------------------ */
/*  BOOK RESOLUTION — full names + short names + dotted abbreviations  */
/*  Canonical list: 66 books, id = book_number (1..66)                */
/*  This is the FALLBACK. If `books` prop is passed it wins.           */
/* ------------------------------------------------------------------ */

type CanonBook = { id: number; name: string; aliases: string[] };

const CANON: CanonBook[] = [
  { id: 1, name: 'Genesis', aliases: ['gen', 'ge', 'gn'] },
  { id: 2, name: 'Exodus', aliases: ['ex', 'exod', 'exo'] },
  { id: 3, name: 'Leviticus', aliases: ['lev', 'lv'] },
  { id: 4, name: 'Numbers', aliases: ['num', 'nu', 'nm'] },
  { id: 5, name: 'Deuteronomy', aliases: ['deut', 'deu', 'dt'] },
  { id: 6, name: 'Joshua', aliases: ['josh', 'jos'] },
  { id: 7, name: 'Judges', aliases: ['judg', 'jdg', 'jg'] },
  { id: 8, name: 'Ruth', aliases: ['ru'] },
  { id: 9, name: '1 Samuel', aliases: ['1 sam', '1sam', '1 sa', '1sa'] },
  { id: 10, name: '2 Samuel', aliases: ['2 sam', '2sam', '2 sa', '2sa'] },
  { id: 11, name: '1 Kings', aliases: ['1 kings', '1kings', '1 kgs', '1kgs', '1 ki', '1ki'] },
  { id: 12, name: '2 Kings', aliases: ['2 kings', '2kings', '2 kgs', '2kgs', '2 ki', '2ki'] },
  { id: 13, name: '1 Chronicles', aliases: ['1 chron', '1chron', '1 chr', '1chr', '1 ch', '1ch'] },
  { id: 14, name: '2 Chronicles', aliases: ['2 chron', '2chron', '2 chr', '2chr', '2 ch', '2ch'] },
  { id: 15, name: 'Ezra', aliases: ['ezr'] },
  { id: 16, name: 'Nehemiah', aliases: ['neh', 'ne'] },
  { id: 17, name: 'Esther', aliases: ['est', 'es'] },
  { id: 18, name: 'Job', aliases: ['jb'] },
  { id: 19, name: 'Psalms', aliases: ['ps', 'psalm', 'psa', 'psal'] },
  { id: 20, name: 'Proverbs', aliases: ['prov', 'pro', 'prv', 'pr'] },
  { id: 21, name: 'Ecclesiastes', aliases: ['eccl', 'eccles', 'ecc', 'ec'] },
  { id: 22, name: 'Song of Solomon', aliases: ['song', 'song of songs', 'sos', 'cant', 'canticles'] },
  { id: 23, name: 'Isaiah', aliases: ['isa', 'is'] },
  { id: 24, name: 'Jeremiah', aliases: ['jer', 'je'] },
  { id: 25, name: 'Lamentations', aliases: ['lam', 'la'] },
  { id: 26, name: 'Ezekiel', aliases: ['ezek', 'eze', 'ez'] },
  { id: 27, name: 'Daniel', aliases: ['dan', 'da', 'dn'] },
  { id: 28, name: 'Hosea', aliases: ['hos', 'ho'] },
  { id: 29, name: 'Joel', aliases: ['jl'] },
  { id: 30, name: 'Amos', aliases: ['am'] },
  { id: 31, name: 'Obadiah', aliases: ['obad', 'ob'] },
  { id: 32, name: 'Jonah', aliases: ['jon', 'jnh'] },
  { id: 33, name: 'Micah', aliases: ['mic', 'mi'] },
  { id: 34, name: 'Nahum', aliases: ['nah', 'na'] },
  { id: 35, name: 'Habakkuk', aliases: ['hab', 'hb'] },
  { id: 36, name: 'Zephaniah', aliases: ['zeph', 'zep', 'zp'] },
  { id: 37, name: 'Haggai', aliases: ['hag', 'hg'] },
  { id: 38, name: 'Zechariah', aliases: ['zech', 'zec', 'zc'] },
  { id: 39, name: 'Malachi', aliases: ['mal', 'ml'] },
  { id: 40, name: 'Matthew', aliases: ['matt', 'mt', 'mat'] },
  { id: 41, name: 'Mark', aliases: ['mk', 'mrk'] },
  { id: 42, name: 'Luke', aliases: ['lk', 'lu'] },
  { id: 43, name: 'John', aliases: ['jn', 'joh', 'jh'] },
  { id: 44, name: 'Acts', aliases: ['ac'] },
  { id: 45, name: 'Romans', aliases: ['rom', 'ro', 'rm'] },
  { id: 46, name: '1 Corinthians', aliases: ['1 cor', '1cor', '1 co', '1co'] },
  { id: 47, name: '2 Corinthians', aliases: ['2 cor', '2cor', '2 co', '2co'] },
  { id: 48, name: 'Galatians', aliases: ['gal', 'ga'] },
  { id: 49, name: 'Ephesians', aliases: ['eph', 'ep'] },
  { id: 50, name: 'Philippians', aliases: ['phil', 'php', 'pp'] },
  { id: 51, name: 'Colossians', aliases: ['col', 'cl'] },
  { id: 52, name: '1 Thessalonians', aliases: ['1 thess', '1thess', '1 thes', '1thes', '1 th', '1th'] },
  { id: 53, name: '2 Thessalonians', aliases: ['2 thess', '2thess', '2 thes', '2thes', '2 th', '2th'] },
  { id: 54, name: '1 Timothy', aliases: ['1 tim', '1tim', '1 ti', '1ti'] },
  { id: 55, name: '2 Timothy', aliases: ['2 tim', '2tim', '2 ti', '2ti'] },
  { id: 56, name: 'Titus', aliases: ['tit', 'ti'] },
  { id: 57, name: 'Philemon', aliases: ['phlm', 'phm', 'pm'] },
  { id: 58, name: 'Hebrews', aliases: ['heb', 'he'] },
  { id: 59, name: 'James', aliases: ['jas', 'ja', 'jm'] },
  { id: 60, name: '1 Peter', aliases: ['1 pet', '1pet', '1 pe', '1pe', '1 pt', '1pt'] },
  { id: 61, name: '2 Peter', aliases: ['2 pet', '2pet', '2 pe', '2pe', '2 pt', '2pt'] },
  { id: 62, name: '1 John', aliases: ['1 jn', '1jn', '1 jo', '1jo', '1 jh', '1jh'] },
  { id: 63, name: '2 John', aliases: ['2 jn', '2jn', '2 jo', '2jo', '2 jh', '2jh'] },
  { id: 64, name: '3 John', aliases: ['3 jn', '3jn', '3 jo', '3jo', '3 jh', '3jh'] },
  { id: 65, name: 'Jude', aliases: ['jud', 'jd'] },
  { id: 66, name: 'Revelation', aliases: ['rev', 're', 'rv', 'apoc'] },
];

function normalizeBookKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveBookId(
  rawBook: string,
  booksProp: Book[],
  canon: CanonBook[]
): { id: number; name: string } | null {
  const key = normalizeBookKey(rawBook);
  if (!key) return null;
  // 1) books prop — full name, Luganda name, abbreviations
  for (const b of booksProp) {
    const candidates = [
      b.name_english,
      b.name_luganda,
      b.abbreviation_english,
      b.abbreviation_luganda,
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      if (normalizeBookKey(c) === key) {
        return { id: b.book_number ?? b.id, name: b.name_english };
      }
    }
  }
  // 2) canon — full name then aliases, longest match wins
  //    (so "1 John" beats "John", "Song of Solomon" beats "Song")
  const sorted = [...canon].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    if (normalizeBookKey(c.name) === key) return { id: c.id, name: c.name };
  }
  for (const c of sorted) {
    if (c.aliases.some((a) => normalizeBookKey(a) === key)) return { id: c.id, name: c.name };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  PARSER — paste once, expand to one row per verse                   */
/*                                                                     */
/*  Handles ALL of these:                                              */
/*    Romans 1:6                                                       */
/*    1 Corinthians 1:2                                                */
/*    John 17:11-12          -> 17:11, 17:12                          */
/*    John 8:1-5,6,7-8       -> 8:1,8:2,8:3,8:4,8:5,8:6,8:7,8:8       */
/*    Ex. 3:5    Jn 6:4      -> dotted / short names                   */
/*    Ps 23:1,3,6   (commas)  1 Jn 5:20-21  (ranges)                  */
/*    Multiple refs separated by ; or newline                          */
/*    Same book repeated: John 8:1-5; John 8:6  (each chunk re-parsed)*/
/*    Bare continuation: John 8:1-5; 6:1   -> 6:1 uses last book      */
/* ------------------------------------------------------------------ */

export type ParsedRef = {
  target_book_id: number;
  target_book_name: string;
  target_chapter: number;
  target_verse: number;
  label: string;
};

export type ParseResult = {
  refs: ParsedRef[];
  errors: string[];
};

function expandVerseList(list: string): number[] {
  const out: number[] = [];
  for (const part of list.split(',')) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      if (end < start) { out.push(start); continue; }
      for (let v = start; v <= end; v++) out.push(v);
    } else if (/^\d+$/.test(p)) {
      out.push(parseInt(p, 10));
    }
  }
  return out;
}

export function parseCrossReferences(
  input: string,
  booksProp: Book[] = [],
  canon: CanonBook[] = CANON
): ParseResult {
  const refs: ParsedRef[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let lastBook: { id: number; name: string } | null = null;

  // Split on ; or newline. Commas are KEPT — they belong to verse lists.
  const chunks = input.split(/[;\n]+/);
  for (const rawChunk of chunks) {
    const chunk = rawChunk.trim().replace(/\s+/g, ' ');
    if (!chunk) continue;

    // Match: [book part] chapter : verse-list
    // Book part may contain a leading number (1 John) and dots (Ex.)
    // Chapter:verse-list is the LAST colon group, e.g. "John 8:1-5,6,7-8"
    const m = chunk.match(/^(.+?)\s+(\d+)\s*:\s*([\d\s,\-]+)$/);
    if (!m) {
      // Bare continuation "6:1" or "6:1-3,5" with no book — reuse last book
      const bare = chunk.match(/^(\d+)\s*:\s*([\d\s,\-]+)$/);
      if (bare && lastBook) {
        const chapter = parseInt(bare[1], 10);
        for (const v of expandVerseList(bare[2])) {
          const key = `${lastBook.id}:${chapter}:${v}`;
          if (seen.has(key)) continue;
          seen.add(key);
          refs.push({ target_book_id: lastBook.id, target_book_name: lastBook.name, target_chapter: chapter, target_verse: v, label: `${lastBook.name} ${chapter}:${v}` });
        }
        continue;
      }
      errors.push(`Could not understand: "${chunk}"`);
      continue;
    }

    const bookPart = m[1].trim();
    const chapter = parseInt(m[2], 10);
    const verseList = m[3];
    const resolved = resolveBookId(bookPart, booksProp, canon);
    if (!resolved) {
      errors.push(`Unknown book: "${bookPart}" in "${chunk}"`);
      continue;
    }
    lastBook = resolved;
    const verses = expandVerseList(verseList);
    if (verses.length === 0) {
      errors.push(`No verses found in: "${chunk}"`);
      continue;
    }
    for (const v of verses) {
      const key = `${resolved.id}:${chapter}:${v}`;
      if (seen.has(key)) continue; // de-dupe within one paste
      seen.add(key);
      refs.push({ target_book_id: resolved.id, target_book_name: resolved.name, target_chapter: chapter, target_verse: v, label: `${resolved.name} ${chapter}:${v}` });
    }
  }
  return { refs, errors };
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                        */
/* ------------------------------------------------------------------ */

export default function CrossReferenceModal({
  isOpen,
  onClose,
  sourceBookId,
  sourceChapter,
  sourceVerse,
  sourceBookName,
  books = [],
  theme = 'light',
  onRefresh
}: CrossReferenceModalProps) {
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookNames, setBookNames] = useState<Record<number, string>>({});
  const { popup, openVerse, closePopup } = useScripturePopup();

  // ---- Add form ----
  const [showAdd, setShowAdd] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [relationshipType, setRelationshipType] = useState('related');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCrossReferences();
      setShowAdd(false);
      setPasteText('');
      setNotes('');
      setSaveMessage('');
    }
  }, [isOpen, sourceBookId, sourceChapter, sourceVerse]);

  const fetchCrossReferences = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/cross-references?bookId=${sourceBookId}&chapter=${sourceChapter}&verse=${sourceVerse}`
      );
      const data = await response.json();
      const refs = Array.isArray(data) ? data : [];
      setCrossRefs(refs);
      const namesMap: Record<number, string> = {};
      refs.forEach((r: CrossReference) => {
        if (r.target_book_id && r.target_book_name) {
          namesMap[r.target_book_id] = r.target_book_name;
        }
      });
      setBookNames(namesMap);
    } catch (err) {
      setError('Failed to fetch cross-references');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTargetBookName = (bookId: number, ref?: CrossReference) => {
    return ref?.target_book_name || bookNames[bookId] || `Book ${bookId}`;
  };

  // Live preview of what the paste will save — before any POST
  const preview = useMemo(
    () => parseCrossReferences(pasteText, books),
    [pasteText, books]
  );

  const handleAdd = async () => {
    if (preview.refs.length === 0) return;
    setSaving(true);
    setSaveMessage('');
    setError('');
    const failed: string[] = [];
    let saved = 0;
    for (const r of preview.refs) {
      try {
        const res = await fetch('/api/cross-references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_book_id: sourceBookId,
            source_chapter: sourceChapter,
            source_verse: sourceVerse,
            target_book_id: r.target_book_id,
            target_chapter: r.target_chapter,
            target_verse: r.target_verse,
            relationship_type: relationshipType,
            notes: notes.trim(),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          failed.push(`${r.label} — ${body.error || res.statusText}`);
        } else saved++;
      } catch (e) {
        failed.push(`${r.label} — network error`);
      }
    }
    setSaving(false);
    if (failed.length > 0) {
      setError(`Saved ${saved}, failed ${failed.length}: ${failed.join(' | ')}`);
    } else {
      setSaveMessage(`✅ Saved ${saved} cross-reference${saved === 1 ? '' : 's'}.`);
    }
    setPasteText('');
    await fetchCrossReferences();
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (ref: CrossReference) => {
    if (!ref.id) return;
    if (!confirm(`Delete cross-reference ${getTargetBookName(ref.target_book_id, ref)} ${ref.target_chapter}:${ref.target_verse}?`)) return;
    try {
      const res = await fetch(`/api/cross-references?id=${ref.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchCrossReferences();
      if (onRefresh) onRefresh();
    } catch (e) {
      setError('Failed to delete cross-reference');
    }
  };

  const getBackgroundClass = () => {
    if (theme === 'sepia') return 'bg-yellow-50';
    if (theme === 'dark') return 'bg-gray-900';
    return 'bg-white';
  };

  const getModalBackgroundClass = () => {
    if (theme === 'sepia') return 'bg-yellow-50/95';
    if (theme === 'dark') return 'bg-gray-800/95';
    return 'bg-white/95';
  };

  const getBorderClass = () => {
    if (theme === 'sepia') return 'border-yellow-300';
    if (theme === 'dark') return 'border-gray-700';
    return 'border-gray-200';
  };

  const getTextClass = () => {
    if (theme === 'dark') return 'text-gray-100';
    if (theme === 'sepia') return 'text-yellow-900';
    return 'text-gray-900';
  };

  const getSecondaryTextClass = () => {
    if (theme === 'dark') return 'text-gray-400';
    if (theme === 'sepia') return 'text-yellow-700';
    return 'text-gray-600';
  };

  const stripHtml = (text: string | undefined): string => {
    if (!text) return '';
    return text
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getVerseDisplay = (ref: CrossReference): { primary: string; secondary?: string } => {
    const luganda = stripHtml(ref.text_luganda);
    const english = stripHtml(ref.text_english);
    if (english && luganda && luganda !== english) {
      return { primary: english, secondary: luganda };
    }
    if (english) return { primary: english };
    if (luganda) return { primary: luganda };
    return { primary: '' };
  };

  if (!isOpen) return null;

  const inputClass = theme === 'dark'
    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
    : theme === 'sepia'
    ? 'bg-white border-yellow-300 text-yellow-900 placeholder-yellow-600'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${getModalBackgroundClass()} border ${getBorderClass()} rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-sm`}>
        {/* Header */}
        <div className={`border-b ${getBorderClass()} p-6 flex items-center justify-between flex-shrink-0`}>
          <h2 className={`text-2xl font-bold ${getTextClass()}`}>
            📖 {sourceBookName} {sourceChapter}:{sourceVerse}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : theme === 'sepia' ? 'bg-yellow-200 hover:bg-yellow-300' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 mb-6">
              ❌ {error}
            </div>
          )}
          {saveMessage && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 mb-6">
              {saveMessage}
            </div>
          )}

          {/* ---- ADD CROSS-REFERENCES ---- */}
          <div className={`mb-6 rounded-lg border ${getBorderClass()} p-4`}>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className={`flex items-center gap-2 font-semibold ${getTextClass()}`}
            >
              <Plus className="h-4 w-4" />
              {showAdd ? 'Hide add form' : '＋ Add cross-references'}
            </button>
            {showAdd && (
              <div className="mt-4 space-y-3">
                <p className={`text-sm ${getSecondaryTextClass()}`}>
                  Paste one or many. Separate references with <strong>;</strong> or a new line.
                  Ranges and comma-lists expand automatically. Full names or short names both work.
                </p>
                <div className={`text-xs rounded p-3 ${theme === 'dark' ? 'bg-gray-700/60 text-gray-300' : theme === 'sepia' ? 'bg-yellow-100/70 text-yellow-800' : 'bg-blue-50 text-blue-800'}`}>
                  Example: <span className="font-mono">Romans 1:6; 1 Corinthians 1:2; John 17:11-12; John 8:1-5,6,7-8; Ex. 3:5; Jn 6:4</span>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  placeholder={'Romans 1:6; 1 Corinthians 1:2; John 17:11-12; John 8:1-5,6,7-8; Ex. 3:5; Jn 6:4'}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}`}
                />
                <div className="flex flex-wrap gap-3">
                  <label className={`text-sm ${getSecondaryTextClass()}`}>
                    Type:{' '}
                    <select
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className={`rounded-lg border px-2 py-1 text-sm ${inputClass}`}
                    >
                      <option value="related">Related</option>
                      <option value="parallel">Parallel</option>
                      <option value="quotation">Quotation</option>
                      <option value="prophecy">Prophecy / Fulfilment</option>
                      <option value="contrast">Contrast</option>
                    </select>
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional note (applies to all pasted refs)"
                    className={`flex-1 min-w-[200px] rounded-lg border px-3 py-1 text-sm ${inputClass}`}
                  />
                </div>

                {/* Live preview */}
                {pasteText.trim() && (
                  <div className={`text-sm space-y-1 ${getTextClass()}`}>
                    <p>
                      Will save <strong>{preview.refs.length}</strong> verse{preview.refs.length === 1 ? '' : 's'}
                      {preview.refs.length > 0 && (
                        <span className={getSecondaryTextClass()}> — {preview.refs.map((r) => r.label).join(', ')}</span>
                      )}
                    </p>
                    {preview.errors.length > 0 && (
                      <div className="text-red-600">
                        {preview.errors.map((e, i) => (
                          <p key={i}>⚠️ {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleAdd}
                  disabled={saving || preview.refs.length === 0}
                  className="px-5 py-2 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : `Save ${preview.refs.length} cross-reference${preview.refs.length === 1 ? '' : 's'}`}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className={`p-8 text-center ${getSecondaryTextClass()}`}>
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
              </div>
              <p className="mt-2">Loading cross-references...</p>
            </div>
          ) : crossRefs.length === 0 ? (
            <div className={`p-8 text-center italic ${getSecondaryTextClass()}`}>
              No cross-references added yet
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${getTextClass()} mb-4`}>
                Related Passages ({crossRefs.length})
              </h3>

              {crossRefs.map((ref, index) => (
                <div
                  key={ref.id ?? `${ref.target_book_id}-${ref.target_chapter}-${ref.target_verse}-${index}`}
                  className={`p-4 rounded-lg border-l-4 ${
                    theme === 'dark'
                      ? 'bg-gray-700/60 border-purple-500 hover:bg-gray-700/80'
                      : theme === 'sepia'
                      ? 'bg-yellow-100/60 border-yellow-600 hover:bg-yellow-100/80'
                      : 'bg-blue-50/60 border-blue-400 hover:bg-blue-50/80'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className={`font-bold text-lg ${getTextClass()}`}>
                      {getTargetBookName(ref.target_book_id, ref)} {ref.target_chapter}:{ref.target_verse}
                    </p>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bible-reader/${ref.target_book_number ?? ref.target_book_id}/${ref.target_chapter}?verse=${ref.target_verse}`}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          theme === 'dark' ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : theme === 'sepia' ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title="Open this verse"
                        onClick={onClose}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Read
                      </Link>
                      {ref.id && (
                        <button
                          onClick={() => handleDelete(ref)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                            theme === 'dark' ? 'bg-red-900/60 text-red-300 hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title="Delete this cross-reference"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const { primary, secondary } = getVerseDisplay(ref);
                    return primary ? (
                      <div className="space-y-1 mb-3">
                        <p className={`${getTextClass()} leading-relaxed text-base font-medium`}>
                          {primary}
                        </p>
                        {secondary && (
                          <p className={`${getSecondaryTextClass()} leading-relaxed text-sm italic mt-1`}>
                            {secondary}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className={`${getSecondaryTextClass()} text-sm italic mb-3`}>
                        Verse text not available
                      </p>
                    );
                  })()}

                  {(ref.relationship_type || ref.notes) && (
                    <div className={`text-sm space-y-1 pt-2 border-t ${getBorderClass()}`}>
                      {ref.relationship_type && (
                        <p className={getSecondaryTextClass()}>
                          <span className="font-semibold">Type:</span> <span className="capitalize">{ref.relationship_type}</span>
                        </p>
                      )}
                      {ref.notes && (
                        <p className={`${getSecondaryTextClass()} italic`}>
                          <span className="font-semibold">Note:</span>{' '}
                          <ScriptureText text={ref.notes} onVerseClick={openVerse} />
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t ${getBorderClass()} p-6 flex justify-end gap-3 flex-shrink-0`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                : theme === 'sepia'
                ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Close
          </button>
        </div>
      </div>
      <ScriptureVersePopup popup={popup} onClose={closePopup} />
    </div>
  );
}
