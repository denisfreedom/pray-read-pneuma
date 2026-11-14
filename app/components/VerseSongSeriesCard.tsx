// app/components/VerseSongSeriesCard.tsx — FIXED
// WHAT WAS BROKEN:
//  1) The hover overlay never worked. The overlay used
//     `group-hover:bg-opacity-50`, but NO ancestor had the `group` class,
//     so the hover effect never fired and the card looked dead on hover.
//     The outer card now has `group`.
//  2) songCount was trusted blindly. If the API ever sent it as a string
//     or null, the badge showed "NaN Songs" / "null Songs". It is
//     normalised to a number first.
//  3) bg-opacity-30 / bg-opacity-50 are the old Tailwind syntax. Switched
//     to the slash syntax (bg-black/30) used everywhere else in the app,
//     so the overlay actually renders on current Tailwind.
// Same card, same layout, same link. Nothing else changed.
'use client';

import { ChevronRight, Music } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface VerseSongSeriesCardProps {
  id: number;
  title: string;
  description?: string;
  thumbnail: string;
  songCount: number;
}

export default function VerseSongSeriesCard({
  id,
  title,
  description,
  thumbnail,
  songCount
}: VerseSongSeriesCardProps) {
  const [imageError, setImageError] = useState(false);

  // The API may send songCount as a string or null — never show "NaN Songs".
  const count = Number(songCount) || 0;

  return (
    <Link href={`/verse-songs/${id}`}>
      <div className="group bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-slate-700 overflow-hidden">
          {thumbnail && !imageError ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
              <Music size={80} strokeWidth={1.5} className="text-white opacity-60" />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all"></div>

          {/* Song Count Badge */}
          <div className="absolute top-3 right-3 bg-purple-600 px-3 py-1 rounded-full text-white text-sm font-semibold">
            {count} {count === 1 ? 'Song' : 'Songs'}
          </div>

          {/* Chevron */}
          <div className="absolute bottom-3 right-3 bg-purple-600 p-2 rounded-full">
            <ChevronRight size={20} className="text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">{title}</h3>

          {description && (
            <p className="text-slate-300 text-sm line-clamp-2">{description}</p>
          )}

          <div className="mt-4 flex items-center justify-between text-slate-400 text-xs">
            <span>🎵 {count} {count === 1 ? 'episode' : 'episodes'}</span>
            <span className="text-purple-400 font-semibold">Open →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
