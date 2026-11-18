import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Pray-Read Bible",
  description: "A Digital Sanctuary - Pray, Read, and Live the Word daily, in English and Luganda.",
  manifest: "/manifest.json",
};

// app/layout.tsx — ZERO-IMPORT version (V3).
// WHY V2 STILL FAILED: V2 did `import ErrorBoundary from "./components/ErrorBoundary"`.
// If that file is at `components/ErrorBoundary.tsx` (repo root) instead of
// `app/components/ErrorBoundary.tsx`, Next.js throws:
//   "Module not found: Can't resolve './components/ErrorBoundary'"
// and Vercel shows Error in ~20s — exactly what your screenshot shows.
// THIS VERSION imports NOTHING except globals.css. The ErrorBoundary is
// defined IN THIS FILE, so there is no path that can be wrong.
// Do NOT add any import back until Vercel is green.

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { try { console.error("[ErrorBoundary]", err); } catch {} }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#faf8f2" }}>
        <div style={{ maxWidth: 480, textAlign: "center", background: "#fff", border: "1px solid #e8dfc8", borderRadius: 24, padding: 32 }}>
          <p style={{ fontSize: 40, margin: 0 }}>📖</p>
          <h2 style={{ fontFamily: "Georgia, serif", color: "#1d4035" }}>Something didn&apos;t load</h2>
          <p style={{ color: "#6b7a6e", fontSize: 14, lineHeight: 1.6 }}>A section on this page hit a snag. Your Bible, prayers and plans are safe — try again.</p>
          <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: 20, background: "#1d4035", color: "#fff", border: 0, borderRadius: 999, padding: "12px 28px", fontWeight: 700, cursor: "pointer" }}>Try again →</button>
          <p style={{ marginTop: 16 }}><a href="/" style={{ color: "#a9852e", fontWeight: 700, fontSize: 13 }}>← Back to Home</a></p>
        </div>
      </div>
    );
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
