"use client";
import React from "react";

// components/ErrorBoundary.tsx — stops ONE broken component from white-screening the whole site.
// Wrap {children} in app/layout.tsx with <ErrorBoundary> … </ErrorBoundary>
// If any child throws (e.g. rendering a verse object), users see a friendly fallback + Retry,
// NOT "Application error: a client-side exception has occurred".

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };
  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : "Something went wrong." };
  }
  componentDidCatch(err: unknown) {
    // Keep this log — it is what tells you WHICH component crashed, in Vercel / browser console.
    try { console.error("[ErrorBoundary] caught:", err); } catch {}
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
            onClick={() => this.setState({ hasError: false, message: "" })}
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

// THE RULE THAT PREVENTS React Error #3 FOREVER:
// Never render a value that might be an object: {verse} {book} {selectedVerse}
// Always render a STRING field: {verse.text_english} {verse.name_english}
// If you are not sure what it is, use this helper:
export function safeText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const first = o.text_english ?? o.text ?? o.name_english ?? o.title ?? o.message;
    if (typeof first === "string") return first;
    return "";
  }
  return "";
}
