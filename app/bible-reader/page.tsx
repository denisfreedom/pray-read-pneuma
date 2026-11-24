"use client";
// ============================================================
// PRAY-READ BIBLE — BIBLE READER — V3 BOOK PAGE (Genesis style)
// PASTE AS: app/bible-reader/page.tsx
// DELETE old app/bible-reader/page.tsx FIRST, then create fresh.
// ------------------------------------------------------------
// This ONE file = 3 views, same as finestructure:
//  1) ?book= (none)        -> Book selector: 8 per row, OT + NT both visible
//  2) ?book=N              -> BOOK PAGE (this turn): sidebar Intro/Outline/Prayer
//                             + gold chapter grid + Study Resources
//  3) ?book=N&chapter=M   -> CHAPTER READER: verses + closing prayer
// ------------------------------------------------------------
// Pixel-match notes from your screenshots (BibleReader?book=1):
//  Top bar when a book is open: [‹ Dashboard dark] [‹ Home] [📖 All books gold]
//  ... [English|Luganda] [📖 Book intro, outline & prayer] [📚 Study resources gold]
//  Left sidebar: gold book icon + Genesis / Olubereberye,
//    tabs: 📖 Book Intro | ☰ Book Outline | ♡ Book Prayer
//  Right: OLD TESTAMENT pill, huge Genesis, Olubereberye gold,
//    "Select a chapter to begin reading (50 chapters)",
//    SELECT A CHAPTER card: GOLD pills, 14 per row desktop
//  Below: BOOK STUDY RESOURCES card, collapsible, tabs:
//    📖 Book Commentary (11) | 💡 Theological Insights (1) | 🏛 Historical Insights (1)
//    cards: "Book overview / About Genesis", "Study note 1:1-2:25 / God creates…",
//    pagination: ‹ 1 2 … 4 ›  Page 1 of 4
// ============================================================
import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Book = { number: number; en: string; lu: string; abbr: string; chapters: number; testament: string };
const OT: Book[] = [
  { number: 1, en: "Genesis", lu: "Olubereberye", abbr: "Gen", chapters: 50, testament: "Old Testament" },
  { number: 2, en: "Exodus", lu: "Okuva", abbr: "Exod", chapters: 40, testament: "Old Testament" },
  { number: 3, en: "Leviticus", lu: "Ebyabaleevi", abbr: "Lev", chapters: 27, testament: "Old Testament" },
  { number: 4, en: "Numbers", lu: "Okubala", abbr: "Num", chapters: 36, testament: "Old Testament" },
  { number: 5, en: "Deuteronomy", lu: "Ekyamateeka", abbr: "Deut", chapters: 34, testament: "Old Testament" },
  { number: 6, en: "Joshua", lu: "Yoswa", abbr: "Josh", chapters: 24, testament: "Old Testament" },
  { number: 7, en: "Judges", lu: "Ekyabalamuzi", abbr: "Judg", chapters: 21, testament: "Old Testament" },
  { number: 8, en: "Ruth", lu: "Luusi", abbr: "Ruth", chapters: 4, testament: "Old Testament" },
  { number: 9, en: "1 Samuel", lu: "1 Samwiri", abbr: "1 Sam", chapters: 31, testament: "Old Testament" },
  { number: 10, en: "2 Samuel", lu: "2 Samwiri", abbr: "2 Sam", chapters: 24, testament: "Old Testament" },
  { number: 11, en: "1 Kings", lu: "1 Bassekabaka", abbr: "1 Kings", chapters: 22, testament: "Old Testament" },
  { number: 12, en: "2 Kings", lu: "2 Bassekabaka", abbr: "2 Kings", chapters: 25, testament: "Old Testament" },
  { number: 13, en: "1 Chronicles", lu: "1 Ebyomumirembe", abbr: "1 Chron", chapters: 29, testament: "Old Testament" },
  { number: 14, en: "2 Chronicles", lu: "2 Ebyomumirembe", abbr: "2 Chron", chapters: 36, testament: "Old Testament" },
  { number: 15, en: "Ezra", lu: "Ezera", abbr: "Ezra", chapters: 10, testament: "Old Testament" },
  { number: 16, en: "Nehemiah", lu: "Nekkemiya", abbr: "Neh", chapters: 13, testament: "Old Testament" },
  { number: 17, en: "Esther", lu: "Eseza", abbr: "Esther", chapters: 10, testament: "Old Testament" },
  { number: 18, en: "Job", lu: "Yobu", abbr: "Job", chapters: 42, testament: "Old Testament" },
  { number: 19, en: "Psalms", lu: "Zabbuli", abbr: "Ps", chapters: 150, testament: "Old Testament" },
  { number: 20, en: "Proverbs", lu: "Engero", abbr: "Prov", chapters: 31, testament: "Old Testament" },
  { number: 21, en: "Ecclesiastes", lu: "Omubuulizi", abbr: "Eccl", chapters: 12, testament: "Old Testament" },
  { number: 22, en: "Song of Solomon", lu: "Oluyimba", abbr: "Song", chapters: 8, testament: "Old Testament" },
  { number: 23, en: "Isaiah", lu: "Isaaya", abbr: "Isa", chapters: 66, testament: "Old Testament" },
  { number: 24, en: "Jeremiah", lu: "Yeremiya", abbr: "Jer", chapters: 52, testament: "Old Testament" },
  { number: 25, en: "Lamentations", lu: "Okukungubaga", abbr: "Lam", chapters: 5, testament: "Old Testament" },
  { number: 26, en: "Ezekiel", lu: "Ezekyeri", abbr: "Ezek", chapters: 48, testament: "Old Testament" },
  { number: 27, en: "Daniel", lu: "Danyeri", abbr: "Dan", chapters: 12, testament: "Old Testament" },
  { number: 28, en: "Hosea", lu: "Koseya", abbr: "Hos", chapters: 14, testament: "Old Testament" },
  { number: 29, en: "Joel", lu: "Yoweeri", abbr: "Joel", chapters: 3, testament: "Old Testament" },
  { number: 30, en: "Amos", lu: "Amosi", abbr: "Amos", chapters: 9, testament: "Old Testament" },
  { number: 31, en: "Obadiah", lu: "Obadiya", abbr: "Obad", chapters: 1, testament: "Old Testament" },
  { number: 32, en: "Jonah", lu: "Yona", abbr: "Jonah", chapters: 4, testament: "Old Testament" },
  { number: 33, en: "Micah", lu: "Mikka", abbr: "Mic", chapters: 7, testament: "Old Testament" },
  { number: 34, en: "Nahum", lu: "Nakumu", abbr: "Nah", chapters: 3, testament: "Old Testament" },
  { number: 35, en: "Habakkuk", lu: "Kaabakuuku", abbr: "Hab", chapters: 3, testament: "Old Testament" },
  { number: 36, en: "Zephaniah", lu: "Zeffaniya", abbr: "Zeph", chapters: 3, testament: "Old Testament" },
  { number: 37, en: "Haggai", lu: "Kaggayi", abbr: "Hag", chapters: 2, testament: "Old Testament" },
  { number: 38, en: "Zechariah", lu: "Zekkaliya", abbr: "Zech", chapters: 14, testament: "Old Testament" },
  { number: 39, en: "Malachi", lu: "Malaki", abbr: "Mal", chapters: 4, testament: "Old Testament" },
];
const NT: Book[] = [
  { number: 40, en: "Matthew", lu: "Matayo", abbr: "Matt", chapters: 28, testament: "New Testament" },
  { number: 41, en: "Mark", lu: "Makko", abbr: "Mark", chapters: 16, testament: "New Testament" },
  { number: 42, en: "Luke", lu: "Lukka", abbr: "Luke", chapters: 24, testament: "New Testament" },
  { number: 43, en: "John", lu: "Yokaana", abbr: "John", chapters: 21, testament: "New Testament" },
  { number: 44, en: "Acts", lu: "Ebikolwa", abbr: "Acts", chapters: 28, testament: "New Testament" },
  { number: 45, en: "Romans", lu: "Abaruumi", abbr: "Rom", chapters: 16, testament: "New Testament" },
  { number: 46, en: "1 Corinthians", lu: "1 Abakkolinso", abbr: "1 Cor", chapters: 16, testament: "New Testament" },
  { number: 47, en: "2 Corinthians", lu: "2 Abakkolinso", abbr: "2 Cor", chapters: 13, testament: "New Testament" },
  { number: 48, en: "Galatians", lu: "Abaggalatiya", abbr: "Gal", chapters: 6, testament: "New Testament" },
  { number: 49, en: "Ephesians", lu: "Abaefeeso", abbr: "Eph", chapters: 6, testament: "New Testament" },
  { number: 50, en: "Philippians", lu: "Abafiripi", abbr: "Phil", chapters: 4, testament: "New Testament" },
  { number: 51, en: "Colossians", lu: "Abakkolosaayi", abbr: "Col", chapters: 4, testament: "New Testament" },
  { number: 52, en: "1 Thessalonians", lu: "1 Abasessalonika", abbr: "1 Thess", chapters: 5, testament: "New Testament" },
  { number: 53, en: "2 Thessalonians", lu: "2 Abasessalonika", abbr: "2 Thess", chapters: 3, testament: "New Testament" },
  { number: 54, en: "1 Timothy", lu: "1 Timoseewo", abbr: "1 Tim", chapters: 6, testament: "New Testament" },
  { number: 55, en: "2 Timothy", lu: "2 Timoseewo", abbr: "2 Tim", chapters: 4, testament: "New Testament" },
  { number: 56, en: "Titus", lu: "Tito", abbr: "Titus", chapters: 3, testament: "New Testament" },
  { number: 57, en: "Philemon", lu: "Firemooni", abbr: "Philem", chapters: 1, testament: "New Testament" },
  { number: 58, en: "Hebrews", lu: "Abaebbulaniya", abbr: "Heb", chapters: 13, testament: "New Testament" },
  { number: 59, en: "James", lu: "Yakobo", abbr: "Jas", chapters: 5, testament: "New Testament" },
  { number: 60, en: "1 Peter", lu: "1 Peetero", abbr: "1 Pet", chapters: 5, testament: "New Testament" },
  { number: 61, en: "2 Peter", lu: "2 Peetero", abbr: "2 Pet", chapters: 3, testament: "New Testament" },
  { number: 62, en: "1 John", lu: "1 Yokaana", abbr: "1 John", chapters: 5, testament: "New Testament" },
  { number: 63, en: "2 John", lu: "2 Yokaana", abbr: "2 John", chapters: 1, testament: "New Testament" },
  { number: 64, en: "3 John", lu: "3 Yokaana", abbr: "3 John", chapters: 1, testament: "New Testament" },
  { number: 65, en: "Jude", lu: "Yuda", abbr: "Jude", chapters: 1, testament: "New Testament" },
  { number: 66, en: "Revelation", lu: "Okubikkulirwa", abbr: "Rev", chapters: 22, testament: "New Testament" },
];
const ALL = [...OT, ...NT];
const getBook = (n: number) => ALL.find((b) => b.number === n) || null;
const safe = (v: any) => (v == null ? "" : String(v));

