'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Heart } from 'lucide-react';

interface Prayer {
  english_prayer: string;
  luganda_prayer: string;
}

interface VersePrayerDisplayProps {
  bookId: number;
  chapter: number;
  verseNumber: number;
  prayer: Prayer | null;
  language: 'english' | 'luganda' | 'both';
  userEmail?: string;
}

export default function VersePrayerDisplay({
  bookId,
  chapter,
  verseNumber,
  prayer,
  language,
  userEmail
}: VersePrayerDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [logging, setLogging] = useState(false);

  const logPrayerView = async () => {
    if (!userEmail || !expanded) return;

    try {
      setLogging(true);
      // Log using the unified activity-log endpoint
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          activity_type: 'prayer_expanded',
          book_id: bookId,
          chapter,
          verse_number: verseNumber
        })
      });
    } catch (error) {
      console.error('Error logging prayer view:', error);
    } finally {
      setLogging(false);
    }
  };

  useEffect(() => {
    if (expanded && userEmail) {
      logPrayerView();
    }
  }, [expanded]);

  if (!prayer) {
    return null;
  }

  const hasEnglish = prayer.english_prayer && prayer.english_prayer.trim();
  const hasLuganda = prayer.luganda_prayer && prayer.luganda_prayer.trim();

  if (!hasEnglish && !hasLuganda) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all w-full ${
          expanded
            ? 'bg-purple-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Heart className={`h-4 w-4 ${expanded ? 'fill-current' : ''}`} />
        <span>Prayer for this Verse</span>
        <ChevronDown
          className={`h-4 w-4 ml-auto transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-4 bg-purple-50 rounded-lg p-4 border border-purple-200 space-y-4 animate-in fade-in duration-200">
          {language === 'both' ? (
            <>
              {hasEnglish && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                    Prayer - English
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {prayer.english_prayer}
                  </p>
                </div>
              )}
              {hasLuganda && (
                <div className={hasEnglish ? 'border-t border-purple-200 pt-4' : ''}>
                  <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                    Prayer - Luganda
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {prayer.luganda_prayer}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                {language === 'english' ? 'Prayer - English' : 'Prayer - Luganda'}
              </p>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {language === 'english'
                  ? prayer.english_prayer
                  : prayer.luganda_prayer || prayer.english_prayer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
