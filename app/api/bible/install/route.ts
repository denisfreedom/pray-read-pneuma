// app/api/bible/install/route.ts
// INSTALLS Bible verses into Supabase table: bible_verses
// Run ONCE (or re-run to top-up) :
//   https://prayreadbible.org/api/bible/install?key=YOUR_BIBLE_INSTALL_SECRET
//
// Env needed in Vercel:
//   BIBLE_INSTALL_SECRET       - any secret you invent, e.g. PrayRead-Install-2026
//   NEXT_PUBLIC_SUPABASE_URL   - or SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  - Service Role (secret, NOT anon key)
//   (optional) NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// Supabase table - create this FIRST in Supabase SQL Editor:
//   create table if not exists public.bible_verses (
//     id bigint generated always as identity primary key,
//     version text not null,        -- kjv | kjvp | luganda | darby | amplified
//     book int not null,             -- 1..66
//     chapter int not null,
//     verse int not null,
//     text text not null,
//     strongs text default '',       -- KJV+ only, e.g. <H7225><H430>
//     unique(version, book, chapter, verse)
//   );
//   create index if not exists idx_bible_verses_lookup on public.bible_verses(version, book, chapter);
//
// Source: bolls.life public API (no key needed)
//   KJV, Darby, ASV etc: https://bolls.life/get-chapter/KJV/1/1/
//   Luganda:            https://bolls.life/get-chapter/LUG/1/1/  (if available, else skipped + reported)
//   KJV+ Strong's:     same KJV text, Strong's numbers are in the <H/G> tags returned by bolls.life
//                       when ?strongs=1 is used - we store them in `strongs` + keep plain text in `text`.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro: 5 min. Free: capped at 60s - run with ?limit= to chunk it.

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// 66 books, chapters per book - same order as Finestructure BIBLE_BOOKS
const CHAPTERS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42,
  150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14,
  4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13,
  5, 5, 3, 5, 1, 1, 1, 22,
];

// version param -> bolls.life translation code
const TRANSLATIONS: Record<string, { bolls: string; label: string; strongs?: boolean }> = {
  kjv: { bolls: "KJV", label: "KJV" },
  kjvp: { bolls: "KJV", label: "KJV+ Strong's", strongs: true },
  darby: { bolls: "DARBY", label: "Darby" },
  amplified: { bolls: "AMP", label: "Amplified" },
  luganda: { bolls: "LUG", label: "Luganda" },
};

async function fetchChapter(bolls: string, book: number, chapter: number, strongs: boolean) {
  // bolls.life: https://bolls.life/get-chapter/KJV/1/1/
  const url = `https://bolls.life/get-chapter/${bolls}/${book}/${chapter}/`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`bolls ${bolls} ${book}:${chapter} -> HTTP ${res.status}`);
  const rows: any[] = await res.json();
  // rows: [{ pk, verse, text, comment }] - text may contain <H7225> tags
  return rows
    .filter((r) => r && Number(r.verse) > 0)
    .map((r) => {
      const raw = String(r.text || "");
      // Strong's tags: <H7225> / <G2424> - keep them for kjvp, strip for plain text
      const strongsTags = (raw.match(/<[HG]\d{1,5}>/g) || []).join("");
      const clean = raw
        .replace(/<[HG]\d{1,5}>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      return {
        verse: Number(r.verse),
        text: clean,
        strongs: strongs ? strongsTags : "",
      };
    })
    .sort((a, b) => a.verse - b.verse);
}

export async function GET(req: NextRequest) {
  const secret = process.env.BIBLE_INSTALL_SECRET || "";
  const key = req.nextUrl.searchParams.get("key") || "";
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Unauthorized - wrong ?key=" }, { status: 401 });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Vercel env" },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ?versions=kjv,luganda   ?fromBook=1 ?toBook=66 ?limit=200 (chapters per run, for Vercel timeout)
  const versionsParam = (req.nextUrl.searchParams.get("versions") || "kjv,kjvp,luganda,darby").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const fromBook = Math.max(1, Number(req.nextUrl.searchParams.get("fromBook") || 1));
  const toBook = Math.min(66, Number(req.nextUrl.searchParams.get("toBook") || 66));
  const limit = Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 200)); // chapters per run

  const results: any[] = [];
  let chaptersDone = 0;

  for (const version of versionsParam) {
    const t = TRANSLATIONS[version];
    if (!t) { results.push({ version, skipped: "unknown version, use: kjv,kjvp,luganda,darby,amplified" }); continue; }

    for (let book = fromBook; book <= toBook; book++) {
      for (let chapter = 1; chapter <= CHAPTERS[book - 1]; chapter++) {
        if (chaptersDone >= limit) {
          return NextResponse.json({
            ok: true, partial: true,
            message: `Stopped at limit=${limit} chapters. Run again with ?fromBook=${book} and skip already-done chapters, or raise limit.`,
            results,
          });
        }
        // Skip if already installed
        const { count } = await supabase
          .from("bible_verses")
          .select("id", { count: "exact", head: true })
          .eq("version", version)
          .eq("book", book)
          .eq("chapter", chapter);
        if ((count || 0) > 0) { chaptersDone++; continue; }

        try {
          const verses = await fetchChapter(t.bolls, book, chapter, !!t.strongs);
          if (!verses.length) { results.push({ version, book, chapter, skipped: "no verses from source" }); chaptersDone++; continue; }
          const rows = verses.map((v) => ({ version, book, chapter, verse: v.verse, text: v.text, strongs: v.strongs }));
          const { error } = await supabase.from("bible_verses").upsert(rows, {
            onConflict: "version,book,chapter,verse",
          });
          if (error) throw error;
          results.push({ version, book, chapter, verses: verses.length });
        } catch (e: any) {
          results.push({ version, book, chapter, error: String(e?.message || e) });
        }
        chaptersDone++;
        // Be gentle with the free source API
        await new Promise((r) => setTimeout(r, 120));
      }
    }
  }

  // Totals per version
  const totals: Record<string, number> = {};
  for (const v of versionsParam) {
    const { count } = await supabase.from("bible_verses").select("id", { count: "exact", head: true }).eq("version", v);
    totals[v] = count || 0;
  }

  return NextResponse.json({ ok: true, partial: false, totals, installedThisRun: results.length, results: results.slice(0, 50) });
}
