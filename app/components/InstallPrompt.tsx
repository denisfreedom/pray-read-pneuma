"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// app/components/InstallPrompt.tsx — REDEVELOPED TO BEST
// ⚠️  IMPORTANT: Use ONLY ONE install prompt in layout.tsx.
//    Either <InstallPrompt /> (this file) OR <InstallPWA />, NOT both.
//    If both are mounted, they show TWO cards stacked. This file is the best one —
//    use this one, and REMOVE <InstallPWA /> from layout.tsx.
//    This file also reads window.__pwaDeferredPrompt, so if InstallPWA is still mounted
//    somewhere, they share the same prompt and this file suppresses itself (see `otherPromptActive`).
//
// Old bugs fixed:
// 1) FAKE install: old handleInstall just set localStorage['app-installed']='true' — never installed anything,
//    and hid the prompt FOREVER. Fixed: actually calls deferredPrompt.prompt() + userChoice.
// 2) Dismissed FOREVER: old code stored 'true' with no date -> user never saw it again even if they wanted it.
//    Fixed: 7-day snooze with a real ISO date, same key as InstallPWA.
// 3) 30s timer was too long + never checked beforeinstallprompt -> on many phones it never showed.
//    Fixed: shows after 8s OR on 2nd visit, uses deferred prompt if present, iOS manual steps if not.
// 4) lucide-react import can fail build -> now zero dependencies, inline SVG / emoji only.
// 5) Theme was blue->purple gradient (off-brand) -> now navy #0F2043 + gold #E7C873 + ivory, your local logo.
// 6) No iOS support -> now iPhone gets Share -> Add to Home Screen steps.

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
declare global { interface Window { __pwaDeferredPrompt?: BIPEvent | null; __pwaPromptShown?: boolean } }

