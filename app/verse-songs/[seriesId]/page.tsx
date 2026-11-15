// app/verse-songs/[id]/page.tsx — SERIES DETAIL V2 (All Episodes: 6×6 pagination)
// Layout: 6 audio files per row, 6 rows per page = 36 songs per page,
// with Next / Prev pagination buttons BOTH above the grid and below it.
// Also carries the same header menu as the library page
// (Home, About Us, Verse Songs, Album Store, Dashboard).
// Self-contained: each card has its own mini-player, so this page does not
// depend on the separate VerseSongPlayer component.
// Data layer — same guards as Library V3, so songs and series can never
// be confused: series only from /api/verse-songs/series/{id}; song-shaped
// rows (have mp3_url) are the only rows treated as songs; every response
// shape (array, { songs }, { data }) is accepted.
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Play, Pause, Heart, Bookmark, Lock, Music, ChevronLeft, RefreshCw } from 'lucide-react';

interface Series { id: number; title: string; description?: string; thumbnail?: string; }
interface Song {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  mp3_url: string;
  duration: number;
  series_id: number;
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

function asArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  if (Array.isArray(d.songs)) return d.songs;
  if (Array.isArray(d.series)) return d.series;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  return [];
}

// A row is a SONG if it carries an audio file. Series never do.
const isSongRow = (r: any) => !!(r && (r.mp3_url || r.audio_url || r.audioUrl));

function normalizeSong(sg: any, fallbackSeries?: Series): Song {
  const nested = sg.series && typeof sg.series === 'object' ? sg.series : {};
  return {
    id: Number(sg.id),
    title: sg.title || 'Untitled',
    description: sg.description || '',
    thumbnail: sg.thumbnail || sg.thumbnail_url || sg.cover || fallbackSeries?.thumbnail || '',
    mp3_url: sg.mp3_url || sg.audio_url || sg.audioUrl || sg.url || '',
    duration: normDuration(sg.duration),
    series_id: Number(sg.series_id ?? sg.seriesId ?? nested.id ?? fallbackSeries?.id ?? 0),
    likes_count: Number(sg.likes_count ?? sg.likesCount ?? sg.likes ?? 0) || 0,
    play_count: Number(sg.play_count ?? sg.playCount ?? sg.plays ?? 0) || 0,
    user_liked: !!sg.user_liked || !!sg.userLiked || !!sg.liked,
    user_favorited: !!sg.user_favorited || !!sg.userFavorited || !!sg.favorited,
  };
}

