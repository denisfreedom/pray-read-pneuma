"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// app/components/ReadingPlanChapterTracker.tsx
// The Bible reader's reading-plan pieces — progress itself still lives ONLY in
// the Dashboard + Reading Plan pages. This file only shows two small things:
//
// 1) <ReadingPlanChapterIndicator/> — a slim GREEN strip on the chapter being
//    read. It tells the reader "this chapter is part of your plan" so a plan
//    chapter looks different from opening a chapter as normal reading.
//    If the chapter is in NO plan, it renders nothing — normal reading stays
//    exactly as it was.
//
// 2) <ReadingPlanChapterFooter/> — sits BELOW the chapter (after the last verse
//    / closing prayer). The Mark Complete button appears ONLY on the LAST
//    chapter of that day's reading. Example: Day 3 = Genesis 5–6, so Genesis 5
//    shows "Day 3 continues — next: Genesis 6" and Genesis 6 shows the button.
//    Marking here writes to the SAME progress store the Dashboard and the
//    Reading Plan page read, so all three update together.
//
// NO auto-marking. Nothing is marked until the reader taps the button.
type Reading = { book_number: number; chapter: number };
type Match = {
  plan_id: number; plan_title: string; day_number: number; day_label: string;
  total_days: number; completed_days: number; completed: boolean; day_done: boolean;
  current_day: number; pct: number;
  day_readings: Reading[]; day_chapter_index: number; day_chapter_count: number;
  is_last_chapter_of_day: boolean; next_chapter: Reading | null;
};

const BOOK_NAMES = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
const bookName = (n: number) => BOOK_NAMES[n - 1] || `Book ${n}`;

// "Genesis 5–6" for one book, "Genesis 5 → Exodus 1–2" across books.
function dayRangeLabel(readings: Reading[]): string {
  if (!readings.length) return '';
  const parts: string[] = [];
  let start = readings[0];
  let prev = readings[0];
  const flush = () => {
    parts.push(start.chapter === prev.chapter
      ? `${bookName(start.book_number)} ${start.chapter}`
      : `${bookName(start.book_number)} ${start.chapter}–${prev.chapter}`);
  };
  for (let i = 1; i < readings.length; i++) {
    const r = readings[i];
    if (r.book_number === prev.book_number && r.chapter === prev.chapter + 1) { prev = r; continue; }
    flush(); start = r; prev = r;
  }
  flush();
  return parts.join(' → ');
}

function usePlanMatch(bookNumber: number, chapter: number) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    let em: string | null = null;
    try {
      const r = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (d?.success && d.user?.email) em = String(d.user.email).toLowerCase();
    } catch { /* not logged in */ }
    if (!em) { try { em = localStorage.getItem('userEmail'); } catch { /* ignore */ } }
    setEmail(em);
    try {
      const q = em ? `&userEmail=${encodeURIComponent(em)}` : '';
      const res = await fetch(`/api/reading-plans/by-chapter?book=${bookNumber}&chapter=${chapter}${q}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (data?.success) setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch { setMatches([]); }
  }, [bookNumber, chapter]);

  useEffect(() => { setMatches(null); load(); }, [load]);

  // Primary = the plan the user already started (has progress, this day not
  // done), else the most specific plan (fewest days). Other matching plans
  // are listed as a note — opening Genesis 1 must not silently start
  // Bible-in-a-Year.
  const primary = matches && matches.length
    ? (matches.find((m) => m.completed_days > 0 && !m.day_done) || matches[0])
    : null;
  const others = matches ? matches.filter((m) => primary && m.plan_id !== primary.plan_id) : [];
  return { matches, primary, others, email, load };
}

async function toggleDay(email: string, m: Match, done: boolean) {
  await fetch('/api/reading-plans/progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail: email, planId: m.plan_id, dayNumber: m.day_number, completed: done }),
  });
}

// ── 1) TOP: slim green indicator on the chapter ─────────────────────────────
export function ReadingPlanChapterIndicator({ bookNumber, chapter }: { bookNumber: number; chapter: number }) {
  const { primary, others } = usePlanMatch(bookNumber, chapter);
  if (!primary) return null;
  const m = primary;
  const range = dayRangeLabel(m.day_readings);
  return (
    <div className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 mb-4 flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-800">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        📖 Reading Plan: {m.plan_title} · {m.day_label || `Day ${m.day_number}`} of {m.total_days}
      </span>
      <span className="text-[12px] font-semibold text-emerald-700">
        {m.day_done
          ? `✓ ${m.day_label || `Day ${m.day_number}`} complete`
          : range
            ? `Today: ${range} · Chapter ${m.day_chapter_index} of ${m.day_chapter_count}`
            : `Chapter ${m.day_chapter_index} of ${m.day_chapter_count} of today's reading`}
      </span>
      <div className="flex-1 min-w-[80px] h-1.5 bg-emerald-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${m.day_done ? 100 : Math.round((m.day_chapter_index / Math.max(m.day_chapter_count, 1)) * 100)}%` }} />
      </div>
      {others.length > 0 && (
        <span className="text-[11px] font-semibold text-emerald-600">Also in: {others.map((o) => `${o.plan_title} (Day ${o.day_number})`).join(' · ')}</span>
      )}
    </div>
  );
}

