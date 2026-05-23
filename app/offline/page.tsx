'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, BookOpen, Home } from 'lucide-react';
import Link from 'next/link';
import { getBooks, getStorageUsage } from '@/app/utils/offlineStorage';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [cachedBooks, setCachedBooks] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Load cached books
    loadCachedContent();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const loadCachedContent = async () => {
    try {
      const books = await getBooks();
      setCachedBooks(books);

      const usage = await getStorageUsage();
      setStorageInfo(usage);
    } catch (error) {
      console.error('Error loading cached content:', error);
    }
  };

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`p-4 rounded-full ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
              <WifiOff className={`w-12 h-12 ${isOnline ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isOnline ? 'You are back online!' : 'You are offline'}
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            {isOnline
              ? 'Your connection has been restored. Click retry to reload the page.'
              : 'No internet connection available. You can still access cached Bible content below.'}
          </p>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={!isOnline}
            className={`w-full mb-4 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              isOnline
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-5 h-5" />
            Retry Connection
          </button>

          {/* Home Button */}
          <Link
            href="/"
            className="w-full mb-6 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </Link>

          {/* Cached Content Section */}
          {cachedBooks.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Cached Bible Content</h2>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                You have {cachedBooks.length} book{cachedBooks.length !== 1 ? 's' : ''} available offline
              </p>
              {storageInfo && (
                <p className="text-xs text-gray-500">
                  Storage used: {formatBytes(storageInfo.usage)} of {formatBytes(storageInfo.quota)}
                </p>
              )}
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Offline Mode Tips:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Bible chapters you've visited are cached automatically</li>
              <li>• Commentaries and prayers are available offline</li>
              <li>• Your highlights and notes are saved locally</li>
              <li>• Some features require an internet connection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
