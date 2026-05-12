'use client';

import { useState, useEffect } from 'react';
import { Music, Search, Filter, ChevronDown, Play, Heart, Bookmark, Home, X } from 'lucide-react';
import VerseSongCard from '@/app/components/VerseSongCard';
import { usePlayerStore } from '@/app/store/playerStore';
import type { PlayerSong } from '@/app/store/playerStore';
import Link from 'next/link';

interface Song {
  id: number;
  series_id: number;
  series_title: string;
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

interface Book {
  id: number;
  name_english: string;
  total_chapters: number;
  book_number: number;
}

export default function VerseSongsPage() {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [displayedSongs, setDisplayedSongs] = useState<Song[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'oldest'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  
  const { setPlaylist, setIsMaximized } = usePlayerStore();

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
      setLoading(true);
      try {
        const [songsRes, booksRes] = await Promise.all([
          fetch(`/api/verse-songs?limit=1000&userEmail=${userEmail || ''}`),
          fetch('/api/bible-books?full=true')
        ]);

        if (songsRes.ok) {
          const songs = await songsRes.json();
          setAllSongs(songs);
        }
        if (booksRes.ok) {
          const booksData = await booksRes.json();
          setBooks(booksData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail !== undefined) {
      fetchData();
    }
  }, [userEmail]);

  // Filter and sort songs
  useEffect(() => {
    let filtered = [...allSongs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.description?.toLowerCase().includes(query) ||
        song.series_title?.toLowerCase().includes(query)
      );
    }

    // Book filter (extract book from series title or description)
    if (selectedBook) {
      const selectedBookData = books.find(b => b.id === selectedBook);
      if (selectedBookData) {
        const bookName = selectedBookData.name_english.toLowerCase();
        filtered = filtered.filter(song =>
          song.series_title?.toLowerCase().includes(bookName) ||
          song.description?.toLowerCase().includes(bookName)
        );
      }
    }

    // Sort
    if (sortBy === 'trending') {
      filtered.sort((a, b) => b.play_count - a.play_count);
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => b.id - a.id); // Assuming higher ID = newer
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => a.id - b.id);
    }

    setDisplayedSongs(filtered);
  }, [searchQuery, selectedBook, sortBy, allSongs, books]);

  const handleSongPlay = (song: Song) => {
    const playerSongs: PlayerSong[] = displayedSongs.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      mp3_url: s.mp3_url,
      thumbnail: s.thumbnail,
      duration: s.duration,
      series_title: s.series_title,
      series_id: s.series_id
    }));
    
    const currentIndex = displayedSongs.findIndex(s => s.id === song.id);
    setPlaylist(playerSongs, currentIndex, song.series_id);
    setIsMaximized(true);
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

  if (loading) {
    return (
      <div
        className="min-h-screen text-white flex items-center justify-center"
        style={{
          backgroundImage: `url('https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/verse-songs-bg_jpg.jpeg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-center" style={{ background: 'rgba(10,8,40,0.7)', padding: '2rem', borderRadius: '1rem' }}>
          <Music className="w-16 h-16 mx-auto mb-4 animate-bounce text-purple-400" />
          <p className="text-xl text-purple-100">Loading Verse-Songs...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage: `url('https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/verse-songs-bg_jpg.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, rgba(10,8,30,0.82) 0%, rgba(20,10,50,0.78) 50%, rgba(10,8,30,0.88) 100%)' }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 backdrop-blur border-b border-purple-900/40" style={{ background: 'rgba(10,8,40,0.85)' }}>
        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl font-bold">Verse-Songs</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:flex px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Home
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-sm"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search songs, series, or verses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-white placeholder-slate-400 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Sort Dropdown */}
            <div className="relative sm:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'trending' | 'oldest')}
                className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="trending">Trending (Most Played)</option>
                <option value="oldest">Oldest First</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            {/* Book Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                selectedBook || showFilters
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filter by Book
              {selectedBook && <span className="text-sm bg-purple-700 px-2 py-1 rounded">1</span>}
            </button>

            {/* Active Filter Badge */}
            {selectedBook && (
              <button
                onClick={() => setSelectedBook(null)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm"
              >
                {books.find(b => b.id === selectedBook)?.name_english}
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Book Filter Dropdown */}
          {showFilters && (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setShowFilters(false);
                  }}
                  className={`p-2 rounded text-sm transition ${
                    !selectedBook ? 'bg-purple-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  All Books
                </button>
                {books.map(book => (
                  <button
                    key={book.id}
                    onClick={() => {
                      setSelectedBook(book.id);
                      setShowFilters(false);
                    }}
                    className={`p-2 rounded text-sm transition ${
                      selectedBook === book.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {book.name_english}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Results Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {displayedSongs.length > 0 ? `${displayedSongs.length} Verse-Song${displayedSongs.length !== 1 ? 's' : ''}` : 'No Songs Found'}
          </h2>
          {searchQuery && (
            <p className="text-slate-300">
              Showing results for: <span className="text-purple-400 font-semibold">"{searchQuery}"</span>
            </p>
          )}
        </div>

        {/* Songs Grid - Suno-style Card Layout */}
        {displayedSongs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayedSongs.map(song => (
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
        ) : (
          <div className="text-center py-24">
            <Music className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <p className="text-xl text-slate-400 mb-4">
              {searchQuery || selectedBook ? 'No songs match your search or filters' : 'No songs available yet'}
            </p>
            {(searchQuery || selectedBook) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBook(null);
                }}
                className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
