import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pray-Read Bible",
  description: "A Digital Sanctuary - Pray, Read, and Live the Word daily, in English and Luganda.",
};

// app/layout.tsx — ISOLATION TEST. No ErrorBoundary import at all.
// PURPOSE: prove whether layout.tsx itself is the breaker.
// - Uses `import type { ReactNode }` — NOT `React.ReactNode` with no React import
//   (that UMD-global error alone can fail every build).
// - No `manifest:` in metadata, no ErrorBoundary, no other imports.
// If THIS goes green, the breaker was the ErrorBoundary wiring (Suspect 1).
// If THIS still goes red, the breaker is "./globals.css" not existing at
// app/globals.css (Suspect 3) — and the Build Log will say so.
// Do NOT add the boundary back until this file is green.

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
