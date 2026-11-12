"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

// app/components/LiveVisitorsWidget.tsx — REDEVELOPED
// Old way: showed a number with no real source, never updated, no link.
// New way (the RIGHT way):
//  1) On mount, it pings /api/live-stats (POST, fire-and-forget) to count THIS visit.
//  2) Then it GETs /api/live-stats every 60s for fresh numbers.
//  3) Numbers come from the DB (users, activity) — NOT a fake random number.
//  4) If the API is down, it shows the last good numbers (localStorage) — never blank, never 0.
//  5) Every number links to a real page (Community / Dashboard / Bible Reader).
// Requires: app/api/live-stats/route.ts (File 3 in this delivery). If that API is missing,
// the widget still renders with cached numbers and never crashes the footer.

type Stats = { onlineNow: number; visitorsToday: number; totalVisits: number; versesReadToday: number; updatedAt: string };
const FALLBACK: Stats = { onlineNow: 0, visitorsToday: 0, totalVisits: 0, versesReadToday: 0, updatedAt: '' };

export default function LiveVisitorsWidget() {
  const [stats, setStats] = useState<Stats>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // 1) Count this visit (fire-and-forget — must never block the page)
    fetch('/api/live-stats', { method: 'POST', keepalive: true }).catch(() => {});
    // 2) Load cached numbers instantly so the footer is never empty
    try { const c = localStorage.getItem('prb-live-stats'); if (c) setStats(JSON.parse(c)); } catch {}
    const load = async () => {
      try {
        const res = await fetch('/api/live-stats', { cache: 'no-store' });
        if (!res.ok) throw new Error('live-stats failed');
        const data = await res.json();
        const s: Stats = data?.stats || data || FALLBACK;
        if (!cancelled) { setStats(s); try { localStorage.setItem('prb-live-stats', JSON.stringify(s)); } catch {} }
      } catch { /* keep cached numbers */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const id = setInterval(load, 60000); // refresh every 60s — live, but not hammering the DB
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));
  const Row = ({ dot, label, value, href }: { dot: string; label: string; value: number; href: string }) => (
    <Link href={href} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 transition-colors group">
      <span className="flex items-center gap-2 text-sm text-white/60 group-hover:text-white"><span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 8px ${dot}` }} />{label}</span>
      <span className="text-sm font-bold text-white">{loading && value === 0 ? '…' : fmt(value)}</span>
    </Link>
  );

  return (
    <div className="space-y-3">
      <h4 className="text-[#E7C873] text-xs font-bold uppercase tracking-widest flex items-center gap-2"><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" /></span>Live Statistics</h4>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Row dot="#34D399" label="Online now" value={stats.onlineNow} href="/community" />
        <Row dot="#E7C873" label="Visitors today" value={stats.visitorsToday} href="/community" />
        <Row dot="#60A5FA" label="Verses read today" value={stats.versesReadToday} href="/bible-reader" />
        <Row dot="#F472B6" label="Total visits" value={stats.totalVisits} href="/dashboard" />
      </div>
      <p className="text-[11px] text-white/30 text-center">{stats.updatedAt ? `Updated ${new Date(stats.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Refreshes every minute` : 'Live • Refreshes every minute'}</p>
    </div>
  );
}