// ---------- Per-book content (admin will replace via API; Genesis is the full example) ----------
type OutlineItem = { title: string; ref: string; chapter: number };
const GENESIS_INTRO_EN = "Genesis opens the Bible with creation, humanity's fall, and the long line of patriarchs God called. God is the author and the protagonist: through Adam, Noah, Abraham, Isaac, Jacob and Joseph He prepares a family through which every nation will be blessed.";
const GENESIS_INTRO_LU = "Olubereberye luggula Baibuli n'okutonda, okugwa kw'omuntu, n'olulyo oluwanvu olw'abajjajja Katonda be yayita. Katonda ye muwandiisi era ye muntu omukulu: okuyita mu Adamu, Nuuwa, Ibulayimu, Isaaka, Yakobo ne Yusufu ateekateeka amaka agayita mu go amawanga gonna galyoke gabeerwe omukisa.";
const GENESIS_OUTLINE: OutlineItem[] = [
  { title: "God creates the heavens and the earth", ref: "1:1 – 2:25", chapter: 1 },
  { title: "Adam and Eve in the garden", ref: "2:25 – 3:24", chapter: 2 },
  { title: "Cain and Abel, and the line of Seth", ref: "4:1 – 5:32", chapter: 4 },
  { title: "The flood and a renewed world", ref: "6:1 – 9:17", chapter: 6 },
  { title: "The tower of Babel and the nations", ref: "10:1 – 11:26", chapter: 10 },
  { title: "The call of Abram", ref: "11:27 – 12:10", chapter: 11 },
  { title: "Abram and Lot, and the promised land", ref: "13:1 – 14:24", chapter: 13 },
  { title: "God's covenant with Abram", ref: "15:1 – 17:27", chapter: 15 },
  { title: "Sodom and Gomorrah", ref: "18:1 – 19:38", chapter: 18 },
  { title: "Isaac, Jacob and Esau", ref: "21:1 – 28:22", chapter: 21 },
  { title: "Jacob in Haran, and his return", ref: "29:1 – 36:43", chapter: 29 },
  { title: "Joseph in Egypt", ref: "37:1 – 50:26", chapter: 37 },
];
const GENESIS_PRAYER_EN = "Father, as I read Genesis, keep the promise You made to Abraham alive in me, and give me the faith that obeys before it understands.";
const GENESIS_PRAYER_LU = "Kitange, nga nsoma Olubereberye, kuuma ekisuubizo kye wasuubiza Ibulayimu nga kiramu mu nze, era mpe okukkiriza okugondera nga tekunnategereera.";
const GENESIS_KEY = [{ ref: "Genesis 1:1", chapter: 1 }, { ref: "Genesis 3:15", chapter: 3 }, { ref: "Genesis 12:3", chapter: 12 }, { ref: "Genesis 22:1-18", chapter: 22 }, { ref: "Genesis 50:20", chapter: 50 }];
const GENESIS_STUDY = [
  { kind: "Book overview", ref: "", title: "About Genesis", body: GENESIS_INTRO_EN },
  { kind: "Study note", ref: "1:1–2:25", title: "God creates the heavens and the earth", body: "In the beginning God — before anything existed, God already was. Creation is not an accident; it is the deliberate work of a personal God who speaks, separates, fills and calls it good." },
  { kind: "Study note", ref: "2:25–3:24", title: "Adam and Eve in the garden", body: "The garden is a place of presence, work and trust. The fall is not only disobedience — it is choosing our own wisdom over God's word, and hiding instead of confessing." },
  { kind: "Study note", ref: "6:1–9:17", title: "The flood and a renewed world", body: "Judgment is real, and so is mercy. The ark and the rainbow show a God who judges sin yet preserves a remnant and promises never again to destroy the earth by flood." },
  { kind: "Study note", ref: "11:27–12:10", title: "The call of Abram", body: "God calls one man, with no children and no land, and promises to make him a blessing to every nation. Faith here is leaving what is familiar because God spoke." },
  { kind: "Study note", ref: "37:1–50:26", title: "Joseph in Egypt", body: "What brothers meant for evil, God meant for good. Joseph's story is Genesis in miniature: suffering, faithfulness, forgiveness, and a family preserved." },
];
function bookContent(book: Book) {
  if (book.number === 1) return { introEn: GENESIS_INTRO_EN, introLu: GENESIS_INTRO_LU, outline: GENESIS_OUTLINE, prayerEn: GENESIS_PRAYER_EN, prayerLu: GENESIS_PRAYER_LU, key: GENESIS_KEY, study: GENESIS_STUDY };
  const genericOutline: OutlineItem[] = Array.from({ length: Math.min(book.chapters, 6) }, (_, i) => ({ title: `${book.en} — part ${i + 1}`, ref: `Chapter ${i + 1}`, chapter: i + 1 }));
  return {
    introEn: `${book.en} (${book.lu}) is part of the ${book.testament}. Read it slowly, one chapter at a time, and let each chapter become a conversation with God rather than a line to get through.`,
    introLu: `${book.en} (${book.lu}) kitundu kya ${book.testament}. Kisome mpola, essuula emu ku emu, era buli ssuula efuuke okwogera ne Katonda okusinga okuba olunyiriri lw'okuyitamu.`,
    outline: genericOutline,
    prayerEn: `Father, as I read ${book.en}, speak to me through Your Word. Show me one truth to carry today, and give me the faith to obey it.`,
    prayerLu: `Kitange, nga nsoma ${book.en}, njogera nange okuyita mu Kigambo kyo. Nlaga amazima g'emu ag'okutwala leero, era mpe okukkiriza okugugondera.`,
    key: [{ ref: `${book.en} 1:1`, chapter: 1 }],
    study: [{ kind: "Book overview", ref: "", title: `About ${book.en}`, body: `${book.en} (${book.lu}) — ${book.chapters} ${book.chapters === 1 ? "chapter" : "chapters"}. Full commentary, theological and historical insights for this book are added by the admin. The chapter text itself is complete.` }],
  };
}