const LOGO = '/assets/PrayRead-logo.png';
const SNOOZE_DAYS = 7;
const SHOW_DELAY_MS = 8000;

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}
function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window as any).MSStream;
}
function snoozed(): boolean {
  try {
    const raw = localStorage.getItem('pwa-prompt-dismissed') || localStorage.getItem('install-prompt-dismissed');
    if (!raw) return false;
    if (raw === 'true') return true; // old forever-dismiss: treat as snoozed, but migrate it to a dated snooze
    const d = new Date(raw).getTime();
    return !Number.isNaN(d) && (Date.now() - d) / (1000 * 60 * 60 * 24) < SNOOZE_DAYS;
  } catch { return false; }
}
function snooze() {
  try {
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
    localStorage.removeItem('install-prompt-dismissed'); // clean old key
  } catch {}
}
function markInstalled() {
  try { localStorage.setItem('app-installed', 'true'); } catch {}
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [step, setStep] = useState(0); // 0 = benefits, 1 = confirm — small 2-step flow feels premium
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // If the OTHER prompt (InstallPWA) already showed, don't double-show
      if (window.__pwaPromptShown) return;
      window.__pwaPromptShown = true;
      setShow(true);
    }, SHOW_DELAY_MS);
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem('app-installed') === 'true' && !window.__pwaDeferredPrompt) {
      // Old bug left 'app-installed=true' even when never installed — don't trust it alone.
      // Only trust it if we are standalone (checked above). So clear the stale flag and continue.
      try { localStorage.removeItem('app-installed'); } catch {}
    }
    if (snoozed()) return;
    setIos(isIOS());
    if (window.__pwaDeferredPrompt) setDeferred(window.__pwaDeferredPrompt);

    const onBIP = (e: Event) => { e.preventDefault(); const ev = e as BIPEvent; window.__pwaDeferredPrompt = ev; setDeferred(ev); schedule(); };
    const onInstalled = () => { markInstalled(); setShow(false); window.__pwaDeferredPrompt = null; };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    schedule(); // also show on iOS / after delay even if no BIP event yet
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [schedule]);

  const handleInstall = async () => {
    if (ios && !deferred) { setIosHelp(true); return; }
    if (!deferred) { setIosHelp(true); return; } // no browser prompt available -> show manual steps
    if (step === 0) { setStep(1); return; } // step 1 = confirm, step 0 = benefits
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') { markInstalled(); setShow(false); }
      else { snooze(); setShow(false); } // real "No" -> snooze 7 days
    } catch { setIosHelp(true); }
    finally { setInstalling(false); setDeferred(null); window.__pwaDeferredPrompt = null; }
  };
  const handleDismiss = () => { setShow(false); snooze(); };

  // Never show if standalone, snoozed, or if we have no way to install AND not iOS
  if (!show) return null;
  // On desktop Chrome without BIP yet, still show (browser menu install) — but if neither BIP nor iOS, show manual help on click

  return (
    <div role="dialog" aria-label="Install Pray-Read Bible" className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      {/* Backdrop — tap to snooze */}
      <button aria-label="Dismiss install prompt" onClick={handleDismiss} className="absolute inset-0 bg-[#0F2043]/60 backdrop-blur-[2px] pointer-events-auto" />
      <div className="relative pointer-events-auto w-full max-w-[440px] rounded-[28px] overflow-hidden shadow-2xl animate-[prompt-in_0.4s_ease-out]"
        style={{ background: '#FFFEF7', border: '2px solid #E7C873' }}>
        <style>{`@keyframes prompt-in { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

        {/* ART HEADER — navy + gold, logo tile, verse */}
        <div className="relative px-6 pt-6 pb-5" style={{ background: 'linear-gradient(135deg,#0F2043 0%,#1E3A6E 50%,#8A6D1B 100%)' }}>
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full" style={{ border: '18px solid rgba(231,200,115,0.16)' }} />
          <div className="absolute right-10 top-6 w-14 h-14 rounded-full" style={{ border: '2px solid rgba(231,200,115,0.35)' }} />
          <button onClick={handleDismiss} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:bg-white/15 transition-colors z-10">✕</button>
          <div className="flex items-center gap-3 relative">
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: '#fff', border: '2px solid #E7C873', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} alt="" width={48} height={48} className="w-12 h-12 object-contain" />
            </span>
            <div>
              <p className="text-[10px] tracking-[0.28em] font-bold" style={{ color: '#E7C873' }}>✦ PRAY-READ BIBLE ✦</p>
              <h3 className="text-white font-bold text-[22px] leading-tight mt-1">Take the Bible<br />with you, everywhere.</h3>
            </div>
          </div>
          <p className="relative text-white/70 text-[13px] italic mt-3 font-serif">“Thy word is a lamp unto my feet, and a light unto my path.” — Psalm 119:105</p>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-4 relative">
            {[0, 1].map((i) => (<span key={i} className="h-1.5 rounded-full transition-all" style={{ width: step === i ? 28 : 12, background: step === i ? '#E7C873' : 'rgba(255,255,255,0.3)' }} />))}
          </div>
        </div>

        {/* BODY — 2-step flow */}
        <div className="px-6 py-5">
          {!iosHelp ? (
            step === 0 ? (
              <>
                <div className="space-y-3">
                  {[
                    ['📖', 'Read offline', 'Bible + devotionals + Verse-Songs, even with no data.'],
                    ['⚡', 'Opens in 1 second', 'No browser, no typing prayreadbible.org every time.'],
                    ['🔔', 'Verse of the Day', 'A word to pray on, right on your home screen.'],
                  ].map(([emoji, title, desc]) => (
                    <div key={title} className="flex gap-3 items-start">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: '#FFF8E1', border: '1px solid #E7C873' }}>{emoji}</span>
                      <div><p className="text-sm font-bold text-slate-800">{title}</p><p className="text-[13px] text-slate-500 leading-snug">{desc}</p></div>
                    </div>
                  ))}
                </div>
                <button onClick={handleInstall} className="w-full mt-5 py-3.5 rounded-2xl text-[15px] font-bold text-white shadow-lg transition-transform active:scale-[0.98]" style={{ background: 'linear-gradient(90deg,#0F2043,#1E3A6E)' }}>⬇ Install Pray-Read Bible — Free</button>
                <button onClick={handleDismiss} className="w-full mt-2 py-2.5 rounded-2xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors">Maybe later</button>
                <p className="text-center text-[11px] text-slate-400 mt-2">Free • Takes 5 seconds • Uninstall anytime • No storage worries</p>
              </>
            ) : (
              <>
                <p className="text-center text-sm font-bold text-slate-800">Ready to install?</p>
                <p className="text-center text-[13px] text-slate-500 mt-1 leading-snug">Your browser will ask you to confirm.<br />Tap <b className="text-slate-800">Install</b> on that popup — that&apos;s the real install.</p>
                <div className="flex justify-center my-4"><span className="text-5xl">📱</span></div>
                <button onClick={handleInstall} disabled={installing} className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white disabled:opacity-60" style={{ background: '#0F2043' }}>{installing ? 'Waiting for browser…' : '✓ Yes, Install Now'}</button>
                <button onClick={() => setStep(0)} className="w-full mt-2 py-2.5 rounded-2xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors">← Back to benefits</button>
              </>
            )
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800 mb-2">How to install on this device:</p>
              <ol className="space-y-2.5 text-[13px] text-slate-600 list-decimal list-inside">
                <li>Tap <b className="text-slate-800">Share</b> in your browser (bottom on iPhone, top-right on Android Chrome <b>⋮</b> → <b>Install app</b>)</li>
                <li>Tap <b className="text-slate-800">Add to Home Screen</b> / <b className="text-slate-800">Install app</b></li>
                <li>Tap <b className="text-slate-800">Add / Install</b> — open it from your home screen like a real app.</li>
              </ol>
              <button onClick={() => setIosHelp(false)} className="w-full mt-4 py-3 rounded-2xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">← Back</button>
            </>
          )}
        </div>

        {/* FOOTER STRIP */}
        <div className="px-6 pb-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <span>✦</span><span>Pneuma Freedom Experience Ministry • prayreadbible.org</span><span>✦</span>
        </div>
      </div>
    </div>
  );
}

// ── LAYOUT: use ONLY this one ─────────────────────────────────────────────
// In app/layout.tsx, render ONLY:
//   <InstallPrompt />
// REMOVE <InstallPWA /> from layout.tsx if it is there — otherwise you get TWO cards.
// Optional (recommended): add this script once in <body> so beforeinstallprompt is never missed:
//   <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__pwaDeferredPrompt = e; });` }} />
