'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Maximize2, Music, List } from 'lucide-react';
import { usePlayerStore } from '@/app/store/playerStore';
import { useRouter } from 'next/navigation';

export default function MiniPlayer() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const miniPlayerRef = useRef<HTMLDivElement>(null);
  const pendingPlayRef = useRef<Promise<void> | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // Safe play helper — prevents AbortError from overlapping play() calls
  const safePlay = async (audio: HTMLAudioElement) => {
    if (isAudioLoading) return;
    if (pendingPlayRef.current) {
      try { await pendingPlayRef.current; } catch (_) { /* ignore */ }
    }
    setIsAudioLoading(true);
    const p = audio.play();
    pendingPlayRef.current = p;
    try {
      await p;
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('MiniPlayer play error:', err);
    } finally {
      pendingPlayRef.current = null;
      setIsAudioLoading(false);
    }
  };

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const { 
    currentSong, 
    isPlaying, 
    isMiniPlayer,
    isMaximized,
    togglePlay, 
    nextSong, 
    previousSong,
    clearPlayer,
    repeatMode,
    currentTime,
    volume,
    isMuted,
    setCurrentTime,
    setMiniPlayer,
    setIsMaximized,
    currentSeriesId,
    isOnPlayerPage,
    playlist,
    currentIndex,
    setCurrentSong,
    isQueueVisible,
    setIsQueueVisible
  } = usePlayerStore();

  // Sync audio with store - only when NOT on player page
  useEffect(() => {
    if (!audioRef.current || isOnPlayerPage) return;
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

  // Sync volume with store - only when NOT on player page
  useEffect(() => {
    if (!audioRef.current || isOnPlayerPage) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, isOnPlayerPage]);

  // Load new song - only when NOT on player page
  useEffect(() => {
    if (!audioRef.current || !currentSong || isOnPlayerPage) return;
    // Pause first to avoid AbortError from interrupting previous play
    audioRef.current.pause();
    pendingPlayRef.current = null;
    audioRef.current.src = currentSong.mp3_url;
    audioRef.current.load();
    audioRef.current.currentTime = 0;
    if (isPlaying) {
      audioRef.current.addEventListener('canplay', () => {
        if (audioRef.current && isPlaying) safePlay(audioRef.current);
      }, { once: true });
    }
  }, [currentSong?.id, isOnPlayerPage]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isOnPlayerPage) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    if (isOnPlayerPage) return;
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        safePlay(audioRef.current);
      }
    } else {
      nextSong();
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!miniPlayerRef.current) return;
    
    const rect = miniPlayerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleExpand = () => {
    setMiniPlayer(false);
    setIsMaximized(true);
    // Navigate to the full player page
    router.push('/player');
  };

  const handleClose = () => {
    clearPlayer();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Don't show mini player if:
  // 1. There's no song
  // 2. User is currently on the player page (show full player instead)
  if (!currentSong || isOnPlayerPage) return null;

  // Show all playlist songs so queue is never empty when songs exist
  const allPlaylistSongs = playlist;

  const progress = currentSong.duration > 0 ? (currentTime / currentSong.duration) * 100 : 0;

  return (
    <>
      {/* Audio Element - Only active when NOT on player page */}
      {!isOnPlayerPage && (
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
      
      {/* Mini Player */}
      <div 
        ref={miniPlayerRef}
        className="fixed z-50 animate-in slide-in-from-bottom-4 duration-300"
        style={{
          // On mobile: full width at bottom. On desktop: draggable or default bottom-right
          left: position.x > 0 ? `${position.x}px` : '0',
          right: position.x > 0 ? 'auto' : '0',
          bottom: position.y > 0 ? 'auto' : '0',
          top: position.y > 0 ? `${position.y}px` : 'auto',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 backdrop-blur-xl shadow-2xl border-t border-white/20 overflow-hidden sm:rounded-2xl sm:mx-4 sm:mb-4 sm:border">
          {/* Progress Bar */}
          <div className="h-1 bg-white/20">
            <div 
              className="h-full bg-white/80 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Thumbnail */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                {currentSong.thumbnail ? (
                  <img 
                    src={currentSong.thumbnail} 
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div className="w-full h-full flex items-center justify-center" style={{ display: currentSong.thumbnail ? 'none' : 'flex' }}>
                  <Music className="w-6 h-6 text-white/60" />
                </div>
              </div>

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">
                  {currentSong.title}
                </h4>
                {currentSong.series_title && (
                  <p className="text-xs text-white/70 truncate">
                    {currentSong.series_title}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    previousSong();
                  }}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
                  aria-label="Previous"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110 active:scale-95"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" fill="white" />
                  ) : (
                    <Play className="w-4 h-4" fill="white" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSong();
                  }}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
                  aria-label="Next"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-white/20 mx-1" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsQueueVisible(!isQueueVisible);
                  }}
                  className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
                    isQueueVisible ? 'bg-white/30 text-white' : 'hover:bg-white/20 text-white'
                  }`}
                  aria-label="Show Queue"
                  title="Open playlist queue"
                >
                  <List className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpand();
                  }}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95"
                  aria-label="Expand Player"
                  title="Go back to episode"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="p-2 rounded-full hover:bg-red-500/30 text-white transition-all hover:scale-110 active:scale-95"
                  aria-label="Close Player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Modal */}
      {isQueueVisible && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setIsQueueVisible(false)}
        >
          <div 
            className="w-full sm:max-w-md h-[70vh] sm:h-96 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-white">Up Next</h3>
              <button
                onClick={() => setIsQueueVisible(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
                aria-label="Close queue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-white/60 px-4 pt-2 pb-2">{allPlaylistSongs.length} song{allPlaylistSongs.length !== 1 ? 's' : ''} in playlist</p>

            {/* Queue Items */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {allPlaylistSongs.length > 0 ? (
                allPlaylistSongs.map((song, index) => {
                  const isActive = song.id === currentSong?.id;
                  return (
                    <button
                      key={song.id}
                      onClick={() => {
                        setCurrentSong(song);
                        setIsQueueVisible(false);
                      }}
                      className={`w-full flex gap-3 p-3 rounded-lg transition-colors group text-left ${
                        isActive ? 'bg-white/20 border border-white/30' : 'hover:bg-white/15'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-14 flex-shrink-0 rounded overflow-hidden bg-white/10">
                        {song.thumbnail ? (
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full flex items-center justify-center" style={{ display: song.thumbnail ? 'none' : 'flex' }}>
                          <Music className="w-6 h-6 text-white/60" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-yellow-300' : 'text-white group-hover:text-purple-200'}`}>
                          {song.title}
                        </p>
                        <p className="text-xs text-white/70 truncate">
                          {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                        </p>
                      </div>

                      {/* Playing indicator or index */}
                      <div className="text-xs font-semibold self-center flex-shrink-0">
                        {isActive ? <span className="text-yellow-300 animate-pulse">▶</span> : <span className="text-white/60">#{index + 1}</span>}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-12 text-white/50">
                  <p className="text-sm">No songs in playlist</p>
                </div>
              )}
            </div>

            {/* Footer Info */}
            {allPlaylistSongs.length > 0 && (
              <div className="border-t border-white/10 p-3 text-xs text-white/60 bg-black/20 flex-shrink-0">
                <p>Song {currentIndex + 1} of {allPlaylistSongs.length}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
