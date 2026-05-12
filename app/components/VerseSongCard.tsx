'use client';

import { useState } from 'react';
import { Heart, Bookmark, Play, Music, Pause } from 'lucide-react';
import { usePlayerStore } from '@/app/store/playerStore';
import Image from 'next/image';

interface VerseSongCardProps {
  id: number;
  title: string;
  description?: string;
  thumbnail: string;
  duration?: number;
  likesCount?: number;
  playCount?: number;
  userLiked?: boolean;
  userFavorited?: boolean;
  onPlay: () => void;
  onLike: (id: number, liked: boolean) => void;
  onFavorite: (id: number, favorited: boolean) => void;
}

export default function VerseSongCard({
  id,
  title,
  description,
  thumbnail,
  duration,
  likesCount = 0,
  playCount = 0,
  userLiked = false,
  userFavorited = false,
  onPlay,
  onLike,
  onFavorite
}: VerseSongCardProps) {
  const [isLiked, setIsLiked] = useState(userLiked);
  const [isFavorited, setIsFavorited] = useState(userFavorited);
  const [likeCount, setLikeCount] = useState(likesCount);
  const [imageError, setImageError] = useState(false);
  
  const { currentSong, isPlaying, setMiniPlayer } = usePlayerStore();
  const isCurrentSong = currentSong?.id === id;

  const minutes = duration ? Math.floor(duration / 60) : 0;
  const seconds = duration ? duration % 60 : 0;

  const handleLike = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(newLiked ? likeCount + 1 : Math.max(0, likeCount - 1));
    onLike(id, newLiked);
  };

  const handleFavorite = () => {
    const newFavorited = !isFavorited;
    setIsFavorited(newFavorited);
    onFavorite(id, newFavorited);
  };

  const handlePlay = () => {
    onPlay();
    setMiniPlayer(false); // Keep full player visible when playing from card
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative w-full aspect-square bg-slate-700 overflow-hidden group">
        {thumbnail && !imageError ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700">
            <div className="text-center text-white">
              <Music size={48} strokeWidth={1.5} className="mx-auto opacity-80" />
            </div>
          </div>
        )}
        
        {/* Always Visible Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handlePlay}
            className={`p-3 rounded-full shadow-lg transform hover:scale-110 transition-all backdrop-blur-sm ${
              isCurrentSong && isPlaying
                ? 'bg-green-600/90 hover:bg-green-700 animate-pulse'
                : 'bg-purple-600/90 hover:bg-purple-700'
            }`}
            aria-label={isCurrentSong && isPlaying ? 'Now Playing' : 'Play song'}
          >
            {isCurrentSong && isPlaying ? (
              <Pause size={24} fill="white" className="text-white" />
            ) : (
              <Play size={24} fill="white" className="text-white" />
            )}
          </button>
        </div>

        {/* Duration Badge */}
        {duration && (
          <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs text-white font-medium">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h3 className="text-white font-semibold truncate text-sm mb-1">{title}</h3>
        
        {description && (
          <p className="text-slate-300 text-xs mb-2 line-clamp-1">{description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-1 mb-2 text-slate-400 text-xs">
          <span>❤️ {likeCount}</span>
          <span>•</span>
          <span>🎵 {playCount}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <button
            onClick={handleLike}
            className={`flex-1 py-1 px-2 rounded text-xs flex items-center justify-center gap-1 transition ${
              isLiked
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={12} fill={isLiked ? 'white' : 'none'} />
            {isLiked && <span>Liked</span>}
          </button>

          <button
            onClick={handleFavorite}
            className={`flex-1 py-1 px-2 rounded text-xs flex items-center justify-center gap-1 transition ${
              isFavorited
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Bookmark size={12} fill={isFavorited ? 'white' : 'none'} />
            {isFavorited && <span>Saved</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
