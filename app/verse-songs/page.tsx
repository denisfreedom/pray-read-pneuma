// app/verse-songs/page.tsx — LIBRARY V4 (header menu + 4-per-row pagination)
// V4 adds, on top of V3's fixed data layer (unchanged):
//  1) The site header menu (logo, Home, About Us, Verse Songs, Album Store,
//     Admin Panel) — sticky at the top, with a hamburger menu on phones.
//  2) Grid is now 4 audio files per row, 10 rows per page = 40 songs per page.
//  3) Next / Prev pagination buttons BOTH above the grid and below it,
//     with page numbers and a "Showing X–Y of Z songs" label.
// ROOT CAUSE (from the live screenshot): the tabs showed SONG titles
// ("Intro to Philemon 2 · 0") instead of series names. V2's series fetch
// had a fallback to the base /api/verse-songs endpoint — but that endpoint
// returns SONGS, not series. So the page filed the 2 songs as "series",
// the tabs became song titles, and the per-series song lookup (using song
// ids as series ids) found nothing. 0 songs everywhere — while Admin
// proves the 2 songs ARE attached to Philemon.
// V3 fixes the data layer:
//  1) Series come ONLY from /api/verse-songs/series. Any row shaped like
//     a song (has mp3_url / audio_url) is filtered OUT of the series list,
//     so songs can never again masquerade as series.
//  2) Songs fetch tries /api/verse-songs/songs AND the base /api/verse-songs
//     (the endpoint that actually returns the songs), plus the userEmail
//     variant — first non-empty result wins.
//  3) Songs may carry their series nested ({ series: { id, title } }) —
//     handled in normalizeSong.
//  4) Per-series fallback uses REAL series ids only.
//  5) Tabs derived from songs only if the series endpoint truly returns
//     nothing — and only from rows with a real series_id.
// FLOW unchanged: songs stream free here; Download goes to the Album Store.
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Heart, Bookmark, Lock, Music, ChevronRight, RefreshCw } from 'lucide-react';

interface Series { id: number; title: string; description?: string; thumbnail?: string; }
interface Song {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  mp3_url: string;
  duration: number;
  series_id: number;
  series_title?: string;
  likes_count: number;
  play_count: number;
  user_liked: boolean;
  user_favorited: boolean;
}

function normDuration(v: any): number {
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).trim();
  const m = s.match(/^(?:(\d+):)?(\d+):(\d{2})$/);
  if (m) return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Pull an array out of any response shape: [], { songs }, { data }, { items }, { success, data }.
function asArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  if (Array.isArray(d.songs)) return d.songs;
  if (Array.isArray(d.series)) return d.series;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.results)) return d.results;
  return [];
}

// A row is a SONG if it carries an audio file. Series never do.
const isSongRow = (r: any) => !!(r && (r.mp3_url || r.audio_url || r.audioUrl));
// A row is a SERIES if it is not a song.
const isSeriesRow = (r: any) => !!r && !isSongRow(r);

function normalizeSong(sg: any, fallbackSeries?: Series): Song {
  const nested = sg.series && typeof sg.series === 'object' ? sg.series : {};
  return {
    id: Number(sg.id),
    title: sg.title || 'Untitled',
    description: sg.description || '',
    thumbnail: sg.thumbnail || sg.thumbnail_url || sg.cover || '',
    mp3_url: sg.mp3_url || sg.audio_url || sg.audioUrl || sg.url || '',
    duration: normDuration(sg.duration),
    series_id: Number(sg.series_id ?? sg.seriesId ?? nested.id ?? fallbackSeries?.id ?? 0),
    series_title: sg.series_title || sg.seriesTitle || nested.title || fallbackSeries?.title || '',
    likes_count: Number(sg.likes_count ?? sg.likesCount ?? sg.likes ?? 0) || 0,
    play_count: Number(sg.play_count ?? sg.playCount ?? sg.plays ?? 0) || 0,
    user_liked: !!sg.user_liked || !!sg.userLiked || !!sg.liked,
    user_favorited: !!sg.user_favorited || !!sg.userFavorited || !!sg.favorited,
  };
}

