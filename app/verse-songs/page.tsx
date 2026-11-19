"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// app/components/GlobalVerseSongPlayer.tsx — PERSISTENT PLAYER
// Put <GlobalVerseSongPlayer /> in app/layout.tsx, OUTSIDE {children}.
// It owns the ONE <audio> element for the whole site, so music keeps
// playing when you go Home, Prayer Library, Dashboard, etc.
// Verse-songs page does NOT own audio anymore — it just dispatches:
//   window.dispatchEvent(new CustomEvent("prayread-play-song", { detail: { song, queue } }))
// This component listens for that + toggle/next/prev/seek events, and
// broadcasts state back via "prayread-player-state" so cards can show Play/Pause.

type Song = any;

function fmt(s: number) {
  if (!s || Number.isNaN(s)) return "00:00";
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function GlobalVerseSongPlayer() {
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Song[]>([]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  const songRef = useRef<Song | null>(null);
  useEffect(() => { songRef.current = song; }, [song]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [showFull, setShowFull] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  // Restore last song after refresh / navigation
  useEffect(() => {
    try {
      const raw = localStorage.getItem("prayread-current-song");
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s === "object" && (s.id || s.mp3_url)) { setSong(s); setQueue([s]); }
        else { localStorage.removeItem("prayread-current-song"); }
      }
      const q = localStorage.getItem("prayread-queue");
      if (q) {
        const parsed = JSON.parse(q);
        if (Array.isArray(parsed)) setQueue(parsed);
        else localStorage.removeItem("prayread-queue");
      }
    } catch {
      try { localStorage.removeItem("prayread-current-song"); localStorage.removeItem("prayread-queue"); } catch {}
    }
  }, []);

  const broadcast = useCallback((s: Song | null, playing: boolean, ct: number, dur: number) => {
    window.dispatchEvent(new CustomEvent("prayread-player-state", { detail: { song: s, isPlaying: playing, currentTime: ct, duration: dur } }));
  }, []);

  const playSong = useCallback((s: Song, q: Song[] = []) => {
    setSong(s);
    if (q.length) { setQueue(q); try { localStorage.setItem("prayread-queue", JSON.stringify(q)); } catch {} }
    try { localStorage.setItem("prayread-current-song", JSON.stringify(s)); } catch {}
    const a = audioRef.current;
    if (a && s?.mp3_url) {
      if (a.src !== s.mp3_url) { a.src = s.mp3_url; }
      a.play().catch(() => {});
    }
    setIsPlaying(true);
  }, []);

  // Listen for commands from ANY page (verse-songs cards, mini bar, popup)
  useEffect(() => {
    const onPlay = (e: any) => { const d = e.detail || {}; if (d.song) playSong(d.song, d.queue || queueRef.current); if (d.openFull) setShowFull(true); };
    const onToggle = () => { const a = audioRef.current; if (!a) return; if (a.paused) a.play().catch(()=>{}); else a.pause(); };
    const onNext = () => {
      const q = queueRef.current; const s = songRef.current;
      if (!q.length || !s) return;
      const idx = q.findIndex((x: any) => x.id === s.id);
      const next = q[(idx + 1) % q.length];
      if (next) playSong(next, q);
    };
    const onPrev = () => {
      const q = queueRef.current; const s = songRef.current;
      if (!q.length || !s) return;
      const idx = q.findIndex((x: any) => x.id === s.id);
      const prev = q[(idx - 1 + q.length) % q.length];
      if (prev) playSong(prev, q);
    };
    const onSeek = (e: any) => { const a = audioRef.current; if (a && typeof e.detail?.time === "number") { a.currentTime = e.detail.time; setCurrentTime(e.detail.time); } };
    const onClose = () => { const a = audioRef.current; if (a) { a.pause(); a.src = ""; } setSong(null); setIsPlaying(false); setShowFull(false); try { localStorage.removeItem("prayread-current-song"); } catch {} };
    window.addEventListener("prayread-play-song", onPlay);
    window.addEventListener("prayread-toggle", onToggle as any);
    window.addEventListener("prayread-next", onNext as any);
    window.addEventListener("prayread-prev", onPrev as any);
    window.addEventListener("prayread-seek", onSeek as any);
    window.addEventListener("prayread-close", onClose as any);
    return () => {
      window.removeEventListener("prayread-play-song", onPlay);
      window.removeEventListener("prayread-toggle", onToggle as any);
      window.removeEventListener("prayread-next", onNext as any);
      window.removeEventListener("prayread-prev", onPrev as any);
      window.removeEventListener("prayread-seek", onSeek as any);
      window.removeEventListener("prayread-close", onClose as any);
    };
  }, [playSong]);

  // Keep volume / speed in sync
  useEffect(() => { const a = audioRef.current; if (a) { a.volume = volume; a.playbackRate = speed; } }, [volume, speed]);

  // DO NOT early-return a different <audio> here — that used to swap the
  // audio element mid-play and instantly pause the song. One <audio> always,
  // UI below is conditional on song existing.

  const seekTo = (t: number) => { const a = audioRef.current; if (a) { a.currentTime = t; setCurrentTime(t); } };

  return (
    <>
      <audio
        ref={audioRef}
        onPlay={() => { setIsPlaying(true); broadcast(song, true, currentTime, duration); }}
        onPause={() => { setIsPlaying(false); broadcast(song, false, currentTime, duration); }}
        onTimeUpdate={() => { const a = audioRef.current; if (a) { setCurrentTime(a.currentTime); broadcast(song, !a.paused, a.currentTime, a.duration || duration); } }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration || song?.duration || 0); }}
        onEnded={() => {
          if (repeat) { const a = audioRef.current; if (a) { a.currentTime = 0; a.play().catch(()=>{}); } return; }
          if (!queue.length) return;
          if (!song) return;
          const idx = queue.findIndex((x: any) => x.id === song.id);
          const next = shuffle ? queue[Math.floor(Math.random() * queue.length)] : queue[(idx + 1) % queue.length];
          if (next) playSong(next, queue);
        }}
        onError={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* MINI BAR — visible on EVERY page */}
      {song && !showFull && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/85 backdrop-blur-xl text-[#fdf6e3] border-t border-[#e9c981]/30 shadow-[0_-8px_40px_rgba(0,0,0,0.45)]">
          <div className="h-1 bg-white/20 cursor-pointer" onClick={(e) => { const r = (e.target as HTMLElement).getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * (duration || 0)); }}>
            <div className="h-full bg-[#e9c981]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
          <div className="flex items-center gap-3 px-3 sm:px-5 py-2.5 max-w-6xl mx-auto">
            <img src={song.thumbnail || "/assets/PrayRead-logo.png"} alt="" width={44} height={44} className="rounded object-cover shrink-0" />
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowFull(true)}>
              <p className="font-bold truncate text-[#fdf6e3]">{song.title}</p>
              <p className="text-xs text-[#f5e9c8]/70 truncate">{song.series_title || "Verse Songs"} · {fmt(currentTime)} / {fmt(duration)}</p>
            </div>
            <button onClick={() => setShowFull(true)} className="hidden sm:block px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold whitespace-nowrap">▲ Full player</button>
            <button onClick={() => window.dispatchEvent(new Event("prayread-toggle"))} className="w-11 h-11 rounded-full bg-[#e9c981] text-[#1a1a1a] font-bold text-lg shrink-0">{isPlaying ? "❚❚" : "▶"}</button>
            <button onClick={() => { if (!song) return;
          const idx = queue.findIndex((x: any) => x.id === song.id); const n = queue[(idx + 1) % queue.length]; if (n) playSong(n, queue); }} className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold whitespace-nowrap">Next →</button>
            <button onClick={() => window.dispatchEvent(new Event("prayread-close"))} className="text-[#f5e9c8]/70 text-lg px-1">✕</button>
          </div>
        </div>
      )}

      {/* FULL PLAYER — also global, opens from mini bar on ANY page */}
      {song && showFull && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6" onClick={() => setShowFull(false)}>
          <div className="bg-black/85 backdrop-blur-2xl text-[#fdf6e3] w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#e9c981]/30" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img src="/assets/PrayRead-logo.png" alt="" width={36} height={36} className="object-contain rounded shrink-0" />
                <div className="min-w-0"><p className="font-bold truncate">Now Playing</p><p className="text-xs text-[#e9c981]">Verse Songs · Pray-Read Bible</p></div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setShowFull(false)} className="px-3 py-1.5 rounded-full bg-white/10 text-sm whitespace-nowrap">Minimise ↓</button>
                <button onClick={() => window.dispatchEvent(new Event("prayread-close"))} className="px-3 py-1.5 rounded-full bg-white/10 text-sm">✕ Close</button>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col sm:flex-row gap-5">
                <img src={song.thumbnail || "/assets/PrayRead-logo.png"} alt={song.title} className="w-full sm:w-56 h-56 object-cover rounded-2xl border border-[#e9c981]/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold tracking-[2px] text-[#e9c981] uppercase">{song.series_title || "Verse Songs"}</p>
                  <h2 className="text-2xl font-bold text-[#fdf6e3] leading-snug">{song.title}</h2>
                  {song.description && <p className="text-sm text-[#f5e9c8]/80 mt-2 line-clamp-3">{song.description}</p>}
                </div>
              </div>
              <div className="mt-5">
                <div className="h-2 bg-white/20 rounded-full cursor-pointer" onClick={(e) => { const r = (e.target as HTMLElement).getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * (duration || 0)); }}>
                  <div className="h-full bg-[#e9c981] rounded-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs text-[#f5e9c8]/70 mt-1"><span>{fmt(currentTime)}</span><span>{fmt(duration)}</span></div>
              </div>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => setShuffle(!shuffle)} className={`w-11 h-11 rounded-full text-lg ${shuffle ? "bg-[#e9c981] text-[#1a1a1a]" : "bg-white/10"}`}>⇄</button>
                <button onClick={() => window.dispatchEvent(new Event("prayread-prev"))} className="w-12 h-12 rounded-full bg-white/10 text-xl">⏮</button>
                <button onClick={() => window.dispatchEvent(new Event("prayread-toggle"))} className="w-16 h-16 rounded-full bg-[#e9c981] text-[#1a1a1a] text-2xl font-bold">{isPlaying ? "❚❚" : "▶"}</button>
                <button onClick={() => window.dispatchEvent(new Event("prayread-next"))} className="w-12 h-12 rounded-full bg-white/10 text-xl">⏭</button>
                <button onClick={() => setRepeat(!repeat)} className={`w-11 h-11 rounded-full text-lg ${repeat ? "bg-[#e9c981] text-[#1a1a1a]" : "bg-white/10"}`}>↻</button>
              </div>
              <p className="text-center text-xs text-[#f5e9c8]/70 mt-2">{repeat ? "Repeat on" : "Repeat off"}{shuffle ? " · Shuffle on" : ""}</p>
              <div className="flex items-center gap-3 mt-4 bg-white/10 rounded-2xl px-4 py-3">
                <span>🔊</span>
                <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1" />
                <span className="text-xs w-10 text-right">{Math.round(volume * 100)}%</span>
                <button onClick={() => setSpeed(speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : 1)} className="px-3 py-1.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-xs font-bold whitespace-nowrap">{speed}× speed</button>
                <button onClick={() => setShowQueue(!showQueue)} className="px-3 py-1.5 rounded-full bg-black/70 border border-[#e9c981]/30 text-xs font-bold whitespace-nowrap">{showQueue ? "Hide list ↑" : "Show list ↓"} · {queue.length}</button>
              </div>
              {showQueue && (
                <div className="mt-5">
                  <h3 className="font-bold text-[#fdf6e3] mb-2">Up next — tap any song to play</h3>
                  <div className="bg-black/70 border border-[#e9c981]/30 rounded-2xl divide-y divide-[#e9c981]/20 max-h-72 overflow-y-auto">
                    {(Array.isArray(queue) ? queue : []).map((q: any, i: number) => {
                      const active = q.id === song.id;
                      return (
                        <button key={q.id} onClick={() => playSong(q, queue)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${active ? "bg-[#e9c981]" : "hover:bg-black/50"}`}>
                          <span className={`text-xs w-6 shrink-0 ${active ? "text-[#1a1a1a]" : "text-[#f5e9c8]/70"}`}>{active && isPlaying ? "♫" : `${i + 1}.`}</span>
                          <img src={q.thumbnail || "/assets/PrayRead-logo.png"} alt="" width={40} height={40} className="rounded object-cover shrink-0" />
                          <span className="flex-1 min-w-0"><span className={`block truncate font-semibold ${active ? "text-[#1a1a1a]" : "text-[#fdf6e3]"}`}>{q.title}</span><span className={`block text-xs truncate ${active ? "text-[#1a1a1a]/70" : "text-[#f5e9c8]/70"}`}>{q.series_title || "Verse Songs"}</span></span>
                          <span className={`text-xs tabular-nums shrink-0 ${active ? "text-[#1a1a1a]" : "text-[#f5e9c8]/70"}`}>{fmt(q.duration)}</span>
                          {active && <span className="text-xs font-bold text-[#1a1a1a] shrink-0">Playing</span>}
                        </button>
                      );
                    })}
                    {queue.length === 0 && <p className="px-4 py-4 text-sm text-[#f5e9c8]/70">No songs in this queue yet.</p>}
                  </div>
                </div>
              )}
              <button onClick={() => router.push("/verse-songs")} className="mt-5 w-full py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] font-bold text-sm">Go to Verse Songs →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
