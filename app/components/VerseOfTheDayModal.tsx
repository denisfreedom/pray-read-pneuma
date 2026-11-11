'use client';

import { Lora } from 'next/font/google';
import { useEffect, useState } from 'react';
import { X, Share2, Heart, BookOpen, Copy, Check, Sparkles } from 'lucide-react';
import { stripHtml } from '@/app/utils/stripHtml';

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

interface VerseData {
  book?: string | null;
  chapter?: number | null;
  verse?: number | null;
  text_english?: string | null;
  text_luganda?: string | null;
}

// ── Elegant palette ──────────────────────────────────────────────
const NAVY = '#10162e';
const NAVY_SOFT = '#1b2447';
const GOLD = '#c9a227';
const GOLD_DARK = '#a88420';
const IVORY = '#fdfbf4';
const PARCHMENT = '#f6efdd';
const INK = '#221c12';
const MUTED = '#6f6a5c';

function ErrorFallback() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 12, 30, 0.65)',
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
          background: `linear-gradient(160deg, ${IVORY} 0%, ${PARCHMENT} 100%)`,
          border: `1px solid ${GOLD}`,
          borderRadius: '28px',
          maxWidth: '480px',
          width: '100%',
          padding: '40px 32px',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(16, 22, 46, 0.06)',
            border: `1px solid rgba(201, 162, 39, 0.4)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} color={NAVY} />
        </button>
        <div style={{ fontSize: '26px', marginBottom: '8px' }}>✦</div>
        <h3 style={{ color: NAVY, fontSize: '21px', fontWeight: '700', marginBottom: '10px' }}>
          Verse Not Available
        </h3>
        <p style={{ color: MUTED, fontSize: '14px', lineHeight: '1.7' }}>
          We couldn&apos;t load today&apos;s verse. Please check back later — His Word is worth the wait.
        </p>
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
  const [copied, setCopied] = useState(false);

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
          const response = await fetch(`/api/verse-bookmarks?book=${encodeURIComponent(verse.book || '')}&chapter=${verse.chapter ?? 0}&verse=${verse.verse ?? 0}`);
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
        await fetch(`/api/verse-bookmarks?book=${encodeURIComponent(verse.book || '')}&chapter=${verse.chapter ?? 0}&verse=${verse.verse ?? 0}`, {
          method: 'DELETE',
        });
        setIsBookmarked(false);
      } else {
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

    const cleanVerseText = stripHtml(verse.text_english || '');
    const shareText = `"${cleanVerseText}" - ${verse.book} ${verse.chapter}:${verse.verse}`;
    const encodedText = encodeURIComponent(shareText);
    const appUrl = window.location.origin;
    const verseUrl = `${appUrl}/bible/${verse.book}/${verse.chapter}/${verse.verse}`;
    const encodedUrl = encodeURIComponent(verseUrl);

    const shareLinks: Record<string, string | null> = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      instagram: null, // Instagram requires app or manual copy
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else if (platform === 'instagram') {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Verse copied to clipboard! Open Instagram and paste it.');
      });
    } else if (shareLinks[platform]) {
      window.open(shareLinks[platform] as string, '_blank', 'width=600,height=400');
    }

    setShowShareMenu(false);
  };

  if (loading || !isOpen) return null;
  if (error) return <ErrorFallback />;

  if (!verse || !verse.book || verse.chapter === null || verse.chapter === undefined ||
      verse.verse === null || verse.verse === undefined) {
    return <ErrorFallback />;
  }

  const shareItems = [
    { name: 'WhatsApp', dot: '#25d366', platform: 'whatsapp' },
    { name: 'Telegram', dot: '#229ed9', platform: 'telegram' },
    { name: 'Facebook', dot: '#1877f2', platform: 'facebook' },
    { name: 'X (Twitter)', dot: '#000000', platform: 'x' },
    { name: 'LinkedIn', dot: '#0a66c2', platform: 'linkedin' },
    { name: 'Instagram', dot: '#d62976', platform: 'instagram' },
    { name: copied ? 'Copied!' : 'Copy verse', dot: GOLD, platform: 'copy' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 12, 30, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={() => setIsOpen(false)}
    >
      <style>{`
        @keyframes votd-rise {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes votd-glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          background: `linear-gradient(165deg, ${IVORY} 0%, ${PARCHMENT} 100%)`,
          border: `1px solid rgba(201, 162, 39, 0.65)`,
          outline: `1px solid rgba(201, 162, 39, 0.25)`,
          outlineOffset: '6px',
          borderRadius: '28px',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.4) inset',
          position: 'relative',
          animation: 'votd-rise 0.45s ease both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gold band */}
        <div
          style={{
            height: '6px',
            borderRadius: '28px 28px 0 0',
            background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 35%, #f3d67b 50%, ${GOLD} 65%, ${NAVY} 100%)`,
          }}
        />

        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(16, 22, 46, 0.06)',
            border: `1px solid rgba(201, 162, 39, 0.45)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 2,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 22, 46, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 22, 46, 0.06)'; }}
        >
          <X size={18} color={NAVY} />
        </button>

        <div style={{ padding: '36px 36px 30px', textAlign: 'center' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={16} color={GOLD_DARK} style={{ animation: 'votd-glow 2.4s ease-in-out infinite' }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: GOLD_DARK,
              }}
            >
              Verse of the Day
            </span>
            <Sparkles size={16} color={GOLD_DARK} style={{ animation: 'votd-glow 2.4s ease-in-out infinite' }} />
          </div>

          <p style={{ fontSize: '13px', color: MUTED, letterSpacing: '0.4px', marginBottom: '22px' }}>
            {todayLabel}
          </p>

          {/* Ornamental divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
            <div style={{ width: '8px', height: '8px', transform: 'rotate(45deg)', background: GOLD, flexShrink: 0 }} />
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
          </div>

          {/* Reference pill */}
          <div style={{ marginBottom: '22px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 22px',
                borderRadius: '999px',
                background: NAVY,
                color: '#f3d67b',
                fontSize: '14px',
                fontWeight: '700',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                boxShadow: '0 6px 18px rgba(16, 22, 46, 0.3)',
              }}
            >
              {verse.book} {verse.chapter}:{verse.verse}
            </span>
          </div>

          {/* Verse text */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '64px',
                lineHeight: '1',
                color: 'rgba(201, 162, 39, 0.35)',
                fontFamily: 'Georgia, serif',
                height: '36px',
              }}
            >
              &ldquo;
            </div>
            {verse.text_english && (
              <p
                className={lora.className}
                style={{
                  fontSize: '21px',
                  lineHeight: '1.85',
                  color: INK,
                  fontWeight: '500',
                  margin: '0 0 20px',
                }}
              >
                {stripHtml(verse.text_english)}
              </p>
            )}
            {verse.text_luganda && (
              <div
                style={{
                  borderTop: `1px dashed rgba(201, 162, 39, 0.5)`,
                  paddingTop: '18px',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: '700',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    color: GOLD_DARK,
                    border: `1px solid rgba(201, 162, 39, 0.5)`,
                    borderRadius: '999px',
                    padding: '4px 12px',
                    marginBottom: '12px',
                  }}
                >
                  Luganda
                </span>
                <p
                  className={lora.className}
                  style={{
                    fontSize: '17px',
                    lineHeight: '1.8',
                    color: MUTED,
                    fontStyle: 'italic',
                    fontWeight: '400',
                    margin: 0,
                  }}
                >
                  {stripHtml(verse.text_luganda)}
                </p>
              </div>
            )}
          </div>

          {/* Bottom divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '26px 0 24px' }}>
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
            <div style={{ fontSize: '13px', color: GOLD_DARK }}>✦</div>
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Bookmark */}
            <button
              onClick={handleBookmarkToggle}
              disabled={bookmarking}
              style={{
                padding: '11px 18px',
                background: isBookmarked ? `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)` : 'transparent',
                color: isBookmarked ? '#fff' : NAVY,
                border: `1px solid ${isBookmarked ? GOLD_DARK : 'rgba(16, 22, 46, 0.25)'}`,
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: bookmarking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.2s',
                opacity: bookmarking ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!bookmarking) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Heart size={15} fill={isBookmarked ? '#fff' : 'none'} />
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>

            {/* Share */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                style={{
                  padding: '11px 18px',
                  background: 'transparent',
                  color: NAVY,
                  border: '1px solid rgba(16, 22, 46, 0.25)',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Share2 size={15} />
                Share
              </button>

              {showShareMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '10px',
                    background: '#fffdf7',
                    border: `1px solid rgba(201, 162, 39, 0.5)`,
                    borderRadius: '16px',
                    boxShadow: '0 16px 40px rgba(16, 22, 46, 0.22)',
                    zIndex: 10000,
                    minWidth: '190px',
                    overflow: 'hidden',
                    padding: '6px',
                  }}
                >
                  {shareItems.map((item) => (
                    <button
                      key={item.platform}
                      onClick={() => handleShare(item.platform)}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: INK,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201, 162, 39, 0.12)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {item.platform === 'copy' ? (
                        copied ? <Check size={14} color={GOLD_DARK} /> : <Copy size={14} color={GOLD_DARK} />
                      ) : (
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                      )}
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Start Reading */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: '12px 26px',
                background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_SOFT} 55%, ${GOLD_DARK} 130%)`,
                color: '#f3d67b',
                border: `1px solid ${GOLD}`,
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(16, 22, 46, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 26px rgba(16, 22, 46, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 22, 46, 0.35)';
              }}
            >
              <BookOpen size={15} />
              Start Reading
            </button>
          </div>

          <p style={{ fontSize: '11px', color: MUTED, marginTop: '20px', letterSpacing: '0.6px' }}>
            A fresh verse appears once a day — come back tomorrow for the next one.
          </p>
        </div>
      </div>
    </div>
  );
}
