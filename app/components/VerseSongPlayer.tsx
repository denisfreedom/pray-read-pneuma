// app/components/VerseSongPlayer.tsx — FIXED
// WHAT WAS BROKEN:
//  1) THE BIG ONE: onProgress and onPlayComplete were received as props and
//     NEVER CALLED. handleTimeUpdate only updated the store, and handleEnded
//     just went to the next song. So the whole progress/play wiring in the
//     series page was dead — progress was never saved (resume never worked),
//     plays were never recorded, and songs never marked completed, because
//     the player never told the page anything happened. handleTimeUpdate
//     now calls onProgress, and handleEnded now calls onPlayComplete
//     (BEFORE going to the next song, while the page still knows which song
//     just finished).
//  2) No way to resume. The player always started at 0. New optional
//     `startAt` prop: the page passes the saved position and the player
//     seeks to it on load.
//  3) Stale closures. The song-load effect captured `isPlaying` from the
//     render that created its canplay listener, so a play pressed after the
//     song loaded could be ignored. isPlaying is now read from a ref.
//     Same for the in-flight play guard (now a ref, not state that can go
//     stale inside safePlay).
//  4) Duration could arrive as "3:45" (old rows) — normalised to seconds,
//     in the main display and in the queue.
//  5) Removed a dead useEffect that did nothing.
// Same player, same layout, same controls. Nothing else changed.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Share2, Minimize2, ChevronRight, List, X } from 'lucide-react';
import { usePlayerStore } from '@/app/store/playerStore';

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
  const pendingPlayRef = useRef<Promise<void> | null>(null);
  // In-flight play guard as a ref (not state) so safePlay never reads a
  // stale value from the render that created it.
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

  // Ref mirror of isPlaying for the canplay listener (see song-load effect).
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Safe play helper — cancels any in-flight play before starting a new one
  const safePlay = async (audio: HTMLAudioElement) => {
    if (isAudioLoadingRef.current) return;
    // If a play is already pending, wait for it to settle first
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
    // Pause & reset before switching src to avoid AbortError
    audioRef.current.pause();
    pendingPlayRef.current = null;
    audioRef.current.src = currentSong.mp3_url;
    audioRef.current.load();
    // Resume at the saved position when the page provides one, otherwise 0.
    // Clamped inside the song so a stale position can never break playback.
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
      // THIS WAS MISSING: tell the page where we are, so it can save
      // progress. The page throttles saves to once per 5 seconds.
      onProgressRef.current?.(t);
    }
  };

  const handleEnded = () => {
    if (!isOnPlayerPage) return;
    // THIS WAS MISSING: tell the page the song finished, so it can record
    // the play and mark the song completed. Called BEFORE moving on, while
    // the page still knows which song just finished.
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

    // Smooth scroll animation
    lyricsRef.current.scrollTo({
      top: maxScroll * progress,
      behavior: 'smooth'
    });
  }, [currentTime, isPlaying, duration, description]);

  const displayDuration = normDuration(duration);
  const durationSeconds = displayDuration;
  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationSeconds_ = Math.floor(durationSeconds % 60);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleRepeat = () => {
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleShare = async () => {
    const shareData = {
      title: title,
      text: `Listen to "${title}" on Pray-Read Bible`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleMinimize = () => {
    setMiniPlayer(true);
  };

  const handlePrevious = () => {
    globalPreviousSong();
  };

  const handleNext = () => {
    globalNextSong();
  };

  // Check if this player's song is the currently active one
  const isActiveSong = currentSong?.id === songId;

  // Show all playlist songs so queue is never empty when songs exist
  const allPlaylistSongs = playlist;

  return (
    <div className="w-full relative">
      {/* Floating "Up Next" button on mobile */}
      {!showQueue && (
        <button
          onClick={() => setShowQueue(true)}
          className="lg:hidden fixed bottom-24 right-4 z-50 p-4 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 border border-white/20"
          aria-label="Show playlist"
        >
          <List className="w-6 h-6" />
        </button>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Glassy Player Container */}
      <div className="w-full lg:flex-1 relative bg-gradient-to-br from-purple-500/20 via-indigo-500/20 to-purple-600/20 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-transparent to-indigo-400/10 pointer-events-none" />

        {/* Glass Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Song Title & Minimize Button */}
          <div className="mb-6 text-center relative">
            <button
              onClick={handleMinimize}
              className="absolute right-0 top-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
              aria-label="Minimize player"
              title="Minimize to mini-player"
            >
              <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg mb-2">{title}</h3>
          </div>

          {/* Song Thumbnail */}
          {thumbnail && (
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Lyrics/Description - Auto-scrolling */}
          {description && (
            <div
              ref={lyricsRef}
              className="mb-6 h-32 sm:h-40 overflow-y-auto rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 p-4"
            >
              <p className="text-sm sm:text-base text-white/90 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <input
              type="range"
              min="0"
              max={durationSeconds || 0}
              value={isActiveSong ? currentTime : 0}
              onChange={handleSeek}
              className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${
                  isActiveSong && durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0
                }%, rgba(255, 255, 255, 0.2) ${isActiveSong && durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0}%, rgba(255, 255, 255, 0.2) 100%)`,
              }}
            />
            <div className="flex justify-between text-xs sm:text-sm text-white/80 mt-2 font-medium">
              <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
              <span>{String(durationMinutes).padStart(2, '0')}:{String(durationSeconds_).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
                isShuffle
                  ? 'bg-white/30 text-white shadow-lg'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              aria-label="Shuffle"
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Previous */}
            <button
              onClick={handlePrevious}
              className="p-2 sm:p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label="Previous"
            >
              <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-4 sm:p-5 rounded-full bg-gradient-to-br from-white/40 to-white/20 hover:from-white/50 hover:to-white/30 text-white transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 border border-white/30"
              aria-label={isPlaying && isActiveSong ? 'Pause' : 'Play'}
            >
              {isPlaying && isActiveSong ? (
                <Pause className="w-6 h-6 sm:w-8 sm:h-8" fill="white" />
              ) : (
                <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-0.5" fill="white" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleNext}
              className="p-2 sm:p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label="Next"
            >
              <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Repeat */}
            <button
              onClick={toggleRepeat}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
                repeatMode !== 'off'
                  ? 'bg-white/30 text-white shadow-lg'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              aria-label={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>

          {/* Volume Control & Share */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.6) ${
                  (isMuted ? 0 : volume) * 100
                }%, rgba(255, 255, 255, 0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
              }}
              aria-label="Volume"
            />
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label="Share"
              title="Share this song"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Queue Sidebar - modal on mobile, sidebar on desktop */}
      <div className={`
        ${showQueue ? 'fixed inset-0 z-50 lg:relative lg:inset-auto' : 'hidden lg:block'}
        w-full lg:w-80 rounded-none lg:rounded-3xl border-0 lg:border border-white/20 overflow-hidden transition-all duration-300
        ${showQueue
          ? 'bg-gradient-to-br from-purple-500/20 via-indigo-500/20 to-purple-600/20 backdrop-blur-2xl shadow-2xl'
          : 'bg-slate-800/50 backdrop-blur-sm'
      }`}>
        {/* Queue Header */}
        <div className="sticky top-0 p-4 bg-slate-900/90 backdrop-blur border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Up Next</h3>
            <button
              onClick={() => setShowQueue(!showQueue)}
              className="lg:hidden p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              aria-label="Close queue"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-xs text-white/50 mt-1">{allPlaylistSongs.length} song{allPlaylistSongs.length !== 1 ? 's' : ''} in playlist</p>
        </div>

        {/* Queue Items */}
        <div className="overflow-y-auto h-[calc(100vh-180px)] lg:max-h-96 p-3 space-y-2">
          {allPlaylistSongs.length > 0 ? (
            allPlaylistSongs.map((song, index) => {
              const isActive = song.id === currentSong?.id;
              const qDuration = normDuration(song.duration);
              return (
                <button
                  key={song.id}
                  onClick={() => setCurrentSong(song)}
                  className={`w-full flex gap-3 p-2 rounded-lg transition-colors group text-left ${
                    isActive ? 'bg-purple-600/40 border border-purple-400/30' : 'hover:bg-white/10'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700">
                    {song.thumbnail ? (
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">🎵</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-purple-300' : 'text-white group-hover:text-purple-300'}`}>
                      {song.title}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {Math.floor(qDuration / 60)}:{String(Math.floor(qDuration % 60)).padStart(2, '0')}
                    </p>
                  </div>

                  {/* Now playing indicator or index */}
                  <div className="text-xs font-medium self-center flex-shrink-0">
                    {isActive ? <span className="text-purple-300 animate-pulse">▶</span> : <span className="text-white/40">#{index + 1}</span>}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 text-white/50">
              <p className="text-sm">No songs in playlist</p>
            </div>
          )}
        </div>

        {/* Queue Footer Info */}
        {allPlaylistSongs.length > 0 && (
          <div className="border-t border-white/10 p-3 text-xs text-white/50 bg-slate-900/50">
            <p>Song {currentIndex + 1} of {allPlaylistSongs.length}</p>
          </div>
        )}
      </div>
      </div>

      {/* Audio Element - Only active when on player page */}
      {isOnPlayerPage && (
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              // Sync with current time from store
              audioRef.current.currentTime = currentTime;
            }
          }}
        />
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fff, #f0f0f0);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.6);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fff, #f0f0f0);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}
