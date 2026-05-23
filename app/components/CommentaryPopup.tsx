'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CommentaryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: number;
  chapter: number;
  verseNumber: number;
  bookName: string;
}

export default function CommentaryPopup({
  isOpen,
  onClose,
  bookId,
  chapter,
  verseNumber,
  bookName,
}: CommentaryPopupProps) {
  const [commentary, setCommentary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCommentary();
    }
  }, [isOpen, bookId, chapter, verseNumber]);

  const fetchCommentary = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/commentaries?bookId=${bookId}&chapter=${chapter}&verseNumber=${verseNumber}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setCommentary(data?.commentary_text || null);
      } else {
        console.error('Error fetching commentary:', data.error || 'Unknown error');
        setCommentary(null);
      }
    } catch (error) {
      console.error('Error fetching commentary:', error instanceof Error ? error.message : String(error));
      setCommentary(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-400 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Experiencing Christ</h2>
            <p className="text-sm text-blue-50">
              {bookName} {chapter}:{verseNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : commentary ? (
            <div className="prose prose-blue max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {commentary}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No commentary available for this verse yet.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Commentary will be added soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
