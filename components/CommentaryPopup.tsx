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
  const [commentary, setCommentary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCommentary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/commentaries?bookId=${bookId}&chapter=${chapter}&verseNumber=${verseNumber}`
        );
        const data = await res.json();
        if (data.success) {
          setCommentary(data.commentary);
        } else {
          setError('No commentary available for this verse');
        }
      } catch (err) {
        setError('Failed to load commentary');
        console.error('Error loading commentary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommentary();
  }, [isOpen, bookId, chapter, verseNumber]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          background: '#f8f9fc',
          borderRadius: 16,
          padding: 24,
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(0,0,0,0.04)',
            color: '#6b7280',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8, marginTop: 0 }}>
          Commentary
        </h3>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          {bookName} {chapter}:{verseNumber}
        </p>

        {loading && (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>Loading commentary...</p>
        )}

        {error && (
          <p style={{ color: '#ef4444', textAlign: 'center', padding: 20 }}>{error}</p>
        )}

        {commentary && (
          <div style={{ lineHeight: 1.8, color: '#374151', fontSize: 14 }}>
            {commentary.commentary_text && (
              <div dangerouslySetInnerHTML={{ __html: commentary.commentary_text }} />
            )}
            {commentary.luganda_commentary_text && (
              <div
                style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.09)' }}
                dangerouslySetInnerHTML={{ __html: commentary.luganda_commentary_text }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
