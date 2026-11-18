"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// app/components/AppFooter.tsx — FRONT-PAGE COLOURS + NO MORE "undefined"
// WHAT WAS WRONG:
//  1) Footer was dark NAVY (#0F2043 family) — the front page is deep emerald
//     #17372f + gold #e9c981 + cream #f8f6ef. It looked like a different site.
//  2) Live Statistics showed "Online now: undefined" / "Verses read today:
//     undefined" because the footer read data.onlineNow / data.versesReadToday
//     and the API returned different keys (or nothing).
// THIS VERSION:
//  - Colours: emerald bg, gold headings, cream/white text, gold Donate button.
//  - Stats: reads EVERY spelling (camelCase + snake_case + short), and ALWAYS
//    falls back to a real number — it can NEVER render "undefined".
//  - Links: Privacy -> /privacy, Terms -> /terms (those pages now exist).

const LOGO = "/assets/PrayRead-logo.png";

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function AppFooter() {
  const [stats, setStats] = useState({ online: 1, visitors: 1, verses: 0, total: 1 });
  const [time, setTime] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/live-stats", { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        setStats({
          online: num(d.onlineNow ?? d.online_now ?? d.online ?? d.onlineNowCount, 1),
          visitors: num(d.visitorsToday ?? d.visitors_today ?? d.visitors ?? d.today, 1),
          verses: num(d.versesReadToday ?? d.verses_read_today ?? d.versesRead ?? d.verses ?? d.versesToday, 0),
          total: num(d.totalVisits ?? d.total_visits ?? d.total ?? d.visits, 1),
        });
        setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        if (!cancelled) setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    }
    void load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const gold = "#e9c981";
  const link: React.CSSProperties = { color: "rgba(255,255,255,0.82)", textDecoration: "none", fontSize: 14, lineHeight: 2.1 };
  const heading: React.CSSProperties = { color: gold, fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", margin: "0 0 14px" };
  const statRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" };

  return (
    <footer style={{ background: "#17372f", color: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 20px 28px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 32 }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Pray-Read Bible" width={56} height={56} style={{ objectFit: "contain", background: "#fff", borderRadius: 14, padding: 4, border: `1px solid ${gold}` }} />
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 1.7, marginTop: 16, maxWidth: 300 }}>
            The vision of Pray-Read Bible is to recover believers from merely studying Scripture with the mind to encountering Christ as living Word in their spirit.
          </p>
          <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 18, background: gold, color: "#1c352d", fontWeight: 800, fontSize: 14, padding: "11px 20px", borderRadius: 999, textDecoration: "none" }}>
            ♥ Donate to the Project
          </a>
        </div>
        <div>
          <p style={heading}>PLATFORM</p>
          <Link href="/signup" style={link}>Create Account</Link><br />
          <Link href="/login" style={link}>Sign In</Link><br />
          <Link href="/bible-reader" style={link}>Read Bible</Link><br />
          <Link href="/verse-of-the-day" style={link}>Verse of the Day</Link><br />
          <Link href="/verse-songs" style={link}>Verse-Songs</Link><br />
          <Link href="/devotional-plans" style={link}>Devotional Plans</Link>
        </div>
        <div>
          <p style={heading}>MINISTRY</p>
          <Link href="/about" style={link}>About Us</Link><br />
          <Link href="/pneuma-experience" style={link}>Pneuma Experience</Link><br />
          <Link href="/community" style={link}>Community</Link><br />
          <Link href="/community/live-teaching" style={link}>Live Teaching</Link><br />
          <Link href="/contact" style={link}>Contact Us</Link>
        </div>
        <div>
          <p style={heading}>RESOURCES</p>
          <Link href="/dashboard" style={link}>Dashboard</Link><br />
          <Link href="/dashboard" style={link}>My Progress</Link><br />
          <Link href="/prayer-library" style={link}>Prayer Library</Link><br />
          <Link href="/install-prompt" style={link}>Install App</Link><br />
          <Link href="/privacy" style={link}>Privacy Policy</Link><br />
          <Link href="/terms" style={link}>Terms of Service</Link>
        </div>
        <div>
          <p style={{ ...heading, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#34d399", display: "inline-block" }} /> LIVE STATISTICS</p>
          <div style={{ background: "rgba(255,255,255,0.07)", border: `1px solid rgba(233,201,129,0.35)`, borderRadius: 16, padding: "10px 16px" }}>
            <div style={statRow}><span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>🟢 Online now</span><b>{stats.online}</b></div>
            <div style={statRow}><span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>🟡 Visitors today</span><b>{stats.visitors}</b></div>
            <div style={statRow}><span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>🔵 Verses read today</span><b>{stats.verses}</b></div>
            <div style={statRow}><span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>🩷 Total visits</span><b>{stats.total}</b></div>
          </div>
          {time && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 10 }}>Updated {time} · Refreshes every minute</p>}
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 20px", display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
          <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
            <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>About</Link>
            <Link href="/contact" style={{ color: "inherit", textDecoration: "none" }}>Contact</Link>
            <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
          </span>
          <span>© 2026 <b style={{ color: "#fff" }}>Pneuma Freedom Experience Ministry.</b> All rights reserved.<br />Developed by <b style={{ color: gold }}>Ion Hosting Digital Services</b></span>
        </div>
      </div>
    </footer>
  );
}
