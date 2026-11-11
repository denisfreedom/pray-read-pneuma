import type { Metadata, Viewport } from 'next';
import './globals.css';

// ─────────────────────────────────────────────────────────────────────────────
// app/layout.tsx — CLEAN, KNOWN-GOOD RESTORE
// Use this ONLY if you cannot open the Jun 6 version (99f3528) in GitHub.
// It is intentionally minimal: no extra imports, so it CANNOT fail the build
// because of a missing component. Once this goes green, we add features back
// ONE at a time (VisitorTracker, then offline, then install prompt).
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Pray-Read Bible',
  description: 'Read, pray and grow in the Word — in English and Luganda.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
