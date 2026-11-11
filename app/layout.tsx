import type { Metadata, Viewport } from 'next';
import './globals.css';
import VisitorTracker from '@/app/components/VisitorTracker';

// ─────────────────────────────────────────────────────────────────────────────
// app/layout.tsx — FIXED: Duplicate export 'default' removed.
// The old file had TWO "export default function RootLayout" blocks pasted
// together (second one started at line 51, themeColor '#1e40af').
// This file has EXACTLY ONE default export. Do not paste another layout
// on top of it — replace the whole file, select-all → paste.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Pray-Read Bible',
  description: 'Read, pray and grow in the Word — in English and Luganda.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
