import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Pray-Read Bible",
  description: "A Digital Sanctuary - Pray, Read, and Live the Word daily, in English and Luganda.",
  manifest: "/manifest.json",
};

// app/layout.tsx — Server Component. No "use client" here (metadata forbids it).
// ErrorBoundary lives in its own file with "use client" on line 1 — that is
// what makes this import legal. Import path "./components/ErrorBoundary"
// matches the file at app/components/ErrorBoundary.tsx exactly.

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
