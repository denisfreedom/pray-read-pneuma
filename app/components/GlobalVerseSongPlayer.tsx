// app/components/GlobalVerseSongPlayer.tsx — GLOBAL floating verse-song player
// WHY THIS FILE EXISTS: a player inside the verse-songs page dies the
// moment you navigate away, because Next.js unmounts the page. This player
// lives in the ROOT LAYOUT (see the layout snippet at the bottom of this
// file), so it keeps playing while you move around the whole site.
// FEATURES:
//  - Floating: a slim minimized bar, tap to expand to the full player.
//  - Playlist (queue): Play All, tap any song in the list, Next / Prev.
//  - Shuffle, Repeat (off / all / one), seek bar, volume.
//  - Like / Save, Download → Album Store (never a free file).
//  - Progress saved to the server + play count on finish.
//  - Keeps playing across page changes (it lives in the layout, not a page).
//  - Screen-off playback: it uses the browser's plain <audio> element —
//    the only kind of web audio that keeps playing when a phone screen
//    locks — plus Media Session, so the lock screen shows the song with
//    Play / Pause / Next / Prev controls. See "honest limits" below.
// HONEST LIMITS (no website can override these):
//  - A full page refresh / closing the tab stops playback.
//  - An aggressive battery-saver that kills the browser tab stops playback.
//  - What this file does is the correct setup: real <audio>, no pausing
//    on tab-hide or screen-off, Media Session lock-screen controls.
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward, Heart, Bookmark, Lock, X, ChevronUp, ChevronDown, Shuffle, Repeat, Repeat1, Volume2, ListMusic } from 'lucide-react';