// ---------- Book Selector (V2, unchanged) ----------
function BookCard({ b, downloaded, lang }: { b: Book; downloaded: boolean; lang: string }) {
  const isNT = b.number > 39;
  return (
    <Link href={`/bible-reader?book=${b.number}&lang=${lang}`} className={`pr-card ${isNT ? "is-nt" : "is-ot"}`}>
      <span className="pr-card-abbr">{b.abbr}</span><span className="pr-card-en">{b.en}</span><span className="pr-card-lu">{b.lu}</span>
      <span className="pr-card-foot"><span className={`pr-chap-pill ${isNT ? "is-nt" : "is-ot"}`}><strong>{b.chapters}</strong><small>chapters</small></span><span className="pr-chev">›</span></span>
      {downloaded ? <span className="pr-off">● Offline</span> : null}
    </Link>
  );
}

// ---------- BOOK PAGE — BibleReader?book=N ----------
function BookPage({ book, lang, onLang, onStudySignal }: { book: Book; lang: "en" | "lu"; onLang: (v: "en" | "lu") => void; onStudySignal: () => void }) {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  const [sideTab, setSideTab] = useState<"intro" | "outline" | "prayer">("intro");
  const [prayerLang, setPrayerLang] = useState<"en" | "lu">(lang);
  const [studyOpen, setStudyOpen] = useState(true);
  const [studyTab, setStudyTab] = useState<"commentary" | "theological" | "historical">("commentary");
  const [studyPage, setStudyPage] = useState(1);
  const [adminIntro, setAdminIntro] = useState<any>(null);
  const content = bookContent(book);
  const accent = book.number <= 39 ? "#b98428" : "#2f5d8a";
  useEffect(() => { setPrayerLang(lang); }, [lang]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/book-intro?book=${book.number}`).then((r) => r.ok ? r.json() : null).then((d) => { if (alive && d) setAdminIntro(d.intro || d); }).catch(() => {});
    return () => { alive = false; };
  }, [book.number]);
  const introEn = safe(adminIntro?.body_en || adminIntro?.body || content.introEn);
  const introLu = safe(adminIntro?.body_lu || content.introLu);
  const openChapter = (n: number) => {
    const p = new URLSearchParams(sp.toString()); p.set("book", String(book.number)); p.set("chapter", String(n)); p.set("lang", lang);
    router.push(`${pathname}?${p.toString()}`); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const studyItems = studyTab === "commentary" ? content.study : studyTab === "theological"
    ? [{ kind: "Theological insight", ref: "", title: `What ${book.en} teaches about God`, body: `Read ${book.en} asking: what does this book reveal about who God is, what He promises, and how He saves? The full theological insights for this book are added by the admin.` }]
    : [{ kind: "Historical insight", ref: "", title: `The world of ${book.en}`, body: `Every book was written to real people in a real place and time. The full historical insights for this book are added by the admin.` }];
  const perPage = 3; const totalPages = Math.max(1, Math.ceil(studyItems.length / perPage));
  const pageItems = studyItems.slice((studyPage - 1) * perPage, studyPage * perPage);
  const counts = { commentary: content.study.length, theological: 1, historical: 1 };
  return (
    <div className="pr-bookpage">
      {/* LEFT SIDEBAR */}
      <aside className="pr-side" id="book-sidebar">
        <div className="pr-side-head"><span className="pr-side-ic" style={{ background: accent }}>📖</span><div><h3>{book.en}</h3><p>{book.lu}</p></div></div>
        <div className="pr-side-tabs">
          <button className={sideTab === "intro" ? "is-active" : ""} onClick={() => setSideTab("intro")}>📖<span>Book Intro</span></button>
          <button className={sideTab === "outline" ? "is-active" : ""} onClick={() => setSideTab("outline")}>☰<span>Book Outline</span></button>
          <button className={sideTab === "prayer" ? "is-active" : ""} onClick={() => setSideTab("prayer")}>♡<span>Book Prayer</span></button>
        </div>
        {sideTab === "intro" && (
          <div className="pr-side-body">
            <div className="pr-side-pills"><span>Old Testament</span><span>{book.chapters} chapters</span><span>{book.abbr}</span></div>
            <p className="pr-side-text">{lang === "lu" ? introLu : introEn}</p>
            <p className="pr-side-italic">Read it slowly, one chapter at a time, and let each chapter become a conversation with God rather than a line to get through.</p>
            <h4>Key passages</h4>
            <div className="pr-key-list">{content.key.map((k) => <button key={k.ref} onClick={() => openChapter(k.chapter)}>{k.ref}</button>)}</div>
          </div>
        )}
        {sideTab === "outline" && (
          <div className="pr-side-body">
            <h4 style={{ marginTop: 0 }}>{book.en} Outline</h4>
            <p className="pr-side-hint">Tap a heading to jump to that part of the book.</p>
            <div className="pr-outline">
              {content.outline.map((o, i) => (
                <button key={i} className="pr-outline-row" onClick={() => openChapter(o.chapter)}>
                  <span>{o.title}</span><span className="pr-outline-ref">{o.ref}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {sideTab === "prayer" && (
          <div className="pr-side-body">
            <h4 style={{ marginTop: 0 }}>A Prayer for {book.en}</h4>
            <div className="pr-prayer-lang"><button className={prayerLang === "en" ? "is-active" : ""} onClick={() => setPrayerLang("en")}>English</button><button className={prayerLang === "lu" ? "is-active" : ""} onClick={() => setPrayerLang("lu")}>Luganda</button></div>
            <p className="pr-side-text">{prayerLang === "lu" ? content.prayerLu : content.prayerEn} <span className="pr-inline-ref">{book.en} 12:3</span></p>
            <button className="pr-key-pill" onClick={() => openChapter(12)}>{book.en} 12:3</button>
            <p className="pr-side-hint">Select any text to highlight or underline it. Tap a verse to read it here.</p>
          </div>
        )}
      </aside>

      {/* RIGHT MAIN */}
      <div className="pr-bookmain">
        <span className="pr-test-pill">{book.testament === "Old Testament" ? "OLD TESTAMENT" : "NEW TESTAMENT"}</span>
        <h1>{book.en}</h1>
        <p className="pr-book-lu">{book.lu}</p>
        <p className="pr-book-sub">Select a chapter to begin reading ({book.chapters} chapters)</p>
        <div className="pr-chapter-card">
          <p className="pr-chapter-label">SELECT A CHAPTER</p>
          <div className="pr-chapter-grid">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => openChapter(n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* STUDY RESOURCES */}
        <div className="pr-study" id="study-resources">
          <button className="pr-study-head" onClick={() => setStudyOpen((v) => !v)}>
            <span className="pr-study-ic">📖</span>
            <span className="pr-study-titles"><small>BOOK STUDY RESOURCES</small><span>{book.en} <em>{book.lu}</em></span></span>
            <span className="pr-study-chev">{studyOpen ? "˄" : "˅"}</span>
          </button>
          {studyOpen && (
            <>
              <div className="pr-study-tabs">
                <button className={studyTab === "commentary" ? "is-active" : ""} onClick={() => { setStudyTab("commentary"); setStudyPage(1); }}>📖 Book Commentary <span>{counts.commentary}</span></button>
                <button className={studyTab === "theological" ? "is-active" : ""} onClick={() => { setStudyTab("theological"); setStudyPage(1); }}>💡 Theological Insights <span>{counts.theological}</span></button>
                <button className={studyTab === "historical" ? "is-active" : ""} onClick={() => { setStudyTab("historical"); setStudyPage(1); }}>🏛 Historical Insights <span>{counts.historical}</span></button>
              </div>
              <div className="pr-study-body">
                {pageItems.map((s, i) => (
                  <article key={i} className="pr-study-card">
                    <span className="pr-study-kind">{s.kind}{s.ref ? <b> &nbsp;{s.ref}</b> : null}</span>
                    <h3>{s.title}</h3><p>{s.body}</p>
                  </article>
                ))}
              </div>
              <div className="pr-pagination">
                <button disabled={studyPage <= 1} onClick={() => setStudyPage((p) => Math.max(1, p - 1))}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  if (totalPages > 4 && n > 2 && n < totalPages) return n === 3 ? <span key="dots">…</span> : null;
                  return <button key={n} className={n === studyPage ? "is-active" : ""} onClick={() => setStudyPage(n)}>{n}</button>;
                })}
                <button disabled={studyPage >= totalPages} onClick={() => setStudyPage((p) => Math.min(totalPages, p + 1))}>›</button>
                <span className="pr-page-label">Page {studyPage} of {totalPages}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- CHAPTER READER (V1/V2, kept) ----------
function ChapterView({ book, lang, onLang }: { book: Book; lang: "en" | "lu"; onLang: (v: "en" | "lu") => void }) {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  const [chapter, setChapter] = useState(() => Math.max(1, Math.min(book.chapters, Number(sp.get("chapter")) || 1)));
  const [verses, setVerses] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [offlineCopy, setOfflineCopy] = useState(false); const [panel, setPanel] = useState<"none" | "grid" | "intro" | "study">("grid");
  const [intro, setIntro] = useState<any>(null); const [prayer, setPrayer] = useState<any>(null); const [font, setFont] = useState(18);
  useEffect(() => { setChapter(Math.max(1, Math.min(book.chapters, Number(sp.get("chapter")) || 1))); }, [sp, book]);
  useEffect(() => {
    let alive = true; setLoading(true); setOfflineCopy(false);
    const key = `prayread-ch-${book.number}-${chapter}-${lang}`;
    (async () => {
      try {
        const res = await fetch(`/api/bible-books/${book.number}/${chapter}?lang=${lang}`);
        if (res.ok) { const j = await res.json(); const list = j.verses || j.data || j.chapter?.verses || [];
          if (alive && list.length) { setVerses(list); try { localStorage.setItem(key, JSON.stringify(list)); } catch {}; setLoading(false);
            fetch(`/api/chapter-intro?book=${book.number}&chapter=${chapter}`).then((r) => r.ok ? r.json() : null).then((d) => alive && setIntro(d?.intro || d || null)).catch(() => {});
            fetch(`/api/prayer-passages?book=${book.number}&chapter=${chapter}`).then((r) => r.ok ? r.json() : null).then((d) => alive && setPrayer(Array.isArray(d) ? d[0] : d?.passages?.[0] || d?.data?.[0] || null)).catch(() => {}); return; } }
        throw new Error("empty");
      } catch { try { const c = localStorage.getItem(key); if (c && alive) { setVerses(JSON.parse(c)); setOfflineCopy(true); setLoading(false); return; } } catch {}; if (alive) { setVerses([]); setLoading(false); } }
    })();
    return () => { alive = false; };
  }, [book.number, chapter, lang]);
  const goChapter = (n: number) => {
    if (n < 1) { const p = getBook(book.number - 1); if (p) router.push(`/bible-reader?book=${p.number}&chapter=${p.chapters}&lang=${lang}`); return; }
    if (n > book.chapters) { const nx = getBook(book.number + 1); if (nx) router.push(`/bible-reader?book=${nx.number}&chapter=1&lang=${lang}`); return; }
    const p = new URLSearchParams(sp.toString()); p.set("book", String(book.number)); p.set("chapter", String(n)); p.set("lang", lang);
    router.push(`${pathname}?${p.toString()}`); setPanel("none"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backToBook = () => { const p = new URLSearchParams(sp.toString()); p.delete("chapter"); router.push(`${pathname}?${p.toString()}`); };
  const shareVerse = async (v: any) => { const num = v.verse ?? v.number; const text = safe(v.text || v.text_english || v.text_luganda || v.luganda || v.content); const url = `${window.location.origin}/bible-reader?book=${book.number}&chapter=${chapter}&verse=${num}`; const msg = `📖 ${book.en} ${chapter}:${num}\n\n"${text}"\n\n👉 ${url}`; try { await navigator.clipboard.writeText(msg); alert("Verse copied."); } catch { prompt("Copy this verse:", msg); } };
  return (
    <div className="pr-chapter">
      <button className="pr-back-chapter" onClick={backToBook}>‹ Back to {book.en}</button>
      <div className="pr-ch-hero"><h2>{book.en} {chapter}</h2><p>{book.lu} · {verses.length || "?"} verses · {lang === "lu" ? "Luganda" : "English"}</p></div>
      <div className="pr-ch-bar">
        <div className="pr-ch-nav"><button onClick={() => goChapter(chapter - 1)}>‹</button><button className="pr-ch-current" onClick={() => setPanel(panel === "grid" ? "none" : "grid")}>☰ Chapter {chapter}</button><button onClick={() => goChapter(chapter + 1)}>›</button></div>
        <div className="pr-ch-tools"><div className="pr-lang-toggle small"><button className={lang === "en" ? "is-active" : ""} onClick={() => onLang("en")}>English</button><button className={lang === "lu" ? "is-active" : ""} onClick={() => onLang("lu")}>Luganda</button></div><button onClick={() => setFont((f) => Math.max(14, f - 2))}>A-</button><button onClick={() => setFont((f) => Math.min(26, f + 2))}>A+</button><button onClick={() => setPanel(panel === "intro" ? "none" : "intro")}>📖 Intro &amp; Prayer</button><button onClick={() => setPanel(panel === "study" ? "none" : "study")}>📚 Study</button></div>
      </div>
      {panel === "grid" && <div className="pr-ch-grid">{Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => <button key={n} className={n === chapter ? "is-active" : ""} onClick={() => goChapter(n)}>{n}</button>)}</div>}
      {offlineCopy && <p className="pr-note">📵 Showing your offline copy. It refreshes automatically when you are back online.</p>}
      {panel === "intro" && <div className="pr-side-panel"><h3>📖 Chapter intro — {book.en} {chapter}</h3>{intro ? <p>{safe(intro.body_en || intro.body || intro.heading_en || "")}</p> : <p>Read this chapter slowly, twice. Notice which word stays with you — that is often where God is speaking.</p>}<h3 style={{ marginTop: 16 }}>🙏 Pray this chapter</h3>{prayer ? <><p><strong>{safe(prayer.title_english || prayer.title || "")}</strong></p><p>{safe(prayer.intro?.en?.body || prayer.guided_prayer?.en?.body || prayer.closing_prayer?.en?.body || "")}</p></> : <p>Lord, speak to me through this chapter. Show me one truth to carry today. In Jesus’ name, Amen.</p>}</div>}
      {panel === "study" && <div className="pr-side-panel"><h3>📚 Study resources — {book.en} {chapter}</h3><p>Chapter commentary, cross-references and Q&amp;A for this chapter are added by the admin. If nothing shows here yet, the chapter text below is still complete.</p></div>}
      {loading ? <p className="pr-loading">Loading {book.en} {chapter}…</p> : verses.length === 0 ? <p className="pr-empty">This chapter is not available yet. Go to the Offline centre to download it, or try again when you are online.</p> : <div className="pr-verses" style={{ fontSize: font }}>{verses.map((v: any, i: number) => { const num = v.verse ?? v.number ?? i + 1; const text = safe(v.text || v.text_english || v.text_luganda || v.luganda || v.content); return (<p key={num} className="pr-verse"><span className="pr-v-num">{num}</span> {text}<button className="pr-v-share" onClick={() => shareVerse(v)}>Share</button></p>); })}</div>}
      <div className="pr-ch-closing"><h3>🙏 Closing Prayer — {book.en} {chapter}</h3><p>{prayer?.closing_prayer?.en?.body || "Father, thank You for Your Word today. Walk with me through this day, keep me in Your peace, and let others see Your goodness through me. In Jesus’ name, Amen."}</p></div>
    </div>
  );
}

// ---------- Main ----------
function BibleReaderInner() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [search, setSearch] = useState(""); const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [offlineReady, setOfflineReady] = useState(false); const [todayCount, setTodayCount] = useState(30);
  const [studyTick, setStudyTick] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try { if ("indexedDB" in window) { const db: IDBDatabase = await new Promise((res, rej) => { const r = indexedDB.open("prayread-offline", 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); if (db.objectStoreNames.contains("chapters")) { const rows: any[] = await new Promise((res, rej) => { const tx = db.transaction("chapters", "readonly"); const q = tx.objectStore("chapters").getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); db.close(); const per = new Map<number, number>(); rows.forEach((row) => { const n = Number(row?.book_number || row?.bookNumber); if (n) per.set(n, (per.get(n) || 0) + 1); }); const set = new Set<number>(); per.forEach((c, n) => { const b = getBook(n); if (b && c >= b.chapters) set.add(n); }); if (active) { setDownloaded(set); setOfflineReady(true); return; } } else db.close(); } } catch {}
      try { const raw = localStorage.getItem("prayread-downloaded-books"); if (raw && active) setDownloaded(new Set(JSON.parse(raw) as number[])); } catch {}
      if (active) setOfflineReady(true);
    })();
    fetch("/api/reading-plan").then((r) => r.ok ? r.json() : null).then((j) => { if (active && Array.isArray(j) && j.length) setTodayCount(j.length); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const bookNumber = Number(searchParams.get("book")) || 0;
  const chapterParam = searchParams.get("chapter");
  const selectedBook = bookNumber ? getBook(bookNumber) : null;
  const lang = searchParams.get("lang") === "lu" ? "lu" : "en";
  const setLang = (v: "en" | "lu") => { const n = new URLSearchParams(searchParams.toString()); if (v === "lu") n.set("lang", "lu"); else n.delete("lang"); router.push(`${pathname}?${n.toString()}`); };
  const q = search.trim().toLowerCase();
  const matches = (b: Book) => !q || b.en.toLowerCase().includes(q) || b.lu.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q);
  const otList = OT.filter(matches); const ntList = NT.filter(matches);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goStudy = () => { setStudyTick((t) => t + 1); setTimeout(() => scrollTo("study-resources"), 50); };
  const goSidebar = () => setTimeout(() => scrollTo("book-sidebar"), 50);
  return (
    <div className="pr-page">
      <section className="pr-top"><div className="pr-container">
        <div className="pr-topbar">
          <div className="pr-pills">
            <Link href="/dashboard" className="pr-pill pr-pill-dark">‹ &nbsp;Dashboard</Link>
            <Link href="/" className="pr-pill">‹ &nbsp;Home</Link>
            {selectedBook ? <Link href="/bible-reader" className="pr-pill pr-pill-gold">📖 All books</Link> : null}
          </div>
          <div className="pr-pills">
            <div className="pr-lang" role="group" aria-label="Language"><button className={lang === "en" ? "is-active" : ""} onClick={() => setLang("en")}>English</button><button className={lang === "lu" ? "is-active" : ""} onClick={() => setLang("lu")}>Luganda</button></div>
            {selectedBook ? (<><button className="pr-pill pr-pill-note" onClick={goSidebar}>📖 Book intro, outline &amp; prayer</button><button className="pr-pill pr-pill-gold" onClick={goStudy}>📚 Study resources</button></>)
              : (<>{todayCount > 0 ? <span className="pr-pill pr-pill-note">📖 {todayCount} in the reading plan</span> : null}<span className="pr-pill pr-pill-gold">📖 Bible Reader</span></>)}
          </div>
        </div>
        {!selectedBook && (<div className="pr-hero"><div><h1>Choose a book</h1><p>Pray · Read · Listen - English &amp; Luganda</p></div><div className="pr-stat"><span className="pr-stat-ic">✦</span><div><p className="pr-stat-total">66 books</p><p className="pr-stat-line">39 Old Testament · 27 New Testament</p></div></div></div>)}
        {offlineReady && downloaded.size > 0 ? <span className="pr-offline">📵 {downloaded.size} {downloaded.size === 1 ? "book" : "books"} available offline</span> : null}
      </div></section>

      <div className="pr-container pr-body">
        {!selectedBook ? (<>
          <div className="pr-search"><span>🔍</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search books… e.g. Psalms, Obukikkulirwa, Philemon" aria-label="Search books" /></div>
          <div className="pr-tabs"><button onClick={() => scrollTo("ot-section")}>📖 &nbsp;Old Testament <span className="pr-tab-n">39</span></button><button onClick={() => scrollTo("nt-section")}>📕 &nbsp;New Testament <span className="pr-tab-n is-nt">27</span></button></div>
          {q && otList.length === 0 && ntList.length === 0 ? <p className="pr-empty">No book matches “{search}”. Try Psalms, Genesis or Okubikkulirwa.</p> : (<>
            <section id="ot-section" className="pr-section"><div className="pr-section-head"><h2><span className="pr-sec-icon">📖</span> Old Testament</h2><span className="pr-sec-count">{otList.length} of 39 books</span></div><div className="pr-grid">{otList.map((b) => <BookCard key={b.number} b={b} downloaded={downloaded.has(b.number)} lang={lang} />)}</div></section>
            <section id="nt-section" className="pr-section"><div className="pr-section-head"><h2><span className="pr-sec-icon">📕</span> New Testament</h2><span className="pr-sec-count">{ntList.length} of 27 books</span></div><div className="pr-grid">{ntList.map((b) => <BookCard key={b.number} b={b} downloaded={downloaded.has(b.number)} lang={lang} />)}</div></section>
          </>)}
        </>) : chapterParam ? (<ChapterView book={selectedBook} lang={lang} onLang={setLang} />)
        : (<BookPage book={selectedBook} lang={lang} onLang={setLang} onStudySignal={goStudy} />)}
      </div>
      <style jsx global>{`
        .pr-page{background:#faf8f2;min-height:100vh;color:#1c382e}
        .pr-container{max-width:1280px;margin:0 auto;padding:0 20px}
        .pr-top{background:#1d4035;color:#fff;padding:20px 0 26px}
        .pr-topbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
        .pr-pills{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .pr-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.35);color:#fff;text-decoration:none;background:transparent;font-size:15px;cursor:pointer;font-weight:500}
        .pr-pill-dark{background:#12302a;border-color:#12302a;font-weight:700}.pr-pill-gold{background:#e9c981;color:#1d4035;border-color:#e9c981;font-weight:700}.pr-pill-note{background:rgba(255,255,255,.08);color:#e9c981;border-color:rgba(233,201,129,.35)}
        .pr-lang{display:flex;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:4px;gap:4px}
        .pr-lang button{border:0;background:transparent;color:#fff;padding:7px 18px;border-radius:999px;cursor:pointer;font-size:15px}.pr-lang .is-active{background:#1d4035;color:#fff;font-weight:700;box-shadow:0 0 0 1px rgba(255,255,255,.25)}
        .pr-hero{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-top:26px}
        .pr-hero h1{font-size:44px;line-height:1.05;margin:0;font-family:Georgia,serif;letter-spacing:-.5px}.pr-hero p{opacity:.9;margin:8px 0 0;font-size:18px}
        .pr-stat{display:flex;gap:12px;align-items:center;background:#12302a;border-radius:14px;padding:14px 20px}
        .pr-stat-ic{width:38px;height:38px;border-radius:10px;background:#2a4a3a;display:grid;place-items:center;font-size:18px}
        .pr-stat-total{margin:0;font-weight:800;font-size:19px}.pr-stat-line{margin:2px 0 0;font-size:14px;opacity:.85}
        .pr-offline{display:inline-flex;gap:6px;align-items:center;margin-top:14px;background:rgba(0,0,0,.22);padding:6px 12px;border-radius:999px;font-size:13px}
        .pr-body{padding-top:26px;padding-bottom:56px}
        .pr-search{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid #e9e6da;border-radius:16px;padding:14px 18px}
        .pr-search span{font-size:19px}.pr-search input{border:0;outline:0;width:100%;font-size:16px;background:transparent}.pr-search input::placeholder{color:#8a9a8a}
        .pr-tabs{display:flex;gap:0;background:#fff;border:1px solid #e9e6da;border-radius:14px;padding:6px;margin:18px 0 8px}
        .pr-tabs button{flex:1;border:0;background:transparent;padding:13px;border-radius:10px;cursor:pointer;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}
        .pr-tabs button:first-child{box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .pr-tab-n{background:#1d4035;color:#fff;border-radius:999px;padding:2px 9px;font-size:13px}.pr-tab-n.is-nt{background:#eef2f8;color:#5a7aa0}
        .pr-section{margin-top:26px}.pr-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .pr-section-head h2{font-size:21px;margin:0;display:flex;gap:10px;align-items:center;font-family:Georgia,serif}
        .pr-sec-icon{width:36px;height:36px;border-radius:10px;background:#fdf3d8;display:grid;place-items:center;font-size:17px}
        .pr-sec-count{background:#fff;border:1px solid #eee9d6;border-radius:999px;padding:6px 14px;font-size:13px;color:#a9852e;font-weight:700}
        .pr-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:14px}
        @media(max-width:1100px){.pr-grid{grid-template-columns:repeat(6,1fr)}}
        @media(max-width:900px){.pr-grid{grid-template-columns:repeat(4,1fr)}}
        @media(max-width:560px){.pr-grid{grid-template-columns:repeat(2,1fr)}.pr-hero h1{font-size:34px}}
        .pr-card{position:relative;display:flex;flex-direction:column;background:#fff;border:1px solid #eee9d6;border-top:4px solid #c9a23a;border-radius:14px;padding:16px 14px 14px;text-decoration:none;color:#1c382e;min-height:148px}
        .pr-card.is-nt{border-top-color:#2f5d8a}.pr-card-abbr{font-size:21px;font-weight:800}.pr-card-en{font-size:14px;font-weight:700;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pr-card-lu{font-size:13px;color:#8a9a8a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pr-card-foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:14px}
        .pr-chap-pill{display:inline-flex;flex-direction:column;background:#fdf3d8;border-radius:10px;padding:6px 12px;line-height:1.1}.pr-chap-pill.is-nt{background:#eef2f8}
        .pr-chap-pill strong{font-size:16px;color:#a9852e}.pr-chap-pill.is-nt strong{color:#2f5d8a}.pr-chap-pill small{font-size:11px;color:#a9852e;font-weight:600}.pr-chap-pill.is-nt small{color:#5a7aa0}
        .pr-chev{width:30px;height:30px;border-radius:999px;background:#f5f2e8;display:grid;place-items:center;color:#a9852e;font-size:18px}
        .pr-off{position:absolute;top:8px;right:8px;font-size:10px;color:#1d7a4a;font-weight:700;background:#eaf7ef;border-radius:999px;padding:2px 7px}
        .pr-empty{background:#fff;border:1px solid #eee9d6;border-radius:12px;padding:20px;color:#5d6d5d}
        /* ---- BOOK PAGE ---- */
        .pr-bookpage{display:grid;grid-template-columns:340px 1fr;gap:22px;align-items:start}
        @media(max-width:900px){.pr-bookpage{grid-template-columns:1fr}}
        .pr-side{background:#fff;border:1px solid #eee9d6;border-radius:18px;overflow:hidden;position:sticky;top:16px}
        @media(max-width:900px){.pr-side{position:static}}
        .pr-side-head{display:flex;gap:12px;align-items:center;padding:18px 18px 6px}
        .pr-side-ic{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;font-size:20px;color:#fff;flex-shrink:0}
        .pr-side-head h3{margin:0;font-size:21px}.pr-side-head p{margin:2px 0 0;color:#a9852e;font-weight:700;font-size:15px}
        .pr-side-tabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;padding:14px 12px 0;border-bottom:1px solid #eee9d6}
        .pr-side-tabs button{border:0;background:transparent;padding:10px 4px 12px;cursor:pointer;font-size:13px;font-weight:600;color:#5d6d5d;display:flex;flex-direction:column;gap:4px;align-items:center;border-bottom:3px solid transparent}
        .pr-side-tabs .is-active{color:#1c382e;border-bottom-color:#c9a23a}
        .pr-side-body{padding:18px;max-height:560px;overflow-y:auto}
        .pr-side-pills{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.pr-side-pills span{background:#fdf3d8;color:#a9852e;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700}
        .pr-side-text{line-height:1.85;color:#3d4a3d;font-size:15px;margin:0}.pr-side-italic{font-style:italic;color:#8a9a8a;line-height:1.8;margin:16px 0 0}
        .pr-side-body h4{margin:20px 0 10px}.pr-side-hint{color:#8a9a8a;font-size:13px;line-height:1.6}
        .pr-key-list{display:flex;flex-wrap:wrap;gap:8px}.pr-key-list button,.pr-key-pill{border:1px solid #eee0b8;background:#fdfbf2;color:#a9852e;border-radius:999px;padding:7px 13px;cursor:pointer;font-weight:700;font-size:13px}
        .pr-outline{display:flex;flex-direction:column}.pr-outline-row{display:flex;justify-content:space-between;gap:10px;text-align:left;border:0;background:transparent;border-bottom:1px solid #f0ecdc;padding:12px 6px;cursor:pointer;font-size:14px;color:#1c382e}
        .pr-outline-row:hover{background:#fdfbf2}.pr-outline-ref{color:#a9852e;font-weight:700;white-space:nowrap;font-size:13px}
        .pr-prayer-lang{display:flex;gap:4px;background:#f5f2e8;border-radius:999px;padding:4px;margin-bottom:14px;width:fit-content}
        .pr-prayer-lang button{border:0;background:transparent;padding:7px 16px;border-radius:999px;cursor:pointer;font-weight:600}.pr-prayer-lang .is-active{background:#1d4035;color:#fff}
        .pr-inline-ref{background:#fdf3d8;color:#a9852e;border-radius:8px;padding:2px 8px;font-weight:700;font-size:13px;white-space:nowrap}
        .pr-bookmain{min-width:0}.pr-test-pill{background:#fdf3d8;color:#a9852e;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:800;letter-spacing:1px}
        .pr-bookmain h1{font-size:48px;margin:14px 0 0;font-family:Georgia,serif;letter-spacing:-.5px}.pr-book-lu{color:#a9852e;font-weight:700;font-size:19px;margin:6px 0}.pr-book-sub{color:#5d6d5d;margin:4px 0 0;font-size:16px}
        .pr-chapter-card{background:#fff;border:1px solid #eee9d6;border-radius:18px;padding:20px;margin-top:22px}
        .pr-chapter-label{font-size:12px;letter-spacing:2px;font-weight:800;color:#a9852e;margin:0 0 14px}
        .pr-chapter-grid{display:grid;grid-template-columns:repeat(14,1fr);gap:9px}
        @media(max-width:1100px){.pr-chapter-grid{grid-template-columns:repeat(10,1fr)}}
        @media(max-width:700px){.pr-chapter-grid{grid-template-columns:repeat(7,1fr)}}
        @media(max-width:420px){.pr-chapter-grid{grid-template-columns:repeat(5,1fr)}}
        .pr-chapter-grid button{background:#c9a23a;color:#fff;border:0;border-radius:10px;padding:11px 0;font-weight:700;font-size:15px;cursor:pointer}
        .pr-chapter-grid button:hover{background:#a9852e}
        .pr-study{background:#fff;border:1px solid #eee9d6;border-radius:18px;margin-top:20px;overflow:hidden}
        .pr-study-head{width:100%;border:0;background:transparent;display:flex;align-items:center;gap:14px;padding:18px 20px;cursor:pointer;text-align:left}
        .pr-study-ic{width:46px;height:46px;border-radius:12px;background:#1d4035;display:grid;place-items:center;font-size:20px;color:#fff;flex-shrink:0}
        .pr-study-titles{display:flex;flex-direction:column;gap:2px;flex:1}.pr-study-titles small{font-size:11px;letter-spacing:2px;color:#a9852e;font-weight:800}
        .pr-study-titles>span{font-size:20px;font-weight:800}.pr-study-titles em{font-style:normal;color:#a9852e;margin-left:8px;font-size:17px}
        .pr-study-chev{width:36px;height:36px;border:1px solid #e6e2d4;border-radius:999px;display:grid;place-items:center}
        .pr-study-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:0 20px 14px;border-bottom:1px solid #eee9d6}
        .pr-study-tabs button{border:0;background:transparent;padding:10px 8px;cursor:pointer;font-weight:600;color:#5d6d5d;border-bottom:3px solid transparent;font-size:14px}
        .pr-study-tabs .is-active{color:#1c382e;border-bottom-color:#c9a23a}
        .pr-study-tabs span{background:#fdf3d8;color:#a9852e;border-radius:999px;padding:2px 8px;font-size:12px;margin-left:4px}
        .pr-study-body{padding:18px 20px;display:flex;flex-direction:column;gap:14px}
        .pr-study-card{background:#fdfbf2;border:1px solid #f0e8c8;border-left:4px solid #e9c981;border-radius:12px;padding:16px}
        .pr-study-kind{display:inline-block;background:#fff;border-radius:999px;padding:4px 10px;font-size:12px;color:#5d6d5d}.pr-study-kind b{color:#a9852e}
        .pr-study-card h3{margin:10px 0 6px;font-size:18px}.pr-study-card p{margin:0;line-height:1.75;color:#3d4a3d}
        .pr-pagination{display:flex;gap:6px;align-items:center;padding:0 20px 18px;flex-wrap:wrap}
        .pr-pagination button{width:34px;height:34px;border-radius:10px;border:1px solid #e6e2d4;background:#fff;cursor:pointer}.pr-pagination .is-active{background:#1d4035;color:#fff}
        .pr-pagination button:disabled{opacity:.4;cursor:default}.pr-page-label{margin-left:auto;color:#8a9a8a;font-size:13px}
        /* ---- CHAPTER READER ---- */
        .pr-back-chapter{border:1px solid #e6e2d4;background:#fff;border-radius:999px;padding:8px 14px;cursor:pointer;margin-bottom:12px}
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
        .pr-lang-toggle.small{display:flex;gap:4px}.pr-lang-toggle.small button{border-radius:999px}.pr-lang-toggle.small .is-active{background:#1d4035;color:#fff}
      `}</style>
    </div>
  );
}
export default function BibleReaderPage() {
  return (<Suspense fallback={<div className="pr-container" style={{ padding: 32 }}>Loading Bible Reader…</div>}><BibleReaderInner /></Suspense>);
}
