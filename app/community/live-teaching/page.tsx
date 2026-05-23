'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Radio, Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, Headphones, Tv, Loader2, RefreshCw, Users
} from 'lucide-react';
import AppNavbar from '@/app/components/AppNavbar';
const HLS_URL = 'https://panel.ionflixtvs.com:3540/hybrid/play.m3u8';
const CHAT_URL = 'https://panel.ionflixtvs.com/chat/prayreadlivestream';
const VIEWERS_URL = 'https://panel.ionflixtvs.com/viewer-widget/prayreadlivestream';

const goldGradient: React.CSSProperties = {
  backgroundImage: 'linear-gradient(135deg, #f5d790, #e8a428)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

interface StreamConfig {
  is_live: boolean;
  stream_title: string;
  stream_description: string;
}

export default function LiveTeachingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [started, setStarted] = useState(false);

  // Fetch stream config
  useEffect(() => {
    fetch('/api/live-stream-config')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setConfig({ is_live: false, stream_title: 'Live Teaching', stream_description: '' }));
  }, []);

  // Load HLS
  const loadHLS = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setStreamLoading(true);
    setStreamError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const tryLoad = () => {
      if ((window as any).Hls && (window as any).Hls.isSupported()) {
        const hls = new (window as any).Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hls.loadSource(HLS_URL);
        hls.attachMedia(video);
        hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          setStreamLoading(false);
          video.play().then(() => setPlaying(true)).catch(() => {});
        });
        hls.on((window as any).Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            setStreamError(true);
            setStreamLoading(false);
            setTimeout(() => {
              hls.startLoad();
              setStreamError(false);
              setStreamLoading(true);
            }, 5000);
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = HLS_URL;
        video.addEventListener('loadedmetadata', () => {
          setStreamLoading(false);
          video.play().then(() => setPlaying(true)).catch(() => {});
        }, { once: true });
      } else {
        setStreamError(true);
        setStreamLoading(false);
      }
    };

    if ((window as any).Hls) {
      tryLoad();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.onload = tryLoad;
      script.onerror = () => { setStreamError(true); setStreamLoading(false); };
      document.head.appendChild(script);
    }
  }, []);

  // Start stream when user clicks
  const handleStart = () => {
    setStarted(true);
    loadHLS();
  };

  // Toggle play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) { video.pause(); setPlaying(false); }
    else { video.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  // Toggle mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  };

  // Volume change
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
  };

  // Fullscreen
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Switch mode
  const switchMode = (newMode: 'video' | 'audio') => {
    setMode(newMode);
  };

  // Cleanup
  useEffect(() => {
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, []);

  if (!config) {
    return (
      <div className="bg-[#0d0d0d] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] text-white min-h-screen font-sans antialiased">
      <AppNavbar />
      {/* Sub-header */}
      <div className="sticky top-[72px] z-40 border-b border-white/8 backdrop-blur-xl" style={{ background: 'rgba(10,10,10,0.85)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
          <Link href="/community" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-white font-semibold text-sm truncate">{config.stream_title}</span>
          {config.is_live ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="text-xs text-white/40">OFFLINE</span>
          )}
        </div>
      </div>

      {/* OFFLINE STATE */}
      {!config.is_live ? (
        <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
          <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center mx-auto">
            <Radio className="w-9 h-9 text-white/20" />
          </div>
          <h2 className="text-2xl font-bold text-white/60">No Live Teaching Currently</h2>
          <p className="text-white/35 text-sm leading-relaxed">
            Our live stream is offline right now. Check back soon for the next live teaching session with Pastor Denis Matovu.
          </p>
          <Link href="/community" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-400/30 text-amber-300 hover:bg-amber-400/10 transition-all text-sm font-medium">
            ← Back to Community
          </Link>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {/* Description */}
          {config.stream_description && (
            <p className="text-white/50 text-sm text-center mb-6 max-w-2xl mx-auto">{config.stream_description}</p>
          )}

          {/* Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-xl border border-white/10 overflow-hidden bg-white/5">
              <button
                onClick={() => switchMode('video')}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all ${mode === 'video' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'}`}
              >
                <Tv className="w-4 h-4" />
                Watch Live
              </button>
              <button
                onClick={() => switchMode('audio')}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all ${mode === 'audio' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'}`}
              >
                <Headphones className="w-4 h-4" />
                Listen Only
              </button>
            </div>
          </div>

          {/* Main Layout: Player + Chat */}
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Left: Player */}
            <div className="flex-1 min-w-0">
              {/* Video / Audio Player */}
              <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden border border-white/8"
                style={{ background: '#000' }}
              >
                {/* VIDEO MODE */}
                <div
                  className="relative"
                  style={{
                    paddingBottom: mode === 'video' ? '56.25%' : '0',
                    height: mode === 'audio' ? 'auto' : undefined,
                  }}
                >
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                      display: mode === 'video' ? 'block' : 'none',
                    }}
                    playsInline
                    preload="none"
                  />

                  {/* Pre-start overlay (video mode) */}
                  {mode === 'video' && !started && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                        <Tv className="w-7 h-7 text-amber-400" />
                      </div>
                      <p className="text-white/60 text-sm">Tap to start the live stream</p>
                      <button
                        onClick={handleStart}
                        className="flex items-center gap-2 px-7 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                      >
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Watch Live
                      </button>
                    </div>
                  )}

                  {/* Loading overlay (video mode) */}
                  {mode === 'video' && started && streamLoading && !streamError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                      <p className="text-white/60 text-sm">Connecting to stream...</p>
                    </div>
                  )}

                  {/* Error overlay */}
                  {mode === 'video' && started && streamError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
                      <p className="text-white/50 text-sm">Stream interrupted. Reconnecting...</p>
                      <button
                        onClick={loadHLS}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white text-sm"
                      >
                        <RefreshCw className="w-4 h-4" /> Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* AUDIO MODE */}
                {mode === 'audio' && (
                  <div className="py-10 px-6 flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
                      <Headphones className="w-10 h-10 text-black" />
                    </div>
                    <div className="text-center">
                      <div className="text-white font-bold text-lg">{config.stream_title}</div>
                      <div className="text-white/50 text-sm mt-1">Audio-only mode · Low bandwidth</div>
                    </div>
                    {!started && (
                      <button
                        onClick={handleStart}
                        className="flex items-center gap-2 px-7 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all"
                      >
                        <Play className="w-4 h-4" />
                        Start Listening
                      </button>
                    )}
                    {started && streamLoading && !streamError && (
                      <div className="flex items-center gap-2 text-white/50 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                      </div>
                    )}
                    {/* Hidden video (audio source) */}
                    <video
                      ref={mode === 'audio' ? videoRef : undefined}
                      style={{ display: 'none' }}
                      playsInline
                      preload="none"
                    />
                  </div>
                )}

                {/* Controls Bar */}
                {started && !streamLoading && !streamError && (
                  <div className="flex items-center gap-3 px-4 py-3 border-t border-white/8" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <button onClick={togglePlay} className="text-white hover:text-amber-400 transition-colors">
                      {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button onClick={toggleMute} className="text-white hover:text-amber-400 transition-colors">
                      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={handleVolume}
                      className="w-24 accent-amber-400"
                    />
                    <div className="flex-1" />
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                    {mode === 'video' && (
                      <button onClick={toggleFullscreen} className="text-white hover:text-amber-400 transition-colors">
                        {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Viewer Count Widget */}
              <div className="mt-4 rounded-2xl border border-white/8 overflow-hidden bg-black/40">
                <div className="px-4 py-2 border-b border-white/8 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white/70">Live Viewers</span>
                </div>
                <div className="h-16">
                  <iframe
                    src={VIEWERS_URL}
                    height="100%"
                    width="100%"
                    frameBorder="0"
                    loading="lazy"
                    title="Live Viewers"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Right: Live Chat */}
            <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
              <div className="rounded-2xl border border-white/8 overflow-hidden flex flex-col" style={{ height: '520px', background: '#0a0a0a' }}>
                <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-semibold text-white/70">Live Chat</span>
                </div>
                <div className="flex-1 min-h-0">
                  <iframe
                    src={CHAT_URL}
                    height="100%"
                    width="100%"
                    frameBorder="0"
                    loading="lazy"
                    title="Live Chat"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Host Info */}
          <div
            className="mt-6 p-5 rounded-2xl border border-amber-400/15 flex items-center gap-5"
            style={{ background: 'linear-gradient(135deg, rgba(245,215,144,0.05), rgba(232,164,40,0.03))' }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
              DM
            </div>
            <div>
              <div className="text-white font-bold">Pastor Denis Matovu</div>
              <div className="text-amber-300/60 text-sm">Lead Teacher · Christ Faculty Hub</div>
              <div className="text-white/40 text-xs mt-1">Exploring the depths of Christ through experiential, pray-reading-based teaching.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
