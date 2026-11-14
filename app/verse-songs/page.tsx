"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppFooter from '@/app/components/AppFooter';

// app/verse-songs/page.tsx — FIXED (library page)
// The earlier fixes are kept (every response shape normalised, filter by
// SERIES not book, separate loading / failed / empty / no-match states).
// WHAT WAS STILL BROKEN:
//  1) Dead-end cards. Each song had a bare <audio> tag but NO link to the
//     series page — the page with the real player, likes, favorites and
//     resume. The two pages never connected. Cards now link to their series.
//  2) Duration "3:45" rendered as NaN:NaN. fmtDuration assumed a number;
//     old rows store "3:45" as text. Durations are normalised to seconds
//     on load, like the series page does.
//  3) Fetched without ?limit=all. The songs route defaults to 100, so a
//     library over 100 songs silently dropped the rest. Now limit=all.
//  4) The empty state linked to /admin — but the Admin panel lives at
//     /admin_panel, so that link 404d. Fixed to /admin_panel.
//  5) Cards showed no play/like counts and never sent userEmail, so liked
//     state was invisible here. The page now loads the session, passes
//     userEmail to the songs API, and shows ▶ plays / ♥ likes per song.
// Same page, same layout. Nothing else changed.

type Song = {
  id?: number; series_id?: number; title: string; description?: string | null;
  mp3_url?: string | null; thumbnail?: string | null; duration?: number | null;
  is_published?: boolean | null; created_at?: string | null;
  play_count?: number | null; likes_count?: number | null;
  user_liked?: boolean | number | null; user_favorited?: boolean | number | null;
};
type Series = {
  id?: number; title: string; description?: string | null;
  is_featured?: boolean | null; song_count?: number | null;
  songs?: Song[];
};

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.songs)) return data.songs;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.series)) return data.series;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

// Duration may arrive as seconds (number), "3:45", or "45" — always seconds.
function normDuration(v: any): number {
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).trim();
  const m = s.match(/^(?:(\d+):)?(\d+):(\d{2})$/);
  if (m) return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}

// Published unless explicitly false / 0 / "false" — NULL counts as published.
function normPublished(v: any): boolean {
  return !(v === false || v === 0 || v === 'false' || v === '0');
}

function normSong(s: any): Song {
  return {
    ...s,
    duration: normDuration(s.duration),
    play_count: Number(s.play_count) || 0,
    likes_count: Number(s.likes_count) || 0,
    user_liked: s.user_liked === true || s.user_liked === 1 || s.user_liked === '1',
    user_favorited: s.user_favorited === true || s.user_favorited === 1 || s.user_favorited === '1',
    is_published: normPublished(s.is_published),
  };
}

function fmtDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VerseSongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'az' | 'series'>('recent');
  const [seriesFilter, setSeriesFilter] = useState<'all' | number>('all');
  const [userEmail, setUserEmail] = useState('');

  const load = async (email = userEmail) => {
    setLoading(true); setLoadError('');
    try {
      const [songsRes, seriesRes] = await Promise.allSettled([
        // limit=all: the songs route defaults to 100 — a library over 100
        // songs used to silently drop the rest. userEmail so the API can
        // return this user's liked / favorited state per song.
        fetch(`/api/verse-songs?limit=all&userEmail=${encodeURIComponent(email)}`, { cache: 'no-store' }),
        fetch('/api/verse-song-series', { cache: 'no-store' }),
      ]);
      let songList: Song[] = [];
      let seriesList: Series[] = [];
      if (songsRes.status === 'fulfilled' && songsRes.value.ok) {
        songList = asArray(await songsRes.value.json()).filter((s: any) => s && s.title).map(normSong);
      }
      if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
        seriesList = asArray(await seriesRes.value.json()).filter((s: any) => s && s.title);
      }
      // Some APIs nest songs inside their series — flatten those too.
      const nested: Song[] = [];
      seriesList.forEach((sr) => {
        if (Array.isArray(sr.songs)) {
          sr.songs.forEach((s) => { if (s && s.title) nested.push(normSong({ ...s, series_id: s.series_id ?? sr.id })); });
        }
      });
      // Merge + dedupe by id (fall back to title when id is missing)
      const seen = new Set<string>();
      const merged = [...songList, ...nested].filter((s) => {
        const key = s.id != null ? `id-${s.id}` : `t-${String(s.title).toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // Public page shows published songs; if the flag is absent, show the song.
      setSongs(merged.filter((s) => s.is_published !== false));
      setSeries(seriesList);
      if (songsRes.status === 'rejected' || (songsRes.status === 'fulfilled' && !songsRes.value.ok)) {
        setLoadError('Could not reach the songs library. Check your connection and try again.');
      }
    } catch {
      setLoadError('Could not reach the songs library. Check your connection and try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    // Load the session first so the first paint already has liked /
    // favorited state — then load the library once, with the email.
    const boot = async () => {
      let email = '';
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          email = data.user?.email || '';
          setUserEmail(email);
        }
      } catch { /* logged out — library still loads */ }
      load(email);
    };
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seriesName = (id?: number) => series.find((s) => s.id === id)?.title || 'Verse-Songs';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = songs.filter((s) => {
      if (seriesFilter !== 'all' && s.series_id !== seriesFilter) return false;
      if (!q) return true;
      return [s.title, s.description || '', seriesName(s.series_id)].join(' ').toLowerCase().includes(q);
    });
    if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'series') list = [...list].sort((a, b) => seriesName(a.series_id).localeCompare(seriesName(b.series_id)) || a.title.localeCompare(b.title));
    else list = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
    return list;
  }, [songs, series, search, sort, seriesFilter]);

  const countFor = (id: number) => {
    const fromSeries = series.find((s) => s.id === id)?.song_count;
    if (typeof fromSeries === 'number') return fromSeries;
    return songs.filter((s) => s.series_id === id).length;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#0F0A2E 0%,#1B1040 55%,#0B0620 100%)' }}>
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">🎵 Verse-Songs</h1>
          <div className="flex items-center gap-2">
            <Link href="/" className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20">🏠 Home</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500">Dashboard</Link>
          </div>
        </div>

        {/* Search */}
        <div className="mt-5 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">🔍</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs, series, or descriptions…"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/10 text-white placeholder:text-white/40 border border-white/10 outline-none focus:border-amber-400/60"
          />
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-white/70 text-sm">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="bg-white/10 text-white rounded-xl px-3 py-2.5 outline-none [&>option]:text-black">
              <option value="recent">Recently Added</option>
              <option value="az">Title A–Z</option>
              <option value="series">By Series</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-white/70 text-sm">
            Filter by Series
            <select value={seriesFilter === 'all' ? 'all' : String(seriesFilter)} onChange={(e) => setSeriesFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-white/10 text-white rounded-xl px-3 py-2.5 outline-none [&>option]:text-black">
              <option value="all">All Series</option>
              {series.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.title} ({countFor(s.id ?? -1)})</option>
              ))}
            </select>
          </label>
          <span className="ml-auto text-white/50 text-sm">{loading ? 'Loading…' : `${filtered.length} of ${songs.length} song${songs.length === 1 ? '' : 's'} · ${series.length} series`}</span>
        </div>

        {/* Series chips */}
        {!loading && series.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setSeriesFilter('all')} className={`px-4 py-2 rounded-full text-sm font-semibold ${seriesFilter === 'all' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>All Songs</button>
            {series.map((s) => (
              <button key={s.id} onClick={() => setSeriesFilter(s.id ?? 'all')} className={`px-4 py-2 rounded-full text-sm font-semibold ${seriesFilter === s.id ? 'bg-amber-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {s.title} · {countFor(s.id ?? -1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse">
                <div className="h-28 rounded-xl bg-white/10 mb-4" />
                <div className="h-5 w-3/4 rounded bg-white/10 mb-2" />
                <div className="h-4 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {!loading && loadError && songs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🎵</p>
            <h2 className="text-2xl font-bold text-white">Couldn&apos;t load the songs</h2>
            <p className="text-white/60 mt-2 max-w-md mx-auto">{loadError}</p>
            <button onClick={() => load()} className="mt-6 px-6 py-3 rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300">Try Again</button>
          </div>
        )}

        {!loading && !loadError && songs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🎵</p>
            <h2 className="text-2xl font-bold text-white">No songs published yet</h2>
            <p className="text-white/60 mt-2 max-w-md mx-auto">
              The Verse-Songs library is empty — no songs have been published from the Admin panel yet.
              New songs appear here automatically as soon as they are added.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/bible-reader" className="px-6 py-3 rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300">Go to the Bible Reader →</Link>
              <Link href="/admin_panel" className="px-6 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20">Add songs in Admin →</Link>
            </div>
          </div>
        )}

        {!loading && songs.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <h2 className="text-2xl font-bold text-white">No songs match your search</h2>
            <p className="text-white/60 mt-2">Try a different word, or clear the filters to see every song.</p>
            <button onClick={() => { setSearch(''); setSeriesFilter('all'); setSort('recent'); }} className="mt-6 px-6 py-3 rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300">Clear Filters</button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((song) => (
              <article key={song.id ?? song.title} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-amber-400/50 transition-colors flex flex-col">
                {song.series_id ? (
                  <Link href={`/verse-songs/${song.series_id}`} aria-label={`Open ${seriesName(song.series_id)}`}>
                    {song.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={song.thumbnail} alt={song.title} className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg,#4C1D95,#7C3AED 55%,#F59E0B)' }}>🎵</div>
                    )}
                  </Link>
                ) : song.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.thumbnail} alt={song.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg,#4C1D95,#7C3AED 55%,#F59E0B)' }}>🎵</div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <span className="self-start px-3 py-1 rounded-full bg-amber-400/15 text-amber-300 text-xs font-bold">{seriesName(song.series_id)}</span>
                  {song.series_id ? (
                    <Link href={`/verse-songs/${song.series_id}`} className="mt-3 text-lg font-bold text-white leading-snug hover:text-amber-300">
                      {song.title}
                    </Link>
                  ) : (
                    <h3 className="mt-3 text-lg font-bold text-white leading-snug">{song.title}</h3>
                  )}
                  {song.description && <p className="mt-2 text-sm text-white/60 leading-relaxed line-clamp-3">{song.description}</p>}
                  <div className="mt-auto pt-4">
                    {song.mp3_url ? (
                      <audio controls preload="none" src={song.mp3_url} className="w-full" />
                    ) : (
                      <p className="text-xs text-white/40">Audio coming soon</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-white/40">
                        {fmtDuration(song.duration) ? `Duration ${fmtDuration(song.duration)}` : ''}
                        {(song.play_count || 0) > 0 ? ` · ▶ ${song.play_count} play${song.play_count === 1 ? '' : 's'}` : ''}
                        {(song.likes_count || 0) > 0 ? ` · ${song.user_liked ? '❤️' : '🤍'} ${song.likes_count}` : ''}
                        {song.user_favorited ? ' · ⭐ Saved' : ''}
                      </p>
                      {song.series_id && (
                        <Link href={`/verse-songs/${song.series_id}`} className="shrink-0 text-xs font-bold text-amber-300 hover:text-amber-200">
                          Open Series →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
