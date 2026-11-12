"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// app/components/InstallPWA.tsx — FIXED + REDESIGNED
// Fixes:
// 1) Missed event: beforeinstallprompt can fire BEFORE this mounts -> old code missed it forever.
//    Fixed: we stash the event on window in layout (see note at bottom) + also listen here.
// 2) iOS Safari has NO beforeinstallprompt -> iPhone users never saw anything.
//    Fixed: detect iOS + not-standalone -> show "Add to Home Screen" manual instructions.
// 3) setTimeout leak: 10s timer was never cleared on unmount / route change.
//    Fixed: timer in a ref, cleared on cleanup, and only starts after the prompt is ready.
// 4) lucide-react import can fail the build if package is missing -> now pure inline SVG, no dependency.
// 5) Theme: was blue/gray -> now navy #0F2043 + gold #E7C873 + your local logo, matching navbar/footer.
// 6) Dismiss logic: old code stored a date string but compared it as "dismissed" truthy -> now stores ISO date,
//    7-day snooze, plus "Install" / "Not now" / X all snooze correctly. appinstalled event marks installed.
// Usage: <InstallPWA /> once in app/layout.tsx, near the bottom, above </body>.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface Window {
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

const LOGO = '/assets/PrayRead-logo.png';
const SNOOZE_DAYS = 7;
const SHOW_DELAY_MS = 8000; // 8s — user has seen the app first

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true // iOS Safari
    || document.referrer.includes('android-app://');
}
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window as any).MSStream;
}
function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem('pwa-prompt-dismissed');
    if (!raw) return false;
    const d = new Date(raw).getTime();
    if (Number.isNaN(d)) return false;
    return (Date.now() - d) / (1000 * 60 * 60 * 24) < SNOOZE_DAYS;
  } catch { return false; }
}
function snooze() {
  try { localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString()); } catch {}
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  const scheduleShow = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setShowPrompt(true), SHOW_DELAY_MS);
  }, []);

  useEffect(() => {
    if (isStandalone()) { setIsInstalled(true); return; }
    if (wasRecentlyDismissed()) return;
    setIsIOSDevice(isIOS());

    // 1) If the event already fired before we mounted, pick it up from window
    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
      scheduleShow();
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      window.__pwaDeferredPrompt = evt; // stash so a later mount doesn't miss it
      setDeferredPrompt(evt);
      scheduleShow();
    };
    const onInstalled = () => {
      setIsInstalled(true); setShowPrompt(false); setDeferredPrompt(null); window.__pwaDeferredPrompt = null;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // 2) iOS: no beforeinstallprompt exists — show after the same delay, with manual steps
    if (isIOS()) scheduleShow();

    return () => {
      clearTimer();
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [scheduleShow]);

  const handleInstall = async () => {
    // iOS -> show manual steps instead of a browser prompt (there is none)
    if (isIOSDevice && !deferredPrompt) { setShowIOSHelp(true); return; }
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setIsInstalled(true); }
      else { snooze(); } // user said No on the browser prompt -> snooze 7 days
    } catch { /* browser prompt failed — keep card, user can try again */ }
    finally {
      setInstalling(false); setShowPrompt(false); setDeferredPrompt(null); window.__pwaDeferredPrompt = null;
    }
  };

  const handleDismiss = () => { setShowPrompt(false); snooze(); };

  // Never render if installed, or if we have nothing to offer (not iOS + no prompt yet)
  if (isInstalled || !showPrompt) return null;
  if (!isIOSDevice && !deferredPrompt) return null;

  return (
    <div role="dialog" aria-label="Install Pray-Read Bible app" className="fixed bottom-20 left-4 right-4 z-[9990] md:left-auto md:right-4 md:w-[400px] animate-[pwa-in_0.35s_ease-out]">
      <style>{`@keyframes pwa-in { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: '#FFFEF7', border: '2px solid #E7C873' }}>
        {/* Header — navy + gold art, like Verse of the Day popup */}
        <div className="relative px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg,#0F2043 0%,#1E3A6E 55%,#8A6D1B 100%)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full" style={{ border: '14px solid rgba(231,200,115,0.18)' }} />
          <div className="flex items-start gap-3 relative">
            <span className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: '#fff', border: '1px solid #E7C873' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} alt="" width={40} height={40} className="w-10 h-10 object-contain" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.25em] font-bold" style={{ color: '#E7C873' }}>✦ PRAY-READ BIBLE ✦</p>
              <h3 className="text-white font-bold text-lg leading-tight mt-1">Install the App</h3>
              <p className="text-white/70 text-[13px] leading-snug mt-1">Offline Bible • Faster • One tap from your home screen</p>
            </div>
            <button onClick={handleDismiss} aria-label="Dismiss" className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:bg-white/15 transition-colors">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {!showIOSHelp ? (
            <>
              <ul className="space-y-1.5 text-[13px] text-slate-600">
                <li>📖 <b className="text-slate-800">Read offline</b> — Bible + devotionals without data</li>
                <li>⚡ <b className="text-slate-800">Faster</b> — opens instantly, like a real app</li>
                <li>🔔 <b className="text-slate-800">Verse of the Day</b> — right on your home screen</li>
              </ul>
              <div className="flex gap-2 mt-4">
                <button onClick={handleInstall} disabled={installing}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-colors"
                  style={{ background: '#0F2043' }}>
                  {installing ? 'Installing…' : isIOSDevice ? 'How to Install →' : '⬇ Install App'}
                </button>
                <button onClick={handleDismiss} className="px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Not now</button>
              </div>
              <p className="text-center text-[11px] text-slate-400 mt-3">Free • No storage worries • Uninstall anytime</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800 mb-2">On iPhone — 3 taps:</p>
              <ol className="space-y-2 text-[13px] text-slate-600 list-decimal list-inside">
                <li>Tap <b className="text-slate-800">Share</b> <span aria-hidden>⎋</span> at the bottom of Safari</li>
                <li>Scroll down and tap <b className="text-slate-800">Add to Home Screen</b></li>
                <li>Tap <b className="text-slate-800">Add</b> — done! Open it from your home screen.</li>
              </ol>
              <button onClick={() => setShowIOSHelp(false)} className="w-full mt-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">← Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADD THIS TO app/layout.tsx (once, near the top of the <body>) ──────────
// The beforeinstallprompt event can fire before InstallPWA mounts. Stash it
// on window so InstallPWA can pick it up later:
//   <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__pwaDeferredPrompt = e; });` }} />
// If you already have that listener in layout, keep it — this component reads window.__pwaDeferredPrompt.
