'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Book, Users, MessageCircle, Heart, Calendar,
  TrendingUp, LogOut, Bell, Bookmark, Clock, Flame,
  ExternalLink, Eye, RefreshCw, Music, HelpCircle,
  ChevronRight, Activity, Star, Zap, Download
} from 'lucide-react';

import AppNavbar from '@/app/components/AppNavbar';
import NotificationManager from '@/app/components/NotificationManager';
import DownloadManager from '@/app/components/DownloadManager';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';
const BG_IMAGE = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/dashboard-bg_png.jpeg';

interface Activity {
  activity_type: string;
  book_name?: string | null;
  book_number?: number | null;
  chapter?: number | null;
  verse_number?: number | null;
  created_at: string;
}

const features = [
  {
    icon: <BookOpen className="w-7 h-7" />,
    title: 'Read Bible',
    description: 'English & Luganda',
    href: '/bible-reader',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-400/60',
  },
  {
    icon: <Heart className="w-7 h-7" />,
    title: 'My Collections',
    description: 'Saved verses',
    href: '/verse-collections',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/10 border-pink-500/30 hover:border-pink-400/60',
  },
  {
    icon: <Book className="w-7 h-7" />,
    title: 'Devotionals',
    description: 'Daily readings',
    href: '/devotional-plans',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-400/60',
  },
  {
    icon: <Calendar className="w-7 h-7" />,
    title: 'Reading Plans',
    description: 'Structured study',
    href: '/reading-plans',
    color: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-400/60',
  },
  {
    icon: <HelpCircle className="w-7 h-7" />,
    title: 'Bible Q&A',
    description: 'Study questions',
    href: '/qa',
    color: 'from-yellow-500 to-amber-500',
    bg: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-400/60',
  },
  {
    icon: <Music className="w-7 h-7" />,
    title: 'Verse Songs',
    description: 'Scripture music',
    href: '/verse-songs',
    color: 'from-teal-500 to-green-500',
    bg: 'bg-teal-500/10 border-teal-500/30 hover:border-teal-400/60',
  },
  {
    icon: <MessageCircle className="w-7 h-7" />,
    title: 'Community',
    description: 'Connect & discuss',
    href: '/community',
    color: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/10 border-green-500/30 hover:border-green-400/60',
  },
  {
    icon: <Bell className="w-7 h-7" />,
    title: 'Reminders',
    description: 'Daily alerts',
    href: '/reminders',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400/60',
  },
];

function getActivityIcon(type: string) {
  switch (type) {
    case 'verse_view': return <Eye className="w-4 h-4 text-blue-400" />;
    case 'prayer_view':
    case 'prayer_expanded': return <Heart className="w-4 h-4 text-purple-400" />;
    case 'bookmark': return <Bookmark className="w-4 h-4 text-pink-400" />;
    case 'book_visit': return <BookOpen className="w-4 h-4 text-cyan-400" />;
    case 'devotional_access': return <Flame className="w-4 h-4 text-orange-400" />;
    default: return <Clock className="w-4 h-4 text-white/40" />;
  }
}

function getActivityLabel(a: Activity) {
  switch (a.activity_type) {
    case 'verse_view': return `Read ${a.book_name} ${a.chapter}:${a.verse_number}`;
    case 'prayer_view': return `Prayed in ${a.book_name} ${a.chapter}:${a.verse_number}`;
    case 'prayer_expanded': return `Prayer — ${a.book_name} ${a.chapter}:${a.verse_number}`;
    case 'bookmark': return `Saved ${a.book_name} ${a.chapter}:${a.verse_number}`;
    case 'book_visit': return `Visited ${a.book_name}${a.chapter ? ` Ch. ${a.chapter}` : ''}`;
    case 'devotional_access': return `Devotional — ${a.book_name} Day ${a.chapter}`;
    default: return 'Activity recorded';
  }
}

