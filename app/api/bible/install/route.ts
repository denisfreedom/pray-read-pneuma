// app/api/bible/install/route.ts — FIXED: no @supabase/supabase-js needed
// Uses plain fetch() to Supabase REST API, so `npm run build` cannot fail
// with "Module not found: Can't resolve '@supabase/supabase-js'"
//
// Run ONCE (or re-run to top-up):
//   https://prayreadbible.org/api/bible/install?key=YOUR_BIBLE_INSTALL_SECRET
//
// Vercel env needed:
//   BIBLE_INSTALL_SECRET, SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
//
// Supabase table (run once in Supabase SQL Editor):
//   create table if not exists public.bible_verses (
//     id bigint generated always as identity primary key,
//     version text not null, book int not null, chapter int not null,
//     verse int not null, text text not null, strongs text default '',
//     unique(version, book, chapter, verse)
//   );
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHAPTERS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42,
  150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14,
  4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13,
  5, 5, 3, 5, 1, 1, 1, 22,
];

const TRANSLATIONS: Record<string, { bolls: string; label: string; strongs?: boolean }> = {
  kjv: { bolls: "KJV", label: "KJV" },
  kjvp: { bolls: "KJV", label: "KJV+ Strong's", strongs: true },
  darby: { bolls: "DARBY", label: "Darby" },
  amplified: { bolls: "AMP", label: "Amplified" },
  luganda: { bolls: "LUG", label: "Luganda" },
};

async function fetchChapter(bolls: string, book: number, chapter: number, strongs: boolean) {
  const res = await fetch(`https://bolls.life/get-chapter/${bolls}/${book}/${chapter}/`, { cache: "no-store" });
  if (!res.ok) throw new Error(`bolls ${bolls} ${book}:${chapter} -> HTTP ${res.status}`);
  const rows: any[] = await res.json();
  return rows
    .filter((r) => r && Number(r.verse) > 0)
    .map((r) => {
      const raw = String(r.text || "");
      const strongsTags = (raw.match(/<[HG]\d{1,5}>/g) || []).join("");
      const clean = raw
        .replace(/<[HG]\d{1,5}>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .trim();
      return { verse: Number(r.verse), text: clean, strongs: strongs ? strongsTags : "" };
    })
    .sort((a, b) => a.verse - b.verse);
}

export async function GET(req: NextRequest) {
  const secret = process.env.BIBLE_INSTALL_SECRET || "";
  const key = req.nextUrl.searchParams.get("key") || "";
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Unauthorized - wrong ?key=" }, { status: 401 });
  }
  const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Vercel env" }, { status: 500 });
  }

  // Supabase REST helpers - no npm package needed
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
  const countFor = async (version: string, book?: number, chapter?: number) => {
    let url = `${SUPABASE_URL}/rest/v1/bible_verses?select=id&version=eq.${encodeURIComponent(version)}`;
    if (book) url += `&book=eq.${book}`;
    if (chapter) url += `&chapter=eq.${chapter}`;
    const r = await fetch(url, { headers: { ...headers, Prefer: "count=exact" }, cache: "no-store" });
    const range = r.headers.get("content-range") || "";
    const m = range.match(/\/(\d+)/);
    return m ? Number(m[1]) : 0;
  };
  const upsertRows = async (rows: any[]) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bible_verses?on_conflict=version,book,chapter,verse`, {
      method: "POST", headers, body: JSON.stringify(rows),
    });
    if (!r.ok) throw new Error(`Supabase upsert -> HTTP ${r.status}: ${await r.text()}`);
  };

  const versionsParam = (req.nextUrl.searchParams.get("versions") || "kjv,kjvp,luganda,darby")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const fromBook = Math.max(1, Number(req.nextUrl.searchParams.get("fromBook") || 1));
  const toBook = Math.min(66, Number(req.nextUrl.searchParams.get("toBook") || 66));
  const limit = Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 200));

  const results: any[] = [];
  let chaptersDone = 0;

  for (const version of versionsParam) {
    const t = TRANSLATIONS[version];
    if (!t) { results.push({ version, skipped: "unknown version, use: kjv,kjvp,luganda,darby,amplified" }); continue; }
    for (let book = fromBook; book <= toBook; book++) {
      for (let chapter = 1; chapter <= CHAPTERS[book - 1]; chapter++) {
        if (chaptersDone >= limit) {
          return NextResponse.json({ ok: true, partial: true, message: `Stopped at limit=${limit} chapters. Run the same URL again - it skips chapters already installed.`, results });
        }
        const already = await countFor(version, book, chapter);
        if (already > 0) { chaptersDone++; continue; }
        try {
          const verses = await fetchChapter(t.bolls, book, chapter, !!t.strongs);
          if (!verses.length) { results.push({ version, book, chapter, skipped: "no verses from source" }); chaptersDone++; continue; }
          await upsertRows(verses.map((v) => ({ version, book, chapter, verse: v.verse, text: v.text, strongs: v.strongs })));
          results.push({ version, book, chapter, verses: verses.length });
        } catch (e: any) {
          results.push({ version, book, chapter, error: String(e?.message || e) });
        }
        chaptersDone++;
        await new Promise((r) => setTimeout(r, 120));
      }
    }
  }

  const totals: Record<string, number> = {};
  for (const v of versionsParam) totals[v] = await countFor(v);
  return NextResponse.json({ ok: true, partial: false, totals, installedThisRun: results.length, results: results.slice(0, 50) });
}
