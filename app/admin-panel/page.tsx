'use client';

import { useState, useEffect } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import DevotionalManagement from '../components/DevotionalManagement';
import RichTextEditor from '../components/RichTextEditor';
import { Pencil, Trash2, Plus, BookOpen, Users, Globe, MessageSquare, Music, Save, Edit2 } from 'lucide-react';

interface Book {
  id: number;
  book_number: number;
  name: string;
  abbreviation: string;
  testament: string;
  total_chapters: number;
}

interface Verse {
  id: number;
  book_number: number;
  book_name: string;
  chapter: number;
  verse_number: number;
  english_text: string;
  luganda_text: string;
}

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState<'bible-content' | 'book-intro' | 'chapter-intro' | 'outline' | 'prayer-passage' | 'book-closing-prayer' | 'chapter-closing-prayer' | 'commentary' | 'cross-reference' | 'devotional' | 'verse-songs' | 'theological-insights' | 'historical-context' | 'dashboard' | 'user-management' | 'settings'>('bible-content');
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [lugandaText, setLugandaText] = useState('');
  const [message, setMessage] = useState('');
  const [isLoadingOnMount, setIsLoadingOnMount] = useState(true);

  // User Management states
  const [users, setUsers] = useState<any[]>([]);
  const [allUsersData, setAllUsersData] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [messageFilter, setMessageFilter] = useState('all');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingVerse, setSavingVerse] = useState(false);
  const [verseSaveStatus, setVerseSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [verseSaveError, setVersionSaveError] = useState('');

  // Historical Content states
  const [historicalBg, setHistoricalBg] = useState('');
  const [historicalCulture, setHistoricalCulture] = useState('');
  const [historicalMaps, setHistoricalMaps] = useState('');
  const [historicalTimeline, setHistoricalTimeline] = useState('');
  const [historicalArchaeology, setHistoricalArchaeology] = useState('');
  const [savingHistoricalContent, setSavingHistoricalContent] = useState(false);
  const [historicalContentData, setHistoricalContentData] = useState<any>(null);
  const [loadingHistoricalContent, setLoadingHistoricalContent] = useState(false);
  const [editingHistoricalId, setEditingHistoricalId] = useState<number | null>(null);
  const [historicalScope, setHistoricalScope] = useState<'book' | 'chapter'>('book');

  const [englishTheologicalInsight, setEnglishTheologicalInsight] = useState('');
  const [lugandaTheologicalInsight, setLugandaTheologicalInsight] = useState('');
  const [savingTheologicalInsight, setSavingTheologicalInsight] = useState(false);
  const [theologicalInsights, setTheologicalInsights] = useState<any[]>([]);
  const [loadingTheologicalInsights, setLoadingTheologicalInsights] = useState(false);
  const [editingTheologicalInsightId, setEditingTheologicalInsightId] = useState<number | null>(null);

  // Verse-Songs states
  const [verseSongSeries, setVerseSongSeries] = useState<any[]>([]);
  const [verseSongs, setVerseSongs] = useState<any[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesDescription, setSeriesDescription] = useState('');
  const [seriesThumbnail, setSeriesThumbnail] = useState('');
  const [seriesFeatured, setSeriesFeatured] = useState(false);
  const [seriesDisplayOrder, setSeriesDisplayOrder] = useState('0');
  const [songTitle, setSongTitle] = useState('');
  const [songDescription, setSongDescription] = useState('');
  const [songMp3Url, setSongMp3Url] = useState('');
  const [songThumbnail, setSongThumbnail] = useState('');
  const [songDuration, setSongDuration] = useState('');
  const [songPublished, setSongPublished] = useState(true);
  const [savingVerseSong, setSavingVerseSong] = useState(false);
  const [savingSeries, setSavingSeries] = useState(false);
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [editingSeriesId, setEditingSeriesId] = useState<number | null>(null);

  // Verse content states
  const [englishVersePrayer, setEnglishVersePrayer] = useState('');
  const [lugandaVersePrayer, setLugandaVersePrayer] = useState('');
  const [englishVerseNote, setEnglishVerseNote] = useState('');
  const [lugandaVerseNote, setLugandaVerseNote] = useState('');
  const [englishCommentary, setEnglishCommentary] = useState('');
  const [lugandaCommentary, setLugandaCommentary] = useState('');
  const [filteredVerses, setFilteredVerses] = useState<Verse[]>([]);
  const [displayedVersesCount, setDisplayedVersesCount] = useState(50);
  const [importMessage, setImportMessage] = useState('');
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importLanguageOverride, setImportLanguageOverride] = useState<'auto' | 'luganda' | 'english'>('auto');
  const [importStats, setImportStats] = useState<any>(null);

  // Book Introduction states
  const [bookIntroEn, setBookIntroEn] = useState('');
  const [bookIntroLu, setBookIntroLu] = useState('');
  const [bookIntroAudioUrl, setBookIntroAudioUrl] = useState('');
  const [savingBookIntro, setSavingBookIntro] = useState(false);
  const [editingBookIntroId, setEditingBookIntroId] = useState<number | null>(null);
  const [bookIntroductions, setBookIntroductions] = useState<any[]>([]);
  const [loadingBookIntros, setLoadingBookIntros] = useState(false);

  // Chapter Introduction states
  const [chapterIntroEn, setChapterIntroEn] = useState('');
  const [chapterIntroLu, setChapterIntroLu] = useState('');
  const [chapterIntroAudioUrl, setChapterIntroAudioUrl] = useState('');
  const [savingChapterIntro, setSavingChapterIntro] = useState(false);
  const [editingChapterIntroId, setEditingChapterIntroId] = useState<number | null>(null);
  const [chapterIntroductions, setChapterIntroductions] = useState<any[]>([]);
  const [loadingChapterIntros, setLoadingChapterIntros] = useState(false);

  // Outline states
  const [outlineTitle, setOutlineTitle] = useState('');
  const [outlineContent, setOutlineContent] = useState('');
  const [outlineLanguage, setOutlineLanguage] = useState('english');
  const [outlineType, setOutlineType] = useState<'book' | 'chapter'>('book');
  const [savingOutline, setSavingOutline] = useState(false);
  const [outlines, setOutlines] = useState<any[]>([]);
  const [loadingOutlines, setLoadingOutlines] = useState(false);
  const [editingOutlineId, setEditingOutlineId] = useState<number | null>(null);

  // Prayer Passage states
  const [prayerPassageEn, setPrayerPassageEn] = useState('');
  const [prayerPassageLu, setPrayerPassageLu] = useState('');
  const [savingPrayerPassage, setSavingPrayerPassage] = useState(false);
  const [editingPrayerPassageId, setEditingPrayerPassageId] = useState<number | null>(null);
  const [prayerPassages, setPrayerPassages] = useState<any[]>([]);
  const [loadingPrayerPassages, setLoadingPrayerPassages] = useState(false);

  // Book Closing Prayer states
  const [bookClosingPrayerEn, setBookClosingPrayerEn] = useState('');
  const [bookClosingPrayerLu, setBookClosingPrayerLu] = useState('');
  const [bookClosingPrayerAudioUrl, setBookClosingPrayerAudioUrl] = useState('');
  const [savingBookClosingPrayer, setSavingBookClosingPrayer] = useState(false);
  const [editingBookClosingPrayerId, setEditingBookClosingPrayerId] = useState<number | null>(null);
  const [bookClosingPrayers, setBookClosingPrayers] = useState<any[]>([]);
  const [loadingBookClosingPrayers, setLoadingBookClosingPrayers] = useState(false);

  // Chapter Closing Prayer states
  const [chapterClosingPrayerEn, setChapterClosingPrayerEn] = useState('');
  const [chapterClosingPrayerLu, setChapterClosingPrayerLu] = useState('');
  const [chapterClosingPrayerAudioUrl, setChapterClosingPrayerAudioUrl] = useState('');
  const [savingChapterClosingPrayer, setSavingChapterClosingPrayer] = useState(false);
  const [editingChapterClosingPrayerId, setEditingChapterClosingPrayerId] = useState<number | null>(null);
  const [chapterClosingPrayers, setChapterClosingPrayers] = useState<any[]>([]);
  const [loadingChapterClosingPrayers, setLoadingChapterClosingPrayers] = useState(false);

  // Commentary states
  const [bookCommentaryEn, setBookCommentaryEn] = useState('');
  const [bookCommentaryLu, setBookCommentaryLu] = useState('');
  const [bookCommentaries, setBookCommentaries] = useState<any[]>([]);
  const [loadingBookCommentaries, setLoadingBookCommentaries] = useState(false);
  const [savingBookCommentary, setSavingBookCommentary] = useState(false);
  const [editingBookCommentaryId, setEditingBookCommentaryId] = useState<number | null>(null);

  const [chapterCommentaryEn, setChapterCommentaryEn] = useState('');
  const [chapterCommentaryLu, setChapterCommentaryLu] = useState('');
  const [chapterCommentaries, setChapterCommentaries] = useState<any[]>([]);
  const [loadingChapterCommentaries, setLoadingChapterCommentaries] = useState(false);
  const [savingChapterCommentary, setSavingChapterCommentary] = useState(false);
  const [editingChapterCommentaryId, setEditingChapterCommentaryId] = useState<number | null>(null);

  const [verseCommentaryEn, setVerseCommentaryEn] = useState('');
  const [verseCommentaryLu, setVerseCommentaryLu] = useState('');
  const [verseCommentaries, setVerseCommentaries] = useState<any[]>([]);
  const [loadingVerseCommentaries, setLoadingVerseCommentaries] = useState(false);
  const [savingVerseCommentary, setSavingVerseCommentary] = useState(false);
  const [editingVerseCommentaryId, setEditingVerseCommentaryId] = useState<number | null>(null);
  const [commentaryType, setCommentaryType] = useState<'book' | 'chapter' | 'verse'>('book');



  useEffect(() => {
    const loadAllData = async () => {
      setIsLoadingOnMount(true);
      try {
        await Promise.all([
          fetchBooks(),
          fetchVerses(),
          fetchAdminEmail(),
          fetchDashboardStats(),
          fetchUsers(),
          fetchContactMessages(),
          fetchVerseSongSeries(),
          fetchVerseSongs()
        ]);
        setMessage('✅ All data loaded successfully');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('Error loading data:', error);
        setMessage('❌ Error loading data');
      } finally {
        setIsLoadingOnMount(false);
      }
    };
    loadAllData();
  }, []);

  const fetchAdminEmail = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.admin) setAdminEmail(data.admin.email);
      }
    } catch (error) {
      console.error('Error fetching admin email:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/bible-books?full=true');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      
      const mappedBooks = Array.isArray(data) ? data.map((book: any) => ({
        id: book.id,
        book_number: book.book_number,
        name: book.name_english || 'Unknown Book',
        abbreviation: book.abbreviation_english || '',
        testament: book.testament || '',
        total_chapters: book.total_chapters || 0
      })) : [];
      
      setBooks(mappedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    }
  };

  const fetchVerses = async () => {
    try {
      const res = await fetch('/api/bible-verses?recent=10');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      const versesList = Array.isArray(data.verses) ? data.verses : [];
      setVerses(versesList);
      setFilteredVerses(versesList);
    } catch (error) {
      console.error('Error fetching verses:', error);
    }
  };

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/dashboard-stats');
      if (res.ok) {
        setDashboardStats(await res.json());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async (search = userSearch, status = userStatusFilter) => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({ search, status });
      const res = await fetch(`/api/admin-users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAllUsersData(data);
        setUsers(data.users || []);
        setActiveSessions(data.activeSessions || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch('/api/admin-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        setMessage(`✅ User ${action}d successfully`);
        await fetchUsers();
      }
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchContactMessages = async () => {
    try {
      const res = await fetch('/api/contact');
      if (res.ok) {
        const msg = await res.json();
        setContactMessages(Array.isArray(msg) ? msg : []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchVerseSongSeries = async () => {
    try {
      const res = await fetch('/api/verse-song-series');
      if (res.ok) {
        setVerseSongSeries(await res.json());
      }
    } catch (error) {
      console.error('Error fetching series:', error);
    }
  };

  const fetchVerseSongs = async () => {
    try {
      const res = await fetch('/api/verse-songs');
      if (res.ok) {
        setVerseSongs(await res.json());
      }
    } catch (error) {
      console.error('Error fetching verse songs:', error);
    }
  };

  const fetchPrayerPassages = async () => {
    if (!selectedBook || !chapter) return;
    
    setLoadingPrayerPassages(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingPrayerPassages(false);
        return;
      }

      const res = await fetch(`/api/verse-prayers?bookId=${bookData.id}&chapter=${chapter}`);
      if (res.ok) {
        setPrayerPassages(await res.json());
      }
    } catch (error) {
      console.error('Error fetching prayer passages:', error);
    } finally {
      setLoadingPrayerPassages(false);
    }
  };

  const fetchBookIntroductions = async () => {
    if (!selectedBook) return;
    
    setLoadingBookIntros(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingBookIntros(false);
        return;
      }

      const res = await fetch(`/api/book-introductions?bookId=${bookData.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookIntroductions(data ? [data] : []);
      }
    } catch (error) {
      console.error('Error fetching book introductions:', error);
    } finally {
      setLoadingBookIntros(false);
    }
  };

  const fetchChapterIntroductions = async () => {
    if (!selectedBook || !chapter) return;
    
    setLoadingChapterIntros(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingChapterIntros(false);
        return;
      }

      const res = await fetch(`/api/chapter-introductions?bookId=${bookData.id}&chapter=${chapter}`);
      if (res.ok) {
        const data = await res.json();
        setChapterIntroductions(data ? [data] : []);
      }
    } catch (error) {
      console.error('Error fetching chapter introductions:', error);
    } finally {
      setLoadingChapterIntros(false);
    }
  };

  // Book Commentary
  const fetchBookCommentaries = async () => {
    if (!selectedBook) return;
    
    setLoadingBookCommentaries(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingBookCommentaries(false);
        return;
      }

      const res = await fetch(`/api/book-commentaries?bookId=${bookData.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookCommentaries(data ? [data] : []);
      }
    } catch (error) {
      console.error('Error fetching book commentaries:', error);
    } finally {
      setLoadingBookCommentaries(false);
    }
  };

  const saveBookCommentary = async () => {
    if (!selectedBook || (!bookCommentaryEn.trim() && !bookCommentaryLu.trim())) {
      setMessage('❌ Please select a book and enter commentary text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingBookCommentary(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/book-commentaries', {
        method: editingBookCommentaryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingBookCommentaryId && { id: editingBookCommentaryId }),
          book_id: bookData.id,
          english_commentary: bookCommentaryEn,
          luganda_commentary: bookCommentaryLu
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingBookCommentaryId ? '✅ Book commentary updated!' : '✅ Book commentary saved!');
      setBookCommentaryEn('');
      setBookCommentaryLu('');
      setEditingBookCommentaryId(null);
      await fetchBookCommentaries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingBookCommentary(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editBookCommentary = (commentary: any) => {
    setBookCommentaryEn(commentary.english_commentary || '');
    setBookCommentaryLu(commentary.luganda_commentary || '');
    setEditingBookCommentaryId(commentary.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBookCommentary = async (id: number) => {
    if (!confirm('Delete this book commentary?')) return;
    try {
      const res = await fetch(`/api/book-commentaries?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Book commentary deleted!');
      await fetchBookCommentaries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditBookCommentary = () => {
    setEditingBookCommentaryId(null);
    setBookCommentaryEn('');
    setBookCommentaryLu('');
  };

  // Chapter Commentary
  const fetchChapterCommentaries = async () => {
    if (!selectedBook || !chapter) return;
    
    setLoadingChapterCommentaries(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingChapterCommentaries(false);
        return;
      }

      const res = await fetch(`/api/chapter-commentaries?bookId=${bookData.id}&chapter=${chapter}`);
      if (res.ok) {
        const data = await res.json();
        setChapterCommentaries(data ? [data] : []);
      }
    } catch (error) {
      console.error('Error fetching chapter commentaries:', error);
    } finally {
      setLoadingChapterCommentaries(false);
    }
  };

  const saveChapterCommentary = async () => {
    if (!selectedBook || !chapter || (!chapterCommentaryEn.trim() && !chapterCommentaryLu.trim())) {
      setMessage('❌ Please select book, chapter and enter commentary text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingChapterCommentary(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/chapter-commentaries', {
        method: editingChapterCommentaryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingChapterCommentaryId && { id: editingChapterCommentaryId }),
          book_id: bookData.id,
          chapter: parseInt(chapter),
          english_commentary: chapterCommentaryEn,
          luganda_commentary: chapterCommentaryLu
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingChapterCommentaryId ? '✅ Chapter commentary updated!' : '✅ Chapter commentary saved!');
      setChapterCommentaryEn('');
      setChapterCommentaryLu('');
      setEditingChapterCommentaryId(null);
      await fetchChapterCommentaries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingChapterCommentary(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editChapterCommentary = (commentary: any) => {
    setChapterCommentaryEn(commentary.english_commentary || '');
    setChapterCommentaryLu(commentary.luganda_commentary || '');
    setEditingChapterCommentaryId(commentary.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteChapterCommentary = async (id: number) => {
    if (!confirm('Delete this chapter commentary?')) return;
    try {
      const res = await fetch(`/api/chapter-commentaries?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Chapter commentary deleted!');
      await fetchChapterCommentaries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditChapterCommentary = () => {
    setEditingChapterCommentaryId(null);
    setChapterCommentaryEn('');
    setChapterCommentaryLu('');
  };

  // Verse Commentary
  const fetchVerseCommentaries = async () => {
    if (!selectedBook || !chapter) return;
    
    setLoadingVerseCommentaries(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingVerseCommentaries(false);
        return;
      }

      const res = await fetch(`/api/verse-commentaries?bookId=${bookData.id}&chapter=${chapter}`);
      if (res.ok) {
        setVerseCommentaries(await res.json());
      }
    } catch (error) {
      console.error('Error fetching verse commentaries:', error);
    } finally {
      setLoadingVerseCommentaries(false);
    }
  };

  const saveVerseCommentary = async () => {
    if (!selectedBook || !chapter || !verseNumber || (!verseCommentaryEn.trim() && !verseCommentaryLu.trim())) {
      setMessage('❌ Please select verse and enter commentary text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingVerseCommentary(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/verse-commentaries', {
        method: editingVerseCommentaryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingVerseCommentaryId && { id: editingVerseCommentaryId }),
          book_id: bookData.id,
          chapter: parseInt(chapter),
          verse_number: parseInt(verseNumber),
          commentary_text: verseCommentaryEn,
          luganda_commentary_text: verseCommentaryLu
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingVerseCommentaryId ? '✅ Verse commentary updated!' : '✅ Verse commentary saved!');
      setVerseCommentaryEn('');
      setVerseCommentaryLu('');
      setVerseNumber('');
      setEditingVerseCommentaryId(null);
      await fetchVerseCommentaries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingVerseCommentary(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editVerseCommentary = (commentary: any) => {
    setVerseNumber(String(commentary.verse_number));
    setVerseCommentaryEn(commentary.commentary_text || '');
    setVerseCommentaryLu(commentary.luganda_commentary_text || '');
    setEditingVerseCommentaryId(commentary.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteVerseCommentary = async (id: number) => {
    if (!confirm('Delete this verse commentary?')) return;
    try {
      const res = await fetch(`/api/verse-commentaries?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Verse commentary deleted!');
      await fetchVerseCommentaries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditVerseCommentary = () => {
    setEditingVerseCommentaryId(null);
    setVerseCommentaryEn('');
    setVerseCommentaryLu('');
    setVerseNumber('');
  };

  const fetchOutlines = async () => {
    if (!selectedBook) return;
    
    setLoadingOutlines(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingOutlines(false);
        return;
      }

      const params = `book_id=${bookData.id}&language=${outlineLanguage}`;
      const chapterParam = outlineType === 'chapter' && chapter ? `&chapter=${chapter}` : '';
      
      const res = await fetch(`/api/outlines?${params}${chapterParam}`);
      if (res.ok) {
        setOutlines(await res.json());
      }
    } catch (error) {
      console.error('Error fetching outlines:', error);
    } finally {
      setLoadingOutlines(false);
    }
  };

  // Book Introduction
  const saveBookIntro = async () => {
    if (!selectedBook || (!bookIntroEn.trim() && !bookIntroLu.trim())) {
      setMessage('❌ Please select a book and enter introduction text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingBookIntro(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/book-introductions', {
        method: editingBookIntroId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingBookIntroId && { id: editingBookIntroId }),
          book_id: bookData.id,
          en_introduction: bookIntroEn,
          lu_introduction: bookIntroLu,
          audio_url: bookIntroAudioUrl
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingBookIntroId ? '✅ Book introduction updated!' : '✅ Book introduction saved!');
      setBookIntroEn('');
      setBookIntroLu('');
      setBookIntroAudioUrl('');
      setEditingBookIntroId(null);
      await fetchBookIntroductions();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingBookIntro(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Chapter Introduction
  const saveChapterIntro = async () => {
    if (!selectedBook || !chapter || (!chapterIntroEn.trim() && !chapterIntroLu.trim())) {
      setMessage('❌ Please select book, chapter and enter introduction text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingChapterIntro(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/chapter-introductions', {
        method: editingChapterIntroId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingChapterIntroId && { id: editingChapterIntroId }),
          book_id: bookData.id,
          chapter: parseInt(chapter),
          en_introduction: chapterIntroEn,
          lu_introduction: chapterIntroLu,
          audio_url: chapterIntroAudioUrl
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingChapterIntroId ? '✅ Chapter introduction updated!' : '✅ Chapter introduction saved!');
      setChapterIntroEn('');
      setChapterIntroLu('');
      setChapterIntroAudioUrl('');
      setEditingChapterIntroId(null);
      await fetchChapterIntroductions();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingChapterIntro(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Prayer Passage
  const savePrayerPassage = async () => {
    if (!selectedBook || !chapter || !verseNumber || (!prayerPassageEn.trim() && !prayerPassageLu.trim())) {
      setMessage('❌ Please select verse and enter prayer passage text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingPrayerPassage(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/verse-prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookData.id,
          chapter: parseInt(chapter),
          verse_number: parseInt(verseNumber),
          english_prayer: prayerPassageEn,
          luganda_prayer: prayerPassageLu
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || `Failed: ${res.status}`);
      }
      
      setMessage(editingPrayerPassageId ? '✅ Prayer passage updated!' : '✅ Prayer passage saved!');
      setPrayerPassageEn('');
      setPrayerPassageLu('');
      setEditingPrayerPassageId(null);
      await fetchPrayerPassages();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingPrayerPassage(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editPrayerPassage = (prayer: any) => {
    setVerseNumber(String(prayer.verse_number));
    setPrayerPassageEn(prayer.english_prayer || '');
    setPrayerPassageLu(prayer.luganda_prayer || '');
    setEditingPrayerPassageId(prayer.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePrayerPassage = async (id: number) => {
    if (!confirm('Delete this prayer passage?')) return;
    try {
      const res = await fetch(`/api/verse-prayers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Prayer passage deleted!');
      await fetchPrayerPassages();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditPrayerPassage = () => {
    setEditingPrayerPassageId(null);
    setPrayerPassageEn('');
    setPrayerPassageLu('');
    setVerseNumber('');
  };

  const editBookIntro = (intro: any) => {
    setBookIntroEn(intro.en_introduction || '');
    setBookIntroLu(intro.lu_introduction || '');
    setBookIntroAudioUrl(intro.audio_url || '');
    setEditingBookIntroId(intro.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBookIntro = async (id: number) => {
    if (!confirm('Delete this book introduction?')) return;
    try {
      const res = await fetch(`/api/book-introductions?bookId=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Book introduction deleted!');
      await fetchBookIntroductions();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditBookIntro = () => {
    setEditingBookIntroId(null);
    setBookIntroEn('');
    setBookIntroLu('');
    setBookIntroAudioUrl('');
  };

  const editChapterIntro = (intro: any) => {
    setChapterIntroEn(intro.en_introduction || '');
    setChapterIntroLu(intro.lu_introduction || '');
    setChapterIntroAudioUrl(intro.audio_url || '');
    setEditingChapterIntroId(intro.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Book Closing Prayer
  const fetchBookClosingPrayers = async () => {
    if (!selectedBook) return;
    
    setLoadingBookClosingPrayers(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingBookClosingPrayers(false);
        return;
      }

      const res = await fetch(`/api/book-prayers?bookId=${bookData.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookClosingPrayers(data ? [data] : []);
      }
    } catch (error) {
      console.error('Error fetching book closing prayers:', error);
    } finally {
      setLoadingBookClosingPrayers(false);
    }
  };

  const saveBookClosingPrayer = async () => {
    if (!selectedBook || (!bookClosingPrayerEn.trim() && !bookClosingPrayerLu.trim())) {
      setMessage('❌ Please select a book and enter prayer text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingBookClosingPrayer(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/book-prayers', {
        method: editingBookClosingPrayerId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingBookClosingPrayerId && { id: editingBookClosingPrayerId }),
          book_id: bookData.id,
          en_prayer: bookClosingPrayerEn,
          lu_prayer: bookClosingPrayerLu,
          closing_prayer_audio_url: bookClosingPrayerAudioUrl
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingBookClosingPrayerId ? '✅ Book closing prayer updated!' : '✅ Book closing prayer saved!');
      setBookClosingPrayerEn('');
      setBookClosingPrayerLu('');
      setBookClosingPrayerAudioUrl('');
      setEditingBookClosingPrayerId(null);
      await fetchBookClosingPrayers();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingBookClosingPrayer(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editBookClosingPrayer = (prayer: any) => {
    setBookClosingPrayerEn(prayer.en_prayer || '');
    setBookClosingPrayerLu(prayer.lu_prayer || '');
    setBookClosingPrayerAudioUrl(prayer.closing_prayer_audio_url || '');
    setEditingBookClosingPrayerId(prayer.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBookClosingPrayer = async (id: number) => {
    if (!confirm('Delete this book closing prayer?')) return;
    try {
      const res = await fetch(`/api/book-prayers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Book closing prayer deleted!');
      await fetchBookClosingPrayers();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditBookClosingPrayer = () => {
    setEditingBookClosingPrayerId(null);
    setBookClosingPrayerEn('');
    setBookClosingPrayerLu('');
    setBookClosingPrayerAudioUrl('');
  };

  // Chapter Closing Prayer
  const fetchChapterClosingPrayers = async () => {
    if (!selectedBook || !chapter) return;
    
    setLoadingChapterClosingPrayers(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingChapterClosingPrayers(false);
        return;
      }

      const res = await fetch(`/api/chapter-prayers?bookId=${bookData.id}&chapter=${chapter}`);
      if (res.ok) {
        const data = await res.json();
        setChapterClosingPrayers(data ? [data] : []);
      }
    } catch (error) {
      console.error('Error fetching chapter closing prayers:', error);
    } finally {
      setLoadingChapterClosingPrayers(false);
    }
  };

  const saveChapterClosingPrayer = async () => {
    if (!selectedBook || !chapter || (!chapterClosingPrayerEn.trim() && !chapterClosingPrayerLu.trim())) {
      setMessage('❌ Please select book, chapter and enter prayer text');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingChapterClosingPrayer(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/chapter-prayers', {
        method: editingChapterClosingPrayerId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingChapterClosingPrayerId && { id: editingChapterClosingPrayerId }),
          book_id: bookData.id,
          chapter: parseInt(chapter),
          en_prayer: chapterClosingPrayerEn,
          lu_prayer: chapterClosingPrayerLu,
          chapter_closing_prayer_audio_url: chapterClosingPrayerAudioUrl
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingChapterClosingPrayerId ? '✅ Chapter closing prayer updated!' : '✅ Chapter closing prayer saved!');
      setChapterClosingPrayerEn('');
      setChapterClosingPrayerLu('');
      setChapterClosingPrayerAudioUrl('');
      setEditingChapterClosingPrayerId(null);
      await fetchChapterClosingPrayers();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingChapterClosingPrayer(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editChapterClosingPrayer = (prayer: any) => {
    setChapterClosingPrayerEn(prayer.en_prayer || '');
    setChapterClosingPrayerLu(prayer.lu_prayer || '');
    setChapterClosingPrayerAudioUrl(prayer.chapter_closing_prayer_audio_url || '');
    setEditingChapterClosingPrayerId(prayer.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteChapterClosingPrayer = async (id: number) => {
    if (!confirm('Delete this chapter closing prayer?')) return;
    try {
      const res = await fetch(`/api/chapter-prayers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Chapter closing prayer deleted!');
      await fetchChapterClosingPrayers();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditChapterClosingPrayer = () => {
    setEditingChapterClosingPrayerId(null);
    setChapterClosingPrayerEn('');
    setChapterClosingPrayerLu('');
    setChapterClosingPrayerAudioUrl('');
  };

  const deleteChapterIntro = async (id: number) => {
    if (!confirm('Delete this chapter introduction?')) return;
    try {
      const res = await fetch(`/api/chapter-introductions?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Chapter introduction deleted!');
      await fetchChapterIntroductions();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditChapterIntro = () => {
    setEditingChapterIntroId(null);
    setChapterIntroEn('');
    setChapterIntroLu('');
    setChapterIntroAudioUrl('');
  };

  // Outline functions
  const saveOutline = async () => {
    if (!selectedBook || !outlineTitle.trim() || !outlineContent.trim()) {
      setMessage('❌ Please fill in all required fields (Book, Title, Content)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (outlineType === 'chapter' && !chapter) {
      setMessage('❌ Please select a chapter for chapter outline');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingOutline(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');
      
      const res = await fetch('/api/outlines', {
        method: editingOutlineId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingOutlineId && { id: editingOutlineId }),
          book_id: bookData.id,
          chapter: outlineType === 'chapter' ? parseInt(chapter) : null,
          title: outlineTitle,
          content: outlineContent,
          language: outlineLanguage,
          order_index: 0
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }
      
      setMessage(editingOutlineId ? '✅ Outline updated!' : '✅ Outline saved!');
      setOutlineTitle('');
      setOutlineContent('');
      setEditingOutlineId(null);
      await fetchOutlines();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingOutline(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editOutline = (outline: any) => {
    setOutlineTitle(outline.title || '');
    setOutlineContent(outline.content || '');
    setEditingOutlineId(outline.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteOutline = async (id: number) => {
    if (!confirm('Delete this outline?')) return;
    try {
      const res = await fetch(`/api/outlines?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Outline deleted!');
      await fetchOutlines();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditOutline = () => {
    setEditingOutlineId(null);
    setOutlineTitle('');
    setOutlineContent('');
  };



  const saveSeries = async () => {
    if (!seriesTitle.trim()) {
      setMessage('❌ Please enter series title');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingSeries(true);
    try {
      const payload = {
        title: seriesTitle,
        description: seriesDescription || null,
        thumbnail: seriesThumbnail || null,
        is_featured: seriesFeatured,
        display_order: parseInt(seriesDisplayOrder) || 0
      };

      const res = await fetch('/api/verse-song-series', {
        method: editingSeriesId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSeriesId ? { ...payload, id: editingSeriesId } : payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }

      setMessage(editingSeriesId ? '✅ Series updated successfully!' : '✅ Series created successfully!');
      setSeriesTitle('');
      setSeriesDescription('');
      setSeriesThumbnail('');
      setSeriesFeatured(false);
      setSeriesDisplayOrder('0');
      setEditingSeriesId(null);
      fetchVerseSongSeries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingSeries(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editSeries = (series: any) => {
    setEditingSeriesId(series.id);
    setSeriesTitle(series.title);
    setSeriesDescription(series.description || '');
    setSeriesThumbnail(series.thumbnail || '');
    setSeriesFeatured(series.is_featured);
    setSeriesDisplayOrder(String(series.display_order || 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditSeries = () => {
    setEditingSeriesId(null);
    setSeriesTitle('');
    setSeriesDescription('');
    setSeriesThumbnail('');
    setSeriesFeatured(false);
    setSeriesDisplayOrder('0');
  };

  const fetchTheologicalInsights = async () => {
    if (!selectedBook || !chapter) return;
    
    setLoadingTheologicalInsights(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) {
        setLoadingTheologicalInsights(false);
        return;
      }

      const res = await fetch(`/api/verse-theological-insights?bookId=${bookData.id}&chapter=${chapter}`);
      if (res.ok) {
        setTheologicalInsights(await res.json());
      }
    } catch (error) {
      console.error('Error fetching theological insights:', error);
    } finally {
      setLoadingTheologicalInsights(false);
    }
  };

  const saveTheologicalInsight = async () => {
    if (!selectedBook || !chapter || !verseNumber) {
      setMessage('❌ Please select book, chapter, and verse number');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!englishTheologicalInsight.trim() && !lugandaTheologicalInsight.trim()) {
      setMessage('❌ Please enter at least one theological insight (English or Luganda)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingTheologicalInsight(true);
    try {
      const bookData = books.find(b => b.name === selectedBook);
      if (!bookData) throw new Error('Book not found');

      const payload = {
        bookId: bookData.id,
        chapter: parseInt(chapter),
        verseNumber: parseInt(verseNumber),
        englishInsight: englishTheologicalInsight.trim(),
        lugandaInsight: lugandaTheologicalInsight.trim()
      };

      console.log('Sending payload:', payload);

      const res = await fetch('/api/verse-theological-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed with status ${res.status}`);
      }

      setMessage('✅ Theological insight saved successfully!');
      await fetchTheologicalInsights();
      setEnglishTheologicalInsight('');
      setLugandaTheologicalInsight('');
      setVerseNumber('');
      setEditingTheologicalInsightId(null);
    } catch (error) {
      console.error('Error saving theological insight:', error);
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingTheologicalInsight(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editTheologicalInsight = (insight: any) => {
    setVerseNumber(String(insight.verse_number));
    setEnglishTheologicalInsight(insight.english_insight || '');
    setLugandaTheologicalInsight(insight.luganda_insight || '');
    setEditingTheologicalInsightId(insight.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTheologicalInsight = async (id: number) => {
    if (!confirm('Delete this theological insight?')) return;
    try {
      const res = await fetch(`/api/verse-theological-insights?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Theological insight deleted!');
      await fetchTheologicalInsights();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEditTheologicalInsight = () => {
    setEditingTheologicalInsightId(null);
    setEnglishTheologicalInsight('');
    setLugandaTheologicalInsight('');
    setVerseNumber('');
  };

  const saveSong = async () => {
    if (!selectedSeriesId || !songTitle.trim() || !songMp3Url.trim()) {
      setMessage('❌ Please fill in required fields (Series, Title, MP3 URL)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingVerseSong(true);
    try {
      const payload = {
        series_id: parseInt(selectedSeriesId),
        title: songTitle,
        description: songDescription || null,
        mp3_url: songMp3Url,
        thumbnail: songThumbnail || null,
        duration: songDuration ? parseInt(songDuration) : null,
        is_published: songPublished
      };

      const res = await fetch('/api/verse-songs', {
        method: editingSongId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSongId ? { ...payload, id: editingSongId } : payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }

      setMessage(editingSongId ? '✅ Song updated successfully!' : '✅ Song added successfully!');
      setSongTitle('');
      setSongDescription('');
      setSongMp3Url('');
      setSongThumbnail('');
      setSongDuration('');
      setSongPublished(true);
      setEditingSongId(null);
      fetchVerseSongs();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingVerseSong(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editSong = (song: any) => {
    setEditingSongId(song.id);
    setSelectedSeriesId(String(song.series_id));
    setSongTitle(song.title);
    setSongDescription(song.description || '');
    setSongMp3Url(song.mp3_url);
    setSongThumbnail(song.thumbnail || '');
    setSongDuration(song.duration ? String(song.duration) : '');
    setSongPublished(song.is_published);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditSong = () => {
    setEditingSongId(null);
    setSongTitle('');
    setSongDescription('');
    setSongMp3Url('');
    setSongThumbnail('');
    setSongDuration('');
    setSongPublished(true);
  };

  const deleteSeries = async (id: number) => {
    if (!confirm('Delete this series and all its songs?')) return;
    try {
      const res = await fetch(`/api/verse-song-series?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Series deleted!');
      fetchVerseSongSeries();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteSong = async (id: number) => {
    if (!confirm('Delete this song?')) return;
    try {
      const res = await fetch(`/api/verse-songs?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Song deleted!');
      fetchVerseSongs();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const updateAdminPassword = async () => {
    if (!newAdminPassword.trim()) {
      setMessage('❌ Please enter a new password');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setMessage('❌ Passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newAdminPassword })
      });

      if (!res.ok) throw new Error('Failed to update');
      setMessage('✅ Password updated successfully!');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingPassword(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    const loadVerse = async () => {
      if (!selectedBook || !chapter || !verseNumber) return;
      
      try {
        const bookData = books.find(b => b.name === selectedBook);
        if (!bookData) {
          setEnglishText('');
          setLugandaText('');
          setMessage('❌ Book not found');
          setTimeout(() => setMessage(''), 3000);
          return;
        }

        const res = await fetch(`/api/bible-verses?book=${bookData.id}&chapter=${chapter}&verse=${verseNumber}`);
        
        if (!res.ok) {
          setEnglishText('');
          setLugandaText('');
          return;
        }
        
        const data = await res.json();
        if (data.verses && data.verses.length > 0) {
          const verse = data.verses[0];
          const englishVerse = verse.text_english || verse.english_text || '';
          const lugandaVerse = verse.text_luganda || verse.luganda_text || '';
          
          setEnglishText(englishVerse);
          setLugandaText(lugandaVerse);
        } else {
          setEnglishText('');
          setLugandaText('');
        }
      } catch (error) {
        console.error('Error loading verse:', error);
        setEnglishText('');
        setLugandaText('');
      }
    };

    loadVerse();
  }, [selectedBook, chapter, verseNumber, books]);

  const saveVerse = async () => {
    if (!selectedBook || !chapter || !verseNumber) {
      setMessage('❌ Please select book, chapter, and verse');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!englishText.trim() && !lugandaText.trim()) {
      setMessage('❌ Please enter text in at least one language');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSavingVerse(true);
    setVerseSaveStatus('saving');
    
    try {
      const payload = {
        book: selectedBook,
        chapter: parseInt(chapter),
        verse_number: parseInt(verseNumber),
        english_text: englishText,
        luganda_text: lugandaText
      };

      const res = await fetch('/api/bible-verses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.message || data.error || `API error: ${res.status}`;
        setVerseSaveStatus('error');
        setVersionSaveError(errorMessage);
        setMessage(`❌ Save Failed: ${errorMessage}`);
        setTimeout(() => {
          setMessage('');
          setVerseSaveStatus('idle');
        }, 5000);
        return;
      }

      setVerseSaveStatus('success');
      setMessage('✅ Saved ✓ - Verse updated successfully!');
      fetchVerses();
      
      setTimeout(() => {
        setVerseSaveStatus('idle');
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('❌ Network error saving verse:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setVerseSaveStatus('error');
      setVersionSaveError(errorMessage);
      setMessage(`❌ Save Failed: ${errorMessage}`);
      setTimeout(() => {
        setMessage('');
        setVerseSaveStatus('idle');
      }, 5000);
    } finally {
      setSavingVerse(false);
    }
  };

  const deleteVerse = async (id: number) => {
    if (!confirm('Delete this verse?')) return;
    try {
      const res = await fetch(`/api/bible-verses?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage('✅ Verse deleted!');
      fetchVerses();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportProgress(0);
    setImportMessage('');
    setImportStats(null);
    
    try {
      if (!file.name.endsWith('.json')) {
        throw new Error('File must be a JSON file (.json)');
      }

      const fileText = await file.text();
      let jsonData: any;
      
      try {
        jsonData = JSON.parse(fileText.trim());
      } catch (parseError) {
        throw new Error(`Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }

      setImportProgress(10);

      // Normalise: accept bare array or { verses, metadata }
      let verses: any[];
      let metadata: any = {};

      if (Array.isArray(jsonData)) {
        verses = jsonData;
      } else if (jsonData.verses && Array.isArray(jsonData.verses)) {
        verses = jsonData.verses;
        metadata = jsonData.metadata || {};
      } else {
        throw new Error('JSON must be either a plain array of verses, or an object with a "verses" array.');
      }

      if (verses.length === 0) {
        throw new Error('No verses found in the JSON file.');
      }

      // Apply language override from UI selector
      if (importLanguageOverride !== 'auto') {
        if (importLanguageOverride === 'luganda') {
          metadata.language = 'luganda';
          metadata.lang_short = 'lg';
        } else {
          metadata.language = 'english';
          metadata.lang_short = 'en';
        }
      }

      setImportProgress(20);

      const payload = Array.isArray(jsonData)
        ? { metadata, verses }
        : { ...jsonData, metadata };

      const res = await fetch('/api/bible-verses/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setImportProgress(80);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(errorData.message || errorData.error || `Failed with status ${res.status}`);
      }

      const data = await res.json();
      setImportProgress(100);
      setImportStats(data);
      setImportMessage(`✅ ${data.message} (Language: ${data.language || 'auto-detected'})`);
      
      fetchVerses();
      event.target.value = '';
      setTimeout(() => setImportProgress(null), 4000);
    } catch (error) {
      console.error('Error uploading:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setImportMessage(`❌ Import Failed: ${errorMessage}`);
      setImportProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      {isLoadingOnMount && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4 mx-auto"></div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Admin Panel</h2>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 pt-24 pb-8">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg font-medium ${
            message.includes('✅') ? 'bg-green-100 text-green-800' :
            message.includes('❌') ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Admin Control Panel</h1>

          <div className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-lg mb-6">
            <button
              onClick={() => setActiveSection('bible-content')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'bible-content'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📖 Bible Content
            </button>
            <button
              onClick={() => setActiveSection('book-intro')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'book-intro'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📚 Book Intro
            </button>
            <button
              onClick={() => setActiveSection('chapter-intro')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'chapter-intro'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📄 Chapter Intro
            </button>
            <button
              onClick={() => setActiveSection('outline')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'outline'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🗒️ Outline
            </button>
            <button
              onClick={() => setActiveSection('prayer-passage')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'prayer-passage'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🙏 Prayer Passage
            </button>
            <button
              onClick={() => setActiveSection('book-closing-prayer')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'book-closing-prayer'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📕 Book Closing Prayer
            </button>
            <button
              onClick={() => setActiveSection('chapter-closing-prayer')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'chapter-closing-prayer'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ✨ Chapter Closing Prayer
            </button>
            <button
              onClick={() => setActiveSection('commentary')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'commentary'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              💬 Commentary
            </button>
            <button
              onClick={() => setActiveSection('cross-reference')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'cross-reference'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🔗 Cross Reference
            </button>
            <button
              onClick={() => setActiveSection('devotional')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'devotional'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🌟 Devotional
            </button>
            <button
              onClick={() => setActiveSection('verse-songs')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'verse-songs'
                  ? 'bg-lime-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🎵 Verse-Songs
            </button>

            <button
              onClick={() => setActiveSection('theological-insights')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'theological-insights'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🧠 Theological Insights
            </button>
            <button
              onClick={() => setActiveSection('historical-context')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'historical-context'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🏛️ Historical Context
            </button>
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'dashboard'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => { setActiveSection('user-management'); fetchUsers('', 'all'); }}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'user-management'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              👥 Users
            </button>
            <a
              href="/cpanel-qa"
              className="px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition bg-white text-gray-700 hover:bg-amber-50 hover:text-amber-700 border border-amber-200"
            >
              ❓ Bible Q&amp;A
            </a>
            <button
              onClick={() => setActiveSection('settings')}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg font-semibold transition ${
                activeSection === 'settings'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {activeSection === 'bible-content' && (
          <div>
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 rounded-lg">
              <h3 className="text-lg font-bold text-blue-900 mb-3">📊 Bible Books Status</h3>
              <p className="text-sm text-blue-800 mb-2">✅ <strong>66 total books</strong> in database (39 OT + 27 NT)</p>
              <p className="text-sm text-blue-800 mb-3">📖 <strong>5 books with verses uploaded</strong>: Genesis, Exodus, Leviticus, Numbers, Deuteronomy</p>
              <p className="text-xs text-blue-700">💡 Users can read these 5 books in the Bible Reader. Other books will show "Chapter not found" until verses are uploaded.</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Verses Editor
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                  <select
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select book...</option>
                    {books && books.length > 0 ? (
                      books.map(book => (
                        <option key={book.id} value={book.name}>{book.name}</option>
                      ))
                    ) : (
                      <option disabled>No books available</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                  <input
                    type="number"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="Chapter #"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verse</label>
                  <input
                    type="number"
                    value={verseNumber}
                    onChange={(e) => setVerseNumber(e.target.value)}
                    placeholder="Verse #"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">English Text</label>
                  <RichTextEditor value={englishText} onChange={setEnglishText} placeholder="English verse will load here..." minHeight="150px" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Text</label>
                  <RichTextEditor value={lugandaText} onChange={setLugandaText} placeholder="Luganda verse will load here..." minHeight="150px" />
                </div>
              </div>

              {verseSaveStatus !== 'idle' && (
                <div className={`mb-4 p-3 rounded-lg font-medium text-center ${
                  verseSaveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
                  verseSaveStatus === 'success' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {verseSaveStatus === 'saving' && '💾 Saving...'}
                  {verseSaveStatus === 'success' && '✅ Saved ✓'}
                  {verseSaveStatus === 'error' && `❌ Save Failed: ${verseSaveError}`}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={saveVerse}
                  disabled={savingVerse}
                  className={`flex-1 text-white py-3 px-6 rounded-lg font-semibold text-lg shadow-md transition ${
                    verseSaveStatus === 'success' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : verseSaveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400'
                  }`}
                >
                  {verseSaveStatus === 'saving' && '💾 Saving...'}
                  {verseSaveStatus === 'success' && '✅ Saved ✓'}
                  {verseSaveStatus === 'error' && '❌ Save Failed'}
                  {verseSaveStatus === 'idle' && '💾 Save Verse'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-1">📤 Bulk Import Verses</h3>
              <p className="text-sm text-gray-500 mb-5">Upload a JSON file containing Bible verses in English or Luganda.</p>

              {/* Format reference */}
              <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
                <p className="font-bold text-blue-900 mb-2">📋 Supported JSON Formats</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-blue-800 mb-1">Format A — with metadata wrapper:</p>
                    <pre className="bg-white border border-blue-100 rounded p-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{`{
  "metadata": {
    "language": "luganda",
    "lang_short": "lg",
    "version": "NBS"
  },
  "verses": [
    {
      "book": "Genesis",
      "chapter": 1,
      "verse": 1,
      "text": "Mu ntandikwa Katonda..."
    }
  ]
}`}</pre>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800 mb-1">Format B — bare array (set language below):</p>
                    <pre className="bg-white border border-blue-100 rounded p-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{`[
  {
    "book": "Genesis",
    "chapter": 1,
    "verse": 1,
    "text_luganda": "Mu ntandikwa..."
  },
  {
    "book_name": "Genesis",
    "chapter": 1,
    "verse": 2,
    "text": "Nsi yaali..."
  }
]`}</pre>
                    <p className="text-xs text-blue-700 mt-2">Allowed text fields: <code className="bg-white px-1 rounded">text</code>, <code className="bg-white px-1 rounded">text_luganda</code>, <code className="bg-white px-1 rounded">luganda_text</code>, <code className="bg-white px-1 rounded">text_english</code>, <code className="bg-white px-1 rounded">english_text</code></p>
                  </div>
                </div>
              </div>

              {/* Language override */}
              <div className="mb-4 flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Language Override:</label>
                <div className="flex gap-2">
                  {(['auto', 'luganda', 'english'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setImportLanguageOverride(lang)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                        importLanguageOverride === lang
                          ? lang === 'luganda' ? 'bg-green-600 text-white border-green-600'
                          : lang === 'english' ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-700 text-white border-gray-700'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {lang === 'auto' ? '🔍 Auto-detect' : lang === 'luganda' ? '🇺🇬 Luganda' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400 italic">
                  {importLanguageOverride === 'auto'
                    ? 'Language detected from metadata or field names'
                    : `Will force all verses to import as ${importLanguageOverride}`}
                </span>
              </div>

              {/* Upload zone */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-3xl mb-2">📂</div>
                  <p className="text-gray-700 font-semibold">Click to select a Bible JSON file</p>
                  <p className="text-xs text-gray-400 mt-1">English (KJV) or Luganda (NBS/any) • Max 50 MB</p>
                </label>

                {importProgress !== null && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{importProgress}%</p>
                  </div>
                )}

                {importMessage && (
                  <div className={`mt-4 text-sm p-3 rounded-lg text-left ${
                    importMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <p className="font-semibold">{importMessage}</p>
                    {importStats?.errors?.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold">
                          ⚠️ {importStats.errorCount} row errors (click to expand)
                        </summary>
                        <ul className="mt-1 space-y-1">
                          {importStats.errors.map((e: string, i: number) => (
                            <li key={i} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{e}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {importStats && (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center border border-green-200">
                          <div className="font-bold text-green-700">{importStats.successCount}</div>
                          <div className="text-gray-500">Imported</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center border border-gray-200">
                          <div className="font-bold text-gray-700">{importStats.totalBooksProcessed}</div>
                          <div className="text-gray-500">Books</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center border border-gray-200">
                          <div className="font-bold text-gray-700">{importStats.successRate}</div>
                          <div className="text-gray-500">Success rate</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Recent Verses ({filteredVerses.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-gray-700 font-semibold">Book</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-semibold">Ref</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-semibold">English</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-semibold">Luganda</th>
                      <th className="text-center py-3 px-4 text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVerses.slice(0, displayedVersesCount).map((verse) => (
                      <tr key={verse.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{verse.book_name}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{verse.chapter}:{verse.verse_number}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm truncate max-w-xs">{verse.english_text}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm truncate max-w-xs">{verse.luganda_text}</td>
                        <td className="py-3 px-4 text-center space-x-2">
                          <button
                            onClick={() => deleteVerse(verse.id)}
                            className="text-red-600 hover:text-red-900 font-semibold"
                          >
                            <Trash2 size={18} className="inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'book-intro' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">📚 Book Introduction</h3>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setBookIntroductions([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book...</option>
                  {books && books.map(book => (
                    <option key={book.id} value={book.name}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchBookIntroductions}
                  disabled={loadingBookIntros || !selectedBook}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loadingBookIntros ? '🔄 Loading...' : '🔍 Search'}
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-l-4 border-indigo-600">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingBookIntroId ? '✏️ Edit Book Introduction' : '➕ Add New Book Introduction'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">English Introduction</label>
                  <RichTextEditor value={bookIntroEn} onChange={setBookIntroEn} placeholder="Enter English introduction..." minHeight="150px" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Introduction</label>
                  <RichTextEditor value={bookIntroLu} onChange={setBookIntroLu} placeholder="Enter Luganda introduction..." minHeight="150px" />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Audio URL (Optional)</label>
                <input
                  type="text"
                  value={bookIntroAudioUrl}
                  onChange={(e) => setBookIntroAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveBookIntro}
                  disabled={savingBookIntro}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  {savingBookIntro ? '💾 Saving...' : editingBookIntroId ? '✏️ Update Introduction' : '💾 Save Introduction'}
                </button>
                {editingBookIntroId && (
                  <button
                    onClick={cancelEditBookIntro}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {bookIntroductions.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📖 Saved Introduction for {selectedBook}</h4>
                <div className="space-y-3">
                  {bookIntroductions.map((intro: any) => (
                    <div key={intro.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">{selectedBook}</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editBookIntro(intro)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            onClick={() => deleteBookIntro(intro.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      {intro.en_introduction && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Introduction:</p>
                          <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{intro.en_introduction}</p>
                        </div>
                      )}
                      
                      {intro.lu_introduction && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Introduction:</p>
                          <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{intro.lu_introduction}</p>
                        </div>
                      )}
                      
                      {intro.audio_url && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">🔊 Audio URL:</p>
                          <p className="text-gray-700 text-sm bg-purple-50 p-3 rounded border border-purple-100 break-all">{intro.audio_url}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'chapter-intro' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">📄 Chapter Introduction</h3>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setChapterIntroductions([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book...</option>
                  {books && books.map(book => (
                    <option key={book.id} value={book.name}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                <input
                  type="number"
                  value={chapter}
                  onChange={(e) => {
                    setChapter(e.target.value);
                    setChapterIntroductions([]);
                  }}
                  placeholder="Chapter #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchChapterIntroductions}
                  disabled={loadingChapterIntros || !selectedBook || !chapter}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loadingChapterIntros ? '🔄 Loading...' : '🔍 Search'}
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border-l-4 border-cyan-600">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingChapterIntroId ? '✏️ Edit Chapter Introduction' : '➕ Add New Chapter Introduction'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">English Introduction</label>
                  <RichTextEditor value={chapterIntroEn} onChange={setChapterIntroEn} placeholder="Enter English introduction..." minHeight="150px" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Introduction</label>
                  <RichTextEditor value={chapterIntroLu} onChange={setChapterIntroLu} placeholder="Enter Luganda introduction..." minHeight="150px" />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Audio URL (Optional)</label>
                <input
                  type="text"
                  value={chapterIntroAudioUrl}
                  onChange={(e) => setChapterIntroAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveChapterIntro}
                  disabled={savingChapterIntro}
                  className="flex-1 bg-cyan-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-400"
                >
                  {savingChapterIntro ? '💾 Saving...' : editingChapterIntroId ? '✏️ Update Introduction' : '💾 Save Introduction'}
                </button>
                {editingChapterIntroId && (
                  <button
                    onClick={cancelEditChapterIntro}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {chapterIntroductions.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📖 Saved Introduction for {selectedBook} - Chapter {chapter}</h4>
                <div className="space-y-3">
                  {chapterIntroductions.map((intro: any) => (
                    <div key={intro.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">{selectedBook} - Chapter {chapter}</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editChapterIntro(intro)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            onClick={() => deleteChapterIntro(intro.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      {intro.en_introduction && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Introduction:</p>
                          <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{intro.en_introduction}</p>
                        </div>
                      )}
                      
                      {intro.lu_introduction && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Introduction:</p>
                          <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{intro.lu_introduction}</p>
                        </div>
                      )}
                      
                      {intro.audio_url && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">🔊 Audio URL:</p>
                          <p className="text-gray-700 text-sm bg-purple-50 p-3 rounded border border-purple-100 break-all">{intro.audio_url}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'outline' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">🗒️ Outline</h3>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setOutlines([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book...</option>
                  {books && books.map(book => (
                    <option key={book.id} value={book.name}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Outline Type</label>
                <select
                  value={outlineType}
                  onChange={(e) => {
                    setOutlineType(e.target.value as 'book' | 'chapter');
                    setOutlines([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="book">Book Outline</option>
                  <option value="chapter">Chapter Outline</option>
                </select>
              </div>
              {outlineType === 'chapter' && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                  <input
                    type="number"
                    value={chapter}
                    onChange={(e) => {
                      setChapter(e.target.value);
                      setOutlines([]);
                    }}
                    placeholder="Chapter #"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex items-end">
                <button
                  onClick={fetchOutlines}
                  disabled={loadingOutlines || !selectedBook || (outlineType === 'chapter' && !chapter)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loadingOutlines ? '🔄 Loading...' : '🔍 Search'}
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-l-4 border-yellow-600">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingOutlineId ? '✏️ Edit Outline' : '➕ Add New Outline'}
              </h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={outlineLanguage}
                  onChange={(e) => setOutlineLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="english">English</option>
                  <option value="luganda">Luganda</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Outline Title</label>
                <input
                  type="text"
                  value={outlineTitle}
                  onChange={(e) => setOutlineTitle(e.target.value)}
                  placeholder="Outline title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Outline Content</label>
                <RichTextEditor value={outlineContent} onChange={setOutlineContent} placeholder="Enter outline content..." minHeight="200px" />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveOutline}
                  disabled={savingOutline}
                  className="flex-1 bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-700 disabled:bg-gray-400"
                >
                  {savingOutline ? '💾 Saving...' : editingOutlineId ? '✏️ Update Outline' : '💾 Save Outline'}
                </button>
                {editingOutlineId && (
                  <button
                    onClick={cancelEditOutline}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {outlines.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📖 Saved Outlines for {selectedBook} {outlineType === 'chapter' ? `- Chapter ${chapter}` : ''}</h4>
                <div className="space-y-3">
                  {outlines.map((outline: any) => (
                    <div key={outline.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">{outline.title}</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editOutline(outline)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            onClick={() => deleteOutline(outline.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">📝 Content:</p>
                        <p className="text-gray-700 text-sm bg-yellow-50 p-3 rounded border border-yellow-100 whitespace-pre-wrap max-h-40 overflow-y-auto">{outline.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Language: {outline.language}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'prayer-passage' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">🙏 Prayer Passage</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setPrayerPassages([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book...</option>
                  {books && books.map(book => (
                    <option key={book.id} value={book.name}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                <input
                  type="number"
                  value={chapter}
                  onChange={(e) => {
                    setChapter(e.target.value);
                    setPrayerPassages([]);
                  }}
                  placeholder="Chapter #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verse</label>
                <input
                  type="number"
                  value={verseNumber}
                  onChange={(e) => setVerseNumber(e.target.value)}
                  placeholder="Verse #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchPrayerPassages}
                  disabled={loadingPrayerPassages || !selectedBook || !chapter}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loadingPrayerPassages ? '🔄 Loading...' : '🔍 Load Prayers'}
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-orange-600">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingPrayerPassageId ? '✏️ Edit Prayer Passage' : '➕ Add New Prayer Passage'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">English Prayer</label>
                  <RichTextEditor value={prayerPassageEn} onChange={setPrayerPassageEn} placeholder="Enter English prayer..." minHeight="150px" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Prayer</label>
                  <RichTextEditor value={prayerPassageLu} onChange={setPrayerPassageLu} placeholder="Enter Luganda prayer..." minHeight="150px" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={savePrayerPassage}
                  disabled={savingPrayerPassage}
                  className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
                >
                  {savingPrayerPassage ? '💾 Saving...' : editingPrayerPassageId ? '✏️ Update Prayer' : '💾 Save Prayer'}
                </button>
                {editingPrayerPassageId && (
                  <button
                    onClick={cancelEditPrayerPassage}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {prayerPassages.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📖 Saved Prayers for {selectedBook} - Chapter {chapter}</h4>
                <div className="space-y-3">
                  {prayerPassages.map((prayer: any) => (
                    <div key={prayer.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">Verse {prayer.verse_number}</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editPrayerPassage(prayer)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            onClick={() => deletePrayerPassage(prayer.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      {prayer.english_prayer && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Prayer:</p>
                          <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100">{prayer.english_prayer}</p>
                        </div>
                      )}
                      
                      {prayer.luganda_prayer && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Prayer:</p>
                          <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100">{prayer.luganda_prayer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'cross-reference' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">🔗 Cross Reference Manager</h3>
            <p className="text-gray-500 mb-8">The cross-reference system has a dedicated management page with full Save and Load functionality.</p>

            <div className="max-w-lg mx-auto text-center py-10 px-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
              <div className="text-5xl mb-4">🔗</div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Cross-Reference Manager</h4>
              <p className="text-gray-600 mb-2 text-sm">Add single or bulk cross-references, load saved references by verse, edit, update, and delete — all in one place.</p>
              <ul className="text-left text-sm text-gray-600 mb-6 space-y-1 inline-block">
                <li>✅ <strong>Save Cross Reference</strong> — single or bulk paste</li>
                <li>✅ <strong>Load Saved Cross References</strong> — by book/chapter/verse</li>
                <li>✅ Edit, update, and delete existing references</li>
                <li>✅ Auto-restores last-worked verse on page load</li>
              </ul>
              <a
                href="/cpanel-cross-references"
                className="block w-full bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors text-center shadow-md"
              >
                Open Cross-Reference Manager →
              </a>
            </div>
          </div>
        )}

        {activeSection === 'book-closing-prayer' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">📕 Book Closing Prayer</h3>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setBookClosingPrayers([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book...</option>
                  {books && books.map(book => (
                    <option key={book.id} value={book.name}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchBookClosingPrayers}
                  disabled={loadingBookClosingPrayers || !selectedBook}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loadingBookClosingPrayers ? '🔄 Loading...' : '🔍 Search'}
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border-l-4 border-red-600">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingBookClosingPrayerId ? '✏️ Edit Book Closing Prayer' : '➕ Add New Book Closing Prayer'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">English Prayer</label>
                  <RichTextEditor value={bookClosingPrayerEn} onChange={setBookClosingPrayerEn} placeholder="Enter English prayer..." minHeight="150px" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Prayer</label>
                  <RichTextEditor value={bookClosingPrayerLu} onChange={setBookClosingPrayerLu} placeholder="Enter Luganda prayer..." minHeight="150px" />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Audio URL (Optional)</label>
                <input
                  type="text"
                  value={bookClosingPrayerAudioUrl}
                  onChange={(e) => setBookClosingPrayerAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveBookClosingPrayer}
                  disabled={savingBookClosingPrayer}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400"
                >
                  {savingBookClosingPrayer ? '💾 Saving...' : editingBookClosingPrayerId ? '✏️ Update Prayer' : '💾 Save Prayer'}
                </button>
                {editingBookClosingPrayerId && (
                  <button
                    onClick={cancelEditBookClosingPrayer}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {bookClosingPrayers.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📖 Saved Closing Prayer for {selectedBook}</h4>
                <div className="space-y-3">
                  {bookClosingPrayers.map((prayer: any) => (
                    <div key={prayer.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">{selectedBook} - Closing Prayer</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editBookClosingPrayer(prayer)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            onClick={() => deleteBookClosingPrayer(prayer.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      {prayer.en_prayer && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Prayer:</p>
                          <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{prayer.en_prayer}</p>
                        </div>
                      )}
                      
                      {prayer.lu_prayer && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Prayer:</p>
                          <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{prayer.lu_prayer}</p>
                        </div>
                      )}
                      
                      {prayer.closing_prayer_audio_url && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">🔊 Audio URL:</p>
                          <p className="text-gray-700 text-sm bg-purple-50 p-3 rounded border border-purple-100 break-all">{prayer.closing_prayer_audio_url}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'chapter-closing-prayer' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">✨ Chapter Closing Prayer</h3>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setChapterClosingPrayers([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book...</option>
                  {books && books.map(book => (
                    <option key={book.id} value={book.name}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                <input
                  type="number"
                  value={chapter}
                  onChange={(e) => {
                    setChapter(e.target.value);
                    setChapterClosingPrayers([]);
                  }}
                  placeholder="Chapter #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchChapterClosingPrayers}
                  disabled={loadingChapterClosingPrayers || !selectedBook || !chapter}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 w-full md:w-auto"
                >
                  {loadingChapterClosingPrayers ? '🔄 Loading...' : '🔍 Search'}
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border-l-4 border-pink-600">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingChapterClosingPrayerId ? '✏️ Edit Chapter Closing Prayer' : '➕ Add New Chapter Closing Prayer'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">English Prayer</label>
                  <RichTextEditor value={chapterClosingPrayerEn} onChange={setChapterClosingPrayerEn} placeholder="Enter English prayer..." minHeight="150px" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Prayer</label>
                  <RichTextEditor value={chapterClosingPrayerLu} onChange={setChapterClosingPrayerLu} placeholder="Enter Luganda prayer..." minHeight="150px" />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Audio URL (Optional)</label>
                <input
                  type="text"
                  value={chapterClosingPrayerAudioUrl}
                  onChange={(e) => setChapterClosingPrayerAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveChapterClosingPrayer}
                  disabled={savingChapterClosingPrayer}
                  className="flex-1 bg-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-400"
                >
                  {savingChapterClosingPrayer ? '💾 Saving...' : editingChapterClosingPrayerId ? '✏️ Update Prayer' : '💾 Save Prayer'}
                </button>
                {editingChapterClosingPrayerId && (
                  <button
                    onClick={cancelEditChapterClosingPrayer}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {chapterClosingPrayers.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📖 Saved Closing Prayer for {selectedBook} - Chapter {chapter}</h4>
                <div className="space-y-3">
                  {chapterClosingPrayers.map((prayer: any) => (
                    <div key={prayer.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">{selectedBook} - Chapter {chapter} - Closing Prayer</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editChapterClosingPrayer(prayer)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            onClick={() => deleteChapterClosingPrayer(prayer.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      {prayer.en_prayer && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Prayer:</p>
                          <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{prayer.en_prayer}</p>
                        </div>
                      )}
                      
                      {prayer.lu_prayer && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Prayer:</p>
                          <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{prayer.lu_prayer}</p>
                        </div>
                      )}
                      
                      {prayer.chapter_closing_prayer_audio_url && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">🔊 Audio URL:</p>
                          <p className="text-gray-700 text-sm bg-purple-50 p-3 rounded border border-purple-100 break-all">{prayer.chapter_closing_prayer_audio_url}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'commentary' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">💬 Commentary Management</h3>
            
            <div className="flex gap-3 mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
              <button
                onClick={() => {
                  setCommentaryType('book');
                  setChapterCommentaries([]);
                  setVerseCommentaries([]);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  commentaryType === 'book'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                📚 Book Commentary
              </button>
              <button
                onClick={() => {
                  setCommentaryType('chapter');
                  setBookCommentaries([]);
                  setVerseCommentaries([]);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  commentaryType === 'chapter'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                📄 Chapter Commentary
              </button>
              <button
                onClick={() => {
                  setCommentaryType('verse');
                  setBookCommentaries([]);
                  setChapterCommentaries([]);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  commentaryType === 'verse'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                ✝️ Verse Commentary
              </button>
            </div>

            {commentaryType === 'book' && (
              <div>
                <div className="flex gap-3 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                    <select
                      value={selectedBook}
                      onChange={(e) => {
                        setSelectedBook(e.target.value);
                        setBookCommentaries([]);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select book...</option>
                      {books && books.map(book => (
                        <option key={book.id} value={book.name}>{book.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchBookCommentaries}
                      disabled={loadingBookCommentaries || !selectedBook}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loadingBookCommentaries ? '🔄 Loading...' : '🔍 Search'}
                    </button>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-l-4 border-teal-600">
                  <h4 className="font-bold text-gray-900 mb-4">
                    {editingBookCommentaryId ? '✏️ Edit Book Commentary' : '➕ Add New Book Commentary'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">English Commentary</label>
                      <RichTextEditor value={bookCommentaryEn} onChange={setBookCommentaryEn} placeholder="Enter English commentary..." minHeight="150px" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Commentary</label>
                      <RichTextEditor value={bookCommentaryLu} onChange={setBookCommentaryLu} placeholder="Enter Luganda commentary..." minHeight="150px" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveBookCommentary}
                      disabled={savingBookCommentary}
                      className="flex-1 bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 disabled:bg-gray-400"
                    >
                      {savingBookCommentary ? '💾 Saving...' : editingBookCommentaryId ? '✏️ Update Commentary' : '💾 Save Commentary'}
                    </button>
                    {editingBookCommentaryId && (
                      <button
                        onClick={cancelEditBookCommentary}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {bookCommentaries.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                    <h4 className="font-bold text-gray-900 mb-4">📖 Saved Commentary for {selectedBook}</h4>
                    <div className="space-y-3">
                      {bookCommentaries.map((comm: any) => (
                        <div key={comm.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-semibold text-gray-900">{selectedBook}</h5>
                            <div className="flex gap-2">
                              <button
                                onClick={() => editBookCommentary(comm)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                              >
                                <Edit2 size={16} /> Edit
                              </button>
                              <button
                                onClick={() => deleteBookCommentary(comm.id)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          </div>
                          
                          {comm.english_commentary && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Commentary:</p>
                              <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{comm.english_commentary}</p>
                            </div>
                          )}
                          
                          {comm.luganda_commentary && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Commentary:</p>
                              <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{comm.luganda_commentary}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {commentaryType === 'chapter' && (
              <div>
                <div className="flex gap-3 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                    <select
                      value={selectedBook}
                      onChange={(e) => {
                        setSelectedBook(e.target.value);
                        setChapterCommentaries([]);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select book...</option>
                      {books && books.map(book => (
                        <option key={book.id} value={book.name}>{book.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                    <input
                      type="number"
                      value={chapter}
                      onChange={(e) => {
                        setChapter(e.target.value);
                        setChapterCommentaries([]);
                      }}
                      placeholder="Chapter #"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchChapterCommentaries}
                      disabled={loadingChapterCommentaries || !selectedBook || !chapter}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loadingChapterCommentaries ? '🔄 Loading...' : '🔍 Search'}
                    </button>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-l-4 border-teal-600">
                  <h4 className="font-bold text-gray-900 mb-4">
                    {editingChapterCommentaryId ? '✏️ Edit Chapter Commentary' : '➕ Add New Chapter Commentary'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">English Commentary</label>
                      <RichTextEditor value={chapterCommentaryEn} onChange={setChapterCommentaryEn} placeholder="Enter English commentary..." minHeight="150px" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Commentary</label>
                      <RichTextEditor value={chapterCommentaryLu} onChange={setChapterCommentaryLu} placeholder="Enter Luganda commentary..." minHeight="150px" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveChapterCommentary}
                      disabled={savingChapterCommentary}
                      className="flex-1 bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 disabled:bg-gray-400"
                    >
                      {savingChapterCommentary ? '💾 Saving...' : editingChapterCommentaryId ? '✏️ Update Commentary' : '💾 Save Commentary'}
                    </button>
                    {editingChapterCommentaryId && (
                      <button
                        onClick={cancelEditChapterCommentary}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {chapterCommentaries.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                    <h4 className="font-bold text-gray-900 mb-4">📖 Saved Commentary for {selectedBook} - Chapter {chapter}</h4>
                    <div className="space-y-3">
                      {chapterCommentaries.map((comm: any) => (
                        <div key={comm.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-semibold text-gray-900">{selectedBook} - Chapter {chapter}</h5>
                            <div className="flex gap-2">
                              <button
                                onClick={() => editChapterCommentary(comm)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                              >
                                <Edit2 size={16} /> Edit
                              </button>
                              <button
                                onClick={() => deleteChapterCommentary(comm.id)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          </div>
                          
                          {comm.english_commentary && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Commentary:</p>
                              <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{comm.english_commentary}</p>
                            </div>
                          )}
                          
                          {comm.luganda_commentary && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Commentary:</p>
                              <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{comm.luganda_commentary}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {commentaryType === 'verse' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                    <select
                      value={selectedBook}
                      onChange={(e) => {
                        setSelectedBook(e.target.value);
                        setVerseCommentaries([]);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select book...</option>
                      {books && books.map(book => (
                        <option key={book.id} value={book.name}>{book.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                    <input
                      type="number"
                      value={chapter}
                      onChange={(e) => {
                        setChapter(e.target.value);
                        setVerseCommentaries([]);
                      }}
                      placeholder="Chapter #"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verse</label>
                    <input
                      type="number"
                      value={verseNumber}
                      onChange={(e) => setVerseNumber(e.target.value)}
                      placeholder="Verse #"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchVerseCommentaries}
                      disabled={loadingVerseCommentaries || !selectedBook || !chapter}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loadingVerseCommentaries ? '🔄 Loading...' : '🔍 Load Commentaries'}
                    </button>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-l-4 border-teal-600">
                  <h4 className="font-bold text-gray-900 mb-4">
                    {editingVerseCommentaryId ? '✏️ Edit Verse Commentary' : '➕ Add New Verse Commentary'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">English Commentary</label>
                      <RichTextEditor value={verseCommentaryEn} onChange={setVerseCommentaryEn} placeholder="Enter English commentary..." minHeight="150px" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Commentary</label>
                      <RichTextEditor value={verseCommentaryLu} onChange={setVerseCommentaryLu} placeholder="Enter Luganda commentary..." minHeight="150px" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveVerseCommentary}
                      disabled={savingVerseCommentary}
                      className="flex-1 bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 disabled:bg-gray-400"
                    >
                      {savingVerseCommentary ? '💾 Saving...' : editingVerseCommentaryId ? '✏️ Update Commentary' : '💾 Save Commentary'}
                    </button>
                    {editingVerseCommentaryId && (
                      <button
                        onClick={cancelEditVerseCommentary}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {verseCommentaries.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                    <h4 className="font-bold text-gray-900 mb-4">📖 Saved Commentaries for {selectedBook} - Chapter {chapter}</h4>
                    <div className="space-y-3">
                      {verseCommentaries.map((comm: any) => (
                        <div key={comm.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-semibold text-gray-900">Verse {comm.verse_number}</h5>
                            <div className="flex gap-2">
                              <button
                                onClick={() => editVerseCommentary(comm)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                              >
                                <Edit2 size={16} /> Edit
                              </button>
                              <button
                                onClick={() => deleteVerseCommentary(comm.id)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          </div>
                          
                          {comm.commentary_text && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Commentary:</p>
                              <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{comm.commentary_text}</p>
                            </div>
                          )}
                          
                          {comm.luganda_commentary_text && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Commentary:</p>
                              <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{comm.luganda_commentary_text}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'devotional' && (
          <DevotionalManagement books={books} />
        )}



        {activeSection === 'theological-insights' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">🧠 Theological Insights</h3>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(e.target.value);
                    setTheologicalInsights([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book...</option>
                  {books && books.map(book => (
                    <option key={book.id} value={book.name}>{book.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                <input
                  type="number"
                  value={chapter}
                  onChange={(e) => {
                    setChapter(e.target.value);
                    setTheologicalInsights([]);
                  }}
                  placeholder="Chapter #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchTheologicalInsights}
                  disabled={loadingTheologicalInsights || !selectedBook || !chapter}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loadingTheologicalInsights ? '🔄 Loading...' : '🔍 Load Insights'}
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border-l-4 border-rose-600">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingTheologicalInsightId ? '✏️ Edit Theological Insight' : '➕ Add New Theological Insight'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verse Number</label>
                  <input
                    type="number"
                    value={verseNumber}
                    onChange={(e) => setVerseNumber(e.target.value)}
                    placeholder="Verse #"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">English Insight</label>
                  <RichTextEditor value={englishTheologicalInsight} onChange={setEnglishTheologicalInsight} placeholder="Enter English theological insight..." minHeight="150px" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Insight</label>
                  <RichTextEditor value={lugandaTheologicalInsight} onChange={setLugandaTheologicalInsight} placeholder="Enter Luganda theological insight..." minHeight="150px" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveTheologicalInsight}
                  disabled={savingTheologicalInsight}
                  className="flex-1 bg-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-rose-700 disabled:bg-gray-400"
                >
                  {savingTheologicalInsight ? '💾 Saving...' : editingTheologicalInsightId ? '✏️ Update Insight' : '💾 Save Insight'}
                </button>
                {editingTheologicalInsightId && (
                  <button
                    onClick={cancelEditTheologicalInsight}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {theologicalInsights.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📖 Saved Insights for {selectedBook} - Chapter {chapter}</h4>
                <div className="space-y-3">
                  {theologicalInsights.map((insight: any) => (
                    <div key={insight.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">Verse {insight.verse_number}</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editTheologicalInsight(insight)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            onClick={() => deleteTheologicalInsight(insight.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-900 font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                      
                      {insight.english_insight && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇬🇧 English Insight:</p>
                          <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border border-blue-100 max-h-40 overflow-y-auto">{insight.english_insight}</p>
                        </div>
                      )}
                      
                      {insight.luganda_insight && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">🇺🇬 Luganda Insight:</p>
                          <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-100 max-h-40 overflow-y-auto">{insight.luganda_insight}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'historical-context' && (() => {
          const fetchHistoricalContent = async () => {
            if (!selectedBook) return;
            setLoadingHistoricalContent(true);
            try {
              const bookData = books.find(b => b.name === selectedBook);
              if (!bookData) { setLoadingHistoricalContent(false); return; }
              const url = historicalScope === 'chapter' && chapter
                ? `/api/historical-content?bookId=${bookData.id}&chapter=${chapter}`
                : `/api/historical-content?bookId=${bookData.id}`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                setHistoricalContentData(data);
                if (data) {
                  setHistoricalBg(data.historical_background || '');
                  setHistoricalCulture(data.cultural_context || '');
                  setHistoricalMaps(data.maps_geography || '');
                  setHistoricalTimeline(data.timeline || '');
                  setHistoricalArchaeology(data.archaeological_notes || '');
                  setEditingHistoricalId(data.id);
                }
              }
            } catch (e) { console.error(e); }
            finally { setLoadingHistoricalContent(false); }
          };

          const saveHistoricalContent = async () => {
            if (!selectedBook) { setMessage('❌ Please select a book'); setTimeout(() => setMessage(''), 3000); return; }
            setSavingHistoricalContent(true);
            try {
              const bookData = books.find(b => b.name === selectedBook);
              if (!bookData) throw new Error('Book not found');
              const payload: any = {
                book_id: bookData.id,
                historical_background: historicalBg,
                cultural_context: historicalCulture,
                maps_geography: historicalMaps,
                timeline: historicalTimeline,
                archaeological_notes: historicalArchaeology,
              };
              if (historicalScope === 'chapter' && chapter) payload.chapter = parseInt(chapter);
              const res = await fetch('/api/historical-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
              setMessage('✅ Historical content saved!');
              await fetchHistoricalContent();
            } catch (e) {
              setMessage('❌ Error: ' + (e instanceof Error ? e.message : String(e)));
            } finally {
              setSavingHistoricalContent(false);
              setTimeout(() => setMessage(''), 3000);
            }
          };

          const deleteHistoricalContent = async () => {
            if (!editingHistoricalId || !confirm('Delete this historical content?')) return;
            try {
              const res = await fetch(`/api/historical-content?id=${editingHistoricalId}`, { method: 'DELETE' });
              if (!res.ok) throw new Error('Delete failed');
              setMessage('✅ Historical content deleted!');
              setHistoricalBg(''); setHistoricalCulture(''); setHistoricalMaps(''); setHistoricalTimeline(''); setHistoricalArchaeology('');
              setHistoricalContentData(null); setEditingHistoricalId(null);
            } catch (e) { setMessage('❌ Error: ' + (e instanceof Error ? e.message : String(e))); }
            setTimeout(() => setMessage(''), 3000);
          };

          return (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">🏛️ Historical Content Management</h3>

              {/* Scope Toggle */}
              <div className="flex gap-3 mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <button onClick={() => setHistoricalScope('book')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${historicalScope === 'book' ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                  📚 Book Level
                </button>
                <button onClick={() => setHistoricalScope('chapter')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${historicalScope === 'chapter' ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                  📄 Chapter Level
                </button>
              </div>

              {/* Book & Chapter selector */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                  <select value={selectedBook} onChange={(e) => { setSelectedBook(e.target.value); setHistoricalContentData(null); setEditingHistoricalId(null); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                    <option value="">Select book...</option>
                    {books.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                {historicalScope === 'chapter' && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                    <input type="number" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Chapter #"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
                  </div>
                )}
                <div className="flex items-end">
                  <button onClick={fetchHistoricalContent} disabled={loadingHistoricalContent || !selectedBook}
                    className="bg-amber-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400">
                    {loadingHistoricalContent ? '🔄 Loading...' : '🔍 Load'}
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-600 space-y-5 mb-6">
                <h4 className="font-bold text-gray-900">{editingHistoricalId ? '✏️ Edit Historical Content' : '➕ Add Historical Content'}</h4>

                {[
                  { label: '🏺 Historical Background', value: historicalBg, set: setHistoricalBg, placeholder: 'Describe the historical background of this book/chapter...' },
                  { label: '🌍 Cultural Context', value: historicalCulture, set: setHistoricalCulture, placeholder: 'Describe the cultural context...' },
                  { label: '🗺️ Maps & Geography', value: historicalMaps, set: setHistoricalMaps, placeholder: 'Describe geographic locations, maps references...' },
                  { label: '📅 Timeline', value: historicalTimeline, set: setHistoricalTimeline, placeholder: 'Key dates and timeline of events...' },
                  { label: '⛏️ Archaeological Notes', value: historicalArchaeology, set: setHistoricalArchaeology, placeholder: 'Archaeological discoveries related to this content...' },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                    <RichTextEditor value={value} onChange={set} placeholder={placeholder} minHeight="120px" />
                  </div>
                ))}

                <div className="flex gap-3">
                  <button onClick={saveHistoricalContent} disabled={savingHistoricalContent}
                    className="flex-1 bg-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400">
                    {savingHistoricalContent ? '💾 Saving...' : editingHistoricalId ? '✏️ Update Content' : '💾 Save Content'}
                  </button>
                  {editingHistoricalId && (
                    <button onClick={deleteHistoricalContent}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Saved preview */}
              {historicalContentData && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
                  <h4 className="font-bold text-gray-900 mb-4">📖 Saved Historical Content — {selectedBook}{historicalScope === 'chapter' && chapter ? ` Ch.${chapter}` : ''}</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Historical Background', val: historicalContentData.historical_background },
                      { label: 'Cultural Context', val: historicalContentData.cultural_context },
                      { label: 'Maps & Geography', val: historicalContentData.maps_geography },
                      { label: 'Timeline', val: historicalContentData.timeline },
                      { label: 'Archaeological Notes', val: historicalContentData.archaeological_notes },
                    ].filter(x => x.val).map(({ label, val }) => (
                      <div key={label}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">{label}:</p>
                        <p className="text-gray-700 text-sm bg-white p-3 rounded border border-amber-100 max-h-28 overflow-y-auto">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeSection === 'verse-songs' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Music className="w-6 h-6" />
              Verse-Songs
            </h3>

            <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingSeriesId ? '✏️ Edit Series' : '➕ Create New Series'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Series Title</label>
                  <input
                    type="text"
                    value={seriesTitle}
                    onChange={(e) => setSeriesTitle(e.target.value)}
                    placeholder="Series title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={seriesDescription}
                    onChange={(e) => setSeriesDescription(e.target.value)}
                    placeholder="Series description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
                  <input
                    type="text"
                    value={seriesThumbnail}
                    onChange={(e) => setSeriesThumbnail(e.target.value)}
                    placeholder="Image URL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={seriesDisplayOrder}
                    onChange={(e) => setSeriesDisplayOrder(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={seriesFeatured}
                    onChange={(e) => setSeriesFeatured(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Featured Series</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveSeries}
                  disabled={savingSeries}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
                >
                  {savingSeries ? '💾 Saving...' : editingSeriesId ? '✏️ Update Series' : '➕ Create Series'}
                </button>
                {editingSeriesId && (
                  <button
                    onClick={cancelEditSeries}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h4 className="font-bold text-gray-900 mb-4">
                {editingSongId ? '✏️ Edit Song' : '➕ Add New Song'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Series</label>
                  <select
                    value={selectedSeriesId}
                    onChange={(e) => setSelectedSeriesId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select series...</option>
                    {verseSongSeries.map(series => (
                      <option key={series.id} value={series.id}>{series.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Song Title</label>
                  <input
                    type="text"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="Song title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">MP3 URL (Required)</label>
                  <input
                    type="text"
                    value={songMp3Url}
                    onChange={(e) => setSongMp3Url(e.target.value)}
                    placeholder="https://example.com/song.mp3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
                  <input
                    type="text"
                    value={songThumbnail}
                    onChange={(e) => setSongThumbnail(e.target.value)}
                    placeholder="Image URL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={songDescription}
                  onChange={(e) => setSongDescription(e.target.value)}
                  placeholder="Song description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                  <input
                    type="number"
                    value={songDuration}
                    onChange={(e) => setSongDuration(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={songPublished}
                      onChange={(e) => setSongPublished(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">Published</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveSong}
                  disabled={savingVerseSong}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
                >
                  {savingVerseSong ? '💾 Saving...' : editingSongId ? '✏️ Update Song' : '➕ Add Song'}
                </button>
                {editingSongId && (
                  <button
                    onClick={cancelEditSong}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4">Series ({verseSongSeries.length})</h4>
                <div className="space-y-2">
                  {verseSongSeries.map(series => (
                    <div key={series.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-semibold text-gray-900">{series.title}</p>
                        <p className="text-xs text-gray-600">{series.description || 'No description'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editSeries(series)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteSeries(series.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4">Songs ({verseSongs.length})</h4>
                <div className="space-y-2">
                  {verseSongs.map(song => (
                    <div key={song.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-semibold text-gray-900">{song.title}</p>
                        <p className="text-xs text-gray-600">{song.description || 'No description'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editSong(song)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteSong(song.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">📊 Live Dashboard</h2>
              <button
                onClick={fetchDashboardStats}
                disabled={loadingStats}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {loadingStats ? '🔄 Refreshing...' : '🔄 Refresh'}
              </button>
            </div>

            {loadingStats ? (
              <div className="text-center py-16 text-gray-500">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                Loading real-time data...
              </div>
            ) : (
              <>
                {/* Primary Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Total Users</p>
                    <p className="text-4xl font-bold text-gray-900 mt-1">{dashboardStats?.totalUsers ?? 0}</p>
                    <p className="text-xs text-green-600 mt-1">+{dashboardStats?.newUsersThisWeek ?? 0} this week</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-emerald-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Active Users</p>
                    <p className="text-4xl font-bold text-gray-900 mt-1">{dashboardStats?.activeUsers ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Verse Views</p>
                    <p className="text-4xl font-bold text-gray-900 mt-1">{dashboardStats?.totalVerseViews ?? 0}</p>
                    <p className="text-xs text-blue-600 mt-1">{dashboardStats?.verseViewsToday ?? 0} today</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Messages</p>
                    <p className="text-4xl font-bold text-gray-900 mt-1">{dashboardStats?.totalMessages ?? 0}</p>
                    <p className="text-xs text-red-500 mt-1">{dashboardStats?.unreadMessages ?? 0} unread</p>
                  </div>
                </div>

                {/* Secondary Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-amber-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Prayer Activities</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalPrayerActivities ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-pink-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Bookmarks Saved</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalBookmarks ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-teal-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Reading Sessions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalBookVisits ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-indigo-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Song Plays</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalSongPlays ?? 0}</p>
                  </div>
                </div>

                {/* Third Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-cyan-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Total Verses</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalVerses ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-lime-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Plan Completions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalReadingCompletions ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-rose-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Q&A Entries</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalQA ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border-l-4 border-violet-500">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Forum Posts</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats?.totalPosts ?? 0}</p>
                  </div>
                </div>

                {/* Bottom Section: Top Books + Recent Users */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Most Read Books */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" /> Most Read Books
                    </h3>
                    {dashboardStats?.topBooks?.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardStats.topBooks.map((book: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
                              <span className="text-sm font-medium text-gray-800">{book.book_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, (book.visits / (dashboardStats.topBooks[0]?.visits || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{book.visits}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No reading data yet</p>
                    )}
                  </div>

                  {/* Recent Users */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-500" /> Recent Users
                    </h3>
                    {dashboardStats?.recentUsers?.length > 0 ? (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {dashboardStats.recentUsers.slice(0, 8).map((user: any) => (
                          <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{user.name || user.email}</p>
                              <p className="text-xs text-gray-400">{user.city || ''}{user.city && user.country ? ', ' : ''}{user.country || ''}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No users yet</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeSection === 'user-management' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                User Management
                <span className="text-sm font-normal text-gray-500 ml-2">({allUsersData?.totalUsers ?? users.length} total)</span>
              </h2>
              <button
                onClick={() => fetchUsers(userSearch, userStatusFilter)}
                disabled={loadingUsers}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:bg-gray-400"
              >
                {loadingUsers ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {/* Live Sessions Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-green-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                  Live Active Users (last 15 min)
                  <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">{activeSessions.length}</span>
                </h3>
              </div>
              {activeSessions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeSessions.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white border border-green-200 rounded-lg px-3 py-1.5 shadow-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-gray-800 font-medium">{s.user_email}</span>
                      <span className="text-xs text-gray-400">
                        {s.last_seen ? new Date(s.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-green-700 text-sm opacity-70">No active sessions in the last 15 minutes</p>
              )}
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch, userStatusFilter)}
                  placeholder="Search by name or email..."
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 text-sm"
                />
              </div>
              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  fetchUsers(userSearch, e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">All Users</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <button
                onClick={() => fetchUsers(userSearch, userStatusFilter)}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-purple-700"
              >
                Search
              </button>
              {(userSearch || userStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setUserSearch('');
                    setUserStatusFilter('all');
                    fetchUsers('', 'all');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {loadingUsers ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                  Loading users...
                </div>
              ) : users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">User</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">Email</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">Location</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">Registered</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">Last Login</th>
                        <th className="text-center py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">Status</th>
                        <th className="text-center py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">Provider</th>
                        <th className="text-center py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user: any) => {
                        const isLive = activeSessions.some((s: any) => s.user_email === user.email);
                        return (
                          <tr key={user.id} className={`border-b hover:bg-gray-50 transition ${isLive ? 'bg-green-50/40' : ''}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {isLive && <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Currently active"></span>}
                                <div>
                                  <p className="font-medium text-gray-900">{user.name || '—'}</p>
                                  {user.ip_address && <p className="text-xs text-gray-400">{user.ip_address}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{user.email}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {[user.city, user.country].filter(Boolean).join(', ') || '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {user.last_login ? new Date(user.last_login).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isLive ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">● Live</span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  user.is_active !== false ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {user.is_active !== false ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                user.auth_provider === 'better-auth' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {user.auth_provider === 'better-auth' ? 'OAuth' : 'Custom'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {user.auth_provider !== 'better-auth' && (
                                <div className="flex items-center justify-center gap-1">
                                  {user.is_active !== false ? (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'deactivate')}
                                      className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 font-medium"
                                      title="Deactivate user"
                                    >
                                      Deactivate
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'activate')}
                                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                                      title="Activate user"
                                    >
                                      Activate
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUserAction(user.id, 'delete')}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium"
                                    title="Delete user"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-400 text-lg mb-2">No users found</p>
                  {(userSearch || userStatusFilter !== 'all') && (
                    <p className="text-gray-400 text-sm">Try adjusting your search or filter</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">🔐 Security Settings</h3>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Email</label>
                <input
                  type="text"
                  value={adminEmail}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={updateAdminPassword}
                disabled={savingPassword}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
