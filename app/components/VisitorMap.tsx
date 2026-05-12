'use client';

import { useEffect, useState } from 'react';

interface Visitor {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  visitor_count?: number;
}

interface VisitorStats {
  liveVisitors: Visitor[];
  allVisitors: Visitor[];
  stats: { total_visitors: number; total_visits: number };
}

export default function VisitorMap() {
  const [visitorData, setVisitorData] = useState<VisitorStats>({
    liveVisitors: [],
    allVisitors: [],
    stats: { total_visitors: 0, total_visits: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const trackVisit = async () => {
      try {
        await fetch('/api/visitor-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageUrl: window.location.pathname }),
        });
      } catch {}
    };

    const fetchVisitorData = async () => {
      try {
        const res = await fetch('/api/visitor-tracking');
        const data = await res.json();
        setVisitorData(data);
      } catch {}
      setIsLoading(false);
    };

    trackVisit();
    fetchVisitorData();
    const interval = setInterval(fetchVisitorData, 30000);
    return () => clearInterval(interval);
  }, []);

  const latLngToSVG = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 800;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = 400 / 2 - (800 * mercN) / (2 * Math.PI);
    return { x, y };
  };

  const liveCount = visitorData.liveVisitors.length;
  const totalCount = visitorData.stats.total_visitors;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(15,10,25,0.95) 0%, rgba(20,12,35,0.98) 100%)',
        border: '1px solid rgba(201,168,76,0.2)',
        boxShadow: '0 0 40px rgba(201,168,76,0.08), 0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)', borderBottom: '1px solid rgba(201,168,76,0.12)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#c9a84c]" style={{ boxShadow: '0 0 8px #c9a84c' }} />
            <h3 className="text-white font-semibold text-sm tracking-wide">Global Reach</h3>
          </div>
          <span className="text-white/30 text-xs">Live</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Live visitors */}
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px #4ade80' }} />
              <div
                className="absolute inset-0 rounded-full bg-green-400"
                style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.4 }}
              />
            </div>
            <div>
              <p
                className="text-green-300 font-bold leading-none"
                style={{ fontSize: '1.35rem', fontFamily: 'Georgia, serif' }}
              >
                {isLoading ? '—' : liveCount}
              </p>
              <p className="text-green-400/60 text-xs mt-0.5">Online now</p>
            </div>
          </div>

          {/* Total visitors */}
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <div className="w-3 h-3 rounded-full bg-[#c9a84c] flex-shrink-0" style={{ boxShadow: '0 0 8px #c9a84c' }} />
            <div>
              <p
                className="font-bold text-[#f0d080] leading-none"
                style={{ fontSize: '1.35rem', fontFamily: 'Georgia, serif' }}
              >
                {isLoading ? '—' : totalCount.toLocaleString()}
              </p>
              <p className="text-[#c9a84c]/60 text-xs mt-0.5">Total visitors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="p-3">
        <div className="rounded-xl overflow-hidden" style={{ background: '#0c0c1a' }}>
          <svg viewBox="0 0 800 400" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <radialGradient id="liveGlow2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="visitorGlow2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ocean */}
            <rect width="800" height="400" fill="#0e0e1f" />

            {/* Grid */}
            {[...Array(8)].map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 50 + 50} x2="800" y2={i * 50 + 50} stroke="#1a1a2e" strokeWidth="0.8" />
            ))}
            {[...Array(16)].map((_, i) => (
              <line key={`v-${i}`} x1={i * 50 + 50} y1="0" x2={i * 50 + 50} y2="400" stroke="#1a1a2e" strokeWidth="0.8" />
            ))}

            {/* Landmasses */}
            <g fill="#1e2040" stroke="#2a2d5a" strokeWidth="0.5">
              <path d="M 150 80 L 100 120 L 80 180 L 120 200 L 180 190 L 200 150 L 180 100 Z" />
              <path d="M 200 220 L 180 260 L 190 320 L 220 340 L 240 300 L 230 240 Z" />
              <path d="M 380 80 L 420 90 L 440 110 L 420 130 L 380 120 Z" />
              <path d="M 380 150 L 420 160 L 450 220 L 440 280 L 400 300 L 380 260 Z" />
              <path d="M 460 70 L 550 80 L 600 120 L 620 160 L 580 180 L 520 160 L 480 140 Z" />
              <path d="M 600 260 L 650 270 L 670 300 L 640 310 L 600 300 Z" />
            </g>

            {/* All visitors */}
            {visitorData.allVisitors.map((visitor, i) => {
              const { x, y } = latLngToSVG(visitor.latitude, visitor.longitude);
              return (
                <g key={`v-${i}`}>
                  <circle cx={x} cy={y} r="10" fill="url(#visitorGlow2)" opacity="0.6" />
                  <circle cx={x} cy={y} r="3.5" fill="#c9a84c" opacity="0.9">
                    <title>{`${visitor.city}, ${visitor.country}`}</title>
                  </circle>
                </g>
              );
            })}

            {/* Live visitors */}
            {visitorData.liveVisitors.map((visitor, i) => {
              const { x, y } = latLngToSVG(visitor.latitude, visitor.longitude);
              return (
                <g key={`live-${i}`}>
                  <circle cx={x} cy={y} r="15" fill="url(#liveGlow2)" opacity="0.7">
                    <animate attributeName="r" values="10;22;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="5" fill="#4ade80">
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="8" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.7">
                    <animate attributeName="r" values="6;12;6" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <title>🟢 LIVE: {visitor.city}, {visitor.country}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white/30 text-xs">Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#c9a84c]" />
              <span className="text-white/30 text-xs">Visitors</span>
            </div>
          </div>
          <span className="text-white/20 text-xs">Updated every 30s</span>
        </div>
      </div>
    </div>
  );
}
