"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// app/components/SiteHeader.tsx — FRONT-PAGE COLOURS
// WHAT WAS WRONG: inner pages (About, etc.) used a dark NAVY header
// (#0F2043 family) with a navy "Sign Up" look — the front page is deep
// emerald #17372f + gold #e9c981 + cream. It looked like a different site.
// THIS VERSION: emerald bar, white nav, gold accents, gold Sign Up button,
// gold-outline Donate button. Same links as your screenshot.
// USE IT: in any inner page, replace its <header>...</header> block with:
//   import SiteHeader from "@/app/components/SiteHeader";
//   <SiteHeader />
// (Home keeps its own hero header — do NOT put this on app/page.tsx.)

const LOGO = "/assets/PrayRead-logo.png";
const LOGO_FALLBACK = "https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png";
const GOLD = "#e9c981";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Read Bible", href: "/bible-reader" },
  { label: "Devotionals", href: "/devotional-plans" },
  { label: "Verse of the Day", href: "/verse-of-the-day" },
  { label: "Verse-Songs", href: "/verse-songs" },
  { label: "Prayer Library", href: "/prayer-library" },
];

export default function SiteHeader() {
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setUserEmail(localStorage.getItem("userEmail")); } catch {} }, []);
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#17372f", borderBottom: `1px solid rgba(233,201,129,0.4)`, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Pray-Read Bible" width={42} height={42} style={{ objectFit: "contain", background: "#fff", borderRadius: 12, padding: 2, border: `1px solid ${GOLD}` }} onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} />
          <span style={{ lineHeight: 1.1 }}>
            <span style={{ display: "block", color: "#fff", fontWeight: 800, fontSize: 17 }}>Pray-Read <span style={{ color: GOLD }}>Bible</span></span>
            <span style={{ display: "block", color: "rgba(255,255,255,0.65)", fontSize: 9, letterSpacing: "0.22em", fontWeight: 700 }}>ENCOUNTER THE LIVING WORD</span>
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }} aria-label="Main navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} style={{ color: "rgba(255,255,255,0.88)", textDecoration: "none", fontSize: 14, fontWeight: 600, padding: "8px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>{n.label}</Link>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" style={{ border: `1px solid rgba(233,201,129,0.7)`, color: "#fff", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>♥ Donate</a>
          {userEmail ? (
            <Link href="/dashboard" style={{ background: GOLD, color: "#1c352d", padding: "8px 18px", borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" style={{ color: "#fff", padding: "8px 12px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Log In</Link>
              <Link href="/signup" style={{ background: GOLD, color: "#1c352d", padding: "8px 18px", borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>Sign Up</Link>
            </>
          )}
          <button onClick={() => setOpen(!open)} aria-label="Menu" style={{ display: "none" }}>☰</button>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { nav[aria-label="Main navigation"] { display: none !important; } }`}</style>
      {open && null}
    </header>
  );
}
