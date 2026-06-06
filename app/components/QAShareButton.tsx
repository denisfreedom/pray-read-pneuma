'use client';

import { useState } from 'react';
import { Share2, Check, Mail, Copy, MessageCircle, Send, Heart, Music } from 'lucide-react';

interface QAShareButtonProps {
  question: string;
  answer: string;
  questionLu?: string;
  answerLu?: string;
  slug: string;
  lang: 'en' | 'lu' | 'both';
  topic: string;
}

// Strip HTML tags and convert to plain text
function stripHtmlToPlain(html: string): string {
  const NL = '\n';
  const BULLET = '\n• ';
  return html
    .replace(/<p[^>]*>/gi, NL)
    .replace(/<\/p>/gi, NL)
    .replace(/<br\s*\/?>/gi, NL)
    .replace(/<li[^>]*>/gi, BULLET)
    .replace(/<\/li>/gi, '')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (_m: string, g: string) => NL + g + NL)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Truncate text to approximately 25% (quarter) of the original length
function truncateToQuarter(text: string): string {
  const words = text.split(/\s+/);
  const quarterLength = Math.ceil(words.length / 4);
  const truncated = words.slice(0, quarterLength).join(' ');
  return truncated + (words.length > quarterLength ? '...' : '');
}

export default function QAShareButton({ question, answer, questionLu, answerLu, slug, lang, topic }: QAShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareText = () => {
    const plainAnswer = stripHtmlToPlain(answer);
    const plainAnswerLu = answerLu ? stripHtmlToPlain(answerLu) : '';
    
    const truncatedAnswer = truncateToQuarter(plainAnswer);
    const truncatedAnswerLu = plainAnswerLu ? truncateToQuarter(plainAnswerLu) : '';

    const deepLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/qa?q=${slug}`;
    const appTagline = "A Digital Sanctuary — A living Altar where the Word of God ceases to be mere text and becomes Spirit and Life in the daily experience of every believer.";

    let shareText = '';

    if (lang === 'both' && questionLu && truncatedAnswerLu) {
      // Both languages
      shareText = `📖 Biblical Q&A — ${topic}\n\n`;
      shareText += `🇬🇧 ENGLISH\n`;
      shareText += `❓ Question:\n${question}\n\n`;
      shareText += `💡 Answer:\n${truncatedAnswer}\n\n`;
      shareText += `━━━━━━━━━━━━━━━━\n\n`;
      shareText += `🇺🇬 LUGANDA\n`;
      shareText += `❓ Ekibuuzo:\n${questionLu}\n\n`;
      shareText += `💡 Okuddamu:\n${truncatedAnswerLu}\n\n`;
      shareText += `━━━━━━━━━━━━━━━━\n\n`;
      shareText += `📱 Read the full answer:\n${deepLink}\n\n`;
      shareText += `🙏 ${appTagline}`;
    } else if (lang === 'lu' && questionLu && truncatedAnswerLu) {
      // Luganda only
      shareText = `📖 Biblical Q&A — ${topic}\n\n`;
      shareText += `🇺🇬 LUGANDA\n`;
      shareText += `❓ Ekibuuzo:\n${questionLu}\n\n`;
      shareText += `💡 Okuddamu:\n${truncatedAnswerLu}\n\n`;
      shareText += `━━━━━━━━━━━━━━━━\n\n`;
      shareText += `📱 Soma okuddamu okujjuvu:\n${deepLink}\n\n`;
      shareText += `🙏 ${appTagline}`;
    } else {
      // English only (default)
      shareText = `📖 Biblical Q&A — ${topic}\n\n`;
      shareText += `🇬🇧 ENGLISH\n`;
      shareText += `❓ Question:\n${question}\n\n`;
      shareText += `💡 Answer:\n${truncatedAnswer}\n\n`;
      shareText += `━━━━━━━━━━━━━━━━\n\n`;
      shareText += `📱 Read the full answer:\n${deepLink}\n\n`;
      shareText += `🙏 ${appTagline}`;
    }

    return shareText;
  };

  // Try to open native app, fall back to web if not installed
  const tryNativeAppOrFallback = (nativeUrl: string, webUrl: string) => {
    // Create a hidden iframe to attempt opening the native app
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    let appOpened = false;
    
    // Set up a timer to detect if app didn't open
    const timer = setTimeout(() => {
      if (!appOpened) {
        // App not installed, open web URL
        window.open(webUrl, '_blank');
      }
      document.body.removeChild(iframe);
    }, 2000);
    
    // Try to open the native app
    iframe.src = nativeUrl;
    
    // If page loses focus, assume app opened
    window.addEventListener('blur', () => {
      appOpened = true;
      clearTimeout(timer);
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 100);
    }, { once: true });
  };

  const shareViaWhatsApp = () => {
    const text = generateShareText();
    const nativeUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    tryNativeAppOrFallback(nativeUrl, webUrl);
    setShowMenu(false);
  };

  const shareViaTelegram = () => {
    const text = generateShareText();
    // Use tg://msg?text= for native Telegram app
    const nativeUrl = `tg://msg?text=${encodeURIComponent(text)}`;
    const webUrl = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
    
    tryNativeAppOrFallback(nativeUrl, webUrl);
    setShowMenu(false);
  };

  const shareViaEmail = () => {
    const text = generateShareText();
    const subject = `Biblical Q&A: ${question}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.location.href = url;
    setShowMenu(false);
  };

  const copyToClipboard = async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaFacebook = () => {
    const deepLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/qa?q=${slug}`;
    const text = generateShareText();
    
    // Try native Facebook app first
    const nativeUrl = `fb://facewebmodal/f?href=${encodeURIComponent(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLink)}&quote=${encodeURIComponent(text)}`)}`;
    const webUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLink)}&quote=${encodeURIComponent(`📖 ${question} | Biblical Q&A`)}`;
    
    tryNativeAppOrFallback(nativeUrl, webUrl);
    setShowMenu(false);
  };

  const shareViaInstagram = () => {
    const text = generateShareText();
    
    // Copy text to clipboard first
    navigator.clipboard.writeText(text).then(() => {
      // Try to open Instagram app
      const nativeUrl = 'instagram://camera';
      const webUrl = 'https://www.instagram.com/';
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      let appOpened = false;
      
      const timer = setTimeout(() => {
        if (!appOpened) {
          // App not installed, show alert and open web
          alert('Text copied! Open Instagram and paste in a story or post caption.');
          window.open(webUrl, '_blank');
        }
        document.body.removeChild(iframe);
      }, 2000);
      
      iframe.src = nativeUrl;
      
      window.addEventListener('blur', () => {
        appOpened = true;
        clearTimeout(timer);
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 100);
      }, { once: true });
    }).catch(() => {
      alert('Could not copy text. Please copy manually.');
    });
    
    setShowMenu(false);
  };

  const shareViaTikTok = () => {
    const text = generateShareText();
    
    // Copy text to clipboard first
    navigator.clipboard.writeText(text).then(() => {
      // Try to open TikTok app
      const nativeUrl = 'tiktok://';
      const webUrl = 'https://www.tiktok.com/';
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      let appOpened = false;
      
      const timer = setTimeout(() => {
        if (!appOpened) {
          // App not installed, show alert and open web
          alert('Text copied! Open TikTok and paste in a video caption or comment.');
          window.open(webUrl, '_blank');
        }
        document.body.removeChild(iframe);
      }, 2000);
      
      iframe.src = nativeUrl;
      
      window.addEventListener('blur', () => {
        appOpened = true;
        clearTimeout(timer);
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 100);
      }, { once: true });
    }).catch(() => {
      alert('Could not copy text. Please copy manually.');
    });
    
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-amber-400 hover:border-amber-400/40 transition-all text-xs font-medium"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share Q&A
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Share menu */}
          <div
            className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50"
            style={{
              background: 'linear-gradient(160deg, #1c1a2e 0%, #14213e 50%, #0d2a50 100%)',
            }}
          >
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-white text-sm font-semibold">Share Biblical Q&A</p>
              <p className="text-white/40 text-xs mt-0.5">Choose a platform</p>
            </div>

            <div className="p-2">
              {/* WhatsApp */}
              <button
                onClick={shareViaWhatsApp}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 group-hover:bg-green-500/30 transition-all">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-white text-sm font-medium">WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={shareViaTelegram}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/30 transition-all">
                  <Send className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-white text-sm font-medium">Telegram</span>
              </button>

              {/* Facebook */}
              <button
                onClick={shareViaFacebook}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600/30 transition-all">
                  <Share2 className="w-4 h-4 text-blue-300" />
                </div>
                <span className="text-white text-sm font-medium">Facebook</span>
              </button>

              {/* Instagram */}
              <button
                onClick={shareViaInstagram}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0 group-hover:bg-pink-500/30 transition-all">
                  <Heart className="w-4 h-4 text-pink-400" />
                </div>
                <span className="text-white text-sm font-medium">Instagram</span>
              </button>

              {/* TikTok */}
              <button
                onClick={shareViaTikTok}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center shrink-0 group-hover:bg-black/40 transition-all">
                  <Music className="w-4 h-4 text-white/70" />
                </div>
                <span className="text-white text-sm font-medium">TikTok</span>
              </button>

              {/* Email */}
              <button
                onClick={shareViaEmail}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/30 transition-all">
                  <Mail className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-white text-sm font-medium">Email</span>
              </button>

              {/* Copy to clipboard */}
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/30 transition-all">
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <span className="text-white text-sm font-medium">
                  {copied ? 'Copied!' : 'Copy Text'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
