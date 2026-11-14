// app/verse-songs/store/page.tsx — Album Store V2 (same data-layer fix as Library V3)
// V1 had the same trap as Library V2: its series fetch fell back to the base
// /api/verse-songs endpoint, which returns SONGS — so albums would have
// been built from songs. V2: series ONLY from /api/verse-songs/series,
// song-shaped rows filtered out, songs tried at /api/verse-songs/songs
// AND the base endpoint.
// ── EDIT YOUR PRICES HERE ────────────────────────────────────────────
// Placeholder prices — change them to your real prices.
// CURRENCY is the label shown next to prices (UGX = Ugandan Shillings).
// ALBUM_PRICES maps a series/album id to its price. Albums not listed
// here use DEFAULT_ALBUM_PRICE. FULL_BOOK_PRICE is the bundle price
// for every album together. If you later create a separate Pesapal link
// per album, put it in ALBUM_LINKS (album id → its own Pesapal URL);
// albums not listed there use the main PESAPAL_URL.
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Music, Lock, ChevronLeft, Check, ShoppingBag } from 'lucide-react';

const CURRENCY = 'UGX';
const PESAPAL_URL = 'https://store.pesapal.com/donatetoprayreadbibleproject';
const DEFAULT_ALBUM_PRICE = 20000;
const FULL_BOOK_PRICE = 50000;
const ALBUM_PRICES: Record<number, number> = {
  // e.g. 1: 15000,
};
const ALBUM_LINKS: Record<number, string> = {
  // e.g. 1: 'https://store.pesapal.com/...album-1...',
};

const fmtPrice = (n: number) => `${CURRENCY} ${n.toLocaleString()}`;

function normDuration(v: any): number {
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).trim();
  const m = s.match(/^(?:(\d+):)?(\d+):(\d{2})$/);
  if (m) return (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function asArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  if (Array.isArray(d.songs)) return d.songs;
  if (Array.isArray(d.series)) return d.series;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  return [];
}

// A row is a SONG if it carries an audio file. Series never do.
const isSongRow = (r: any) => !!(r && (r.mp3_url || r.audio_url || r.audioUrl));
const isSeriesRow = (r: any) => !!r && !isSongRow(r);

interface Album {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  songCount: number;
  totalSeconds: number;
}

