"use client";
import { useEffect, useRef, useState, useCallback, Component, ReactNode } from "react";

// GlobalVerseSongPlayer V3 — BULLETPROOF
// If this ever throws, the wrapper below renders null instead of blanking the whole site.
// No useRouter, no broadcast storm, one <audio> always.

type Song = any;
function fmt(s: number) {
  if (!s || Number.isNaN(s)) return "00:00";
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

class PlayerGuard extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch() {}
  render() { return this.state.crashed ? null : this.props.children; }
}

function Inner() {
  const [song, setSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [showFull, setShowFull] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Song[]>([]);
  const songRef = useRef<Song | null>(null);
  useEffect(() => { queueRef.current = Array.isArray(queue) ? queue : []; }, [queue]);
  useEffect(() => { songRef.current = song; }, [song]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("prayread-current-song");
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s === "object" && (s.id || s.mp3_url)) { setSong(s); setQueue([s]); }
      }
      const q = localStorage.getItem("prayread-queue");
      if (q) { const p = JSON.parse(q); if (Array.isArray(p)) setQueue(p); }
    } catch {}
  }, []);

  const playSong = useCallback((s: Song, q: Song[] = []) => {
    if (!s || typeof s !== "object") return;
    setSong(s);
    const list = Array.isArray(q) && q.length ? q : [s];
    setQueue(list);
    try { localStorage.setItem("prayread-queue", JSON.stringify(list)); } catch {}
    try { localStorage.setItem("prayread-current-song", JSON.stringify(s)); } catch {}
    const a = audioRef.current;
    if (a && s.mp3_url) {
      try {
        if (a.src !== s.mp3_url) a.src = s.mp3_url;
        const pr = a.play();
        if (pr && typeof pr.catch === "function") pr.catch(() => {});
      } catch {}
    }
    setIsPlaying(true);
    try { window.dispatchEvent(new CustomEvent("prayread-player-state", { detail: { song: s, isPlaying: true, currentTime: 0, duration: s.duration || 0 } })); } catch {}
  }, []);

  useEffect(() => {
    const onPlay = (e: any) => { const d = e?.detail || {}; if (d.song) playSong(d.song, d.queue || queueRef.current); if (d.openFull) setShowFull(true); };
    const onToggle = () => { const a = audioRef.current; if (!a) return; try { if (a.paused) { const pr = a.play(); if (pr && typeof pr.catch === "function") pr.catch(() => {}); } else a.pause(); } catch {} };
    const onNext = () => { const q = queueRef.current; const s = songRef.current; if (!q.length || !s) return; const idx = q.findIndex((x: any) => x && x.id === s.id); const n = q[(idx + 1) % q.length]; if (n) playSong(n, q); };
    const onPrev = () => { const q = queueRef.current; const s = songRef.current; if (!q.length || !s) return; const idx = q.findIndex((x: any) => x && x.id === s.id); const p = q[(idx - 1 + q.length) % q.length]; if (p) playSong(p, q); };
    const onSeek = (e: any) => { const a = audioRef.current; if (a && typeof e?.detail?.time === "number") { try { a.currentTime = e.detail.time; } catch {} setCurrentTime(e.detail.time); } };
    const onClose = () => { const a = audioRef.current; if (a) { try { a.pause(); a.removeAttribute("src"); a.load(); } catch {} } setSong(null); setIsPlaying(false); setShowFull(false); try { localStorage.removeItem("prayread-current-song"); } catch {} };
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

  useEffect(() => { const a = audioRef.current; if (a) { try { a.volume = volume; a.playbackRate = speed; } catch {} } }, [volume, speed]);

  const seekTo = (t: number) => { const a = audioRef.current; if (a) { try { a.currentTime = t; } catch {} setCurrentTime(t); } };
  const list = Array.isArray(queue) ? queue : [];

  return (
    <>
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => { const a = audioRef.current; if (a) setCurrentTime(a.currentTime); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration || songRef.current?.duration || 0); }}
        onEnded={() => {
          if (repeat) { const a = audioRef.current; if (a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch {} } return; }
          const q = queueRef.current; const s = songRef.current;
          if (!q.length || !s) return;
          const idx = q.findIndex((x: any) => x && x.id === s.id);
          const next = shuffle ? q[Math.floor(Math.random() * q.length)] : q[(idx + 1) % q.length];
          if (next) playSong(next, q);
        }}
        onError={() => setIsPlaying(false)}
        preload="none"
        className="hidden"
      />
      {song && !showFull && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/85 backdrop-blur-xl text-[#fdf6e3] border-t border-[#e9c981]/30">
          <div className="h-1 bg-white/20 cursor-pointer" onClick={(e) => { const r = (e.target as HTMLElement).getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * (duration || 0)); }}>
            <div className="h-full bg-[#e9c981]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
          <div className="flex items-center gap-3 px-3 sm:px-5 py-2.5 max-w-6xl mx-auto">
            <img src={song.thumbnail || "/assets/PrayRead-logo.png"} alt="" width={44} height={44} className="rounded object-cover shrink-0" />
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowFull(true)}>
              <p className="font-bold truncate text-[#fdf6e3]">{song.title || "Verse Song"}</p>
              <p className="text-xs text-[#f5e9c8]/70 truncate">{song.series_title || "Verse Songs"} · {fmt(currentTime)} / {fmt(duration)}</p>
            </div>
            <button onClick={() => setShowFull(true)} className="hidden sm:block px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold whitespace-nowrap">▲ Full player</button>
            <button onClick={() => window.dispatchEvent(new Event("prayread-toggle"))} className="w-11 h-11 rounded-full bg-[#e9c981] text-[#1a1a1a] font-bold text-lg shrink-0">{isPlaying ? "❚❚" : "▶"}</button>
            <button onClick={() => window.dispatchEvent(new Event("prayread-next"))} className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold whitespace-nowrap">Next →</button>
            <button onClick={() => window.dispatchEvent(new Event("prayread-close"))} className="text-[#f5e9c8]/70 text-lg px-1">✕</button>
          </div>
        </div>
      )}
      {song && showFull && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6" onClick={() => setShowFull(false)}>
          <div className="bg-black/85 backdrop-blur-2xl text-[#fdf6e3] w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#e9c981]/30" onClick={(e) => e.stopPropagation()}>
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
                <img src={song.thumbnail || "/assets/PrayRead-logo.png"} alt={song.title || "Verse Song"} className="w-full sm:w-56 h-56 object-cover rounded-2xl border border-[#e9c981]/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold tracking-[2px] text-[#e9c981] uppercase">{song.series_title || "Verse Songs"}</p>
                  <h2 className="text-2xl font-bold text-[#fdf6e3] leading-snug">{song.title || "Verse Song"}</h2>
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
              <div className="flex items-center gap-3 mt-4 bg-white/10 rounded-2xl px-4 py-3">
                <span>🔊</span>
                <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1" />
                <span className="text-xs w-10 text-right">{Math.round(volume * 100)}%</span>
                <button onClick={() => setSpeed(speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : 1)} className="px-3 py-1.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-xs font-bold whitespace-nowrap">{speed}× speed</button>
                <button onClick={() => setShowQueue(!showQueue)} className="px-3 py-1.5 rounded-full bg-black/70 border border-[#e9c981]/30 text-xs font-bold whitespace-nowrap">{showQueue ? "Hide list ↑" : "Show list ↓"} · {list.length}</button>
              </div>
              {showQueue && (
                <div className="mt-5">
                  <h3 className="font-bold text-[#fdf6e3] mb-2">Up next — tap any song to play</h3>
                  <div className="bg-black/70 border border-[#e9c981]/30 rounded-2xl divide-y divide-[#e9c981]/20 max-h-72 overflow-y-auto">
                    {list.map((q: any, i: number) => {
                      const active = q && q.id === song.id;
                      return (
                        <button key={q?.id ?? i} onClick={() => playSong(q, list)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${active ? "bg-[#e9c981]" : "hover:bg-black/50"}`}>
                          <span className={`text-xs w-6 shrink-0 ${active ? "text-[#1a1a1a]" : "text-[#f5e9c8]/70"}`}>{active && isPlaying ? "♫" : `${i + 1}.`}</span>
                          <img src={q?.thumbnail || "/assets/PrayRead-logo.png"} alt="" width={40} height={40} className="rounded object-cover shrink-0" />
                          <span className="flex-1 min-w-0"><span className={`block truncate font-semibold ${active ? "text-[#1a1a1a]" : "text-[#fdf6e3]"}`}>{q?.title || "Verse Song"}</span><span className={`block text-xs truncate ${active ? "text-[#1a1a1a]/70" : "text-[#f5e9c8]/70"}`}>{q?.series_title || "Verse Songs"}</span></span>
                          <span className={`text-xs tabular-nums shrink-0 ${active ? "text-[#1a1a1a]" : "text-[#f5e9c8]/70"}`}>{fmt(q?.duration || 0)}</span>
                          {active && <span className="text-xs font-bold text-[#1a1a1a] shrink-0">Playing</span>}
                        </button>
                      );
                    })}
                    {list.length === 0 && <p className="px-4 py-4 text-sm text-[#f5e9c8]/70">No songs in this queue yet.</p>}
                  </div>
                </div>
              )}
              <a href="/verse-songs" className="mt-5 block text-center w-full py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] font-bold text-sm">Go to Verse Songs →</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GlobalVerseSongPlayer() {
  return <PlayerGuard><Inner /></PlayerGuard>;
}
