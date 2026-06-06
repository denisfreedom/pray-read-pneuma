"use client";

import { useState, useEffect } from "react";
import { Calendar, Book, Clock, ChevronLeft, ChevronRight, X, Share2, Mail, Copy, Linkedin, Check, CheckCircle2, Plus, Minus } from "lucide-react";
import { useScripturePopup, ScriptureVersePopup, ScriptureHtml } from "@/components/ScriptureVersePopup";
import HighlightableText from "@/app/components/HighlightableText";
import { stripHtml } from "@/app/utils/stripHtml";
import { useFontSizeStore, getTextSizeClasses } from "@/app/store/fontSizeStore";

interface DevotionalPlan {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  schedule_type: string;
}

interface DevotionalEntry {
  id: number;
  plan_id: number;
  scheduled_date: string;
  title: string;
  devotional_text: string;
  scripture_book: string;
  scripture_chapter: number;
  scripture_verse: number;
  scripture_quotation: string;
  related_scriptures: any[];
  further_readings: string;
  author: string;
  cover_photo_url: string;
}

export default function DevotionalPlansPage() {
  const { popup: scripturePopup, openVerse, closePopup: closeScripturePopup } = useScripturePopup();
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSizeStore();
  const textSizes = getTextSizeClasses(fontSize);
  const [plans, setPlans] = useState<DevotionalPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DevotionalPlan | null>(null);
  const [entries, setEntries] = useState<DevotionalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DevotionalEntry | null>(null);
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [isInitialized, setIsInitialized] = useState(false);
  const [parsedFurtherReadings, setParsedFurtherReadings] = useState<any[]>([]);
  const [bibleBooks, setBibleBooks] = useState<any[]>([]);
  const [selectedVersePopup, setSelectedVersePopup] = useState<{ book: string; chapter: number; verse: number; text: string } | null>(null);
  const [showDevotionalsGrid, setShowDevotionalsGrid] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [recentDevotionals, setRecentDevotionals] = useState<DevotionalEntry[]>([]);
  const [displayedCount, setDisplayedCount] = useState(9);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [devotionalStats, setDevotionalStats] = useState<any>(null);
  const [devotionalLang, setDevotionalLang] = useState<'both' | 'en' | 'lu'>('both');

  useEffect(() => {
    setIsInitialized(true);
    fetchPlans();
    fetchBibleBooks();
    checkUserSession();
    
    // Check for deep link with entryId query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const entryId = urlParams.get('entryId');
    if (entryId) {
      // Fetch the specific devotional entry
      fetchDevotionalByEntryId(parseInt(entryId));
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchDevotionalStats();
    }
  }, [userEmail]);

  useEffect(() => {
    if (selectedPlan) {
      fetchEntries(selectedPlan.id);
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (showDevotionalsGrid) {
      fetchRecentDevotionals();
    }
  }, [showDevotionalsGrid]);

  const checkUserSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.success && data.user?.email) {
        setUserEmail(data.user.email);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const fetchDevotionalStats = async () => {
    if (!userEmail) return;
    try {
      const res = await fetch(`/api/user-devotional-progress?userEmail=${encodeURIComponent(userEmail)}&stats=true`);
      const data = await res.json();
      if (data.success) {
        setDevotionalStats(data);
      }
    } catch (error) {
      console.error('Error fetching devotional stats:', error);
    }
  };

  const fetchPlans = async () => {
    const res = await fetch("/api/devotional-plans");
    const data = await res.json();
    setPlans(data.filter((p: any) => p.is_active));
  };

  const fetchBibleBooks = async () => {
    const res = await fetch("/api/bible-books");
    const data = await res.json();
    setBibleBooks(data);
  };

  const fetchEntries = async (planId: number) => {
    // Only fetch published entries up to today, include user progress
    const emailParam = userEmail ? `&userEmail=${encodeURIComponent(userEmail)}` : '';
    const res = await fetch(`/api/devotional-entries?planId=${planId}${emailParam}`);
    const data = await res.json();
    setEntries(data);
  };

  const fetchDevotionalByEntryId = async (entryId: number) => {
    try {
      const emailParam = userEmail ? `&userEmail=${encodeURIComponent(userEmail)}` : '';
      const res = await fetch(`/api/devotional-entries?entryId=${entryId}${emailParam}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const entry = data[0];
        setSelectedEntry(entry);
        setShowDevotionalsGrid(true);
        
        // Parse further readings if available
        if (entry.further_readings) {
          parseFurtherReadings(entry.further_readings);
        } else {
          setParsedFurtherReadings([]);
        }
      }
    } catch (error) {
      console.error('Error fetching devotional by entryId:', error);
    }
  };

  const fetchRecentDevotionals = async () => {
    try {
      // Try offline storage first
      if (!navigator.onLine) {
        try {
          const { getAllDevotionals } = await import('@/app/utils/offlineStorage');
          const offlineDevotionals = await getAllDevotionals();
          if (offlineDevotionals && offlineDevotionals.length > 0) {
            // Sort by date descending (most recent first)
            const sorted = offlineDevotionals.sort((a: any, b: any) => 
              new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
            );
            setRecentDevotionals(sorted as DevotionalEntry[]);
            return;
          }
        } catch (offlineError) {
          console.log('Offline storage not available, trying network...');
        }
      }

      // Fetch from network
      const emailParam = userEmail ? `&userEmail=${encodeURIComponent(userEmail)}` : '';
      const res = await fetch(`/api/devotional-entries?showAll=true${emailParam}`);
      const data = await res.json();
      // Sort by date descending (most recent first)
      const sorted = data.sort((a: DevotionalEntry, b: DevotionalEntry) => 
        new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
      );
      setRecentDevotionals(sorted);
    } catch (error) {
      console.error("Error fetching devotionals:", error);
      
      // Fallback to offline storage if network fails
      try {
        const { getAllDevotionals } = await import('@/app/utils/offlineStorage');
        const offlineDevotionals = await getAllDevotionals();
        if (offlineDevotionals && offlineDevotionals.length > 0) {
          const sorted = offlineDevotionals.sort((a: any, b: any) => 
            new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
          );
          setRecentDevotionals(sorted as DevotionalEntry[]);
        }
      } catch (offlineError) {
        console.error('Failed to load devotionals from offline storage:', offlineError);
      }
    }
  };

  const markDevotionalComplete = async (entryId: number, scheduledDate: string, completed: boolean) => {
    if (!userEmail) {
      alert('Please log in to track your devotional progress');
      return;
    }

    try {
      const res = await fetch('/api/user-devotional-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          entryId,
          scheduledDate,
          completed
        })
      });

      if (res.ok) {
        // Update local state
        if (selectedEntry && selectedEntry.id === entryId) {
          setSelectedEntry({ ...selectedEntry, user_completed: completed } as any);
        }
        // Refresh entries and stats
        if (selectedPlan) {
          fetchEntries(selectedPlan.id);
        }
        fetchRecentDevotionals();
        fetchDevotionalStats();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const loadMoreDevotionals = () => {
    setDisplayedCount(prev => prev + 9);
  };

  const handleDateSelect = async (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    // Check if date is in the future
    if (dateToCheck > today) {
      alert("Devotionals for future dates are not yet available.");
      return;
    }
    
    // Build dateStr directly from local date parts to avoid UTC timezone offset
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // First check in already loaded entries
    let entry = entries.find((e) => {
      const entryDate = e.scheduled_date ? e.scheduled_date.substring(0, 10) : '';
      return entryDate === dateStr;
    });
    
    // If not found, fetch specifically for this date
    if (!entry && selectedPlan) {
      try {
        const emailParam = userEmail ? `&userEmail=${encodeURIComponent(userEmail)}` : '';
        const res = await fetch(`/api/devotional-entries?planId=${selectedPlan.id}&date=${dateStr}${emailParam}`);
        const data = await res.json();
        if (data && data.length > 0) {
          entry = data[0];
        }
      } catch (error) {
        console.error("Error fetching entry for date:", error);
      }
    }
    
    if (entry) {
      setSelectedEntry(entry);
      // Parse further readings when entry is selected
      if (entry.further_readings) {
        parseFurtherReadings(entry.further_readings);
      } else {
        setParsedFurtherReadings([]);
      }
    } else {
      alert("No devotional available for this date.");
    }
    setSelectedDate(date);
  };

  // Parse further readings - strip HTML and extract scripture references
  const parseFurtherReadings = (text: string) => {
    if (!text.trim()) {
      setParsedFurtherReadings([]);
      return;
    }

    // Strip HTML tags first to get plain text references
    const cleanText = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    // Split by semicolons, commas, or dots that end a sentence
    const references = cleanText.split(/[;,]|\.(?=\s[A-Z]|$)/).map((ref: string) => ref.trim()).filter((ref: string) => ref);
    const parsed: any[] = [];

    for (const ref of references) {
      const result = parseScriptureReference(ref);
      if (result.isValid) {
        parsed.push(result);
      }
    }

    setParsedFurtherReadings(parsed);
  };

  // Alias map for common book name variants → canonical lowercase DB name
  const BOOK_ALIASES: Record<string, string> = {
    'psalm': 'psalms', 'psa': 'psalms', 'ps': 'psalms',
    'song of solomon': 'song of songs', 'song': 'song of songs', 'sos': 'song of songs',
    '1samuel': '1 samuel', '2samuel': '2 samuel',
    '1kings': '1 kings', '2kings': '2 kings',
    '1chronicles': '1 chronicles', '2chronicles': '2 chronicles',
    '1corinthians': '1 corinthians', '2corinthians': '2 corinthians',
    '1thessalonians': '1 thessalonians', '2thessalonians': '2 thessalonians',
    '1timothy': '1 timothy', '2timothy': '2 timothy',
    '1peter': '1 peter', '2peter': '2 peter',
    '1john': '1 john', '2john': '2 john', '3john': '3 john',
    'gen': 'genesis', 'exod': 'exodus', 'exo': 'exodus',
    'lev': 'leviticus', 'num': 'numbers', 'deut': 'deuteronomy',
    'josh': 'joshua', 'judg': 'judges',
    'isa': 'isaiah', 'jer': 'jeremiah', 'lam': 'lamentations',
    'ezek': 'ezekiel', 'dan': 'daniel', 'hos': 'hosea',
    'obad': 'obadiah', 'mic': 'micah', 'nah': 'nahum',
    'hab': 'habakkuk', 'zeph': 'zephaniah', 'hag': 'haggai',
    'zech': 'zechariah', 'mal': 'malachi',
    'matt': 'matthew', 'rom': 'romans',
    'gal': 'galatians', 'eph': 'ephesians', 'phil': 'philippians',
    'col': 'colossians', 'phlm': 'philemon', 'heb': 'hebrews',
    'jas': 'james', 'rev': 'revelation',
  };

  const resolveBook = (name: string) => {
    const lower = name.trim().toLowerCase();
    const resolved = BOOK_ALIASES[lower] || lower;
    return bibleBooks.find((b: any) =>
      b.name_english?.toLowerCase() === resolved ||
      b.name_english?.toLowerCase() === lower ||
      b.abbreviation_english?.toLowerCase() === resolved ||
      b.abbreviation_english?.toLowerCase() === lower
    );
  };

  // Parse a single scripture reference
  const parseScriptureReference = (ref: string) => {
    const pattern = /^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)(?:-(\d+))?$/;
    const match = ref.match(pattern);

    if (!match) {
      return { isValid: false };
    }

    const bookName = match[1].trim();
    const chapter = parseInt(match[2]);
    const verse = parseInt(match[3]);
    const endVerse = match[4] ? parseInt(match[4]) : verse;

    const book = resolveBook(bookName);

    if (!book) {
      return { isValid: false };
    }

    return {
      book: book.name_english,
      chapter,
      verse,
      display: endVerse > verse ? `${book.name_english} ${chapter}:${verse}-${endVerse}` : `${book.name_english} ${chapter}:${verse}`,
      isValid: true,
    };
  };

  // Fetch verse text for popup
  const fetchVerseText = async (book: string, chapter: number, verse: number) => {
    try {
      const bookData = bibleBooks.find(b => b.name_english === book);
      if (!bookData) return;

      const res = await fetch(`/api/bible-verses?bookId=${bookData.id}&chapter=${chapter}&verse=${verse}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setSelectedVersePopup({
          book,
          chapter,
          verse,
          text: data[0].text_english || data[0].text_luganda || "Verse text not available",
        });
      }
    } catch (error) {
      console.error("Error fetching verse:", error);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getEntriesForDate = (dateStr: string) => {
    // dateStr is in format YYYY-MM-DD — compare only the date part, never use toISOString (timezone-safe)
    return entries.filter((e) => {
      const entryDate = e.scheduled_date ? e.scheduled_date.substring(0, 10) : '';
      return entryDate === dateStr;
    });
  };

  const isPastOrToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Build todayStr directly to avoid UTC timezone offset shifting the date
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Build dateStr directly from numbers to avoid timezone offset shifting the date
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(currentYear, currentMonth, day);
      date.setHours(0, 0, 0, 0);
      const dayEntries = getEntriesForDate(dateStr);
      const isToday = dateStr === todayStr;
      const isPast = date < today;
      const isFuture = date > today;

      const hasCompleted = dayEntries.some(e => (e as any).user_completed);
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(date)}
          className={`p-3 border rounded-lg min-h-[70px] transition-all relative ${
            isToday ? "bg-blue-100 border-blue-500 font-bold" : "border-gray-200"
          } ${isPast ? "bg-gray-50" : ""} ${
            isFuture ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50" : "hover:shadow-md cursor-pointer"
          } ${dayEntries.length > 0 && !isFuture ? (hasCompleted ? "bg-green-100 border-green-400" : "bg-yellow-50 border-yellow-300") : ""}`}
        >
          <div className="font-semibold text-sm mb-1">{day}</div>
          {dayEntries.length > 0 && (
            <div className={`text-xs rounded-full px-2 py-1 ${
              hasCompleted ? "bg-green-600 text-white" : "bg-yellow-600 text-white"
            }`}>
              {hasCompleted ? "✓" : "📖"} {dayEntries.length}
            </div>
          )}
          {isFuture && (
            <div className="text-xs text-gray-400">🔒</div>
          )}
          {hasCompleted && (
            <div className="absolute top-1 right-1">
              <CheckCircle2 size={16} className="text-green-600" />
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateToVerse = (book: string, chapter: number, verse: number) => {
    // Find book number from the book name
    fetch("/api/bible-books?full=true")
      .then((res) => res.json())
      .then((books) => {
        const matchedBook = books.find(
          (b: any) => b.name_english.toLowerCase() === book.toLowerCase()
        );
        if (matchedBook) {
          window.location.href = `/bible-reader/${matchedBook.book_number}/${chapter}#verse-${verse}`;
        }
      });
  };

  const shareDevotional = (platform: string) => {
    if (!selectedEntry) return;

    // Strip HTML from devotional texts and scripture quotation
    const cleanDevotionalTextEn = stripHtml(selectedEntry.devotional_text || '');
    const cleanDevotionalTextLu = stripHtml((selectedEntry as any).devotional_text_lu || '');
    const cleanScriptureQuotation = stripHtml(selectedEntry.scripture_quotation || '');
    
    const shareTitle = selectedEntry.title;
    
    // Build the complete share text with BOTH languages in full
    let shareText = `✨ ${selectedEntry.title} ✨

`;
    shareText += `📖 ${selectedEntry.scripture_book} ${selectedEntry.scripture_chapter}:${selectedEntry.scripture_verse}
`;
    shareText += `"${cleanScriptureQuotation}"

`;
    
    // Add English devotional in full
    if (cleanDevotionalTextEn) {
      shareText += `━━━━━━━━━━━━━━━━
`;
      shareText += `📝 ENGLISH:

`;
      shareText += `${cleanDevotionalTextEn}

`;
    }
    
    // Add Luganda devotional in full
    if (cleanDevotionalTextLu) {
      shareText += `━━━━━━━━━━━━━━━━
`;
      shareText += `📝 LUGANDA:

`;
      shareText += `${cleanDevotionalTextLu}

`;
    }
    
    if (selectedEntry.author) {
      shareText += `✍️ Author: ${selectedEntry.author}

`;
    }
    
    // Create a deep link directly to this devotional
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const devotionalDeepLink = `${baseUrl}/devotional-plans?entryId=${selectedEntry.id}`;
    shareText += `🔗 Read full devotional:
${devotionalDeepLink}

`;
    shareText += `━━━━━━━━━━━━━━━━
`;
    shareText += `A Digital Sanctuary — A living Altar where the Word of God ceases to be mere text and becomes Spirit and Life in the daily experience of every believer.`;
    
    const fullText = shareText;

    switch (platform) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(devotionalDeepLink)}`, "_blank");
        break;
      case "twitter":
        // Twitter has character limit, so truncate if needed but still include both languages
        const twitterText = fullText.length > 280 ? fullText.substring(0, 277) + '...' : fullText;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`, "_blank");
        break;
      case "telegram":
        window.open(`https://t.me/share/url?url=${encodeURIComponent(devotionalDeepLink)}&text=${encodeURIComponent(fullText)}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(devotionalDeepLink)}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(fullText)}`, "_blank");
        break;
      case "copy":
        navigator.clipboard.writeText(fullText).then(() => {
          alert("Devotional copied to clipboard!");
        });
        break;
    }
  };

  const bgStyle = {
    backgroundImage: `url(https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778324888717_c4fw7x.jpeg)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <div className="absolute inset-0 bg-black/65"></div>
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Loading devotional plans...</p>
        </div>
      </div>
    );
  }

  if (!showDevotionalsGrid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative" style={bgStyle}>
        <div className="absolute inset-0 bg-black/65"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-12">
            <div className="mb-8">
              <div 
                className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1777753553956_p0lpl.png)`,
                }}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500/80 to-pink-500/80 flex items-center justify-center">
                  <Book size={56} className="text-white" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                Daily Devotionals
              </h1>
              <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-2xl mx-auto">
                Discover inspiring devotional journeys designed to deepen your faith and strengthen your walk with God
              </p>
            </div>

            <button
              onClick={() => setShowDevotionalsGrid(true)}
              className="px-10 py-5 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white rounded-full text-xl font-bold hover:from-amber-500 hover:via-orange-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-4 mx-auto group"
            >
              <Calendar size={28} className="group-hover:rotate-12 transition-transform" />
              Explore Devotionals
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Devotionals Grid View with Modal
  if (showDevotionalsGrid && !showCalendar) {
    return (
      <>
        <div className="min-h-screen p-6 relative" style={bgStyle}>
          <div className="absolute inset-0 bg-black/65"></div>
          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
                    ✨ Recent Devotionals
                  </h1>
                  <p className="text-white/80 text-lg">Browse through our devotional archives and grow in your faith</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {userEmail && devotionalStats && (
                    <div className="flex items-center gap-6 px-6 py-4 bg-gradient-to-r from-orange-500/30 to-pink-500/30 backdrop-blur-md rounded-2xl border border-orange-400/40 shadow-lg">
                      <div className="text-center">
                        <div className="text-3xl font-black text-orange-300 drop-shadow">🔥 {devotionalStats.currentStreak || 0}</div>
                        <div className="text-xs text-white/70 font-semibold mt-1">Day Streak</div>
                      </div>
                      <div className="w-px h-12 bg-white/30"></div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-300">{devotionalStats.stats?.total_completed || 0}</div>
                        <div className="text-xs text-white/70 font-semibold mt-1">Completed</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-600 flex items-center gap-3 shadow-xl font-bold text-lg transition-all transform hover:scale-105"
                  >
                    <Calendar size={24} />
                    Calendar View
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of Recent Devotionals */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
              {recentDevotionals.slice(0, displayedCount).map((devotional) => (
                <button
                  key={devotional.id}
                  onClick={() => {
                    setSelectedEntry(devotional);
                    if (devotional.further_readings) {
                      parseFurtherReadings(devotional.further_readings);
                    } else {
                      setParsedFurtherReadings([]);
                    }
                  }}
                  className="group bg-white/5 backdrop-blur-md border border-white/20 rounded-3xl shadow-xl overflow-hidden cursor-pointer hover:shadow-2xl hover:border-white/40 transition-all transform hover:scale-105 hover:-translate-y-2 text-left"
                >
                  <div className="relative overflow-hidden">
                    <div
                      className="h-56 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${devotional.cover_photo_url || 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778325513092_71fqsh.jpeg'})`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    {(devotional as any).user_completed && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg font-bold">
                        <CheckCircle2 size={18} />
                        Completed
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                      <Calendar size={16} className="text-cyan-400" />
                      <span className="font-semibold">{new Date(devotional.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2 group-hover:text-cyan-300 transition-colors">
                      {devotional.title}
                    </h2>
                    {devotional.author && (
                      <p className="text-sm text-amber-400 mb-3 font-semibold">✍️ By {devotional.author}</p>
                    )}
                    {devotional.scripture_book && (
                      <div className="flex items-center gap-2 text-purple-300 bg-purple-500/20 px-3 py-2 rounded-xl mb-3 border border-purple-400/30">
                        <Book size={18} />
                        <span className="font-bold text-sm">
                          {devotional.scripture_book} {devotional.scripture_chapter}:{devotional.scripture_verse}
                        </span>
                      </div>
                    )}
                    <p className="text-white/70 text-sm line-clamp-3 leading-relaxed">
                      {(() => {
                        const raw = devotional.devotional_text || '';
                        const clean = raw
                          .replace(/<!--[\s\S]*?-->/g, '')
                          .replace(/<style[\s\S]*?<\/style>/gi, '')
                          .replace(/<xml[\s\S]*?<\/xml>/gi, '')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
                        return clean.substring(0, 150) + (clean.length > 150 ? '...' : '');
                      })()}
                    </p>
                  </div>
                </button>
              ))}
          </div>

          {/* Load More Button */}
          {displayedCount < recentDevotionals.length && (
            <div className="text-center">
              <button
                onClick={loadMoreDevotionals}
                className="px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-full text-xl font-bold hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-2xl"
              >
                Load Previous Devotionals ({recentDevotionals.length - displayedCount} more)
              </button>
            </div>
          )}

            {/* No more devotionals */}
            {displayedCount >= recentDevotionals.length && recentDevotionals.length > 9 && (
              <div className="text-center text-white/60 py-12">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-xl font-semibold">You've reached the beginning of our devotional archives</p>
              </div>
            )}
          </div>
        </div>

        {/* Devotional Modal - Show in Grid View */}
        {selectedEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
                <div className="flex-1 min-w-0 pr-3">
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedEntry.title}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-xs text-gray-400">📅 {new Date(selectedEntry.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    {selectedEntry.author && <p className="text-xs text-emerald-600 font-semibold">✍️ {selectedEntry.author}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Font Size Controls */}
                  <button
                    onClick={decreaseFontSize}
                    title="Decrease font size"
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    onClick={increaseFontSize}
                    title="Increase font size"
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
                  >
                    <Plus size={16} />
                  </button>
                  {userEmail && (
                    <button
                      onClick={() => markDevotionalComplete(selectedEntry.id, selectedEntry.scheduled_date, !(selectedEntry as any).user_completed)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 text-xs ${
                        (selectedEntry as any).user_completed ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {(selectedEntry as any).user_completed ? <><CheckCircle2 size={15} /> Completed</> : <><Check size={15} /> Mark Complete</>}
                    </button>
                  )}
                  <button onClick={() => setSelectedEntry(null)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Cover Photo */}
                <img src={selectedEntry.cover_photo_url || 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778325513092_71fqsh.jpeg'} alt={selectedEntry.title}
                  className="w-full rounded-2xl shadow-md object-cover max-h-56"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778325513092_71fqsh.jpeg'; }}
                />

                {/* Main Scripture */}
                {selectedEntry.scripture_book && (
                  <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-white font-semibold text-xs flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        Today's Scripture
                      </span>
                      <button onClick={() => navigateToVerse(selectedEntry.scripture_book, selectedEntry.scripture_chapter, 1)}
                        className="text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all">Full Chapter →</button>
                    </div>
                    <div className="bg-blue-50 px-4 py-3">
                      <button onClick={() => openVerse({ book: selectedEntry.scripture_book, chapter: selectedEntry.scripture_chapter, verse: selectedEntry.scripture_verse, display: `${selectedEntry.scripture_book} ${selectedEntry.scripture_chapter}:${selectedEntry.scripture_verse}` })}
                        className={`font-bold text-blue-700 hover:text-blue-900 hover:underline ${textSizes.body} mb-1.5 block transition-colors`}>
                        {selectedEntry.scripture_book} {selectedEntry.scripture_chapter}:{selectedEntry.scripture_verse}
                      </button>
                      {selectedEntry.scripture_quotation && (
                        <ScriptureHtml html={selectedEntry.scripture_quotation} onVerseClick={openVerse} className={`text-gray-700 italic ${textSizes.body} leading-relaxed`} />
                      )}
                    </div>
                  </div>
                )}

                {/* Language Toggle for Devotional */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-semibold">Translation:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDevotionalLang('both')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          devotionalLang === 'both'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        BOTH
                      </button>
                      <button
                        onClick={() => setDevotionalLang('en')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          devotionalLang === 'en'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setDevotionalLang('lu')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          devotionalLang === 'lu'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        LUG
                      </button>
                    </div>
                  </div>
                </div>

                {/* Devotional Content */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-l-4 border-amber-400 shadow-sm">
                  <h3 className="text-xl font-bold text-amber-600 mb-4 flex items-center gap-2">
                    📖 Devotional Message
                  </h3>
                  {(devotionalLang === 'both' || devotionalLang === 'en') && selectedEntry.devotional_text && (
                    <div className="mb-6">
                      {devotionalLang === 'both' && <div className={`text-amber-700 font-semibold mb-3 ${textSizes.label} uppercase tracking-wide`}>English:</div>}
                      <ScriptureHtml html={selectedEntry.devotional_text} onVerseClick={openVerse} className={`text-gray-800 leading-relaxed ${textSizes.body}`} />
                    </div>
                  )}
                  {(devotionalLang === 'both' || devotionalLang === 'lu') && (selectedEntry as any).devotional_text_lu && (
                    <div>
                      {devotionalLang === 'both' && <div className={`text-amber-700 font-semibold mb-3 mt-6 ${textSizes.label} uppercase tracking-wide border-t border-amber-200 pt-6`}>Luganda:</div>}
                      <ScriptureHtml html={(selectedEntry as any).devotional_text_lu} onVerseClick={openVerse} className={`text-gray-800 leading-relaxed ${textSizes.body}`} />
                    </div>
                  )}
                  {(devotionalLang === 'lu') && !(selectedEntry as any).devotional_text_lu && (
                    <div className="text-gray-500 italic text-center py-8">Luganda translation not available for this devotional</div>
                  )}
                </div>

                {/* Further Readings - Parse and make clickable */}
                {parsedFurtherReadings && parsedFurtherReadings.length > 0 && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 border-l-4 border-teal-400 shadow-sm">
                    <h3 className={`${textSizes.heading} font-bold text-teal-600 mb-4 flex items-center gap-2`}>
                      🔗 Further Readings
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {parsedFurtherReadings.map((ref: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => openVerse({ book: ref.book, chapter: ref.chapter, verse: ref.verse, display: ref.display })}
                          className={`px-4 py-2 bg-teal-100 hover:bg-teal-200 border-2 border-teal-400 text-teal-700 font-semibold rounded-xl transition-all hover:shadow-md ${textSizes.body}`}
                        >
                          {ref.display}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Scriptures */}
                {selectedEntry.related_scriptures && Array.isArray(selectedEntry.related_scriptures) && selectedEntry.related_scriptures.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-l-4 border-green-400 shadow-sm">
                    <h3 className={`${textSizes.heading} font-bold text-green-600 mb-4 flex items-center gap-2`}>
                      📚 Related Scriptures
                    </h3>
                    <div className="space-y-3">
                      {(selectedEntry.related_scriptures || []).map((scripture: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all">
                          <button
                            onClick={() => openVerse({ book: scripture.book, chapter: scripture.chapter, verse: scripture.verse, display: `${scripture.book} ${scripture.chapter}:${scripture.verse}` })}
                            className={`font-semibold text-green-600 hover:text-green-800 mb-2 block underline ${textSizes.body}`}
                          >
                            📖 {scripture.book} {scripture.chapter}:{scripture.verse}
                          </button>
                          {scripture.text && (
                            <ScriptureHtml html={`"${scripture.text}"`} onVerseClick={openVerse} className={`text-gray-700 italic ${textSizes.body}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Media Share Buttons - Icons Only */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Share2 size={13} /> Share
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* WhatsApp */}
                    <button title="WhatsApp" onClick={() => shareDevotional("whatsapp")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    </button>
                    {/* Facebook */}
                    <button title="Facebook" onClick={() => shareDevotional("facebook")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </button>
                    {/* Twitter / X */}
                    <button title="Twitter" onClick={() => shareDevotional("twitter")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-sky-500 hover:bg-sky-600 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    </button>
                    {/* Telegram */}
                    <button title="Telegram" onClick={() => shareDevotional("telegram")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-[#229ED9] hover:bg-[#1a8bc2] text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    </button>
                    {/* LinkedIn */}
                    <button title="LinkedIn" onClick={() => shareDevotional("linkedin")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0A66C2] hover:bg-[#084e96] text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <Linkedin size={18} />
                    </button>
                    {/* Email */}
                    <button title="Email" onClick={() => shareDevotional("email")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <Mail size={18} />
                    </button>
                    {/* Copy Link */}
                    <button title="Copy Link" onClick={() => shareDevotional("copy")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ScriptureVersePopup popup={scripturePopup} onClose={closeScripturePopup} />
      </>
    );
  }

  if (!selectedPlan && showCalendar) {
    // Auto-select the first plan for calendar view
    if (plans.length > 0) {
      setSelectedPlan(plans[0]);
      return null;
    }
    return (
      <div className="min-h-screen p-6 relative" style={bgStyle}>
        <div className="absolute inset-0 bg-black/65"></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-8 mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Daily Devotionals</h1>
            <p className="text-white/70">No devotional plans available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative" style={bgStyle}>
      <div className="absolute inset-0 bg-black/65"></div>
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <button
            onClick={() => {
              setSelectedPlan(null);
              setSelectedEntry(null);
              setShowCalendar(false);
              setShowDevotionalsGrid(true);
            }}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Back to Grid
          </button>
          <div
            className="h-32 bg-cover bg-center rounded-xl mb-4"
            style={{ backgroundImage: `url(${selectedPlan?.thumbnail_url})` }}
          />
          <h1 className="text-3xl font-bold text-gray-800">{selectedPlan?.title}</h1>
          <p className="text-gray-600 mt-2">{selectedPlan?.description}</p>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          {/* Month Summary Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Devotionals Available</p>
                <p className="text-3xl font-bold text-purple-700">{entries.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-blue-700">
                  {entries.filter(e => {
                    const entryDate = new Date(e.scheduled_date);
                    return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
                  }).length}
                </p>
              </div>
            </div>
            {entries.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  💡 <strong>Tip:</strong> Use the Previous/Next buttons to navigate through months with devotionals
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <div className="text-2xl font-bold text-gray-800">
              {monthNames[currentMonth]} {currentYear}
            </div>
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-bold text-gray-700 p-2">
                {day}
              </div>
            ))}
            {renderCalendar()}
          </div>

          <div className="mt-6 flex gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
              <span>✓ Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span>🔒 Future (Locked)</span>
            </div>
          </div>
        </div>

        {/* Selected Entry Display */}
        {selectedEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                  <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedEntry.title}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-gray-500">📅 {new Date(selectedEntry.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    {selectedEntry.author && (
                      <p className="text-sm text-emerald-600 font-medium">✍️ {selectedEntry.author}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Font Size Controls */}
                  <button
                    onClick={decreaseFontSize}
                    title="Decrease font size"
                    className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
                  >
                    <Minus size={18} />
                  </button>
                  <button
                    onClick={increaseFontSize}
                    title="Increase font size"
                    className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
                  >
                    <Plus size={18} />
                  </button>
                  {userEmail && (
                    <button
                      onClick={() => markDevotionalComplete(
                        selectedEntry.id,
                        selectedEntry.scheduled_date,
                        !(selectedEntry as any).user_completed
                      )}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm ${
                        (selectedEntry as any).user_completed
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {(selectedEntry as any).user_completed ? (
                        <><CheckCircle2 size={18} /> Completed</>
                      ) : (
                        <><Check size={18} /> Mark Complete</>
                      )}
                    </button>
                  )}
                  <button onClick={() => setSelectedEntry(null)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Cover Photo */}
                <img 
                  src={selectedEntry.cover_photo_url || 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778325513092_71fqsh.jpeg'} 
                  alt={selectedEntry.title}
                  className="w-full rounded-2xl shadow-md object-cover max-h-64"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1778325513092_71fqsh.jpeg'; }}
                />

                {/* Main Scripture */}
                {selectedEntry.scripture_book && (
                  <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
                      <span className="text-white font-semibold text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        Today's Scripture
                      </span>
                      <button onClick={() => navigateToVerse(selectedEntry.scripture_book, selectedEntry.scripture_chapter, 1)}
                        className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all">
                        Full Chapter →
                      </button>
                    </div>
                    <div className="bg-blue-50 px-4 py-4">
                      <button onClick={() => openVerse({ book: selectedEntry.scripture_book, chapter: selectedEntry.scripture_chapter, verse: selectedEntry.scripture_verse, display: `${selectedEntry.scripture_book} ${selectedEntry.scripture_chapter}:${selectedEntry.scripture_verse}` })}
                        className={`font-bold text-blue-700 hover:text-blue-900 hover:underline ${textSizes.body} mb-2 block transition-colors`}>
                        {selectedEntry.scripture_book} {selectedEntry.scripture_chapter}:{selectedEntry.scripture_verse}
                      </button>
                      {selectedEntry.scripture_quotation && (
                        <ScriptureHtml html={selectedEntry.scripture_quotation} onVerseClick={openVerse} className={`text-gray-700 italic leading-relaxed ${textSizes.body}`} />
                      )}
                    </div>
                  </div>
                )}

                {/* Language Toggle for Devotional */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-semibold">Translation:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDevotionalLang('both')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          devotionalLang === 'both'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        BOTH
                      </button>
                      <button
                        onClick={() => setDevotionalLang('en')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          devotionalLang === 'en'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setDevotionalLang('lu')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          devotionalLang === 'lu'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        LUG
                      </button>
                    </div>
                  </div>
                </div>

                {/* Devotional Content */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-l-4 border-amber-400 shadow-sm">
                  <h3 className="text-xl font-bold text-amber-600 mb-4 flex items-center gap-2">
                    📖 Devotional Message
                  </h3>
                  {(devotionalLang === 'both' || devotionalLang === 'en') && selectedEntry.devotional_text && (
                    <div className="mb-6">
                      {devotionalLang === 'both' && <div className={`text-amber-700 font-semibold mb-3 ${textSizes.label} uppercase tracking-wide`}>English:</div>}
                      <ScriptureHtml html={selectedEntry.devotional_text} onVerseClick={openVerse} className={`text-gray-800 leading-relaxed ${textSizes.body}`} />
                    </div>
                  )}
                  {(devotionalLang === 'both' || devotionalLang === 'lu') && (selectedEntry as any).devotional_text_lu && (
                    <div>
                      {devotionalLang === 'both' && <div className={`text-amber-700 font-semibold mb-3 mt-6 ${textSizes.label} uppercase tracking-wide border-t border-amber-200 pt-6`}>Luganda:</div>}
                      <ScriptureHtml html={(selectedEntry as any).devotional_text_lu} onVerseClick={openVerse} className={`text-gray-800 leading-relaxed ${textSizes.body}`} />
                    </div>
                  )}
                  {(devotionalLang === 'lu') && !(selectedEntry as any).devotional_text_lu && (
                    <div className="text-gray-500 italic text-center py-8">Luganda translation not available for this devotional</div>
                  )}
                </div>

                {/* Further Readings - Parse and make clickable */}
                {parsedFurtherReadings && parsedFurtherReadings.length > 0 && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 border-l-4 border-teal-400 shadow-sm">
                    <h3 className={`${textSizes.heading} font-bold text-teal-600 mb-4 flex items-center gap-2`}>
                      🔗 Further Readings
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {parsedFurtherReadings.map((ref: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => openVerse({ book: ref.book, chapter: ref.chapter, verse: ref.verse, display: ref.display })}
                          className={`px-4 py-2 bg-teal-100 hover:bg-teal-200 border-2 border-teal-400 text-teal-700 font-semibold rounded-xl transition-all hover:shadow-md ${textSizes.body}`}
                        >
                          {ref.display}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Scriptures */}
                {selectedEntry.related_scriptures && Array.isArray(selectedEntry.related_scriptures) && selectedEntry.related_scriptures.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-l-4 border-green-400 shadow-sm">
                    <h3 className={`${textSizes.heading} font-bold text-green-600 mb-4 flex items-center gap-2`}>
                      📚 Related Scriptures
                    </h3>
                    <div className="space-y-3">
                      {(selectedEntry.related_scriptures || []).map((scripture: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all">
                          <button
                            onClick={() => openVerse({ book: scripture.book, chapter: scripture.chapter, verse: scripture.verse, display: `${scripture.book} ${scripture.chapter}:${scripture.verse}` })}
                            className={`font-semibold text-green-600 hover:text-green-800 mb-2 block underline ${textSizes.body}`}
                          >
                            📖 {scripture.book} {scripture.chapter}:{scripture.verse}
                          </button>
                          {scripture.text && (
                            <ScriptureHtml html={`"${scripture.text}"`} onVerseClick={openVerse} className={`text-gray-700 italic ${textSizes.body}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Media Share Buttons - Icons Only */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Share2 size={13} /> Share
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button title="WhatsApp" onClick={() => shareDevotional("whatsapp")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    </button>
                    <button title="Facebook" onClick={() => shareDevotional("facebook")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </button>
                    <button title="Twitter" onClick={() => shareDevotional("twitter")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-sky-500 hover:bg-sky-600 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    </button>
                    <button title="Telegram" onClick={() => shareDevotional("telegram")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-[#229ED9] hover:bg-[#1a8bc2] text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    </button>
                    <button title="LinkedIn" onClick={() => shareDevotional("linkedin")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0A66C2] hover:bg-[#084e96] text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <Linkedin size={18} />
                    </button>
                    <button title="Email" onClick={() => shareDevotional("email")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <Mail size={18} />
                    </button>
                    <button title="Copy Link" onClick={() => shareDevotional("copy")}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white transition-all shadow hover:shadow-md hover:scale-110">
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ScriptureVersePopup popup={scripturePopup} onClose={closeScripturePopup} />
      </div>
    </div>
  );
}
