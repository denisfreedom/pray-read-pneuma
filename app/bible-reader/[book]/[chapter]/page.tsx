'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { ChevronLeft, ChevronRight, Bookmark, Share2, MessageCircle, Copy, Heart, Menu, X, Underline, Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import VersePrayerDisplay from '@/app/components/VersePrayerDisplay';
import CrossReferenceModal from '@/app/components/CrossReferenceModal';
import TheologicalInsightsModal from '@/app/components/TheologicalInsightsModal';
import { useScripturePopup, ScriptureVersePopup, ScriptureContext } from '@/components/ScriptureVersePopup';
import HighlightableText from '@/app/components/HighlightableText';
import AudioPlayer from '@/app/components/AudioPlayer';
import VerseShareButton from '@/app/components/VerseShareButton';
import { stripHtml } from '@/app/utils/stripHtml';
import { useFontSizeStore, getTextSizeClasses } from '@/app/store/fontSizeStore';
import {
  saveChapterVerses,
  saveChapterContent,
  saveCommentary,
  savePrayer,
  saveBooks,
  getChapterVerses,
  getChapterContent,
  getBooks,
} from '@/app/utils/offlineStorage';

// Add glitter animation styles
const glitterStyle = `
  @keyframes glitter {
    0%, 100% { opacity: 1; filter: drop-shadow(0 0 2px rgba(168, 85, 247, 0.5)); }
    50% { opacity: 0.7; filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.8)); }
  }
  .glitter-heart {
    animation: glitter 1.5s infinite;
  }
  .text-highlight-yellow { background-color: rgba(253, 224, 71, 0.6) !important; border-radius: 2px; }
  .text-highlight-green { background-color: rgba(134, 239, 172, 0.6) !important; border-radius: 2px; }
  .text-highlight-blue { background-color: rgba(147, 197, 253, 0.6) !important; border-radius: 2px; }
  .text-highlight-pink { background-color: rgba(249, 168, 212, 0.6) !important; border-radius: 2px; }
  .text-highlight-orange { background-color: rgba(253, 186, 116, 0.6) !important; border-radius: 2px; }
  .text-underline { text-decoration: underline !important; text-decoration-color: #f97316 !important; text-underline-offset: 3px; }
  /* Ensure verse text is selectable on mobile */
  [data-verse] { -webkit-user-select: text; user-select: text; }
  [data-verse] p { -webkit-user-select: text; user-select: text; cursor: text; }
`;

interface Verse {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  text_english: string;
  text_luganda: string;
}

interface Book {
  id: number;
  book_number: number;
  name_english: string;
  name_luganda: string;
  testament: string;
  total_chapters: number;
}

interface Prayer {
  english_prayer: string;
  luganda_prayer: string;
}

interface Commentary {
  commentary_text: string;
  luganda_commentary_text: string;
}

interface CrossRef {
  target_book_id: number;
  target_chapter: number;
  target_verse: number;
}

interface ChapterIntroduction {
  en_introduction?: string;
  lu_introduction?: string;
  en_prayer?: string;
  lu_prayer?: string;
}

function ChapterContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookNumber = parseInt(params.book as string);
  const chapterNum = parseInt(params.chapter as string);

  // Reading plan context (passed via query params from /reading-plans/[id])
  const planId = searchParams.get('planId');
  const dayNumber = parseInt(searchParams.get('dayNumber') || '0') || null;
  const targetVerse = parseInt(searchParams.get('verse') || '0') || null;

  const [book, setBook] = useState<Book | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [prayers, setPrayers] = useState<Record<string, Prayer>>({});
  const [commentaries, setCommentaries] = useState<Record<string, Commentary>>({});
  const [crossRefs, setCrossRefs] = useState<Record<string, CrossRef[]>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedTabs, setExpandedTabs] = useState<Record<string, string>>({});
  const [expandedPrayers, setExpandedPrayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [servedFromCache, setServedFromCache] = useState(false);
  const [language, setLanguage] = useState<'english' | 'luganda' | 'both'>('english');
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSizeStore();
  const textSizes = getTextSizeClasses(fontSize);
  // Use refs instead of state so handleTouchEnd always reads the latest values synchronously
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [shareMessage, setShareMessage] = useState<string>('');
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [chapterIntroduction, setChapterIntroduction] = useState<ChapterIntroduction | null>(null);
  const [chapterPrayers, setChapterPrayers] = useState<any>(null);
  const [activeSidePanelTab, setActiveSidePanelTab] = useState<string>('intro');
  const [activeTab, setActiveTab] = useState<'intro' | 'prayer' | 'verses'>('verses');
  const [chapterLanguage, setChapterLanguage] = useState<'english' | 'luganda' | 'both'>('english');
  const [crossRefModalOpen, setCrossRefModalOpen] = useState(false);
  const [selectedVerseForCrossRef, setSelectedVerseForCrossRef] = useState<{ verse: number; bookName: string } | null>(null);
  const [theologicalInsightsModalOpen, setTheologicalInsightsModalOpen] = useState(false);
  const [theologicalInsightsMode, setTheologicalInsightsMode] = useState<'chapter' | 'verse'>('chapter');
  const [theologicalInsightsVerse, setTheologicalInsightsVerse] = useState<number | undefined>(undefined);
  const { popup: scripturePopup, openVerse: openScriptureVerse, closePopup: closeScripturePopup } = useScripturePopup();

  // Reading plan navigation state
  interface PlanDay { id: number; day_number: number; book: string; book_number: number | null; start_chapter: number; end_chapter: number; }
  const [planDays, setPlanDays] = useState<PlanDay[]>([]);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [dayCompleted, setDayCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Highlight toolbar state
  const [highlightToolbar, setHighlightToolbar] = useState<{ x: number; y: number; text: string; range: Range | null } | null>(null);
  const highlightToolbarRef = useRef<HTMLDivElement>(null);
  // Saved highlights loaded from DB
  const [savedHighlights, setSavedHighlights] = useState<any[]>([]);
  // Track if user is selecting text (to prevent swipe nav on mobile)
  const selectionActiveRef = useRef(false);

  // Shared handler: show toolbar after any text selection (mouse OR touch)
  const checkSelection = useCallback(() => {
    if (highlightToolbarRef.current && document.activeElement && highlightToolbarRef.current.contains(document.activeElement)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim().length < 2) {
      selectionActiveRef.current = false;
      setHighlightToolbar(null);
      return;
    }

    selectionActiveRef.current = true;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Use viewport-relative positioning with fixed, so toolbar always stays visible
    // Position above selection center, clamped to screen edges
    const viewportWidth = window.innerWidth;
    const rawX = rect.left + rect.width / 2;
    const clampedX = Math.max(80, Math.min(rawX, viewportWidth - 80));
    const rawY = rect.top - 8; // above selection
    const clampedY = rawY < 60 ? rect.bottom + 8 : rawY; // if too close to top, put below

    setHighlightToolbar({
      x: clampedX,
      y: clampedY,
      text: selection.toString().trim(),
      range: range.cloneRange(),
    });
  }, []);

  // Handle text selection for highlight toolbar — mouse
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (highlightToolbarRef.current?.contains(e.target as Node)) return;
    setTimeout(checkSelection, 10);
  }, [checkSelection]);

  // Listen for selectionchange (fires on mobile after touch-drag selection)
  useEffect(() => {
    // Load saved preferences from localStorage
    try {
      const savedLanguage = localStorage.getItem('bibleLanguage') as 'english' | 'luganda' | 'both' | null;
      const savedTheme = localStorage.getItem('bibleTheme') as 'light' | 'sepia' | 'dark' | null;
      if (savedLanguage) setLanguage(savedLanguage);
      if (savedTheme) setTheme(savedTheme);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }

    // Get user email for highlights
    const email = localStorage.getItem('userEmail');
    setUserEmail(email || undefined);
  }, []);

  // Helper: find verse number from a DOM node by walking up to [data-verse]
  const getVerseFromNode = (node: Node): { verseNumber: number; sectionType: string } | null => {
    let el: HTMLElement | null = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    while (el) {
      const v = el.getAttribute('data-verse');
      const s = el.getAttribute('data-section') || 'verse';
      if (v) return { verseNumber: parseInt(v), sectionType: s };
      el = el.parentElement;
    }
    return null;
  };

  // Helper: character offset of a node within its [data-verse] container
  const getOffsetInContainer = (node: Node, offset: number): number => {
    let el: HTMLElement | null = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    // Walk up to find the verse container
    let container: HTMLElement | null = null;
    let cur: HTMLElement | null = el;
    while (cur) {
      if (cur.getAttribute('data-verse')) { container = cur; break; }
      cur = cur.parentElement;
    }
    if (!container) return offset;
    // Count text offset from start of container to current node
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let total = 0;
    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      if (textNode === node) return total + offset;
      total += (textNode.textContent || '').length;
    }
    return total + offset;
  };

  // Save highlight to DB and apply span in DOM
  const saveAndApplyHighlight = useCallback(async (color: string, isUnderline: boolean) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Determine verse info from the anchor node
    let verseInfo = getVerseFromNode(range.startContainer);

    // Fallback: if selection started outside a [data-verse], try end container
    if (!verseInfo) verseInfo = getVerseFromNode(range.endContainer);

    // Last resort: find the closest [data-verse] element on the page
    if (!verseInfo && verses.length > 0) {
      verseInfo = { verseNumber: verses[0].verse, sectionType: 'verse' };
    }

    const startOff = getOffsetInContainer(range.startContainer, range.startOffset);
    const endOff = startOff + selectedText.length;

    // Apply visual span immediately
    try {
      const span = document.createElement('span');
      span.className = isUnderline ? 'text-underline' : `text-highlight-${color}`;
      span.setAttribute('data-saved-highlight', 'pending');
      range.surroundContents(span);
      selection.removeAllRanges();
      selectionActiveRef.current = false;

      // Build a local highlight object immediately (before DB responds)
      const localHighlight = {
        id: `local_${Date.now()}`,
        book_id: book?.id,
        chapter: chapterNum,
        verse_number: verseInfo?.verseNumber ?? 1,
        start_offset: startOff,
        end_offset: endOff,
        highlight_color: isUnderline ? 'underline' : color,
        text_content: selectedText,
        user_email: userEmail || null,
        is_underline: isUnderline,
        section_type: verseInfo?.sectionType ?? 'verse',
      };

      // Save to localStorage immediately so it persists on return
      if (book) {
        setSavedHighlights(prev => {
          const updated = [...prev, localHighlight];
          saveHighlightsToCache(book.id, chapterNum, userEmail || null, updated);
          return updated;
        });
      }

      // Save to DB — always save even if not logged in (userEmail = null)
      if (book) {
        fetch('/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            chapter: chapterNum,
            verseNumber: verseInfo?.verseNumber ?? 1,
            startOffset: startOff,
            endOffset: endOff,
            highlightColor: isUnderline ? 'underline' : color,
            textContent: selectedText,
            userEmail: userEmail || null,
            isUnderline,
            sectionType: verseInfo?.sectionType ?? 'verse',
          }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.success && data.highlight?.id) {
              span.setAttribute('data-saved-highlight', String(data.highlight.id));
              // Replace the local entry with the real DB entry and update cache
              setSavedHighlights(prev => {
                const updated = prev.map(h => h.id === localHighlight.id ? data.highlight : h);
                if (book) saveHighlightsToCache(book.id, chapterNum, userEmail || null, updated);
                return updated;
              });
            }
          })
          .catch(() => {});
      }
    } catch {
      selection.removeAllRanges();
      selectionActiveRef.current = false;
    }
    setHighlightToolbar(null);
  }, [book, chapterNum, userEmail, verses]);

  const applyHighlight = useCallback((color: string) => {
    saveAndApplyHighlight(color, false);
  }, [saveAndApplyHighlight]);

  const applyUnderline = useCallback(() => {
    saveAndApplyHighlight('underline', true);
  }, [saveAndApplyHighlight]);

  // Close toolbar on click/tap outside
  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (highlightToolbar && !highlightToolbarRef.current?.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          selectionActiveRef.current = false;
          setHighlightToolbar(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick as EventListener);
    };
  }, [highlightToolbar]);

  // Re-apply saved highlights to DOM whenever they load or verses re-render
  const applyHighlightsToDom = useCallback((highlights: any[]) => {
    if (highlights.length === 0) return;
    highlights.forEach(h => {
      // Skip if already applied
      if (document.querySelector(`[data-saved-highlight="${h.id}"]`)) return;

      // Find the verse container — try data-verse attribute
      const container = document.querySelector(`[data-verse="${h.verse_number}"]`);
      if (!container) return;

      const fullText = container.textContent || '';
      const start = h.start_offset;
      const end = h.end_offset;
      if (start < 0 || end > fullText.length || start >= end) return;

      // Walk text nodes to find the right position
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let offset = 0;
      let startNode: Text | null = null;
      let startNodeOff = 0;
      let endNode: Text | null = null;
      let endNodeOff = 0;

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const len = node.textContent?.length || 0;
        if (!startNode && offset + len > start) {
          startNode = node;
          startNodeOff = start - offset;
        }
        if (!endNode && offset + len >= end) {
          endNode = node;
          endNodeOff = end - offset;
          break;
        }
        offset += len;
      }

      if (!startNode || !endNode) return;

      try {
        const range = document.createRange();
        range.setStart(startNode, startNodeOff);
        range.setEnd(endNode, endNodeOff);
        const span = document.createElement('span');
        span.setAttribute('data-saved-highlight', String(h.id));
        span.className = h.is_underline ? 'text-underline' : `text-highlight-${h.highlight_color}`;
        range.surroundContents(span);
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (savedHighlights.length === 0 || verses.length === 0) return;

    // Apply immediately after verses render, with retries for slow DOM
    const tryApply = (attempts: number) => {
      applyHighlightsToDom(savedHighlights);
      // Check if any were missed and retry
      const missingCount = savedHighlights.filter(h => !document.querySelector(`[data-saved-highlight="${h.id}"]`)).length;
      if (missingCount > 0 && attempts > 0) {
        setTimeout(() => tryApply(attempts - 1), 300);
      }
    };

    const timer = setTimeout(() => tryApply(3), 150);
    return () => clearTimeout(timer);
  }, [savedHighlights, verses, applyHighlightsToDom]);

  // Scroll to target verse from verse-of-the-day link
  useEffect(() => {
    if (!targetVerse || loading || verses.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`verse-${targetVerse}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-orange-500', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-2'), 3000);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [targetVerse, loading, verses]);

  // Offline detection
  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  // Load reading plan context when planId is in URL
  useEffect(() => {
    if (!planId) return;
    fetch(`/api/reading-plans/${planId}`)
      .then(r => r.json())
      .then(data => {
        if (data.plan) setPlanTitle(data.plan.title);
        if (data.days) setPlanDays(data.days);
      })
      .catch(() => {});

    // Check if this day is already completed
    if (dayNumber) {
      const email = localStorage.getItem('userEmail') || 'guest@example.com';
      fetch(`/api/reading-progress?email=${email}&planId=${planId}`)
        .then(r => r.json())
        .then(data => {
          const prog = (data.progress || []).find((p: any) => p.day_number === dayNumber);
          if (prog?.completed) setDayCompleted(true);
        })
        .catch(() => {});
    }
  }, [planId, dayNumber]);

  // Mark the current day complete
  const markDayComplete = async () => {
    if (!planId || !dayNumber || dayCompleted || markingComplete) return;
    setMarkingComplete(true);
    const email = localStorage.getItem('userEmail') || 'guest@example.com';
    try {
      await fetch('/api/reading-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, planId: parseInt(planId), dayNumber, completed: true }),
      });
      setDayCompleted(true);
    } catch {}
    setMarkingComplete(false);
  };

  // ── Highlight localStorage helpers ────────────────────────────────────────
  const getHighlightCacheKey = (bookId: number, chap: number, email: string | null) =>
    `highlights_${bookId}_${chap}_${email || 'guest'}`;

  const saveHighlightsToCache = (bookId: number, chap: number, email: string | null, highlights: any[]) => {
    try {
      const key = getHighlightCacheKey(bookId, chap, email);
      localStorage.setItem(key, JSON.stringify({ highlights, savedAt: Date.now() }));
    } catch {}
  };

  const loadHighlightsFromCache = (bookId: number, chap: number, email: string | null): any[] | null => {
    try {
      const key = getHighlightCacheKey(bookId, chap, email);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Cache valid for 90 days
      if (Date.now() - parsed.savedAt > 90 * 24 * 60 * 60 * 1000) return null;
      return Array.isArray(parsed.highlights) ? parsed.highlights : null;
    } catch { return null; }
  };

  // Track reading time
  const readingStartTimeRef = useRef<number>(Date.now());

  // Cache helpers
  const getCacheKey = (bookNum: number, chap: number) => `bibleCache_${bookNum}_${chap}`;

  const saveToCache = (bookNum: number, chap: number, bookObj: Book, versesList: Verse[]) => {
    try {
      localStorage.setItem(getCacheKey(bookNum, chap), JSON.stringify({ book: bookObj, verses: versesList, cachedAt: Date.now() }));
    } catch {}
  };

  const loadFromCache = (bookNum: number, chap: number): { book: Book; verses: Verse[] } | null => {
    try {
      const raw = localStorage.getItem(getCacheKey(bookNum, chap));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Cache valid for 30 days
      if (Date.now() - parsed.cachedAt > 30 * 24 * 60 * 60 * 1000) return null;
      return { book: parsed.book, verses: parsed.verses };
    } catch { return null; }
  };

  // Font size is now handled by the global store
  // No need for local localStorage logic here

  // Record reading activity when user leaves the page
  useEffect(() => {
    if (!book || !userEmail) return;

    const recordReadingActivity = () => {
      const durationSeconds = Math.floor((Date.now() - readingStartTimeRef.current) / 1000);
      
      // Only record if they spent at least 5 seconds on the page
      if (durationSeconds >= 5) {
        fetch('/api/user-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail,
            bookId: book.id,
            chapter: chapterNum,
            durationSeconds,
          }),
        }).catch(() => {}); // Silent fail
      }
    };

    // Record on page unload
    window.addEventListener('beforeunload', recordReadingActivity);
    
    return () => {
      window.removeEventListener('beforeunload', recordReadingActivity);
      recordReadingActivity(); // Also record when component unmounts (navigation)
    };
  }, [book, userEmail, chapterNum]);



  useEffect(() => {
    if (!bookNumber || !chapterNum) return;

    let cancelled = false;

    // ── PHASE 1: Critical path — book + verses only ──────────────────────────
    const fetchPrimary = async () => {
      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          const cached = loadFromCache(bookNumber, chapterNum);
          if (cached && cached.verses.length > 0) {
            setBook(cached.book);
            setVerses(cached.verses);
            setServedFromCache(true);
            setLoading(false);
          } else {
            // Auto-retry once before showing error
            fetch(`/api/bible-verses?book=${bookNumber}&chapter=${chapterNum}`)
              .then(r => r.json())
              .then(data => {
                const vList = Array.isArray(data.verses) ? data.verses : [];
                if (!cancelled && vList.length > 0) {
                  window.location.reload();
                } else if (!cancelled) {
                  setLoadError('slow');
                  setLoading(false);
                }
              })
              .catch(() => {
                if (!cancelled) { setLoadError('slow'); setLoading(false); }
              });
          }
        }
      }, 5000);

      try {
        // Session (fire-and-forget — don't block verses)
        fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
          .then(r => r.json())
          .then(sessionData => {
            if (cancelled) return;
            if (sessionData.success && sessionData.user?.email) {
              setUserEmail(sessionData.user.email);
              fetch('/api/activity-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: sessionData.user.email, activity_type: 'book_visit', book_id: bookNumber, chapter: chapterNum })
              }).catch(() => {});
            }
          }).catch(() => {});

        // Load localStorage immediately (no network needed)
        if (typeof window !== 'undefined') {
          const savedBookmarks = localStorage.getItem('bibleBookmarks');
          if (savedBookmarks) setBookmarks(new Set(JSON.parse(savedBookmarks)));
          const savedNotes = localStorage.getItem('bibleNotes');
          if (savedNotes) setNotes(JSON.parse(savedNotes));
        }

        // Fetch book + verses in parallel
        // Use `book=` (book_number path) NOT `bookId=` (raw id path) so the API resolves book_number → book_id correctly
        console.log(`📚 [Chapter] Phase 1: fetching book=${bookNumber} chapter=${chapterNum}`);
        const [bookRes, versesRes] = await Promise.all([
          fetch(`/api/bible-books?id=${bookNumber}`),
          fetch(`/api/bible-verses?book=${bookNumber}&chapter=${chapterNum}`)
        ]);

        console.log(`📚 Book API: ${bookRes.status} | Verses API: ${versesRes.status}`);
        const [bookData, versesData] = await Promise.all([bookRes.json(), versesRes.json()]);
        console.log(`📚 Book response:`, bookData);
        console.log(`📖 Verses response (count):`, Array.isArray(versesData.verses) ? versesData.verses.length : Array.isArray(versesData) ? versesData.length : 0);

        if (cancelled) return;

        if (!bookData.success || !bookData.book) {
          console.warn(`⚠️ No book found for book_number=${bookNumber}`);
          setLoading(false);
          return;
        }

        const bookObj: Book = {
          id: bookData.book.id,
          book_number: bookData.book.book_number,
          name_english: bookData.book.name_english,
          name_luganda: bookData.book.name_luganda,
          testament: bookData.book.testament,
          total_chapters: bookData.book.chapters || bookData.book.total_chapters
        };
        setBook(bookObj);

        const versesList: Verse[] = Array.isArray(versesData.verses) ? versesData.verses : (Array.isArray(versesData) ? versesData : []);
        console.log(`✅ [Chapter] ${versesList.length} verses loaded for ${bookObj.name_english} ch.${chapterNum}`);
        setVerses(versesList);

        // ── Cache to localStorage for offline use ─────────────────────────
        if (versesList.length > 0) {
          saveToCache(bookNumber, chapterNum, bookObj, versesList);
        }

        // ── Cache to IndexedDB for robust offline PWA support ─────────────
        try {
          if (versesList.length > 0) {
            await saveChapterVerses(bookNumber, chapterNum, versesList);
            await saveChapterContent(bookObj.id, chapterNum, {
              verses: versesList,
              book: bookObj,
            });
          }
        } catch (err) {
          console.warn('⚠️ Failed to cache to IndexedDB:', err);
        }

        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false); // ← verses visible now

        // ── PHASE 2: Secondary data — deferred after verses render ─────────
        setTimeout(() => {
          if (cancelled) return;
          fetchSecondary(bookObj, versesList);
        }, 100);

        // ── Load saved highlights — localStorage first, then DB sync ──────────
        (() => {
          if (cancelled) return;

          // Step 1: Load from localStorage immediately (instant, no network)
          // Try both guest and any email we might already know
          const guestCached = loadHighlightsFromCache(bookObj.id, chapterNum, null);
          const emailCached = userEmail ? loadHighlightsFromCache(bookObj.id, chapterNum, userEmail) : null;
          const cachedHighlights = emailCached || guestCached;
          if (cachedHighlights && cachedHighlights.length > 0 && !cancelled) {
            setSavedHighlights(cachedHighlights);
          }

          // Step 2: Sync from DB in background (no delay needed, runs after verses render)
          setTimeout(async () => {
            if (cancelled) return;
            try {
              // Get definitive email from session
              let email: string | null = userEmail || null;
              if (!email) {
                try {
                  const sessionRes = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
                  const sessionData = await sessionRes.json();
                  email = sessionData?.user?.email || null;
                } catch {}
              }

              // Fetch from DB — merge guest highlights + user highlights
              const urls = [`/api/highlights?bookId=${bookObj.id}&chapter=${chapterNum}`];
              if (email) urls.push(`/api/highlights?bookId=${bookObj.id}&chapter=${chapterNum}&userEmail=${encodeURIComponent(email)}`);

              const results = await Promise.all(urls.map(u => fetch(u).then(r => r.json()).catch(() => ({ highlights: [] }))));
              
              if (!cancelled) {
                // Merge both result sets, deduplicate by id
                const allHighlights: any[] = [];
                const seen = new Set<string | number>();
                results.forEach(r => {
                  if (r.success && Array.isArray(r.highlights)) {
                    r.highlights.forEach((h: any) => {
                      if (!seen.has(h.id)) { seen.add(h.id); allHighlights.push(h); }
                    });
                  }
                });

                if (allHighlights.length > 0) {
                  setSavedHighlights(allHighlights);
                  // Update localStorage cache with fresh DB data
                  saveHighlightsToCache(bookObj.id, chapterNum, email, allHighlights);
                }
              }
            } catch {}
          }, 300);
        })();

      } catch (error) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.warn('⚠️ [Chapter] Primary fetch error, trying cache:', error);
          // ── Fallback: serve from localStorage cache ────────────────────
          const cached = loadFromCache(bookNumber, chapterNum);
          if (cached && cached.verses.length > 0) {
            setBook(cached.book);
            setVerses(cached.verses);
            setServedFromCache(true);
            setLoading(false);
          } else {
            setLoadError(`Failed to load chapter data. Please connect to the internet and try again.`);
            setLoading(false);
          }
        }
      }
    };

    // ── PHASE 2: Non-critical features ──────────────────────────────────────
    const fetchSecondary = async (bookObj: Book, versesList: Verse[]) => {
      if (!cancelled) setSecondaryLoading(true);
      try {
        // Fetch prayers, commentaries, intro, chapter prayers in parallel
        const [prayersRes, comRes, introRes, chapterPrayersRes] = await Promise.all([
          fetch(`/api/verse-prayers?book_number=${bookNumber}&chapter=${chapterNum}`),
          fetch(`/api/verse-commentaries?book_number=${bookNumber}&chapter=${chapterNum}`),
          fetch(`/api/chapter-introductions?bookId=${bookObj.id}&chapter=${chapterNum}`),
          fetch(`/api/chapter-prayers?bookId=${bookObj.id}&chapter=${chapterNum}`)
        ]);

        if (cancelled) return;

        const [prayersData, comData, introData, chapterPrayersData] = await Promise.all([
          prayersRes.json(), comRes.json(), introRes.json(), chapterPrayersRes.json()
        ]);

        console.log(`🙏 Prayers: ${Array.isArray(prayersData) ? prayersData.length : 0} | Commentary: ${Array.isArray(comData) ? comData.length : 0}`);
        console.log(`📕 Chapter intro:`, introData);
        console.log(`🙏 Chapter prayers:`, chapterPrayersData);

        if (cancelled) return;

        if (Array.isArray(prayersData)) {
          const map: Record<string, Prayer> = {};
          prayersData.forEach(p => { map[`${p.verse_number}`] = p; });
          setPrayers(map);
          
          // Cache prayers to IndexedDB
          try {
            for (const prayer of prayersData) {
              await savePrayer(bookObj.id, chapterNum, prayer);
            }
          } catch (err) {
            console.warn('⚠️ Failed to cache prayers:', err);
          }
        }
        if (Array.isArray(comData)) {
          const map: Record<string, Commentary> = {};
          comData.forEach(c => { map[`${c.verse_number}`] = c; });
          setCommentaries(map);
          
          // Cache commentaries to IndexedDB
          try {
            for (const commentary of comData) {
              await saveCommentary(bookObj.id, chapterNum, commentary);
            }
          } catch (err) {
            console.warn('⚠️ Failed to cache commentaries:', err);
          }
        }
        if (introData) setChapterIntroduction(introData);
        if (chapterPrayersData) setChapterPrayers(chapterPrayersData);

        // Cross-refs: fetch all verses in parallel (not sequential loop)
        if (versesList.length > 0) {
          const crossResults = await Promise.allSettled(
            versesList.map(v =>
              fetch(`/api/cross-references?source_book_number=${bookNumber}&source_chapter=${chapterNum}&source_verse=${v.verse}`)
                .then(r => r.json())
                .then(data => ({ verse: v.verse, data }))
            )
          );
          if (!cancelled) {
            const crossMap: Record<string, CrossRef[]> = {};
            crossResults.forEach(result => {
              if (result.status === 'fulfilled' && Array.isArray(result.value.data) && result.value.data.length > 0) {
                crossMap[`${result.value.verse}`] = result.value.data.map((c: any) => ({
                  target_book_id: c.target_book_id,
                  target_chapter: c.target_chapter,
                  target_verse: c.target_verse
                }));
              }
            });
            setCrossRefs(crossMap);
          }
        }
      } catch (err) {
        console.warn('⚠️ [Chapter] Secondary fetch error (non-critical):', err);
      } finally {
        if (!cancelled) setSecondaryLoading(false);
      }
    };

    fetchPrimary();
    return () => { cancelled = true; };
  }, [bookNumber, chapterNum]);

  const toggleBookmark = (verseKey: string) => {
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(verseKey)) {
      newBookmarks.delete(verseKey);
    } else {
      newBookmarks.add(verseKey);
    }
    setBookmarks(newBookmarks);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bibleBookmarks', JSON.stringify(Array.from(newBookmarks)));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't initiate swipe tracking if a button/link/input was touched
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, [role="button"]')) return;
    if (!loading && verses.length > 0) {
      touchStartRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
        t: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    // Don't trigger swipe if the user is selecting text
    if (selectionActiveRef.current) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return;
    // Don't trigger if touch originated on a button/link
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, [role="button"]')) return;

    if (!start || loading || verses.length === 0) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const elapsed = Date.now() - start.t;

    const dx = start.x - endX;           // positive = left swipe (next)
    const dy = start.y - endY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Reject taps (< 10px movement) and long presses (> 600ms — user is selecting)
    if (absDx < 10 && absDy < 10) return;
    if (elapsed > 600) return;

    // Require a clearly horizontal gesture:
    // • at least 80px horizontal travel
    // • horizontal component at least 2.5× the vertical component
    // • vertical drift under 60px (rules out diagonal scrolls)
    const isHorizontalSwipe =
      absDx >= 80 &&
      absDx > absDy * 2.5 &&
      absDy < 60;

    if (!isHorizontalSwipe) return;

    if (dx > 0 && nextChapter) {
      window.location.href = `/bible-reader/${bookNumber}/${nextChapter}${planId ? `?planId=${planId}&dayNumber=${dayNumber}` : ''}`;
    } else if (dx < 0 && prevChapter) {
      window.location.href = `/bible-reader/${bookNumber}/${prevChapter}${planId ? `?planId=${planId}&dayNumber=${dayNumber}` : ''}`;
    }
  };

  // No-op — kept so nothing referencing it breaks
  const handleSwipe = () => {};

  const toggleTab = (verseKey: string, tabName: string) => {
    const key = `${verseKey}-tab`;
    setExpandedTabs((prev) => ({
      ...prev,
      [key]: prev[key] === tabName ? '' : tabName,
    }));
  };

  const saveNote = (verseKey: string, noteText: string) => {
    const newNotes = { ...notes };
    newNotes[verseKey] = noteText;
    setNotes(newNotes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bibleNotes', JSON.stringify(newNotes));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => console.error('Copy failed:', err));
  };

  const togglePrayerExpanded = (verseKey: string) => {
    const newPrayers = new Set(expandedPrayers);
    if (newPrayers.has(verseKey)) {
      newPrayers.delete(verseKey);
    } else {
      newPrayers.add(verseKey);
    }
    setExpandedPrayers(newPrayers);
  };

  const cycleLanguage = () => {
    const languages: Array<'english' | 'luganda' | 'both'> = ['english', 'luganda', 'both'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  };

  const cycleChapterLanguage = () => {
    const languages: Array<'english' | 'luganda' | 'both'> = ['english', 'luganda', 'both'];
    const currentIndex = languages.indexOf(chapterLanguage);
    const nextIndex = (currentIndex + 1) % languages.length;
    setChapterLanguage(languages[nextIndex]);
  };

  // Strip --tw-* CSS vars and other junk from stored HTML before display
  const cleanHtml = (raw: string): string => {
    if (!raw) return raw;
    if (!raw.includes('--tw-') && !raw.includes('<!--') && !raw.includes('background-color') && !raw.includes('text-shadow')) return raw;
    if (typeof window === 'undefined') return raw.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/gi, '');
      const safe = new Set(['font-family','font-size','font-weight','font-style','color','text-decoration','text-decoration-line']);
      const w = document.createTreeWalker(tmp, NodeFilter.SHOW_ELEMENT, null, false as any);
      let n = w.nextNode();
      while (n) {
        const el = n as Element;
        if (el.hasAttribute('style')) {
          const clean = (el.getAttribute('style') || '').split(';').map(s => s.trim()).filter(s => {
            if (!s) return false; const p = s.split(':')[0].trim().toLowerCase(); return !p.startsWith('--') && safe.has(p);
          }).join('; ');
          clean ? el.setAttribute('style', clean) : el.removeAttribute('style');
        }
        n = w.nextNode();
      }
      return tmp.innerHTML;
    } catch { return raw; }
  };



  // Render HTML with optional highlightable wrapper
  const renderHtml = (content: string | null | undefined, sectionKey?: string) => {
    if (!content) return null;
    const cleaned = cleanHtml(content);
    const ctx: ScriptureContext | undefined = book
      ? { book: book.name_english, bookNumber: book.book_number, chapter: chapterNum }
      : undefined;
    if (sectionKey) return (
      <HighlightableText
        sectionKey={sectionKey}
        html={cleaned}
        className="leading-relaxed text-sm"
        userEmail={userEmail}
        scriptureContext={ctx}
        onVerseClick={openScriptureVerse}
      />
    );
    return <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: cleaned }} />;
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'sepia' | 'dark'> = ['light', 'sepia', 'dark'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const shareVerse = (verse: Verse) => {
    // Get verse text based on language setting
    const rawVerseText = language === 'english' ? verse.text_english : language === 'luganda' ? verse.text_luganda : `${verse.text_english}

${verse.text_luganda}`;
    // Strip HTML tags before sharing
    const cleanVerseText = stripHtml(rawVerseText);
    const shareText = `${book?.name_english} ${chapterNum}:${verse.verse}

"${cleanVerseText}"

Read more on Bible App`;
    
    if (navigator.share) {
      navigator.share({
        title: `${book?.name_english} ${chapterNum}:${verse.verse}`,
        text: shareText,
      }).catch((err) => console.error('Share failed:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      setShareMessage('Verse copied to clipboard!');
      setTimeout(() => setShareMessage(''), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        {/* Skeleton header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="text-center">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1 mx-auto" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mx-auto" />
          </div>
          <div className="flex gap-1">
            {[1,2,3,4].map(i => <div key={i} className="h-9 w-9 bg-gray-200 rounded animate-pulse" />)}
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          {/* Skeleton book title */}
          <div className="mb-8 pb-6 border-b-2 border-orange-200">
            <div className="h-5 w-28 bg-orange-100 rounded-full animate-pulse mb-3" />
            <div className="h-14 w-64 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
          {/* Skeleton verses */}
          <div className="space-y-6">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 shadow p-4">
                <div className="flex gap-3 mb-4">
                  <div className="h-5 w-5 bg-orange-200 rounded animate-pulse flex-shrink-0 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full" style={{ animationDelay: `${i * 60}ms` }} />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" style={{ animationDelay: `${i * 60 + 30}ms` }} />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" style={{ animationDelay: `${i * 60 + 60}ms` }} />
                  </div>
                </div>
                <div className="border-t pt-3 flex gap-2">
                  {[1,2,3,4,5].map(j => <div key={j} className="h-7 w-16 bg-gray-100 rounded animate-pulse" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-gray-800 text-lg font-semibold mb-2">Chapter couldn't load</p>
          <p className="text-gray-500 text-sm mb-6">Please check your connection and try again.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setLoadError(null); setLoading(true); window.location.reload(); }}
              className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              🔄 Refresh Page
            </button>
            <Link href="/bible-reader" className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              ← Back to Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg font-semibold">❌ Book not found</p>
          <p className="text-gray-500 text-sm mt-2">Book #{bookNumber} does not exist in the database.</p>
          <Link href="/bible-reader" className="text-orange-600 hover:text-orange-800 mt-4 inline-block">
            ← Back to Bible Reader
          </Link>
        </div>
      </div>
    );
  }

  if (verses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg font-semibold">❌ Chapter not found</p>
          <p className="text-gray-500 text-sm mt-2">No verses available for {book.name_english} chapter {chapterNum}.</p>
          <p className="text-gray-500 text-xs mt-2">This book may not have been uploaded yet. Check back soon!</p>
          <Link href={`/bible-reader/${bookNumber}`} className="text-orange-600 hover:text-orange-800 mt-4 inline-block">
            ← Back to {book.name_english}
          </Link>
        </div>
      </div>
    );
  }

  const isOldTestament = book.testament === 'Old Testament';
  const nextChapter = chapterNum < book.total_chapters ? chapterNum + 1 : null;
  const prevChapter = chapterNum > 1 ? chapterNum - 1 : null;

  const getBackgroundClass = () => {
    if (theme === 'sepia') return 'bg-blue-50';
    if (theme === 'dark') return 'bg-gray-900';
    return isOldTestament ? 'bg-gradient-to-b from-orange-50 to-white' : 'bg-gradient-to-b from-blue-50 to-white';
  };

  return (
    <div 
      className={`min-h-screen ${getBackgroundClass()}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
      style={{ '--bible-font-size': fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px' } as React.CSSProperties}
    >
      <style>{glitterStyle}</style>

      {/* Secondary loading progress bar */}
      {secondaryLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-orange-100 overflow-hidden">
          <div className="h-full bg-orange-500 animate-pulse" style={{ width: '60%', animation: 'loadbar 1.5s ease-in-out infinite' }} />
        </div>
      )}
      <style>{`@keyframes loadbar { 0% { width:10%; margin-left:0 } 50% { width:60%; margin-left:20% } 100% { width:10%; margin-left:90% } }`}</style>

      {/* Offline / Cached banner */}
      {(isOffline || servedFromCache) && (
        <div className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium ${
          isOffline ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'
        }`}>
          {isOffline ? (
            <><span>📴</span> You are offline — showing cached content</>
          ) : (
            <><span>✅</span> Loaded from offline cache — <button className="underline opacity-80" onClick={() => window.location.reload()}>Refresh</button> to get latest</>
          )}
        </div>
      )}

      {/* Floating Highlight Toolbar — fixed so it stays visible on mobile */}
      {highlightToolbar && (
        <div
          ref={highlightToolbarRef}
          style={{
            position: 'fixed',
            left: `${highlightToolbar.x}px`,
            top: `${highlightToolbar.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
          className="flex items-center gap-1 bg-gray-900 text-white rounded-xl shadow-2xl px-2 py-1.5 border border-gray-700"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => { e.stopPropagation(); touchStartRef.current = null; }}
        >
          {/* Highlight colors */}
          {[
            { color: 'yellow', bg: 'bg-yellow-300', label: 'Yellow highlight' },
            { color: 'green', bg: 'bg-green-300', label: 'Green highlight' },
            { color: 'blue', bg: 'bg-blue-300', label: 'Blue highlight' },
            { color: 'pink', bg: 'bg-pink-300', label: 'Pink highlight' },
            { color: 'orange', bg: 'bg-orange-300', label: 'Orange highlight' },
          ].map(({ color, bg, label }) => (
            <button
              key={color}
              onClick={() => applyHighlight(color)}
              title={label}
              className={`w-6 h-6 rounded-full ${bg} hover:scale-110 transition-transform border-2 border-white/30`}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-gray-600 mx-0.5" />

          {/* Underline */}
          <button
            onClick={applyUnderline}
            title="Underline"
            className="p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <Underline className="h-4 w-4 text-orange-400" />
          </button>

          {/* Dismiss */}
          <button
            onClick={() => { window.getSelection()?.removeAllRanges(); setHighlightToolbar(null); }}
            title="Dismiss"
            className="p-1 rounded hover:bg-gray-700 transition-colors ml-0.5"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header Navigation */}
        <div className={`sticky top-0 border-b p-2 sm:p-4 md:p-6 flex items-center justify-between z-10 gap-1 ${
          theme === 'sepia' ? 'bg-blue-100 border-blue-300' : theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <Link
            href={`/bible-reader/${bookNumber}`}
            className={`inline-flex items-center transition-colors flex-shrink-0 text-sm ${
              theme === 'dark' ? 'text-gray-400 hover:text-orange-400' : 'text-gray-600 hover:text-orange-600'
            }`}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline text-xs sm:text-sm">Back</span>
          </Link>

          <div className="text-center flex-1 min-w-0 px-1">
            <h2 className={`text-sm sm:text-lg font-bold truncate ${
              theme === 'dark' ? 'text-gray-100' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-800'
            }`}>
              {book.name_english} {chapterNum}
            </h2>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : 'text-gray-500'
            }`}>
              Ch {chapterNum} of {book.total_chapters}
            </p>
          </div>

          {/* Language & Theme & Font Size Toggle Buttons - Icons Only */}
          <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 flex-shrink-0">
            {/* Language Toggle */}
            <button
              onClick={cycleLanguage}
              title={`Language: ${language} | Click to cycle`}
              className={`p-2 rounded text-base transition-colors ${
                language === 'english' ? 'bg-orange-600 text-white' :
                language === 'luganda' ? 'bg-blue-600 text-white' :
                theme === 'dark' ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white'
              }`}
            >
              {language === 'english' ? '🇬🇧' : language === 'luganda' ? '🇺🇬' : '🔀'}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={cycleTheme}
              title={`Theme: ${theme} | Click to cycle`}
              className={`p-2 rounded text-base transition-colors ${
                theme === 'light' ? 'bg-yellow-400 text-gray-900' :
                theme === 'sepia' ? 'bg-blue-600 text-white' :
                'bg-indigo-700 text-white'
              }`}
            >
              {theme === 'light' ? '☀️' : theme === 'sepia' ? '📄' : '🌙'}
            </button>

            {/* Font Size Controls */}
            <button
              onClick={decreaseFontSize}
              title="Decrease font size"
              className={`p-2 rounded text-base transition-colors ${
                theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
              }`}
            >
              <Minus size={18} />
            </button>
            <button
              onClick={increaseFontSize}
              title="Increase font size"
              className={`p-2 rounded text-base transition-colors ${
                theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
              }`}
            >
              <Plus size={18} />
            </button>

            {/* Books */}
            <button
              onClick={() => router.push('/bible-reader')}
              className="p-2 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors text-base"
              title="Books"
            >
              📚
            </button>

            {/* Chapter Theological Insights */}
            <button
              onClick={() => { setTheologicalInsightsMode('chapter'); setTheologicalInsightsVerse(undefined); setTheologicalInsightsModalOpen(true); }}
              className={`p-2 rounded text-base transition-colors ${
                theme === 'dark' ? 'bg-purple-700 text-white hover:bg-purple-800' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              title="Chapter Theological Insights"
            >
              💡
            </button>

            {/* Info / Side Panel */}
            <button
              onClick={() => setShowSidePanel(!showSidePanel)}
              className={`p-2 rounded transition-colors ${
                theme === 'dark' ? 'bg-indigo-700 text-white hover:bg-indigo-800' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title="Chapter Info"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className={`p-4 md:p-6 flex-1 ${planId ? 'mb-52 md:mb-36' : 'mb-20'} ${showSidePanel ? 'md:pr-0' : ''}`}>
            {/* Book and Chapter Header */}
            <div className={`mb-8 pb-6 border-b-2 ${
              theme === 'dark' ? 'border-gray-700' : theme === 'sepia' ? 'border-blue-300' : (isOldTestament ? 'border-orange-200' : 'border-blue-200')
            }`}>
              <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-3 ${
                theme === 'dark' ? 'text-indigo-300 bg-indigo-900' : theme === 'sepia' ? 'text-blue-700 bg-blue-100' : (isOldTestament ? 'text-orange-600 bg-orange-100' : 'text-blue-600 bg-blue-100')
              }`}>
                {book.testament}
              </div>
              <h1 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-100' : theme === 'sepia' ? 'text-blue-900' : (isOldTestament ? 'text-orange-900' : 'text-blue-900')
              }`}>
                {book.name_english}
              </h1>
              <p className={`text-xl font-semibold mb-1 ${
                theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-800' : (isOldTestament ? 'text-orange-700' : 'text-blue-700')
              }`}>
                Chapter {chapterNum}
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : 'text-gray-600'
              }`}>{book.name_luganda}</p>
            </div>

            {/* Verses */}
            <div className="space-y-6">
              {verses.map((verse) => {
                const verseKey = `${book.id}-${chapterNum}-${verse.verse}`;
                const isBookmarked = bookmarks.has(verseKey);
                const activeTab = expandedTabs[`${verseKey}-tab`] || '';

                return (
                  <div
                    key={verse.id}
                    id={`verse-${verse.verse}`}
                    className={`rounded-lg shadow hover:shadow-md transition-shadow p-4 border ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'sepia' ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-100'
                    }`}
                  >
                    {/* Verse Text */}
                    <div className="mb-4">
                      <div className="flex items-start gap-3">
                        <span className={`font-bold ${textSizes.verse} flex-shrink-0 ${
                          theme === 'dark' ? 'text-orange-400' : theme === 'sepia' ? 'text-blue-700' : 'text-orange-600'
                        }`}>{verse.verse}</span>
                        <div className="flex-1" data-verse={verse.verse} data-section="verse">
                          {language === 'both' ? (
                            <div className="space-y-3">
                              <div>
                                <p className={`${textSizes.label} font-semibold mb-1 ${
                                  theme === 'dark' ? 'text-orange-400' : theme === 'sepia' ? 'text-blue-700' : 'text-orange-600'
                                }`}>ENGLISH</p>
                                <p className={`leading-relaxed ${textSizes.verse} ${
                                  theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-800'
                                }`}>{stripHtml(verse.text_english)}</p>
                              </div>
                              <div className={`border-t pt-3 ${
                                theme === 'dark' ? 'border-gray-600' : theme === 'sepia' ? 'border-blue-300' : 'border-gray-200'
                              }`}>
                                <p className={`${textSizes.label} font-semibold mb-1 ${
                                  theme === 'dark' ? 'text-blue-400' : theme === 'sepia' ? 'text-blue-700' : 'text-blue-600'
                                }`}>LUGANDA</p>
                                <p className={`leading-relaxed ${textSizes.verse} ${
                                  theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-800'
                                }`}>{stripHtml(verse.text_luganda || verse.text_english)}</p>
                              </div>
                            </div>
                          ) : (
                            <p className={`leading-relaxed ${textSizes.verse} ${
                              theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-800'
                            }`}>
                              {stripHtml(language === 'english' ? verse.text_english : verse.text_luganda || verse.text_english)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(language === 'english' ? verse.text_english : language === 'luganda' ? verse.text_luganda : `${verse.text_english}\
\
${verse.text_luganda}`)}
                          className={`transition-colors flex-shrink-0 ${
                            theme === 'dark' ? 'text-gray-500 hover:text-orange-400' : theme === 'sepia' ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-orange-600'
                          }`}
                          title="Copy verse"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Verse Action Buttons */}
                    <div className={`border-t pt-4 ${
                      theme === 'dark' ? 'border-gray-600' : theme === 'sepia' ? 'border-blue-300' : 'border-gray-100'
                    }`}>
                      {/* Desktop View - Full Labels */}
                      <div className="hidden md:flex flex-wrap gap-2 mb-4">
                        {/* Prayer Button */}
                        <button
                          onClick={() => togglePrayerExpanded(verseKey)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all inline-flex items-center gap-1 ${
                            expandedPrayers.has(verseKey)
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-400'
                              : prayers[verse.verse]
                                ? `bg-purple-100 text-purple-700 hover:bg-purple-200 border-2 border-purple-400 ${theme === 'dark' ? 'bg-purple-900 text-purple-200 border-purple-600' : ''}`
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          }`}
                          disabled={!prayers[verse.verse]}
                          title={prayers[verse.verse] ? 'View prayer for this verse' : 'No prayer available'}
                        >
                          <Heart className={`h-4 w-4 ${prayers[verse.verse] && !expandedPrayers.has(verseKey) ? 'glitter-heart fill-purple-700' : expandedPrayers.has(verseKey) ? 'fill-current' : ''}`} />
                          Prayer
                        </button>

                        {/* Share Button - Social Media */}
                        <VerseShareButton
                          bookName={book.name_english}
                          chapter={chapterNum}
                          verse={verse.verse}
                          verseText={language === 'english' ? verse.text_english : language === 'luganda' ? verse.text_luganda : `${verse.text_english}\
\
${verse.text_luganda}`}
                        />

                        <button
                          onClick={() => {
                            setSelectedVerseForCrossRef({ verse: verse.verse, bookName: book?.name_english || '' });
                            setCrossRefModalOpen(true);
                          }}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            selectedVerseForCrossRef?.verse === verse.verse && crossRefModalOpen
                              ? 'bg-orange-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          🔗 Cross-Ref
                        </button>
                        <button
                          onClick={() => toggleTab(verseKey, 'commentary')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            activeTab === 'commentary'
                              ? 'bg-orange-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          📖 Commentary
                        </button>
                        <button
                          onClick={() => toggleTab(verseKey, 'notes')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            activeTab === 'notes'
                              ? 'bg-orange-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          📝 Notes
                        </button>
                        {/* Verse Theological Insights */}
                        <button
                          onClick={() => { setTheologicalInsightsMode('verse'); setTheologicalInsightsVerse(verse.verse); setTheologicalInsightsModalOpen(true); }}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            theme === 'dark' ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : theme === 'sepia' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                          title="Verse Theological Insight"
                        >
                          💡 Insight
                        </button>
                        <button
                          onClick={() => toggleBookmark(verseKey)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ml-auto ${
                            isBookmarked
                              ? 'bg-blue-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Bookmark className="h-4 w-4 inline mr-1" />
                          Bookmark
                        </button>
                      </div>

                      {/* Mobile View - Icons Only */}
                      <div className="md:hidden flex flex-wrap gap-2 mb-4">
                        {/* Prayer Button */}
                        <button
                          onClick={() => togglePrayerExpanded(verseKey)}
                          className={`p-2 rounded transition-all ${
                            expandedPrayers.has(verseKey)
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-400'
                              : prayers[verse.verse]
                                ? `bg-purple-100 text-purple-700 hover:bg-purple-200 ${theme === 'dark' ? 'bg-purple-900 text-purple-200' : ''}`
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          }`}
                          disabled={!prayers[verse.verse]}
                          title="Prayer"
                        >
                          <Heart className={`h-5 w-5 ${prayers[verse.verse] && !expandedPrayers.has(verseKey) ? 'glitter-heart fill-purple-700' : expandedPrayers.has(verseKey) ? 'fill-current' : ''}`} />
                        </button>

                        {/* Share Button - Mobile Compact */}
                        <div className="p-1.5" title="Share verse">
                          <VerseShareButton
                            bookName={book.name_english}
                            chapter={chapterNum}
                            verse={verse.verse}
                            verseText={language === 'english' ? verse.text_english : language === 'luganda' ? verse.text_luganda : `${verse.text_english}\
\
${verse.text_luganda}`}
                            className="text-sm px-2 py-1"
                          />
                        </div>

                        {/* Cross-Ref Button */}
                        <button
                          onClick={() => {
                            setSelectedVerseForCrossRef({ verse: verse.verse, bookName: book?.name_english || '' });
                            setCrossRefModalOpen(true);
                          }}
                          className={`p-2 rounded transition-colors text-lg ${
                            selectedVerseForCrossRef?.verse === verse.verse && crossRefModalOpen
                              ? 'bg-orange-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Cross-Ref"
                        >
                          🔗
                        </button>

                        {/* Commentary Button */}
                        <button
                          onClick={() => toggleTab(verseKey, 'commentary')}
                          className={`p-2 rounded transition-colors text-lg ${
                            activeTab === 'commentary'
                              ? 'bg-orange-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Commentary"
                        >
                          📖
                        </button>

                        {/* Notes Button */}
                        <button
                          onClick={() => toggleTab(verseKey, 'notes')}
                          className={`p-2 rounded transition-colors text-lg ${
                            activeTab === 'notes'
                              ? 'bg-orange-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Notes"
                        >
                          📝
                        </button>

                        {/* Verse Theological Insight Button (mobile) */}
                        <button
                          onClick={() => { setTheologicalInsightsMode('verse'); setTheologicalInsightsVerse(verse.verse); setTheologicalInsightsModalOpen(true); }}
                          className={`p-2 rounded transition-colors text-lg ${
                            theme === 'dark' ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : theme === 'sepia' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                          title="Verse Insight"
                        >
                          💡
                        </button>

                        {/* Bookmark Button */}
                        <button
                          onClick={() => toggleBookmark(verseKey)}
                          className={`p-2 rounded transition-colors ml-auto ${
                            isBookmarked
                              ? 'bg-blue-600 text-white'
                              : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Bookmark"
                        >
                          <Bookmark className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Prayer Display (Expanded) */}
                      {expandedPrayers.has(verseKey) && prayers[verse.verse] && (
                        <div data-verse={verse.verse} data-section="prayer" className={`mb-4 rounded-lg p-4 border space-y-3 animate-in fade-in duration-200 ${
                          theme === 'dark' ? 'bg-purple-900 border-purple-700' : theme === 'sepia' ? 'bg-blue-50 border-blue-300' : 'bg-purple-50 border-purple-200'
                        }`}>
                          {language === 'both' ? (
                            <>
                              {prayers[verse.verse].english_prayer && (
                                <div>
                                  <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
                                    theme === 'dark' ? 'text-purple-300' : theme === 'sepia' ? 'text-purple-700' : 'text-purple-700'
                                  }`}>Prayer - English</p>
                                  <div className={`leading-relaxed ${
                                    theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-700'
                                  }`}>{renderHtml(prayers[verse.verse].english_prayer)}</div>
                                </div>
                              )}
                              {prayers[verse.verse].luganda_prayer && (
                                <div className={prayers[verse.verse].english_prayer ? `border-t pt-3 ${theme === 'dark' ? 'border-purple-700' : theme === 'sepia' ? 'border-blue-300' : 'border-purple-200'}` : ''}>
                                  <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
                                    theme === 'dark' ? 'text-blue-300' : theme === 'sepia' ? 'text-blue-700' : 'text-blue-700'
                                  }`}>Prayer - Luganda</p>
                                  <div className={`leading-relaxed ${
                                    theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-700'
                                  }`}>{renderHtml(prayers[verse.verse].luganda_prayer)}</div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div>
                              <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
                                theme === 'dark' ? 'text-purple-300' : theme === 'sepia' ? 'text-purple-700' : 'text-purple-700'
                              }`}>{language === 'english' ? 'Prayer - English' : 'Prayer - Luganda'}</p>
                              <div className={`leading-relaxed ${
                                theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-700'
                              }`}>
                                {renderHtml(language === 'english'
                                  ? prayers[verse.verse].english_prayer
                                  : prayers[verse.verse].luganda_prayer || prayers[verse.verse].english_prayer)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Share Message */}
                      {shareMessage && (
                        <div className={`mb-4 p-3 rounded text-sm font-medium animate-in fade-in duration-200 ${
                          theme === 'dark' ? 'bg-green-900 text-green-200' : theme === 'sepia' ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-700'
                        }`}>
                          ✓ {shareMessage}
                        </div>
                      )}

                      {/* Tab Content */}
                      {activeTab === 'cross' && crossRefs[verse.verse] && (
                        <div className={`rounded p-4 mb-4 ${
                          theme === 'dark' ? 'bg-purple-900' : theme === 'sepia' ? 'bg-blue-50' : 'bg-purple-50'
                        }`}>
                          <p className={`text-xs font-semibold mb-3 uppercase tracking-wide ${
                            theme === 'dark' ? 'text-purple-300' : theme === 'sepia' ? 'text-purple-700' : 'text-purple-700'
                          }`}>Related Passages</p>
                          <div className="flex flex-wrap gap-2">
                            {crossRefs[verse.verse].map((ref: any, idx) => {
                              // Use target_book_id as book_number for navigation
                              const bookNumber = ref.target_book_id;
                              const verseRef = `${ref.target_chapter}:${ref.target_verse}`;
                              
                              return (
                                <Link
                                  key={idx}
                                  href={`/bible-reader/${bookNumber}/${ref.target_chapter}`}
                                  className={`inline-block px-3 py-1.5 rounded text-xs font-medium transition-all hover:shadow-md ${
                                    theme === 'dark' ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : theme === 'sepia' ? 'bg-purple-200 text-purple-900 hover:bg-purple-300' : 'bg-purple-200 text-purple-900 hover:bg-purple-300'
                                  }`}
                                  title={`Go to verse ${verseRef}`}
                                >
                                  {verseRef}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeTab === 'commentary' && commentaries[verse.verse] && (
                        <div data-verse={verse.verse} data-section="commentary" className={`rounded p-4 mb-4 ${
                          theme === 'dark' ? 'bg-green-900' : theme === 'sepia' ? 'bg-blue-50' : 'bg-green-50'
                        }`}>
                          {language === 'both' ? (
                            <div className="space-y-3">
                              <div>
                                <p className={`${textSizes.label} font-semibold mb-1 ${
                                  theme === 'dark' ? 'text-orange-400' : theme === 'sepia' ? 'text-blue-700' : 'text-orange-600'
                                }`}>COMMENTARY - ENGLISH</p>
                                <div className={`${textSizes.body} ${
                                  theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-700'
                                }`}>{renderHtml(commentaries[verse.verse].commentary_text, `verse-com-en-${book?.id}-${chapterNum}-${verse.verse}`)}</div>
                              </div>
                              <div className={`border-t pt-3 ${
                                theme === 'dark' ? 'border-green-700' : theme === 'sepia' ? 'border-blue-300' : 'border-green-200'
                              }`}>
                                <p className={`${textSizes.label} font-semibold mb-1 ${
                                  theme === 'dark' ? 'text-blue-400' : theme === 'sepia' ? 'text-blue-700' : 'text-blue-600'
                                }`}>COMMENTARY - LUGANDA</p>
                                <div className={`${textSizes.body} ${
                                  theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-700'
                                }`}>{renderHtml(commentaries[verse.verse].luganda_commentary_text || commentaries[verse.verse].commentary_text, `verse-com-lu-${book?.id}-${chapterNum}-${verse.verse}`)}</div>
                              </div>
                            </div>
                          ) : (
                            <div className={`${textSizes.body} ${
                              theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-700'
                            }`}>
                              {renderHtml(language === 'english'
                                ? commentaries[verse.verse].commentary_text
                                : commentaries[verse.verse].luganda_commentary_text || commentaries[verse.verse].commentary_text, `verse-com-${book?.id}-${chapterNum}-${verse.verse}-${language}`)}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'notes' && (
                        <div className={`rounded p-4 mb-4 ${
                          theme === 'dark' ? 'bg-yellow-900' : theme === 'sepia' ? 'bg-blue-50' : 'bg-yellow-50'
                        }`}>
                          <textarea
                            defaultValue={notes[verseKey] || ''}
                            onChange={(e) => saveNote(verseKey, e.target.value)}
                            placeholder="Add your notes here..."
                            className={`w-full p-2 border rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                              theme === 'dark' ? 'bg-gray-800 text-gray-100 border-yellow-700' : theme === 'sepia' ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-white border-yellow-200'
                            }`}
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Panel - Desktop View */}
          {showSidePanel && (
            <div className={`hidden md:block w-96 border-l p-6 sticky top-20 max-h-[calc(100vh-80px)] overflow-y-auto ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'sepia' ? 'bg-blue-100 border-blue-300' : 'border-indigo-200'
            }`} style={theme === 'light' ? { background: 'rgba(219, 234, 254, 0.25)' } : {}}>
              {/* Info Tabs */}
              <div className={`flex gap-2 mb-6 border-b ${
                theme === 'dark' ? 'border-gray-700' : theme === 'sepia' ? 'border-blue-300' : 'border-indigo-200'
              }`}>
                <button
                  onClick={() => setActiveSidePanelTab('intro')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors border-b-2 ${
                    activeSidePanelTab === 'intro'
                      ? theme === 'dark' ? 'border-indigo-500 text-indigo-400' : theme === 'sepia' ? 'border-blue-700 text-blue-800' : 'border-indigo-600 text-indigo-600'
                      : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-300' : theme === 'sepia' ? 'border-transparent text-blue-800 hover:text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📕 Intro
                </button>
                <button
                  onClick={() => setActiveSidePanelTab('prayer')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors border-b-2 ${
                    activeSidePanelTab === 'prayer'
                      ? theme === 'dark' ? 'border-indigo-500 text-indigo-400' : theme === 'sepia' ? 'border-blue-700 text-blue-800' : 'border-indigo-600 text-indigo-600'
                      : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-300' : theme === 'sepia' ? 'border-transparent text-blue-800 hover:text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  🙏 Prayer
                </button>
                <button
                  onClick={cycleChapterLanguage}
                  title={`Currently: ${chapterLanguage.charAt(0).toUpperCase() + chapterLanguage.slice(1)} | Click to cycle`}
                  className={`ml-auto px-2 py-2 rounded text-xs font-semibold transition-colors ${
                    chapterLanguage === 'english' ? 'bg-orange-600 text-white' :
                    chapterLanguage === 'luganda' ? 'bg-blue-600 text-white' :
                    theme === 'dark' ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white'
                  }`}
                >
                  {chapterLanguage === 'english' ? '🇬🇧 EN' : chapterLanguage === 'luganda' ? '🇺🇬 LU' : '🔀'}
                </button>
              </div>

              {/* Chapter Introduction Tab */}
              {activeSidePanelTab === 'intro' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-indigo-300' : theme === 'sepia' ? 'text-blue-900' : 'text-indigo-900'
                  }`}>📕 Chapter {chapterNum}</h3>
                  {chapterIntroduction ? (
                    <div className="space-y-4">
                      {/* Audio player for chapter intro */}
                      {(chapterIntroduction as any).audio_url && (
                        <AudioPlayer src={(chapterIntroduction as any).audio_url} label="Listen to Introduction" theme={theme} variant="intro" />
                      )}
                      {chapterLanguage === 'both' ? (
                        <>
                          {chapterIntroduction.en_introduction && (
                            <div>
                              <p className={`${textSizes.label} font-semibold mb-2 ${
                                theme === 'dark' ? 'text-orange-400' : theme === 'sepia' ? 'text-blue-700' : 'text-orange-600'
                              }`}>ENGLISH</p>
                              <div className={`${textSizes.body} leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-white text-gray-700 border-indigo-100'
                              }`}>
                                {renderHtml(chapterIntroduction.en_introduction, `ch-intro-en-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                          {chapterIntroduction.lu_introduction && (
                            <div>
                              <p className={`${textSizes.label} font-semibold mb-2 ${
                                theme === 'dark' ? 'text-blue-400' : theme === 'sepia' ? 'text-blue-700' : 'text-blue-600'
                              }`}>LUGANDA</p>
                              <div className={`${textSizes.body} leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-white text-gray-700 border-indigo-100'
                              }`}>
                                {renderHtml(chapterIntroduction.lu_introduction, `ch-intro-lu-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`${textSizes.body} leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-white text-gray-700 border-indigo-100'
                        }`}>
                          {renderHtml(chapterLanguage === 'luganda' && chapterIntroduction.lu_introduction
                            ? chapterIntroduction.lu_introduction
                            : chapterIntroduction.en_introduction || 'No chapter introduction available', `ch-intro-${book?.id}-${chapterNum}-${chapterLanguage}`)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={`text-sm italic ${
                      theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : 'text-gray-500'
                    }`}>No chapter introduction added yet</p>
                  )}
                </div>
              )}

              {/* Prayer Tab */}
              {activeSidePanelTab === 'prayer' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Chapter Closing Prayer */}
                  {chapterPrayers && (chapterPrayers.en_prayer || chapterPrayers.lu_prayer) && (
                    <div>
                      <h4 className={`text-md font-bold mb-3 flex items-center gap-2 ${
                        theme === 'dark' ? 'text-purple-300' : theme === 'sepia' ? 'text-purple-800' : 'text-purple-900'
                      }`}>
                        <span>🙏 Chapter {chapterNum} Closing Prayer</span>
                      </h4>
                      {/* Audio player for closing prayer */}
                      {(chapterPrayers.chapter_closing_prayer_audio_url || chapterPrayers.closing_prayer_audio_url) && (
                        <AudioPlayer
                          src={chapterPrayers.chapter_closing_prayer_audio_url || chapterPrayers.closing_prayer_audio_url}
                          label="Listen to Closing Prayer"
                          theme={theme}
                          variant="prayer"
                        />
                      )}
                      {chapterLanguage === 'both' ? (
                        <>
                          {chapterPrayers.en_prayer && (
                            <div>
                              <p className={`${textSizes.label} font-semibold mb-2 ${
                                theme === 'dark' ? 'text-orange-400' : theme === 'sepia' ? 'text-blue-700' : 'text-orange-600'
                              }`}>ENGLISH</p>
                              <div className={`${textSizes.body} leading-relaxed rounded-lg p-4 border mb-3 max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-purple-900 text-gray-300 border-purple-700' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-purple-50 text-gray-700 border-purple-200'
                              }`}>
                                {renderHtml(chapterPrayers.en_prayer, `ch-prayer-en-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                          {chapterPrayers.lu_prayer && (
                            <div>
                              <p className={`${textSizes.label} font-semibold mb-2 ${
                                theme === 'dark' ? 'text-blue-400' : theme === 'sepia' ? 'text-blue-700' : 'text-blue-600'
                              }`}>LUGANDA</p>
                              <div className={`${textSizes.body} leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-purple-900 text-gray-300 border-purple-700' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-purple-50 text-gray-700 border-purple-200'
                              }`}>
                                {renderHtml(chapterPrayers.lu_prayer, `ch-prayer-lu-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`${textSizes.body} leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                          theme === 'dark' ? 'bg-purple-900 text-gray-300 border-purple-700' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-purple-50 text-gray-700 border-purple-200'
                        }`}>
                          {renderHtml(chapterLanguage === 'luganda' && chapterPrayers.lu_prayer
                            ? chapterPrayers.lu_prayer
                            : chapterPrayers.en_prayer || 'No chapter prayer available', `ch-prayer-${book?.id}-${chapterNum}-${chapterLanguage}`)}
                        </div>
                      )}
                    </div>
                  )}

                  {!chapterPrayers && (
                    <p className={`text-sm italic text-center py-6 ${
                      theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : 'text-gray-500'
                    }`}>No prayers added yet</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Side Panel Modal */}
        {showSidePanel && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowSidePanel(false)} />
        )}
        {showSidePanel && (
          <div className={`md:hidden fixed right-0 top-0 h-full w-72 max-w-[85vw] shadow-lg z-50 overflow-y-auto pt-20 pb-20 ${
            theme === 'dark' ? 'bg-gray-800' : theme === 'sepia' ? 'bg-blue-100' : ''
          }`} style={theme === 'light' ? { background: 'rgba(219, 234, 254, 0.85)' } : {}}>
            <button
              onClick={() => setShowSidePanel(false)}
              className={`absolute top-4 right-4 z-10 ${
                theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : theme === 'sepia' ? 'text-blue-800 hover:text-blue-900' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <X className="h-6 w-6" />
            </button>

            <div className="p-4">
              {/* Tabs */}
              <div className={`flex gap-2 mb-6 border-b ${
                theme === 'dark' ? 'border-gray-700' : theme === 'sepia' ? 'border-blue-300' : 'border-indigo-200'
              }`}>
                <button
                  onClick={() => setActiveSidePanelTab('intro')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors border-b-2 ${
                    activeSidePanelTab === 'intro'
                      ? theme === 'dark' ? 'border-indigo-500 text-indigo-400' : theme === 'sepia' ? 'border-blue-700 text-blue-800' : 'border-indigo-600 text-indigo-600'
                      : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-300' : theme === 'sepia' ? 'border-transparent text-blue-800 hover:text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📕 Intro
                </button>
                <button
                  onClick={() => setActiveSidePanelTab('prayer')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors border-b-2 ${
                    activeSidePanelTab === 'prayer'
                      ? theme === 'dark' ? 'border-indigo-500 text-indigo-400' : theme === 'sepia' ? 'border-blue-700 text-blue-800' : 'border-indigo-600 text-indigo-600'
                      : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-300' : theme === 'sepia' ? 'border-transparent text-blue-800 hover:text-blue-900' : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  🙏 Prayer
                </button>
                <button
                  onClick={cycleChapterLanguage}
                  title={`Currently: ${chapterLanguage.charAt(0).toUpperCase() + chapterLanguage.slice(1)} | Click to cycle`}
                  className={`ml-auto px-2 py-2 rounded text-xs font-semibold transition-colors ${
                    chapterLanguage === 'english' ? 'bg-orange-600 text-white' :
                    chapterLanguage === 'luganda' ? 'bg-blue-600 text-white' :
                    theme === 'dark' ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white'
                  }`}
                >
                  {chapterLanguage === 'english' ? '🇬🇧 EN' : chapterLanguage === 'luganda' ? '🇺🇬 LU' : '🔀'}
                </button>
              </div>

              {/* Content Tabs - Same as desktop */}
              {activeSidePanelTab === 'intro' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-indigo-300' : theme === 'sepia' ? 'text-blue-900' : 'text-indigo-900'
                  }`}>📕 Chapter {chapterNum}</h3>
                  {chapterIntroduction ? (
                    <div className="space-y-4">
                      {/* Audio player for chapter intro (mobile) */}
                      {(chapterIntroduction as any).audio_url && (
                        <AudioPlayer src={(chapterIntroduction as any).audio_url} label="Listen to Introduction" theme={theme} variant="intro" />
                      )}
                      {chapterLanguage === 'both' ? (
                        <>
                          {chapterIntroduction.en_introduction && (
                            <div>
                              <p className={`text-xs font-semibold mb-2 ${
                                theme === 'dark' ? 'text-orange-400' : theme === 'sepia' ? 'text-blue-700' : 'text-orange-600'
                              }`}>ENGLISH</p>
                              <div className={`text-sm leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-white text-gray-700 border-indigo-100'
                              }`}>
                                {renderHtml(chapterIntroduction.en_introduction, `ch-intro-m-en-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                          {chapterIntroduction.lu_introduction && (
                            <div>
                              <p className={`text-xs font-semibold mb-2 ${
                                theme === 'dark' ? 'text-blue-400' : theme === 'sepia' ? 'text-blue-700' : 'text-blue-600'
                              }`}>LUGANDA</p>
                              <div className={`text-sm leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-white text-gray-700 border-indigo-100'
                              }`}>
                                {renderHtml(chapterIntroduction.lu_introduction, `ch-intro-m-lu-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`text-sm leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-white text-gray-700 border-indigo-100'
                        }`}>
                          {renderHtml(chapterLanguage === 'luganda' && chapterIntroduction.lu_introduction
                            ? chapterIntroduction.lu_introduction
                            : chapterIntroduction.en_introduction || 'No chapter introduction available', `ch-intro-m-${book?.id}-${chapterNum}-${chapterLanguage}`)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={`text-sm italic ${
                      theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : 'text-gray-500'
                    }`}>No chapter introduction added yet</p>
                  )}
                </div>
              )}

              {activeSidePanelTab === 'prayer' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {chapterPrayers && (chapterPrayers.en_prayer || chapterPrayers.lu_prayer) && (
                    <div>
                      <h4 className={`text-md font-bold mb-3 flex items-center gap-2 ${
                        theme === 'dark' ? 'text-purple-300' : theme === 'sepia' ? 'text-purple-800' : 'text-purple-900'
                      }`}>
                        <span>🙏 Chapter {chapterNum} Closing Prayer</span>
                      </h4>
                      {/* Audio player for closing prayer (mobile) */}
                      {(chapterPrayers.chapter_closing_prayer_audio_url || chapterPrayers.closing_prayer_audio_url) && (
                        <AudioPlayer
                          src={chapterPrayers.chapter_closing_prayer_audio_url || chapterPrayers.closing_prayer_audio_url}
                          label="Listen to Closing Prayer"
                          theme={theme}
                          variant="prayer"
                        />
                      )}
                      {chapterLanguage === 'both' ? (
                        <>
                          {chapterPrayers.en_prayer && (
                            <div>
                              <p className={`text-xs font-semibold mb-2 ${
                                theme === 'dark' ? 'text-orange-400' : theme === 'sepia' ? 'text-blue-700' : 'text-orange-600'
                              }`}>ENGLISH</p>
                              <div className={`text-sm leading-relaxed rounded-lg p-4 border mb-3 max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-purple-900 text-gray-300 border-purple-700' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-purple-50 text-gray-700 border-purple-200'
                              }`}>
                                {renderHtml(chapterPrayers.en_prayer, `ch-prayer-m-en-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                          {chapterPrayers.lu_prayer && (
                            <div>
                              <p className={`text-xs font-semibold mb-2 ${
                                theme === 'dark' ? 'text-blue-400' : theme === 'sepia' ? 'text-blue-700' : 'text-blue-600'
                              }`}>LUGANDA</p>
                              <div className={`text-sm leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                                theme === 'dark' ? 'bg-purple-900 text-gray-300 border-purple-700' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-purple-50 text-gray-700 border-purple-200'
                              }`}>
                                {renderHtml(chapterPrayers.lu_prayer, `ch-prayer-m-lu-${book?.id}-${chapterNum}`)}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`text-sm leading-relaxed rounded-lg p-4 border max-h-96 overflow-y-auto ${
                          theme === 'dark' ? 'bg-purple-900 text-gray-300 border-purple-700' : theme === 'sepia' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-purple-50 text-gray-700 border-purple-200'
                        }`}>
                          {renderHtml(chapterLanguage === 'luganda' && chapterPrayers.lu_prayer
                            ? chapterPrayers.lu_prayer
                            : chapterPrayers.en_prayer || 'No chapter prayer available', `ch-prayer-m-${book?.id}-${chapterNum}-${chapterLanguage}`)}
                        </div>
                      )}
                    </div>
                  )}

                  {!chapterPrayers && (
                    <p className={`text-sm italic text-center py-6 ${
                      theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : 'text-gray-500'
                    }`}>No prayers added yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reading Plan Navigation Bar */}
        {planId && dayNumber && planDays.length > 0 && (() => {
          const currentIdx = planDays.findIndex(d => d.day_number === dayNumber);
          const prevDay = currentIdx > 0 ? planDays[currentIdx - 1] : null;
          const nextDay = currentIdx < planDays.length - 1 ? planDays[currentIdx + 1] : null;
          return (
            <div className={`fixed bottom-16 left-0 right-0 border-t z-20 ${
              theme === 'dark' ? 'bg-[#1a1040] border-purple-900' : theme === 'sepia' ? 'bg-amber-50 border-amber-200' : 'bg-gradient-to-r from-[#f5f0ff] to-[#ede8ff] border-purple-200'
            }`}>
              {/* Plan context strip — hidden on very small screens to save space */}
              <div className={`hidden sm:flex px-4 py-1.5 items-center gap-2 text-xs font-semibold border-b ${
                theme === 'dark' ? 'border-purple-800 text-purple-300' : 'border-purple-100 text-purple-700'
              }`}>
                <span>📖</span>
                <span className="truncate">{planTitle}</span>
                <span className="ml-auto opacity-60">Day {dayNumber} of {planDays.length}</span>
              </div>
              {/* Plan day nav row */}
              <div className="px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-2">
                {/* Prev Day */}
                <button
                  onClick={() => prevDay?.book_number && router.push(`/bible-reader/${prevDay.book_number}/${prevDay.start_chapter}?planId=${planId}&dayNumber=${prevDay.day_number}`)}
                  disabled={!prevDay}
                  className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                    prevDay
                      ? (theme === 'dark' ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200')
                      : 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                  title={prevDay ? `Day ${prevDay.day_number}: ${prevDay.book} ${prevDay.start_chapter}` : 'First day'}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Day {prevDay?.day_number ?? '—'}</span>
                  <span className="sm:hidden">Prev</span>
                </button>

                {/* Center: plan title on mobile + mark complete */}
                <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
                  {/* Plan title shown only on mobile (replaces hidden strip) */}
                  <span className={`sm:hidden text-xs font-semibold truncate max-w-[80px] ${
                    theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                  }`}>Day {dayNumber}/{planDays.length}</span>
                  {/* Mini progress dots - desktop only */}
                  <div className="hidden sm:flex items-center gap-1">
                    {planDays.slice(Math.max(0, currentIdx - 3), Math.min(planDays.length, currentIdx + 4)).map((d) => (
                      <div
                        key={d.day_number}
                        className={`rounded-full transition-all ${
                          d.day_number === dayNumber
                            ? 'w-4 h-4 bg-purple-600 ring-2 ring-purple-300'
                            : d.day_number < dayNumber
                              ? 'w-2.5 h-2.5 bg-purple-400'
                              : 'w-2.5 h-2.5 bg-purple-200'
                        }`}
                        title={`Day ${d.day_number}: ${d.book}`}
                      />
                    ))}
                  </div>
                  {/* Mark Complete button */}
                  <button
                    onClick={markDayComplete}
                    disabled={dayCompleted || markingComplete}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                      dayCompleted
                        ? 'bg-green-600 text-white cursor-default'
                        : markingComplete
                          ? 'bg-gray-300 text-gray-500 cursor-wait'
                          : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                    }`}
                  >
                    {dayCompleted ? '✓ Done' : markingComplete ? '...' : <><span className="hidden sm:inline">✓ Mark Done</span><span className="sm:hidden">✓ Done</span></>}
                  </button>
                  {/* Back to plan */}
                  <button
                    onClick={() => router.push(`/reading-plans/${planId}`)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                    }`}
                    title="Back to reading plan"
                  >
                    📋 <span className="hidden sm:inline">Plan</span>
                  </button>
                </div>

                {/* Next Day */}
                <button
                  onClick={() => nextDay?.book_number && router.push(`/bible-reader/${nextDay.book_number}/${nextDay.start_chapter}?planId=${planId}&dayNumber=${nextDay.day_number}`)}
                  disabled={!nextDay}
                  className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                    nextDay
                      ? (theme === 'dark' ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : 'bg-purple-600 text-white hover:bg-purple-700')
                      : 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                  title={nextDay ? `Day ${nextDay.day_number}: ${nextDay.book} ${nextDay.start_chapter}` : 'Last day'}
                >
                  <span className="hidden sm:inline">Day {nextDay?.day_number ?? '—'}</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Footer Navigation */}
        <div className={`fixed bottom-0 left-0 right-0 border-t px-2 py-2 sm:p-4 flex justify-between items-center z-20 gap-2 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'sepia' ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={() => prevChapter && (window.location.href = `/bible-reader/${bookNumber}/${prevChapter}${planId ? `?planId=${planId}&dayNumber=${dayNumber}` : ''}`)}
            disabled={!prevChapter}
            className={`inline-flex items-center px-2 sm:px-4 py-2 rounded transition-colors text-sm flex-shrink-0 ${
              prevChapter
                ? (theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline">Prev</span>
          </button>

          <div className={`text-center font-semibold text-sm sm:text-lg flex-1 min-w-0 ${
            theme === 'dark' ? 'text-gray-300' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-600'
          }`}>
            <span className="hidden sm:inline">Chapter </span>{chapterNum} of {book.total_chapters}
          </div>

          <button
            onClick={() => nextChapter && (window.location.href = `/bible-reader/${bookNumber}/${nextChapter}${planId ? `?planId=${planId}&dayNumber=${dayNumber}` : ''}`)}
            disabled={!nextChapter}
            className={`inline-flex items-center px-3 sm:px-4 py-2 rounded transition-colors text-sm flex-shrink-0 ${
              nextChapter
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            Next
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1" />
          </button>
        </div>

        {/* Cross Reference Modal */}
        {selectedVerseForCrossRef && book && (
          <CrossReferenceModal
            isOpen={crossRefModalOpen}
            onClose={() => setCrossRefModalOpen(false)}
            sourceBookId={book.id}
            sourceChapter={chapterNum}
            sourceVerse={selectedVerseForCrossRef.verse}
            sourceBookName={selectedVerseForCrossRef.bookName}
            theme={theme}
            onRefresh={() => {
              // Refresh cross references data if needed
            }}
          />
        )}

        {/* Theological Insights Modal */}
        <TheologicalInsightsModal
          isOpen={theologicalInsightsModalOpen}
          onClose={() => setTheologicalInsightsModalOpen(false)}
          mode={theologicalInsightsMode}
          bookId={book?.id ?? 0}
          bookName={book?.name_english ?? ''}
          chapter={chapterNum}
          verseNumber={theologicalInsightsVerse}
          theme={theme}
          language={language}
        />

        {/* Scripture Verse Popup */}
        <ScriptureVersePopup popup={scripturePopup} onClose={closeScripturePopup} />
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="text-center">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1 mx-auto" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mx-auto" />
        </div>
        <div className="flex gap-1">
          {[1,2,3,4].map(i => <div key={i} className="h-9 w-9 bg-gray-200 rounded animate-pulse" />)}
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8 pb-6 border-b-2 border-orange-200">
          <div className="h-5 w-28 bg-orange-100 rounded-full animate-pulse mb-3" />
          <div className="h-14 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-6">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 shadow p-4">
              <div className="flex gap-3 mb-4">
                <div className="h-5 w-5 bg-orange-200 rounded animate-pulse flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChapterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ChapterContent />
    </Suspense>
  );
}
