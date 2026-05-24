'use client';

import { useState } from 'react';
import { Download, Smartphone, WifiOff, Zap, Shield, HardDrive, X } from 'lucide-react';

interface PWAFeaturesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PWAFeatures({ isOpen, onClose }: PWAFeaturesProps) {
  if (!isOpen) return null;

  const features = [
    {
      icon: <WifiOff className="w-6 h-6" />,
      title: 'Offline Access',
      description: 'Read the entire Bible, devotionals, and commentaries without internet connection',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: 'Install on Home Screen',
      description: 'Add the app to your device home screen for instant access like a native app',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Fast & Lightweight',
      description: 'Lightning-fast performance with intelligent caching and optimized loading',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: <HardDrive className="w-6 h-6" />,
      title: 'Local Storage',
      description: 'Your bookmarks, highlights, and notes are saved locally and synced automatically',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'All your data is stored securely on your device with optional cloud backup',
      color: 'from-red-500 to-rose-500',
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: 'Selective Downloads',
      description: 'Choose which books or content to download for offline use to save space',
      color: 'from-indigo-500 to-blue-500',
    },
  ];

  const howToInstall = {
    ios: [
      'Open this site in Safari',
      'Tap the Share button at the bottom',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
    android: [
      'Open this site in Chrome',
      'Tap the menu (three dots) in the top right',
      'Tap "Install app" or "Add to Home screen"',
      'Tap "Install" to confirm',
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Download className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">Progressive Web App</h2>
              <p className="text-blue-100">Install for the best experience</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8">
          {/* Features Grid */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">What You Get</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-3`}
                  >
                    {feature.icon}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">How to Install</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* iOS */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <h4 className="font-bold text-gray-900">iOS (iPhone/iPad)</h4>
                </div>
                <ol className="space-y-2">
                  {howToInstall.ios.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Android */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-green-700" />
                  <h4 className="font-bold text-gray-900">Android</h4>
                </div>
                <ol className="space-y-2">
                  {howToInstall.android.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Why Install?</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>No app store required - install directly from your browser</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Takes less than 10 seconds to install</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Works exactly like a native app with full offline support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Automatic updates - always get the latest features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Uses less storage than traditional apps</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
