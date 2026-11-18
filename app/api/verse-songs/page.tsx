"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// app/verse-songs/page.tsx — REDESIGNED, front-page colours + WORKING PLAYER
// Ivory #faf8f2 / emerald #1d4035 / #17372f / gold #e9c981 / #a9852e
// Logo: /assets/PrayRead-logo.png (same as front page)
// FIX: old page sent Play clicks to a global floating player that is not
// wired in layout, so clicks did nothing. This page owns its own player:
// an <audio> element + floating bar at the bottom of THIS page.
// Play -> sets audio.src from song.mp3_url (falls back to audio_url /
// file_url / audio) -> audio.play() -> logs the play in the background
// (logging never blocks playback). If the song has no audio URL, the
// button shows "No audio file yet" instead of silently doing nothing.
// Paste into app/verse-songs/page.tsx (Select All -> Delete -> Paste -> Commit).

type Song = {
  id: number | string;
  title?: string;
  name?: string;
  description?: string;
  mp3_url?: string;
  audio_url?: string;
  file_url?: string;
  audio?: string;
  url?: string;
  thumbnail?: string;
  cover?: string;
  image?: string;
  duration?: string | number;
  play_count?: number;
  likes?: number;
  like_count?: number;
  series_id?: number | string;
  series_name?: string;
  series_title?: string;
  series?: string;
  book_name?: string;
};

function getAudioUrl(s: Song): string {
  return s.mp3_url || s.audio_url || s.file_url || s.audio || s.url || '';
}
function getTitle(s: Song): string {
  return s.title || s.name || 'Untitled Song';
}
function getSeriesName(s: Song): string {
  return s.series_name || s.series_title || s.series || s.book_name || 'Verse Songs';
}
function getSeriesId(s: Song): string {
  return String(s.series_id ?? getSeriesName(s));
}
function fmtDuration(v: Song['duration']): string {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'number') {
    const m = Math.floor(v / 60);
    const sec = v % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return String(v);
}

