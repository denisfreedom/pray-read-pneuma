import Link from "next/link";

export const metadata = { title: "Privacy Policy — Pray-Read Bible", description: "How Pray-Read Bible handles your information." };

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "70vh", background: "#f8f6ef", color: "#1d3029", padding: "48px 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", border: "1px solid #e8e7de", borderRadius: 24, padding: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#60745e" }}>PRAY-READ BIBLE</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, color: "#1c382e", margin: "12px 0 8px" }}>Privacy Policy</h1>
        <p style={{ color: "#6b7a6e", fontSize: 14 }}>Last updated: November 2026</p>
        <p style={{ lineHeight: 1.8 }}>Pray-Read Bible is a ministry of Pneuma Freedom Experience Ministry. We keep this simple: we collect only what is needed to run the app, and we never sell your personal information.</p>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>What we collect</h2>
        <ul style={{ lineHeight: 1.8 }}><li><b>Account details</b> — your name and email when you sign up, so you can save progress, notes and plans.</li><li><b>Your activity in the app</b> — reading progress, prayer-library use and devotional progress, so your dashboard can show where you left off.</li><li><b>Basic usage counts</b> — anonymous visit and verse-read counts shown as Live Statistics in the footer.</li></ul>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>What we do not do</h2>
        <p style={{ lineHeight: 1.8 }}>We do not sell your data. We do not share your prayers, notes or reading history with advertisers.</p>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>Your choices</h2>
        <p style={{ lineHeight: 1.8 }}>You can ask us to delete your account and its saved progress by contacting us through the Contact page. We will confirm once it is removed.</p>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>Contact</h2>
        <p style={{ lineHeight: 1.8 }}>Questions about this policy? Reach us via <Link href="/contact" style={{ color: "#a9852e", fontWeight: 700 }}>Contact</Link>.</p>
        <p><Link href="/" style={{ color: "#a9852e", fontWeight: 700 }}>← Back to Home</Link></p>
      </div>
    </main>
  );
}
