'use client';

import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

interface AudioPlayerProps {
  bookName: string;
  chapter: number;
  testament: string;
  isDark: boolean;
}

export default function AudioPlayer({ bookName, chapter, testament, isDark }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);

  const bgColor = isDark ? 'rgba(7,9,26,0.97)' : 'rgba(255,255,255,0.97)';
  const textColor = isDark ? '#f0f4ff' : '#111827';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopStyle: 'solid',
        borderTopColor: borderColor,
        background: bgColor,
        backdropFilter: 'blur(12px)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#f59e0b',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: textColor, fontWeight: 600 }}>
            {bookName} {chapter}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: isDark ? '#7285b0' : '#6b7280' }}>
            {isPlaying ? 'Playing...' : 'Audio not available'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            color: textColor,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(parseInt(e.target.value));
            if (isMuted) setIsMuted(false);
          }}
          style={{
            width: 100,
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
}
