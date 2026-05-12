'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bell, BellOff, Bookmark, BookmarkCheck } from 'lucide-react';

function DateDisplay() {
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    // Format date on client side only to avoid hydration mismatch
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setDateString(formatter.format(date));
  }, []);

  return <p className="text-gray-600 dark:text-gray-300">{dateString}</p>;
}

interface Verse {
  id: number;
  book_id: number;
  book_number: number;
  chapter: number;
  verse: number;
  text_english: string;
  text_luganda: string;
  name_english?: string;
  name_luganda?: string;
}

export default function VerseOfTheDayModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      getUserEmail();
      checkAndShowVerse();
      checkNotificationPermission();
    }
  }, [isMounted]);

  const getUserEmail = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.user?.email || null);
      }
    } catch (error) {
      console.error('Error fetching user session:', error);
    }
  };

  const checkBookmarkStatus = async (verseData: Verse, email: string) => {
    try {
      const response = await fetch(
        `/api/verse-bookmarks?userEmail=${encodeURIComponent(email)}`
      );
      if (response.ok) {
        const data = await response.json();
        const isVersBookmarked = data.bookmarks?.some(
          (b: any) =>
            b.book_id === verseData.book_id &&
            b.chapter === verseData.chapter &&
            b.verse_number === verseData.verse
        );
        setIsBookmarked(isVersBookmarked || false);
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const checkAndShowVerse = async () => {
    // Check if we've already shown today's verse
    const lastShown = localStorage.getItem('verseOfTheDayShown');
    const today = new Date().toDateString();
    
    if (lastShown === today) {
      setLoading(false);
      return;
    }

    // Fetch today's verse
    try {
      setDataLoading(true);
      const response = await fetch('/api/verse-of-the-day');
      if (response.ok) {
        const data = await response.json();
        
        // Verify that we have all necessary data
        if (!data || !data.text_english) {
          console.error('Invalid verse data received:', data);
          setLoading(false);
          return;
        }
        
        setVerse(data);
        setIsOpen(true);
        localStorage.setItem('verseOfTheDayShown', today);
        
        // Check bookmark status if user is logged in
        if (userEmail) {
          checkBookmarkStatus(data, userEmail);
        }
      } else {
        console.error('Failed to fetch verse of the day:', response.status);
      }
    } catch (error) {
      console.error('Error fetching verse of the day:', error);
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    try {
      const permission = Notification.permission === 'granted' 
        ? 'granted' 
        : await Notification.requestPermission();
      
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
        
        // Send a test notification
        new Notification('Pray Read Bible', {
          body: 'Daily verse notifications enabled! You\'ll receive a verse every day.',
          icon: '/logo.png',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const disableNotifications = () => {
    setNotificationsEnabled(false);
    localStorage.setItem('notificationsEnabled', 'false');
  };

  const toggleBookmark = async () => {
    if (!userEmail || !verse) return;

    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        const response = await fetch(
          `/api/verse-bookmarks?userEmail=${encodeURIComponent(userEmail)}&bookId=${verse.book_id}&chapter=${verse.chapter}&verseNumber=${verse.verse}`,
          { method: 'DELETE' }
        );
        if (response.ok) {
          setIsBookmarked(false);
        }
      } else {
        // Add bookmark
        const response = await fetch('/api/verse-bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail,
            bookId: verse.book_id,
            chapter: verse.chapter,
            verseNumber: verse.verse,
          }),
        });
        if (response.ok) {
          setIsBookmarked(true);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setBookmarkLoading(false);
    }
  };

  if (!isMounted || loading || !isOpen || !verse || dataLoading) return null;

  // Safety check: ensure verse has required data
  if (!verse.text_english || !verse.name_english || verse.chapter === null || verse.chapter === undefined) {
    return null;
  }

  const handlePrayRead = () => {
    // Navigate to the exact verse in the bible reader
    setIsOpen(false);
    // Use window.location for navigation to avoid RSC payload errors
    window.location.href = `/bible-reader/${verse.book_number}/${verse.chapter}?verse=${verse.verse}#verse-${verse.verse}`;
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-blue-200/80 dark:bg-blue-900/80 backdrop-blur-md rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative border-4 border-orange-500">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
        >
          <X size={24} />
        </button>

        <div className="overflow-y-auto p-8 flex-1">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
              Verse of the Day
            </h2>
            <DateDisplay />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
            {verse.text_english ? (
              <>
                <p className="text-xl leading-relaxed text-gray-800 dark:text-gray-200 mb-4 italic">
                  "{verse.text_english}"
                </p>
                {verse.name_english && (
                  <p className="text-lg text-orange-600 dark:text-orange-400 font-semibold text-right">
                    — {verse.name_english} {verse.chapter}:{verse.verse}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Loading verse text...</p>
            )}
          </div>

          {verse.text_luganda && (
            <div className="bg-orange-100 dark:bg-gray-700 rounded-xl p-6 mb-6">
              <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
                {verse.text_luganda}
              </p>
              {verse.name_luganda && (
                <p className="text-md text-orange-700 dark:text-orange-300 font-semibold text-right">
                  — {verse.name_luganda} {verse.chapter}:{verse.verse}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handlePrayRead}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              🙏 Pray-Read This Verse
            </button>

            {userEmail && (
              <button
                onClick={toggleBookmark}
                disabled={bookmarkLoading}
                className={`w-full py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isBookmarked
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                } disabled:opacity-50`}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck size={20} />
                    Bookmarked
                  </>
                ) : (
                  <>
                    <Bookmark size={20} />
                    Bookmark Verse
                  </>
                )}
              </button>
            )}

            {!notificationsEnabled ? (
              <button
                onClick={requestNotificationPermission}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Bell size={20} />
                Enable Daily Verse Notifications
              </button>
            ) : (
              <button
                onClick={disableNotifications}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <BellOff size={20} />
                Notifications Enabled
              </button>
            )}
            
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-white dark:bg-gray-800 border-2 border-orange-600 text-orange-600 dark:text-orange-400 py-3 px-6 rounded-lg font-semibold hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
