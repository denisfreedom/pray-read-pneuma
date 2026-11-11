 'use client';

import { useEffect, useState } from 'react';

interface VisitorData {
  activeUsers: number;
  last24Hours: number;
  recentUsers: Array<{
    country: string;
    city: string;
    timestamp: string;
  }>;
}

const EMPTY_DATA: VisitorData = { activeUsers: 0, last24Hours: 0, recentUsers: [] };

// The API may 404 / 500 / return an error shape — never let a bad payload
// replace good state or crash the widget (old bug: setData(json) blindly,
// then data.recentUsers.length threw when recentUsers was undefined).
function sanitize(json: unknown): VisitorData {
  if (!json || typeof json !== 'object') return EMPTY_DATA;
  const j = json as Record<string, unknown>;
  const recent = Array.isArray(j.recentUsers) ? j.recentUsers : [];
  return {
    activeUsers: typeof j.activeUsers === 'number' ? j.activeUsers : 0,
    last24Hours: typeof j.last24Hours === 'number' ? j.last24Hours : 0,
    recentUsers: recent
      .filter(
        (u): u is { country: string; city: string; timestamp: string } =>
          !!u && typeof u === 'object',
      )
      .map((u) => ({
        country: typeof u.country === 'string' && u.country ? u.country : 'Unknown',
        city: typeof u.city === 'string' && u.city ? u.city : 'Unknown',
        timestamp: typeof u.timestamp === 'string' ? u.timestamp : '',
      })),
  };
}

export default function LiveVisitorsWidget() {
  const [data, setData] = useState<VisitorData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/visitor-stats', { cache: 'no-store' });
        if (!res.ok) throw new Error(`visitor-stats returned ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(sanitize(json));
          setHasError(false);
        }
      } catch (error) {
        console.error('Failed to fetch visitor stats:', error);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const then = new Date(timestamp).getTime();
    if (!timestamp || Number.isNaN(then)) return '';
    const seconds = Math.floor((Date.now() - then) / 1000);
    if (seconds < 0) return 'Just now'; // clock skew guard
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

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
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-2 h-2 rounded-full bg-[#4ade80]"
            style={{ boxShadow: '0 0 8px #4ade80' }}
          />
          <h3 className="text-white font-semibold text-sm tracking-wide">Live Visitors</h3>
          {hasError && !isLoading && (
            <span className="text-amber-300/80 text-[11px]">— stats unavailable</span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Live Now */}
          <div
            className="rounded-xl px-3 py-3 text-center"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div
                className="w-2 h-2 rounded-full bg-green-400 relative"
                style={{ boxShadow: '0 0 6px #4ade80' }}
              >
                <div
                  className="absolute inset-0 rounded-full bg-green-400 animate-ping"
                  style={{ animationDuration: '1.5s' }}
                />
              </div>
              <span className="text-green-400/70 text-xs font-medium">LIVE NOW</span>
            </div>
            <p
              className="text-green-300 font-bold"
              style={{ fontSize: '2rem', lineHeight: '1', fontFamily: 'Georgia, serif' }}
            >
              {isLoading ? '—' : data.activeUsers}
            </p>
          </div>

          {/* 24h Total */}
          <div
            className="rounded-xl px-3 py-3 text-center"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div
                className="w-2 h-2 rounded-full bg-[#c9a84c]"
                style={{ boxShadow: '0 0 6px #c9a84c' }}
              />
              <span className="text-[#c9a84c]/70 text-xs font-medium">24 HOURS</span>
            </div>
            <p
              className="text-[#f0d080] font-bold"
              style={{ fontSize: '2rem', lineHeight: '1', fontFamily: 'Georgia, serif' }}
            >
              {isLoading ? '—' : data.last24Hours}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Visitors List */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white/70 text-xs font-semibold uppercase tracking-wider">
            Recent Visitors
          </h4>
          <span className="text-white/30 text-xs">Live</span>
        </div>

        <div
          className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.3) rgba(255,255,255,0.05)' }}
        >
          {isLoading ? (
            <div className="text-center py-6">
              <div
                className="inline-block w-5 h-5 border-2 border-white/20 border-t-[#c9a84c] rounded-full animate-spin"
              />
            </div>
          ) : hasError && data.recentUsers.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-xs">
              Couldn&apos;t load visitor stats — retrying…
            </div>
          ) : data.recentUsers.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-xs">
              No recent visitors
            </div>
          ) : (
            data.recentUsers.map((user, index) => (
              <div
                key={`${user.timestamp}-${user.city}-${user.country}-${index}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0"
                    style={{ boxShadow: '0 0 6px #4ade80' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium truncate">
                      {user.city}
                    </p>
                    <p className="text-white/40 text-xs truncate">{user.country}</p>
                  </div>
                </div>
                <span className="text-white/30 text-xs whitespace-nowrap ml-2">
                  {formatTimeAgo(user.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Update indicator */}
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5">
          <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/20 text-xs">Updates every 30 seconds</span>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(201, 168, 76, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(201, 168, 76, 0.5);
        }
      `}</style>
    </div>
  );
}
