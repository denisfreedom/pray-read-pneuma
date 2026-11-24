"use client";
// ============================================================
// PRAY-READ BIBLE — BIBLE READER — V2 PIXEL-MATCH TO SCREENSHOTS
// PASTE AS: app/bible-reader/page.tsx
// DELETE old app/bible-reader/page.tsx FIRST, then create fresh.
// ------------------------------------------------------------
// EXACTLY like screenshots:
//  - Top bar: [‹ Dashboard dark] [‹ Home] ........ [English|Luganda] [30 in reading plan] [Bible Reader gold]
//  - Hero: "Choose a book" + "Pray · Read · Listen - English & Luganda"
//    + dark stat card: ✦ 66 books / 39 Old Testament · 27 New Testament
//  - Search: "Search books… e.g. Psalms, Obukikkulirwa, Philemon"
//  - Tabs bar: [📖 Old Testament 39] [📕 New Testament 27] — TAP SCROLLS to section,
//    does NOT hide the other testament. BOTH sections always visible.
//  - Section header: 📖 Old Testament ........ 39 books  /  📕 New Testament .... 27 books
//  - Cards: 8 PER ROW (desktop), 4 (tablet), 2 (phone)
//    Card: gold top border (OT) / blue top border (NT), ABBR big bold,
//    English bold, Luganda grey, [ 50 / chapters ] pill + [ › ] circle
//  - ALL 66 books shown by default. Search filters BOTH sections.
//  - Tap card -> ?book=N (chapter view, same file)
// ============================================================
import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Book = { number: number; en: string; lu: string; abbr: string; chapters: number };
const OT: Book[] = [
  { number: 1, en: "Genesis", lu: "Olubereberye", abbr: "Gen", chapters: 50 },
  { number: 2, en: "Exodus", lu: "Okuva", abbr: "Exod", chapters: 40 },
  { number: 3, en: "Leviticus", lu: "Ebyabaleevi", abbr: "Lev", chapters: 27 },
  { number: 4, en: "Numbers", lu: "Okubala", abbr: "Num", chapters: 36 },
  { number: 5, en: "Deuteronomy", lu: "Ekyamateeka", abbr: "Deut", chapters: 34 },
  { number: 6, en: "Joshua", lu: "Yoswa", abbr: "Josh", chapters: 24 },
  { number: 7, en: "Judges", lu: "Ekyabalamuzi", abbr: "Judg", chapters: 21 },
  { number: 8, en: "Ruth", lu: "Luusi", abbr: "Ruth", chapters: 4 },
  { number: 9, en: "1 Samuel", lu: "1 Samwiri", abbr: "1 Sam", chapters: 31 },
  { number: 10, en: "2 Samuel", lu: "2 Samwiri", abbr: "2 Sam", chapters: 24 },
  { number: 11, en: "1 Kings", lu: "1 Bassekabaka", abbr: "1 Kings", chapters: 22 },
  { number: 12, en: "2 Kings", lu: "2 Bassekabaka", abbr: "2 Kings", chapters: 25 },
  { number: 13, en: "1 Chronicles", lu: "1 Ebyomumirembe", abbr: "1 Chron", chapters: 29 },
  { number: 14, en: "2 Chronicles", lu: "2 Ebyomumirembe", abbr: "2 Chron", chapters: 36 },
  { number: 15, en: "Ezra", lu: "Ezera", abbr: "Ezra", chapters: 10 },
  { number: 16, en: "Nehemiah", lu: "Nekkemiya", abbr: "Neh", chapters: 13 },
  { number: 17, en: "Esther", lu: "Eseza", abbr: "Esther", chapters: 10 },
  { number: 18, en: "Job", lu: "Yobu", abbr: "Job", chapters: 42 },
  { number: 19, en: "Psalms", lu: "Zabbuli", abbr: "Ps", chapters: 150 },
  { number: 20, en: "Proverbs", lu: "Engero", abbr: "Prov", chapters: 31 },
  { number: 21, en: "Ecclesiastes", lu: "Omubuulizi", abbr: "Eccl", chapters: 12 },
  { number: 22, en: "Song of Solomon", lu: "Oluyimba", abbr: "Song", chapters: 8 },
  { number: 23, en: "Isaiah", lu: "Isaaya", abbr: "Isa", chapters: 66 },
  { number: 24, en: "Jeremiah", lu: "Yeremiya", abbr: "Jer", chapters: 52 },
  { number: 25, en: "Lamentations", lu: "Okukungubaga", abbr: "Lam", chapters: 5 },
  { number: 26, en: "Ezekiel", lu: "Ezekyeri", abbr: "Ezek", chapters: 48 },
  { number: 27, en: "Daniel", lu: "Danyeri", abbr: "Dan", chapters: 12 },
  { number: 28, en: "Hosea", lu: "Koseya", abbr: "Hos", chapters: 14 },
  { number: 29, en: "Joel", lu: "Yoweeri", abbr: "Joel", chapters: 3 },
  { number: 30, en: "Amos", lu: "Amosi", abbr: "Amos", chapters: 9 },
  { number: 31, en: "Obadiah", lu: "Obadiya", abbr: "Obad", chapters: 1 },
  { number: 32, en: "Jonah", lu: "Yona", abbr: "Jonah", chapters: 4 },
  { number: 33, en: "Micah", lu: "Mikka", abbr: "Mic", chapters: 7 },
  { number: 34, en: "Nahum", lu: "Nakumu", abbr: "Nah", chapters: 3 },
  { number: 35, en: "Habakkuk", lu: "Kaabakuuku", abbr: "Hab", chapters: 3 },
  { number: 36, en: "Zephaniah", lu: "Zeffaniya", abbr: "Zeph", chapters: 3 },
  { number: 37, en: "Haggai", lu: "Kaggayi", abbr: "Hag", chapters: 2 },
  { number: 38, en: "Zechariah", lu: "Zekkaliya", abbr: "Zech", chapters: 14 },
  { number: 39, en: "Malachi", lu: "Malaki", abbr: "Mal", chapters: 4 },
];
const NT: Book[] = [
  { number: 40, en: "Matthew", lu: "Matayo", abbr: "Matt", chapters: 28 },
  { number: 41, en: "Mark", lu: "Makko", abbr: "Mark", chapters: 16 },
  { number: 42, en: "Luke", lu: "Lukka", abbr: "Luke", chapters: 24 },
  { number: 43, en: "John", lu: "Yokaana", abbr: "John", chapters: 21 },
  { number: 44, en: "Acts", lu: "Ebikolwa", abbr: "Acts", chapters: 28 },
  { number: 45, en: "Romans", lu: "Abaruumi", abbr: "Rom", chapters: 16 },
  { number: 46, en: "1 Corinthians", lu: "1 Abakkolinso", abbr: "1 Cor", chapters: 16 },
  { number: 47, en: "2 Corinthians", lu: "2 Abakkolinso", abbr: "2 Cor", chapters: 13 },
  { number: 48, en: "Galatians", lu: "Abaggalatiya", abbr: "Gal", chapters: 6 },
  { number: 49, en: "Ephesians", lu: "Abaefeeso", abbr: "Eph", chapters: 6 },
  { number: 50, en: "Philippians", lu: "Abafiripi", abbr: "Phil", chapters: 4 },
  { number: 51, en: "Colossians", lu: "Abakkolosaayi", abbr: "Col", chapters: 4 },
  { number: 52, en: "1 Thessalonians", lu: "1 Abasessalonika", abbr: "1 Thess", chapters: 5 },
  { number: 53, en: "2 Thessalonians", lu: "2 Abasessalonika", abbr: "2 Thess", chapters: 3 },
  { number: 54, en: "1 Timothy", lu: "1 Timoseewo", abbr: "1 Tim", chapters: 6 },
  { number: 55, en: "2 Timothy", lu: "2 Timoseewo", abbr: "2 Tim", chapters: 4 },
  { number: 56, en: "Titus", lu: "Tito", abbr: "Titus", chapters: 3 },
  { number: 57, en: "Philemon", lu: "Firemooni", abbr: "Philem", chapters: 1 },
  { number: 58, en: "Hebrews", lu: "Abaebbulaniya", abbr: "Heb", chapters: 13 },
  { number: 59, en: "James", lu: "Yakobo", abbr: "Jas", chapters: 5 },
  { number: 60, en: "1 Peter", lu: "1 Peetero", abbr: "1 Pet", chapters: 5 },
  { number: 61, en: "2 Peter", lu: "2 Peetero", abbr: "2 Pet", chapters: 3 },
  { number: 62, en: "1 John", lu: "1 Yokaana", abbr: "1 John", chapters: 5 },
  { number: 63, en: "2 John", lu: "2 Yokaana", abbr: "2 John", chapters: 1 },
  { number: 64, en: "3 John", lu: "3 Yokaana", abbr: "3 John", chapters: 1 },
  { number: 65, en: "Jude", lu: "Yuda", abbr: "Jude", chapters: 1 },
  { number: 66, en: "Revelation", lu: "Okubikkulirwa", abbr: "Rev", chapters: 22 },
];
const ALL = [...OT, ...NT];
const getBook = (n: number) => ALL.find((b) => b.number === n) || null;
const safe = (v: any) => (v == null ? "" : String(v));

