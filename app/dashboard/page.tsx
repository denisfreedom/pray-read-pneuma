"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Book, Users, MessageCircle, Heart, Calendar,
  TrendingUp, Bell, Bookmark, Clock, Flame,
  ExternalLink, Eye, RefreshCw, Music, HelpCircle,
  ChevronRight, Activity, Star, Zap, Download, Search, ArrowRight, Sparkles, Quote, LogOut, CheckCircle2, Trophy, BellRing
} from 'lucide-react';
import AppNavbar from '@/app/components/AppNavbar';
import NotificationManager from '@/app/components/NotificationManager';
import DownloadManager from '@/app/components/DownloadManager';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import SessionTracker from '@/app/components/SessionTracker';
import ReadingReminder from '@/app/components/ReadingReminder';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';
const BG_IMAGE = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/dashboard-bg_png.jpeg';

interface Activity { activity_type: string; book_name?: string | null; book_number?: number | null; chapter?: number | null; verse_number?: number | null; created_at: string; }
interface Stats { booksVisited: number; savedVerses: number; streak: number; daysActive: number; }
// New: shapes returned by /api/reading-plans/progress?stats=true and
// /api/reading-plans/reminders — the endpoints the new progress system owns.
interface PlanSummary {
  plan_id: number; plan_title: string | null; total_days: number;
  completed_days: number; completed: boolean; pct: number;
  finished_books: { book_number: number; book_name: string; finished_at: string | null }[];
}
interface FinishedBook { book_number: number; book_name: string; finished_at: string | null; plan_id: number; plan_title: string | null; }
interface PlanReminder { plan_id: number; reminder_time: string; enabled: boolean; }

const FEATURES = [
  { icon: BookOpen, title: 'Read Bible', description: 'English & Luganda', href: '/bible-reader', grad: 'from-blue-500 to-cyan-500', ring: 'hover:border-blue-300', chip: 'bg-blue-50 text-blue-700' },
  { icon: Heart, title: 'My Collections', description: 'Saved verses', href: '/verse-collections', grad: 'from-pink-500 to-rose-500', ring: 'hover:border-pink-300', chip: 'bg-pink-50 text-pink-700' },
  { icon: Book, title: 'Devotionals', description: 'Daily readings', href: '/devotional-plans', grad: 'from-orange-500 to-red-500', ring: 'hover:border-orange-300', chip: 'bg-orange-50 text-orange-700' },
  { icon: Calendar, title: 'Reading Plans', description: 'Structured study', href: '/reading-plans', grad: 'from-purple-500 to-violet-500', ring: 'hover:border-purple-300', chip: 'bg-purple-50 text-purple-700' },
  { icon: HelpCircle, title: 'Bible Q&A', description: 'Study questions', href: '/qa', grad: 'from-amber-500 to-yellow-500', ring: 'hover:border-amber-300', chip: 'bg-amber-50 text-amber-700' },
  { icon: Music, title: 'Verse Songs', description: 'Scripture music', href: '/verse-songs', grad: 'from-teal-500 to-emerald-500', ring: 'hover:border-teal-300', chip: 'bg-teal-50 text-teal-700' },
  { icon: MessageCircle, title: 'Community', description: 'Connect & discuss', href: '/community', grad: 'from-green-500 to-emerald-500', ring: 'hover:border-green-300', chip: 'bg-green-50 text-green-700' },
  { icon: Bell, title: 'Reminders', description: 'Daily alerts', href: '/reminders', grad: 'from-rose-500 to-pink-500', ring: 'hover:border-rose-300', chip: 'bg-rose-50 text-rose-700' },
];

