'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Download, X, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasDownloadedContent, setHasDownloadedContent] = useState(false);
  const [downloadedBooksCount, setDownloadedBooksCount] = useState(0);

  useEffect(() => {
    // Check if user has dismissed the banner
    const isDismissed = localStorage.getItem('offline-banner-dismissed');
    if (isDismissed) {
      setDismissed(true);
    }

    // Check if user has downloaded content
    const checkDownloadedContent = async () => {
      try {
        const { getAllFromStore } = await import('@/app/utils/offlineStorage');
        const allVerses = await getAllFromStore('verses');
        
        if (allVerses && allVerses.length > 0) {
          setHasDownloadedContent(true);
          
          // Count unique books
          const uniqueBooks = new Set(allVerses.map((v: any) => v.book_id));
          setDownloadedBooksCount(uniqueBooks.size);
        }
      } catch (error) {
        console.error('Error checking downloaded content:', error);
      }
    };

    checkDownloadedContent();

    const updateOnlineStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      
      if (offline && !isDismissed) {
        setShowBanner(true);
      }
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('offline-banner-dismissed', 'true');
  };

  if (!showBanner || !isOffline || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-md animate-slide-up">
      <div className={`rounded-2xl shadow-2xl p-4 text-white ${
        hasDownloadedContent 
          ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
          : 'bg-gradient-to-r from-orange-600 to-red-600'
      }`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              {hasDownloadedContent ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <WifiOff className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold mb-1">
              {hasDownloadedContent ? 'Offline Mode Active' : "You're Offline"}
            </h3>
            <p className="text-sm text-white/90 mb-3">
              {hasDownloadedContent ? (
                <>
                  {downloadedBooksCount} {downloadedBooksCount === 1 ? 'book' : 'books'} available offline. You can read downloaded chapters without internet.
                </>
              ) : (
                'Download Bible content to read without internet connection'
              )}
            </p>
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                hasDownloadedContent
                  ? 'bg-white text-green-600 hover:bg-gray-100'
                  : 'bg-white text-orange-600 hover:bg-gray-100'
              }`}
            >
              <Download className="w-4 h-4" />
              {hasDownloadedContent ? 'Manage Downloads' : 'Download Content'}
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
