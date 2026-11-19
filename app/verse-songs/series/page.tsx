// app/verse-songs/series/page.tsx — SERIES INDEX V2 (ADMIN NAMES, VERBATIM)
// The series are EXACTLY as named + saved in Admin Panel — title, description,
// thumbnail, featured flag. NO built-in book list, NO renaming, NO appending
// "music", NO 66-book assumption. If you rename a series in admin, this page
// shows the new name. If you add a 4th series, this page shows 4.
// Song counts are counted from each series' detail endpoint, because the
// series-list endpoint reports 0 songs even when a series has songs
// (Philemon shows "0 songs" in admin but 18 on its detail page).
// Same look as the main verse-songs page: photo bg + emerald overlay,
// black glass cards, gold #e9c981, cream #fdf6e3, logo /assets/PrayRead-logo.png.
// NO LUCIDE. NO per-card <audio>.
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ApiSeries {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  featured?: boolean;
  is_featured?: boolean;
  song_count?: number;
  songs_count?: number;
  count?: number;
  songs?: any[];
}

function asArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  if (Array.isArray(d.series)) return d.series;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  return [];
}
const isSongRow = (r: any) => !!(r && (r.mp3_url || r.audio_url || r.audioUrl));

export default function VerseSongsSeriesIndex() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [series, setSeries] = useState<ApiSeries[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await fetch('/api/verse-songs/series');
        if (!res.ok) throw new Error('series list failed');
        const rows = asArray(await res.json())
          .filter((r: any) => r && !isSongRow(r))
          .map((r: any) => ({
            id: Number(r.id),
            title: r.title || 'Untitled',
            description: r.description || '',
            thumbnail: r.thumbnail || r.thumbnail_url || '',
            featured: !!(r.featured ?? r.is_featured ?? r.isFeatured),
            song_count: Number(r.song_count ?? r.songs_count ?? r.count ?? 0) || 0,
          }));
        setSeries(rows);

        // Real song count per series — detail endpoint is the truth.
        // Runs in parallel; a failed count just falls back to the list count.
        const entries = await Promise.all(rows.map(async (s) => {
          try {
            const d = await fetch(`/api/verse-songs/series/${s.id}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
            if (!d) return [s.id, s.song_count] as const;
            const songs = Array.isArray(d.songs) ? d.songs : asArray(d).filter(isSongRow);
            return [s.id, songs.length] as const;
          } catch {
            return [s.id, s.song_count] as const;
          }
        }));
        setCounts(Object.fromEntries(entries));
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return series;
    return series.filter(s => s.title.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
  }, [series, query]);

  const featuredCount = series.filter(s => s.featured).length;

  return (
    <div className="min-h-screen relative text-[#fdf6e3]" style={{ backgroundImage: "url(/assets/verse-songs-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div className="absolute inset-0 bg-[#022c22]/75 pointer-events-none" />
      <div className="relative z-10">
        {/* Header — same as main verse-songs page */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl text-[#fdf6e3] border-b border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 font-bold text-lg">
              <img src="/assets/PrayRead-logo.png" alt="Pray-Read Bible" width={42} height={42} className="object-contain rounded" />
              Pray-Read Bible
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
              <Link href="/" className="px-3 py-2 rounded-full hover:text-[#e9c981]">Home</Link>
              <Link href="/about" className="px-3 py-2 rounded-full hover:text-[#e9c981]">About Us</Link>
              <Link href="/verse-songs" className="px-3 py-2 rounded-full bg-[#e9c981] text-[#1a1a1a]">Verse Songs</Link>
              <Link href="/verse-songs/store" className="px-3 py-2 rounded-full hover:text-[#e9c981]">Album Store</Link>
              <Link href="/prayer-library" className="px-3 py-2 rounded-full hover:text-[#e9c981]">Prayer Library</Link>
              <Link href="/dashboard" className="px-3 py-2 rounded-full hover:text-[#e9c981]">Dashboard</Link>
            </nav>
            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-xl hover:bg-black/70" aria-label="Toggle menu">
              <span className="block w-5 h-0.5 bg-[#fdf6e3] mb-1" />
              <span className="block w-5 h-0.5 bg-[#fdf6e3] mb-1" />
              <span className="block w-5 h-0.5 bg-[#fdf6e3]" />
            </button>
          </div>
          {menuOpen && (
            <nav className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1 text-sm font-semibold">
              <Link href="/" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-white/10 backdrop-blur-xl">Home</Link>
              <Link href="/about" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-white/10 backdrop-blur-xl">About Us</Link>
              <Link href="/verse-songs" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg bg-[#e9c981] text-[#1a1a1a]">Verse Songs</Link>
              <Link href="/verse-songs/store" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-white/10 backdrop-blur-xl">Album Store</Link>
              <Link href="/prayer-library" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-white/10 backdrop-blur-xl">Prayer Library</Link>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-white/10 backdrop-blur-xl">Dashboard</Link>
            </nav>
          )}
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-32">
          <div className="flex items-center gap-4 mb-5">
            <Link href="/verse-songs" className="inline-flex items-center gap-1 text-sm text-[#e9c981] hover:text-[#fdf6e3] font-semibold">← Back to Verse Songs</Link>
            <Link href="/verse-songs" className="inline-flex items-center gap-1 text-sm text-[#fdf6e3]/70 hover:text-[#e9c981] font-semibold">All Episodes →</Link>
          </div>

          <p className="text-[11px] font-bold tracking-[2px] text-[#a9852e] uppercase">Scripture · Prayer · Community</p>
          <h1 className="text-3xl font-bold text-[#fdf6e3] mt-1">All Series</h1>
          <p className="text-[#e9c981] mt-1 font-medium">As saved in the Admin Panel. Tap a series to open its songs.</p>

          <div className="mt-5">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a series… e.g. Philemon"
              className="w-full sm:max-w-md px-4 py-2.5 rounded-full bg-black/70 backdrop-blur-xl border border-[#ece4d0] text-[#fdf6e3] placeholder:text-[#fdf6e3]/50 text-sm outline-none focus:border-[#e9c981]"
            />
          </div>

          <p className="text-xs text-[#fdf6e3]/70 mt-4">
            {loading
              ? 'Loading series…'
              : loadError
                ? 'Couldn’t load series.'
                : `Showing ${filtered.length} of ${series.length} series${featuredCount ? ` · ${featuredCount} featured` : ''}`}
          </p>

          {loadError ? (
            <div className="text-center py-16">
              <p className="text-[#fdf6e3]/70 mb-4">Couldn&apos;t load the series. Check your connection and try again.</p>
              <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold shadow transition hover:scale-105">↻ Retry</button>
            </div>
          ) : !loading && series.length === 0 ? (
            <div className="text-center py-16 text-[#fdf6e3]/70">
              <p className="mb-4">No series yet. Add one in the Admin Panel and it will appear here.</p>
              <Link href="/admin-panel" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold shadow transition hover:scale-105">Go to Admin Panel →</Link>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div className="text-center py-16 text-[#fdf6e3]/70"><p>No series matches “{query}”.</p></div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
              {filtered.map(s => {
                const count = counts[s.id] ?? s.song_count ?? 0;
                return (
                  <Link key={s.id} href={`/verse-songs/${s.id}`} className="group bg-black/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-[#ece4d0] shadow hover:shadow-xl hover:border-[#e9c981] transition-all">
                    <div className="relative w-full aspect-square bg-[#1d4035] overflow-hidden">
                      {s.thumbnail ? (
                        <Image src={s.thumbnail} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#1d4035]"><span className="text-6xl text-[#e9c981] opacity-60">♫</span></div>
                      )}
                      {s.featured && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#e9c981] text-[#1a1a1a] text-[11px] font-bold shadow">★ Featured</span>
                      )}
                    </div>
                    <div className="p-4">
                      {/* Title + description — verbatim, as saved in Admin Panel */}
                      <h3 className="font-bold text-lg leading-snug mb-1 line-clamp-2 text-[#fdf6e3]">{s.title}</h3>
                      {s.description && <p className="text-[#fdf6e3]/70 text-sm line-clamp-2 mb-3">{s.description}</p>}
                      <p className="text-xs text-[#fdf6e3]/70 mb-3">🎵 {count} song{count === 1 ? '' : 's'}</p>
                      <span className="w-full py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center whitespace-nowrap bg-[#e9c981] text-[#1a1a1a] shadow transition group-hover:scale-105">
                        Open Series →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