// ---------- Book Card — EXACT screenshot card ----------
function BookCard({ b, downloaded, lang }: { b: Book; downloaded: boolean; lang: string }) {
  const isNT = b.number > 39;
  return (
    <Link href={`/bible-reader?book=${b.number}&lang=${lang}`} className={`pr-card ${isNT ? "is-nt" : "is-ot"}`}>
      <span className="pr-card-abbr">{b.abbr}</span>
      <span className="pr-card-en">{b.en}</span>
      <span className="pr-card-lu">{b.lu}</span>
      <span className="pr-card-foot">
        <span className={`pr-chap-pill ${isNT ? "is-nt" : "is-ot"}`}>
          <strong>{b.chapters}</strong><small>chapters</small>
        </span>
        <span className="pr-chev">›</span>
      </span>
      {downloaded ? <span className="pr-off">● Offline</span> : null}
    </Link>
  );
}
function Section({ title, icon, books, total, downloaded, lang, id }: {
  title: string; icon: string; books: Book[]; total: number; downloaded: Set<number>; lang: string; id: string;
}) {
  if (books.length === 0) return null;
  return (
    <section id={id} className="pr-section">
      <div className="pr-section-head">
        <h2><span className="pr-sec-icon">{icon}</span> {title}</h2>
        <span className="pr-sec-count">{books.length} of {total} books</span>
      </div>
      <div className="pr-grid">
        {books.map((b) => <BookCard key={b.number} b={b} downloaded={downloaded.has(b.number)} lang={lang} />)}
      </div>
    </section>
  );
}

