"use client";
// ============================================================
// PRAY-READ BIBLE — BIBLE READER (Book Selector + Chapter View)
// CONVERTED FROM FINESTRUCTURE.AI — for Next.js App Router
// ------------------------------------------------------------
// PASTE AS: app/bible-reader/page.tsx
// DELETE the old app/bible-reader/page.tsx FIRST, then create
// this file fresh (GitHub web editor fails on large overwrites).
// ------------------------------------------------------------
// What was converted:
//  react-router-dom  -> next/navigation (useSearchParams, useRouter, usePathname)
//  Link to={createPageUrl()} -> next/link href="/..."
//  @/lib/contentApi / @/lib/offlineDb / @/lib/bibleBooks -> SELF-CONTAINED
//    (66-book list embedded below, so this page never crashes on a missing import)
//  BookGrid + ChapterSelector -> BUILT INTO THIS FILE (same layout)
//  fetchPublicCollection("plan") -> /api/reading-plan (graceful fallback to 0)
//  offline.getAll("chapters") -> IndexedDB "prayread-offline" store "chapters"
//    (graceful fallback: localStorage prayread-downloaded-books)
// Layout kept EXACTLY as you loved it in finestructure:
//  dark emerald top bar, pills, EN/LU toggle, hero, stats, offline badge,
//  BookGrid with OT/NT tabs, ChapterSelector when ?book=N is set.
// ============================================================
import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// ---------- 66 BOOKS (English + Luganda + chapters) ----------
type Book = { number: number; en: string; lu: string; abbr: string; chapters: number };
const OT: Book[] = [
  { number: 1, en: "Genesis", lu: "Olubereberye", abbr: "Gen", chapters: 50 },
  { number: 2, en: "Exodus", lu: "Okuva", abbr: "Exo", chapters: 40 },
  { number: 3, en: "Leviticus", lu: "Leviitiko", abbr: "Lev", chapters: 27 },
  { number: 4, en: "Numbers", lu: "Okubala", abbr: "Num", chapters: 36 },
  { number: 5, en: "Deuteronomy", lu: "Ekyamateeka", abbr: "Deu", chapters: 34 },
  { number: 6, en: "Joshua", lu: "Yoswa", abbr: "Jos", chapters: 24 },
  { number: 7, en: "Judges", lu: "Abalamuzi", abbr: "Jdg", chapters: 21 },
  { number: 8, en: "Ruth", lu: "Ruusi", abbr: "Rut", chapters: 4 },
  { number: 9, en: "1 Samuel", lu: "1 Samwiri", abbr: "1Sa", chapters: 31 },
  { number: 10, en: "2 Samuel", lu: "2 Samwiri", abbr: "2Sa", chapters: 24 },
  { number: 11, en: "1 Kings", lu: "1 Bassekabaka", abbr: "1Ki", chapters: 22 },
  { number: 12, en: "2 Kings", lu: "2 Bassekabaka", abbr: "2Ki", chapters: 25 },
  { number: 13, en: "1 Chronicles", lu: "1 Ebyomumirembe", abbr: "1Ch", chapters: 29 },
  { number: 14, en: "2 Chronicles", lu: "2 Ebyomumirembe", abbr: "2Ch", chapters: 36 },
  { number: 15, en: "Ezra", lu: "Ezera", abbr: "Ezr", chapters: 10 },
  { number: 16, en: "Nehemiah", lu: "Nekkemiya", abbr: "Neh", chapters: 13 },
  { number: 17, en: "Esther", lu: "Eseza", abbr: "Est", chapters: 10 },
  { number: 18, en: "Job", lu: "Yobu", abbr: "Job", chapters: 42 },
  { number: 19, en: "Psalms", lu: "Zabbuli", abbr: "Psa", chapters: 150 },
  { number: 20, en: "Proverbs", lu: "Engero", abbr: "Pro", chapters: 31 },
  { number: 21, en: "Ecclesiastes", lu: "Omubuulizi", abbr: "Ecc", chapters: 12 },
  { number: 22, en: "Song of Solomon", lu: "Oluyimba", abbr: "Son", chapters: 8 },
  { number: 23, en: "Isaiah", lu: "Isaaya", abbr: "Isa", chapters: 66 },
  { number: 24, en: "Jeremiah", lu: "Yeremiya", abbr: "Jer", chapters: 52 },
  { number: 25, en: "Lamentations", lu: "Okukungubaga", abbr: "Lam", chapters: 5 },
  { number: 26, en: "Ezekiel", lu: "Ezekyeri", abbr: "Eze", chapters: 48 },
  { number: 27, en: "Daniel", lu: "Danyeri", abbr: "Dan", chapters: 12 },
  { number: 28, en: "Hosea", lu: "Koseya", abbr: "Hos", chapters: 14 },
  { number: 29, en: "Joel", lu: "Yoweeri", abbr: "Joe", chapters: 3 },
  { number: 30, en: "Amos", lu: "Amosi", abbr: "Amo", chapters: 9 },
  { number: 31, en: "Obadiah", lu: "Obadiya", abbr: "Oba", chapters: 1 },
  { number: 32, en: "Jonah", lu: "Yona", abbr: "Jon", chapters: 4 },
  { number: 33, en: "Micah", lu: "Mikiya", abbr: "Mic", chapters: 7 },
  { number: 34, en: "Nahum", lu: "Nakumu", abbr: "Nah", chapters: 3 },
  { number: 35, en: "Habakkuk", lu: "Kabbakuuku", abbr: "Hab", chapters: 3 },
  { number: 36, en: "Zephaniah", lu: "Zefaniya", abbr: "Zep", chapters: 3 },
  { number: 37, en: "Haggai", lu: "Kaggayi", abbr: "Hag", chapters: 2 },
  { number: 38, en: "Zechariah", lu: "Zekkaliya", abbr: "Zec", chapters: 14 },
  { number: 39, en: "Malachi", lu: "Malaki", abbr: "Mal", chapters: 4 },
];
const NT: Book[] = [
  { number: 40, en: "Matthew", lu: "Matayo", abbr: "Mat", chapters: 28 },
  { number: 41, en: "Mark", lu: "Makko", abbr: "Mar", chapters: 16 },
  { number: 42, en: "Luke", lu: "Lukka", abbr: "Luk", chapters: 24 },
  { number: 43, en: "John", lu: "Yokaana", abbr: "Joh", chapters: 21 },
  { number: 44, en: "Acts", lu: "Ebikolwa", abbr: "Act", chapters: 28 },
  { number: 45, en: "Romans", lu: "Abaruumi", abbr: "Rom", chapters: 16 },
  { number: 46, en: "1 Corinthians", lu: "1 Abakkolinso", abbr: "1Co", chapters: 16 },
  { number: 47, en: "2 Corinthians", lu: "2 Abakkolinso", abbr: "2Co", chapters: 13 },
  { number: 48, en: "Galatians", lu: "Abaggalatiya", abbr: "Gal", chapters: 6 },
  { number: 49, en: "Ephesians", lu: "Abaefeeso", abbr: "Eph", chapters: 6 },
  { number: 50, en: "Philippians", lu: "Abafiripi", abbr: "Phi", chapters: 4 },
  { number: 51, en: "Colossians", lu: "Abakkolosaayi", abbr: "Col", chapters: 4 },
  { number: 52, en: "1 Thessalonians", lu: "1 Abasessalonika", abbr: "1Th", chapters: 5 },
  { number: 53, en: "2 Thessalonians", lu: "2 Abasessalonika", abbr: "2Th", chapters: 3 },
  { number: 54, en: "1 Timothy", lu: "1 Timoseewo", abbr: "1Ti", chapters: 6 },
  { number: 55, en: "2 Timothy", lu: "2 Timoseewo", abbr: "2Ti", chapters: 4 },
  { number: 56, en: "Titus", lu: "Tito", abbr: "Tit", chapters: 3 },
  { number: 57, en: "Philemon", lu: "Firemooni", abbr: "Phm", chapters: 1 },
  { number: 58, en: "Hebrews", lu: "Abaebbulaniya", abbr: "Heb", chapters: 13 },
  { number: 59, en: "James", lu: "Yakobo", abbr: "Jam", chapters: 5 },
  { number: 60, en: "1 Peter", lu: "1 Peetero", abbr: "1Pe", chapters: 5 },
  { number: 61, en: "2 Peter", lu: "2 Peetero", abbr: "2Pe", chapters: 3 },
  { number: 62, en: "1 John", lu: "1 Yokaana", abbr: "1Jo", chapters: 5 },
  { number: 63, en: "2 John", lu: "2 Yokaana", abbr: "2Jo", chapters: 1 },
  { number: 64, en: "3 John", lu: "3 Yokaana", abbr: "3Jo", chapters: 1 },
  { number: 65, en: "Jude", lu: "Yuda", abbr: "Jud", chapters: 1 },
  { number: 66, en: "Revelation", lu: "Okubikkulirwa", abbr: "Rev", chapters: 22 },
];
const ALL = [...OT, ...NT];
const getBook = (n: number) => ALL.find((b) => b.number === n) || null;
const safe = (v: any) => (v == null ? "" : String(v));

