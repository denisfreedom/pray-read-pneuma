'use client';

import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { stripHtml } from '@/app/utils/stripHtml';

interface VerseShareButtonProps {
  bookName: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  verseText: string;
  prayerText?: string;
  className?: string;
}

export default function VerseShareButton({
  bookName,
  bookNumber,
  chapter,
  verse,
  verseText,
  prayerText,
  className = ''
}: VerseShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Strip HTML from verse text before sharing
  const cleanVerseText = stripHtml(verseText);
  const cleanPrayerText = prayerText ? stripHtml(prayerText) : '';
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/bible-reader/${bookNumber}/${chapter}?verse=${verse}`;
  
  // Detect if both languages are present (when text contains double newlines as separator)
  const hasBothLanguages = cleanVerseText.includes('\n\n') && cleanPrayerText.includes('\n\n');
  
  let formattedShareText = '';
  if (hasBothLanguages) {
    // Split verse and prayer into English and Luganda parts
    const [englishVerse, lugandaVerse] = cleanVerseText.split('\n\n');
    const [englishPrayer, lugandaPrayer] = cleanPrayerText.split('\n\n');
    
    // Format: English verse + English prayer, then Luganda verse + Luganda prayer
    formattedShareText = `${bookName} ${chapter}:${verse}

📖 ENGLISH
"${englishVerse}"

🙏 Prayer:
${englishPrayer}

━━━━━━━━━━━━━━━━

📖 LUGANDA
"${lugandaVerse}"

🙏 Okusaba:
${lugandaPrayer}

${shareUrl}`;
  } else {
    // Single language format
    formattedShareText = cleanPrayerText
      ? `${bookName} ${chapter}:${verse}

"${cleanVerseText}"

🙏 Prayer:
${cleanPrayerText}

${shareUrl}`
      : `${bookName} ${chapter}:${verse}

"${cleanVerseText}"

${shareUrl}`;
  }
  
  const shareText = formattedShareText;

  const handleShare = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'telegram' | 'email' | 'copy') => {
    // For social media, build combined text (verse + prayer if available)
    let combinedText = '';
    
    if (hasBothLanguages && cleanPrayerText) {
      const [englishVerse, lugandaVerse] = cleanVerseText.split('\n\n');
      const [englishPrayer, lugandaPrayer] = cleanPrayerText.split('\n\n');
      
      combinedText = `📖 ENGLISH
"${englishVerse}"

🙏 Prayer:
${englishPrayer}

━━━━━━━━━━━━━━━━

📖 LUGANDA
"${lugandaVerse}"

🙏 Okusaba:
${lugandaPrayer}`;
    } else {
      combinedText = cleanPrayerText 
        ? `${cleanVerseText}

🙏 Prayer: ${cleanPrayerText}`
        : cleanVerseText;
    }
    
    // Only truncate for Twitter (280 char limit), keep full text for other platforms
    const truncatedText = combinedText.length > 280 ? combinedText.substring(0, 277) + '...' : combinedText;
    const referenceText = `${bookName} ${chapter}:${verse}`;

    let url = '';

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareText);
        alert(cleanPrayerText ? 'Verse & Prayer copied to clipboard!' : 'Verse copied to clipboard!');
        setShowShareMenu(false);
        return;
      } catch {
        console.error('Failed to copy');
        return;
      }
    }

    switch (platform) {
      case 'facebook':
        // Facebook supports long text - use full combined text
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(combinedText)}%20-%20${referenceText}`;
        break;
      case 'twitter':
        // Twitter has 280 char limit - use truncated text
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(truncatedText)}%20(${referenceText})&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        // WhatsApp supports long text - use organized format
        url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        break;
      case 'telegram':
        // Telegram supports long text - use organized format
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(combinedText)}`;
        break;
      case 'email':
        // Email supports long text - use organized format
        const emailBody = `${combinedText}

${referenceText}
${shareUrl}`;
        url = `mailto:?subject=Scripture Verse: ${referenceText}&body=${encodeURIComponent(emailBody)}`;
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
