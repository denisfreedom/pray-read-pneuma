'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useScripturePopup, ScriptureVersePopup, ScriptureText } from '@/components/ScriptureVersePopup';

interface CrossReference {
  id?: number;
  source_book_id: number;
  source_chapter: number;
  source_verse: number;
  target_book_id: number;
  target_chapter: number;
  target_verse: number;
  target_book_number?: number;
  relationship_type: string;
  notes: string;
  source_book_name?: string;
  target_book_name?: string;
  text_english?: string;
  text_luganda?: string;
}

interface Book {
  id: number;
  name_english: string;
}

interface CrossReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBookId: number;
  sourceChapter: number;
  sourceVerse: number;
  sourceBookName: string;
  books?: Book[];
  theme?: 'light' | 'sepia' | 'dark';
  onRefresh?: () => void;
}

export default function CrossReferenceModal({
  isOpen,
  onClose,
  sourceBookId,
  sourceChapter,
  sourceVerse,
  sourceBookName,
  books = [],
  theme = 'light',
  onRefresh
}: CrossReferenceModalProps) {
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookNames, setBookNames] = useState<Record<number, string>>({});
  const { popup, openVerse, closePopup } = useScripturePopup();


  useEffect(() => {
    if (isOpen) {
      fetchCrossReferences();
    }
  }, [isOpen, sourceBookId, sourceChapter, sourceVerse]);

  const fetchCrossReferences = async () => {
    setLoading(true);
    setError('');
    try {
      // Use bookId/chapter/verse params which return full data including verse text and book names
      const response = await fetch(
        `/api/cross-references?bookId=${sourceBookId}&chapter=${sourceChapter}&verse=${sourceVerse}`
      );
      const data = await response.json();
      const refs = Array.isArray(data) ? data : [];
      setCrossRefs(refs);

      // Book names are already included in the response (target_book_name field)
      // But also build a fallback namesMap from the returned data
      const namesMap: Record<number, string> = {};
      refs.forEach((r: CrossReference) => {
        if (r.target_book_id && r.target_book_name) {
          namesMap[r.target_book_id] = r.target_book_name;
        }
      });
      setBookNames(namesMap);
    } catch (err) {
      setError('Failed to fetch cross-references');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTargetBookName = (bookId: number, ref?: CrossReference) => {
    return ref?.target_book_name || bookNames[bookId] || `Book ${bookId}`;
  };

  const getBackgroundClass = () => {
    if (theme === 'sepia') return 'bg-yellow-50';
    if (theme === 'dark') return 'bg-gray-900';
    return 'bg-white';
  };

  const getModalBackgroundClass = () => {
    // Lighter, semi-transparent background for modal content
    if (theme === 'sepia') return 'bg-yellow-50/95';
    if (theme === 'dark') return 'bg-gray-800/95';
    return 'bg-white/95';
  };

  const getBorderClass = () => {
    if (theme === 'sepia') return 'border-yellow-300';
    if (theme === 'dark') return 'border-gray-700';
    return 'border-gray-200';
  };

  const getTextClass = () => {
    if (theme === 'dark') return 'text-gray-100';
    if (theme === 'sepia') return 'text-yellow-900';
    return 'text-gray-900';
  };

  const getSecondaryTextClass = () => {
    if (theme === 'dark') return 'text-gray-400';
    if (theme === 'sepia') return 'text-yellow-700';
    return 'text-gray-600';
  };

  // Strip HTML tags and comment artifacts from verse text
  const stripHtml = (text: string | undefined): string => {
    if (!text) return '';
    return text
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Returns verse text — English on top (primary), Luganda below (secondary)
  const getVerseDisplay = (ref: CrossReference): { primary: string; secondary?: string } => {
    const luganda = stripHtml(ref.text_luganda);
    const english = stripHtml(ref.text_english);
    if (english && luganda && luganda !== english) {
      return { primary: english, secondary: luganda };
    }
    if (english) return { primary: english };
    if (luganda) return { primary: luganda };
    return { primary: '' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${getModalBackgroundClass()} border ${getBorderClass()} rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-sm`}>
        {/* Header */}
        <div className={`border-b ${getBorderClass()} p-6 flex items-center justify-between flex-shrink-0`}>
          <h2 className={`text-2xl font-bold ${getTextClass()}`}>
            📖 {sourceBookName} {sourceChapter}:{sourceVerse}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : theme === 'sepia' ? 'bg-yellow-200 hover:bg-yellow-300' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 mb-6">
              ❌ {error}
            </div>
          )}

          {loading ? (
            <div className={`p-8 text-center ${getSecondaryTextClass()}`}>
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
              </div>
              <p className="mt-2">Loading cross-references...</p>
            </div>
          ) : crossRefs.length === 0 ? (
            <div className={`p-8 text-center italic ${getSecondaryTextClass()}`}>
              No cross-references added yet
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${getTextClass()} mb-4`}>
                Related Passages ({crossRefs.length})
              </h3>
              
              {crossRefs.map((ref, index) => (
                <div
                  key={`${ref.target_book_id}-${ref.target_chapter}-${ref.target_verse}-${index}`}
                  className={`p-4 rounded-lg border-l-4 ${
                    theme === 'dark'
                      ? 'bg-gray-700/60 border-purple-500 hover:bg-gray-700/80'
                      : theme === 'sepia'
                      ? 'bg-yellow-100/60 border-yellow-600 hover:bg-yellow-100/80'
                      : 'bg-blue-50/60 border-blue-400 hover:bg-blue-50/80'
                  } transition-colors`}
                >
                  {/* Reference Header with link */}
                  <div className="flex items-center justify-between mb-2">
                    <p className={`font-bold text-lg ${getTextClass()}`}>
                      {getTargetBookName(ref.target_book_id, ref)} {ref.target_chapter}:{ref.target_verse}
                    </p>
                    <Link
                      href={`/bible-reader/${ref.target_book_number ?? ref.target_book_id}/${ref.target_chapter}?verse=${ref.target_verse}`}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                        theme === 'dark' ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : theme === 'sepia' ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      title="Open this verse"
                      onClick={onClose}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Read
                    </Link>
                  </div>

                  {/* Verse Text */}
                  {(() => {
                    const { primary, secondary } = getVerseDisplay(ref);
                    return primary ? (
                      <div className="space-y-1 mb-3">
                        <p className={`${getTextClass()} leading-relaxed text-base font-medium`}>
                          {primary}
                        </p>
                        {secondary && (
                          <p className={`${getSecondaryTextClass()} leading-relaxed text-sm italic mt-1`}>
                            {secondary}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className={`${getSecondaryTextClass()} text-sm italic mb-3`}>
                        Verse text not available
                      </p>
                    );
                  })()}

                  {/* Metadata */}
                  {(ref.relationship_type || ref.notes) && (
                    <div className={`text-sm space-y-1 pt-2 border-t ${getBorderClass()}`}>
                      {ref.relationship_type && (
                        <p className={getSecondaryTextClass()}>
                          <span className="font-semibold">Type:</span> <span className="capitalize">{ref.relationship_type}</span>
                        </p>
                      )}
                      {ref.notes && (
                        <p className={`${getSecondaryTextClass()} italic`}>
                          <span className="font-semibold">Note:</span>{' '}
                          <ScriptureText text={ref.notes} onVerseClick={openVerse} />
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t ${getBorderClass()} p-6 flex justify-end gap-3 flex-shrink-0`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                : theme === 'sepia'
                ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Close
          </button>
        </div>
      </div>
      <ScriptureVersePopup popup={popup} onClose={closePopup} />
    </div>
  );
}