// ---------- Chapter view (same as V1, kept) ----------
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
    (async () => {
      try {
        const res = await fetch(`/api/bible-books/${book.number}/${chapter}?lang=${lang}`);
        if (res.ok) {
          const j = await res.json(); const list = j.verses || j.data || j.chapter?.verses || [];
          if (alive && list.length) {
            setVerses(list); try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
            setLoading(false);
            fetch(`/api/chapter-intro?book=${book.number}&chapter=${chapter}`).then((r) => r.ok ? r.json() : null).then((d) => alive && setIntro(d?.intro || d || null)).catch(() => {});
            fetch(`/api/prayer-passages?book=${book.number}&chapter=${chapter}`).then((r) => r.ok ? r.json() : null).then((d) => alive && setPrayer(Array.isArray(d) ? d[0] : d?.passages?.[0] || d?.data?.[0] || null)).catch(() => {});
            return;
          }
        } throw new Error("empty");
      } catch {
        try { const c = localStorage.getItem(key); if (c && alive) { setVerses(JSON.parse(c)); setOfflineCopy(true); setLoading(false); return; } } catch {}
        if (alive) { setVerses([]); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [book.number, chapter, lang]);
  const goChapter = (n: number) => {
    if (n < 1) { const p = getBook(book.number - 1); if (p) router.push(`/bible-reader?book=${p.number}&chapter=${p.chapters}&lang=${lang}`); return; }
    if (n > book.chapters) { const nx = getBook(book.number + 1); if (nx) router.push(`/bible-reader?book=${nx.number}&chapter=1&lang=${lang}`); return; }
    const p = new URLSearchParams(sp.toString()); p.set("book", String(book.number)); p.set("chapter", String(n)); p.set("lang", lang);
    router.push(`${pathname}?${p.toString()}`); setPanel("none"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const shareVerse = async (v: any) => {
    const num = v.verse ?? v.number; const text = safe(v.text || v.text_english || v.text_luganda || v.luganda || v.content);
    const url = `${window.location.origin}/bible-reader?book=${book.number}&chapter=${chapter}&verse=${num}`;
    const msg = `📖 ${book.en} ${chapter}:${num}\n\n"${text}"\n\n👉 ${url}`;
    try { await navigator.clipboard.writeText(msg); alert("Verse copied."); } catch { prompt("Copy this verse:", msg); }
  };
  return (
    <div className="pr-chapter">
      <div className="pr-ch-hero"><h2>{book.en} {chapter}</h2><p>{book.lu} · {verses.length || "?"} verses · {lang === "lu" ? "Luganda" : "English"}</p></div>
      <div className="pr-ch-bar">
        <div className="pr-ch-nav">
          <button onClick={() => goChapter(chapter - 1)}>‹</button>
          <button className="pr-ch-current" onClick={() => setPanel(panel === "grid" ? "none" : "grid")}>☰ Chapter {chapter}</button>
          <button onClick={() => goChapter(chapter + 1)}>›</button>
        </div>
        <div className="pr-ch-tools">
          <div className="pr-lang-toggle small"><button className={lang === "en" ? "is-active" : ""} onClick={() => onLang("en")}>English</button><button className={lang === "lu" ? "is-active" : ""} onClick={() => onLang("lu")}>Luganda</button></div>
          <button onClick={() => setFont((f) => Math.max(14, f - 2))}>A-</button><button onClick={() => setFont((f) => Math.min(26, f + 2))}>A+</button>
          <button onClick={() => setPanel(panel === "intro" ? "none" : "intro")}>📖 Intro &amp; Prayer</button>
          <button onClick={() => setPanel(panel === "study" ? "none" : "study")}>📚 Study</button>
        </div>
      </div>
      {panel === "grid" && <div className="pr-ch-grid">{Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => <button key={n} className={n === chapter ? "is-active" : ""} onClick={() => goChapter(n)}>{n}</button>)}</div>}
      {offlineCopy && <p className="pr-note">📵 Showing your offline copy. It refreshes automatically when you are back online.</p>}
      {panel === "intro" && <div className="pr-side-panel"><h3>📖 Chapter intro — {book.en} {chapter}</h3>{intro ? <p>{safe(intro.body_en || intro.body || intro.heading_en || "")}</p> : <p>Read this chapter slowly, twice. Notice which word stays with you — that is often where God is speaking.</p>}<h3 style={{ marginTop: 16 }}>🙏 Pray this chapter</h3>{prayer ? <><p><strong>{safe(prayer.title_english || prayer.title || "")}</strong></p><p>{safe(prayer.intro?.en?.body || prayer.guided_prayer?.en?.body || prayer.closing_prayer?.en?.body || "")}</p></> : <p>Lord, speak to me through this chapter. Show me one truth to carry today. In Jesus’ name, Amen.</p>}</div>}
      {panel === "study" && <div className="pr-side-panel"><h3>📚 Study resources — {book.en} {chapter}</h3><p>Chapter commentary, cross-references and Q&amp;A for this chapter are added by the admin. If nothing shows here yet, the chapter text below is still complete.</p><p><Link href={`/prayer-library?book=${book.number}&chapter=${chapter}`}>Open Prayer Library for this chapter →</Link></p><p><Link href={`/devotionals?book=${book.number}`}>Devotionals on {book.en} →</Link></p></div>}
      {loading ? <p className="pr-loading">Loading {book.en} {chapter}…</p> : verses.length === 0 ? <p className="pr-empty">This chapter is not available yet. Go to the Offline centre to download it, or try again when you are online.</p> : (
        <div className="pr-verses" style={{ fontSize: font }}>{verses.map((v: any, i: number) => { const num = v.verse ?? v.number ?? i + 1; const text = safe(v.text || v.text_english || v.text_luganda || v.luganda || v.content); return (<p key={num} className="pr-verse"><span className="pr-v-num">{num}</span> {text}<button className="pr-v-share" onClick={() => shareVerse(v)}>Share</button></p>); })}</div>
      )}
      <div className="pr-ch-closing"><h3>🙏 Closing Prayer — {book.en} {chapter}</h3><p>{prayer?.closing_prayer?.en?.body || "Father, thank You for Your Word today. Walk with me through this day, keep me in Your peace, and let others see Your goodness through me. In Jesus’ name, Amen."}</p></div>
    </div>
  );
}

// ---------- Main ----------
function BibleReaderInner() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [search, setSearch] = useState(""); const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [offlineReady, setOfflineReady] = useState(false); const [todayCount, setTodayCount] = useState(30);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if ("indexedDB" in window) {
          const db: IDBDatabase = await new Promise((res, rej) => { const r = indexedDB.open("prayread-offline", 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
          if (db.objectStoreNames.contains("chapters")) {
            const rows: any[] = await new Promise((res, rej) => { const tx = db.transaction("chapters", "readonly"); const q = tx.objectStore("chapters").getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); });
            db.close(); const per = new Map<number, number>(); rows.forEach((row) => { const n = Number(row?.book_number || row?.bookNumber); if (n) per.set(n, (per.get(n) || 0) + 1); });
            const set = new Set<number>(); per.forEach((c, n) => { const b = getBook(n); if (b && c >= b.chapters) set.add(n); });
            if (active) { setDownloaded(set); setOfflineReady(true); return; }
          } else db.close();
        }
      } catch {}
      try { const raw = localStorage.getItem("prayread-downloaded-books"); if (raw && active) setDownloaded(new Set(JSON.parse(raw) as number[])); } catch {}
      if (active) setOfflineReady(true);
    })();
    fetch("/api/reading-plan").then((r) => r.ok ? r.json() : null).then((j) => { if (active && Array.isArray(j) && j.length) setTodayCount(j.length); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const bookNumber = Number(searchParams.get("book")) || 0;
  const selectedBook = bookNumber ? getBook(bookNumber) : null;
  const lang = searchParams.get("lang") === "lu" ? "lu" : "en";
  const setLang = (v: "en" | "lu") => { const n = new URLSearchParams(searchParams.toString()); if (v === "lu") n.set("lang", "lu"); else n.delete("lang"); router.push(`${pathname}?${n.toString()}`); };
  const q = search.trim().toLowerCase();
  const matches = (b: Book) => !q || b.en.toLowerCase().includes(q) || b.lu.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q);
  const otList = OT.filter(matches); const ntList = NT.filter(matches);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="pr-page">
      {/* TOP BAR — matches screenshot */}
      <section className="pr-top">
        <div className="pr-container">
          <div className="pr-topbar">
            <div className="pr-pills">
              <Link href="/dashboard" className="pr-pill pr-pill-dark">‹ &nbsp;Dashboard</Link>
              <Link href="/" className="pr-pill">‹ &nbsp;Home</Link>
              {selectedBook ? <Link href="/bible-reader" className="pr-pill pr-pill-gold">📖 All books</Link> : null}
            </div>
            <div className="pr-pills">
              <div className="pr-lang" role="group" aria-label="Language">
                <button className={lang === "en" ? "is-active" : ""} onClick={() => setLang("en")}>English</button>
                <button className={lang === "lu" ? "is-active" : ""} onClick={() => setLang("lu")}>Luganda</button>
              </div>
              {todayCount > 0 ? <span className="pr-pill pr-pill-note">📖 {todayCount} in the reading plan</span> : null}
              <span className="pr-pill pr-pill-gold">📖 Bible Reader</span>
            </div>
          </div>
          {!selectedBook && (
            <div className="pr-hero">
              <div><h1>Choose a book</h1><p>Pray · Read · Listen - English &amp; Luganda</p></div>
              <div className="pr-stat"><span className="pr-stat-ic">✦</span><div><p className="pr-stat-total">66 books</p><p className="pr-stat-line">39 Old Testament · 27 New Testament</p></div></div>
            </div>
          )}
          {offlineReady && downloaded.size > 0 ? <span className="pr-offline">📵 {downloaded.size} {downloaded.size === 1 ? "book" : "books"} available offline</span> : null}
        </div>
      </section>

      <div className="pr-container pr-body">
        {selectedBook ? (
          <ChapterView book={selectedBook} lang={lang} onLang={setLang} />
        ) : (
          <>
            {/* SEARCH */}
            <div className="pr-search"><span>🔍</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search books… e.g. Psalms, Obukikkulirwa, Philemon" aria-label="Search books" /></div>
            {/* TABS BAR — scrolls, does NOT hide the other testament */}
            <div className="pr-tabs">
              <button onClick={() => scrollTo("ot-section")}>📖 &nbsp;Old Testament <span className="pr-tab-n">39</span></button>
              <button onClick={() => scrollTo("nt-section")}>📕 &nbsp;New Testament <span className="pr-tab-n is-nt">27</span></button>
            </div>
            {q && otList.length === 0 && ntList.length === 0 ? (
              <p className="pr-empty">No book matches “{search}”. Try Psalms, Genesis or Okubikkulirwa.</p>
            ) : (
              <>
                <Section title="Old Testament" icon="📖" books={otList} total={39} downloaded={downloaded} lang={lang} id="ot-section" />
                <Section title="New Testament" icon="📕" books={ntList} total={27} downloaded={downloaded} lang={lang} id="nt-section" />
              </>
            )}
          </>
        )}
      </div>
      <style jsx global>{`
        .pr-page{background:#faf8f2;min-height:100vh;color:#1c382e}
        .pr-container{max-width:1280px;margin:0 auto;padding:0 20px}
        .pr-top{background:#1d4035;color:#fff;padding:20px 0 26px}
        .pr-topbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
        .pr-pills{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .pr-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.35);color:#fff;text-decoration:none;background:transparent;font-size:15px;cursor:pointer;font-weight:500}
        .pr-pill-dark{background:#12302a;border-color:#12302a;font-weight:700}
        .pr-pill-gold{background:#e9c981;color:#1d4035;border-color:#e9c981;font-weight:700}
        .pr-pill-note{background:rgba(255,255,255,.08);color:#e9c981;border-color:rgba(233,201,129,.35)}
        .pr-lang{display:flex;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:4px;gap:4px}
        .pr-lang button{border:0;background:transparent;color:#fff;padding:7px 18px;border-radius:999px;cursor:pointer;font-size:15px}
        .pr-lang .is-active{background:#1d4035;color:#fff;font-weight:700;box-shadow:0 0 0 1px rgba(255,255,255,.25)}
        .pr-hero{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-top:26px}
        .pr-hero h1{font-size:44px;line-height:1.05;margin:0;font-family:Georgia,serif;letter-spacing:-.5px}
        .pr-hero p{opacity:.9;margin:8px 0 0;font-size:18px}
        .pr-stat{display:flex;gap:12px;align-items:center;background:#12302a;border-radius:14px;padding:14px 20px}
        .pr-stat-ic{width:38px;height:38px;border-radius:10px;background:#2a4a3a;display:grid;place-items:center;font-size:18px}
        .pr-stat-total{margin:0;font-weight:800;font-size:19px}.pr-stat-line{margin:2px 0 0;font-size:14px;opacity:.85}
        .pr-offline{display:inline-flex;gap:6px;align-items:center;margin-top:14px;background:rgba(0,0,0,.22);padding:6px 12px;border-radius:999px;font-size:13px}
        .pr-body{padding-top:26px;padding-bottom:56px}
        .pr-search{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid #e9e6da;border-radius:16px;padding:14px 18px;box-shadow:0 2px 8px rgba(0,0,0,.03)}
        .pr-search span{font-size:19px}.pr-search input{border:0;outline:0;width:100%;font-size:16px;background:transparent;color:#1c382e}
        .pr-search input::placeholder{color:#8a9a8a}
        .pr-tabs{display:flex;gap:0;background:#fff;border:1px solid #e9e6da;border-radius:14px;padding:6px;margin:18px 0 8px;box-shadow:0 2px 8px rgba(0,0,0,.03)}
        .pr-tabs button{flex:1;border:0;background:transparent;padding:13px;border-radius:10px;cursor:pointer;font-size:16px;font-weight:600;color:#1c382e;display:flex;align-items:center;justify-content:center;gap:8px}
        .pr-tabs button:first-child{background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .pr-tab-n{background:#1d4035;color:#fff;border-radius:999px;padding:2px 9px;font-size:13px}.pr-tab-n.is-nt{background:#eef2f8;color:#5a7aa0}
        .pr-section{margin-top:26px}.pr-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .pr-section-head h2{font-size:21px;margin:0;display:flex;gap:10px;align-items:center;font-family:Georgia,serif}
        .pr-sec-icon{width:36px;height:36px;border-radius:10px;background:#fdf3d8;display:grid;place-items:center;font-size:17px}
        .pr-sec-count{background:#fff;border:1px solid #eee9d6;border-radius:999px;padding:6px 14px;font-size:13px;color:#a9852e;font-weight:700}
        /* 8 PER ROW — the key fix */
        .pr-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:14px}
        @media(max-width:1100px){.pr-grid{grid-template-columns:repeat(6,1fr)}}
        @media(max-width:900px){.pr-grid{grid-template-columns:repeat(4,1fr)}}
        @media(max-width:560px){.pr-grid{grid-template-columns:repeat(2,1fr)}.pr-hero h1{font-size:34px}}
        .pr-card{position:relative;display:flex;flex-direction:column;background:#fff;border:1px solid #eee9d6;border-top:4px solid #c9a23a;border-radius:14px;padding:16px 14px 14px;text-decoration:none;color:#1c382e;min-height:148px;box-shadow:0 2px 8px rgba(0,0,0,.03);transition:transform .15s,box-shadow .15s}
        .pr-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.08)}
        .pr-card.is-nt{border-top-color:#2f5d8a}
        .pr-card-abbr{font-size:21px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pr-card-en{font-size:14px;font-weight:700;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pr-card-lu{font-size:13px;color:#8a9a8a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pr-card-foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:14px}
        .pr-chap-pill{display:inline-flex;flex-direction:column;gap:0;background:#fdf3d8;border-radius:10px;padding:6px 12px;line-height:1.1}
        .pr-chap-pill.is-nt{background:#eef2f8}.pr-chap-pill strong{font-size:16px;color:#a9852e}.pr-chap-pill.is-nt strong{color:#2f5d8a}.pr-chap-pill small{font-size:11px;color:#a9852e;font-weight:600}.pr-chap-pill.is-nt small{color:#5a7aa0}
        .pr-chev{width:30px;height:30px;border-radius:999px;background:#f5f2e8;display:grid;place-items:center;color:#a9852e;font-size:18px}
        .pr-off{position:absolute;top:8px;right:8px;font-size:10px;color:#1d7a4a;font-weight:700;background:#eaf7ef;border-radius:999px;padding:2px 7px}
        .pr-empty{background:#fff;border:1px solid #eee9d6;border-radius:12px;padding:20px;color:#5d6d5d}
        /* Chapter view (kept from V1) */
        .pr-ch-hero h2{font-family:Georgia,serif;font-size:32px;margin:0}.pr-ch-hero p{color:#5d6d5d;margin:4px 0 0}
        .pr-ch-bar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:12px;margin-top:14px}
        .pr-ch-nav,.pr-ch-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .pr-ch-bar button{padding:8px 12px;border-radius:999px;border:1px solid #d8e0d2;background:#fff;cursor:pointer}
        .pr-ch-current{font-weight:700!important}.pr-ch-grid{display:flex;flex-wrap:wrap;gap:8px;background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:14px;margin-top:12px}
        .pr-ch-grid button{min-width:40px;height:36px;border-radius:10px;border:1px solid #d8e0d2;background:#faf8f2;cursor:pointer}.pr-ch-grid .is-active{background:#1d4035;color:#fff}
        .pr-note{background:#eef2ec;border-radius:10px;padding:10px 12px;margin-top:12px}
        .pr-side-panel{background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:18px;margin-top:12px}.pr-side-panel h3{margin:0 0 8px}
        .pr-verses{background:#fff;border:1px solid #e6e2d4;border-radius:14px;padding:18px;margin-top:12px}
        .pr-verse{line-height:1.8;margin:0 0 14px;font-family:Georgia,serif}.pr-v-num{color:#a9852e;font-weight:800;margin-right:8px;font-size:.8em}
        .pr-v-share{margin-left:8px;font-size:12px;border:1px solid #d8e0d2;background:#faf8f2;border-radius:999px;padding:3px 10px;cursor:pointer}
        .pr-ch-closing{background:#1d4035;color:#fff;border-radius:14px;padding:18px;margin-top:12px}.pr-ch-closing h3{margin:0 0 8px}.pr-ch-closing p{line-height:1.8;opacity:.95}
        .pr-loading{padding:24px;text-align:center;color:#5d6d5d}
        .pr-lang-toggle.small{display:flex;gap:4px}.pr-lang-toggle.small button{border-radius:999px}
        .pr-lang-toggle.small .is-active{background:#1d4035;color:#fff}
      `}</style>
    </div>
  );
}
export default function BibleReaderPage() {
  return (<Suspense fallback={<div className="pr-container" style={{ padding: 32 }}>Loading Bible Reader…</div>}><BibleReaderInner /></Suspense>);
}
