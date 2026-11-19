import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalVerseSongPlayer from "@/app/components/GlobalVerseSongPlayer";

export const metadata: Metadata = {
  title: "Pray-Read Bible",
  description: "A Digital Sanctuary - Pray, Read, and Live the Word daily, in English and Luganda.",
  manifest: "/manifest.json",
};

// app/layout.tsx — MINIMAL + GLOBAL PLAYER (build-safe base)
// This is your GREEN layout that already built, plus ONLY the global verse-song player.
// No MiniPlayer / SplashScreen / InstallPWA / etc. — those were in the CRASH layout
// and each one is another possible "Module not found". Add them back one at a time later if you need them.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        <ErrorBoundary><GlobalVerseSongPlayer /></ErrorBoundary>
      </body>
    </html>
  );
}
