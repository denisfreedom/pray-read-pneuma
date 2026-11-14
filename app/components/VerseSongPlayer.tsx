// app/components/VerseSongPlayer.tsx — ELEGANT REDESIGN + PAID DOWNLOAD
// WHY THIS EXISTS: the old player in the screenshot was the BROWSER'S native
// <audio controls>, which looks dated and — worse — the browser itself adds
// a free "Download" menu item to it that we cannot remove. This player uses
// fully custom controls, so there is no native menu and no free download.
// DOWNLOADS ARE PAID: every Download button opens the Pesapal store link.
// Nothing is ever offered as a free file download. Streaming stays free.
// Same props, same store wiring, same callbacks (onProgress / onPlayComplete),
// same startAt resume, same queue. Only the design and the download model
// changed.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Share2, Minimize2, List, X, Lock, Gauge } from 'lucide-react';
import { usePlayerStore } from '@/app/store/playerStore';

// Paid downloads — every Download button on every song goes here.
const PESAPAL_URL = 'https://store.pesapal.com/donatetoprayreadbibleproject';

interface VerseSongPlayerProps {
  songId: number;
  title: string;
  duration: number;
  mp3Url: string;
  thumbnail?: string;
  description?: string;
  /** Saved position in seconds — the player seeks here on load (resume). */
  startAt?: number;
  onPlayComplete?: () => void;
  onProgress?: (seconds: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
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

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

export default function VerseSongPlayer({
  songId,
  title,
  duration,
  mp3Url,
  thumbnail,
  description,
  startAt,
  onPlayComplete,
  onProgress,
  onNext,
  onPrevious
}: VerseSongPlayerProps) {
  const lyricsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const pendingPlayRef = useRef<Promise<void> | null>(null);
  const isAudioLoadingRef = useRef(false);

  // Callback refs — the parent recreates these every render, so calling
  // the prop directly from an audio event handler would use a stale one.
  const onProgressRef = useRef(onProgress);
  const onPlayCompleteRef = useRef(onPlayComplete);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onPlayCompleteRef.current = onPlayComplete; }, [onPlayComplete]);

  const {
    isPlaying,
    currentTime,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    togglePlay,
    setMiniPlayer,
    setRepeatMode,
    setIsShuffle,
    setVolume,
    setIsMuted,
    currentSong,
    nextSong: globalNextSong,
    previousSong: globalPreviousSong,
    setCurrentTime,
    isOnPlayerPage,
    playlist,
    currentIndex,
    setCurrentSong
  } = usePlayerStore();

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Paid download — every song's Download button comes here.
  const handlePaidDownload = () => {
    window.open(PESAPAL_URL, '_blank', 'noopener,noreferrer');
  };

