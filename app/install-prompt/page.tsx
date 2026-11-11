'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Download, Smartphone, WifiOff, Zap, ArrowLeft, CheckCircle,
  Share, MoreVertical, Plus, Monitor, ExternalLink, RefreshCw, BookOpen,
} from 'lucide-react';

// The browser gives us this event once — we must capture it and hold it
// until the user taps Install. If we don't, the real install button
// never appears.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'android';
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter|TikTok/i.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function InstallPromptPage() {
  const [platform, setPlatform] = useState<Platform>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    setInAppBrowser(isInAppBrowser());

    // FIX: capture the browser's install event instead of letting it pass.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      } else {
        // User dismissed it — the browser won't offer it again this session.
        // Fall back to manual steps below instead of a dead button.
        setDismissed(true);
        setDeferredPrompt(null);
      }
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const features = [
    { icon: <WifiOff className="w-7 h-7" />, title: 'Offline Access', description: 'Read the Bible without internet' },
    { icon: <Zap className="w-7 h-7" />, title: 'Lightning Fast', description: 'Instant loading and navigation' },
    { icon: <Smartphone className="w-7 h-7" />, title: 'Native Experience', description: 'Works like a real app' },
  ];

  const iosSteps = [
    { icon: <Share className="w-6 h-6" />, text: 'Tap the Share button at the bottom of Safari' },
    { icon: <Plus className="w-6 h-6" />, text: 'Scroll down and tap "Add to Home Screen"' },
    { icon: <CheckCircle className="w-6 h-6" />, text: 'Tap "Add" to confirm' },
  ];

  const androidSteps = [
    { icon: <MoreVertical className="w-6 h-6" />, text: 'Tap the menu (⋮) button in Chrome' },
    { icon: <Download className="w-6 h-6" />, text: 'Select "Install app" or "Add to Home screen"' },
    { icon: <CheckCircle className="w-6 h-6" />, text: 'Tap "Install" to confirm' },
  ];

  const desktopSteps = [
    { icon: <Download className="w-6 h-6" />, text: 'Look for the Install icon in the address bar (Chrome / Edge)' },
    { icon: <MoreVertical className="w-6 h-6" />, text: 'Or open the browser menu (⋮) and choose "Install Pray-Read Bible"' },
    { icon: <CheckCircle className="w-6 h-6" />, text: 'Click "Install" — the app opens in its own window' },
  ];

  const steps = platform === 'ios' ? iosSteps : platform === 'desktop' ? desktopSteps : androidSteps;
  const platformLabel = platform === 'ios' ? 'iPhone / iPad' : platform === 'desktop' ? 'Computer' : 'Android';
  const showRealButton = !!deferredPrompt && !installed;

  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#6B6455] hover:text-[#1B2340] mb-8 transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-[#1B2340] shadow-xl shadow-[#1B2340]/20 mb-6">
            <BookOpen className="w-12 h-12 text-[#E8B84B]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1B2340] mb-4">
            Install Pray-Read Bible
          </h1>
          <p className="text-lg text-[#6B6455] max-w-2xl mx-auto leading-relaxed">
            Get the full app experience with offline access, faster loading, and home screen access.
            No app store needed — it installs in seconds.
          </p>

          {/* REAL INSTALL BUTTON — only shown when the browser actually offers it */}
          {installed ? (
            <div className="mt-8 inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 font-semibold">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Already installed — look for Pray-Read Bible on your home screen.
            </div>
          ) : showRealButton ? (
            <div className="mt-8">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-[#1B2340] text-white font-bold text-lg shadow-xl shadow-[#1B2340]/25 hover:bg-[#2A3358] transition-all disabled:opacity-60"
              >
                <Download className="w-6 h-6 text-[#E8B84B]" />
                {installing ? 'Installing…' : 'Install App Now'}
              </button>
              <p className="text-sm text-[#9A927E] mt-3">One tap — the browser handles the rest.</p>
            </div>
          ) : dismissed ? (
            <p className="mt-8 text-sm font-medium text-[#6B6455] bg-[#FFF8E6] border border-[#E8B84B]/50 rounded-2xl px-5 py-3 inline-block">
              Install was dismissed — follow the manual steps below instead.
            </p>
          ) : null}
        </div>

        {/* In-app browser warning — Facebook / WhatsApp browsers block installing */}
        {inAppBrowser && !installed && (
          <div className="mb-8 p-5 rounded-2xl bg-[#FFF8E6] border border-[#E8B84B]/60 flex gap-3 items-start">
            <ExternalLink className="w-5 h-5 text-[#B98A2F] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#1B2340] text-sm">You’re inside another app’s browser</p>
              <p className="text-sm text-[#6B6455] mt-1 leading-relaxed">
                Apps like Facebook and WhatsApp don’t allow installing. Tap their menu (⋮) and choose
                <strong> “Open in Chrome”</strong> on Android or <strong>“Open in Safari”</strong> on iPhone,
                then come back here.
              </p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="p-6 rounded-2xl bg-white border border-[#E8B84B]/30 shadow-sm text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F3EEDF] mb-4 text-[#B98A2F]">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-[#1B2340] mb-2">{feature.title}</h3>
              <p className="text-[#6B6455] text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Platform Selection — auto-detected, user can switch */}
        <div className="bg-white rounded-3xl shadow-xl shadow-[#1B2340]/5 border border-[#E8B84B]/30 p-8">
          <h2 className="text-2xl font-bold text-[#1B2340] mb-2 text-center">How to Install</h2>
          <p className="text-sm text-[#6B6455] text-center mb-6">
            Detected your device as <strong className="text-[#1B2340]">{platformLabel}</strong> — switch if that’s wrong.
          </p>
          <div className="flex justify-center gap-2 mb-8" role="tablist" aria-label="Choose your device">
            {([
              { id: 'ios', label: 'iPhone / iPad' },
              { id: 'android', label: 'Android' },
              { id: 'desktop', label: 'Computer' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={platform === tab.id}
                onClick={() => setPlatform(tab.id)}
                className={`px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-colors ${
                  platform === tab.id
                    ? 'bg-[#1B2340] text-white'
                    : 'bg-[#F3EEDF] text-[#6B6455] hover:bg-[#EADFC2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-[#FDFBF6] border border-[#E8B84B]/30">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1B2340] text-white flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-[#1B2340] font-medium">{step.text}</p>
                </div>
                <div className="text-[#B98A2F] flex-shrink-0">{step.icon}</div>
              </div>
            ))}
          </div>

          {/* iOS note — iPhones never get the one-tap button, by 【entity-Apple¦canonical_name=Apple】's design */}
          {platform === 'ios' && (
            <p className="mt-4 text-xs text-[#9A927E] text-center">
              iPhones don’t show a one-tap Install button — 【entity-Apple¦canonical_name=Apple】 requires the Share → Add to Home Screen steps above. That’s normal.
            </p>
          )}

          <div className="mt-8 p-6 rounded-2xl bg-green-50 border border-green-200">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-green-900 mb-2">After Installation</h3>
                <p className="text-sm text-green-800 leading-relaxed">
                  The app icon will appear on your home screen. Tap it to launch the app
                  and enjoy full offline access to all Bible content!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-12 text-center">
          <h2 className="text-3xl font-bold text-[#1B2340] mb-6">Why Install?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              'No app store required',
              'Install in seconds',
              'Full offline support',
              'Automatic updates',
              'Less storage space',
              'Works like native app',
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[#E8B84B]/30 shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-[#1B2340] font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="mt-12 bg-white rounded-3xl border border-[#E8B84B]/30 p-8">
          <h2 className="text-xl font-bold text-[#1B2340] mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#B98A2F]" />
            Don’t see an Install button?
          </h2>
          <ul className="space-y-2 text-sm text-[#6B6455] leading-relaxed list-disc pl-5">
            <li>Use <strong className="text-[#1B2340]">Chrome or Edge</strong> on Android / computer, or <strong className="text-[#1B2340]">Safari</strong> on iPhone. Other browsers may not offer installing.</li>
            <li>Make sure you’re on <strong className="text-[#1B2340]">https://prayreadbible.org</strong> — installing doesn’t work on insecure (http) pages.</li>
            <li>If you dismissed the prompt, close and reopen the browser, then visit this page again.</li>
            <li>Already installed? You’ll see “Already installed” at the top — just open it from your home screen.</li>
          </ul>
          <Link href="/" className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-[#1B2340] underline">
            Continue reading in the browser instead
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
