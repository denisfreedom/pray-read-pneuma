"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

// app/verse-songs/page.tsx — V7 DATA LAYER (unchanged, proven) + FRONT-PAGE COLOURS + LOCAL PLAYER
// KEPT from V7: series ONLY from /api/verse-songs/series, songs via per-series
// detail endpoint first, 4 per row x 10 rows = 40 per page, tabs = series names.
// CHANGED:
//  1) Colours: ivory #faf8f2 / emerald #1d4035 / gold #e9c981 / #a9852e, logo /assets/PrayRead-logo.png
//  2) PLAYER FIX: old Play called player.playQueue() from GlobalVerseSongPlayer.
//     If that global player is not mounted / its audio is broken, clicks did
//     nothing. This page now owns its own <audio> + floating bar. Play sets
//     audio.src = song.mp3_url and plays. It still logs the play to
//     /api/verse-songs/play in the background. Like/Save stay local.
//  3) Download: goes to Album Store like V7 (streaming free, download paid).
// Paste into app/verse-songs/page.tsx (NOT app/api/verse-songs/page.tsx).

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

function asArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  if (Array.isArray(d.songs)) return d.songs;
  if (Array.isArray(d.series)) return d.series;
  if (Array.isArray(d.data)) return d.data;
  if (d.data && typeof d.data === 'object') {
    if (Array.isArray(d.data.songs)) return d.data.songs;
    if (Array.isArray(d.data.series)) return d.data.series;
    if (Array.isArray(d.data.data)) return d.data.data;
  }
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.results)) return d.results;
  return [];
}

