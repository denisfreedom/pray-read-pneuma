"use client";
import React from "react";

// app/components/ErrorBoundary.tsx — THE ONLY ErrorBoundary file.
// WHY THE ORIGINAL "Add ErrorBoundary" COMMIT FAILED:
// 1) If this file is missing "use client" at the very top, Next.js treats it
//    as a Server Component — but it uses state + lifecycle, so the build fails.
// 2) If layout.tsx imported it from the WRONG path (e.g. "@/components/..."
//    when the file is at "app/components/..."), the build fails with
//    "Module not found".
// This file fixes (1): "use client" is line 1. The layout file below fixes (2)
// by importing from "./components/ErrorBoundary" — the exact path of this file.

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    try { console.error("[ErrorBoundary]", err); } catch {}
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#faf8f2" }}>
        <div style={{ maxWidth: 480, textAlign: "center", background: "#fff", border: "1px solid #e8dfc8", borderRadius: 24, padding: 32 }}>
          <p style={{ fontSize: 40, margin: 0 }}>📖</p>
          <h2 style={{ fontFamily: "Georgia, serif", color: "#1d4035", margin: "12px 0 8px" }}>Something didn&apos;t load</h2>
          <p style={{ color: "#6b7a6e", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            A section on this page hit a snag. Your Bible, prayers and plans are safe — try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: 20, background: "#1d4035", color: "#fff", border: 0, borderRadius: 999, padding: "12px 28px", fontWeight: 700, cursor: "pointer" }}
          >
            Try again →
          </button>
          <p style={{ marginTop: 16 }}><a href="/" style={{ color: "#a9852e", fontWeight: 700, fontSize: 13 }}>← Back to Home</a></p>
        </div>
      </div>
    );
  }
}
