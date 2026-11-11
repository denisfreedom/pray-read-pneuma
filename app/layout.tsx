import "./globals.css";
import "@/utils/route-change-detector";
import { AppGenProvider } from "@/components/appgen-provider";
import { ThemeProvider } from "@/components/theme-provider";
import MiniPlayer from "@/app/components/MiniPlayer";
import GlobalScriptureClickHandler from "@/app/components/GlobalScriptureClickHandler";
import EnableCopyPaste from "@/app/components/EnableCopyPaste";
import OfflineIndicator from "@/app/components/OfflineIndicator";
import OfflineBanner from "@/app/components/OfflineBanner";
import InstallPWA from "@/app/components/InstallPWA";
import InstallPrompt from "@/app/components/InstallPrompt";
import SplashScreen from "@/app/components/SplashScreen";
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import VisitorTracker from "@/app/components/VisitorTracker";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
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
            <SplashScreen />
            <EnableCopyPaste />
            <OfflineIndicator />
            <OfflineBanner />
            {children}
            <MiniPlayer />
            <GlobalScriptureClickHandler />
            <InstallPWA />
            <InstallPrompt />
          </ThemeProvider>
        </AppGenProvider>
        <Script src="https://unpkg.com/@phosphor-icons/web" strategy="afterInteractive" />
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