export default function VerseSongsPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [playerMsg, setPlayerMsg] = useState('');

  // Player state — lives in THIS page, not in a global player.
  const [current, setCurrent] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const PAGE_SIZE = 12;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        // Try the list endpoints in order — different deploys used different ones.
        let data: any = null;
        for (const url of ['/api/verse-songs', '/api/verse-songs/all', '/api/verse-songs/list']) {
          try {
            const r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) continue;
            const j = await r.json();
            const arr = Array.isArray(j) ? j : j.songs || j.data || j.verseSongs || null;
            if (arr && Array.isArray(arr) && arr.length > 0) { data = arr; break; }
            if (arr && Array.isArray(arr)) { data = arr; break; }
          } catch { /* try next */ }
        }
        setSongs(Array.isArray(data) ? data : []);
      } catch {
        setLoadError('Could not load songs. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const seriesList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const s of songs) {
      const id = getSeriesId(s);
      const name = getSeriesName(s);
      const prev = map.get(id);
      map.set(id, { id, name, count: (prev?.count || 0) + 1 });
    }
    return Array.from(map.values());
  }, [songs]);

  const filtered = useMemo(() => {
    if (filter === 'all') return songs;
    return songs.filter((s) => getSeriesId(s) === filter);
  }, [songs, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSongs = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function logPlay(song: Song) {
    // Fire-and-forget: logging must never block playback.
    fetch('/api/verse-songs/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseSongId: song.id }),
    }).catch(() => {});
  }

  function playSong(song: Song, list?: Song[]) {
    const url = getAudioUrl(song);
    if (!url) {
      setPlayerMsg(`No audio file uploaded yet for “${getTitle(song)}”.`);
      setTimeout(() => setPlayerMsg(''), 4000);
      return;
    }
    if (list) setQueue(list);
    setCurrent(song);
    setPlayerMsg('');
    logPlay(song);
    // Set src + play on the next tick, after state renders the <audio>.
    setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      if (a.src !== url) a.src = url;
      a.play().catch(() => {
        setPlayerMsg('Tap Play again — your browser blocked autoplay.');
        setTimeout(() => setPlayerMsg(''), 4000);
      });
    }, 0);
  }

  function togglePlayPause() {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) { a.play().catch(() => {}); } else { a.pause(); }
  }

  function playNext() {
    if (!current || queue.length === 0) return;
    const idx = queue.findIndex((s) => String(s.id) === String(current.id));
    const next = queue[(idx + 1) % queue.length];
    if (next) playSong(next, queue);
  }

  function playAll() {
    if (filtered.length === 0) return;
    playSong(filtered[0], filtered);
  }

  function toggleLike(song: Song) {
    setLiked((prev) => {
      const next = new Set(prev);
      const key = String(song.id);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleSave(song: Song) {
    setSaved((prev) => {
      const next = new Set(prev);
      const key = String(song.id);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function downloadSong(song: Song) {
    const url = getAudioUrl(song);
    if (!url) {
      setPlayerMsg(`No audio file to download yet for “${getTitle(song)}”.`);
      setTimeout(() => setPlayerMsg(''), 4000);
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getTitle(song)}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen bg-[#faf8f2] text-[#22382f]">
      {/* Header — front-page colours + logo */}
      <header className="bg-[#1d4035] text-white sticky top-0 z-40 shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/assets/PrayRead-logo.png" alt="Pray-Read Bible" width={44} height={44} className="object-contain rounded" />
            <span className="font-bold text-lg leading-tight">Pray-Read Bible</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-[#e9c981]">Home</Link>
            <Link href="/about" className="hover:text-[#e9c981]">About Us</Link>
            <Link href="/verse-songs" className="bg-[#e9c981] text-[#1d4035] px-4 py-2 rounded-full font-bold">Verse Songs</Link>
            <Link href="/album-store" className="hover:text-[#e9c981]">Album Store</Link>
            <Link href="/prayer-library" className="hover:text-[#e9c981]">Prayer Library</Link>
            <Link href="/dashboard" className="hover:text-[#e9c981]">Dashboard</Link>
          </nav>
          <Link href="/dashboard" className="md:hidden text-sm font-semibold text-[#e9c981]">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        <p className="text-[11px] font-bold tracking-[2px] text-[#a9852e] uppercase">Scripture · Prayer · Community</p>
        <h1 className="text-3xl font-bold text-[#1d4035] mt-1">Verse Songs</h1>
        <p className="text-[#5a6a61] mt-1">Listen to Scripture set to music. Streaming is free.</p>

        {/* Series filter */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => { setFilter('all'); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${filter === 'all' ? 'bg-[#e9c981] text-[#1d4035]' : 'bg-white border border-[#ece4d0] text-[#1d4035]'}`}
          >
            All Songs
          </button>
          {seriesList.map((s) => (
            <button
              key={s.id}
              onClick={() => { setFilter(s.id); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${filter === s.id ? 'bg-[#e9c981] text-[#1d4035]' : 'bg-white border border-[#ece4d0] text-[#1d4035]'}`}
            >
              {s.name} · {s.count}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button onClick={playAll} disabled={filtered.length === 0} className="px-5 py-2 bg-[#e9c981] text-[#1d4035] rounded-full font-bold text-sm disabled:opacity-50">
            ▶ Play All · {filtered.length} songs
          </button>
          <Link href="/album-store" className="px-4 py-2 bg-[#1d4035] text-white rounded-full text-sm font-semibold">Album Store</Link>
        </div>

        <div className="bg-[#f3eedd] border border-[#ece4d0] rounded-xl px-5 py-4 mt-6 text-sm">
          <strong className="text-[#1d4035]">Streaming is free.</strong>{' '}
          <span className="text-[#5a6a61]">Buy the album or the full book to download any song for offline listening.</span>
        </div>

        {playerMsg && (
          <div className="bg-[#fff7e0] border border-[#e9c981] text-[#1d4035] rounded-xl px-5 py-3 mt-4 text-sm font-medium">{playerMsg}</div>
        )}

        {/* Pagination — top */}
        <div className="flex items-center justify-between mt-8 text-sm text-[#5a6a61]">
          <span>Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} songs · Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="px-3 py-1 rounded-full bg-white border border-[#ece4d0] disabled:opacity-50">← Prev</button>
            <span className="px-3 py-1 rounded-full bg-[#e9c981] text-[#1d4035] font-bold">{safePage}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="px-3 py-1 rounded-full bg-white border border-[#ece4d0] disabled:opacity-50">Next →</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <img src="/assets/PrayRead-logo.png" alt="" width={64} height={64} className="mx-auto mb-4 object-contain" />
            <p className="text-[#1d4035] font-semibold">Loading songs...</p>
          </div>
        ) : loadError ? (
          <p className="text-center py-16 text-red-600">{loadError}</p>
        ) : pageSongs.length === 0 ? (
          <p className="text-center py-16 text-[#5a6a61]">No songs in this series yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {pageSongs.map((song) => {
              const isCurrent = current && String(current.id) === String(song.id);
              const hasAudio = Boolean(getAudioUrl(song));
              return (
                <article key={String(song.id)} className="bg-white rounded-2xl shadow border border-[#ece4d0] overflow-hidden flex flex-col">
                  <div className="relative">
                    <img
                      src={song.thumbnail || song.cover || song.image || '/assets/devotional-hero.jpg'}
                      alt={getTitle(song)}
                      className="w-full h-44 object-cover"
                    />
                    <span className="absolute top-3 left-3 bg-[#e9c981] text-[#1d4035] text-xs font-bold px-3 py-1 rounded-full">{getSeriesName(song)}</span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="font-bold text-lg text-[#1d4035]">{getTitle(song)}</h2>
                    {song.description && <p className="text-sm text-[#5a6a61] mt-1 line-clamp-2">{song.description}</p>}
                    <button
                      onClick={() => (isCurrent ? togglePlayPause() : playSong(song, filtered))}
                      className={`mt-4 flex items-center gap-3 w-full px-4 py-2.5 rounded-full text-sm font-semibold ${isCurrent ? 'bg-[#1d4035] text-white' : 'bg-[#faf8f2] border border-[#ece4d0] text-[#1d4035]'}`}
                    >
                      <span className="w-8 h-8 rounded-full bg-[#e9c981] text-[#1d4035] flex items-center justify-center shrink-0">
                        {isCurrent && isPlaying ? '❚❚' : '▶'}
                      </span>
                      <span className="flex-1 text-left">{isCurrent ? (isPlaying ? 'Pause' : 'Resume') : hasAudio ? 'Play' : 'No audio file yet'}</span>
                      {fmtDuration(song.duration) && <span className="text-[#5a6a61]">{fmtDuration(song.duration)}</span>}
                    </button>
                    <p className="text-xs text-[#5a6a61] mt-3">Duration {fmtDuration(song.duration) || '—'} · ♥ {song.like_count ?? song.likes ?? 0}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => toggleLike(song)} className={`flex-1 px-3 py-2 rounded-full text-sm font-semibold ${liked.has(String(song.id)) ? 'bg-[#e9c981] text-[#1d4035]' : 'bg-[#faf8f2] border border-[#ece4d0]'}`}>♡ Like</button>
                      <button onClick={() => toggleSave(song)} className={`flex-1 px-3 py-2 rounded-full text-sm font-semibold ${saved.has(String(song.id)) ? 'bg-[#e9c981] text-[#1d4035]' : 'bg-[#faf8f2] border border-[#ece4d0]'}`}>🔖 Save</button>
                      <button onClick={() => downloadSong(song)} className="flex-1 px-3 py-2 rounded-full text-sm font-semibold bg-[#e9c981] text-[#1d4035]">⬇ Download</button>
                    </div>
                    <button onClick={() => router.push(`/verse-songs/${getSeriesId(song)}`)} className="mt-3 text-left text-sm font-bold text-[#a9852e]">Open Series →</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination — bottom */}
        <div className="flex items-center justify-between mt-8 text-sm text-[#5a6a61]">
          <span>Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} songs · Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="px-3 py-1 rounded-full bg-white border border-[#ece4d0] disabled:opacity-50">← Prev</button>
            <span className="px-3 py-1 rounded-full bg-[#e9c981] text-[#1d4035] font-bold">{safePage}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="px-3 py-1 rounded-full bg-white border border-[#ece4d0] disabled:opacity-50">Next →</button>
          </div>
        </div>
      </main>

      {/* Floating player — built into THIS page, always responds */}
      {current && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1d4035] text-white shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <img src={current.thumbnail || current.cover || current.image || '/assets/PrayRead-logo.png'} alt="" width={44} height={44} className="rounded object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{getTitle(current)}</p>
              <p className="text-xs text-[#e9c981] truncate">{getSeriesName(current)}</p>
            </div>
            <button onClick={togglePlayPause} className="w-11 h-11 rounded-full bg-[#e9c981] text-[#1d4035] font-bold text-lg shrink-0">{isPlaying ? '❚❚' : '▶'}</button>
            <button onClick={playNext} className="px-3 py-2 rounded-full bg-white/10 text-sm font-semibold shrink-0">Next →</button>
            <button onClick={() => { audioRef.current?.pause(); setCurrent(null); setIsPlaying(false); }} className="text-sm text-white/70 shrink-0">✕</button>
          </div>
          <audio
            ref={audioRef}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => playNext()}
            onError={() => { setPlayerMsg('This song file could not be played. The audio link may be broken.'); }}
            preload="metadata"
            className="hidden"
          />
        </div>
      )}
      {/* Keep the audio element mounted even when no song is selected yet, so the first Play works */}
      {!current && <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} preload="none" className="hidden" />}
    </div>
  );
}
