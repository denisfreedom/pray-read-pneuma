'use client';

import { Share2 } from 'lucide-react';
import { useState } from 'react';

interface VerseShareProps {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  isDark: boolean;
}

export default function VerseShare({ book, chapter, verse, text, isDark }: VerseShareProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareText = `${book} ${chapter}:${verse}\n\n"${text}"\n\nRead on Bible App`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${book} ${chapter}:${verse}`,
          text: shareText,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <button
      onClick={handleShare}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        color: isDark ? '#b8c4e0' : '#6b7280',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="Share verse"
    >
      <Share2 size={14} />
    </button>
  );
}
