'use client';

import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { stripHtml } from '@/app/utils/stripHtml';

interface VerseShareButtonProps {
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
  className?: string;
}

export default function VerseShareButton({
  bookName,
  chapter,
  verse,
  verseText,
  className = ''
}: VerseShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Strip HTML from verse text before sharing
  const cleanVerseText = stripHtml(verseText);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/bible-reader/${encodeURIComponent(bookName)}/${chapter}?verse=${verse}`;
  const shareText = `${bookName} ${chapter}:${verse} - ${cleanVerseText}`;

  const handleShare = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'telegram' | 'email' | 'copy') => {
    const truncatedText = cleanVerseText.length > 280 ? cleanVerseText.substring(0, 277) + '...' : cleanVerseText;
    const encodedText = encodeURIComponent(truncatedText);
    const encodedUrl = encodeURIComponent(shareUrl);
    const referenceText = `${bookName} ${chapter}:${verse}`;

    let url = '';

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(`${shareText}

${shareUrl}`);
        alert('Verse copied to clipboard!');
        setShowShareMenu(false);
        return;
      } catch {
        console.error('Failed to copy');
        return;
      }
    }

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}%20-%20${referenceText}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}%20(${referenceText})&url=${encodedUrl}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedText}%20(${referenceText})%20${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}%20(${referenceText})`;
        break;
      case 'email':
        url = `mailto:?subject=Scripture Verse: ${referenceText}&body=${encodeURIComponent(cleanVerseText)}%0A%0A${referenceText}%0A${shareUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      setShowShareMenu(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-sm font-medium"
        title="Share this verse"
      >
        <Share2 size={16} />
        Share
      </button>

      {showShareMenu && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-max">
          <button
            onClick={() => handleShare('facebook')}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 first:rounded-t-lg flex items-center gap-2"
          >
            <span className="text-blue-600">f</span> Facebook
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <span className="text-blue-400">𝕏</span> Twitter
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <span className="text-green-600">💬</span> WhatsApp
          </button>
          <button
            onClick={() => handleShare('telegram')}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <span className="text-blue-500">✈️</span> Telegram
          </button>
          <button
            onClick={() => handleShare('email')}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <span className="text-gray-600">✉️</span> Email
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 last:rounded-b-lg flex items-center gap-2"
          >
            <span className="text-gray-600">📋</span> Copy
          </button>
        </div>
      )}
    </div>
  );
}