const VERSES = [
  { text: 'Your word is a lamp to my feet and a light to my path.', ref: 'Psalm 119:105' },
  { text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you.', ref: 'Joshua 1:9' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
  { text: 'Trust in the LORD with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' },
  { text: 'The LORD is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
];

function getActivityIcon(type: string) {
  switch (type) {
    case 'verse_view': return <Eye className="w-4 h-4 text-blue-600" />;
    case 'prayer_view': case 'prayer_expanded': return <Heart className="w-4 h-4 text-purple-600" />;
    case 'bookmark': return <Bookmark className="w-4 h-4 text-pink-600" />;
    case 'book_visit': return <BookOpen className="w-4 h-4 text-cyan-600" />;
    case 'devotional_access': return <Flame className="w-4 h-4 text-orange-600" />;
    default: return <Clock className="w-4 h-4 text-slate-400" />;
  }
}
function getActivityLabel(a: Activity) {
  const ref = a.book_name ? `${a.book_name}${a.chapter ? ` ${a.chapter}:${a.verse_number ?? ''}`.trimEnd() : ''}` : '';
  switch (a.activity_type) {
    case 'verse_view': return `Read ${ref}`;
    case 'prayer_view': return `Prayed in ${ref}`;
    case 'prayer_expanded': return `Prayer — ${ref}`;
    case 'bookmark': return `Saved ${ref}`;
    case 'book_visit': return `Visited ${ref || a.book_name || 'a book'}`;
    case 'devotional_access': return `Devotional — ${a.book_name || 'Daily reading'}`;
    default: return 'Activity recorded';
  }
}
function getActivityLink(a: Activity) {
  if (a.activity_type === 'devotional_access') return '/devotional-plans';
  if (a.book_number && a.chapter) return `/bible-reader/${a.book_number}/${a.chapter}${a.verse_number ? `#verse-${a.verse_number}` : ''}`;
  return null;
}
function formatTime(dateStr: string) {
  const t = new Date(dateStr).getTime(); if (Number.isNaN(t)) return '';
  const secs = Math.floor((Date.now() - t) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({ booksVisited: 0, savedVerses: 0, streak: 0, daysActive: 0 });
  const [showDownloadManager, setShowDownloadManager] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  // ── NEW: live reading-plan progress (wired to /api/reading-plans/progress) ──
  const [planSummaries, setPlanSummaries] = useState<PlanSummary[]>([]);
  const [finishedBooks, setFinishedBooks] = useState<FinishedBook[]>([]);
  const [completedPlans, setCompletedPlans] = useState<PlanSummary[]>([]);
  const [planReminders, setPlanReminders] = useState<PlanReminder[]>([]);
  const [readingLoading, setReadingLoading] = useState(true);
  const [readingUpdatedAt, setReadingUpdatedAt] = useState<Date | null>(null);

  // FIX 1: never call router.push during render / in a half-finished session check.
  // Use a cancelled flag + replace (so Back does not return to a dead dashboard).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.success || !data.isUser) { router.replace('/user-login'); return; }
        setUser(data.user);
      } catch { if (!cancelled) router.replace('/user-login'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // FIX 2: one failing API must not wipe the other two. Use allSettled + per-endpoint guards.
  const loadData = useCallback(async (email: string) => {
    setActivityLoading(true); setLoadError('');
    try {
      const [act, stat, dev] = await Promise.allSettled([
        fetch(`/api/activity-log?userEmail=${encodeURIComponent(email)}&limit=30`, { cache: 'no-store' }),
        fetch(`/api/user-activity?userEmail=${encodeURIComponent(email)}`, { cache: 'no-store' }),
        fetch(`/api/user-devotional-progress?userEmail=${encodeURIComponent(email)}&stats=true`, { cache: 'no-store' }),
      ]);
      const read = async (r: PromiseSettledResult<Response>) => {
        if (r.status !== 'fulfilled' || !r.value.ok) return null;
        try { return await r.value.json(); } catch { return null; }
      };
      const [actData, statData, devData] = await Promise.all([read(act), read(stat), read(dev)]);
      if (actData?.success) setActivities(Array.isArray(actData.activities) ? actData.activities : []);
      else if (actData) setActivities([]);
      setStats({
        booksVisited: statData?.success ? (statData.visitedBooks?.length || 0) : 0,
        savedVerses: statData?.success ? (Number(statData.bookmarkCount) || 0) : 0,
        streak: devData?.success ? (devData.currentStreak || 0) : 0,
        daysActive: statData?.success ? (statData.stats?.days_active || 0) : 0,
      });
      if (!actData && !statData && !devData) setLoadError('Could not load your activity. Check your connection and tap Refresh.');
    } catch { setLoadError('Could not load your activity. Check your connection and tap Refresh.'); }
    finally { setActivityLoading(false); }
  }, []);

  // NEW: live reading-plan progress. Same allSettled discipline — a missing
  // progress/reminders endpoint must never wipe the rest of the dashboard.
  // Called on load, on Refresh, and every 60s while the dashboard is open,
  // so marking a day complete on a plan page shows up here without reload.
  const loadReading = useCallback(async (email: string, silent = false) => {
    if (!silent) setReadingLoading(true);
    try {
      const [prog, rem] = await Promise.allSettled([
        fetch(`/api/reading-plans/progress?userEmail=${encodeURIComponent(email)}&stats=true`, { cache: 'no-store' }),
        fetch(`/api/reading-plans/reminders?userEmail=${encodeURIComponent(email)}`, { cache: 'no-store' }),
      ]);
      const read = async (r: PromiseSettledResult<Response>) => {
        if (r.status !== 'fulfilled' || !r.value.ok) return null;
        try { return await r.value.json(); } catch { return null; }
      };
      const [progData, remData] = await Promise.all([read(prog), read(rem)]);
      if (progData?.success) {
        const summaries: PlanSummary[] = Array.isArray(progData.summaries) ? progData.summaries : [];
        setPlanSummaries(summaries);
        setCompletedPlans(Array.isArray(progData.completed_plans) ? progData.completed_plans : summaries.filter((s) => s.completed));
        // De-dupe finished books: the same book can finish inside two plans.
        const seen = new Set<string>();
        const books: FinishedBook[] = [];
        for (const b of (Array.isArray(progData.finished_books) ? progData.finished_books : [])) {
          const key = `${b.book_number}`;
          if (seen.has(key)) continue;
          seen.add(key);
          books.push(b);
        }
        setFinishedBooks(books);
      }
      if (remData?.success) {
        setPlanReminders((Array.isArray(remData.reminders) ? remData.reminders : []).filter((r: PlanReminder) => r.enabled));
      }
      setReadingUpdatedAt(new Date());
    } catch { /* reading progress is additive — never an error state */ }
    finally { if (!silent) setReadingLoading(false); }
  }, []);

  useEffect(() => { if (user?.email) { loadData(user.email); loadReading(user.email); } }, [user, loadData, loadReading]);

  // Live tick: refresh reading progress every 60s while the dashboard is open.
  useEffect(() => {
    if (!user?.email) return;
    const id = setInterval(() => { loadReading(user.email, true); }, 60000);
    return () => clearInterval(id);
  }, [user?.email, loadReading]);

  const handleRefresh = async () => {
    if (!user?.email || isRefreshing) return;
    setIsRefreshing(true);
    await Promise.all([loadData(user.email), loadReading(user.email)]);
    setIsRefreshing(false);
  };
  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    router.replace('/community');
  };

  const verse = useMemo(() => VERSES[new Date().getDate() % VERSES.length], []);
  const firstName = user?.name?.split(' ')[0] || 'Believer';

  // Continue where you left off = most recent readable activity.
  const continueItem = useMemo(() => activities.find(a => getActivityLink(a)), [activities]);
  const continueLink = continueItem ? getActivityLink(continueItem) : null;

  const filteredFeatures = useMemo(() => {
    const q = search.trim().toLowerCase(); if (!q) return FEATURES;
    return FEATURES.filter(f => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
  }, [search]);

  // Reading plans still in progress (newest activity first = highest pct first).
  const inProgressPlans = useMemo(
    () => planSummaries.filter((p) => !p.completed).sort((a, b) => b.pct - a.pct),
    [planSummaries]
  );
  const planTitle = useCallback((planId: number) => {
    return planSummaries.find((p) => p.plan_id === planId)?.plan_title
      || completedPlans.find((p) => p.plan_id === planId)?.plan_title
      || 'Reading Plan';
  }, [planSummaries, completedPlans]);

  if (loading) return (
    <div className="min-h-screen bg-[#FFFBF2] flex flex-col items-center justify-center gap-4">
      <img src={LOGO} alt="Pray-Read" className="h-14 w-auto" />
      <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      <p className="text-slate-500 font-semibold">Loading your dashboard…</p>
    </div>
  );

  return (
    <ErrorBoundary>
      <SessionTracker />
      {/* Reminder engines — one per active reminder. This is what makes the
          plan reminders actually fire while the dashboard is open. */}
      {planReminders.map((r) => (
        <ReadingReminder key={r.plan_id} planId={r.plan_id} planTitle={planTitle(r.plan_id)} time={r.reminder_time} enabled={r.enabled} />
      ))}
      <div className="min-h-screen bg-[#FFFBF2] text-slate-900">
        <AppNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

          {/* HERO — lively, light, readable (was dark photo + white/60 text) */}
          <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2B1055] via-[#5B2A86] to-[#E85D75] text-white shadow-xl shadow-violet-200">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-400/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 w-80 h-80 rounded-full bg-rose-400/30 blur-3xl" />
            <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"><Sparkles size={12} className="text-amber-300" /> Your Spiritual Hub</span>
                <h1 className="text-3xl sm:text-4xl font-black leading-tight mt-4">Good {greeting()}, <span className="bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent">{firstName}</span></h1>
                <p className="text-white/85 mt-2 leading-relaxed flex gap-2"><Quote size={16} className="text-amber-300 shrink-0 mt-1" />“{verse.text}” — <span className="font-bold whitespace-nowrap">{verse.ref}</span></p>
                <div className="relative mt-5 max-w-md">
                  <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search features — Bible, devotionals, songs…" className="w-full bg-white/15 border border-white/25 backdrop-blur rounded-full pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/25 focus:ring-2 ring-amber-300" />
                </div>
              </div>
              <div className="flex flex-col gap-2.5 shrink-0">
                <Link href="/bible-reader" className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 font-black text-sm shadow-lg shadow-rose-500/30 hover:scale-[1.03] transition"><Zap size={16} /> Open the Word</Link>
                {continueLink && <Link href={continueLink} className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/15 border border-white/30 font-bold text-sm hover:bg-white/25 transition">Continue: {getActivityLabel(continueItem!)} <ArrowRight size={15} /></Link>}
                <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 text-sm font-bold transition"><LogOut size={15} /> Log out</button>
              </div>
            </div>
          </section>

          {/* STATS — one card, 4 stats, no more “—” flicker confusion */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6" aria-label="Your progress">
            {[
              { label: 'Books Visited', value: stats.booksVisited, Icon: BookOpen, cls: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
              { label: 'Saved Verses', value: stats.savedVerses, Icon: Heart, cls: 'bg-pink-50 text-pink-700', bar: 'bg-pink-500' },
              { label: 'Day Streak', value: stats.streak, Icon: Flame, cls: 'bg-orange-50 text-orange-700', bar: 'bg-orange-500' },
              { label: 'Days Active', value: stats.daysActive, Icon: TrendingUp, cls: 'bg-purple-50 text-purple-700', bar: 'bg-purple-500' },
            ].map(({ label, value, Icon, cls, bar }) => (
              <div key={label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between"><span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cls}`}><Icon size={19} /></span>{label === 'Day Streak' && value > 0 && <span className="text-[11px] font-black bg-orange-100 text-orange-700 px-2 py-1 rounded-full">🔥 Keep going</span>}</div>
                <p className="text-3xl font-black mt-3">{activityLoading ? <span className="inline-block w-10 h-7 bg-slate-100 rounded-lg animate-pulse" /> : value}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
                <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, value * 8)}%` }} /></div>
              </div>
            ))}
          </section>

          {loadError && <p className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold rounded-2xl px-4 py-3 flex items-center justify-between gap-3">{loadError}<button onClick={handleRefresh} className="font-black underline shrink-0">Retry</button></p>}
          {notice && <p className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl px-4 py-3">{notice}</p>}

          {/* ── NEW: YOUR READING PLANS — LIVE PROGRESS ── */}
          <section className="mt-6" aria-label="Your reading plans">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-black text-lg flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-purple-600" />
                Your Reading Plans
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                  LIVE
                </span>
              </h2>
              <div className="flex items-center gap-3">
                {readingUpdatedAt && <span className="text-[11px] font-semibold text-slate-400">Updated {formatTime(readingUpdatedAt.toISOString())}</span>}
                <Link href="/reading-plans" className="text-xs font-bold text-violet-700 hover:underline inline-flex items-center gap-1">All plans <ArrowRight size={13} /></Link>
              </div>
            </div>

            {readingLoading ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="flex gap-3 items-center"><div className="w-11 h-11 rounded-2xl bg-slate-100 animate-pulse" /><div className="flex-1 space-y-2"><div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" /><div className="h-2 bg-slate-100 rounded animate-pulse" /></div></div>
                ))}
              </div>
            ) : planSummaries.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-3"><span className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><Calendar size={20} /></span><div><h3 className="font-black">No reading plan started yet</h3><p className="text-slate-500 text-sm">Pick a plan — Bible in a Year, Psalms in 30 Days, Romans in 16 Days — and your progress will live here.</p></div></div>
                <Link href="/reading-plans" className="shrink-0 px-5 py-3 rounded-full bg-violet-600 text-white font-black text-sm hover:bg-violet-700 transition inline-flex items-center justify-center gap-1.5">Choose a plan <ArrowRight size={14} /></Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* In-progress plans */}
                {inProgressPlans.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {inProgressPlans.map((p) => (
                      <Link key={p.plan_id} href={`/reading-plans/${p.plan_id}`} className="group bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black leading-tight truncate">{p.plan_title || 'Reading Plan'}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Day {Math.min(p.completed_days + 1, Math.max(p.total_days, 1))} of {p.total_days} · {p.completed_days} days done</p>
                          </div>
                          <span className="shrink-0 text-[11px] font-black bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">{p.pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all" style={{ width: `${p.pct}%` }} /></div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 mt-3 group-hover:underline">Continue reading <ArrowRight size={13} /></span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Completed plans */}
                {completedPlans.length > 0 && (
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-3xl p-5">
                    <h3 className="font-black text-sm flex items-center gap-2 text-emerald-800"><Trophy size={16} className="text-emerald-600" /> Plans Completed</h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {completedPlans.map((p) => (
                        <Link key={p.plan_id} href={`/reading-plans/${p.plan_id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition">
                          <CheckCircle2 size={14} className="text-emerald-600" /> {p.plan_title || 'Reading Plan'} — Complete
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Finished books — each chip opens that book at chapter 1 */}
                {finishedBooks.length > 0 && (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-black text-sm flex items-center gap-2"><BookOpen size={16} className="text-emerald-600" /> Books You Have Finished <span className="text-[11px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{finishedBooks.length}</span></h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {finishedBooks.map((b) => (
                        <Link key={b.book_number} href={`/bible-reader/${b.book_number}/1`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition">
                          <CheckCircle2 size={14} className="text-emerald-600" /> {b.book_name} — Finished
                        </Link>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 font-semibold mt-3">Finished when every day covering the book was marked complete in a reading plan.</p>
                  </div>
                )}

                {/* Active reminders — tap to manage on the plan page */}
                {planReminders.length > 0 && (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-black text-sm flex items-center gap-2"><BellRing size={16} className="text-rose-500" /> Active Reading Reminders</h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {planReminders.map((r) => (
                        <Link key={r.plan_id} href={`/reading-plans/${r.plan_id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 transition">
                          <Bell size={13} /> {planTitle(r.plan_id)} · {r.reminder_time} daily
                        </Link>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 font-semibold mt-3">Reminders fire while this site is open — keep a tab open or check back at your reminder time.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* FEATURES */}
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg flex items-center gap-2"><span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-rose-500" /> Quick Access</h2>
                {search && <button onClick={() => setSearch('')} className="text-xs font-bold text-violet-700 hover:underline">Clear search</button>}
              </div>
              {filteredFeatures.length === 0 ? (
                <div className="bg-white rounded-3xl border p-8 text-center"><p className="text-3xl mb-2">🔍</p><p className="font-black">No feature matched “{search}”</p><p className="text-slate-500 text-sm mt-1">Try “Bible”, “songs”, or “community”.</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredFeatures.map(f => (
                    <Link key={f.href} href={f.href} className={`group bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-lg transition ${f.ring}`}>
                      <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.grad} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition`}><f.icon size={22} /></span>
                      <span><span className="block font-black text-sm leading-tight">{f.title}</span><span className="block text-slate-500 text-xs mt-0.5">{f.description}</span></span>
                      <span className={`self-start text-[11px] font-bold px-2 py-1 rounded-full ${f.chip}`}>{f.title === 'Read Bible' ? 'Start here' : 'Open →'}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* OFFLINE — was a tiny button buried in a 3-col row; now a real card */}
              <div className="mt-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-blue-200">
                <div className="flex gap-3"><span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Download size={20} /></span><div><h3 className="font-black">Read offline</h3><p className="text-white/80 text-sm">Download the Bible once, then read anywhere — no data needed.</p></div></div>
                <button onClick={() => setShowDownloadManager(true)} className="shrink-0 px-5 py-3 rounded-full bg-white text-blue-700 font-black text-sm hover:scale-[1.03] transition">Manage downloads</button>
              </div>
            </section>

            {/* ACTIVITY */}
            <aside>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg flex items-center gap-2"><span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-blue-500" /> Recent Activity</h2>
                <button onClick={handleRefresh} disabled={isRefreshing} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition disabled:opacity-40" title="Refresh activity"><RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /></button>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {activityLoading ? (
                  <div className="p-6 space-y-3">{[0, 1, 2].map(i => <div key={i} className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" /><div className="flex-1 space-y-2"><div className="h-3 bg-slate-100 rounded animate-pulse" /><div className="h-2.5 w-1/2 bg-slate-100 rounded animate-pulse" /></div></div>)}</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-10 px-4"><Activity size={36} className="text-slate-200 mx-auto mb-3" /><p className="font-black">No activity yet</p><p className="text-slate-500 text-sm mt-1">Start reading to track your journey.</p><Link href="/bible-reader" className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-full bg-violet-600 text-white text-sm font-bold">Read the Bible <ArrowRight size={14} /></Link></div>
                ) : (
                  <div className="overflow-y-auto max-h-[520px] divide-y divide-slate-50">
                    {activities.map((a, idx) => {
                      const link = getActivityLink(a);
                      const inner = (<><span className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">{getActivityIcon(a.activity_type)}</span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold leading-tight truncate">{getActivityLabel(a)}</span><span className="block text-slate-400 text-xs mt-0.5">{formatTime(a.created_at)}</span></span>{link && <ExternalLink size={13} className="text-slate-300 shrink-0 mt-1" />}</>);
                      return link ? <Link key={`${a.created_at}-${idx}`} href={link} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition">{inner}</Link> : <div key={`${a.created_at}-${idx}`} className="flex items-start gap-3 px-4 py-3">{inner}</div>;
                    })}
                  </div>
                )}
                {activities.length > 0 && <p className="px-4 py-3 border-t border-slate-100 text-center text-xs font-semibold text-slate-400">{activities.length} recent {activities.length === 1 ? 'activity' : 'activities'}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <Link href="/settings" className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-white border border-slate-200 font-bold text-sm hover:bg-slate-50 transition"><Users size={16} /> Profile</Link>
                <Link href="/reminders" className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-white border border-slate-200 font-bold text-sm hover:bg-slate-50 transition"><Bell size={16} /> Alerts</Link>
              </div>
            </aside>
          </div>

          {/* NOTIFICATIONS */}
          {user?.email && (
            <section className="mt-8">
              <h2 className="font-black text-lg flex items-center gap-2 mb-4"><span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" /> Daily Notifications</h2>
              <NotificationManager userEmail={user.email} />
            </section>
          )}

          {/* DAILY INSPIRATION */}
          <section className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl px-5 py-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0"><Star size={18} className="fill-white" /></span>
            <div><p className="text-[11px] font-black uppercase tracking-widest text-amber-600">Daily Inspiration</p><p className="text-slate-700 text-sm leading-relaxed mt-1">“{verse.text}” — <span className="font-bold">{verse.ref}</span></p></div>
          </section>
        </main>
        <DownloadManager isOpen={showDownloadManager} onClose={() => setShowDownloadManager(false)} />
      </div>
    </ErrorBoundary>
  );
}
