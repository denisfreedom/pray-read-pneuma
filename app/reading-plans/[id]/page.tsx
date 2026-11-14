"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock, Bell, BellOff, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { useThemeStore } from '@/lib/theme-store';
import ReadingReminder from '@/app/components/ReadingReminder';

// app/reading-plans/[id]/page.tsx — plan detail: day-by-day readings,
// mark days complete, per-book finished badges, plan completion, reminders.
type Day = { day_number: number; readings: { book_number: number; book_name: string; chapter: number }[]; label: string };
type Summary = {
  plan_id: number; plan_title: string | null; total_days: number; completed_days: number;
  current_day: number; completed: boolean; pct: number;
  finished_books: { book_number: number; book_name: string; finished_at: string | null }[];
  completed_day_numbers: number[];
};

export default function ReadingPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = parseInt(String(params?.id ?? ''), 10);
  const [plan, setPlan] = useState<any>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  // Reminder state
  const [reminderTime, setReminderTime] = useState('07:00');
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>('default');
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const load = useCallback(async (userEmail: string | null) => {
    try {
      const q = userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : '';
      const res = await fetch(`/api/reading-plans/${planId}${q}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!data?.success) { setNotFound(true); return; }
      setPlan(data.plan);
      setDays(data.days || []);
      setSummary(data.summary || null);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    (async () => {
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
      if (typeof Notification !== 'undefined') setNotifPerm(Notification.permission);
      await load(em);
      if (em) {
        try {
          const rr = await fetch(`/api/reading-plans/reminders?userEmail=${encodeURIComponent(em)}&planId=${planId}`, { cache: 'no-store' });
          const rd = await rr.json().catch(() => null);
          if (rd?.success && rd.reminder) {
            setReminderTime(rd.reminder.reminder_time || '07:00');
            setReminderOn(!!rd.reminder.enabled);
          }
        } catch { /* no reminder yet */ }
      }
    })();
  }, [load, planId]);

  const toggleDay = async (dayNumber: number, done: boolean) => {
    if (!email) { router.push('/user-login'); return; }
    const wasDone = summary?.completed_day_numbers?.includes(dayNumber);
    if (wasDone === done) return;
    setSavingDay(dayNumber);
    // Optimistic update
    setSummary((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.completed_day_numbers);
      if (done) set.add(dayNumber); else set.delete(dayNumber);
      const arr = [...set].sort((a, b) => a - b);
      const completedDays = arr.length;
      const completed = prev.total_days > 0 && completedDays >= prev.total_days;
      return { ...prev, completed_day_numbers: arr, completed_days: completedDays, completed, current_day: completed ? prev.total_days : Math.min(completedDays + 1, Math.max(prev.total_days, 1)), pct: prev.total_days > 0 ? Math.round((completedDays / prev.total_days) * 100) : 0 };
    });
    try {
      const res = await fetch('/api/reading-plans/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, planId, dayNumber, completed: done }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success && data.summary) {
        setSummary(data.summary);
        if (data.plan_completed) setCelebrate('plan');
        else if (data.newly_finished_books?.length) setCelebrate(`book:${data.newly_finished_books[0].book_name}`);
        if (data.plan_completed || data.newly_finished_books?.length) {
          setTimeout(() => setCelebrate(null), 6000);
        }
      } else {
        await load(email);
      }
    } catch {
      await load(email);
    } finally {
      setSavingDay(null);
    }
  };

  const saveReminder = async (time: string, on: boolean) => {
    if (!email) { router.push('/user-login'); return; }
    try {
      await fetch('/api/reading-plans/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, planId, time, enabled: on }),
      });
      setReminderSaved(true);
      setTimeout(() => setReminderSaved(false), 2500);
    } catch { /* ignore */ }
  };

  const askNotifPermission = async () => {
    try {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
      if (p === 'granted') {
        new Notification('📖 Reminders on', { body: `We will remind you to read ${plan?.title || 'your plan'} every day.` });
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#06090f] text-[#f5ece0]' : 'bg-[#FDFBF6] text-[#1B2340]'}`}>
        <p className="text-sm text-[#B98A2F] animate-pulse">Loading your plan…</p>
      </div>
    );
  }
  if (notFound || !plan) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-6 text-center ${isDark ? 'bg-[#06090f] text-[#f5ece0]' : 'bg-[#FDFBF6] text-[#1B2340]'}`}>
        <BookOpen className="w-14 h-14 mb-4 text-[rgba(180,140,60,0.4)]" />
        <h1 className="font-serif text-2xl mb-2">Plan Not Found</h1>
        <p className="text-sm text-[#6B6455] mb-6">This reading plan does not exist.</p>
        <button onClick={() => router.push('/reading-plans')} className="px-8 py-3 rounded-2xl text-sm btn-gold">Back to Reading Plans</button>
      </div>
    );
  }

  const doneSet = new Set(summary?.completed_day_numbers || []);
  const totalDays = summary?.total_days ?? days.length;
  const pct = summary?.pct ?? 0;
  const finishedBooks = summary?.finished_books || [];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-[#06090f] via-[#0a0e17] to-[#08060e]' : 'bg-[#FDFBF6]'}`}>
      {/* Reminder engine — fires the browser notification at the chosen time */}
      {email && <ReadingReminder planId={planId} planTitle={plan.title} time={reminderTime} enabled={reminderOn} />}

      <header className={`glass-nav border-b ${isDark ? 'border-[rgba(180,140,60,0.15)]' : 'border-[#E8B84B]/30'}`}>
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => router.push('/reading-plans')} className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#f0c060]" />
            <span className={`font-serif text-xl font-semibold ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>Reading Plans</span>
          </button>
          <button onClick={() => router.back()} className="px-5 py-2.5 rounded-xl text-sm btn-ghost">← Back</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Celebration banner */}
        {celebrate && (
          <div className="mb-6 rounded-3xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(200,160,50,0.12))', border: '1px solid rgba(34,197,94,0.4)' }}>
            <Trophy className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className={`font-serif text-xl font-semibold ${isDark ? 'text-[#f0d890]' : 'text-[#1B2340]'}`}>
              {celebrate === 'plan' ? '🎉 Plan Complete!' : `🎉 You finished ${celebrate.replace('book:', '')}!`}
            </p>
            <p className={`text-sm ${isDark ? 'text-[rgba(220,200,155,0.7)]' : 'text-[#6B6455]'}`}>
              {celebrate === 'plan' ? 'You read every day of this plan. It is now marked complete on your dashboard.' : 'This book is now marked finished in your reading records and on your dashboard.'}
            </p>
          </div>
        )}

        {/* Plan header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{plan.icon || '📖'}</div>
          <h1 className={`font-serif text-4xl md:text-5xl mb-3 ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>{plan.title}</h1>
          <p className={`text-base max-w-2xl mx-auto leading-relaxed ${isDark ? 'text-[rgba(220,200,155,0.65)]' : 'text-[#6B6455]'}`}>{plan.description}</p>
          <p className={`text-xs mt-3 ${isDark ? 'text-[rgba(220,200,155,0.5)]' : 'text-[#9A927E]'}`}>
            <Clock className="inline w-3.5 h-3.5 mr-1 text-[#f0c060]" /> {totalDays} days
            {plan.first_book ? <> · Starts in {plan.first_book}</> : null}
          </p>
        </div>

        {/* Progress bar */}
        <div className="rounded-3xl p-6 mb-8" style={{ background: 'linear-gradient(135deg, rgba(200,160,50,0.08), rgba(180,140,60,0.04))', border: '1px solid rgba(180,140,60,0.2)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-semibold ${isDark ? 'text-[#f0d890]' : 'text-[#1B2340]'}`}>
              {summary?.completed ? '✅ Plan Complete' : `Day ${summary?.current_day ?? 1} of ${totalDays}`}
            </span>
            <span className="text-sm font-bold text-[#B98A2F]">{summary?.completed_days ?? 0} / {totalDays} days · {pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-[rgba(180,140,60,0.15)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#c9900a] to-[#f0c060] transition-all" style={{ width: `${pct}%` }} />
          </div>
          {!email && (
            <p className="text-xs mt-3 text-center">
              <Link href="/user-login" className="text-[#B98A2F] font-semibold underline">Log in</Link> to save your progress.
            </p>
          )}
        </div>

        {/* Finished books — marked finished in this plan's records + dashboard */}
        {finishedBooks.length > 0 && (
          <div className="rounded-3xl p-6 mb-8" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <h2 className={`font-serif text-xl font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-[#f0d890]' : 'text-[#1B2340]'}`}>
              <Sparkles className="w-5 h-5 text-green-500" /> Books You Have Finished
            </h2>
            <div className="flex flex-wrap gap-2">
              {finishedBooks.map((b) => (
                <span key={b.book_number} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.4)', color: '#16a34a' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {b.book_name} — Finished
                </span>
              ))}
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-[rgba(220,200,155,0.6)]' : 'text-[#6B6455]'}`}>
              These are marked finished in your reading plan records and show on your dashboard.
            </p>
          </div>
        )}

        {/* Reminder card */}
        <div className="rounded-3xl p-6 mb-8" style={{ background: 'linear-gradient(135deg, rgba(200,160,50,0.08), rgba(180,140,60,0.04))', border: '1px solid rgba(180,140,60,0.2)' }}>
          <h2 className={`font-serif text-xl font-semibold mb-1 flex items-center gap-2 ${isDark ? 'text-[#f0d890]' : 'text-[#1B2340]'}`}>
            {reminderOn ? <Bell className="w-5 h-5 text-[#f0c060]" /> : <BellOff className="w-5 h-5 text-[#9A927E]" />} Daily Reading Reminder
          </h2>
          <p className={`text-xs mb-4 ${isDark ? 'text-[rgba(220,200,155,0.6)]' : 'text-[#6B6455]'}`}>
            We will remind you to read this plan every day at the time you choose. Reminders appear while the site is open — keep a tab open or check your dashboard.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="time" value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${isDark ? 'bg-[#0a0e17] text-[#f5ece0] border-[rgba(180,140,60,0.25)]' : 'bg-white text-[#1B2340] border-[#E8B84B]/30'}`}
            />
            <button
              onClick={() => { const next = !reminderOn; setReminderOn(next); saveReminder(reminderTime, next); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${reminderOn ? 'bg-green-600 text-white' : 'bg-[rgba(180,140,60,0.15)] text-[#B98A2F] border border-[rgba(180,140,60,0.4)]'}`}
            >
              {reminderOn ? 'Reminder ON' : 'Turn Reminder ON'}
            </button>
            {reminderOn && (
              <button
                onClick={() => saveReminder(reminderTime, true)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold btn-ghost"
              >
                Save Time
              </button>
            )}
            {notifPerm !== 'granted' && (
              <button onClick={askNotifPermission} className="px-5 py-2.5 rounded-xl text-sm font-semibold btn-ghost">
                Allow Browser Notifications
              </button>
            )}
            {reminderSaved && <span className="text-xs font-bold text-green-600">✓ Reminder saved</span>}
          </div>
        </div>

        {/* Day list */}
        <h2 className={`font-serif text-2xl font-semibold mb-4 ${isDark ? 'text-[#f0d890]' : 'text-[#1B2340]'}`}>Daily Readings</h2>
        <div className="space-y-3">
          {days.map((day) => {
            const done = doneSet.has(day.day_number);
            const isCurrent = summary && !summary.completed && day.day_number === summary.current_day;
            return (
              <div
                key={day.day_number}
                className="flex items-center gap-4 rounded-2xl px-5 py-4"
                style={{
                  background: done ? 'rgba(34,197,94,0.07)' : isCurrent ? 'rgba(200,160,50,0.12)' : isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                  border: `1px solid ${done ? 'rgba(34,197,94,0.35)' : isCurrent ? 'rgba(200,160,50,0.5)' : 'rgba(180,140,60,0.18)'}`,
                }}
              >
                <button
                  onClick={() => toggleDay(day.day_number, !done)}
                  disabled={savingDay === day.day_number}
                  aria-label={`${done ? 'Unmark' : 'Mark'} day ${day.day_number} complete`}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition"
                  style={{ borderColor: done ? '#16a34a' : 'rgba(180,140,60,0.5)', background: done ? '#16a34a' : 'transparent' }}
                >
                  {done && <CheckCircle2 className="w-5 h-5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>
                    Day {day.day_number}
                    {isCurrent && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-[#f0c060] text-[#1B2340]">TODAY</span>}
                  </p>
                  <p className={`text-sm truncate ${done ? 'line-through opacity-60' : ''} ${isDark ? 'text-[rgba(220,200,155,0.7)]' : 'text-[#6B6455]'}`}>
                    {day.label || `Day ${day.day_number}`}
                  </p>
                </div>
                {day.readings.length > 0 && (
                  <Link
                    href={`/bible-reader/${day.readings[0].book_number}/${day.readings[0].chapter}`}
                    className="shrink-0 text-xs font-bold text-[#B98A2F] inline-flex items-center gap-1 hover:underline"
                  >
                    Read <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <button onClick={() => router.push('/reading-plans')} className="px-8 py-3 rounded-2xl text-sm btn-ghost">← All Reading Plans</button>
        </div>
      </main>

      <style jsx global>{`
        .glass-nav { background: ${isDark ? 'rgba(6,9,15,0.82)' : 'rgba(255, 255, 255, 0.9)'}; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .btn-gold { background: linear-gradient(135deg, #c9900a 0%, #f0c040 45%, #e0a820 80%, #c9900a 100%); background-size: 200% 100%; color: #0d0a02; font-weight: 700; letter-spacing: 0.04em; transition: all 0.4s cubic-bezier(.16,1,.3,1); box-shadow: 0 4px 24px rgba(200,150,10,0.35), 0 1px 0 rgba(255,220,80,0.5) inset; }
        .btn-gold:hover { background-position: 100% 0; transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 48px rgba(200,150,10,0.55), 0 1px 0 rgba(255,220,80,0.5) inset; }
        .btn-ghost { background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(200,160,50,0.05)'}; border: 1px solid rgba(200,160,50,0.35); color: ${isDark ? '#e0d0a8' : '#c9900a'}; font-weight: 500; letter-spacing: 0.03em; transition: all 0.3s ease; backdrop-filter: blur(10px); }
        .btn-ghost:hover { background: rgba(200,160,50,0.12); border-color: rgba(200,160,50,0.6); color: #b8860b; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(200,150,10,0.2); }
      `}</style>
    </div>
  );
}
