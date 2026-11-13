"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

// app/components/LiveVisitorsWidget.tsx — REDEVELOPED (the part that makes the API count)
// WHY THE OLD ONE SHOWED 0 EVERYWHERE:
//   The widget only ever READ numbers. If the API route was missing, or the
//   table was empty, it showed 0 — and nothing ever fixed it.
// THIS VERSION:
//   1) On mount it POSTs this visit with a stable per-browser visitor key
//      (session-guarded, so React StrictMode double-mounts don't double-count).
//   2) It polls GET every 60s for fresh numbers.
//   3) It shows cached numbers instantly + "…" while loading — never a hard 0 flash.
//   4) It listens for a `prb:verse-read` event (the reader page can dispatch it)
//      and POSTs it as an explicit verse-read event.
// If the API is down, it keeps the last good numbers (localStorage) — never blank.

type Stats = { onlineNow: number; visitorsToday: number; totalVisits: number; versesReadToday: number; updatedAt: string };
const FALLBACK: Stats = { onlineNow: 0, visitorsToday: 0, totalVisits: 0, versesReadToday: 0, updatedAt: '' };

function getVisitorKey(): string {
  try {
    let k = localStorage.getItem('prb-visitor-key');
    if (!k) {
      k = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('prb-visitor-key', k);
    }
    return k;
  } catch { return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
}

export default function LiveVisitorsWidget() {
  const [stats, setStats] = useState<Stats>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const visitorKey = getVisitorKey();

    // 1) Count this visit — once per tab session (StrictMode double-mount guard)
    try {
      if (!sessionStorage.getItem('prb-visit-counted')) {
        sessionStorage.setItem('prb-visit-counted', '1');
        fetch('/api/live-stats', {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: window.location.pathname, visitorKey }),
        }).catch(() => {});
      }
    } catch {}

    // 2) Instant cached numbers so the footer is never empty
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

    // 3) Explicit verse-read events (reader page: window.dispatchEvent(new CustomEvent('prb:verse-read')))
    const onVerseRead = () => {
      fetch('/api/live-stats', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: window.location.pathname, visitorKey, event: 'verse_read' }),
      }).catch(() => {});
    };
    window.addEventListener('prb:verse-read', onVerseRead);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('prb:verse-read', onVerseRead); };
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
