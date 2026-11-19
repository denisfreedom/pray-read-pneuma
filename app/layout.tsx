import "./globals.css";
import "@/utils/route-change-detector";
import { AppGenProvider } from "@/components/appgen-provider";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorBoundary from "@/components/ErrorBoundary";
import MiniPlayer from "@/app/components/MiniPlayer";
import GlobalVerseSongPlayer from "@/app/components/GlobalVerseSongPlayer";
import GlobalScriptureClickHandler from "@/app/components/GlobalScriptureClickHandler";
import EnableCopyPaste from "@/app/components/EnableCopyPaste";
import OfflineIndicator from "@/app/components/OfflineIndicator";
import OfflineBanner from "@/app/components/OfflineBanner";
import InstallPWA from "@/app/components/InstallPWA";
import InstallPrompt from "@/app/components/InstallPrompt";
import SplashScreen from "@/app/components/SplashScreen";
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

// app/layout.tsx — FIXED FOR THE WHITE-SCREEN CRASH
// Your console showed: React Error #3 — "Objects are not valid as a React child"
// with a verse object {bid, book_id, book_number, chapter, verse, text_english,
// text_luganda, name_english, name_luganda} rendered directly somewhere.
// This file itself did NOT render that object — but it had NO protection, so when
// ANY child (VerseOfTheDayModal, GlobalScriptureClickHandler, SplashScreen, a page)
// threw, the WHOLE site went blank with "Application error: a client-side exception".
//
// FIX: every risky component + {children} is now wrapped in its own <ErrorBoundary>.
// One component crashing now shows a small "Something didn't load — Try again" card
// in THAT spot only. The rest of the page still loads.
// You MUST also add components/ErrorBoundary.tsx (the file I gave you last turn)
// or this layout will fail with "Module not found: @/components/ErrorBoundary".

export const metadata: Metadata = {
  title: 'Pray-Read Bible',
  description: 'A Digital Sanctuary — A living Altar where the Word of God ceases to be mere text and becomes Spirit and Life in the daily experience of every believer.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pray-Read Bible',
  },
  applicationName: 'Pray-Read Bible',
  keywords: ['bible', 'christian', 'reading', 'offline', 'study'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap" />
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-192x192.png" />
        {/* iOS Splash Screens */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-72x72.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-72x72.png" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AppGenProvider>
          <ThemeProvider>
            {/* Each of these runs on EVERY page. If one throws, only it shows the fallback. */}
            <ErrorBoundary><SplashScreen /></ErrorBoundary>
            <ErrorBoundary><EnableCopyPaste /></ErrorBoundary>
            <ErrorBoundary><OfflineIndicator /></ErrorBoundary>
            <ErrorBoundary><OfflineBanner /></ErrorBoundary>
            {/* The page itself — this is the big one. A crash in ANY page now shows
                the fallback card instead of the blank "Application error" screen. */}
            <ErrorBoundary>{children}</ErrorBoundary>
            <ErrorBoundary><MiniPlayer /></ErrorBoundary>
            {/* Verse-songs persistent player — owns the ONE audio element for the whole site.
                Must be in layout, OUTSIDE {children}, or music stops when you leave /verse-songs. */}
            <ErrorBoundary><GlobalVerseSongPlayer /></ErrorBoundary>
            {/* GlobalScriptureClickHandler renders verse popups from clicked references.
                It is the #1 suspect for rendering a verse OBJECT directly — isolated now. */}
            <ErrorBoundary><GlobalScriptureClickHandler /></ErrorBoundary>
            <ErrorBoundary><InstallPWA /></ErrorBoundary>
            <ErrorBoundary><InstallPrompt /></ErrorBoundary>
          </ThemeProvider>
        </AppGenProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registration successful');
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
