'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Smartphone, WifiOff, Zap, ArrowLeft, CheckCircle } from 'lucide-react';

export default function InstallPromptPage() {
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  const features = [
    {
      icon: <WifiOff className="w-8 h-8" />,
      title: 'Offline Access',
      description: 'Read the Bible without internet',
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Lightning Fast',
      description: 'Instant loading and navigation',
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'Native Experience',
      description: 'Works like a real app',
    },
  ];

  const iosSteps = [
    { text: 'Tap the Share button', icon: '⬆️' },
    { text: 'Scroll and tap "Add to Home Screen"', icon: '➕' },
    { text: 'Tap "Add" to confirm', icon: '✓' },
  ];

  const androidSteps = [
    { text: 'Tap the menu (⋮) button', icon: '⋮' },
    { text: 'Select "Install app"', icon: '📥' },
    { text: 'Tap "Install" to confirm', icon: '✓' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md mb-6">
            <Download className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Install Pray-Read Bible
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Get the full app experience with offline access, faster loading, and home screen access
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
                <div className="text-white">{feature.icon}</div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-white/80 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Platform Selection */}
        {!platform ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Choose Your Device
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setPlatform('ios')}
                className="p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
              >
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">iOS</h3>
                <p className="text-gray-600">iPhone or iPad</p>
              </button>

              <button
                onClick={() => setPlatform('android')}
                className="p-8 rounded-2xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-center group"
              >
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Android</h3>
                <p className="text-gray-600">Android phone or tablet</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <button
              onClick={() => setPlatform(null)}
              className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Choose different device
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Installation Steps for {platform === 'ios' ? 'iOS' : 'Android'}
            </h2>

            <div className="space-y-4">
              {(platform === 'ios' ? iosSteps : androidSteps).map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{step.text}</p>
                  </div>
                  <div className="text-3xl">{step.icon}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-green-900 mb-2">After Installation</h3>
                  <p className="text-sm text-green-800">
                    The app icon will appear on your home screen. Tap it to launch the app 
                    and enjoy full offline access to all Bible content!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="mt-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Why Install?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              'No app store required',
              'Install in seconds',
              'Full offline support',
              'Automatic updates',
              'Less storage space',
              'Works like native app',
            ].map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-white font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
