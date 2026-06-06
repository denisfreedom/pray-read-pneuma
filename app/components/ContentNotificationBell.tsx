'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Download, BookOpen, MessageSquare, Heart, HelpCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface ContentUpdate {
  contentType: string;
  count: number;
  message: string;
}

interface NotificationBellProps {
  userEmail?: string;
}

export default function ContentNotificationBell({ userEmail }: NotificationBellProps) {
  const [updates, setUpdates] = useState<ContentUpdate[]>([]);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    checkForUpdates();
    
    // Check for updates every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const checkForUpdates = async () => {
    if (!userEmail) return;
    
    try {
      const res = await fetch('/api/content-updates/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
        setTotalUpdates(data.totalUpdates || 0);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const handleDownloadNow = async (contentType: string) => {
    setLoading(true);
    
    // Trigger the download in the DownloadManager by opening the offline page with a hash
    window.location.href = `/offline#download-${contentType}`;
    
    // Mark as downloaded
    try {
      await fetch('/api/content-updates/mark-downloaded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, contentType }),
      });
      
      // Refresh updates
      await checkForUpdates();
    } catch (error) {
      console.error('Failed to mark as downloaded:', error);
    }
    
    setLoading(false);
    setShowDropdown(false);
  };

  const getIcon = (contentType: string) => {
    switch (contentType) {
      case 'books':
        return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'commentaries':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'devotionals':
        return <Heart className="w-5 h-5 text-amber-500" />;
      case 'prayers':
        return <MessageSquare className="w-5 h-5 text-rose-500" />;
      case 'qa':
        return <HelpCircle className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  if (!userEmail) return null;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Content notifications"
      >
        <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        {totalUpdates > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {totalUpdates > 9 ? '9+' : totalUpdates}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Content Updates
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  New content available for offline download
                </p>
              </div>
              <button
                onClick={() => setShowDropdown(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {updates.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No new content available
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    We'll notify you when new content is added
                  </p>
                </div>
              ) : (
                updates.map((update) => (
                  <div
                    key={update.contentType}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(update.contentType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {update.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Download now for offline access
                        </p>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() => handleDownloadNow(update.contentType)}
                        disabled={loading}
                        className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium rounded-full hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/notification-settings"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                onClick={() => setShowDropdown(false)}
              >
                Manage notification settings →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