const isSongRow = (r: any) => !!(r && (r.mp3_url || r.audio_url || r.audioUrl));
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
  const [playerMsg, setPlayerMsg] = useState('');

  // LOCAL PLAYER — full-featured, ULTRA-SAFE V3: no icon library, no next-image (plain img + text icons only) (no TS null/cast errors), lives in this page, does not depend on GlobalVerseSongPlayer
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showFullPlayer, setShowFullPlayer] = useState(false); // kept for compatibility, global player owns the popup now
  const [showQueue, setShowQueue] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Sync card labels with the GLOBAL player (layout) — no local <audio> anymore.
  useEffect(() => {
    const onState = (e: any) => {
      const d = e.detail || {};
      if (d.song) setCurrentSong(d.song);
      if (typeof d.isPlaying === "boolean") setIsPlaying(d.isPlaying);
      if (typeof d.currentTime === "number") setCurrentTime(d.currentTime);
      if (typeof d.duration === "number") setTotalDuration(d.duration);
    };
    window.addEventListener("prayread-player-state", onState);
    return () => window.removeEventListener("prayread-player-state", onState);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const s = await fetch('/api/auth/session').then(r => r.ok ? r.json() : null).catch(() => null);
      const email = s?.user?.email || s?.email || '';
      if (email) setUserEmail(email);

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
      } catch { /* fall back to deriving from songs below */ }
      setSeries(seriesList);

      const fetchSongs = async (url: string, fallback?: Series): Promise<Song[]> => {
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          return asArray(await res.json()).filter(isSongRow).map((sg: any) => normalizeSong(sg, fallback));
        } catch { return []; }
      };
      let songList: Song[] = [];
      if (seriesList.length) {
        const perSeries = await Promise.all(seriesList.map(async (sr) => {
          const rows = await fetchSongs(`/api/verse-songs/series/${sr.id}`, sr);
          return rows.filter(sg =>
            sg.series_id === sr.id ||
            (sg.series_title && sr.title && sg.series_title.trim().toLowerCase() === sr.title.trim().toLowerCase())
          );
        }));
        songList = perSeries.flat();
      }
      if (!songList.length) {
        for (const url of ['/api/verse-songs/songs', '/api/verse-songs']) {
          songList = await fetchSongs(url);
          if (songList.length) break;
        }
      }
      if (email) {
        const withUser = await fetchSongs(`/api/verse-songs/songs?userEmail=${encodeURIComponent(email)}`);
        if (withUser.length) songList = withUser;
      }
      if (songList.length && seriesList.length) {
        songList = songList.map(sg => {
          if (sg.series_id > 0) return sg;
          const match = seriesList.find(sr => sr.title && sg.series_title && sr.title.trim().toLowerCase() === sg.series_title.trim().toLowerCase());
          return match ? { ...sg, series_id: match.id, series_title: match.title } : sg;
        });
      }
      setSongs(songList);

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
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  // ---- GLOBAL player: this page only dispatches, layout owns the <audio> ----
  function playSong(song: Song, list?: Song[]) {
    if (!song.mp3_url) {
      setPlayerMsg(`No audio file uploaded yet for “${song.title}”.`);
      setTimeout(() => setPlayerMsg(''), 4000);
      return;
    }
    if (list) setQueue(list);
    setCurrentSong(song);
    setPlayerMsg('');
    fetch('/api/verse-songs/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseSongId: song.id, userEmail: userEmail || undefined }),
    }).catch(() => {});
    window.dispatchEvent(new CustomEvent('prayread-play-song', { detail: { song, queue: list || queue } }));
  }

  function togglePlayPause() {
    if (!currentSong) return;
    window.dispatchEvent(new Event('prayread-toggle'));
  }

  function playNext() {
    window.dispatchEvent(new Event('prayread-next'));
  }

  function playPrev() {
    window.dispatchEvent(new Event('prayread-prev'));
  }

  function seekTo(sec: number) {
    window.dispatchEvent(new CustomEvent('prayread-seek', { detail: { time: sec } }));
  }

  function skipBy(delta: number) { seekTo(currentTime + delta); }

  function cycleRepeat() {
    setRepeatMode(m => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off');
  }

  function handleEnded() {}
    if (repeatMode === 'off') {
      const idx = queue.findIndex(s => s.id === currentSong?.id);
      if (idx >= 0 && idx === queue.length - 1) { setIsPlaying(false); return; }
    }
    playNext();
  }

  function applyVolume(v: number, muted?: boolean) {
    setVolume(v);
    if (muted !== undefined) setIsMuted(muted);
    // Volume lives in the global player now — it reads its own controls. This keeps card state in sync.
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(next);
  }

  function closePlayer() {
    window.dispatchEvent(new Event('prayread-close'));
    setCurrentSong(null);
  }

  const handleLike = (song: Song) => {
    const liked = !song.user_liked;
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_liked: liked, likes_count: Math.max(0, s.likes_count + (liked ? 1 : -1)) } : s));
    // Best-effort server like — if the endpoint does not exist, local state already updated.
    fetch('/api/verse-songs/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verseSongId: song.id, userEmail: userEmail || undefined, liked }) }).catch(() => {});
  };

  const handleFavorite = (song: Song) => {
    const favorited = !song.user_favorited;
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_favorited: favorited } : s));
    fetch('/api/verse-songs/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verseSongId: song.id, userEmail: userEmail || undefined, favorited }) }).catch(() => {});
  };

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    songs.forEach(s => { c[s.series_id] = (c[s.series_id] || 0) + 1; });
    return c;
  }, [songs]);

  const filtered = activeTab === 'all' ? songs : songs.filter(s => s.series_id === activeTab);

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

  const renderPagination = (position: 'top' | 'bottom') => (
    <div key={position} className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
      <p className="text-xs text-[#fdf6e3]/70">Showing {startIdx}–{endIdx} of {filtered.length} songs · Page {safePage} of {totalPages}</p>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1} className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 text-[#fdf6e3] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
        {pageNumbers.map((p, i) => p === '…' ? (
          <span key={`e-${i}`} className="px-1 text-[#fdf6e3]/70">…</span>
        ) : (
          <button key={p} onClick={() => goToPage(p as number)} className={`w-9 h-9 rounded-full text-sm font-semibold ${p === safePage ? 'bg-[#e9c981] text-[#1a1a1a] shadow' : 'bg-white/10 backdrop-blur-xl border border-white/30 text-[#fdf6e3] hover:bg-[#f3eedd]'}`}>{p}</button>
        ))}
        <button onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages} className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 text-[#fdf6e3] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center gap-3">
        <img src="/assets/PrayRead-logo.png" alt="Pray-Read Bible" width={72} height={72} className="object-contain" />
        <p className="text-[#fdf6e3] font-semibold">Loading verse songs…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-[#fdf6e3]" style={{ backgroundImage: "url(/assets/verse-songs-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div className="absolute inset-0 bg-[#022c22]/75 pointer-events-none" />
      <div className="relative z-10">
      {/* Header — front-page colours + logo */}
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
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-xl hover:bg-black/70 backdrop-blur-xl/20" aria-label="Toggle menu">
            <span className="block w-5 h-0.5 bg-black/70 backdrop-blur-xl mb-1" />
            <span className="block w-5 h-0.5 bg-black/70 backdrop-blur-xl mb-1" />
            <span className="block w-5 h-0.5 bg-black/70 backdrop-blur-xl" />
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
        <p className="text-[11px] font-bold tracking-[2px] text-[#a9852e] uppercase">Scripture · Prayer · Community</p>
        <h1 className="text-3xl font-bold text-[#fdf6e3] mt-1">Verse Songs</h1>
        <p className="text-[#e9c981] mt-1 font-medium">Listen to Scripture set to music. Streaming is free.</p>

        <div className="flex flex-wrap gap-2 mt-6 mb-6">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === 'all' ? 'bg-[#e9c981] text-[#1a1a1a] shadow' : 'bg-white/10 backdrop-blur-xl border border-white/30 text-[#fdf6e3] text-[#fdf6e3]'}`}
          >
            All Songs
          </button>
          {series.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveTab(s.id); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === s.id ? 'bg-[#e9c981] text-[#1a1a1a] shadow' : 'bg-white/10 backdrop-blur-xl border border-white/30 text-[#fdf6e3] text-[#fdf6e3]'}`}
            >
              {s.title} · {counts[s.id] || 0}
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <button onClick={() => playSong(filtered[0], filtered)} className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold shadow transition hover:scale-105 active:scale-95">
            ▶ Play All · {filtered.length} songs
          </button>
        )}

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-2xl border border-[#ece4d0] bg-[#f3eedd] px-5 py-4">
          <p className="text-sm text-[#04352a]">
            <span className="font-bold">Streaming is free.</span>{' '}
            <span className="text-[#1a3a2f]">Buy the album or the full book to download any song for offline listening.</span>
          </p>
          <Link href="/verse-songs/store" className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/85 backdrop-blur-xl text-[#fdf6e3] border-t border-[#e9c981]/30 shadow-[0_-8px_40px_rgba(0,0,0,0.35)] text-sm font-bold transition hover:scale-105 active:scale-95">
            🔒 Album Store
          </Link>
        </div>

        {playerMsg && (
          <div className="bg-[#fff7e0] border border-[#e9c981] text-[#04352a] rounded-xl px-5 py-3 mb-4 text-sm font-medium">{playerMsg}</div>
        )}

        {!loadError && filtered.length > 0 && renderPagination('top')}

        {loadError ? (
          <div className="text-center py-16">
            <span className="text-5xl block text-center mb-3">♫</span>
            <p className="text-[#fdf6e3]/70 mb-4">Couldn&apos;t load the songs. Check your connection and try again.</p>
            <button onClick={loadAll} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold shadow transition hover:scale-105">
              ↻ Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#fdf6e3]/70">
            <span className="text-5xl block text-center mb-3">♫</span>
            <p>No songs in this series yet.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pageSongs.map(song => {
              const isCurrent = currentSong?.id === song.id;
              const playingThis = isCurrent && isPlaying;
              return (
                <article key={song.id} className="group bg-black/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-[#ece4d0] shadow hover:shadow-xl hover:border-[#e9c981] transition-all">
                  <div className="relative w-full aspect-video bg-[#f3eedd] overflow-hidden">
                    {song.thumbnail ? (
                      <img src={song.thumbnail} alt={song.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1d4035]">
                        <span className="text-6xl text-[#e9c981] opacity-60">♫</span>
                      </div>
                    )}
                    {song.series_title && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#e9c981] text-[#1a1a1a] text-xs font-bold shadow">{song.series_title}</span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg leading-snug mb-1 line-clamp-1 text-[#fdf6e3]">{song.title}</h3>
                    {song.description && <p className="text-[#fdf6e3]/70 text-sm line-clamp-2 mb-3">{song.description}</p>}

                    <div className="rounded-2xl bg-black/85 backdrop-blur-2xl border border-[#ece4d0] px-3 py-2.5 mb-3 flex items-center gap-3">
                      <button
                        onClick={() => (isCurrent ? togglePlayPause() : playSong(song, filtered))}
                        className={`shrink-0 p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 ${playingThis ? 'bg-[#e9c981] text-[#1a1a1a] shadow' : 'bg-black/85 backdrop-blur-xl text-[#fdf6e3] border-t border-[#e9c981]/30 shadow-[0_-8px_40px_rgba(0,0,0,0.35)]'}`}
                        aria-label={playingThis ? 'Pause' : 'Play'}
                      >
                        {playingThis ? '❚❚' : '▶'}
                      </button>
                      <span className="text-xs font-medium text-[#fdf6e3]/70">{isCurrent ? (playingThis ? 'Now playing' : 'Paused — tap play to resume') : song.mp3_url ? 'Play' : 'No audio file yet'}</span>
                      <span className="ml-auto text-xs font-medium tabular-nums text-[#fdf6e3]/70">{fmt(song.duration)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#fdf6e3]/70 mb-3">
                      <span>Duration {fmt(song.duration)} · ❤ {song.likes_count}</span>
                      {song.user_favorited && <span className="text-[#a9852e] font-semibold">★ Saved</span>}
                    </div>

                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <button onClick={() => handleLike(song)} className={`flex-1 py-2 px-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap transition ${song.user_liked ? 'bg-red-500 text-[#fdf6e3]' : 'bg-black/85 backdrop-blur-2xl border border-[#ece4d0] hover:bg-[#f3eedd] text-[#fdf6e3]'}`}>
                        ♥ {song.user_liked ? 'Liked' : 'Like'}
                      </button>
                      <button onClick={() => handleFavorite(song)} className={`flex-1 py-2 px-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap transition ${song.user_favorited ? 'bg-[#e9c981] text-[#1a1a1a]' : 'bg-black/85 backdrop-blur-2xl border border-[#ece4d0] hover:bg-[#f3eedd] text-[#fdf6e3]'}`}>
                        🔖 {song.user_favorited ? 'Saved' : 'Save'}
                      </button>
                      <Link href={`/verse-songs/store?album=${song.series_id}`} className="flex-none py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center whitespace-nowrap bg-[#e9c981] text-[#1a1a1a] shadow transition hover:scale-105 active:scale-95" title="Buy the album to download this song">
                        Download
                      </Link>
                    </div>

                    <Link href={`/verse-songs/${song.series_id}`} className="mt-4 flex items-center justify-between text-sm text-[#a9852e] hover:text-[#fdf6e3] font-semibold">
                      Open Series →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!loadError && filtered.length > 0 && renderPagination('bottom')}
      </div>

      {/* Player is GLOBAL now — see app/components/GlobalVerseSongPlayer.tsx in layout. This page only dispatches songs to it, so music keeps playing on Home / other pages. */}

    </div>
    </div>
  );
}
