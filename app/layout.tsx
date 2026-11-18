import "./globals.css";
import type { Metadata } from "next";
import ErrorBoundary from "./components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Pray-Read Bible",
  description: "A Digital Sanctuary - Pray, Read, and Live the Word daily, in English and Luganda.",
  manifest: "/manifest.json",
};

// app/layout.tsx — MINIMAL, GUARANTEED-TO-BUILD version.
// It imports ONLY: globals.css, ErrorBoundary (which you already have).
// It does NOT import Phosphor, SessionTracker, OfflineManager, or any
// component that might not exist / might not be installed — those were
// the likely build-breakers. Add them back ONE at a time AFTER Vercel
// is green, so you can see exactly which one breaks the build.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