export default function VerseSongsSeriesPage() {
  const params = useParams();
  const seriesId = Number(params.id) || 0;
  const [series, setSeries] = useState<Series | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);

  // Per-card mini-player — one audio element per card, only one plays at once.
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [times, setTimes] = useState<Record<number, number>>({});
  const lastSavedRef = useRef<Record<number, number>>({});

  const loadAll = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setLoadError(false);
    setCurrentPage(1);
    try {
      const s = await fetch('/api/auth/session').then(r => r.ok ? r.json() : null).catch(() => null);
      const email = s?.user?.email || s?.email || '';
      if (email) setUserEmail(email);

      // ── Series info — only from the series endpoint ─────────────
      let found: Series | null = null;
      try {
        const res = await fetch(`/api/verse-songs/series/${seriesId}`);
        if (res.ok) {
          const d = await res.json();
          const rows = asArray(d);
          // Detail may return { series: {...}, songs: [...] } — read series directly.
          const sr = (d && typeof d === 'object' && d.series) ? d.series : rows.find(r => !isSongRow(r));
          if (sr) found = { id: Number(sr.id), title: sr.title || 'Untitled', description: sr.description || '', thumbnail: sr.thumbnail || sr.thumbnail_url || '' };
        }
      } catch { /* fall through to the series list */ }
      if (!found) {
        try {
          const res = await fetch('/api/verse-songs/series');
          if (res.ok) {
            const sr = asArray(await res.json()).find(r => !isSongRow(r) && Number(r.id) === seriesId);
            if (sr) found = { id: Number(sr.id), title: sr.title || 'Untitled', description: sr.description || '', thumbnail: sr.thumbnail || sr.thumbnail_url || '' };
          }
        } catch { /* series stays null */ }
      }
      setSeries(found);

      // ── Songs — try every endpoint that can return them ──────────
      const fetchSongs = async (url: string): Promise<Song[]> => {
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          return asArray(await res.json()).filter(isSongRow).map((sg: any) => normalizeSong(sg, found || undefined));
        } catch { return []; }
      };
      let songList: Song[] = [];
      // Detail endpoint first (it may embed the songs), then the songs
      // endpoints, then the base endpoint filtered to this series.
      for (const url of [`/api/verse-songs/series/${seriesId}`, `/api/verse-songs/songs?seriesId=${seriesId}`, `/api/verse-songs/songs?series_id=${seriesId}`, '/api/verse-songs/songs', '/api/verse-songs']) {
        const rows = await fetchSongs(url);
        const mine = rows.filter(sg => !sg.series_id || sg.series_id === seriesId);
        if (mine.length) { songList = mine; break; }
        if (rows.length && url === '/api/verse-songs/songs') { songList = mine; break; }
      }
      // With-user variant only to pick up liked/saved state — and only
      // if it actually returns songs for this series.
      if (email) {
        const withUser = await fetchSongs(`/api/verse-songs/songs?seriesId=${seriesId}&userEmail=${encodeURIComponent(email)}`);
        if (withUser.length) songList = withUser;
      }
      setSongs(songList);
      setLoadError(!found && songList.length === 0);
    } catch (e) {
      console.error('Series load error:', e);
      setLoadError(true);
    } finally { setLoading(false); }
  }, [seriesId]);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  // ── Pagination: 6 per row × 6 rows = 36 songs per page ───────────
  const PAGE_SIZE = 36;
  const totalPages = Math.max(1, Math.ceil(songs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageSongs = songs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx = songs.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, songs.length);

  const goToPage = (p: number) => {
    setCurrentPage(Math.min(Math.max(1, p), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      <p className="text-xs text-white/60">Showing {startIdx}–{endIdx} of {songs.length} songs · Page {safePage} of {totalPages}</p>
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
        <p className="text-white/60">Loading series…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120e2b] text-white">
      {/* ── Header menu (same menu as the library page) ── */}
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
            <Link href="/dashboard" className="px-3 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition">Dashboard</Link>
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
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/10">Dashboard</Link>
          </nav>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/verse-songs" className="inline-flex items-center gap-1 text-sm text-purple-300 hover:text-purple-200 font-semibold mb-5">
          <ChevronLeft size={16} /> Back to Verse-Songs
        </Link>

        {/* Series hero */}
        <div className="flex items-start gap-4 sm:gap-5 mb-8">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden border-4 border-white shadow-xl bg-slate-800">
            {series?.thumbnail ? (
              <Image src={series.thumbnail} alt={series.title} fill className="object-cover" sizes="128px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
                <Music size={40} className="text-white opacity-60" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight">{series?.title || 'Series'}</h1>
            {series?.description && <p className="text-white/60 mt-1.5 text-sm sm:text-base">{series.description}</p>}
            <span className="inline-block mt-3 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow">🎵 {songs.length} Songs</span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-2">All Episodes</h2>

        {/* Pagination ABOVE the grid */}
        {!loadError && songs.length > 0 && renderPagination('top')}

        {loadError ? (
          <div className="text-center py-16">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-white/70 mb-4">Couldn&apos;t load this series. Check your connection and try again.</p>
            <button onClick={loadAll} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition hover:scale-105">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No songs in this series yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {pageSongs.map(song => {
              const t = times[song.id] || 0;
              const pct = song.duration > 0 ? (t / song.duration) * 100 : 0;
              const isPlaying = playingId === song.id;
              return (
                <article key={song.id} className="group bg-[#1d1840] rounded-2xl overflow-hidden border border-white/10 shadow-xl hover:shadow-2xl hover:border-amber-400/30 transition-all">
                  {/* Cover — tap the play button to play */}
                  <div className="relative w-full aspect-square bg-slate-800 overflow-hidden">
                    {song.thumbnail ? (
                      <Image src={song.thumbnail} alt={song.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
                        <Music size={48} strokeWidth={1.5} className="text-white opacity-60" />
                      </div>
                    )}
                    <button
                      onClick={() => togglePlay(song)}
                      className={`absolute inset-0 m-auto w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isPlaying ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/50' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/50'}`}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
                    </button>
                  </div>

                  <div className="p-3">
                    <h3 className="font-bold text-sm leading-snug mb-1 line-clamp-1">{song.title}</h3>
                    {song.description && <p className="text-white/60 text-xs line-clamp-2 mb-2">{song.description}</p>}

                    {/* Mini-player (custom — NO native controls, NO browser Download menu) */}
                    <div className="rounded-xl bg-black/30 border border-white/10 px-2 py-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium tabular-nums text-white/70 w-8">{fmt(t)}</span>
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
                        <span className="text-[11px] font-medium tabular-nums text-white/70 w-8 text-right">{fmt(song.duration)}</span>
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

                    <p className="text-[11px] text-white/60 mb-2">Duration {fmt(song.duration)} · ❤ {song.likes_count}</p>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      <button onClick={() => handleLike(song)} className={`flex-1 py-1.5 px-1 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1 transition ${song.user_liked ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Heart size={11} fill={song.user_liked ? 'white' : 'none'} /> Like
                      </button>
                      <button onClick={() => handleFavorite(song)} className={`flex-1 py-1.5 px-1 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1 transition ${song.user_favorited ? 'bg-amber-400 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Bookmark size={11} fill={song.user_favorited ? 'currentColor' : 'none'} /> Save
                      </button>
                    </div>
                    {/* Buy / Download — goes to the Album Store, not a free file */}
                    <Link href={`/verse-songs/store?album=${seriesId}`} className="w-full py-1.5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95" title="Buy the album to download this song">
                      <Lock size={11} /> Download
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination BELOW the grid */}
        {!loadError && songs.length > 0 && renderPagination('bottom')}
      </div>

      <style jsx>{`
        .slider-gold::-webkit-slider-thumb {
          appearance: none; width: 13px; height: 13px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.6);
          border: 2px solid #fff7ed;
        }
        .slider-gold::-moz-range-thumb {
          width: 13px; height: 13px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          border: 2px solid #fff7ed;
        }
      `}</style>
    </div>
  );
}
