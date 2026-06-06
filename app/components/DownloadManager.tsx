'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Check, X, Loader, AlertCircle, HardDrive, Trash2, RefreshCw, ChevronRight, Heart, BookOpen, HelpCircle } from 'lucide-react';
import { useOfflineSync, ContentUpdate } from '@/app/hooks/useOfflineSync';
import { getBooks, clearStore, getStorageUsage, initDB } from '@/app/utils/offlineStorage';
import UpdateAvailableModal from './UpdateAvailableModal';

interface DownloadManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadManager({ isOpen, onClose }: DownloadManagerProps) {
  const { syncStatus, syncAll, syncSpecificContent, checkForUpdates, syncSelectedCategories } = useOfflineSync();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'download' | 'manage'>('download');
  const [selectedCommentaryBooks, setSelectedCommentaryBooks] = useState<Set<number>>(new Set());
  const [verifiedCommentaries, setVerifiedCommentaries] = useState<Record<number, { downloaded: boolean; chapterCount: number }>>({});
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updates, setUpdates] = useState<ContentUpdate[]>([]);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [serverVersions, setServerVersions] = useState<any>(null);
  const [verifiedBooks, setVerifiedBooks] = useState<Record<number, { downloaded: boolean; verseCount: number }>>({});

  const [downloadedCommentaries, setDownloadedCommentaries] = useState<Set<number>>(new Set());
  const [commentaryChapterCounts, setCommentaryChapterCounts] = useState<Record<number, number>>({});
  const [downloadingCommentaries, setDownloadingCommentaries] = useState(false);
  const [commentaryDownloadProgress, setCommentaryDownloadProgress] = useState(0);

  // Verse Prayer Passages states
  const [selectedPrayerBooks, setSelectedPrayerBooks] = useState<Set<number>>(new Set());
  const [downloadedPrayers, setDownloadedPrayers] = useState<Set<number>>(new Set());
  const [prayerVerseCounts, setPrayerVerseCounts] = useState<Record<number, number>>({});
  const [downloadingPrayers, setDownloadingPrayers] = useState(false);
  const [prayerDownloadProgress, setPrayerDownloadProgress] = useState(0);

  // Devotionals states
  const [downloadedDevotionals, setDownloadedDevotionals] = useState<number>(0);
  const [downloadingDevotionals, setDownloadingDevotionals] = useState(false);
  const [devotionalDownloadProgress, setDevotionalDownloadProgress] = useState(0);
  const [devotionalLanguages, setDevotionalLanguages] = useState<Set<string>>(new Set(['english', 'luganda']));
  const [message, setMessage] = useState('');

  // Q&A states
  const [downloadedQA, setDownloadedQA] = useState<number>(0);
  const [downloadingQA, setDownloadingQA] = useState(false);
  const [qaDownloadProgress, setQaDownloadProgress] = useState(0);
  const [qaLanguages, setQaLanguages] = useState<Set<string>>(new Set(['english', 'luganda']));

  useEffect(() => {
    loadBooks();
    loadStorageInfo();
    verifyDownloadedBooks();
    verifyDownloadedCommentaries();
    verifyDownloadedPrayers();
    verifyDownloadedDevotionals();
    verifyDownloadedQA();

    // Check if coming from notification with hash (e.g. #download-books)
    const hash = window.location.hash;
    if (hash.startsWith('#download-')) {
      const contentType = hash.replace('#download-', '');
      handleAutoDownload(contentType);
    }
  }, []);

  const handleAutoDownload = async (contentType: string) => {
    // Auto-trigger download based on content type from notification
    switch (contentType) {
      case 'books':
        // Select all books and trigger download
        selectAll();
        setTimeout(() => downloadSelected(), 500);
        break;
      case 'commentaries':
        selectAllCommentaries();
        setTimeout(() => downloadSelectedCommentaries(), 500);
        break;
      case 'prayers':
        setSelectedPrayerBooks(new Set(books.map(b => b.id)));
        setTimeout(() => downloadSelectedPrayers(), 500);
        break;
      case 'devotionals':
        setTimeout(() => downloadDevotionals(), 500);
        break;
      case 'qa':
        setTimeout(() => downloadQA(), 500);
        break;
    }

    // Mark as downloaded
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
      try {
        await fetch('/api/content-updates/mark-downloaded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail, contentType }),
        });
      } catch (error) {
        console.error('Failed to mark as downloaded:', error);
      }
    }

    // Clear hash
    window.history.replaceState(null, '', window.location.pathname);
  };

  const verifyDownloadedBooks = async () => {
    try {
      const { getAllFromStore } = await import('@/app/utils/offlineStorage');
      const allVerses = await getAllFromStore('verses');
      
      // Count verses per book
      const versesPerBook: Record<number, number> = {};
      allVerses.forEach((verse: any) => {
        if (verse.book_id) {
          versesPerBook[verse.book_id] = (versesPerBook[verse.book_id] || 0) + 1;
        }
      });
      
      // Mark books as downloaded if they have verses
      const verified: Record<number, { downloaded: boolean; verseCount: number }> = {};
      books.forEach(book => {
        const verseCount = versesPerBook[book.id] || 0;
        verified[book.id] = {
          downloaded: verseCount > 0,
          verseCount
        };
      });
      
      setVerifiedBooks(verified);
      console.log('[VERIFY] Downloaded books:', Object.entries(verified).filter(([_, v]) => v.downloaded).map(([id, v]) => `Book ${id}: ${v.verseCount} verses`));
    } catch (error) {
      console.error('Error verifying downloaded books:', error);
    }
  };

  // Verify downloaded commentaries from IndexedDB
  const verifyDownloadedCommentaries = async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(['commentaries'], 'readonly');
      const store = transaction.objectStore('commentaries');
      const allCommentaries = await new Promise<any[]>((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
      });

      const bookIds = new Set<number>();
      const counts: Record<number, number> = {};

      allCommentaries.forEach((commentary: any) => {
        if (commentary.book_id) {
          bookIds.add(commentary.book_id);
          counts[commentary.book_id] = (counts[commentary.book_id] || 0) + 1;
        }
      });

      setDownloadedCommentaries(bookIds);
      setCommentaryChapterCounts(counts);
      console.log(`[VERIFY] Found ${bookIds.size} books with commentaries in IndexedDB`);
    } catch (error) {
      console.error('Error verifying downloaded commentaries:', error);
    }
  };

  // Verify downloaded verse prayers from IndexedDB
  const verifyDownloadedPrayers = async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const allPrayers = await new Promise<any[]>((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
      });

      const bookIds = new Set<number>();
      const counts: Record<number, number> = {};

      allPrayers.forEach((prayer: any) => {
        if (prayer.book_id) {
          bookIds.add(prayer.book_id);
          counts[prayer.book_id] = (counts[prayer.book_id] || 0) + 1;
        }
      });

      setDownloadedPrayers(bookIds);
      setPrayerVerseCounts(counts);
      console.log(`[VERIFY] Found ${bookIds.size} books with verse prayers in IndexedDB`);
    } catch (error) {
      console.error('Error verifying downloaded verse prayers:', error);
    }
  };

  // Verify downloaded devotionals from IndexedDB
  const verifyDownloadedDevotionals = async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(['devotionals'], 'readonly');
      const store = transaction.objectStore('devotionals');
      const allDevotionals = await new Promise<any[]>((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
      });

      setDownloadedDevotionals(allDevotionals.length);
      console.log(`[VERIFY] Found ${allDevotionals.length} devotionals in IndexedDB`);
    } catch (error) {
      console.error('Error verifying downloaded devotionals:', error);
    }
  };

  // Verify downloaded Q&A from IndexedDB
  const verifyDownloadedQA = async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(['qa'], 'readonly');
      const store = transaction.objectStore('qa');
      const allQA = await new Promise<any[]>((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
      });

      setDownloadedQA(allQA.length);
      console.log(`[VERIFY] Found ${allQA.length} Q&A entries in IndexedDB`);
    } catch (error) {
      console.error('Error verifying downloaded Q&A:', error);
    }
  };

  const checkUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const availableUpdates = await checkForUpdates();
      setUpdates(availableUpdates || []);
      
      // Fetch server versions for selective sync
      const response = await fetch('/api/offline-sync');
      const data = await response.json();
      const { versions } = data || {};
      setServerVersions(versions || null);
      
      // Auto-show modal if updates are available
      const hasUpdates = Array.isArray(availableUpdates) && availableUpdates.some(u => u.hasUpdate);
      if (hasUpdates) {
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdates([]);
      setServerVersions(null);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const loadBooks = async () => {
    try {
      const response = await fetch('/api/bible-books');
      if (response.ok) {
        const booksData = await response.json();
        setBooks(booksData);
        // Verify downloaded books after books are loaded
        setTimeout(() => verifyDownloadedBooks(), 500);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const loadStorageInfo = async () => {
    const info = await getStorageUsage();
    setStorageInfo(info);
  };

  const toggleBookSelection = (bookId: number) => {
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedBooks(new Set(books.map(b => b.id)));
  };

  const deselectAll = () => {
    setSelectedBooks(new Set());
  };

  const toggleCommentaryBookSelection = (bookId: number) => {
    setSelectedCommentaryBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const selectAllCommentaries = () => {
    setSelectedCommentaryBooks(new Set(books.map(b => b.id)));
  };

  const deselectAllCommentaries = () => {
    setSelectedCommentaryBooks(new Set());
  };

  const downloadSelected = async () => {
    if (selectedBooks.size === 0) return;

    try {
      const selectedBooksArray = Array.from(selectedBooks);
      console.log(`[DOWNLOAD] Starting batch download of ${selectedBooksArray.length} books:`, selectedBooksArray);
      
      const booksToDownload = selectedBooksArray.map(bookId => {
        const book = books.find(b => b.id === bookId);
        return book;
      }).filter(Boolean);
      
      console.log(`[DOWNLOAD] Books to download:`, booksToDownload.map(b => `${b!.name_english} (${b!.total_chapters} chapters)`));
      
      const totalChapters = booksToDownload.reduce((sum, book) => sum + (book!.total_chapters || 0), 0);
      let completedChapters = 0;
      
      console.log(`[DOWNLOAD] Total chapters to download: ${totalChapters}`);

      // Download all books in parallel batches
      for (const book of booksToDownload) {
        if (book && book.total_chapters) {
          console.log(`[DOWNLOAD] Starting download for ${book.name_english} (${book.total_chapters} chapters)...`);
          
          // Download the book and update progress
          await syncSpecificContent('book', {
            bookId: book.id,
            totalChapters: book.total_chapters,
          });
          
          completedChapters += book.total_chapters;
          const progress = Math.round((completedChapters / totalChapters) * 100);
          setDownloadProgress(progress);
          
          // Verify the book was written to IndexedDB
          try {
            const { getByIndex } = await import('@/app/utils/offlineStorage');
            const verseCount = await getByIndex('verses', 'book_chapter', [book.id, 1]);
            console.log(`[DOWNLOAD] ✓ ${book.name_english} verified in IndexedDB: ${verseCount.length} verses in chapter 1`);
          } catch (error) {
            console.error(`[DOWNLOAD] ✗ Failed to verify ${book.name_english} in IndexedDB:`, error);
          }
        }
      }

      console.log(`[DOWNLOAD] ✓ Batch download complete! Downloaded ${booksToDownload.length} books (${totalChapters} chapters total)`);
      
      // Verify persistence across the batch
      try {
        const { getStorageUsage } = await import('@/app/utils/offlineStorage');
        const usage = await getStorageUsage();
        console.log(`[DOWNLOAD] Storage usage after batch download: ${usage?.usage || 0} bytes used of ${usage?.quota || 0} bytes available`);
      } catch (error) {
        console.error('[DOWNLOAD] Failed to get storage usage:', error);
      }

      setDownloadProgress(100);
      setTimeout(() => {
        setDownloadProgress(0);
        deselectAll();
        verifyDownloadedBooks(); // Re-verify after download
      }, 2000);

      // Mark as downloaded
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          await fetch('/api/content-updates/mark-downloaded', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail, contentType: 'books' }),
          });
        } catch (error) {
          console.error('Failed to mark as downloaded:', error);
        }
      }

      loadStorageInfo();
    } catch (error) {
      console.error('[DOWNLOAD] Batch download error:', error);
    }
  };

  // Download selected commentaries
  const downloadSelectedCommentaries = async () => {
    if (selectedCommentaryBooks.size === 0) {
      setMessage('Please select at least one book for commentary download.');
      return;
    }

    setDownloadingCommentaries(true);
    setCommentaryDownloadProgress(0);
    setMessage('Downloading commentaries (English & Luganda)...');

    try {
      const bookIds = Array.from(selectedCommentaryBooks);
      let completed = 0;

      for (const bookId of bookIds) {
        try {
          const book = books.find(b => b.id === bookId);
          if (!book) continue;

          // Download chapter commentaries for each chapter in the book (includes both English and Luganda)
          for (let chapter = 1; chapter <= book.total_chapters; chapter++) {
            const response = await fetch(`/api/chapter-commentaries?bookId=${bookId}&chapter=${chapter}`);
            if (response.ok) {
              const commentary = await response.json();
              // API returns a single object, not an array
              if (commentary && commentary.english_commentary) {
                // Save to IndexedDB with both English and Luganda content
                const db = await initDB();
                const transaction = db.transaction(['commentaries'], 'readwrite');
                const store = transaction.objectStore('commentaries');
                
                await new Promise<void>((resolve) => {
                  const request = store.put({
                    id: `${bookId}-${chapter}`,
                    book_id: bookId,
                    chapter,
                    english_commentary: commentary.english_commentary,
                    luganda_commentary: commentary.luganda_commentary,
                    cached_at: new Date().toISOString(),
                  });
                  request.onsuccess = () => resolve();
                  request.onerror = () => resolve();
                });
              }
            }
          }

          completed++;
          setCommentaryDownloadProgress(Math.round((completed / bookIds.length) * 100));
        } catch (error) {
          console.error(`Error downloading commentaries for book ${bookId}:`, error);
        }
      }

      await verifyDownloadedCommentaries();
      setMessage(`Successfully downloaded commentaries for ${completed} book(s) in English & Luganda!`);

      // Mark as downloaded
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          await fetch('/api/content-updates/mark-downloaded', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail, contentType: 'commentaries' }),
          });
        } catch (error) {
          console.error('Failed to mark as downloaded:', error);
        }
      }
    } catch (error) {
      console.error('Error downloading commentaries:', error);
      setMessage('Failed to download commentaries. Please try again.');
    } finally {
      setDownloadingCommentaries(false);
    }
  };

  // Download selected verse prayer passages
  const downloadSelectedPrayers = async () => {
    if (selectedPrayerBooks.size === 0) {
      setMessage('Please select at least one book for prayer download.');
      return;
    }

    setDownloadingPrayers(true);
    setPrayerDownloadProgress(0);
    setMessage('Downloading verse-by-verse prayers...');

    try {
      const bookIds = Array.from(selectedPrayerBooks);
      let completed = 0;

      for (const bookId of bookIds) {
        try {
          const book = books.find(b => b.id === bookId);
          if (!book) continue;

          // Download verse prayers for each chapter in the book
          for (let chapter = 1; chapter <= book.total_chapters; chapter++) {
            const response = await fetch(`/api/verse-prayers?bookId=${bookId}&chapter=${chapter}`);
            if (response.ok) {
              const prayers = await response.json();
              if (prayers && prayers.length > 0) {
                // Save to IndexedDB
                const db = await initDB();
                const transaction = db.transaction(['prayers'], 'readwrite');
                const store = transaction.objectStore('prayers');
                
                for (const prayer of prayers) {
                  await new Promise<void>((resolve) => {
                    const request = store.put({
                      book_id: bookId,
                      chapter,
                      verse_number: prayer.verse_number,
                      english_prayer: prayer.english_prayer,
                      luganda_prayer: prayer.luganda_prayer,
                      cached_at: new Date().toISOString(),
                    });
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                  });
                }
              }
            }
          }

          completed++;
          setPrayerDownloadProgress(Math.round((completed / bookIds.length) * 100));
        } catch (error) {
          console.error(`Error downloading verse prayers for book ${bookId}:`, error);
        }
      }

      await verifyDownloadedPrayers();
      setMessage(`Successfully downloaded verse prayers for ${completed} book(s)!`);

      // Mark as downloaded
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          await fetch('/api/content-updates/mark-downloaded', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail, contentType: 'prayers' }),
          });
        } catch (error) {
          console.error('Failed to mark as downloaded:', error);
        }
      }
    } catch (error) {
      console.error('Error downloading verse prayers:', error);
      setMessage('Failed to download verse prayers. Please try again.');
    } finally {
      setDownloadingPrayers(false);
    }
  };

  // Download devotionals with selected languages
  const downloadDevotionals = async () => {
    if (devotionalLanguages.size === 0) {
      setMessage('Please select at least one language for devotional download.');
      return;
    }

    setDownloadingDevotionals(true);
    setDevotionalDownloadProgress(0);
    setMessage('Downloading devotionals...');

    try {
      // Fetch all published devotional entries
      const response = await fetch('/api/devotional-entries?showAll=true');
      if (!response.ok) {
        throw new Error('Failed to fetch devotionals');
      }

      const devotionals = await response.json();
      
      if (!Array.isArray(devotionals) || devotionals.length === 0) {
        setMessage('No devotionals found to download.');
        setDownloadingDevotionals(false);
        return;
      }

      const db = await initDB();
      let saved = 0;

      for (let i = 0; i < devotionals.length; i++) {
        const devotional = devotionals[i];
        
        // Filter devotional data based on selected languages
        const filteredDevotional: any = {
          id: devotional.id,
          plan_id: devotional.plan_id,
          scheduled_date: devotional.scheduled_date,
          title: devotional.title,
          scripture_book: devotional.scripture_book,
          scripture_chapter: devotional.scripture_chapter,
          scripture_verse: devotional.scripture_verse,
          scripture_quotation: devotional.scripture_quotation,
          related_scriptures: devotional.related_scriptures,
          further_readings: devotional.further_readings,
          author: devotional.author,
          cover_photo_url: devotional.cover_photo_url,
          is_published: devotional.is_published,
          created_at: devotional.created_at,
          cached_at: new Date().toISOString(),
        };

        // Include language-specific content based on selection
        if (devotionalLanguages.has('english')) {
          filteredDevotional.devotional_text = devotional.devotional_text;
        }
        if (devotionalLanguages.has('luganda')) {
          filteredDevotional.devotional_text_lu = devotional.devotional_text_lu;
        }

        // Save to IndexedDB
        try {
          const transaction = db.transaction(['devotionals'], 'readwrite');
          const store = transaction.objectStore('devotionals');
          
          await new Promise<void>((resolve, reject) => {
            const request = store.put(filteredDevotional);
            request.onsuccess = () => {
              saved++;
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        } catch (error) {
          console.error(`Error saving devotional ${devotional.id}:`, error);
        }

        // Update progress
        setDevotionalDownloadProgress(Math.round(((i + 1) / devotionals.length) * 100));
      }

      await verifyDownloadedDevotionals();
      setMessage(`Successfully downloaded ${saved} devotional(s) in ${Array.from(devotionalLanguages).join(' & ')}!`);

      // Mark as downloaded
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          await fetch('/api/content-updates/mark-downloaded', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail, contentType: 'devotionals' }),
          });
        } catch (error) {
          console.error('Failed to mark as downloaded:', error);
        }
      }
    } catch (error) {
      console.error('Error downloading devotionals:', error);
      setMessage('Failed to download devotionals. Please try again.');
    } finally {
      setDownloadingDevotionals(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Download Q&A with selected languages
  const downloadQA = async () => {
    if (qaLanguages.size === 0) {
      setMessage('Please select at least one language for Q&A download.');
      return;
    }

    setDownloadingQA(true);
    setQaDownloadProgress(0);
    setMessage('Downloading Q&A entries...');

    try {
      // Fetch all published Q&A entries
      const response = await fetch('/api/bible-qa');
      if (!response.ok) {
        throw new Error('Failed to fetch Q&A');
      }

      const qaData = await response.json();
      
      if (!Array.isArray(qaData) || qaData.length === 0) {
        setMessage('No Q&A entries found to download.');
        setDownloadingQA(false);
        return;
      }

      // Filter only published entries
      const publishedQA = qaData.filter((q: any) => q.is_published);

      const db = await initDB();
      let saved = 0;

      for (let i = 0; i < publishedQA.length; i++) {
        const qa = publishedQA[i];
        
        // Filter Q&A data based on selected languages
        const filteredQA: any = {
          id: qa.id,
          topic: qa.topic,
          slug: qa.slug,
          is_published: qa.is_published,
          created_at: qa.created_at,
          updated_at: qa.updated_at,
          scripture_refs: qa.scripture_refs,
          cached_at: new Date().toISOString(),
        };

        // Include language-specific content based on selection
        if (qaLanguages.has('english')) {
          filteredQA.question = qa.question;
          filteredQA.answer = qa.answer;
        }
        if (qaLanguages.has('luganda')) {
          filteredQA.question_lu = qa.question_lu;
          filteredQA.answer_lu = qa.answer_lu;
        }

        // Save to IndexedDB
        try {
          const transaction = db.transaction(['qa'], 'readwrite');
          const store = transaction.objectStore('qa');
          
          await new Promise<void>((resolve, reject) => {
            const request = store.put(filteredQA);
            request.onsuccess = () => {
              saved++;
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        } catch (error) {
          console.error(`Error saving Q&A ${qa.id}:`, error);
        }

        // Update progress
        setQaDownloadProgress(Math.round(((i + 1) / publishedQA.length) * 100));
      }

      await verifyDownloadedQA();
      setMessage(`Successfully downloaded ${saved} Q&A entr${saved === 1 ? 'y' : 'ies'} in ${Array.from(qaLanguages).join(' & ')}!`);

      // Mark as downloaded
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          await fetch('/api/content-updates/mark-downloaded', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail, contentType: 'qa' }),
          });
        } catch (error) {
          console.error('Failed to mark as downloaded:', error);
        }
      }
    } catch (error) {
      console.error('Error downloading Q&A:', error);
      setMessage('Failed to download Q&A. Please try again.');
    } finally {
      setDownloadingQA(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const downloadEverything = async () => {
    try {
      await syncAll((progress) => {
        setDownloadProgress(progress);
      });

      setTimeout(() => {
        setDownloadProgress(0);
        verifyDownloadedBooks(); // Re-verify after download
      }, 2000);

      loadStorageInfo();
      checkUpdates(); // Refresh update status after download
    } catch (error) {
      console.error('Error downloading everything:', error);
    }
  };

  const handleDownloadSelectedUpdates = async (selectedCategories: string[]) => {
    try {
      await syncSelectedCategories(selectedCategories, serverVersions, (progress) => {
        setDownloadProgress(progress);
      });

      setTimeout(() => {
        setDownloadProgress(0);
        setShowUpdateModal(false);
      }, 2000);

      loadStorageInfo();
      checkUpdates(); // Refresh update status
    } catch (error) {
      console.error('Error downloading selected categories:', error);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to delete all offline content? This cannot be undone.')) {
      return;
    }

    try {
      await clearStore('verses');
      await clearStore('chapters');
      await clearStore('commentaries');
      await clearStore('prayers');
      await clearStore('devotionals');
      await clearStore('theological_insights');
      await clearStore('historical_context');
      await clearStore('verse_of_the_day');
      await clearStore('qa');

      // Clear download progress
      localStorage.removeItem('downloadProgress');

      loadStorageInfo();
      alert('All offline content has been deleted.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing offline content. Please try again.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <>
      <UpdateAvailableModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updates={updates}
        onDownloadSelected={handleDownloadSelectedUpdates}
        isDownloading={syncStatus.isSyncing}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Offline Content</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Tabs and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('download')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'download'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Download
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'manage'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manage Storage
              </button>
            </div>

            {/* Check for Updates Button */}
            <button
              onClick={checkUpdates}
              disabled={isCheckingUpdates}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isCheckingUpdates ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Check for Updates
                  {updates.filter(u => u.hasUpdate).length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-bold">
                      {updates.filter(u => u.hasUpdate).length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'download' ? (
            <div className="space-y-6">
              {/* Language Info Banner */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-600 rounded-lg flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Bilingual Content</h4>
                    <p className="text-sm text-gray-700">
                      All downloaded content includes both <span className="font-semibold text-green-700">English</span> and <span className="font-semibold text-blue-700">Luganda</span> translations. 
                      Switch between languages anytime while reading, even offline!
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Quick Download</h3>
                <button
                  onClick={downloadEverything}
                  disabled={syncStatus.isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncStatus.isSyncing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Downloading... {Math.round(downloadProgress)}%
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download All Bible Content
                    </>
                  )}
                </button>
                <p className="text-sm text-blue-700 mt-2">
                  Downloads all 66 books, commentaries, prayers, devotionals, and Q&A in English & Luganda for complete offline access
                </p>
              </div>

              {/* Progress Bar */}
              {syncStatus.isSyncing && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {syncStatus.currentCategory || 'Preparing download...'}
                    </span>
                    <span className="text-sm text-gray-600">{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>

                  {/* Category Progress Details */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(syncStatus.categoryProgress).map(([category, progress]) => (
                      <div key={category} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 flex-1">
                          {progress.status === 'completed' && (
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                          {progress.status === 'syncing' && (
                            <Loader className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                          )}
                          {progress.status === 'error' && (
                            <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                          )}
                          {progress.status === 'pending' && (
                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
                          )}
                          <span
                            className={`font-medium ${
                              progress.status === 'completed'
                                ? 'text-green-700'
                                : progress.status === 'syncing'
                                ? 'text-blue-700'
                                : progress.status === 'error'
                                ? 'text-red-700'
                                : 'text-gray-500'
                            }`}
                          >
                            {category}
                          </span>
                        </div>
                        <span className="text-gray-600 ml-2">
                          {progress.total > 0 ? `${progress.completed}/${progress.total}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {syncStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">Download Error</h4>
                    <p className="text-sm text-red-700">{syncStatus.error}</p>
                  </div>
                </div>
              )}

              {/* Downloaded Books - Open for Reading */}
              {Object.values(verifiedBooks).some(v => v.downloaded) && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Downloaded Books (Ready Offline)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {books.filter(book => verifiedBooks[book.id]?.downloaded).map((book) => {
                      const verification = verifiedBooks[book.id];
                      const verseCount = verification?.verseCount || 0;
                      
                      return (
                        <Link
                          key={book.id}
                          href={`/bible-reader/${book.book_number}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-colors"
                        >
                          <div className="w-5 h-5 rounded bg-green-600 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {book.name_english}
                            </div>
                            <div className="text-sm text-gray-600">
                              {book.total_chapters} chapters • {verseCount} verses
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Book Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Select Books to Download</h3>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={verifyDownloadedBooks}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                      title="Refresh download status"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Verify
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={selectAll}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {books.map((book) => {
                    const verification = verifiedBooks[book.id];
                    const isDownloaded = verification?.downloaded || false;
                    const verseCount = verification?.verseCount || 0;
                    
                    return (
                      <button
                        key={book.id}
                        onClick={() => toggleBookSelection(book.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedBooks.has(book.id)
                            ? 'border-blue-500 bg-blue-50'
                            : isDownloaded
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            selectedBooks.has(book.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedBooks.has(book.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 truncate">
                              {book.name_english}
                            </div>
                            {isDownloaded && (
                              <span className="flex-shrink-0 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                ✓ Downloaded
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {book.total_chapters} chapters
                            {isDownloaded && verseCount > 0 && (
                              <span className="text-green-700 ml-1">• {verseCount} verses saved</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={downloadSelected}
                  disabled={selectedBooks.size === 0 || syncStatus.isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Download {selectedBooks.size} Selected {selectedBooks.size === 1 ? 'Book' : 'Books'}
                </button>
              </div>

              {/* Commentary Download Section */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Download Commentaries</h3>
                    <p className="text-sm text-gray-600 mt-1">Chapter-by-chapter Bible commentaries (includes English & Luganda)</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={verifyDownloadedCommentaries}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                      title="Refresh commentary status"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Verify
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={selectAllCommentaries}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllCommentaries}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {books.map((book) => {
                    const verification = verifiedCommentaries[book.id];
                    const isDownloaded = verification?.downloaded || false;
                    const chapterCount = verification?.chapterCount || 0;
                    
                    return (
                      <button
                        key={`commentary-${book.id}`}
                        onClick={() => toggleCommentaryBookSelection(book.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedCommentaryBooks.has(book.id)
                            ? 'border-blue-500 bg-blue-50'
                            : isDownloaded
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            selectedCommentaryBooks.has(book.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedCommentaryBooks.has(book.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 truncate">
                              {book.name_english}
                            </div>
                            {isDownloaded && (
                              <span className="flex-shrink-0 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                ✓ Downloaded
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {book.total_chapters} chapters
                            {isDownloaded && chapterCount > 0 && (
                              <span className="text-green-700 ml-1">• {chapterCount} commentaries saved</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {downloadingCommentaries && (
                  <div className="bg-purple-100 border border-purple-300 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Download className="w-5 h-5 text-purple-600 animate-bounce" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-purple-900">
                          Downloading commentaries (English & Luganda)... {commentaryDownloadProgress}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${commentaryDownloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={downloadSelectedCommentaries}
                  disabled={selectedCommentaryBooks.size === 0 || syncStatus.isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Download {selectedCommentaryBooks.size} Selected {selectedCommentaryBooks.size === 1 ? 'Commentary' : 'Commentaries'} (EN & LU)
                </button>
              </div>

              {/* Verse Prayer Passages Download Section */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-600 rounded-lg">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Download Verse-by-Verse Prayers</h3>
                      <p className="text-sm text-gray-600">Verse-by-verse prayer passages (includes English & Luganda)</p>
                    </div>
                  </div>
                  <button
                    onClick={verifyDownloadedPrayers}
                    disabled={syncStatus.isSyncing}
                    className="px-3 py-1.5 rounded-lg bg-pink-100 text-pink-700 text-sm font-medium hover:bg-pink-200 transition-colors disabled:opacity-50"
                  >
                    Verify
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPrayerBooks(new Set(books.map(b => b.id)))}
                    className="flex-1 px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedPrayerBooks(new Set())}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {downloadingPrayers && (
                  <div className="bg-pink-100 border border-pink-300 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Download className="w-5 h-5 text-pink-600 animate-bounce" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-pink-900">
                          Downloading verse prayers... {prayerDownloadProgress}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-pink-200 rounded-full h-2">
                      <div
                        className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${prayerDownloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                  {books.map((book) => {
                    const isSelected = selectedPrayerBooks.has(book.id);
                    const isDownloaded = downloadedPrayers.has(book.id);
                    const verseCount = prayerVerseCounts[book.id] || 0;

                    return (
                      <button
                        key={book.id}
                        onClick={() => {
                          const newSet = new Set(selectedPrayerBooks);
                          if (isSelected) {
                            newSet.delete(book.id);
                          } else {
                            newSet.add(book.id);
                          }
                          setSelectedPrayerBooks(newSet);
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50'
                            : isDownloaded
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-pink-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{book.name_english}</div>
                            <div className="text-sm text-gray-500">{book.name_luganda}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="px-2 py-1 rounded-full bg-pink-600 text-white text-xs font-medium">
                                Selected
                              </span>
                            )}
                            {isDownloaded && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                                <Check className="w-3 h-3" />
                                Downloaded
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {book.total_chapters} chapters
                          {isDownloaded && verseCount > 0 && (
                            <span className="text-green-700 ml-1">• {verseCount} prayers saved</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={downloadSelectedPrayers}
                  disabled={selectedPrayerBooks.size === 0 || syncStatus.isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Download {selectedPrayerBooks.size} Selected {selectedPrayerBooks.size === 1 ? 'Prayer' : 'Prayers'} (EN & LU)
                </button>
              </div>

              {/* Devotionals Download Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-600 rounded-lg">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Download Devotionals</h3>
                      <p className="text-sm text-gray-600">Daily devotional content for offline access</p>
                    </div>
                  </div>
                  {downloadedDevotionals > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">{downloadedDevotionals} saved</span>
                    </div>
                  )}
                </div>

                {/* Language Selection */}
                <div className="bg-white border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Select Languages to Download</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const newSet = new Set(devotionalLanguages);
                        if (newSet.has('english')) {
                          newSet.delete('english');
                        } else {
                          newSet.add('english');
                        }
                        setDevotionalLanguages(newSet);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        devotionalLanguages.has('english')
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-amber-300'
                      }`}
                    >
                      {devotionalLanguages.has('english') && <Check className="w-4 h-4" />}
                      <span className="font-medium">English</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const newSet = new Set(devotionalLanguages);
                        if (newSet.has('luganda')) {
                          newSet.delete('luganda');
                        } else {
                          newSet.add('luganda');
                        }
                        setDevotionalLanguages(newSet);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        devotionalLanguages.has('luganda')
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-amber-300'
                      }`}
                    >
                      {devotionalLanguages.has('luganda') && <Check className="w-4 h-4" />}
                      <span className="font-medium">Luganda</span>
                    </button>

                    <button
                      onClick={() => {
                        if (devotionalLanguages.has('english') && devotionalLanguages.has('luganda')) {
                          setDevotionalLanguages(new Set());
                        } else {
                          setDevotionalLanguages(new Set(['english', 'luganda']));
                        }
                      }}
                      className="ml-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      {devotionalLanguages.has('english') && devotionalLanguages.has('luganda') ? 'Deselect All' : 'Select Both'}
                    </button>
                  </div>
                </div>

                {/* Download Status Message */}
                {message && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    {message}
                  </div>
                )}

                {/* Progress Bar */}
                {downloadingDevotionals && (
                  <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Download className="w-5 h-5 text-amber-600 animate-bounce" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-amber-900">
                          Downloading devotionals... {devotionalDownloadProgress}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${devotionalDownloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Download Button */}
                <button
                  onClick={downloadDevotionals}
                  disabled={devotionalLanguages.size === 0 || syncStatus.isSyncing || downloadingDevotionals}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {downloadingDevotionals ? 'Downloading...' : `Download Devotionals (${Array.from(devotionalLanguages).join(' & ')})`}
                </button>

                {/* Info Text */}
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Devotionals will be available offline in your selected language(s). 
                    You can change language selection and re-download to update content.
                  </p>
                </div>
              </div>

              {/* Q&A Download Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg">
                      <HelpCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Download Bible Q&A</h3>
                      <p className="text-sm text-gray-600">Biblical questions & answers for offline access</p>
                    </div>
                  </div>
                  {downloadedQA > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">{downloadedQA} saved</span>
                    </div>
                  )}
                </div>

                {/* Language Selection */}
                <div className="bg-white border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Select Languages to Download</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const newSet = new Set(qaLanguages);
                        if (newSet.has('english')) {
                          newSet.delete('english');
                        } else {
                          newSet.add('english');
                        }
                        setQaLanguages(newSet);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        qaLanguages.has('english')
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      {qaLanguages.has('english') && <Check className="w-4 h-4" />}
                      <span className="font-medium">English</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const newSet = new Set(qaLanguages);
                        if (newSet.has('luganda')) {
                          newSet.delete('luganda');
                        } else {
                          newSet.add('luganda');
                        }
                        setQaLanguages(newSet);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        qaLanguages.has('luganda')
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      {qaLanguages.has('luganda') && <Check className="w-4 h-4" />}
                      <span className="font-medium">Luganda</span>
                    </button>

                    <button
                      onClick={() => {
                        if (qaLanguages.has('english') && qaLanguages.has('luganda')) {
                          setQaLanguages(new Set());
                        } else {
                          setQaLanguages(new Set(['english', 'luganda']));
                        }
                      }}
                      className="ml-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      {qaLanguages.has('english') && qaLanguages.has('luganda') ? 'Deselect All' : 'Select Both'}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {downloadingQA && (
                  <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Download className="w-5 h-5 text-indigo-600 animate-bounce" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-indigo-900">
                          Downloading Q&A... {qaDownloadProgress}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${qaDownloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Download Button */}
                <button
                  onClick={downloadQA}
                  disabled={qaLanguages.size === 0 || syncStatus.isSyncing || downloadingQA}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {downloadingQA ? 'Downloading...' : `Download Q&A (${Array.from(qaLanguages).join(' & ')})`}
                </button>

                {/* Info Text */}
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Q&A entries will be available offline in your selected language(s). 
                    All scripture references and topics will be included.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Storage Info */}
              {storageInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <HardDrive className="w-6 h-6 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Storage Usage</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Used</span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {formatBytes(storageInfo.usage)}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available</span>
                      <span className="text-sm text-gray-600">
                        {formatBytes(storageInfo.quota - storageInfo.usage)} of {formatBytes(storageInfo.quota)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Sync */}
              {syncStatus.lastSyncTime && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check className="w-5 h-5" />
                    <div>
                      <div className="font-medium">Last Synced</div>
                      <div className="text-sm text-green-700">
                        {syncStatus.lastSyncTime.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Clear Data */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Delete Offline Content</h3>
                    <p className="text-sm text-red-700">
                      This will permanently delete all downloaded Bible content, devotionals, and cached data.
                      You can re-download content anytime when online.
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearAllData}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Offline Content
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
