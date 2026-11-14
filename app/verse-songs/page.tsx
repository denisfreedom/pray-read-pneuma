// app/verse-songs/page.tsx — LIBRARY REDESIGNED (elegant + paid download)
// WHAT WAS BROKEN (see screenshot): each card rendered the BROWSER'S native
// <audio controls>. That looks dated, and the browser itself adds a free
// "Download" menu item to it that no code can remove. Every card now has a
// custom elegant mini-player — custom play/pause, custom progress bar,
// custom time — with NO native controls and NO free download anywhere.
// DOWNLOADS ARE PAID: every song's Download button opens the Pesapal store.
// Streaming stays free.
// Same data, same tabs, same like/favorite/play/progress wiring. Only the
// player chrome and the download model changed.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Heart, Bookmark, Lock, Music, ChevronRight } from 'lucide-react';

// Paid downloads — every Download button on every song goes here.
const PESAPAL_URL = 'https://store.pesapal.com/donatetoprayreadbibleproject';

interface Series { id: number; title: string; description?: string; thumbnail?: string; }
interface Song {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  mp3_url: string;
  duration: number;
  series_id: number;
  series_title?: string;
  likes_count: number;
  play_count: number;
  user_liked: boolean;
  user_favorited: boolean;
}

function normDuration(v: any): number {
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).trim();
  const m = s.match(/^(?:(\d+):)?(\d+):(\d{2})$/);
  if (m) return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function VerseSongsLibraryPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  // Mini-player state — one audio element per card, only one plays at once.
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [times, setTimes] = useState<Record<number, number>>({});
  const lastSavedRef = useRef<Record<number, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const s = await fetch('/api/auth/session').then(r => r.ok ? r.json() : null).catch(() => null);
        const email = s?.user?.email || s?.email || '';
        if (email) setUserEmail(email);
        const [seriesRes, songsRes] = await Promise.all([
          fetch('/api/verse-songs/series'),
          fetch(`/api/verse-songs/songs${email ? `?userEmail=${encodeURIComponent(email)}` : ''}`),
        ]);
        const seriesData = seriesRes.ok ? await seriesRes.json() : [];
        const songsData = songsRes.ok ? await songsRes.json() : [];
        const seriesList = Array.isArray(seriesData) ? seriesData : (seriesData.series || []);
        const songList = Array.isArray(songsData) ? songsData : (songsData.songs || []);
        setSeries(seriesList);
        setSongs(songList.map((sg: any) => ({
          id: Number(sg.id),
          title: sg.title || 'Untitled',
          description: sg.description || '',
          thumbnail: sg.thumbnail || sg.thumbnail_url || '',
          mp3_url: sg.mp3_url || sg.audio_url || '',
          duration: normDuration(sg.duration),
          series_id: Number(sg.series_id ?? sg.seriesId ?? 0),
          series_title: sg.series_title || sg.seriesTitle || '',
          likes_count: Number(sg.likes_count ?? sg.likesCount ?? 0) || 0,
          play_count: Number(sg.play_count ?? sg.playCount ?? 0) || 0,
          user_liked: !!sg.user_liked || !!sg.userLiked,
          user_favorited: !!sg.user_favorited || !!sg.userFavorited,
        })));
      } catch (e) { console.error('Library load error:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  // Pause every other card's audio when a new one starts.
  const pauseOthers = (exceptId: number) => {
    audioRefs.current.forEach((audio, id) => { if (id !== exceptId) audio.pause(); });
  };

  const togglePlay = (song: Song) => {
    const audio = audioRefs.current.get(song.id);
    if (!audio) return;
    if (playingId === song.id) { audio.pause(); setPlayingId(null); return; }
    pauseOthers(song.id);
    audio.play().catch(() => {});
    setPlayingId(song.id);
  };

  // Save progress, throttled to once per 5 seconds per song.
  const saveProgress = async (song: Song, seconds: number, completed: boolean) => {
    if (!userEmail) return;
    const now = Date.now();
    if (!completed && now - (lastSavedRef.current[song.id] || 0) < 5000) return;
    lastSavedRef.current[song.id] = now;
    try {
      await fetch('/api/verse-songs/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, last_position_seconds: Math.floor(seconds), completed }),
      });
    } catch { /* progress is best-effort */ }
  };

  const handleEnded = async (song: Song) => {
    setPlayingId(null);
    setTimes(t => ({ ...t, [song.id]: 0 }));
    await saveProgress(song, normDuration(song.duration), true);
    try {
      await fetch('/api/verse-songs/play', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail }),
      });
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, play_count: s.play_count + 1 } : s));
    } catch { /* play count is best-effort */ }
  };

  const handleLike = async (song: Song) => {
    const liked = !song.user_liked;
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_liked: liked, likes_count: Math.max(0, s.likes_count + (liked ? 1 : -1)) } : s));
    if (!userEmail) return;
    try {
      const res = await fetch('/api/verse-songs/likes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, liked }),
      });
      if (!res.ok) throw new Error('like failed');
    } catch {
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_liked: !liked, likes_count: Math.max(0, s.likes_count + (liked ? -1 : 1)) } : s));
    }
  };

  const handleFavorite = async (song: Song) => {
    const favorited = !song.user_favorited;
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_favorited: favorited } : s));
    if (!userEmail) return;
    try {
      const res = await fetch('/api/verse-songs/favorites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseSongId: song.id, userEmail, favorited }),
      });
      if (!res.ok) throw new Error('favorite failed');
    } catch {
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, user_favorited: !favorited } : s));
    }
  };

  // Paid download — every song's Download button comes here.
  const handlePaidDownload = () => {
    window.open(PESAPAL_URL, '_blank', 'noopener,noreferrer');
  };

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    songs.forEach(s => { c[s.series_id] = (c[s.series_id] || 0) + 1; });
    return c;
  }, [songs]);

  const filtered = activeTab === 'all' ? songs : songs.filter(s => s.series_id === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120e2b] flex items-center justify-center">
        <p className="text-white/60">Loading verse songs…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120e2b] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === 'all' ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            All Songs
          </button>
          {series.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === s.id ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              {s.title} · {counts[s.id] || 0}
            </button>
          ))}
        </div>

        {/* Monetisation banner — streaming free, downloads paid */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/15 via-amber-400/5 to-transparent px-5 py-4">
          <p className="text-sm text-amber-100">
            <span className="font-bold text-amber-300">Streaming is free.</span>{' '}
            Buy the album or the full book to download any song for offline listening.
          </p>
          <button onClick={handlePaidDownload} className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95">
            <Lock className="w-4 h-4" /> Buy to Download
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No songs in this series yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(song => {
              const t = times[song.id] || 0;
              const pct = song.duration > 0 ? (t / song.duration) * 100 : 0;
              const isPlaying = playingId === song.id;
              return (
                <article key={song.id} className="group bg-[#1d1840] rounded-3xl overflow-hidden border border-white/10 shadow-xl hover:shadow-2xl hover:border-amber-400/30 transition-all">
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-video bg-slate-800 overflow-hidden">
                    {song.thumbnail ? (
                      <Image src={song.thumbnail} alt={song.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
                        <Music size={64} strokeWidth={1.5} className="text-white opacity-60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {song.series_title && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold shadow">{song.series_title}</span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg leading-snug mb-1 line-clamp-1">{song.title}</h3>
                    {song.description && <p className="text-white/60 text-sm line-clamp-2 mb-3">{song.description}</p>}

                    {/* ── Elegant mini-player (custom — NO native controls,
                         NO browser Download menu) ── */}
                    <div className="rounded-2xl bg-black/30 border border-white/10 px-3 py-2.5 mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePlay(song)}
                          className={`shrink-0 p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 ${isPlaying ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40' : 'bg-white text-slate-950'}`}
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                        </button>
                        <span className="text-xs font-medium tabular-nums text-white/70 w-11">{fmt(t)}</span>
                        <input
                          type="range" min="0" max={song.duration || 0} value={t}
                          onChange={(e) => {
                            const audio = audioRefs.current.get(song.id);
                            const v = parseFloat(e.target.value);
                            if (audio) audio.currentTime = v;
                            setTimes(prev => ({ ...prev, [song.id]: v }));
                          }}
                          className="flex-1 h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer slider-gold"
                          style={{ background: `linear-gradient(to right, #fbbf24 0%, #f59e0b ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)` }}
                          aria-label="Seek"
                        />
                        <span className="text-xs font-medium tabular-nums text-white/70 w-11 text-right">{fmt(song.duration)}</span>
                      </div>
                      {/* Hidden audio — NO controls attribute, so the
                          browser never shows its own player or Download menu. */}
                      <audio
                        ref={(el) => { if (el) audioRefs.current.set(song.id, el); else audioRefs.current.delete(song.id); }}
                        src={song.mp3_url}
                        preload="metadata"
                        onTimeUpdate={(e) => {
                          const cur = e.currentTarget.currentTime;
                          setTimes(prev => ({ ...prev, [song.id]: cur }));
                          saveProgress(song, cur, false);
                        }}
                        onEnded={() => handleEnded(song)}
                      />
                    </div>

                    {/* Stats + actions */}
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                      <span>Duration {fmt(song.duration)} · ❤ {song.likes_count}</span>
                      {song.user_favorited && <span className="text-amber-300 font-semibold">★ Saved</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleLike(song)} className={`flex-1 py-2 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition ${song.user_liked ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Heart size={13} fill={song.user_liked ? 'white' : 'none'} /> {song.user_liked ? 'Liked' : 'Like'}
                      </button>
                      <button onClick={() => handleFavorite(song)} className={`flex-1 py-2 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition ${song.user_favorited ? 'bg-amber-400 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Bookmark size={13} fill={song.user_favorited ? 'currentColor' : 'none'} /> {song.user_favorited ? 'Saved' : 'Save'}
                      </button>
                      {/* PAID DOWNLOAD — every song */}
                      <button onClick={handlePaidDownload} className="flex-1 py-2 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1 bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95" title="Buy the album or the full book to download this song">
                        <Lock size={13} /> Download
                      </button>
                    </div>

                    <Link href={`/verse-songs/${song.series_id}`} className="mt-4 flex items-center justify-between text-sm text-amber-300 hover:text-amber-200 font-semibold">
                      Open Series <ChevronRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .slider-gold::-webkit-slider-thumb {
          appearance: none; width: 14px; height: 14px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.6);
          border: 2px solid #fff7ed;
        }
        .slider-gold::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #fbbf24; cursor: pointer;
          border: 2px solid #fff7ed;
        }
      `}</style>
    </div>
  );
}
