'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  label?: string;
  theme?: 'light' | 'sepia' | 'dark';
  variant?: 'intro' | 'prayer' | 'passage';
}

export default function AudioPlayer({ src, label, theme = 'light', variant = 'intro' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => { setDuration(audio.duration); setLoaded(true); };
    const onEnded = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const toggleMute = () => {
    if (audioRef.current) { audioRef.current.muted = !muted; setMuted(!muted); }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Color palette per variant + theme
  const colorMap: Record<string, Record<string, string>> = {
    intro: {
      light: 'from-indigo-500/10 to-blue-500/10 border-indigo-200 text-indigo-700 ring-indigo-400',
      sepia: 'from-blue-600/10 to-blue-400/10 border-blue-300 text-blue-800 ring-blue-400',
      dark:  'from-indigo-700/30 to-blue-700/30 border-indigo-600 text-indigo-300 ring-indigo-500',
    },
    prayer: {
      light: 'from-purple-500/10 to-pink-500/10 border-purple-200 text-purple-700 ring-purple-400',
      sepia: 'from-purple-600/10 to-pink-400/10 border-purple-300 text-purple-800 ring-purple-400',
      dark:  'from-purple-700/30 to-pink-700/30 border-purple-600 text-purple-300 ring-purple-500',
    },
    passage: {
      light: 'from-amber-500/10 to-orange-400/10 border-amber-200 text-amber-700 ring-amber-400',
      sepia: 'from-amber-500/10 to-orange-400/10 border-amber-300 text-amber-800 ring-amber-400',
      dark:  'from-amber-700/30 to-orange-700/30 border-amber-600 text-amber-300 ring-amber-500',
    },
  };

  const c = colorMap[variant][theme] || colorMap[variant].light;
  const [grad, border, textColor, ringColor] = c.split(' ');

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  const btnBg: Record<string, string> = {
    intro:   theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700',
    prayer:  theme === 'dark' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-700',
    passage: theme === 'dark' ? 'bg-amber-600 hover:bg-amber-500'  : 'bg-amber-600 hover:bg-amber-700',
  };

  return (
    <div className={`w-full rounded-xl border bg-gradient-to-r ${grad} ${border} backdrop-blur-sm px-3 py-2.5 mt-3`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {label && (
        <p className={`text-xs font-semibold mb-2 ${textColor} flex items-center gap-1`}>
          🎵 {label}
        </p>
      )}

      <div className="flex items-center gap-2">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className={`flex-shrink-0 w-9 h-9 rounded-full ${btnBg[variant]} text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform`}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing
            ? <Pause className="w-4 h-4 fill-white" />
            : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>

        {/* Progress bar + times */}
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={seek}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, currentColor ${progressPct}%, rgba(128,128,128,0.25) ${progressPct}%)`,
            }}
          />
          <div className={`flex justify-between text-[10px] mt-0.5 ${textColor} opacity-70`}>
            <span>{fmt(currentTime)}</span>
            <span>{loaded ? fmt(duration) : '...'}</span>
          </div>
        </div>

        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${textColor} opacity-70 hover:opacity-100`}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
