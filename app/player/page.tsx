'use client';

import { useEffect, useState } from 'react';
import VerseSongPlayer from '@/app/components/VerseSongPlayer';
import { usePlayerStore } from '@/app/store/playerStore';
import Link from 'next/link';
import { ArrowLeft, Music } from 'lucide-react';
import Image from 'next/image';

interface Series {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  is_featured: boolean;
  display_order: number;
}

export default function PlayerPage() {
  const { currentSong, playlist, setIsOnPlayerPage, isMaximized, setIsMaximized } = usePlayerStore();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsOnPlayerPage(true);
    setIsMaximized(true);
    return () => {
      setIsOnPlayerPage(false);
    };
  }, [setIsOnPlayerPage, setIsMaximized]);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await fetch('/api/verse-song-series');
        const data = await response.json();
        setSeries(data);
      } catch (error) {
        console.error('Error fetching series:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, []);

  const bgStyle = {
    backgroundImage: `url('https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/player-background_jpg.jpeg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!currentSong) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center relative" style={bgStyle}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-xl mb-4">No song selected</p>
          <Link href="/verse-songs" className="text-purple-300 hover:text-purple-200">
            Back to Verse-Songs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative" style={bgStyle}>
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      {/* Content above overlay */}
      <div className="relative z-10">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/verse-songs"
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600 backdrop-blur rounded-lg transition text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
      </div>

      {/* Main Container */}
      <div className="w-full">
        {/* Full Screen Player */}
        <div className="w-full min-h-screen flex items-start sm:items-center justify-center p-4 pt-20">
          <div className="w-full max-w-4xl">
            <VerseSongPlayer
              songId={currentSong.id}
              title={currentSong.title}
              duration={currentSong.duration}
              mp3Url={currentSong.mp3_url}
              thumbnail={currentSong.thumbnail}
              description={currentSong.description}
            />
          </div>
        </div>

        {/* Series Grid Below Player */}
        <div className="w-full px-4 pb-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Explore More Series</h2>
            {loading ? (
              <div className="text-center text-slate-400">Loading series...</div>
            ) : series.length === 0 ? (
              <div className="text-center text-slate-400">No series available</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {series.map((s) => (
                  <Link key={s.id} href={`/verse-songs/${s.id}`}>
                    <div className="group cursor-pointer">
                      <div className="relative bg-gradient-to-br from-purple-900 to-slate-900 rounded-lg overflow-hidden aspect-square mb-2 hover:shadow-lg transition">
                        {s.thumbnail ? (
                          <Image
                            src={s.thumbnail}
                            alt={s.title}
                            fill
                            className="object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-8 h-8 text-slate-500" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white truncate">{s.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>{/* end relative z-10 */}
    </div>
  );
}
