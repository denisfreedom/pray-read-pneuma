"use client";
// ============================================================
// PRAY-READ BIBLE — CHAPTER / VERSE READER — V1 FINESTRUCTURE MATCH
// PASTE AS: app/bible-reader/[book]/[chapter]/page.tsx  ← YOUR EXISTING CHAPTER FILE
// ------------------------------------------------------------
// Finestructure URL was: /Chapter?book=1&chapter=1
// YOUR Next.js URL is:  /bible-reader/1/1  (dynamic route: [book]/[chapter])
// This file reads book/chapter from the URL path, NOT from ?book=&chapter=
// ------------------------------------------------------------
// Pixel-match notes from your 3 screenshots:
//  Hero (dark emerald): [← Back to books] [← Home] ...... [📖 Bible Reader]
//    huge "Genesis 1", sub "Olubereberye · 31 verses"
//  Control bar (white pill): [‹] [☰ Chapter 1] [›] ... [KJV ▾] [EN | LU | BOTH]
//    [T A-] [T A+] [▶ Listen] [✓ Mark as read] [Share] [🌙]
//  Layout: LEFT sidebar (Intro / Commentary / Prayer tabs + Chapter intro card)
//           RIGHT verses pane (Resources bar on top)
//  Verses in BOTH mode: EN verse (serif, big) then LU line below with gold "LU" badge
//  Tap a verse -> VERSE 1 action bar: Prayer passage, Cross-references, Commentary,
//    4 highlight colours, Share, Bookmark, Copy, Add note — verse gets gold border
//  Strong's (KJV+): blue H-numbers inline, tap -> popup definition
//  Bottom: [‹ Previous chapter] [Next chapter ›]
//  CLOSING PRAYER card: ♡ CLOSING PRAYER / Genesis 1 / "Closing prayer for Genesis 1"
//    EN prayer + LU prayer + [Genesis 1:1] pill + "Amen." + [Share prayer] [Pray again]
// ============================================================
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

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
const getBook = (n: number) => ALL.find((b) => b.number === n) || ALL[18];
const safe = (v: any) => (v == null ? "" : String(v));
const VERSIONS = [
  { id: "kjv", label: "KJV", note: "King James Version" },
  { id: "kjvp", label: "KJV+", note: "KJV + Strong's numbers" },
  { id: "darby", label: "Darby", note: "Darby Translation" },
  { id: "amp", label: "Amplified", note: "Amplified Bible" },
  { id: "luganda", label: "Luganda", note: "Luganda Bible" },
];
// Small Strong's dictionary for the words the screenshot shows (Gen 1). The
// popup falls back to a friendly "not yet in the dictionary" line for others.
const STRONGS: Record<string, { word: string; def: string }> = {
  H430: { word: "Elohim", def: "God — the Creator, supreme, plural in form yet one God." },
  H1254: { word: "bara", def: "To create — to make something out of nothing; only God does this." },
  H8064: { word: "shamayim", def: "Heaven, heavens, sky — the dwelling place of God and the sky above." },
  H776: { word: "erets", def: "Earth, land, ground — the dry land and the whole earth." },
  H8414: { word: "tohu", def: "Formless, waste, emptiness — without shape or order." },
  H922: { word: "bohu", def: "Void, emptiness — hollow, desolate." },
  H2822: { word: "choshek", def: "Darkness — literal darkness, and figurative gloom." },
  H8415: { word: "tehom", def: "The deep — the primeval ocean, the abyss." },
  H7307: { word: "ruach", def: "Spirit, breath, wind — the Spirit of God moving and giving life." },
  H7363: { word: "rachaph", def: "To hover, brood, move gently — like a bird over its nest." },
  H4325: { word: "mayim", def: "Water, waters — the waters of creation." },
  H3117: { word: "yom", def: "Day — a day, daytime, a period of time." },
  H8345: { word: "shishshi", def: "Sixth — the sixth in order." },
  H2896: { word: "tov", def: "Good — good, pleasant, beautiful, agreeable." },
};
const HIGHLIGHTS = [
  { id: "yellow", color: "#fde68a", label: "Yellow" },
  { id: "green", color: "#bbf7d0", label: "Green" },
  { id: "pink", color: "#fbcfe8", label: "Pink" },
  { id: "blue", color: "#bfdbfe", label: "Blue" },
];
const GEN1 = {
  introTitle: "God creates the heavens and the earth",
  introRef: "1:1–2:25",
  introBody: "Genesis 1 belongs to the section \"God creates the heavens and the earth\" (1:1–2:25). Genesis presents God as creator and covenant-maker, and the rest of the Bible answers the questions it opens about humanity and promise.",
  closingEn: "Father, as I read Genesis 1, keep the promise You made to Abraham alive in me, and give me the faith that obeys before it understands (Genesis 1:1).",
  closingLu: "Musaala, nga nsoma Genesis 1, nkusaba ekwanjalo lyawe mu Genesis 1:1 likyaleko mu buli lunaku.",
  commentary: "Genesis 1 is not a science textbook — it is a worship text. It tells us who God is (Creator, orderly, good), who we are (made in His image), and what the world is (His good creation, given to us to steward).",
  prayerPassage: "Pray Genesis 1 slowly: thank God for creating you on purpose. Name one good thing He made, and ask Him to make your day reflect His order and goodness.",
};
function closingFor(book: Book, chapter: number) {
  if (book.number === 1 && chapter === 1) return GEN1;
  return {
    introTitle: `${book.en} ${chapter}`,
    introRef: `${chapter}:1`,
    introBody: `${book.en} ${chapter} is part of ${book.en} (${book.lu}). Read it slowly, twice. Notice which word stays with you — that is often where God is speaking.`,
    closingEn: `Father, thank You for ${book.en} ${chapter}. Let Your Word take root in my heart and show me how to live it today, in Jesus' name, Amen.`,
    closingLu: `Kitange, nkwebaza olw'${book.en} ${chapter}. Kikka Kigambo kyo kinywe mu mutima gwange era kinnyigirize engeri y'okukituukiriza leero, mu linnya lya Yesu, Amiina.`,
    commentary: `Commentary for ${book.en} ${chapter} is added by the admin. The chapter text itself is complete — read it first, then come back for the notes.`,
    prayerPassage: `Pray ${book.en} ${chapter} slowly: thank God for what He shows you here, and ask Him for one step of obedience today.`,
  };
}
function ChapterInner() {
  const router = useRouter(); const params = useParams();
  // YOUR path: /bible-reader/[book]/[chapter]  e.g. /bible-reader/1/1
  // Also tolerates /bible-reader/genesis/1 because getBook() falls back safely.
  const rawBook: any = (params as any)?.book; const rawChapter: any = (params as any)?.chapter;
  const bookNumber = Number(Array.isArray(rawBook) ? rawBook[0] : rawBook) || 1;
  const chapter = Math.max(1, Number(Array.isArray(rawChapter) ? rawChapter[0] : rawChapter) || 1);
  const verseParam = 0; // verse deep-link: /bible-reader/1/1?verse=5 still works via search below
  const book = getBook(bookNumber);
  const [versionId, setVersionId] = useState("kjv");
  const [langMode, setLangMode] = useState<"en" | "lu" | "both">("both");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontScale, setFontScale] = useState(1);
  const [enVerses, setEnVerses] = useState<any[]>([]); const [luVerses, setLuVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [sideTab, setSideTab] = useState<"intro" | "commentary" | "prayer">("intro");
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [read, setRead] = useState(false);
  const [toast, setToast] = useState("");
  const [strongCode, setStrongCode] = useState<string | null>(null);
  const [strongWord, setStrongWord] = useState("");
  const [playing, setPlaying] = useState(false);
  const [shareOpen, setShareOpen] = useState(false); const [shareText, setShareText] = useState(""); const [shareTitle, setShareTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [prayerOpen, setPrayerOpen] = useState(false);
  const [crossOpen, setCrossOpen] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const content = closingFor(book, chapter);
  const strongsOn = versionId === "kjvp";
  const readKey = `prayread-read-${book.number}-${chapter}`;
  const annKey = `prayread-ann-${book.number}-${chapter}`;
  const [annotations, setAnnotations] = useState<Record<number, { highlight?: string; bookmark?: boolean; note?: string }>>(() => { try { return JSON.parse(localStorage.getItem(annKey) || "{}"); } catch { return {}; } });
  useEffect(() => { try { setRead(localStorage.getItem(readKey) === "1"); } catch {} }, [readKey]);
  useEffect(() => { const v = Number(new URLSearchParams(window.location.search).get("verse")) || 0; if (v > 0) { setSelectedVerse(v); setTimeout(() => document.getElementById(`verse-${v}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 400); } }, []);
  useEffect(() => { return () => { try { window.speechSynthesis?.cancel(); } catch {} }; }, []);
  // Load EN + LU in parallel. LU is only *shown* when langMode needs it, but
  // fetching both keeps BOTH instant and keeps Share in both languages.
  useEffect(() => {
    let alive = true; setLoading(true); setError("");
    const fetchOne = async (lang: string) => {
      const key = `prayread-ch-${book.number}-${chapter}-${lang}`;
      try {
        const res = await fetch(`/api/bible-books/${book.number}/${chapter}?lang=${lang}&version=${lang === "lu" ? "luganda" : versionId}`);
        if (res.ok) { const j = await res.json(); const list = j.verses || j.data || j.chapter?.verses || []; if (list.length) { try { localStorage.setItem(key, JSON.stringify(list)); } catch {}; return list; } }
        throw new Error("empty");
      } catch { try { const c = localStorage.getItem(key); if (c) return JSON.parse(c); } catch {}; return []; }
    };
    (async () => {
      const [en, lu] = await Promise.all([fetchOne("en"), fetchOne("lu")]);
      if (!alive) return;
      setEnVerses(en); setLuVerses(lu);
      if (!en.length && !lu.length) setError("This chapter is not available yet. Go to the Offline centre to download it, or try again when you are online.");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [book.number, chapter, versionId]);
  useEffect(() => { try { localStorage.setItem(annKey, JSON.stringify(annotations)); } catch {} }, [annotations, annKey]);
  const luMap = useMemo(() => { const m = new Map<number, string>(); luVerses.forEach((v: any) => m.set(Number(v.verse ?? v.number), safe(v.text || v.text_luganda || v.luganda || v.content))); return m; }, [luVerses]);
  const enMap = useMemo(() => { const m = new Map<number, string>(); enVerses.forEach((v: any) => m.set(Number(v.verse ?? v.number), safe(v.text || v.text_english || v.text || v.content))); return m; }, [enVerses]);
  const verseCount = Math.max(enVerses.length, luVerses.length);
  const showEn = langMode === "en" || langMode === "both";
  const showLu = langMode === "lu" || langMode === "both";
  const goChapter = (n: number) => {
    if (n < 1) return;
    if (n > book.chapters) { const nx = getBook(book.number + 1); if (nx) router.push(`/bible-reader/${nx.number}/1`); return; }
    router.push(`/bible-reader/${book.number}/${n}`); setSelectedVerse(null); setShowGrid(false); setPrayerOpen(false); setCrossOpen(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const step = (d: number) => goChapter(chapter + d);
  const sayToast = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2000); };
  const toggleRead = () => { const next = !read; setRead(next); try { localStorage.setItem(readKey, next ? "1" : "0"); } catch {}; sayToast(next ? "Marked as read." : "Marked as not read."); };
  const handleListen = () => {
    if (playing) { try { window.speechSynthesis?.cancel(); } catch {}; setPlaying(false); return; }
    const text = enVerses.map((v: any) => safe(v.text || v.text_english || v.content)).join(" ");
    if (!text) { sayToast("No text to listen to yet."); return; }
    try {
      const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.95;
      u.onend = () => setPlaying(false); u.onerror = () => setPlaying(false);
      utterRef.current = u; window.speechSynthesis?.speak(u); setPlaying(true);
    } catch { sayToast("Audio is not available on this device."); }
  };
  const copyText = async (text: string, msg: string) => { try { await navigator.clipboard.writeText(text); sayToast(msg); } catch { prompt("Copy:", text); } };
  const shareVerse = (n: number) => {
    const en = enMap.get(n) || ""; const lu = luMap.get(n) || "";
    const parts = [`📖 ${book.en} ${chapter}:${n}`];
    if (en) parts.push(`\nEN: ${en}`);
    if (lu && lu !== en) parts.push(`\nLU: ${lu}`);
    parts.push(`\n👉 ${window.location.origin}/bible-reader/${book.number}/${chapter}?verse=${n}`);
    setShareTitle(`Share ${book.en} ${chapter}:${n}`); setShareText(parts.join("\n")); setShareOpen(true);
  };
  const shareChapter = () => {
    const first = enVerses.slice(0, 2).map((v: any) => `${v.verse ?? v.number}. ${safe(v.text || v.content)}`).join(" ");
    setShareTitle(`Share ${book.en} ${chapter}`);
    setShareText(`📖 ${book.en} ${chapter} (${VERSIONS.find((v) => v.id === versionId)?.label})\n\n${first}\n\n👉 ${window.location.origin}/bible-reader/${book.number}/${chapter}`);
    setShareOpen(true);
  };
  const sharePrayer = () => { setShareTitle("Share the closing prayer"); setShareText(`🙏 Closing prayer — ${book.en} ${chapter}\n\n${content.closingEn}\n\n${content.closingLu}\n\n👉 ${window.location.origin}/bible-reader/${book.number}/${chapter}`); setShareOpen(true); };
  const applyHighlight = (n: number, color: string) => setAnnotations((a) => ({ ...a, [n]: { ...(a[n] || {}), highlight: a[n]?.highlight === color ? undefined : color } }));
  const toggleBookmark = (n: number) => { setAnnotations((a) => ({ ...a, [n]: { ...(a[n] || {}), bookmark: !a[n]?.bookmark } })); sayToast(annotations[n]?.bookmark ? "Bookmark removed." : "Bookmarked."); };
  const saveNote = (n: number) => { if (!noteDraft.trim()) { sayToast("Write a note first."); return; } setAnnotations((a) => ({ ...a, [n]: { ...(a[n] || {}), note: noteDraft.trim() } })); setNoteDraft(""); sayToast("Note saved."); };
  // Strong's: in KJV+ mode, append the H-number chips after the verse text.
  // The dictionary covers Genesis 1; other chapters show the code + a note.
  const strongChipsFor = (n: number) => {
    if (!strongsOn) return null;
    if (book.number === 1 && chapter === 1 && n === 1) return ["H430", "H1254", "H8064", "H776"];
    if (book.number === 1 && chapter === 1 && n === 2) return ["H8414", "H922", "H2822", "H8415", "H7307"];
    return [];
  };
  const openStrong = (code: string, word = "") => { setStrongCode(code); setStrongWord(word); };
  const crossRefs = book.number === 1 && chapter === 1 ? [{ ref: "John 1:1", text: "In the beginning was the Word, and the Word was with God, and the Word was God." }, { ref: "Hebrews 11:3", text: "Through faith we understand that the worlds were framed by the word of God." }, { ref: "Psalm 19:1", text: "The heavens declare the glory of God; and the firmament sheweth his handywork." }] : [{ ref: `${book.en} ${chapter}:1`, text: "Cross-references for this chapter are added by the admin." }];
  const verseNums = Array.from({ length: verseCount }, (_, i) => i + 1);
  return (
    <div className={`pr-ch-page ${theme === "dark" ? "is-dark" : ""}`}>
      {/* HERO */}
      <section className="pr-ch-hero"><div className="pr-container">
        <div className="pr-ch-hero-top">
          <div className="pr-ch-hero-pills"><Link href="/bible-reader" className="pr-ch-hero-pill">← Back to books</Link><Link href="/" className="pr-ch-hero-pill">← Home</Link></div>
          <Link href="/bible-reader" className="pr-ch-hero-pill is-soft">📖 Bible Reader</Link>
        </div>
        <h1>{book.en} {chapter}</h1>
        <p>{book.lu} · {verseCount} {verseCount === 1 ? "verse" : "verses"}</p>
      </div></section>

      <div className="pr-container pr-ch-shell">
        {/* CONTROL BAR */}
        <div className="pr-controls">
          <div className="pr-ctrl-left">
            <button className="pr-icon-btn" onClick={() => step(-1)} aria-label="Previous chapter">‹</button>
            <button className="pr-chip" onClick={() => setShowGrid((v) => !v)}>☰ Chapter {chapter}</button>
            <button className="pr-icon-btn" onClick={() => step(1)} aria-label="Next chapter">›</button>
          </div>
          <div className="pr-ctrl-right">
            <label className="pr-version"><select value={versionId} onChange={(e) => setVersionId(e.target.value)} aria-label="Bible version">{VERSIONS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select><span>▾</span></label>
            <div className="pr-lang" role="group" aria-label="Language">
              {(["en", "lu", "both"] as const).map((m) => <button key={m} className={langMode === m ? "is-active" : ""} onClick={() => setLangMode(m)}>{m === "en" ? "EN" : m === "lu" ? "LU" : "BOTH"}</button>)}
            </div>
            <button className="pr-chip" onClick={() => setFontScale((f) => Math.max(0.85, +(f - 0.1).toFixed(2)))}>T A-</button>
            <button className="pr-chip" onClick={() => setFontScale((f) => Math.min(1.6, +(f + 0.1).toFixed(2)))}>T A+</button>
            <button className={`pr-chip ${playing ? "is-active" : ""}`} onClick={handleListen}>{playing ? "❚❚ Pause" : "▶ Listen"}</button>
            <button className={`pr-chip ${read ? "is-active" : ""}`} onClick={toggleRead}>{read ? "✓ Read" : "✓ Mark as read"}</button>
            <button className="pr-chip" onClick={shareChapter}>⤴ Share</button>
            <button className="pr-icon-btn" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} aria-label="Toggle theme">{theme === "dark" ? "☀" : "🌙"}</button>
          </div>
          {showGrid && (
            <div className="pr-ch-gridpanel"><div className="pr-ch-grid">{Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => <button key={n} className={n === chapter ? "is-active" : ""} onClick={() => goChapter(n)}>{n}</button>)}</div></div>
          )}
          {strongsOn && <p className="pr-strong-note">KJV+ · Tap a blue Strong's number (e.g. H430) to see what the Hebrew / Greek word means.</p>}
        </div>

        <div className="pr-ch-layout">
          {/* LEFT SIDEBAR */}
          <aside className="pr-ch-side">
            <div className="pr-side-tabs">
              <button className={sideTab === "intro" ? "is-active" : ""} onClick={() => setSideTab("intro")}>📖 Intro</button>
              <button className={sideTab === "commentary" ? "is-active" : ""} onClick={() => setSideTab("commentary")}>💬 Commentary</button>
              <button className={sideTab === "prayer" ? "is-active" : ""} onClick={() => setSideTab("prayer")}>♡ Prayer</button>
            </div>
            <div className="pr-side-card">
              {sideTab === "intro" && (<><div className="pr-side-card-head"><span>📖</span><div><h3>Chapter intro</h3><p>{book.en} {chapter}</p></div></div><div className="pr-side-card-body"><h4>{content.introTitle}</h4><p className="pr-gold-ref">{content.introRef}</p><p>{content.introBody}</p><div className="pr-verse-mini"><span>1</span> {enMap.get(1) || "In the beginning God created the heaven and the earth."}</div></div></>)}
              {sideTab === "commentary" && (<><div className="pr-side-card-head"><span>💬</span><div><h3>Commentary</h3><p>{book.en} {chapter}</p></div></div><div className="pr-side-card-body"><p>{content.commentary}</p></div></>)}
              {sideTab === "prayer" && (<><div className="pr-side-card-head"><span>♡</span><div><h3>Prayer passage</h3><p>{book.en} {chapter}</p></div></div><div className="pr-side-card-body"><p>{content.prayerPassage}</p><p className="pr-side-italic">Tap any verse, then “Prayer passage”, to pray that verse.</p></div></>)}
            </div>
          </aside>

          {/* RIGHT VERSES PANE */}
          <div className="pr-ch-main">
            <div className="pr-resources-bar"><button onClick={() => setResourcesOpen((v) => !v)}>☰</button><span>Resources</span><button className="pr-resources-chev" onClick={() => setResourcesOpen((v) => !v)}>{resourcesOpen ? "˄" : "˅"}</button></div>
            {resourcesOpen && (
              <div className="pr-resources-panel">
                <button onClick={() => setSideTab("commentary")}>💬 Commentary — {book.en} {chapter}</button>
                <button onClick={() => setSideTab("prayer")}>♡ Prayer passage</button>
                <button onClick={() => setCrossOpen(true)}>🔗 Cross-references ({crossRefs.length})</button>
                <button onClick={() => { document.getElementById("closing-prayer")?.scrollIntoView({ behavior: "smooth" }); }}>🙏 Closing prayer</button>
              </div>
            )}
            <div className="pr-verses-card">
              {loading && verseCount === 0 ? <p className="pr-loading">Loading {book.en} {chapter}…</p> : error && verseCount === 0 ? <p className="pr-empty">{error} <button onClick={() => window.location.reload()}>Try again</button></p> : verseCount === 0 ? <p className="pr-empty">No verses here. Choose another chapter above.</p> : (
                <div style={{ fontSize: `${17 * fontScale}px` }}>
                  {verseNums.map((n) => {
                    const en = enMap.get(n) || ""; const lu = luMap.get(n) || "";
                    const ann = annotations[n] || {}; const hl = HIGHLIGHTS.find((h) => h.id === ann.highlight);
                    const selected = selectedVerse === n;
                    const chips = strongChipsFor(n);
                    return (
                      <div key={n} id={`verse-${n}`} className={`pr-verse-block ${selected ? "is-selected" : ""}`}>
                        {selected && (
                          <div className="pr-verse-bar">
                            <span className="pr-verse-bar-title">VERSE {n}</span>
                            <button className="pr-verse-bar-x" onClick={() => setSelectedVerse(null)}>✕</button>
                            <div className="pr-verse-bar-row">
                              <button onClick={() => { setPrayerOpen(true); }}>♡ Prayer passage</button>
                              <button onClick={() => setCrossOpen(true)}>🔗 Cross-references</button>
                              <button onClick={() => setSideTab("commentary")}>💬 Commentary</button>
                              {HIGHLIGHTS.map((h) => <button key={h.id} className="pr-dot" style={{ background: h.color }} title={h.label} onClick={() => applyHighlight(n, h.id)}>{ann.highlight === h.id ? "✓" : ""}</button>)}
                              <button onClick={() => shareVerse(n)}>⤴ Share</button>
                            </div>
                            <div className="pr-verse-bar-row">
                              <button onClick={() => toggleBookmark(n)}>{ann.bookmark ? "🔖 Bookmarked" : "🔖 Bookmark"}</button>
                              <button onClick={() => copyText(`${book.en} ${chapter}:${n}\n${en}${lu && lu !== en ? `\n${lu}` : ""}`, "Verse copied.")}>⧉ Copy</button>
                              <button onClick={() => { setNoteDraft(ann.note || ""); setSelectedVerse(n); }}>✎ Add note</button>
                              {ann.note && <span className="pr-note-saved">📝 {ann.note}</span>}
                            </div>
                            {selected && (
                              <div className="pr-note-box"><input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Write a note on this verse…" /><button onClick={() => saveNote(n)}>Save note</button></div>
                            )}
                          </div>
                        )}
                        <button className="pr-verse-btn" onClick={() => { setSelectedVerse(selected ? null : n); setNoteDraft(annotations[n]?.note || ""); }}>
                          <span className="pr-v-num">{ann.bookmark ? "🔖 " : ""}{n}</span>
                          <span className="pr-v-text" style={hl ? { background: hl.color, borderRadius: 6, padding: "0 4px" } : undefined}>
                            {showEn && en && <span className="pr-v-en">{en}</span>}
                            {showEn && !en && showLu && <span className="pr-v-missing">The English text is not yet available for this verse.</span>}
                            {showLu && (showEn ? <span className="pr-v-divider" /> : null)}
                            {showLu && lu && <span className="pr-v-lu"><span className="pr-lu-badge">LU</span>{lu}</span>}
                            {showLu && !lu && <span className="pr-v-missing">The Luganda text is not yet available for this verse.</span>}
                            {chips.length > 0 && <span className="pr-strong-row">{chips.map((c) => <button key={c} className="pr-strong" onClick={(e) => { e.stopPropagation(); openStrong(c); }}>{c}</button>)}</span>}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prayer passage + Cross-refs panels (inline, under the verse) */}
            {prayerOpen && selectedVerse ? (
              <div className="pr-inline-panel"><h3>♡ Prayer passage — {book.en} {chapter}:{selectedVerse}</h3><p>{content.prayerPassage}</p><p><strong>EN:</strong> {enMap.get(selectedVerse)}</p>{luMap.get(selectedVerse) && <p><strong>LU:</strong> {luMap.get(selectedVerse)}</p>}<button onClick={() => setPrayerOpen(false)}>Close</button></div>
            ) : null}
            {crossOpen && (
              <div className="pr-inline-panel"><h3>🔗 Cross-references — {book.en} {chapter}</h3>{crossRefs.map((c, i) => <p key={i}><strong>{c.ref} —</strong> {c.text}</p>)}<button onClick={() => setCrossOpen(false)}>Close</button></div>
            )}

            <div className="pr-ch-nav"><button onClick={() => step(-1)}>‹ Previous chapter</button><button onClick={() => step(1)}>Next chapter ›</button></div>

            {/* CLOSING PRAYER */}
            <div className="pr-closing" id="closing-prayer">
              <div className="pr-closing-head"><span className="pr-closing-ic">♡</span><div><small>CLOSING PRAYER</small><h2>{book.en} {chapter}</h2></div></div>
              <h3>Closing prayer for {book.en} {chapter}</h3>
              <p>{content.closingEn}</p>
              <hr />
              <p>{content.closingLu}</p>
              <span className="pr-ref-pill">{book.en} {chapter}:1</span>
              <p className="pr-amen">Amen.</p>
              <div className="pr-closing-actions"><button onClick={sharePrayer}>⤴ Share prayer</button><button onClick={() => { document.getElementById("closing-prayer")?.scrollIntoView({ behavior: "smooth" }); sayToast("Pray it again, slowly."); }}>↻ Pray again</button></div>
            </div>

            <div className="pr-bottom-cards">
              <div><h3>Pray this passage</h3><p>Turn {book.en} {chapter} into a guided prayer and keep it in your prayer journal.</p><Link href={`/prayer-library?book=${book.number}&chapter=${chapter}`}>Open prayer journal →</Link></div>
              <div><h3>Saved for later</h3><p>Highlights and notes on {book.en} are stored on this device and in the offline centre.</p><Link href="/dashboard">See my library →</Link></div>
            </div>
          </div>
        </div>
      </div>

      {/* STRONG'S POPUP */}
      {strongCode && (
        <div className="pr-modal-bg" onClick={() => setStrongCode(null)}><div className="pr-modal" onClick={(e) => e.stopPropagation()}>
          <button className="pr-modal-x" onClick={() => setStrongCode(null)}>✕</button>
          <span className="pr-strong-big">{strongCode}</span>
          <h3>{STRONGS[strongCode]?.word || "Strong's word"}</h3>
          <p>{STRONGS[strongCode]?.def || `The full dictionary entry for ${strongCode} is added by the admin. In KJV+ mode, every Hebrew / Greek word behind the English text gets its own number.`}</p>
          <p className="pr-modal-sub">Tap any blue H-number in KJV+ to see its meaning here.</p>
        </div></div>
      )}
      {/* SHARE SHEET */}
      {shareOpen && (
        <div className="pr-modal-bg" onClick={() => setShareOpen(false)}><div className="pr-modal" onClick={(e) => e.stopPropagation()}>
          <button className="pr-modal-x" onClick={() => setShareOpen(false)}>✕</button>
          <h3>{shareTitle}</h3><p className="pr-share-text">{shareText}</p>
          <button className="pr-share-btn" onClick={() => copyText(shareText, "Copied. Paste it anywhere.")}>⧉ Copy all</button>
          <a className="pr-share-btn is-wa" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
        </div></div>
      )}
      {toast && <div className="pr-toast">{toast}</div>}

      <style jsx global>{`
        .pr-ch-page{background:#faf8f2;min-height:100vh;color:#1c382e}
        .pr-ch-page.is-dark{background:#14201b;color:#e8ece8}
        .pr-ch-page.is-dark .pr-verses-card,.pr-ch-page.is-dark .pr-controls,.pr-ch-page.is-dark .pr-side-card,.pr-ch-page.is-dark .pr-resources-bar,.pr-ch-page.is-dark .pr-closing,.pr-ch-page.is-dark .pr-bottom-cards>div,.pr-ch-page.is-dark .pr-inline-panel{background:#1e2e28;border-color:#2c3d34;color:#e8ece8}
        .pr-ch-page.is-dark .pr-v-en,.pr-ch-page.is-dark .pr-side-card-body p,.pr-ch-page.is-dark .pr-closing p{color:#e8ece8}
        .pr-container{max-width:1280px;margin:0 auto;padding:0 20px}
        .pr-ch-hero{background:#1d4035;color:#fff;padding:26px 0 32px}
        .pr-ch-hero-top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .pr-ch-hero-pills{display:flex;gap:10px;flex-wrap:wrap}
        .pr-ch-hero-pill{display:inline-flex;gap:6px;align-items:center;padding:10px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.35);color:#fff;text-decoration:none;font-size:15px}
        .pr-ch-hero-pill.is-soft{background:rgba(255,255,255,.1)}
        .pr-ch-hero h1{font-size:46px;margin:22px 0 0;font-family:Georgia,serif}.pr-ch-hero p{opacity:.9;margin:6px 0 0;font-size:17px}
        .pr-ch-shell{padding-top:22px;padding-bottom:56px}
        .pr-controls{background:#fff;border:1px solid #eee9d6;border-radius:16px;padding:14px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center}
        .pr-ctrl-left,.pr-ctrl-right{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .pr-icon-btn{width:38px;height:38px;border-radius:999px;border:1px solid #e6e2d4;background:#fff;cursor:pointer;font-size:18px}
        .pr-chip{padding:9px 15px;border-radius:999px;border:1px solid #e6e2d4;background:#fff;cursor:pointer;font-weight:600;font-size:14px}
        .pr-chip.is-active{background:#1d4035;color:#fff;border-color:#1d4035}
        .pr-version{position:relative;display:inline-flex;align-items:center}.pr-version select{appearance:none;border:1px solid #e6e2d4;border-radius:999px;padding:9px 34px 9px 15px;background:#fdfbf2;font-weight:700;cursor:pointer}.pr-version span{position:absolute;right:12px;pointer-events:none}
        .pr-lang{display:flex;background:#f5f2e8;border-radius:999px;padding:4px;gap:4px}.pr-lang button{border:0;background:transparent;padding:7px 14px;border-radius:999px;cursor:pointer;font-weight:700;font-size:13px}.pr-lang .is-active{background:#1d4035;color:#fff}
        .pr-ch-gridpanel{width:100%}.pr-ch-grid{display:flex;flex-wrap:wrap;gap:8px}.pr-ch-grid button{min-width:40px;height:36px;border-radius:10px;border:1px solid #d8e0d2;background:#faf8f2;cursor:pointer;font-weight:600}.pr-ch-grid .is-active{background:#1d4035;color:#fff}
        .pr-strong-note{width:100%;margin:0;font-size:13px;color:#a9852e}
        .pr-ch-layout{display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start;margin-top:18px}
        @media(max-width:1000px){.pr-ch-layout{grid-template-columns:1fr}}
        .pr-side-tabs{display:flex;gap:6px;background:#fff;border:1px solid #eee9d6;border-radius:14px;padding:6px;margin-bottom:12px}
        .pr-side-tabs button{flex:1;border:0;background:transparent;padding:11px 6px;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px;color:#5d6d5d}
        .pr-side-tabs .is-active{background:#fdfbf2;box-shadow:0 2px 8px rgba(0,0,0,.06);color:#1c382e}
        .pr-side-card{background:#fff;border:1px solid #eee9d6;border-radius:16px;overflow:hidden}
        .pr-side-card-head{display:flex;gap:12px;align-items:center;padding:16px;border-bottom:1px solid #eee9d6}.pr-side-card-head>span{font-size:20px}
        .pr-side-card-head h3{margin:0;font-size:17px}.pr-side-card-head p{margin:2px 0 0;color:#8a9a8a;font-size:13px}
        .pr-side-card-body{padding:18px}.pr-side-card-body h4{margin:0 0 4px;font-size:19px;line-height:1.4}.pr-gold-ref{color:#a9852e;font-weight:700;margin:0 0 12px}.pr-side-card-body p{line-height:1.8;color:#3d4a3d}.pr-side-italic{font-style:italic;color:#8a9a8a}
        .pr-verse-mini{margin-top:16px;border-left:3px solid #e9c981;background:#fdfbf2;border-radius:0 10px 10px 0;padding:12px;font-size:14px;line-height:1.7}.pr-verse-mini span{color:#a9852e;font-weight:800;margin-right:8px}
        .pr-resources-bar{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #eee9d6;border-radius:14px;padding:12px 16px;font-weight:600}
        .pr-resources-bar button{border:0;background:transparent;cursor:pointer;font-size:16px}.pr-resources-bar>span{flex:1;text-align:center}.pr-resources-chev{width:32px;height:32px;border:1px solid #e6e2d4!important;border-radius:999px}
        .pr-resources-panel{display:flex;flex-wrap:wrap;gap:8px;background:#fff;border:1px solid #eee9d6;border-top:0;border-radius:0 0 14px 14px;padding:12px 16px;margin-top:-6px}
        .pr-resources-panel button{border:1px solid #eee0b8;background:#fdfbf2;border-radius:999px;padding:8px 13px;cursor:pointer;font-weight:600;font-size:13px}
        .pr-verses-card{background:#fff;border:1px solid #eee9d6;border-radius:16px;padding:20px;margin-top:14px}
        .pr-verse-block{border:1px solid transparent;border-radius:12px;padding:6px 8px;margin-bottom:6px}
        .pr-verse-block.is-selected{border-color:#e9c981;background:#fdfbf2}
        .pr-verse-bar{background:#fff;border:1px solid #eee0b8;border-radius:12px;padding:12px;margin-bottom:10px;position:relative}
        .pr-verse-bar-title{font-size:11px;letter-spacing:2px;font-weight:800;color:#a9852e}.pr-verse-bar-x{position:absolute;top:10px;right:10px;border:0;background:transparent;cursor:pointer}
        .pr-verse-bar-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pr-verse-bar-row button{border:1px solid #eee0b8;background:#fdfbf2;border-radius:999px;padding:7px 12px;cursor:pointer;font-size:13px;font-weight:600}
        .pr-dot{width:28px!important;height:28px;border-radius:999px!important;padding:0!important;display:grid;place-items:center;font-size:12px}
        .pr-note-box{display:flex;gap:8px;margin-top:10px}.pr-note-box input{flex:1;border:1px solid #e6e2d4;border-radius:999px;padding:8px 12px}.pr-note-box button{border:0;background:#1d4035;color:#fff;border-radius:999px;padding:8px 14px;cursor:pointer}
        .pr-note-saved{font-size:13px;color:#5d6d5d;align-self:center}
        .pr-verse-btn{display:flex;gap:10px;width:100%;text-align:left;border:0;background:transparent;cursor:pointer;padding:6px 0;align-items:flex-start}
        .pr-v-num{color:#a9852e;font-weight:800;flex-shrink:0;font-size:.85em;padding-top:2px}.pr-v-text{line-height:1.9;font-family:Georgia,serif}
        .pr-v-en{display:block}.pr-v-divider{display:block;height:1px;background:#eee9d6;margin:10px 0}
        .pr-v-lu{display:block;color:#5d6d5d}.pr-lu-badge{display:inline-block;background:#fdf3d8;color:#a9852e;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:800;margin-right:8px;vertical-align:middle}
        .pr-v-missing{display:block;color:#8a9a8a;font-style:italic;font-size:14px}
        .pr-strong-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.pr-strong{border:0;background:transparent;color:#2f5d8a;font-weight:700;cursor:pointer;font-size:13px;padding:0}
        .pr-inline-panel{background:#fff;border:1px solid #eee9d6;border-radius:14px;padding:16px;margin-top:12px}.pr-inline-panel h3{margin:0 0 8px}.pr-inline-panel p{line-height:1.75}.pr-inline-panel button{border:1px solid #e6e2d4;background:#faf8f2;border-radius:999px;padding:7px 14px;cursor:pointer;margin-top:8px}
        .pr-ch-nav{display:flex;justify-content:space-between;margin-top:16px}.pr-ch-nav button{border:1px solid #e6e2d4;background:#fff;border-radius:999px;padding:10px 16px;cursor:pointer;font-weight:600}
        .pr-closing{background:#fff;border:1px solid #eee9d6;border-radius:16px;padding:22px;margin-top:18px}
        .pr-closing-head{display:flex;gap:14px;align-items:center}.pr-closing-ic{width:46px;height:46px;border-radius:12px;background:#1d4035;display:grid;place-items:center;font-size:20px;color:#fff}
        .pr-closing-head small{font-size:11px;letter-spacing:2px;color:#a9852e;font-weight:800}.pr-closing-head h2{margin:2px 0 0;font-size:22px}
        .pr-closing h3{margin:18px 0 8px}.pr-closing p{line-height:1.9;font-size:16px}.pr-closing hr{border:0;border-top:1px solid #eee9d6;margin:16px 0}
        .pr-ref-pill{display:inline-block;border:1px solid #eee0b8;background:#fdfbf2;color:#a9852e;border-radius:999px;padding:6px 12px;font-weight:700;font-size:13px}
        .pr-amen{color:#a9852e;font-weight:800!important;font-family:Georgia,serif}
        .pr-closing-actions{display:flex;gap:8px;margin-top:14px}.pr-closing-actions button{border:1px solid #e6e2d4;background:#faf8f2;border-radius:999px;padding:9px 15px;cursor:pointer;font-weight:600}
        .pr-bottom-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
        @media(max-width:700px){.pr-bottom-cards{grid-template-columns:1fr}}
        .pr-bottom-cards>div{background:#fff;border:1px solid #eee9d6;border-radius:14px;padding:16px}.pr-bottom-cards h3{margin:0 0 6px;font-size:16px}.pr-bottom-cards p{margin:0 0 10px;color:#5d6d5d;font-size:14px;line-height:1.6}.pr-bottom-cards a{color:#a9852e;font-weight:700;text-decoration:none}
        .pr-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);display:grid;place-items:center;z-index:50;padding:16px}
        .pr-modal{position:relative;background:#fff;border-radius:16px;padding:22px;max-width:480px;width:100%;max-height:85vh;overflow:auto}
        .pr-modal-x{position:absolute;top:12px;right:12px;border:0;background:transparent;cursor:pointer;font-size:16px}
        .pr-strong-big{color:#2f5d8a;font-weight:800;font-size:20px}.pr-modal h3{margin:6px 0}.pr-modal p{line-height:1.75}.pr-modal-sub{color:#8a9a8a;font-size:13px}
        .pr-share-text{white-space:pre-wrap;background:#faf8f2;border-radius:10px;padding:12px;font-size:14px;line-height:1.7}
        .pr-share-btn{display:block;width:100%;text-align:center;border:1px solid #e6e2d4;background:#faf8f2;border-radius:999px;padding:11px;cursor:pointer;font-weight:700;margin-top:10px;text-decoration:none;color:#1c382e}
        .pr-share-btn.is-wa{background:#25d366;color:#fff;border-color:#25d366}
        .pr-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1d4035;color:#fff;padding:12px 20px;border-radius:999px;z-index:60;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
        .pr-loading,.pr-empty{text-align:center;color:#5d6d5d;padding:24px}.pr-empty button{border:1px solid #e6e2d4;background:#fff;border-radius:999px;padding:6px 12px;cursor:pointer;margin-left:6px}
      `}</style>
    </div>
  );
}
export default function ChapterPage() {
  return (<Suspense fallback={<div style={{ padding: 32 }}>Loading chapter…</div>}><ChapterInner /></Suspense>);
}
