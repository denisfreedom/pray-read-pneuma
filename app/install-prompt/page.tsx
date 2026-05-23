'use client';

import { useState, useEffect } from 'react';
import { Download, X, Check } from 'lucide-react';
import Link from 'next/link';

export default function InstallPromptPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        console.log('Service Worker is ready');
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual instructions for iOS or browsers that don't support install prompt
      setShowInstructions(true);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const isIOS = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 rounded-full bg-green-100">
              <Check className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">App Installed!</h1>
          <p className="text-gray-600 mb-6">
            Pray-Read Bible has been installed on your device. You can now access it from your home screen.
          </p>
          <Link
            href="/"
            className="w-full py-3 px-6 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-block"
          >
            Open App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <div className="p-4 rounded-full bg-blue-100">
              <Download className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Install Pray-Read Bible</h1>
          <p className="text-gray-600">
            Install our app for a better experience with offline access, faster loading, and easy access from your home screen.
          </p>
        </div>

        {/* Features */}
        <div className="mb-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-600" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Offline Reading</p>
              <p className="text-sm text-gray-600">Read the Bible even without internet</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-600" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Faster Performance</p>
              <p className="text-sm text-gray-600">Pages load instantly</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-600" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Home Screen Access</p>
              <p className="text-sm text-gray-600">Quick launch like a native app</p>
            </div>
          </div>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstallClick}
          className="w-full mb-4 py-3 px-6 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Install App
        </button>

        {/* Manual Instructions Modal */}
        {showInstructions && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Installation Instructions</h3>
              <button onClick={() => setShowInstructions(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            {isIOS() ? (
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-semibold">For iOS (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Tap the Share button (square with arrow)</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" in the top right corner</li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-semibold">For Android (Chrome):</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Tap the menu button (three dots)</li>
                  <li>Select "Add to Home screen" or "Install app"</li>
                  <li>Tap "Add" or "Install"</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Skip Link */}
        <Link
          href="/"
          className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Maybe later
        </Link>
      </div>
    </div>
  );
}