// ---------- Offline: which books are fully downloaded ----------
function readDownloadedFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem("prayread-downloaded-books");
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {}
  return new Set();
}
async function readDownloadedFromIDB(): Promise<Set<number> | null> {
  try {
    if (!("indexedDB" in window)) return null;
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open("prayread-offline", 1);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    if (!db.objectStoreNames.contains("chapters")) { db.close(); return null; }
    const rows: any[] = await new Promise((res, rej) => {
      const tx = db.transaction("chapters", "readonly");
      const req = tx.objectStore("chapters").getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
    db.close();
    const perBook = new Map<number, number>();
    rows.forEach((row) => {
      const n = Number(row?.book_number || row?.bookNumber);
      if (n) perBook.set(n, (perBook.get(n) || 0) + 1);
    });
    const set = new Set<number>();
    perBook.forEach((count, n) => {
      const b = getBook(n);
      if (b && count >= b.chapters) set.add(n);
    });
    return set;
  } catch { return null; }
}

// ---------- Book Grid (was components/read/BookGrid) ----------
function BookGrid({ search, onSearch, activeTab, onTabChange, downloaded }: {
  search: string; onSearch: (v: string) => void;
  activeTab: string; onTabChange: (v: string) => void;
  downloaded: Set<number>;
}) {
  const q = search.trim().toLowerCase();
  const filter = (b: Book) =>
    !q || b.en.toLowerCase().includes(q) || b.lu.toLowerCase().includes(q) ||
    b.abbr.toLowerCase().includes(q) || String(b.number) === q;
  const list = (activeTab === "new" ? NT : OT).filter(filter);
  return (
    <div>
      <div className="pr-book-search">
        <input value={search} onChange={(e) => onSearch(e.target.value)}
          placeholder="Search books… e.g. Psalms, Okubikkulirwa, Philemon" aria-label="Search books" />
      </div>
      <div className="pr-book-tabs" role="tablist">
        <button className={activeTab === "old" ? "is-active" : ""} onClick={() => onTabChange("old")}>📖 Old Testament (39)</button>
        <button className={activeTab === "new" ? "is-active" : ""} onClick={() => onTabChange("new")}>📕 New Testament (27)</button>
      </div>
      {list.length === 0 ? (
        <p className="pr-empty">No book matches “{search}”. Try Psalms, Genesis or Okubikkulirwa.</p>
      ) : (
        <div className="pr-book-grid">
          {list.map((b) => {
            const isNT = b.number > 39;
            return (
              <Link key={b.number} href={`/bible-reader?book=${b.number}`} className={`pr-book-card ${isNT ? "is-nt" : "is-ot"}`}>
                <span className="pr-book-abbr">{b.abbr}</span>
                <span className="pr-book-names"><strong>{b.en}</strong><small>{b.lu}</small></span>
                <span className="pr-book-meta">
                  <span className="pr-ch-pill">{b.chapters} {b.chapters === 1 ? "chapter" : "chapters"}</span>
                  {downloaded.has(b.number) ? <span className="pr-off-badge">● Offline</span> : null}
                </span>
                <span className="pr-book-chev">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Chapter view (was components/read/ChapterSelector) ----------
// Keeps your finestructure behaviour: chapter pill grid + verses + intro/prayer panels.
// Verses load from /api/bible-books/[book]/[chapter]?lang=… with offline fallback.
function ChapterView({ book, lang, onLang }: { book: Book; lang: "en" | "lu"; onLang: (v: "en" | "lu") => void }) {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  const [chapter, setChapter] = useState(() => Math.max(1, Math.min(book.chapters, Number(sp.get("chapter")) || 1)));
  const [verses, setVerses] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [offlineCopy, setOfflineCopy] = useState(false); const [panel, setPanel] = useState<"none" | "grid" | "intro" | "study">("grid");
  const [intro, setIntro] = useState<any>(null); const [prayer, setPrayer] = useState<any>(null);
  const [font, setFont] = useState(18);
  useEffect(() => { setChapter(Math.max(1, Math.min(book.chapters, Number(sp.get("chapter")) || 1))); }, [sp, book]);
  useEffect(() => {
    let alive = true; setLoading(true); setOfflineCopy(false);
    const key = `prayread-ch-${book.number}-${chapter}-${lang}`;
    const load = async () => {
      try {
        const res = await fetch(`/api/bible-books/${book.number}/${chapter}?lang=${lang}`);
        if (res.ok) {
          const j = await res.json();
          const list = j.verses || j.data || j.chapter?.verses || [];
          if (alive && list.length) {
            setVerses(list); try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
            setLoading(false);
            fetch(`/api/chapter-intro?book=${book.number}&chapter=${chapter}`).then((r) => r.ok ? r.json() : null).then((d) => alive && setIntro(d?.intro || d || null)).catch(() => {});
            fetch(`/api/prayer-passages?book=${book.number}&chapter=${chapter}`).then((r) => r.ok ? r.json() : null).then((d) => alive && setPrayer(Array.isArray(d) ? d[0] : d?.passages?.[0] || d?.data?.[0] || null)).catch(() => {});
            return;
          }
        }
        throw new Error("empty");
      } catch {
        try { const cached = localStorage.getItem(key); if (cached && alive) { setVerses(JSON.parse(cached)); setOfflineCopy(true); setLoading(false); return; } } catch {}
        if (alive) { setVerses([]); setLoading(false); }
      }
    };
    load(); return () => { alive = false; };
  }, [book.number, chapter, lang]);
  const goChapter = (n: number) => {
    if (n < 1) { const prev = getBook(book.number - 1); if (prev) router.push(`/bible-reader?book=${prev.number}&chapter=${prev.chapters}&lang=${lang}`); return; }
    if (n > book.chapters) { const next = getBook(book.number + 1); if (next) router.push(`/bible-reader?book=${next.number}&chapter=1&lang=${lang}`); return; }
    const p = new URLSearchParams(sp.toString()); p.set("book", String(book.number)); p.set("chapter", String(n)); p.set("lang", lang);
    router.push(`${pathname}?${p.toString()}`); setPanel("none"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const shareVerse = async (v: any) => {
    const num = v.verse ?? v.number; const text = safe(v.text || v.text_english || v.luganda || v.content);
    const url = `${window.location.origin}/bible-reader?book=${book.number}&chapter=${chapter}&verse=${num}`;
    const msg = `📖 ${book.en} ${chapter}:${num}\n\n"${text}"\n\n👉 ${url}`;
    try { await navigator.clipboard.writeText(msg); alert("Verse copied."); } catch { prompt("Copy this verse:", msg); }
  };
  return (
    <div className="pr-chapter">
      <div className="pr-ch-hero">
        <h2>{book.en} {chapter}</h2>
        <p>{book.lu} · {verses.length || "?"} verses · {lang === "lu" ? "Luganda" : "English"}</p>
      </div>
      <div className="pr-ch-bar">
        <div className="pr-ch-nav">
          <button onClick={() => goChapter(chapter - 1)} aria-label="Previous chapter">‹</button>
          <button className="pr-ch-current" onClick={() => setPanel(panel === "grid" ? "none" : "grid")}>☰ Chapter {chapter}</button>
          <button onClick={() => goChapter(chapter + 1)} aria-label="Next chapter">›</button>
        </div>
        <div className="pr-ch-tools">
          <div className="pr-lang-toggle small" role="group" aria-label="Choose the language">
            <button className={lang === "en" ? "is-active" : ""} onClick={() => onLang("en")}>English</button>
            <button className={lang === "lu" ? "is-active" : ""} onClick={() => onLang("lu")}>Luganda</button>
          </div>
          <button onClick={() => setFont((f) => Math.max(14, f - 2))}>A-</button>
          <button onClick={() => setFont((f) => Math.min(26, f + 2))}>A+</button>
          <button onClick={() => setPanel(panel === "intro" ? "none" : "intro")}>📖 Intro &amp; Prayer</button>
          <button onClick={() => setPanel(panel === "study" ? "none" : "study")}>📚 Study</button>
        </div>
      </div>
      {panel === "grid" && (
        <div className="pr-ch-grid">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
            <button key={n} className={n === chapter ? "is-active" : ""} onClick={() => goChapter(n)}>{n}</button>
          ))}
        </div>
      )}
      {offlineCopy && <p className="pr-note">📵 Showing your offline copy. It refreshes automatically when you are back online.</p>}
      {panel === "intro" && (
        <div className="pr-side-panel">
          <h3>📖 Chapter intro — {book.en} {chapter}</h3>
          {intro ? <p>{safe(intro.body_en || intro.body || intro.heading_en || "")}</p> : <p>Read this chapter slowly, twice. Notice which word stays with you — that is often where God is speaking.</p>}
          <h3 style={{ marginTop: 16 }}>🙏 Pray this chapter</h3>
          {prayer ? (<><p><strong>{safe(prayer.title_english || prayer.title || "")}</strong></p><p>{safe(prayer.intro?.en?.body || prayer.guided_prayer?.en?.body || prayer.closing_prayer?.en?.body || "")}</p></>)
            : (<p>Lord, speak to me through this chapter. Show me one truth to carry today. In Jesus’ name, Amen.</p>)}
        </div>
      )}
      {panel === "study" && (
        <div className="pr-side-panel">
          <h3>📚 Study resources — {book.en} {chapter}</h3>
          <p>Chapter commentary, cross-references and Q&amp;A for this chapter are added by the admin in the Admin Panel. If nothing shows here yet, the chapter text below is still complete.</p>
          <p><Link href={`/prayer-library?book=${book.number}&chapter=${chapter}`}>Open Prayer Library for this chapter →</Link></p>
          <p><Link href={`/devotionals?book=${book.number}`}>Devotionals on {book.en} →</Link></p>
        </div>
      )}
      {loading ? <p className="pr-loading">Loading {book.en} {chapter}…</p> : verses.length === 0 ? (
        <p className="pr-empty">This chapter is not available yet. Go to the Offline centre to download it, or try again when you are online.</p>
      ) : (
        <div className="pr-verses" style={{ fontSize: font }}>
          {verses.map((v: any, i: number) => {
            const num = v.verse ?? v.number ?? i + 1;
            const text = safe(v.text || v.text_english || v.text_luganda || v.luganda || v.content);
            return (
              <p key={num} className="pr-verse" id={`verse-${num}`}>
                <span className="pr-v-num">{num}</span> {text}
                <button className="pr-v-share" onClick={() => shareVerse(v)} aria-label={`Share verse ${num}`}>Share</button>
              </p>
            );
          })}
        </div>
      )}
      <div className="pr-ch-closing">
        <h3>🙏 Closing Prayer — {book.en} {chapter}</h3>
        <p>{prayer?.closing_prayer?.en?.body || "Father, thank You for Your Word today. Walk with me through this day, keep me in Your peace, and let others see Your goodness through me. In Jesus’ name, Amen."}</p>
      </div>
    </div>
  );
}

// ---------- Main page (was BibleReader in finestructure) ----------
function BibleReaderInner() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [search, setSearch] = useState(""); const [tab, setTab] = useState("old");
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [offlineReady, setOfflineReady] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      const fromIDB = await readDownloadedFromIDB();
      if (!active) return;
      setDownloaded(fromIDB ?? readDownloadedFromStorage()); setOfflineReady(true);
    })();
    fetch("/api/reading-plan").then((r) => r.ok ? r.json() : null).then((j) => { if (active && Array.isArray(j)) setTodayCount(j.length); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const bookNumber = Number(searchParams.get("book")) || 0;
  const selectedBook = bookNumber ? getBook(bookNumber) : null;
  const selectedAccent = selectedBook && selectedBook.number <= 39 ? "#b98428" : "#2f5d8a";
  const lang = searchParams.get("lang") === "lu" ? "lu" : "en";
  const setLang = (value: "en" | "lu") => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "lu") next.set("lang", "lu"); else next.delete("lang");
    router.push(`${pathname}?${next.toString()}`);
  };
  const clearBook = () => router.push("/bible-reader");
  return (
    <div>
      <section className="pr-reader-top" style={{ ["--pr-accent" as any]: selectedAccent }}>
        <div className="pr-container">
          <div className="pr-reader-topbar">
            <div className="pr-reader-pills">
              <Link href="/dashboard" className="pr-reader-pill pr-reader-pill-dark">‹ Dashboard</Link>
              <Link href="/" className="pr-reader-pill">‹ Home</Link>
              {selectedBook ? (<button type="button" className="pr-reader-pill pr-reader-pill-gold" onClick={clearBook}>📖 All books</button>) : null}
            </div>
            <div className="pr-reader-pills">
              <div className="pr-lang-toggle" role="group" aria-label="Choose the language of the chapter">
                <button type="button" className={`pr-lang-btn${lang === "en" ? " is-active" : ""}`} aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
                <button type="button" className={`pr-lang-btn${lang === "lu" ? " is-active" : ""}`} aria-pressed={lang === "lu"} onClick={() => setLang("lu")}>Luganda</button>
              </div>
              {selectedBook ? (<><span className="pr-reader-pill pr-reader-pill-gold">📖 Bible Reader</span></>)
                : (<>{todayCount > 0 ? (<span className="pr-reader-pill pr-reader-pill-note">📖 {todayCount} in the reading plan</span>) : null}<span className="pr-reader-pill pr-reader-pill-gold">📖 Bible Reader</span></>)}
            </div>
          </div>
          {!selectedBook && (
            <div className="pr-reader-hero">
              <div><h1 className="pr-reader-title">Choose a book</h1><p className="pr-reader-sub">Pray · Read · Listen — English &amp; Luganda</p></div>
              <div className="pr-reader-stat"><span className="pr-reader-stat-icon">✦</span><div><p className="pr-reader-stat-total">66 books</p><p className="pr-reader-stat-line">39 Old Testament · 27 New Testament</p></div></div>
            </div>
          )}
          {offlineReady && downloaded.size > 0 ? (<span className="pr-reader-offline">📵 {downloaded.size} {downloaded.size === 1 ? "book" : "books"} available offline</span>) : null}
        </div>
      </section>
      <div className="pr-container" style={{ paddingTop: 24, paddingBottom: 56 }}>
        {selectedBook ? (<ChapterView book={selectedBook} lang={lang} onLang={setLang} />)
          : (<BookGrid search={search} onSearch={setSearch} activeTab={tab} onTabChange={setTab} downloaded={downloaded} />)}
      </div>
      <style jsx global>{`
        .pr-container{max-width:1120px;margin:0 auto;padding:0 16px}
        .pr-reader-top{background:#1d4035;color:#fff;padding:18px 0 22px}
        .pr-reader-topbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
        .pr-reader-pills{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .pr-reader-pill{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.35);color:#fff;text-decoration:none;background:transparent;font-size:14px;cursor:pointer}
        .pr-reader-pill-dark{background:rgba(0,0,0,.25)}
        .pr-reader-pill-gold{background:#e9c981;color:#1d4035;border-color:#e9c981;font-weight:700}
        .pr-reader-pill-note{background:rgba(255,255,255,.12)}
        .pr-lang-toggle{display:flex;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:3px;gap:3px}
        .pr-lang-toggle button,.pr-lang-btn{border:0;background:transparent;color:#fff;padding:6px 14px;border-radius:999px;cursor:pointer;font-size:14px}
        .pr-lang-toggle .is-active,.pr-lang-btn.is-active{background:#e9c981;color:#1d4035;font-weight:700}
        .pr-lang-toggle.small{background:#eef2ec;border-color:#d8e0d2}.pr-lang-toggle.small button{color:#1d4035}
        .pr-reader-hero{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-top:22px}
        .pr-reader-title{font-size:40px;line-height:1.1;margin:0;font-family:Georgia,serif}
        .pr-reader-sub{opacity:.85;margin:6px 0 0}
        .pr-reader-stat{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:12px 16px}
        .pr-reader-stat-icon{width:32px;height:32px;border-radius:999px;background:#e9c981;color:#1d4035;display:grid;place-items:center;font-weight:800}
        .pr-reader-stat-total{margin:0;font-weight:800}.pr-reader-stat-line{margin:2px 0 0;font-size:13px;opacity:.85}
        .pr-reader-offline{display:inline-flex;gap:6px;align-items:center;margin-top:14px;background:rgba(0,0,0,.22);padding:6px 12px;border-radius:999px;font-size:13px}
        .pr-book-search input{width:100%;padding:12px 14px;border:1px solid #d8e0d2;border-radius:12px;font-size:15px;background:#fff}
        .pr-book-tabs{display:flex;gap:8px;margin:16px 0}.pr-book-tabs button{padding:9px 16px;border-radius:999px;border:1px solid #d8e0d2;background:#fff;cursor:pointer;font-weight:600}
        .pr-book-tabs .is-active{background:#1d4035;color:#fff;border-color:#1d4035}
        .pr-book-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
        .pr-book-card{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:14px;text-decoration:none;color:#1c382e}
        .pr-book-card.is-ot{border-top:4px solid #b98428}.pr-book-card.is-nt{border-top:4px solid #2f5d8a}
        .pr-book-abbr{font-weight:800;font-size:20px;min-width:38px}.pr-book-names{display:flex;flex-direction:column;flex:1;min-width:0}
        .pr-book-names small{color:#5d6d5d}.pr-book-meta{display:flex;flex-direction:column;gap:4px;align-items:flex-end}
        .pr-ch-pill{font-size:12px;background:#f3efe2;padding:3px 8px;border-radius:999px;white-space:nowrap}.pr-off-badge{font-size:11px;color:#1d7a4a;font-weight:700}
        .pr-book-chev{font-size:22px;color:#a9852e}.pr-empty{background:#fff;border:1px solid #e6e2d4;border-radius:12px;padding:20px;color:#5d6d5d}
        .pr-ch-hero h2{font-family:Georgia,serif;font-size:32px;margin:0;color:#1c382e}.pr-ch-hero p{color:#5d6d5d;margin:4px 0 0}
        .pr-ch-bar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:12px;margin-top:14px}
        .pr-ch-nav,.pr-ch-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .pr-ch-bar button{padding:8px 12px;border-radius:999px;border:1px solid #d8e0d2;background:#fff;cursor:pointer}
        .pr-ch-current{font-weight:700!important}.pr-ch-grid{display:flex;flex-wrap:wrap;gap:8px;background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:14px;margin-top:12px}
        .pr-ch-grid button{min-width:40px;height:36px;border-radius:10px;border:1px solid #d8e0d2;background:#faf8f2;cursor:pointer}.pr-ch-grid .is-active{background:#1d4035;color:#fff}
        .pr-note{background:#eef2ec;border-radius:10px;padding:10px 12px;margin-top:12px;color:#1c382e}
        .pr-side-panel{background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:18px;margin-top:12px}.pr-side-panel h3{margin:0 0 8px;color:#1c382e}
        .pr-verses{background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:18px;margin-top:12px}
        .pr-verse{line-height:1.8;margin:0 0 14px;font-family:Georgia,serif}.pr-v-num{color:#a9852e;font-weight:800;margin-right:8px;font-size:.8em}
        .pr-v-share{margin-left:8px;font-size:12px;border:1px solid #d8e0d2;background:#faf8f2;border-radius:999px;padding:3px 10px;cursor:pointer}
        .pr-ch-closing{background:#1d4035;color:#fff;border-radius:14px;padding:18px;margin-top:12px}.pr-ch-closing h3{margin:0 0 8px}.pr-ch-closing p{line-height:1.8;opacity:.95}
        .pr-loading{padding:24px;text-align:center;color:#5d6d5d}
      `}</style>
    </div>
  );
}
export default function BibleReaderPage() {
  return (<Suspense fallback={<div className="pr-container" style={{ padding: 32 }}>Loading Bible Reader…</div>}><BibleReaderInner /></Suspense>);
}
