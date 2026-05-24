'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Home, Book, Heart, Download, CheckCircle, Loader } from 'lucide-react';
import Link from 'next/link';
import { getStorageUsage, getAllFromStore, getBooks } from '@/app/utils/offlineStorage';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [cachedData, setCachedData] = useState({
    books: 0,
    verses: 0,
    devotionals: 0,
  });
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Get storage information
    loadStorageInfo();
    loadCachedData();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const loadStorageInfo = async () => {
    const info = await getStorageUsage();
    setStorageInfo(info);
  };

  const loadCachedData = async () => {
    try {
      const books = await getBooks();
      const devotionals = await getAllFromStore('devotionals');
      const verses = await getAllFromStore('verses');
      
      setCachedData({
        books: books.length,
        verses: verses.length,
        devotionals: devotionals.length,
      });
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    
    // Wait a moment to check connection
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setRetrying(false);
      }
    }, 1000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Offline Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <WifiOff className="w-10 h-10 text-gray-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Offline</h1>
            <p className="text-gray-600">
              Don't worry! You can still access your saved Bible content
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 mb-6 p-4 rounded-lg bg-gray-50">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium text-gray-700">
              {isOnline ? 'Connection restored!' : 'No internet connection'}
            </span>
          </div>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {retrying ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Checking connection...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Retry connection
              </>
            )}
          </button>

          {/* Available Offline Content */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Available Offline
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 text-center">
                <Book className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">{cachedData.books}</div>
                <div className="text-xs text-blue-700">Books</div>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 text-center">
                <Download className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-900">{cachedData.verses}</div>
                <div className="text-xs text-purple-700">Verses</div>
              </div>

              <div className="p-4 rounded-lg bg-pink-50 text-center">
                <Heart className="w-6 h-6 text-pink-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-pink-900">{cachedData.devotionals}</div>
                <div className="text-xs text-pink-700">Devotionals</div>
              </div>
            </div>

            {/* Storage Usage */}
            {storageInfo && (
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Storage Used</span>
                  <span className="text-sm text-gray-600">
                    {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Home className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Home</div>
                <div className="text-sm text-gray-600">Return to home page</div>
              </div>
            </Link>

            <Link
              href="/bible-reader"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Book className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Bible Reader</div>
                <div className="text-sm text-gray-600">Access saved Bible chapters</div>
              </div>
            </Link>

            <Link
              href="/devotional-plans"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Heart className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Devotionals</div>
                <div className="text-sm text-gray-600">Continue your devotional journey</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> When you're back online, visited pages will be automatically cached for offline access
          </p>
        </div>
      </div>
    </div>
  );
}