// ── 2) BOTTOM: Mark Complete, only at the end of the day's reading ──────────
export function ReadingPlanChapterFooter({ bookNumber, chapter }: { bookNumber: number; chapter: number }) {
  const { primary, email, load } = usePlanMatch(bookNumber, chapter);
  const [saving, setSaving] = useState(false);
  const [justMarked, setJustMarked] = useState(false);
  if (!primary) return null;
  const m = primary;
  const range = dayRangeLabel(m.day_readings);

  const onToggle = async (done: boolean) => {
    if (!email || saving) return;
    setSaving(true);
    try {
      await toggleDay(email, m, done);
      setJustMarked(done);
      if (done) setTimeout(() => setJustMarked(false), 6000);
      await load();
    } catch { await load(); }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-5">
      {/* Day already done — green, with undo */}
      {m.day_done ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="text-[15px] font-bold text-emerald-800">✓ {m.day_label || `Day ${m.day_number}`} complete — {range}</p>
          <p className="text-[12.5px] font-semibold text-emerald-700 mt-1">
            {justMarked ? 'Saved — your Reading Plan and Dashboard are updated.' : `You are on Day ${m.current_day} of ${m.total_days} · ${m.pct}% done.`}
          </p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button onClick={() => onToggle(false)} disabled={saving} className="px-5 py-2.5 rounded-full bg-white border border-emerald-400 text-emerald-800 text-[13px] font-bold hover:bg-emerald-100 transition disabled:opacity-50">
              Undo — mark Day {m.day_number} not done
            </button>
            <Link href={`/reading-plans/${m.plan_id}`} className="text-[13px] font-bold text-emerald-800 hover:underline">View plan →</Link>
            <Link href="/dashboard" className="text-[13px] font-bold text-emerald-800 hover:underline">Dashboard →</Link>
          </div>
        </div>
      ) : m.is_last_chapter_of_day ? (
        /* LAST chapter of the day — the button lives here, and only here */
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-sm">
          <p className="text-[15px] font-bold text-emerald-900">📖 End of {m.day_label || `Day ${m.day_number}`} — {range}</p>
          <p className="text-[13px] font-semibold text-emerald-800 mt-1">
            You have reached the end of today's reading. Tap below to mark it complete — your Reading Plan and Dashboard update together.
          </p>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {email ? (
              <button onClick={() => onToggle(true)} disabled={saving} className="px-6 py-3 rounded-full bg-emerald-600 text-white text-[14px] font-bold hover:bg-emerald-700 transition disabled:opacity-50 shadow">
                {saving ? 'Saving…' : `✓ Mark ${m.day_label || `Day ${m.day_number}`} complete`}
              </button>
            ) : (
              <Link href="/user-login" className="px-6 py-3 rounded-full bg-emerald-600 text-white text-[14px] font-bold hover:bg-emerald-700 transition shadow">Log in to mark complete</Link>
            )}
            <Link href={`/reading-plans/${m.plan_id}`} className="text-[13px] font-bold text-emerald-800 hover:underline">View plan →</Link>
          </div>
        </div>
      ) : (
        /* NOT the last chapter — no button yet, just the way forward */
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[14px] font-bold text-amber-900">
            📖 {m.day_label || `Day ${m.day_number}`} continues — {range} · Chapter {m.day_chapter_index} of {m.day_chapter_count}
          </p>
          <p className="text-[12.5px] font-semibold text-amber-800 mt-1">
            {m.next_chapter
              ? `Next: ${bookName(m.next_chapter.book_number)} ${m.next_chapter.chapter}. The Mark Complete button appears at the end of ${bookName(m.day_readings[m.day_readings.length - 1].book_number)} ${m.day_readings[m.day_readings.length - 1].chapter}.`
              : 'The Mark Complete button appears at the end of today\'s last chapter.'}
          </p>
          {m.next_chapter && (
            <Link href={`/bible-reader/${m.next_chapter.book_number}/${m.next_chapter.chapter}`} className="inline-block mt-3 px-5 py-2.5 rounded-full bg-amber-500 text-white text-[13px] font-bold hover:bg-amber-600 transition">
              Continue to {bookName(m.next_chapter.book_number)} {m.next_chapter.chapter} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
