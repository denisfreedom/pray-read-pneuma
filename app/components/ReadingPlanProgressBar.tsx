"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Bell } from 'lucide-react';

// app/components/ReadingPlanProgressBar.tsx
// Mount this in the Bible reader chapter page (see mount instructions).
// It answers, for the chapter on screen:
//   "Am I on a reading plan? Which day is this? Have I done it?"
// - Shows every plan containing this chapter, most specific first.
// - The PRIMARY plan (the one the user already started, else the most
//   specific) auto-marks its day after 45s of visible reading time.
//   Tab hidden = timer paused. One tap undoes it.
// - Other plans get a manual "Mark" button only — opening Romans 1 must not
//   silently start Bible-in-a-Year.
// - Not logged in: shows the plan context + a login link, marks nothing.
// - If the chapter is in no plan, renders nothing.
type Match = {
  plan_id: number; plan_title: string; day_number: number; day_label: string;
  total_days: number; completed_days: number; completed: boolean; day_done: boolean;
  current_day: number; pct: number;
};

const AUTO_MARK_SECONDS = 45;

export default function ReadingPlanProgressBar({ bookNumber, chapter }: { bookNumber: number; chapter: number }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [justMarked, setJustMarked] = useState<number | null>(null);
  const secondsRef = useRef(0);
  const autoFiredRef = useRef(false);

  const load = useCallback(async () => {
    let em: string | null = null;
    try {
      const r = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (d?.success && d.user?.email) em = String(d.user.email).toLowerCase();
    } catch { /* not logged in */ }
    if (!em) {
      try { em = localStorage.getItem('userEmail'); } catch { /* ignore */ }
    }
    setEmail(em);
    try {
      const q = em ? `&userEmail=${encodeURIComponent(em)}` : '';
      const res = await fetch(`/api/reading-plans/by-chapter?book=${bookNumber}&chapter=${chapter}${q}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (data?.success) setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch { setMatches([]); }
  }, [bookNumber, chapter]);

  useEffect(() => {
    setMatches(null);
    secondsRef.current = 0;
    autoFiredRef.current = false;
    setJustMarked(null);
    load();
  }, [load]);

  // Primary plan = one the user already started (has progress, this day not
  // done), else the most specific plan (fewest days).
  const primary = matches && matches.length
    ? (matches.find((m) => m.completed_days > 0 && !m.day_done) || matches[0])
    : null;

  const toggleDay = useCallback(async (m: Match, done: boolean) => {
    if (!email) return;
    setSaving(m.plan_id);
    // Optimistic update
    setMatches((prev) => prev?.map((x) => {
      if (x.plan_id !== m.plan_id) return x;
      const completedDays = Math.max(0, x.completed_days + (done ? 1 : -1));
      const completed = x.total_days > 0 && completedDays >= x.total_days;
      return { ...x, day_done: done, completed_days: completedDays, completed, pct: x.total_days > 0 ? Math.round((completedDays / x.total_days) * 100) : 0 };
    }) ?? null);
    try {
      await fetch('/api/reading-plans/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, planId: m.plan_id, dayNumber: m.day_number, completed: done }),
      });
      if (done) {
        setJustMarked(m.plan_id);
        setTimeout(() => setJustMarked(null), 6000);
      }
    } catch { await load(); }
    finally { setSaving(null); }
  }, [email, load]);

  // Auto-mark the PRIMARY plan's day after 45s of visible reading.
  useEffect(() => {
    if (!primary || !email || primary.day_done || autoFiredRef.current) return;
    // Never auto-mark a day the user already passed (catch-up reads) — only
    // the plan's current day, so re-reading an old chapter doesn't move it.
    if (primary.day_number !== primary.current_day) return;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      secondsRef.current += 1;
      if (secondsRef.current >= AUTO_MARK_SECONDS) {
        autoFiredRef.current = true;
        clearInterval(id);
        toggleDay(primary, true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [primary, email, toggleDay]);

  if (!matches || matches.length === 0) return null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={17} className="text-violet-700 shrink-0" />
        <p className="text-sm font-bold text-slate-900">Your Reading Plan</p>
        {justMarked && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Marked — dashboard updated live</span>}
      </div>

      <div className="space-y-3">
        {matches.map((m) => {
          const isPrimary = primary?.plan_id === m.plan_id;
          return (
            <div key={m.plan_id} className="bg-white rounded-xl border border-violet-100 p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {m.day_label || `Day ${m.day_number}`} of{' '}
                    <Link href={`/reading-plans/${m.plan_id}`} className="text-violet-700 hover:underline">{m.plan_title}</Link>
                    {isPrimary && !m.day_done && <span className="ml-2 text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">THIS CHAPTER</span>}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {m.completed
                      ? '✅ Plan complete'
                      : m.completed_days > 0
                        ? `You are on Day ${m.current_day} of ${m.total_days} · ${m.completed_days} days done`
                        : `Not started yet — this chapter is Day ${m.day_number} of ${m.total_days}`}
                  </p>
                </div>
                <span className="text-[11px] font-black bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full shrink-0">{m.pct}%</span>
              </div>

              <div className="h-1.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all" style={{ width: `${m.pct}%` }} />
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {email ? (
                  m.day_done ? (
                    <button
                      onClick={() => toggleDay(m, false)}
                      disabled={saving === m.plan_id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> ✓ Day {m.day_number} complete — tap to undo
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleDay(m, true)}
                      disabled={saving === m.plan_id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition disabled:opacity-50"
                    >
                      Mark Day {m.day_number} complete
                    </button>
                  )
                ) : (
                  <Link href="/user-login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition">
                    Log in to track this plan
                  </Link>
                )}
                <Link href={`/reading-plans/${m.plan_id}`} className="text-xs font-bold text-violet-700 hover:underline">View plan →</Link>
                {isPrimary && !m.day_done && email && (
                  <span className="text-[11px] text-slate-400 font-semibold inline-flex items-center gap-1">
                    <Bell size={12} /> Auto-marks after {AUTO_MARK_SECONDS}s of reading
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
