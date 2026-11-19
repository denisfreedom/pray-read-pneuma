// app/verse-songs/[seriesId]/page.tsx — REDIRECT (no more duplicate episodes page)
// The Verse Songs page already shows a series' episodes (its series tabs),
// so a separate /verse-songs/<id> episodes page only repeated those cards.
// This route now just redirects: /verse-songs/2 → /verse-songs?series=2.
// Old links/bookmarks keep working; there is only ONE episodes page.
// Non-numeric ids (e.g. /verse-songs/series) go to the series index instead.
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerseSongsSeriesRedirect() {
  const params = useParams();
  const router = useRouter();
  const raw = Array.isArray(params?.seriesId) ? params.seriesId[0] : (params?.seriesId as string | undefined);
  const id = Number(raw);

  useEffect(() => {
    if (!raw) { router.replace('/verse-songs/series'); return; }
    if (!Number.isFinite(id) || id <= 0) { router.replace('/verse-songs/series'); return; }
    router.replace(`/verse-songs?series=${id}`);
  }, [raw, id, router]);

  return (
    <div className="min-h-screen relative text-[#fdf6e3]" style={{ backgroundImage: "url(/assets/verse-songs-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div className="absolute inset-0 bg-[#022c22]/75 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-[11px] font-bold tracking-[2px] text-[#a9852e] uppercase">Scripture · Prayer · Community</p>
        <h1 className="text-2xl font-bold mt-2">Opening the series…</h1>
        <p className="text-[#fdf6e3]/70 mt-2">Episodes live on the Verse Songs page.</p>
        <div className="flex gap-3 mt-6">
          <Link href={Number.isFinite(id) && id > 0 ? `/verse-songs?series=${id}` : '/verse-songs/series'} className="px-5 py-2.5 rounded-full bg-[#e9c981] text-[#1a1a1a] text-sm font-bold shadow transition hover:scale-105">
            Open Episodes →
          </Link>
          <Link href="/verse-songs/series" className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 text-[#fdf6e3] text-sm font-semibold">
            All Series
          </Link>
        </div>
      </div>
    </div>
  );
}
