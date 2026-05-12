'use client';

import { Lora } from 'next/font/google';
import { useEffect, useState } from 'react';
import { X, Share2, MessageCircle, Heart } from 'lucide-react';

const lora = Lora({
  subsets: ['latin'],
  weight: ['300', '400'],
  display: 'swap',
});

interface VerseData {
  book?: string | null;
  chapter?: number | null;
  verse?: number | null;
  text_english?: string | null;
  text_luganda?: string | null;
}

function ErrorFallback() {
  const [isOpen, setIsOpen] = useState(true);
  
  if (!isOpen) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 30, 46, 0.95) 0%, rgba(20, 20, 36, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '24px',
          maxWidth: '500px',
          width: '100%',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          position: 'relative',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <X size={20} color="#a78bfa" />
        </button>
        <h3 style={{ color: '#a78bfa', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Verse Not Available</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', lineHeight: '1.6' }}>We couldn't load today's verse. Please check back later.</p>
      </div>
    </div>
  );
}

export default function VerseOfTheDayModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      const lastShown = localStorage?.getItem?.('votd-last-shown');
      const today = new Date().toDateString();

      if (lastShown !== today) {
        fetch('/api/verse-of-the-day')
          .then((res) => {
            if (!res?.ok) throw new Error('Failed to fetch');
            return res.json();
          })
          .then((data) => {
            if (data?.verse && typeof data.verse === 'object') {
              // Validate verse data has required fields
              if (data.verse.book && data.verse.chapter !== null && data.verse.chapter !== undefined && 
                  data.verse.verse !== null && data.verse.verse !== undefined) {
                setVerse(data.verse);
                setIsOpen(true);
                localStorage?.setItem?.('votd-last-shown', today);
              } else {
                setError(true);
              }
            } else {
              setError(true);
            }
          })
          .catch(() => {
            setError(true);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
      setError(true);
    }
  }, []);

  // Check if verse is bookmarked
  useEffect(() => {
    if (isOpen && verse && verse.book && verse.chapter !== null && verse.verse !== null) {
      const checkBookmark = async () => {
        try {
          const response = await fetch(`/api/verse-bookmarks?book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}&verse=${verse.verse}`);
          if (response.ok) {
            const data = await response.json();
            setIsBookmarked(data.bookmarked || false);
          }
        } catch (error) {
          console.error('Failed to check bookmark:', error);
        }
      };
      checkBookmark();
    }
  }, [isOpen, verse]);

  // Handle bookmark toggle
  const handleBookmarkToggle = async () => {
    if (!verse || !verse.book || verse.chapter === null || verse.verse === null) return;
    
    setBookmarking(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        await fetch(`/api/verse-bookmarks?book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}&verse=${verse.verse}`, {
          method: 'DELETE',
        });
        setIsBookmarked(false);
      } else {
        // Add bookmark
        await fetch('/api/verse-bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book: verse.book,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verse.text_english,
          }),
        });
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    } finally {
      setBookmarking(false);
    }
  };

  // Handle social sharing
  const handleShare = (platform: string) => {
    if (!verse || typeof window === 'undefined') return;
    
    const shareText = `"${verse.text_english}" - ${verse.book} ${verse.chapter}:${verse.verse}`;
    const encodedText = encodeURIComponent(shareText);
    const appUrl = window.location.origin;
    const verseUrl = `${appUrl}/bible/${verse.book}/${verse.chapter}/${verse.verse}`;
    const encodedUrl = encodeURIComponent(verseUrl);
    
    const shareLinks = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      instagram: null, // Instagram requires app or manual copy
    };
    
    if (platform === 'instagram') {
      // Copy to clipboard for Instagram
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Verse copied to clipboard! Open Instagram and paste it.');
      });
    } else if (shareLinks[platform as keyof typeof shareLinks]) {
      window.open(shareLinks[platform as keyof typeof shareLinks], '_blank', 'width=600,height=400');
    }
    
    setShowShareMenu(false);
  };

  if (loading || !isOpen) return null;
  if (error) return <ErrorFallback />;
  
  // Additional null safety checks
  if (!verse || !verse.book || verse.chapter === null || verse.chapter === undefined || 
      verse.verse === null || verse.verse === undefined) {
    return <ErrorFallback />;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 255, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '24px',
          maxWidth: '600px',
          width: '100%',
          padding: '32px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
          }}
        >
          <X size={20} color="#7c3aed" />
        </button>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #7c3aed 0%, #f59e0b 50%, #7c3aed 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
            }}
          >
            ✨ Verse of the Day
          </h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
            {verse.book || 'Unknown'} {verse.chapter ?? '?'}:{verse.verse ?? '?'}
          </p>
        </div>

        {/* Verse text */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(245, 158, 11, 0.06) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            padding: '24px',
            borderRadius: '16px',
            borderLeft: '4px solid #7c3aed',
            marginBottom: '24px',
          }}
        >
          {verse.text_english && (
            <p
              className={lora.className}
              style={{
                fontSize: '18px',
                lineHeight: '1.8',
                color: '#1f2937',
                marginBottom: '16px',
                fontWeight: '300',
              }}
            >
              {verse.text_english}
            </p>
          )}
          {verse.text_luganda && (
            <p
              className={lora.className}
              style={{
                fontSize: '16px',
                lineHeight: '1.7',
                color: '#6b7280',
                fontWeight: '300',
              }}
            >
              {verse.text_luganda}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            disabled={bookmarking}
            style={{
              padding: '10px 16px',
              background: isBookmarked ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(139, 92, 246, 0.1)',
              color: isBookmarked ? 'white' : '#7c3aed',
              border: isBookmarked ? 'none' : '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: bookmarking ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              opacity: bookmarking ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!bookmarking) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Heart size={16} fill={isBookmarked ? 'white' : 'none'} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>

          {/* Share Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              style={{
                padding: '10px 16px',
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#7c3aed',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Share2 size={16} />
              Share
            </button>

            {/* Share Menu */}
            {showShareMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'white',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                  zIndex: 10000,
                  minWidth: '160px',
                  overflow: 'hidden',
                }}
              >
                {[
                  { name: 'WhatsApp', icon: '💬', platform: 'whatsapp' },
                  { name: 'Telegram', icon: '✈️', platform: 'telegram' },
                  { name: 'Facebook', icon: 'f', platform: 'facebook' },
                  { name: 'LinkedIn', icon: '📋', platform: 'linkedin' },
                  { name: 'Instagram', icon: '📷', platform: 'instagram' },
                ].map((item) => (
                  <button
                    key={item.platform}
                    onClick={() => handleShare(item.platform)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1f2937',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Start Reading Button */}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 58, 237, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.25)';
            }}
          >
            Start Reading
          </button>
        </div>
      </div>
    </div>
  );
}