function getActivityLink(a: Activity) {
  if (a.activity_type === 'devotional_access') return '/devotional-plans';
  if (a.book_number && a.chapter) return `/bible-reader/${a.book_number}/${a.chapter}`;
  return null;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ booksVisited: 0, savedVerses: 0, streak: 0, daysActive: 0 });
  const [showDownloadManager, setShowDownloadManager] = useState(false);

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) { router.push('/user-login'); return; }
      const data = await res.json();
      if (!data.success || !data.isUser) { router.push('/user-login'); return; }
      setUser(data.user);
    } catch { router.push('/user-login'); }
    finally { setLoading(false); }
  };

  const loadData = useCallback(async (email: string) => {
    setActivityLoading(true);
    try {
      const [actRes, statRes, devRes] = await Promise.all([
        fetch(`/api/activity-log?userEmail=${encodeURIComponent(email)}&limit=30`, { cache: 'no-store' }),
        fetch(`/api/user-activity?userEmail=${encodeURIComponent(email)}`, { cache: 'no-store' }),
        fetch(`/api/user-devotional-progress?userEmail=${encodeURIComponent(email)}&stats=true`),
      ]);
      const [actData, statData, devData] = await Promise.all([actRes.json(), statRes.json(), devRes.json()]);
      if (actData.success) setActivities(actData.activities || []);
      setStats({
        booksVisited: statData.success ? (statData.visitedBooks?.length || 0) : 0,
        savedVerses: statData.success ? (Number(statData.bookmarkCount) || 0) : 0,
        streak: devData.success ? (devData.currentStreak || 0) : 0,
        daysActive: statData.success ? (statData.stats?.days_active || 0) : 0,
      });
    } catch (e) { console.error(e); }
    finally { setActivityLoading(false); }
  }, []);

  useEffect(() => { if (user?.email) loadData(user.email); }, [user, loadData]);

  const handleRefresh = async () => {
    if (!user?.email) return;
    setIsRefreshing(true);
    await loadData(user.email);
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/community');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-white text-xl animate-pulse">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img src={BG_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        {/* Dark overlay to ensure readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,6,40,0.72) 0%, rgba(15,8,50,0.80) 50%, rgba(10,6,35,0.85) 100%)' }} />
        {/* Subtle warm glow overlay at center */}
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,180,50,0.18) 0%, transparent 60%)' }} />
      </div>

      <AppNavbar />

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Banner */}
        <div className="mb-8 rounded-3xl overflow-hidden relative border border-white/10"
          style={{ background: 'linear-gradient(135deg, rgba(120,80,255,0.3) 0%, rgba(255,180,50,0.15) 100%)' }}>
          <div className="absolute inset-0 backdrop-blur-sm" />
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">Your Spiritual Hub</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                  {user?.name?.split(' ')[0] || 'Believer'}
                </span>
              </h1>
              <p className="text-white/60 text-base">"Your word is a lamp to my feet and a light to my path." — Psalm 119:105</p>
            </div>
            <Link href="/bible-reader"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Zap className="w-4 h-4 text-white" />
              <span className="text-white">Open the Word</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Books Visited', value: stats.booksVisited, icon: <BookOpen className="w-5 h-5" />, color: 'text-cyan-400', iconBg: 'from-blue-500 to-cyan-500' },
            { label: 'Saved Verses', value: stats.savedVerses, icon: <Heart className="w-5 h-5" />, color: 'text-pink-400', iconBg: 'from-pink-500 to-rose-500' },
            { label: 'Day Streak 🔥', value: stats.streak, icon: <Flame className="w-5 h-5" />, color: 'text-orange-400', iconBg: 'from-orange-500 to-red-500' },
            { label: 'Days Active', value: stats.daysActive, icon: <TrendingUp className="w-5 h-5" />, color: 'text-purple-400', iconBg: 'from-purple-500 to-violet-500' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-4 backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.iconBg} flex items-center justify-center text-white`}>{s.icon}</div>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold ${s.color}`}>
                {activityLoading ? <span className="text-white/30 text-lg animate-pulse">—</span> : s.value}
              </div>
              <div className="text-white/50 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout: Features + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Feature Cards (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-yellow-400 to-orange-500" />
              <h2 className="text-white font-bold text-lg">Quick Access</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
              {features.map((f, i) => (
                <Link key={i} href={f.href}
                  className={`group flex flex-col gap-3 p-4 rounded-2xl border backdrop-blur-md transition-all hover:scale-105 hover:shadow-lg ${f.bg}`}
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg`}>
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm leading-tight">{f.title}</div>
                    <div className="text-white/50 text-xs mt-0.5">{f.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors self-end mt-auto" />
                </Link>
              ))}
            </div>

            {/* Recently Read (if any book visits) */}
          </div>

          {/* Right: Activity Log (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-blue-500" />
                <h2 className="text-white font-bold text-lg">Activity Log</h2>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {activityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Activity className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-sm">No activity yet.</p>
                  <p className="text-white/30 text-xs mt-1">Start reading to track your journey!</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[520px]">
                  {activities.map((a, idx) => {
                    const link = getActivityLink(a);
                    const label = getActivityLabel(a);
                    const time = formatTime(a.created_at);
                    const inner = (
                      <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getActivityIcon(a.activity_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-medium leading-tight truncate">{label}</div>
                          <div className="text-white/40 text-xs mt-0.5">{time}</div>
                        </div>
                        {link && <ExternalLink className="w-3 h-3 text-white/20 flex-shrink-0 mt-1" />}
                      </div>
                    );
                    return link ? (
                      <Link key={idx} href={link} className="block hover:no-underline">{inner}</Link>
                    ) : (
                      <div key={idx}>{inner}</div>
                    );
                  })}
                </div>
              )}
              {activities.length > 0 && (
                <div className="px-4 py-3 border-t border-white/5 text-center">
                  <span className="text-white/30 text-xs">{activities.length} recent activities</span>
                </div>
              )}
            </div>

            {/* Settings, Profile & Download quick links */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link href="/settings"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white/70 hover:text-white text-sm">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <Link href="/reminders"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white/70 hover:text-white text-sm">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Alerts</span>
              </Link>
              <button
                onClick={() => setShowDownloadManager(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-blue-400 hover:text-blue-300 text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Offline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        {user?.email && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-green-400 to-emerald-500" />
              <h2 className="text-white font-bold text-lg">Daily Notifications</h2>
            </div>
            <NotificationManager userEmail={user.email} />
          </div>
        )}

        {/* Scripture inspiration footer bar */}
        <div className="mt-8 rounded-2xl border border-yellow-500/20 px-6 py-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05))' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Daily Inspiration</div>
            <div className="text-white/70 text-sm">"Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you." — Joshua 1:9</div>
          </div>
        </div>
      </main>

      {/* Download Manager Modal */}
      <DownloadManager isOpen={showDownloadManager} onClose={() => setShowDownloadManager(false)} />
    </div>
  );
}
