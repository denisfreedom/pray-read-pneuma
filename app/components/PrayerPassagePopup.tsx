'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AudioPlayer from './AudioPlayer';

interface PrayerPassagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: number;
  chapter: number;
  verseNumber: number;
  bookName: string;
}

export default function PrayerPassagePopup({
  isOpen,
  onClose,
  bookId,
  chapter,
  verseNumber,
  bookName,
}: PrayerPassagePopupProps) {
  const [prayerPassage, setPrayerPassage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      handlePrayerPassage();
    }
  }, [isOpen, bookId, chapter, verseNumber]);

  const handlePrayerPassage = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/prayer-passages?bookId=${bookId}&chapter=${chapter}&verseNumber=${verseNumber}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setPrayerPassage(data?.english_prayer || null);
        setAudioUrl(data?.audio_url || null);
      } else {
        console.error('Error fetching prayer passage:', data.error || 'Unknown error');
        setPrayerPassage(null);
      }
    } catch (error) {
      console.error('Error fetching prayer passage:', error instanceof Error ? error.message : String(error));
      setPrayerPassage(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-amber-400 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Prayer Passage</h2>
            <p className="text-sm text-amber-50">
              {bookName} {chapter}:{verseNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-amber-500 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : prayerPassage ? (
            <div className="space-y-3">
              {audioUrl && (
                <AudioPlayer src={audioUrl} label="Listen to Prayer Passage" theme="light" variant="passage" />
              )}
              <div className="prose prose-amber max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {prayerPassage}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No prayer passage available for this verse yet.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Prayer passage will be added soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
