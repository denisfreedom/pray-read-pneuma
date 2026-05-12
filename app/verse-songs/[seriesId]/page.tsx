'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Music, Heart, Bookmark } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import VerseSongPlayer from '@/app/components/VerseSongPlayer';
import VerseSongCard from '@/app/components/VerseSongCard';
import { usePlayerStore } from '@/app/store/playerStore';
import type { PlayerSong } from '@/app/store/playerStore';
import { useParams, useRouter } from 'next/navigation';

interface Series {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  is_featured: boolean;
}

interface Song {
  id: number;
  series_id: number;
  title: string;
  description: string;
  mp3_url: string;
  thumbnail: string;
  duration: number;
  likes_count: number;
  play_count: number;
  user_liked: boolean;
  user_favorited: boolean;
}

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params?.seriesId as string;
  
  const [series, setSeries] = useState<Series | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [imageError, setImageError] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  
  const { setPlaylist, currentSong, setIsOnPlayerPage, setIsMaximized } = usePlayerStore();

  // Mark that we're on the player page and set up navigation handling
  useEffect(() => {
    setIsOnPlayerPage(true);
    setIsMaximized(false); // Start non-maximized on this page
    
    return () => {
      setIsOnPlayerPage(false);
    };
  }, [setIsOnPlayerPage, setIsMaximized]);

  useEffect(() => {
    const getSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.user?.email || null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      }
    };

    getSession();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!seriesId) return;
      
      setLoading(true);
      try {
        const [seriesRes, songsRes] = await Promise.all([
          fetch(`/api/verse-song-series?id=${seriesId}`),
          fetch(`/api/verse-songs?seriesId=${seriesId}&userEmail=${userEmail || ''}`)
        ]);

        if (seriesRes.ok) {
          const data = await seriesRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setSeries(data[0]);
          }
        }

        if (songsRes.ok) {
          setSongs(await songsRes.json());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (seriesId && userEmail !== undefined) {
      fetchData();
    }
  }, [seriesId, userEmail]);

  const handlePlayComplete = async () => {
    if (selectedSong && userEmail) {
      try {
        await fetch('/api/verse-songs/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail,
            verseSongId: selectedSong.id,
            playDurationSeconds: selectedSong.duration
          })
        });
      } catch (error) {
        console.error('Error recording play:', error);
      }
    }
  };

  const handleProgress = async (seconds: number) => {
    if (selectedSong && userEmail) {
      try {
        await fetch('/api/verse-songs/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail,
            verseSongId: selectedSong.id,
            lastPositionSeconds: Math.floor(seconds),
            completed: false
          })
        });
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  const handleLike = async (songId: number, liked: boolean) => {
    if (!userEmail) {
      alert('Please log in to like songs');
      return;
    }

    try {
      if (liked) {
        await fetch('/api/verse-songs/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail, verseSongId: songId })
        });
      } else {
        await fetch(`/api/verse-songs/likes?userEmail=${userEmail}&verseSongId=${songId}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleFavorite = async (songId: number, favorited: boolean) => {
    if (!userEmail) {
      alert('Please log in to save favorites');
      return;
    }

    try {
      if (favorited) {
        await fetch('/api/verse-songs/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail, verseSongId: songId })
        });
      } else {
        await fetch(`/api/verse-songs/favorites?userEmail=${userEmail}&verseSongId=${songId}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleSongPlay = (song: Song) => {
    // Convert to PlayerSong format and set in global store
    const playerSongs: PlayerSong[] = songs.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      mp3_url: s.mp3_url,
      thumbnail: s.thumbnail,
      duration: s.duration,
      series_title: series?.title,
      series_id: series?.id
    }));
    
    const currentIndex = songs.findIndex(s => s.id === song.id);
    setPlaylist(playerSongs, currentIndex, series?.id);
    setIsMaximized(true);
    
    // Scroll to player section
    setTimeout(() => {
      const playerElement = document.getElementById('now-playing');
      if (playerElement) {
        playerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  
  // Sync selected song with global player
  useEffect(() => {
    if (currentSong) {
      const song = songs.find(s => s.id === currentSong.id);
      if (song) {
        setSelectedSong(song);
        setActiveSongId(song.id);
      }
    }
  }, [currentSong, songs]);

  const handleNext = () => {
    // Handled by global store
  };

  const handlePrevious = () => {
    // Handled by global store
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center relative" style={{ backgroundImage: `url('https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/player-background_jpg.jpeg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative z-10 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 animate-bounce text-purple-400" />
          <p className="text-xl">Loading series...</p>
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center relative" style={{ backgroundImage: `url('https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/player-background_jpg.jpeg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative z-10 text-center">
          <p className="text-xl mb-4">Series not found</p>
          <Link href="/verse-songs" className="text-purple-400 hover:text-purple-300">
            Back to Verse-Songs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative" style={{ backgroundImage: `url('https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/player-background_jpg.jpeg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-950/75 z-0" />

      {/* Header */}
      <div className="relative z-10 bg-slate-900/60 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/verse-songs"
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition"
          >
            <ArrowLeft size={20} />
            Back to Verse-Songs
          </Link>

          <div className="flex gap-6 items-start">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-600 to-indigo-700">
              {series.thumbnail && !imageError ? (
                <Image
                  src={series.thumbnail}
                  alt={series.title}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music size={48} className="text-white opacity-60" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{series.title}</h1>
              <p className="text-slate-300 text-lg mb-3">{series.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="bg-purple-600 px-3 py-1 rounded-full">
                  🎵 {songs.length} {songs.length === 1 ? 'Song' : 'Songs'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Current Player */}
        {selectedSong && (
          <div className="mb-12" id="now-playing">
            <h2 className="text-2xl font-bold mb-4">Now Playing</h2>
            <VerseSongPlayer
              songId={selectedSong.id}
              title={selectedSong.title}
              duration={selectedSong.duration}
              mp3Url={selectedSong.mp3_url}
              thumbnail={selectedSong.thumbnail}
              description={selectedSong.description}
              onPlayComplete={handlePlayComplete}
              onProgress={handleProgress}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          </div>
        )}

        {/* All Songs */}
        {songs.length > 0 ? (
          <div>
            <h2 className="text-3xl font-bold mb-6">All Episodes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {songs.map(song => (
                <VerseSongCard
                  key={song.id}
                  id={song.id}
                  title={song.title}
                  description={song.description}
                  thumbnail={song.thumbnail}
                  duration={song.duration}
                  likesCount={song.likes_count}
                  playCount={song.play_count}
                  userLiked={song.user_liked}
                  userFavorited={song.user_favorited}
                  onPlay={() => handleSongPlay(song)}
                  onLike={handleLike}
                  onFavorite={handleFavorite}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <Music className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <p className="text-xl text-slate-400">No songs in this series yet</p>
          </div>
        )}
      </main>
    </div>
  );
}