export interface PlayerSong {
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

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerContextValue {
  queue: PlayerSong[];
  currentSong: PlayerSong | null;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  minimized: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  playQueue: (list: PlayerSong[], start: PlayerSong) => void;
  playIndex: (index: number) => void;
  togglePlay: () => void;
  playNext: (fromEnded?: boolean) => void;
  playPrev: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (v: number) => void;
  minimizePlayer: () => void;
  expandPlayer: () => void;
  closePlayer: () => void;
  toggleLike: (song: PlayerSong) => Promise<void>;
  toggleFavorite: (song: PlayerSong) => Promise<void>;
  updateSongInQueue: (id: number, patch: Partial<PlayerSong>) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// SAFE FALLBACK: if the layout does not have <VerseSongPlayerProvider> yet,
// the hook returns a harmless no-op player instead of THROWING. Throwing here
// is what failed the Vercel build: Next.js pre-renders the verse-songs pages,
// and a thrown error during pre-render fails the whole build. With this
// fallback the pages always build; playback simply does nothing until the
// provider is added to app/layout.tsx (see the wiring snippet at the bottom).
const noopPlayer: PlayerContextValue = {
  queue: [], currentSong: null, currentIndex: -1, isPlaying: false,
  currentTime: 0, duration: 0, volume: 1, minimized: true,
  repeatMode: 'off', shuffle: false,
  playQueue: () => {}, playIndex: () => {}, togglePlay: () => {},
  playNext: () => {}, playPrev: () => {}, seekTo: () => {}, setVolume: () => {},
  minimizePlayer: () => {}, expandPlayer: () => {}, closePlayer: () => {},
  toggleLike: async () => {}, toggleFavorite: async () => {},
  updateSongInQueue: () => {}, toggleShuffle: () => {}, cycleRepeat: () => {},
};

export function useVerseSongPlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  return ctx ?? noopPlayer;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function VerseSongPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayerSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [minimized, setMinimized] = useState(true);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffle, setShuffle] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const lastSavedRef = useRef(0);
  const queueRef = useRef<PlayerSong[]>([]);
  const indexRef = useRef(-1);
  const repeatRef = useRef<RepeatMode>('off');
  const shuffleRef = useRef(false);
  queueRef.current = queue;
  indexRef.current = currentIndex;
  repeatRef.current = repeatMode;
  shuffleRef.current = shuffle;

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.ok ? r.json() : null).then(s => {
      const email = s?.user?.email || s?.email || '';
      if (email) setUserEmail(email);
    }).catch(() => {});
  }, []);

  const updateSongInQueue = useCallback((id: number, patch: Partial<PlayerSong>) => {
    setQueue(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  // Drive the single <audio> element from state. This element is the whole
  // reason screen-off playback works: it is a plain browser audio element,
  // and we NEVER pause it on tab-hide / screen-off.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (audio.src !== currentSong.mp3_url) {
      audio.src = currentSong.mp3_url;
      setCurrentTime(0);
    }
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [currentSong, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const saveProgress = useCallback(async (song: PlayerSong, seconds: number, completed: boolean) => {
    if (!userEmail) return;
    const now = Date.now();
    if (!completed && now - lastSavedRef.current < 5000) return;
    lastSavedRef.current = now;
    try {
      await fetch('/api/verse-songs/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, last_position_seconds: Math.floor(seconds), completed }),
      });
    } catch { /* progress is best-effort */ }
  }, [userEmail]);

  const playNext = useCallback((fromEnded = false) => {
    const q = queueRef.current;
    const idx = indexRef.current;
    if (!q.length || idx < 0) return;
    if (repeatRef.current === 'one' && fromEnded) {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      return;
    }
    let next = idx + 1;
    if (shuffleRef.current && q.length > 1) {
      do { next = Math.floor(Math.random() * q.length); } while (next === idx);
    } else if (next >= q.length) {
      if (repeatRef.current === 'all') next = 0;
      else { setIsPlaying(false); return; }
    }
    setCurrentIndex(next);
    setIsPlaying(true);
  }, []);

  const handleEnded = useCallback(() => {
    const song = queueRef.current[indexRef.current];
    if (song) {
      saveProgress(song, song.duration, true);
      fetch('/api/verse-songs/play', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail }),
      }).catch(() => {});
      updateSongInQueue(song.id, { play_count: song.play_count + 1 });
    }
    playNext(true);
  }, [saveProgress, userEmail, playNext, updateSongInQueue]);

  const playQueue = useCallback((list: PlayerSong[], start: PlayerSong) => {
    if (!list.length) return;
    const idx = list.findIndex(s => s.id === start.id);
    const at = idx >= 0 ? idx : 0;
    // Tapping the song that is already current just toggles play/pause.
    if (queueRef.current.length && queueRef.current[currentIndex] && queueRef.current[currentIndex].id === start.id && queueRef.current === list) {
      setIsPlaying(p => !p);
      return;
    }
    setQueue(list);
    setCurrentIndex(at);
    setIsPlaying(true);
    setMinimized(false);
  }, [currentIndex]);

  const playIndex = useCallback((index: number) => {
    if (index < 0 || index >= queueRef.current.length) return;
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (currentIndex < 0) return;
    setIsPlaying(p => !p);
  }, [currentIndex]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; setCurrentTime(0); return; }
    const q = queueRef.current;
    const idx = indexRef.current;
    if (!q.length || idx < 0) return;
    setCurrentIndex(idx <= 0 ? q.length - 1 : idx - 1);
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const setVolume = useCallback((v: number) => setVolumeState(Math.min(1, Math.max(0, v))), []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setIsPlaying(false);
    setQueue([]);
    setCurrentIndex(-1);
    setCurrentTime(0);
    setMinimized(true);
  }, []);

  const toggleLike = useCallback(async (song: PlayerSong) => {
    const liked = !song.user_liked;
    updateSongInQueue(song.id, { user_liked: liked, likes_count: Math.max(0, song.likes_count + (liked ? 1 : -1)) });
    if (!userEmail) return;
    try {
      const res = await fetch('/api/verse-songs/likes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, liked }),
      });
      if (!res.ok) throw new Error('like failed');
    } catch {
      updateSongInQueue(song.id, { user_liked: !liked, likes_count: Math.max(0, song.likes_count + (liked ? -1 : 1)) });
    }
  }, [userEmail, updateSongInQueue]);

  const toggleFavorite = useCallback(async (song: PlayerSong) => {
    const favorited = !song.user_favorited;
    updateSongInQueue(song.id, { user_favorited: favorited });
    if (!userEmail) return;
    try {
      const res = await fetch('/api/verse-songs/favorites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, favorited }),
      });
      if (!res.ok) throw new Error('favorite failed');
    } catch {
      updateSongInQueue(song.id, { user_favorited: !favorited });
    }
  }, [userEmail, updateSongInQueue]);

  // Lock-screen / notification controls (Media Session). This is what puts
  // the song on the phone's lock screen with working buttons.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentSong) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.series_title || 'Pray-Read Bible',
        album: 'Verse Songs',
        artwork: currentSong.thumbnail ? [{ src: currentSong.thumbnail, sizes: '512x512', type: 'image/jpeg' }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime !== undefined) seekTo(d.seekTime); });
    } catch { /* Media Session not supported on this browser */ }
  }, [currentSong, playPrev, playNext, seekTo]);

  const value: PlayerContextValue = {
    queue, currentSong, currentIndex, isPlaying, currentTime, duration, volume,
    minimized, repeatMode, shuffle,
    playQueue, playIndex, togglePlay, playNext, playPrev, seekTo, setVolume,
    minimizePlayer: () => setMinimized(true),
    expandPlayer: () => setMinimized(false),
    closePlayer, toggleLike, toggleFavorite, updateSongInQueue,
    toggleShuffle: () => setShuffle(s => !s),
    cycleRepeat: () => setRepeatMode(m => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'),
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* The ONE audio element for the whole site. Plain <audio>, no controls,
          no pause-on-hide: this is what keeps playing when the screen locks. */}
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        className="hidden"
        onTimeUpdate={(e) => {
          const cur = e.currentTarget.currentTime;
          setCurrentTime(cur);
          const song = queueRef.current[indexRef.current];
          if (song) saveProgress(song, cur, false);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={handleEnded}
      />
    </PlayerContext.Provider>
  );
}

// ── The floating player UI ────────────────────────────────────────────
export function FloatingPlayer() {
  const p = useVerseSongPlayer();
  const song = p.currentSong;
  if (!song) return null;
  const pct = p.duration > 0 ? (p.currentTime / p.duration) * 100 : 0;

  // ── Minimized: slim bar pinned to the bottom ──
  if (p.minimized) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 border-t border-amber-400/40 bg-[#1d1840]/95 backdrop-blur shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-3">
          <button onClick={p.expandPlayer} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <span className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-slate-800">
              {song.thumbnail ? (
                <Image src={song.thumbnail} alt={song.title} fill className="object-cover" sizes="44px" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-lg">🎵</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-sm text-white truncate">{song.title}</span>
              <span className="block text-xs text-white/60 truncate">{song.series_title || 'Verse Songs'} · {fmt(p.currentTime)} / {fmt(p.duration)}</span>
            </span>
          </button>
          <button onClick={p.togglePlay} className="shrink-0 p-2.5 rounded-full bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40 transition hover:scale-110 active:scale-95" aria-label={p.isPlaying ? 'Pause' : 'Play'}>
            {p.isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
          </button>
          <button onClick={() => p.playNext()} className="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Next">
            <SkipForward className="w-4 h-4" fill="currentColor" />
          </button>
          <button onClick={p.expandPlayer} className="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Maximize player">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={p.closePlayer} className="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Close player">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Thin progress line */}
        <div className="h-1 bg-white/10">
          <div className="h-full bg-gradient-to-r from-amber-300 to-yellow-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  // ── Maximized: full player + playlist ──
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-amber-400/40 bg-[#1d1840]/98 backdrop-blur shadow-2xl max-h-[85vh] overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wide">
            <ListMusic size={14} /> Now Playing · Verse Songs
          </span>
          <span className="flex gap-1.5">
            <button onClick={p.minimizePlayer} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Minimize player">
              <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={p.closePlayer} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Close player">
              <X className="w-4 h-4" />
            </button>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-40 aspect-square shrink-0 rounded-2xl overflow-hidden bg-slate-800 shadow-xl mx-auto">
            {song.thumbnail ? (
              <Image src={song.thumbnail} alt={song.title} fill className="object-cover" sizes="160px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-5xl">🎵</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-snug text-white">{song.title}</h3>
            {song.series_title && <p className="text-amber-300 text-sm font-semibold">{song.series_title}</p>}
            {song.description && <p className="text-white/60 text-sm line-clamp-2 mt-1">{song.description}</p>}

            {/* Seek bar */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-medium tabular-nums text-white/70 w-11">{fmt(p.currentTime)}</span>
              <input
                type="range" min="0" max={p.duration || 0} value={p.currentTime}
                onChange={(e) => p.seekTo(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer slider-gold"
                style={{ background: `linear-gradient(to right, #fbbf24 0%, #f59e0b ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)` }}
                aria-label="Seek"
              />
              <span className="text-xs font-medium tabular-nums text-white/70 w-11 text-right">{fmt(p.duration)}</span>
            </div>

            {/* Transport controls */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3">
              <button onClick={p.toggleShuffle} className={`p-2.5 rounded-full transition ${p.shuffle ? 'bg-amber-400 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'}`} aria-label="Shuffle" title="Shuffle">
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={p.playPrev} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Previous">
                <SkipBack className="w-5 h-5" fill="currentColor" />
              </button>
              <button onClick={p.togglePlay} className="p-4 rounded-full bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40 transition hover:scale-110 active:scale-95" aria-label={p.isPlaying ? 'Pause' : 'Play'}>
                {p.isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />}
              </button>
              <button onClick={() => p.playNext()} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Next">
                <SkipForward className="w-5 h-5" fill="currentColor" />
              </button>
              <button onClick={p.cycleRepeat} className={`p-2.5 rounded-full transition ${p.repeatMode !== 'off' ? 'bg-amber-400 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'}`} aria-label="Repeat" title={p.repeatMode === 'one' ? 'Repeat one' : p.repeatMode === 'all' ? 'Repeat all' : 'Repeat off'}>
                {p.repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Like / Save / Download / Volume */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button onClick={() => p.toggleLike(song)} className={`py-2 px-3 rounded-full text-xs font-semibold flex items-center gap-1 transition ${song.user_liked ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                <Heart size={13} fill={song.user_liked ? 'white' : 'none'} /> {song.user_liked ? 'Liked' : 'Like'} · {song.likes_count}
              </button>
              <button onClick={() => p.toggleFavorite(song)} className={`py-2 px-3 rounded-full text-xs font-semibold flex items-center gap-1 transition ${song.user_favorited ? 'bg-amber-400 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                <Bookmark size={13} fill={song.user_favorited ? 'currentColor' : 'none'} /> {song.user_favorited ? 'Saved' : 'Save'}
              </button>
              <Link href={`/verse-songs/store?album=${song.series_id}`} className="py-2 px-3 rounded-full text-xs font-bold flex items-center gap-1 bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/30 transition hover:scale-105" title="Buy the album to download this song">
                <Lock size={13} /> Download
              </Link>
              <span className="flex items-center gap-1.5 ml-auto">
                <Volume2 size={15} className="text-white/60" />
                <input
                  type="range" min="0" max="1" step="0.01" value={p.volume}
                  onChange={(e) => p.setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer slider-gold"
                  aria-label="Volume"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Playlist */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-2">Playlist · {p.queue.length} songs</p>
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {p.queue.map((s, i) => {
              const isCurrent = i === p.currentIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => p.playIndex(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${isCurrent ? 'bg-amber-400/15 border border-amber-400/40' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <span className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-slate-800">
                    {s.thumbnail ? (
                      <Image src={s.thumbnail} alt={s.title} fill className="object-cover" sizes="40px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-sm">🎵</span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-semibold truncate ${isCurrent ? 'text-amber-300' : 'text-white'}`}>{s.title}</span>
                    <span className="block text-xs text-white/50 truncate">{s.series_title || ''} · {fmt(s.duration)}</span>
                  </span>
                  {isCurrent && p.isPlaying && (
                    <span className="flex gap-0.5 items-end h-4 shrink-0" aria-hidden>
                      <span className="w-1 bg-amber-400 rounded-full animate-pulse h-4" />
                      <span className="w-1 bg-amber-400 rounded-full animate-pulse h-2" />
                      <span className="w-1 bg-amber-400 rounded-full animate-pulse h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
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

// ── LAYOUT WIRING (do this once in app/layout.tsx) ─────────────────────
// import { VerseSongPlayerProvider, FloatingPlayer } from './components/GlobalVerseSongPlayer';
//
// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>
//         <VerseSongPlayerProvider>
//           {children}
//           <FloatingPlayer />
//         </VerseSongPlayerProvider>
//       </body>
//     </html>
//   );
// }
// If your components folder is at the project root (not inside app/),
// use '@/components/GlobalVerseSongPlayer' instead of the relative path.
