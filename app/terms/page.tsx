import Link from "next/link";

export const metadata = { title: "Terms of Service — Pray-Read Bible", description: "Terms for using Pray-Read Bible." };

export default function TermsPage() {
  return (
    <main style={{ minHeight: "70vh", background: "#f8f6ef", color: "#1d3029", padding: "48px 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", border: "1px solid #e8e7de", borderRadius: 24, padding: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#60745e" }}>PRAY-READ BIBLE</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, color: "#1c382e", margin: "12px 0 8px" }}>Terms of Service</h1>
        <p style={{ color: "#6b7a6e", fontSize: 14 }}>Last updated: November 2026</p>
        <p style={{ lineHeight: 1.8 }}>By using Pray-Read Bible, you agree to these terms. Pray-Read Bible is a ministry of Pneuma Freedom Experience Ministry, provided to help you pray, read and live the Word daily.</p>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>Use of the app</h2>
        <ul style={{ lineHeight: 1.8 }}><li>Use the app for personal study, prayer and encouragement.</li><li>Do not misuse the app, attempt to break it, or post content that harasses others.</li><li>Scripture text is provided for reading and study. Please respect the translation&apos;s own terms where shown.</li></ul>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>Accounts</h2>
        <p style={{ lineHeight: 1.8 }}>Keep your account details safe. You are responsible for activity under your account. If you no longer wish to use the app, you may ask us to delete your account via the Contact page.</p>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>Availability</h2>
        <p style={{ lineHeight: 1.8 }}>We work to keep the app available, but we cannot guarantee it will never be interrupted for maintenance or reasons beyond our control.</p>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#1c382e" }}>Contact</h2>
        <p style={{ lineHeight: 1.8 }}>Questions? Reach us via <Link href="/contact" style={{ color: "#a9852e", fontWeight: 700 }}>Contact</Link>.</p>
        <p><Link href="/" style={{ color: "#a9852e", fontWeight: 700 }}>← Back to Home</Link></p>
      </div>
    </main>
  );
}