export default function VerseSongsLibraryPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mini-player state — one audio element per card, only one plays at once.
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [times, setTimes] = useState<Record<number, number>>({});
  const lastSavedRef = useRef<Record<number, number>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const s = await fetch('/api/auth/session').then(r => r.ok ? r.json() : null).catch(() => null);
      const email = s?.user?.email || s?.email || '';
      if (email) setUserEmail(email);

      // ── Series (tabs) — ONLY from the series endpoint ───────────
      // NEVER fall back to the base /api/verse-songs endpoint: it returns
      // SONGS, and V2 mistook them for series (tabs became song titles).
      // Also drop any song-shaped row, so songs can never masquerade as series.
      let seriesList: Series[] = [];
      try {
        const res = await fetch('/api/verse-songs/series');
        if (res.ok) {
          seriesList = asArray(await res.json())
            .filter(isSeriesRow)
            .map((r: any) => ({
              id: Number(r.id), title: r.title || 'Untitled',
              description: r.description || '', thumbnail: r.thumbnail || r.thumbnail_url || '',
            }))
            .filter(r => Number.isFinite(r.id) && r.id > 0);
        }
      } catch { /* series fall back to deriving from songs below */ }
      setSeries(seriesList);

      // ── Songs — try every endpoint that can return them ──────────
      // The base /api/verse-songs endpoint returns the songs list, so it
      // is a first-class candidate — NOT a series fallback.
      const fetchSongs = async (url: string): Promise<Song[]> => {
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          return asArray(await res.json()).filter(isSongRow).map((sg: any) => normalizeSong(sg));
        } catch { return []; }
      };
      let songList: Song[] = [];
      for (const url of ['/api/verse-songs/songs', '/api/verse-songs']) {
        songList = await fetchSongs(url);
        if (songList.length) break;
      }
      // With-user variant only to pick up liked/saved state — and only
      // if it actually returns songs.
      if (email) {
        const withUser = await fetchSongs(`/api/verse-songs/songs?userEmail=${encodeURIComponent(email)}`);
        if (withUser.length) songList = withUser;
      }
      // Per-series fallback — uses REAL series ids only.
      if (!songList.length && seriesList.length) {
        const perSeries = await Promise.all(seriesList.map(async (sr) => {
          for (const url of [`/api/verse-songs/series/${sr.id}`, `/api/verse-songs/songs?seriesId=${sr.id}`, `/api/verse-songs/songs?series_id=${sr.id}`]) {
            try {
              const res = await fetch(url);
              if (!res.ok) continue;
              const rows = asArray(await res.json()).filter(isSongRow);
              if (rows.length) return rows.map((sg: any) => normalizeSong(sg, sr));
            } catch { /* try next */ }
          }
          return [];
        }));
        songList = perSeries.flat();
      }
      setSongs(songList);

      // Tabs: if the series endpoint truly returned nothing, derive tabs
      // from the songs — but ONLY from rows with a real series_id, so a
      // song can never become its own tab again.
      if (!seriesList.length && songList.length) {
        const seen = new Map<number, string>();
        songList.forEach(sg => {
          if (sg.series_id > 0 && !seen.has(sg.series_id)) {
            seen.set(sg.series_id, sg.series_title && sg.series_title !== sg.title ? sg.series_title : `Series ${sg.series_id}`);
          }
        });
        setSeries(Array.from(seen.entries()).map(([id, title]) => ({ id, title })));
      }

      setLoadError(songList.length === 0 && seriesList.length === 0);
    } catch (e) {
      console.error('Library load error:', e);
      setLoadError(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Back to page 1 whenever the tab changes.
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const pauseOthers = (exceptId: number) => {
    audioRefs.current.forEach((audio, id) => { if (id !== exceptId) audio.pause(); });
  };

  const togglePlay = (song: Song) => {
    const audio = audioRefs.current.get(song.id);
    if (!audio) return;
    if (playingId === song.id) { audio.pause(); setPlayingId(null); return; }
    pauseOthers(song.id);
    audio.play().catch(() => {});
    setPlayingId(song.id);
  };

  const saveProgress = async (song: Song, seconds: number, completed: boolean) => {
    if (!userEmail) return;
    const now = Date.now();
    if (!completed && now - (lastSavedRef.current[song.id] || 0) < 5000) return;
    lastSavedRef.current[song.id] = now;
    try {
      await fetch('/api/verse-songs/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, last_position_seconds: Math.floor(seconds), completed }),
      });
    } catch { /* progress is best-effort */ }
  };

  const handleEnded = async (song: Song) => {
    setPlayingId(null);
    setTimes(t => ({ ...t, [song.id]: 0 }));
    await saveProgress(song, normDuration(song.duration), true);
    try {
      await fetch('/api/verse-songs/play', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail }),
      });
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, play_count: s.play_count + 1 } : s));
    } catch { /* play count is best-effort */ }
  };

  const handleLike = async (song: Song) => {
    const liked = !song.user_liked;
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_liked: liked, likes_count: Math.max(0, s.likes_count + (liked ? 1 : -1)) } : s));
    if (!userEmail) return;
    try {
      const res = await fetch('/api/verse-songs/likes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, liked }),
      });
      if (!res.ok) throw new Error('like failed');
    } catch {
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_liked: !liked, likes_count: Math.max(0, s.likes_count + (liked ? -1 : 1)) } : s));
    }
  };

  const handleFavorite = async (song: Song) => {
    const favorited = !song.user_favorited;
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_favorited: favorited } : s));
    if (!userEmail) return;
    try {
      const res = await fetch('/api/verse-songs/favorites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, favorited }),
      });
      if (!res.ok) throw new Error('favorite failed');
    } catch {
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_favorited: !favorited } : s));
    }
  };

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    songs.forEach(s => { c[s.series_id] = (c[s.series_id] || 0) + 1; });
    return c;
  }, [songs]);

  const filtered = activeTab === 'all' ? songs : songs.filter(s => s.series_id === activeTab);

  // ── Pagination: 4 per row × 10 rows = 40 songs per page ──────────
  const PAGE_SIZE = 40;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageSongs = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filtered.length);

  const goToPage = (p: number) => {
    setCurrentPage(Math.min(Math.max(1, p), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Page numbers: all of them when few, otherwise 1 … window … last.
  const pageNumbers: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push('…');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push('…');
    pageNumbers.push(totalPages);
  }

  // One pagination bar, rendered twice: once ABOVE the grid, once BELOW it.
  const renderPagination = (position: 'top' | 'bottom') => (
    <div key={position} className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
      <p className="text-xs text-white/60">Showing {startIdx}–{endIdx} of {filtered.length} songs · Page {safePage} of {totalPages}</p>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
        {pageNumbers.map((p, i) => p === '…' ? (
          <span key={`e-${i}`} className="px-1 text-white/50">…</span>
        ) : (
          <button key={p} onClick={() => goToPage(p as number)} className={`w-9 h-9 rounded-full text-sm font-semibold ${p === safePage ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30' : 'bg-white/10 hover:bg-white/20'}`}>{p}</button>
        ))}
        <button onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120e2b] flex items-center justify-center">
        <p className="text-white/60">Loading verse songs…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120e2b] text-white">
      {/* ── Header menu (same menu as the other pages) ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#120e2b]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-lg shadow-amber-500/30">PRB</span>
            Pray-Read Bible
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
            <Link href="/" className="px-3 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition">Home</Link>
            <Link href="/about" className="px-3 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition">About Us</Link>
            <Link href="/verse-songs" className="px-3 py-2 rounded-full bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30">Verse Songs</Link>
            <Link href="/verse-songs/store" className="px-3 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition">Album Store</Link>
            <Link href="/admin_panel" className="px-3 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition">Admin Panel</Link>
          </nav>
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20" aria-label="Toggle menu">
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white" />
          </button>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1 text-sm font-semibold">
            <Link href="/" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/10">Home</Link>
            <Link href="/about" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/10">About Us</Link>
            <Link href="/verse-songs" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg bg-amber-400 text-slate-950">Verse Songs</Link>
            <Link href="/verse-songs/store" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/10">Album Store</Link>
            <Link href="/admin_panel" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/10">Admin Panel</Link>
          </nav>
        )}
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs — series names, never song titles */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === 'all' ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            All Songs
          </button>
          {series.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveTab(s.id); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === s.id ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              {s.title} · {counts[s.id] || 0}
            </button>
          ))}
        </div>

        {/* Store banner — streaming free, downloads paid */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/15 via-amber-400/5 to-transparent px-5 py-4">
          <p className="text-sm text-amber-100">
            <span className="font-bold text-amber-300">Streaming is free.</span>{' '}
            Buy the album or the full book to download any song for offline listening.
          </p>
          <Link href="/verse-songs/store" className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95">
            <Lock className="w-4 h-4" /> Album Store
          </Link>
        </div>

        {!loadError && filtered.length > 0 && renderPagination('top')}

        {loadError ? (
          <div className="text-center py-16">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-white/70 mb-4">Couldn&apos;t load the songs. Check your connection and try again.</p>
            <button onClick={loadAll} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition hover:scale-105">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No songs in this series yet.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pageSongs.map(song => {
              const t = times[song.id] || 0;
              const pct = song.duration > 0 ? (t / song.duration) * 100 : 0;
              const isPlaying = playingId === song.id;
              return (
                <article key={song.id} className="group bg-[#1d1840] rounded-3xl overflow-hidden border border-white/10 shadow-xl hover:shadow-2xl hover:border-amber-400/30 transition-all">
                  <div className="relative w-full aspect-video bg-slate-800 overflow-hidden">
                    {song.thumbnail ? (
                      <Image src={song.thumbnail} alt={song.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
                        <Music size={64} strokeWidth={1.5} className="text-white opacity-60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {song.series_title && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold shadow">{song.series_title}</span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg leading-snug mb-1 line-clamp-1">{song.title}</h3>
                    {song.description && <p className="text-white/60 text-sm line-clamp-2 mb-3">{song.description}</p>}

                    {/* Elegant mini-player (custom — NO native controls, NO browser Download menu) */}
                    <div className="rounded-2xl bg-black/30 border border-white/10 px-3 py-2.5 mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePlay(song)}
                          className={`shrink-0 p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 ${isPlaying ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40' : 'bg-white text-slate-950'}`}
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                        </button>
                        <span className="text-xs font-medium tabular-nums text-white/70 w-11">{fmt(t)}</span>
                        <input
                          type="range" min="0" max={song.duration || 0} value={t}
                          onChange={(e) => {
                            const audio = audioRefs.current.get(song.id);
                            const v = parseFloat(e.target.value);
                            if (audio) audio.currentTime = v;
                            setTimes(prev => ({ ...prev, [song.id]: v }));
                          }}
                          className="flex-1 h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer slider-gold"
                          style={{ background: `linear-gradient(to right, #fbbf24 0%, #f59e0b ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)` }}
                          aria-label="Seek"
                        />
                        <span className="text-xs font-medium tabular-nums text-white/70 w-11 text-right">{fmt(song.duration)}</span>
                      </div>
                      {/* Hidden audio — NO controls attribute, so the browser never shows its own player or Download menu. */}
                      <audio
                        ref={(el) => { if (el) audioRefs.current.set(song.id, el); else audioRefs.current.delete(song.id); }}
                        src={song.mp3_url}
                        preload="metadata"
                        onTimeUpdate={(e) => {
                          const cur = e.currentTarget.currentTime;
                          setTimes(prev => ({ ...prev, [song.id]: cur }));
                          saveProgress(song, cur, false);
                        }}
                        onEnded={() => handleEnded(song)}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                      <span>Duration {fmt(song.duration)} · ❤ {song.likes_count}</span>
                      {song.user_favorited && <span className="text-amber-300 font-semibold">★ Saved</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleLike(song)} className={`flex-1 py-2 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition ${song.user_liked ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Heart size={13} fill={song.user_liked ? 'white' : 'none'} /> {song.user_liked ? 'Liked' : 'Like'}
                      </button>
                      <button onClick={() => handleFavorite(song)} className={`flex-1 py-2 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition ${song.user_favorited ? 'bg-amber-400 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Bookmark size={13} fill={song.user_favorited ? 'currentColor' : 'none'} /> {song.user_favorited ? 'Saved' : 'Save'}
                      </button>
                      {/* Buy / Download — goes to the Album Store, not a free file */}
                      <Link href={`/verse-songs/store?album=${song.series_id}`} className="flex-1 py-2 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95" title="Buy the album to download this song">
                        <Lock size={13} /> Download
                      </Link>
                    </div>

                    <Link href={`/verse-songs/${song.series_id}`} className="mt-4 flex items-center justify-between text-sm text-amber-300 hover:text-amber-200 font-semibold">
                      Open Series <ChevronRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!loadError && filtered.length > 0 && renderPagination('bottom')}
      </div>

      <style jsx>{`
        .slider-gold::-webkit-slider-thumb {
          appearance: none; width: 14px; height: 14px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.6);
          border: 2px solid #fff7ed;
        }
        .slider-gold::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          border: 2px solid #fff7ed;
        }
      `}</style>
    </div>
  );
}