function StoreContent() {
  const searchParams = useSearchParams();
  const highlightId = Number(searchParams.get('album') || 0) || null;
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    (async () => {
      try {
        // Series ONLY from the series endpoint — the base endpoint
        // returns songs, and treating them as series was the V1 bug.
        let seriesList: any[] = [];
        try {
          const res = await fetch('/api/verse-songs/series');
          if (res.ok) seriesList = asArray(await res.json()).filter(isSeriesRow);
        } catch { /* fall through */ }

        // Songs: try the songs endpoint, then the base endpoint.
        let allSongs: any[] = [];
        for (const url of ['/api/verse-songs/songs', '/api/verse-songs']) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const rows = asArray(await res.json()).filter(isSongRow);
            if (rows.length) { allSongs = rows; break; }
          } catch { /* try next */ }
        }
        // Per-series fallback if the songs endpoints gave nothing.
        if (!allSongs.length && seriesList.length) {
          const perSeries = await Promise.all(seriesList.map(async (sr) => {
            for (const url of [`/api/verse-songs/series/${sr.id}`, `/api/verse-songs/songs?seriesId=${sr.id}`, `/api/verse-songs/songs?series_id=${sr.id}`]) {
              try {
                const res = await fetch(url);
                if (!res.ok) continue;
                const rows = asArray(await res.json()).filter(isSongRow);
                if (rows.length) return rows.map((sg: any) => ({ ...sg, series_id: sg.series_id ?? sg.seriesId ?? sr.id }));
              } catch { /* try next */ }
            }
            return [];
          }));
          allSongs = perSeries.flat();
        }

        setAlbums(seriesList.map((sr: any) => {
          const id = Number(sr.id);
          const nested = (sg: any) => (sg.series && typeof sg.series === 'object' ? sg.series : {});
          const mine = allSongs.filter((sg: any) => Number(sg.series_id ?? sg.seriesId ?? nested(sg).id) === id);
          return {
            id,
            title: sr.title || 'Untitled',
            description: sr.description || '',
            thumbnail: sr.thumbnail || sr.thumbnail_url || '',
            songCount: mine.length,
            totalSeconds: mine.reduce((sum, sg) => sum + normDuration(sg.duration), 0),
          };
        }));
      } catch (e) { console.error('Store load error:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  // Scroll to + highlight the album the visitor came for (e.g. from a
  // song card's Download button: /verse-songs/store?album=3).
  useEffect(() => {
    if (!loading && highlightId) {
      const el = cardRefs.current.get(highlightId);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
  }, [loading, highlightId]);

  const totalSongs = useMemo(() => albums.reduce((n, a) => n + a.songCount, 0), [albums]);
  const totalSeconds = useMemo(() => albums.reduce((n, a) => n + a.totalSeconds, 0), [albums]);
  const priceOf = (id: number) => ALBUM_PRICES[id] ?? DEFAULT_ALBUM_PRICE;
  const linkOf = (id: number) => ALBUM_LINKS[id] ?? PESAPAL_URL;
  const buy = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="min-h-screen bg-[#120e2b] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/verse-songs" className="inline-flex items-center gap-1 text-sm text-amber-300 hover:text-amber-200 font-semibold mb-4">
          <ChevronLeft size={16} /> Back to Verse Songs
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="p-3 rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/30">
            <ShoppingBag className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Verse Songs Album Store</h1>
            <p className="text-white/60 text-sm">Stream free anywhere · Buy here to download for offline listening</p>
          </div>
        </div>

        {/* ── Complete Book bundle ─────────────────────────────── */}
        <div className="my-8 rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 via-amber-400/5 to-transparent p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold mb-3">BEST VALUE · FULL BOOK</span>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Complete Book — Every Album</h2>
            <p className="text-white/70 text-sm mb-3">
              All {albums.length || '—'} albums · {totalSongs} songs · {fmtDur(totalSeconds)} of music.
              One purchase unlocks downloads for the whole book.
            </p>
            <ul className="text-sm text-white/70 space-y-1">
              <li className="flex items-center gap-2"><Check size={15} className="text-amber-300 shrink-0" /> Download every song for offline listening</li>
              <li className="flex items-center gap-2"><Check size={15} className="text-amber-300 shrink-0" /> Supports the Pray-Read Bible project</li>
              <li className="flex items-center gap-2"><Check size={15} className="text-amber-300 shrink-0" /> Pay securely with Mobile Money or card on Pesapal</li>
            </ul>
          </div>
          <div className="text-center md:text-right shrink-0">
            <p className="text-3xl font-bold text-amber-300 mb-3">{fmtPrice(FULL_BOOK_PRICE)}</p>
            <button onClick={() => buy(PESAPAL_URL)} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 font-bold shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95">
              <Lock size={16} /> Buy the Full Book
            </button>
          </div>
        </div>

        {/* ── Albums ───────────────────────────────────────────── */}
        {loading ? (
          <p className="text-white/60 text-center py-12">Loading albums…</p>
        ) : albums.length === 0 ? (
          <p className="text-white/60 text-center py-12">No albums yet. Add a series in Admin to see it here.</p>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4">Buy a Single Album</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map(album => {
                const highlighted = highlightId === album.id;
                return (
                  <article
                    key={album.id}
                    ref={(el) => { if (el) cardRefs.current.set(album.id, el); else cardRefs.current.delete(album.id); }}
                    className={`rounded-3xl overflow-hidden border bg-[#1d1840] shadow-xl transition-all hover:shadow-2xl ${highlighted ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/20' : 'border-white/10 hover:border-amber-400/30'}`}
                  >
                    <div className="relative w-full aspect-video bg-slate-800 overflow-hidden">
                      {album.thumbnail ? (
                        <Image src={album.thumbnail} alt={album.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
                          <Music size={64} strokeWidth={1.5} className="text-white opacity-60" />
                        </div>
                      )}
                      {highlighted && (
                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold shadow">You came for this album</span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg leading-snug mb-1">{album.title}</h3>
                      {album.description && <p className="text-white/60 text-sm line-clamp-2 mb-3">{album.description}</p>}
                      <p className="text-xs text-white/60 mb-4">
                        {album.songCount} {album.songCount === 1 ? 'song' : 'songs'} · {fmtDur(album.totalSeconds)} total
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-bold text-amber-300">{fmtPrice(priceOf(album.id))}</span>
                        <div className="flex gap-2">
                          <Link href={`/verse-songs/${album.id}`} className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition">
                            Listen Free
                          </Link>
                          <button onClick={() => buy(linkOf(album.id))} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95">
                            <Lock size={14} /> Buy Album
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <p className="text-center text-xs text-white/40 mt-10">
          Streaming is always free on Pray-Read Bible. Purchases are processed securely by Pesapal.
        </p>
      </div>
    </div>
  );
}

export default function VerseSongsStorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#120e2b] flex items-center justify-center"><p className="text-white/60">Loading store…</p></div>}>
      <StoreContent />
    </Suspense>
  );
}