  // Playback speed — applies to the audio element whenever it changes.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, currentSong?.id]);
  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(playbackRate);
    setPlaybackRate(SPEEDS[(i + 1) % SPEEDS.length]);
  };

  // Safe play helper — cancels any in-flight play before starting a new one
  const safePlay = async (audio: HTMLAudioElement) => {
    if (isAudioLoadingRef.current) return;
    if (pendingPlayRef.current) {
      try { await pendingPlayRef.current; } catch (_) { /* ignore */ }
    }
    isAudioLoadingRef.current = true;
    const p = audio.play();
    pendingPlayRef.current = p;
    try {
      await p;
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Play error:', err);
    } finally {
      pendingPlayRef.current = null;
      isAudioLoadingRef.current = false;
    }
  };

  // Sync audio playback when on player page
  useEffect(() => {
    if (!audioRef.current || !isOnPlayerPage) return;
    if (isPlaying) {
      safePlay(audioRef.current);
    } else {
      if (pendingPlayRef.current) {
        pendingPlayRef.current.then(() => audioRef.current?.pause()).catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isOnPlayerPage]);

  // Sync volume when on player page
  useEffect(() => {
    if (!audioRef.current || !isOnPlayerPage) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, isOnPlayerPage]);

  // Load new song when on player page
  useEffect(() => {
    if (!audioRef.current || !currentSong || !isOnPlayerPage) return;
    audioRef.current.pause();
    pendingPlayRef.current = null;
    audioRef.current.src = currentSong.mp3_url;
    audioRef.current.load();
    audioRef.current.playbackRate = playbackRate;
    const resumeAt = Math.max(0, Math.min(normDuration(startAt), Math.max(0, normDuration(duration) - 1)));
    audioRef.current.currentTime = resumeAt;
    setCurrentTime(resumeAt);
    if (isPlayingRef.current) {
      audioRef.current.addEventListener('canplay', () => {
        if (audioRef.current && isPlayingRef.current) safePlay(audioRef.current);
      }, { once: true });
    }
  }, [currentSong?.id, isOnPlayerPage, startAt]);

  const handleTimeUpdate = () => {
    if (audioRef.current && isOnPlayerPage) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      onProgressRef.current?.(t);
    }
  };

  const handleEnded = () => {
    if (!isOnPlayerPage) return;
    onPlayCompleteRef.current?.();
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        safePlay(audioRef.current);
      }
    } else {
      globalNextSong();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current && isOnPlayerPage) {
      audioRef.current.currentTime = time;
    }
  };

  // Auto-scroll lyrics smoothly based on playback progress
  useEffect(() => {
    if (!lyricsRef.current || !description || !isPlaying) return;
    const progress = duration > 0 ? currentTime / duration : 0;
    const maxScroll = lyricsRef.current.scrollHeight - lyricsRef.current.clientHeight;
    lyricsRef.current.scrollTo({ top: maxScroll * progress, behavior: 'smooth' });
  }, [currentTime, isPlaying, duration, description]);

  const displayDuration = normDuration(duration);
  const durationSeconds = displayDuration;
  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationSeconds_ = Math.floor(durationSeconds % 60);
  const progressPct = isActiveSongCheck(currentSong?.id, songId) && durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;

  function isActiveSongCheck(a: any, b: any) { return a === b; }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleRepeat = () => {
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode);
  };
  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const handleShare = async () => {
    const shareData = { title: title, text: `Listen to "${title}" on Pray-Read Bible`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); alert('Link copied to clipboard!'); }
    } catch (error) { console.error('Error sharing:', error); }
  };

  const handleMinimize = () => setMiniPlayer(true);
  const handlePrevious = () => globalPreviousSong();
  const handleNext = () => globalNextSong();

  const isActiveSong = currentSong?.id === songId;
  const allPlaylistSongs = playlist;

  return (
    <div className="w-full relative">
      {/* Floating "Up Next" button on mobile */}
      {!showQueue && (
        <button
          onClick={() => setShowQueue(true)}
          className="lg:hidden fixed bottom-24 right-4 z-50 p-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-2xl shadow-amber-500/40 transition-all hover:scale-110 active:scale-95"
          aria-label="Show playlist"
        >
          <List className="w-6 h-6" />
        </button>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Elegant Player ─────────────────────────────────────── */}
        <div className="w-full lg:flex-1 relative bg-[#171233] rounded-[2rem] shadow-2xl shadow-purple-950/50 border border-white/10 overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -right-16 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="relative p-6 sm:p-8">
            {/* Top row: Now Playing · Share · Minimize */}
            <div className="flex items-center justify-between mb-6">
              <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-amber-300">
                <span className={`w-2 h-2 rounded-full ${isPlaying && isActiveSong ? 'bg-amber-400 animate-pulse' : 'bg-white/40'}`} />
                Now Playing
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleShare} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95" aria-label="Share" title="Share this song">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={handleMinimize} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95" aria-label="Minimize player" title="Minimize to mini-player">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Artwork with glow */}
            {thumbnail && (
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-purple-500/50 via-amber-400/40 to-purple-600/50 blur-xl opacity-70" />
                  <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-[1.5rem] overflow-hidden shadow-2xl ring-1 ring-white/25">
                    <img src={thumbnail} alt={title} className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <h3 className="text-xl sm:text-2xl font-bold text-white text-center drop-shadow-lg mb-1">{title}</h3>
            <p className="text-center text-xs tracking-widest uppercase text-white/50 mb-5">Pray-Read Bible · Verse Songs</p>

            {/* Lyrics / Description */}
            {description && (
              <div ref={lyricsRef} className="mb-6 h-32 sm:h-36 overflow-y-auto rounded-2xl bg-black/25 border border-white/10 p-4">
                <p className="text-sm sm:text-base text-white/90 leading-relaxed whitespace-pre-wrap">{description}</p>
              </div>
            )}

            {/* Progress */}
            <div className="mb-5">
              <input
                type="range" min="0" max={durationSeconds || 0} value={isActiveSong ? currentTime : 0}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer slider-gold"
                style={{ background: `linear-gradient(to right, #fbbf24 0%, #f59e0b ${progressPct}%, rgba(255,255,255,0.15) ${progressPct}%, rgba(255,255,255,0.15) 100%)` }}
              />
              <div className="flex justify-between text-xs text-white/70 mt-2 font-medium tabular-nums">
                <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
                <span>{String(durationMinutes).padStart(2, '0')}:{String(durationSeconds_).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6">
              <button onClick={toggleShuffle} className={`p-2.5 sm:p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${isShuffle ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40' : 'bg-white/10 text-white/60 hover:bg-white/20'}`} aria-label="Shuffle">
                <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button onClick={handlePrevious} className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95" aria-label="Previous">
                <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button onClick={togglePlay} className="p-4 sm:p-5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 shadow-2xl shadow-amber-500/40 transition-all hover:scale-105 active:scale-95" aria-label={isPlaying && isActiveSong ? 'Pause' : 'Play'}>
                {isPlaying && isActiveSong ? <Pause className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5" fill="currentColor" />}
              </button>
              <button onClick={handleNext} className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95" aria-label="Next">
                <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button onClick={toggleRepeat} className={`p-2.5 sm:p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${repeatMode !== 'off' ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40' : 'bg-white/10 text-white/60 hover:bg-white/20'}`} aria-label={`Repeat: ${repeatMode}`}>
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>

            {/* Volume + Speed + Download */}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={toggleMute} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 min-w-[90px] h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer slider-gold"
                style={{ background: `linear-gradient(to right, #fbbf24 0%, #f59e0b ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) 100%)` }}
                aria-label="Volume"
              />
              <button onClick={cycleSpeed} className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all hover:scale-105 active:scale-95" aria-label="Playback speed" title="Playback speed">
                <Gauge className="w-3.5 h-3.5" /> {playbackRate}×
              </button>
              {/* PAID DOWNLOAD — goes to the Pesapal store. No free download. */}
              <button onClick={handlePaidDownload} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 hover:from-amber-200 hover:to-yellow-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95" title="Buy the album or the full book to download this song">
                <Lock className="w-3.5 h-3.5" /> Buy to Download
              </button>
            </div>
            <p className="text-center text-[11px] text-white/45 mt-3">Streaming is free · Downloads unlock when you buy the album or the full book</p>
          </div>
        </div>

        {/* ── Queue ──────────────────────────────────────────────── */}
        <div className={`
          ${showQueue ? 'fixed inset-0 z-50 lg:relative lg:inset-auto' : 'hidden lg:block'}
          w-full lg:w-80 rounded-none lg:rounded-[2rem] border-0 lg:border border-white/10 overflow-hidden transition-all duration-300
          ${showQueue ? 'bg-[#171233] shadow-2xl' : 'bg-[#171233]/80'}
        `}>
          <div className="sticky top-0 p-4 bg-black/30 backdrop-blur border-b border-white/10 z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Up Next</h3>
              <button onClick={() => setShowQueue(!showQueue)} className="lg:hidden p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all" aria-label="Close queue">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-xs text-white/50 mt-1">{allPlaylistSongs.length} song{allPlaylistSongs.length !== 1 ? 's' : ''} in playlist</p>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-180px)] lg:max-h-96 p-3 space-y-2">
            {allPlaylistSongs.length > 0 ? (
              allPlaylistSongs.map((song, index) => {
                const isActive = song.id === currentSong?.id;
                const qDuration = normDuration(song.duration);
                return (
                  <div
                    key={song.id}
                    onClick={() => setCurrentSong(song)}
                    className={`w-full flex gap-3 p-2 rounded-xl transition-colors group text-left cursor-pointer ${isActive ? 'bg-amber-400/15 border border-amber-400/30' : 'hover:bg-white/10'}`}
                  >
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700">
                      {song.thumbnail ? (
                        <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">🎵</div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-amber-300' : 'text-white group-hover:text-amber-300'}`}>{song.title}</p>
                      <p className="text-xs text-white/50 truncate">{Math.floor(qDuration / 60)}:{String(Math.floor(qDuration % 60)).padStart(2, '0')}</p>
                    </div>
                    {/* Paid download on every queue song too */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePaidDownload(); }}
                      className="self-center p-1.5 rounded-full bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white/70 transition-all"
                      aria-label={`Buy to download ${song.title}`}
                      title="Buy the album or the full book to download"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-xs font-medium self-center flex-shrink-0">
                      {isActive ? <span className="text-amber-300 animate-pulse">▶</span> : <span className="text-white/40">#{index + 1}</span>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-white/50"><p className="text-sm">No songs in playlist</p></div>
            )}
          </div>

          {allPlaylistSongs.length > 0 && (
            <div className="border-t border-white/10 p-3 text-xs text-white/50 bg-black/20">
              <p>Song {currentIndex + 1} of {allPlaylistSongs.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Audio element — NO controls attribute. Native controls (and the
          browser's free Download menu) are never rendered. */}
      {isOnPlayerPage && (
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => { if (audioRef.current) audioRef.current.currentTime = currentTime; }}
        />
      )}

      <style jsx>{`
        .slider-gold::-webkit-slider-thumb {
          appearance: none; width: 16px; height: 16px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          box-shadow: 0 2px 10px rgba(251, 191, 36, 0.6);
          border: 2px solid #fff7ed; transition: transform 0.2s ease;
        }
        .slider-gold::-webkit-slider-thumb:hover { transform: scale(1.25); }
        .slider-gold::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          box-shadow: 0 2px 10px rgba(251, 191, 36, 0.6);
          border: 2px solid #fff7ed;
        }
      `}</style>
    </div>
  );
}
