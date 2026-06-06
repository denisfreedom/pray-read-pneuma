'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  saveChapterVerses,
  saveChapterContent,
  saveBooks,
  getBooks,
  saveDevotional,
  getAllDevotionals,
  saveVerseOfTheDay,
  saveToStore,
  saveBulkToStore,
} from '@/app/utils/offlineStorage';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  itemsSynced: number;
  totalItems: number;
  error: string | null;
  currentCategory: string;
  categoryProgress: Record<string, { completed: number; total: number; status: 'pending' | 'syncing' | 'completed' | 'error' }>;
}

export interface DownloadProgress {
  category: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface ContentVersion {
  version: string;
  count: number;
  versesCount?: number;
  label: string;
}

export interface ContentUpdate {
  category: string;
  label: string;
  hasUpdate: boolean;
  localVersion?: string;
  serverVersion: string;
  count: number;
}

const MAX_RETRIES = 3;
const CHUNK_SIZE = 10; // Process 10 items at a time
const RETRY_DELAY = 2000; // 2 seconds between retries

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    itemsSynced: 0,
    totalItems: 0,
    error: null,
    currentCategory: '',
    categoryProgress: {},
  });

  // Load last sync time and progress from localStorage
  useEffect(() => {
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date(lastSync),
      }));
    }

    const savedProgress = localStorage.getItem('downloadProgress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setSyncStatus(prev => ({
          ...prev,
          categoryProgress: progress,
        }));
      } catch (e) {
        console.error('Failed to parse saved progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((progress: Record<string, any>) => {
    localStorage.setItem('downloadProgress', JSON.stringify(progress));
  }, []);

  // Retry wrapper with exponential backoff
  const retryFetch = async <T,>(
    fetchFn: () => Promise<T>,
    retries = MAX_RETRIES,
    delay = RETRY_DELAY
  ): Promise<T> => {
    try {
      return await fetchFn();
    } catch (error) {
      console.error(`[RETRY] Fetch failed, ${retries} retries left:`, error);
      if (retries > 0) {
        console.log(`[RETRY] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryFetch(fetchFn, retries - 1, delay * 1.5);
      }
      console.error('[RETRY] Max retries exceeded, giving up');
      throw error;
    }
  };

  // Update category progress
  const updateCategoryProgress = useCallback((
    category: string,
    update: Partial<{ completed: number; total: number; status: 'pending' | 'syncing' | 'completed' | 'error' }>
  ) => {
    console.log(`[PROGRESS] ${category}:`, update);
    setSyncStatus(prev => {
      const newProgress = {
        ...prev.categoryProgress,
        [category]: {
          ...prev.categoryProgress[category],
          ...update,
        },
      };
      saveProgress(newProgress);
      return {
        ...prev,
        categoryProgress: newProgress,
        currentCategory: category,
      };
    });
  }, [saveProgress]);

  // Sync all Bible books metadata
  const syncBibleBooks = useCallback(async () => {
    const category = 'Bible Books';
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' });

    try {
      const books = await retryFetch(async () => {
        const response = await fetch('/api/bible-books');
        if (!response.ok) throw new Error('Failed to fetch books');
        return response.json();
      });

      await saveBooks(books);
      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' });
      return books;
    } catch (error) {
      updateCategoryProgress(category, { status: 'error' });
      console.error('Error syncing books:', error);
      throw error;
    }
  }, [updateCategoryProgress]);

  // Sync Bible verses in chunks
  const syncBibleVerses = useCallback(async (books: any[]) => {
    const category = 'Bible Verses';
    const totalChapters = books.reduce((sum, book) => sum + (book.total_chapters || 0), 0);
    
    console.log(`[SYNC] Starting Bible Verses sync - ${books.length} books, ${totalChapters} total chapters`);
    updateCategoryProgress(category, { completed: 0, total: totalChapters, status: 'syncing' });

    let completed = 0;
    let failedChapters: Array<{ bookId: number; bookNumber: number; chapter: number }> = [];

    for (const book of books) {
      if (!book.total_chapters) continue;

      console.log(`[SYNC] Starting book: ${book.name_english} (${book.total_chapters} chapters)`);

      // Process chapters in chunks
      for (let chunkStart = 1; chunkStart <= book.total_chapters; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, book.total_chapters);
        const chunkPromises = [];

        console.log(`[SYNC] Processing ${book.name_english} chapters ${chunkStart}-${chunkEnd}`);

        for (let chapter = chunkStart; chapter <= chunkEnd; chapter++) {
          const fetchChapter = async () => {
            try {
              console.log(`[SYNC] Fetching ${book.name_english} ${chapter} (book_id=${book.id})...`);
              const verses = await retryFetch(async () => {
                const response = await fetch(`/api/bible-verses?bookId=${book.id}&chapter=${chapter}`);
                console.log(`[SYNC] Response status for ${book.name_english} ${chapter}:`, response.status);
                if (!response.ok) throw new Error(`Failed to fetch verses for ${book.name_english} ${chapter}`);
                const data = await response.json();
                console.log(`[SYNC] Fetched ${data.verses?.length || 0} verses for ${book.name_english} ${chapter}`);
                return data;
              });

              console.log(`[SYNC] Saving ${book.name_english} ${chapter} (${verses.verses?.length || 0} verses)`);
              await saveChapterVerses(book.id, chapter, verses.verses || []);
              completed++;
              console.log(`[SYNC] Progress: ${completed}/${totalChapters} (${Math.round((completed/totalChapters)*100)}%)`);
              updateCategoryProgress(category, { completed, total: totalChapters });
            } catch (error) {
              console.error(`[SYNC ERROR] Failed to sync ${book.name_english} ${chapter}:`, error);
              failedChapters.push({ bookId: book.id, bookNumber: book.book_number, chapter });
            }
          };

          chunkPromises.push(fetchChapter());
        }

        // Wait for chunk to complete before moving to next
        console.log(`[SYNC] Waiting for chunk ${chunkStart}-${chunkEnd} to complete...`);
        await Promise.all(chunkPromises);
        console.log(`[SYNC] Chunk ${chunkStart}-${chunkEnd} completed`);
      }
    }

    // Retry failed chapters one more time
    if (failedChapters.length > 0) {
      console.log(`Retrying ${failedChapters.length} failed chapters...`);
      for (const { bookId, chapter } of failedChapters) {
        try {
          const verses = await retryFetch(async () => {
            const response = await fetch(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}`);
            if (!response.ok) throw new Error('Retry failed');
            return response.json();
          });
          await saveChapterVerses(bookId, chapter, verses.verses || []);
          completed++;
          updateCategoryProgress(category, { completed, total: totalChapters });
        } catch (error) {
          console.error(`Final retry failed for book ${bookId} chapter ${chapter}`);
        }
      }
    }

    updateCategoryProgress(category, { status: 'completed' });
    return completed;
  }, [updateCategoryProgress]);

  // Sync commentaries
  const syncCommentaries = useCallback(async (books: any[]) => {
    const category = 'Commentaries';
    const totalChapters = books.reduce((sum, book) => sum + (book.total_chapters || 0), 0);
    
    updateCategoryProgress(category, { completed: 0, total: totalChapters, status: 'syncing' });

    let completed = 0;

    for (const book of books) {
      if (!book.total_chapters) continue;

      for (let chunkStart = 1; chunkStart <= book.total_chapters; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, book.total_chapters);
        const chunkPromises = [];

        for (let chapter = chunkStart; chapter <= chunkEnd; chapter++) {
          chunkPromises.push(
            retryFetch(async () => {
              const response = await fetch(`/api/commentaries?bookId=${book.id}&chapter=${chapter}`);
              if (response.ok) {
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                  await saveToStore('commentaries', {
                    id: `${book.id}-${chapter}`,
                    book_id: book.id,
                    chapter,
                    ...data,
                    cached_at: new Date().toISOString(),
                  });
                }
              }
              completed++;
              updateCategoryProgress(category, { completed, total: totalChapters });
            }).catch(err => {
              console.error(`Failed to sync commentary ${book.id}:${chapter}`, err);
              completed++;
              updateCategoryProgress(category, { completed, total: totalChapters });
            })
          );
        }

        await Promise.all(chunkPromises);
      }
    }

    updateCategoryProgress(category, { status: 'completed' });
    return completed;
  }, [updateCategoryProgress]);

  // Sync prayers
  const syncPrayers = useCallback(async (books: any[]) => {
    const category = 'Prayer Passages';
    const totalChapters = books.reduce((sum, book) => sum + (book.total_chapters || 0), 0);
    
    updateCategoryProgress(category, { completed: 0, total: totalChapters, status: 'syncing' });

    let completed = 0;

    for (const book of books) {
      if (!book.total_chapters) continue;

      for (let chunkStart = 1; chunkStart <= book.total_chapters; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, book.total_chapters);
        const chunkPromises = [];

        for (let chapter = chunkStart; chapter <= chunkEnd; chapter++) {
          chunkPromises.push(
            retryFetch(async () => {
              const response = await fetch(`/api/chapter-prayers?bookId=${book.id}&chapter=${chapter}`);
              if (response.ok) {
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                  await saveToStore('prayers', {
                    id: `${book.id}-${chapter}`,
                    book_id: book.id,
                    chapter,
                    ...data,
                    cached_at: new Date().toISOString(),
                  });
                }
              }
              completed++;
              updateCategoryProgress(category, { completed, total: totalChapters });
            }).catch(err => {
              console.error(`Failed to sync prayer ${book.id}:${chapter}`, err);
              completed++;
              updateCategoryProgress(category, { completed, total: totalChapters });
            })
          );
        }

        await Promise.all(chunkPromises);
      }
    }

    updateCategoryProgress(category, { status: 'completed' });
    return completed;
  }, [updateCategoryProgress]);

  // Sync introductions
  const syncIntroductions = useCallback(async (books: any[]) => {
    const category = 'Introductions';
    const totalChapters = books.reduce((sum, book) => sum + (book.total_chapters || 0), 0);
    
    updateCategoryProgress(category, { completed: 0, total: totalChapters, status: 'syncing' });

    let completed = 0;

    for (const book of books) {
      if (!book.total_chapters) continue;

      for (let chunkStart = 1; chunkStart <= book.total_chapters; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, book.total_chapters);
        const chunkPromises = [];

        for (let chapter = chunkStart; chapter <= chunkEnd; chapter++) {
          chunkPromises.push(
            retryFetch(async () => {
              const response = await fetch(`/api/chapter-introductions?bookId=${book.id}&chapter=${chapter}`);
              if (response.ok) {
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                  await saveChapterContent(book.id, chapter, data);
                }
              }
              completed++;
              updateCategoryProgress(category, { completed, total: totalChapters });
            }).catch(err => {
              console.error(`Failed to sync introduction ${book.id}:${chapter}`, err);
              completed++;
              updateCategoryProgress(category, { completed, total: totalChapters });
            })
          );
        }

        await Promise.all(chunkPromises);
      }
    }

    updateCategoryProgress(category, { status: 'completed' });
    return completed;
  }, [updateCategoryProgress]);

  // Sync theological insights
  const syncTheologicalInsights = useCallback(async (books: any[]) => {
    const category = 'Theological Insights';
    
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' });

    try {
      const insights = await retryFetch(async () => {
        const response = await fetch('/api/all-theological-insights');
        if (!response.ok) throw new Error('Failed to fetch theological insights');
        return response.json();
      });

      if (Array.isArray(insights)) {
        await saveBulkToStore('theological_insights', insights);
      }

      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' });
      return insights.length || 0;
    } catch (error) {
      updateCategoryProgress(category, { status: 'error' });
      console.error('Error syncing theological insights:', error);
      return 0;
    }
  }, [updateCategoryProgress]);

  // Sync historical context
  const syncHistoricalContext = useCallback(async (books: any[]) => {
    const category = 'Historical Context';
    
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' });

    try {
      const context = await retryFetch(async () => {
        const response = await fetch('/api/all-historical-context');
        if (!response.ok) throw new Error('Failed to fetch historical context');
        return response.json();
      });

      if (Array.isArray(context)) {
        await saveBulkToStore('historical_context', context);
      }

      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' });
      return context.length || 0;
    } catch (error) {
      updateCategoryProgress(category, { status: 'error' });
      console.error('Error syncing historical context:', error);
      return 0;
    }
  }, [updateCategoryProgress]);

  // Sync devotionals
  const syncDevotionals = useCallback(async () => {
    const category = 'Devotionals';
    
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' });

    try {
      const devotionals = await retryFetch(async () => {
        const response = await fetch('/api/devotional-plans');
        if (!response.ok) throw new Error('Failed to fetch devotionals');
        return response.json();
      });

      for (const devotional of devotionals) {
        await saveDevotional(devotional);
      }

      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' });
      return devotionals.length;
    } catch (error) {
      updateCategoryProgress(category, { status: 'error' });
      console.error('Error syncing devotionals:', error);
      return 0;
    }
  }, [updateCategoryProgress]);

  // Sync Q&A
  const syncQA = useCallback(async () => {
    const category = 'Q&A';
    
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' });

    try {
      const qa = await retryFetch(async () => {
        const response = await fetch('/api/bible-qa');
        if (!response.ok) throw new Error('Failed to fetch Q&A');
        return response.json();
      });

      if (Array.isArray(qa)) {
        await saveBulkToStore('qa', qa);
      }

      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' });
      return qa.length || 0;
    } catch (error) {
      updateCategoryProgress(category, { status: 'error' });
      console.error('Error syncing Q&A:', error);
      return 0;
    }
  }, [updateCategoryProgress]);

  // Sync verse of the day
  const syncVerseOfTheDay = useCallback(async () => {
    const category = 'Verse of the Day';
    
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' });

    try {
      const verse = await retryFetch(async () => {
        const response = await fetch('/api/verse-of-the-day');
        if (!response.ok) throw new Error('Failed to fetch verse of the day');
        return response.json();
      });

      const today = new Date().toISOString().split('T')[0];
      await saveVerseOfTheDay(today, verse);

      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' });
      return true;
    } catch (error) {
      updateCategoryProgress(category, { status: 'error' });
      console.error('Error syncing verse of the day:', error);
      return false;
    }
  }, [updateCategoryProgress]);

  // Save content version after successful download
  const saveContentVersion = useCallback((category: string, version: string) => {
    const localVersions = JSON.parse(localStorage.getItem('contentVersions') || '{}');
    
    const categoryKeyMap: Record<string, string> = {
      'Bible Books': 'bibleBooks',
      'Bible Verses': 'bibleVerses',
      'Commentaries': 'commentaries',
      'Prayer Passages': 'prayers',
      'Introductions': 'introductions',
      'Theological Insights': 'theological',
      'Historical Context': 'historical',
      'Devotionals': 'devotionals',
      'Q&A': 'qa',
      'Verse of the Day': 'verseOfTheDay',
    };
    
    const key = categoryKeyMap[category];
    if (key) {
      localVersions[key] = version;
      localStorage.setItem('contentVersions', JSON.stringify(localVersions));
    }
  }, []);

  // Full sync - sync everything sequentially with retry
  const syncAll = useCallback(async (onProgress?: (progress: number) => void) => {
    console.log('[SYNC] Starting full syncAll...');
    setSyncStatus({
      isSyncing: true,
      lastSyncTime: null,
      itemsSynced: 0,
      totalItems: 0,
      error: null,
      currentCategory: '',
      categoryProgress: {},
    });

    try {
      // Get server versions
      console.log('[SYNC] Fetching server versions from /api/offline-sync...');
      const versionResponse = await fetch('/api/offline-sync');
      console.log('[SYNC] Version response status:', versionResponse.status);
      
      if (!versionResponse.ok) {
        throw new Error('Failed to fetch server versions');
      }
      const responseData = await versionResponse.json();
      console.log('[SYNC] Server versions received:', responseData);
      
      const versions = responseData?.versions;
      
      if (!versions || !versions.bibleBooks) {
        console.error('[SYNC ERROR] Invalid server response:', responseData);
        throw new Error('Invalid server response: missing version data');
      }
      
      console.log('[SYNC] Server versions validated:', versions);

      // Initialize category progress
      const categories = [
        'Bible Books',
        'Bible Verses',
        'Commentaries',
        'Prayer Passages',
        'Introductions',
        'Theological Insights',
        'Historical Context',
        'Devotionals',
        'Q&A',
        'Verse of the Day',
      ];

      const initialProgress: Record<string, any> = {};
      categories.forEach(cat => {
        initialProgress[cat] = { completed: 0, total: 0, status: 'pending' };
      });

      setSyncStatus(prev => ({
        ...prev,
        categoryProgress: initialProgress,
      }));

      // Step 1: Sync books (metadata) - 5%
      console.log('[SYNC] Step 1: Syncing Bible Books...');
      const books = await syncBibleBooks();
      console.log('[SYNC] Bible Books synced:', books.length, 'books');
      if (versions?.bibleBooks?.version) {
        saveContentVersion('Bible Books', versions.bibleBooks.version);
      }
      onProgress?.(5);

      // Step 2: Sync Bible verses - 5% to 30%
      console.log('[SYNC] Step 2: Syncing Bible Verses...');
      await syncBibleVerses(books);
      console.log('[SYNC] Bible Verses sync completed');
      if (versions?.bibleVerses?.version) {
        saveContentVersion('Bible Verses', versions.bibleVerses.version);
      }
      onProgress?.(30);

      // Step 3: Sync commentaries - 30% to 45%
      await syncCommentaries(books);
      if (versions?.commentaries?.version) {
        saveContentVersion('Commentaries', versions.commentaries.version);
      }
      onProgress?.(45);

      // Step 4: Sync prayers - 45% to 60%
      await syncPrayers(books);
      if (versions?.prayers?.version) {
        saveContentVersion('Prayer Passages', versions.prayers.version);
      }
      onProgress?.(60);

      // Step 5: Sync introductions - 60% to 70%
      await syncIntroductions(books);
      if (versions?.introductions?.version) {
        saveContentVersion('Introductions', versions.introductions.version);
      }
      onProgress?.(70);

      // Step 6: Sync theological insights - 70% to 78%
      await syncTheologicalInsights(books);
      if (versions?.theological?.version) {
        saveContentVersion('Theological Insights', versions.theological.version);
      }
      onProgress?.(78);

      // Step 7: Sync historical context - 78% to 86%
      await syncHistoricalContext(books);
      if (versions?.historical?.version) {
        saveContentVersion('Historical Context', versions.historical.version);
      }
      onProgress?.(86);

      // Step 8: Sync devotionals - 86% to 92%
      await syncDevotionals();
      if (versions?.devotionals?.version) {
        saveContentVersion('Devotionals', versions.devotionals.version);
      }
      onProgress?.(92);

      // Step 9: Sync Q&A - 92% to 96%
      await syncQA();
      if (versions?.qa?.version) {
        saveContentVersion('Q&A', versions.qa.version);
      }
      onProgress?.(96);

      // Step 10: Sync Verse of the Day - 96% to 100%
      await syncVerseOfTheDay();
      if (versions?.verseOfTheDay?.version) {
        saveContentVersion('Verse of the Day', versions.verseOfTheDay.version);
      }
      onProgress?.(100);

      // Complete
      const now = new Date();
      localStorage.setItem('lastSyncTime', now.toISOString());
      localStorage.removeItem('downloadProgress'); // Clear progress after successful completion
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: now,
        error: null,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [
    syncBibleBooks,
    syncBibleVerses,
    syncCommentaries,
    syncPrayers,
    syncIntroductions,
    syncTheologicalInsights,
    syncHistoricalContext,
    syncDevotionals,
    syncQA,
    syncVerseOfTheDay,
    saveContentVersion,
  ]);

  // Sync a specific chapter
  const syncChapter = useCallback(async (bookNumber: number, chapter: number) => {
    try {
      console.log(`[SYNC CHAPTER] Fetching verses for book ${bookNumber} chapter ${chapter}...`);
      
      // Fetch verses
      const versesResponse = await fetch(`/api/bible-verses?bookId=${bookNumber}&chapter=${chapter}`);
      if (versesResponse.ok) {
        const data = await versesResponse.json();
        const verses = data.verses || [];
        console.log(`[SYNC CHAPTER] Fetched ${verses.length} verses for book ${bookNumber} chapter ${chapter}`);
        
        // Save to IndexedDB
        console.log(`[SYNC CHAPTER] Writing ${verses.length} verses to IndexedDB...`);
        await saveChapterVerses(bookNumber, chapter, verses);
        console.log(`[SYNC CHAPTER] ✓ Verses written to IndexedDB for book ${bookNumber} chapter ${chapter}`);
        
        // Verify the write operation
        const { getByIndex } = await import('@/app/utils/offlineStorage');
        const savedVerses = await getByIndex('verses', 'book_chapter', [bookNumber, chapter]);
        console.log(`[SYNC CHAPTER] ✓ Verification: ${savedVerses.length} verses confirmed in IndexedDB for book ${bookNumber} chapter ${chapter}`);
      } else {
        console.warn(`[SYNC CHAPTER] Failed to fetch verses for book ${bookNumber} chapter ${chapter}: ${versesResponse.status}`);
      }

      // Fetch chapter content (commentary, prayers, etc.)
      console.log(`[SYNC CHAPTER] Fetching chapter content for book ${bookNumber} chapter ${chapter}...`);
      const contentResponse = await fetch(`/api/bible-content?bookId=${bookNumber}&chapter=${chapter}`);
      if (contentResponse.ok) {
        const content = await contentResponse.json();
        console.log(`[SYNC CHAPTER] Writing chapter content to IndexedDB for book ${bookNumber} chapter ${chapter}...`);
        await saveChapterContent(bookNumber, chapter, content);
        console.log(`[SYNC CHAPTER] ✓ Chapter content written to IndexedDB for book ${bookNumber} chapter ${chapter}`);
      } else {
        console.warn(`[SYNC CHAPTER] No chapter content available for book ${bookNumber} chapter ${chapter}: ${contentResponse.status}`);
      }

      console.log(`[SYNC CHAPTER] ✓ Chapter ${bookNumber}:${chapter} sync complete and persisted to IndexedDB`);
      return true;
    } catch (error) {
      console.error(`[SYNC CHAPTER] ✗ Error syncing chapter ${bookNumber}:${chapter}:`, error);
      throw error;
    }
  }, []);

  // Sync a full book (all chapters)
  const syncBook = useCallback(async (bookId: number, totalChapters: number) => {
    console.log(`[SYNC BOOK] Starting download for book ${bookId}, ${totalChapters} chapters`);
    const results = [];
    
    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      try {
        console.log(`[SYNC BOOK] Downloading chapter ${chapter}/${totalChapters} for book ${bookId}...`);
        await syncChapter(bookId, chapter);
        results.push(true);
        
        // Update progress
        setSyncStatus(prev => ({
          ...prev,
          itemsSynced: results.length,
        }));
        
        console.log(`[SYNC BOOK] ✓ Chapter ${chapter}/${totalChapters} downloaded and saved to IndexedDB`);
      } catch (error) {
        console.error(`[SYNC BOOK] ✗ Failed to download chapter ${chapter}/${totalChapters}:`, error);
        results.push(false);
      }
    }

    const successCount = results.filter(r => r).length;
    console.log(`[SYNC BOOK] Book ${bookId} download complete: ${successCount}/${totalChapters} chapters successful`);
    
    // Verify persistence to IndexedDB
    try {
      const { getByIndex } = await import('@/app/utils/offlineStorage');
      const sampleVerses = await getByIndex('verses', 'book_chapter', [bookId, 1]);
      console.log(`[SYNC BOOK] ✓ Persistence verified - ${sampleVerses.length} verses found in IndexedDB for book ${bookId} chapter 1`);
    } catch (error) {
      console.error(`[SYNC BOOK] ✗ Failed to verify persistence for book ${bookId}:`, error);
    }

    return successCount;
  }, [syncChapter]);

  // Sync specific content
  const syncSpecificContent = useCallback(async (
    type: 'book' | 'chapter' | 'devotionals' | 'votd',
    params?: { bookId?: number; bookNumber?: number; chapter?: number; totalChapters?: number }
  ) => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      let result = false;

      switch (type) {
        case 'book':
          // Use bookId if provided, otherwise fall back to bookNumber for backward compatibility
          const bookIdToUse = params?.bookId || params?.bookNumber;
          if (bookIdToUse && params?.totalChapters) {
            await syncBook(bookIdToUse, params.totalChapters);
            result = true;
          }
          break;
        case 'chapter':
          const chapterBookId = params?.bookId || params?.bookNumber;
          if (chapterBookId && params?.chapter) {
            await syncChapter(chapterBookId, params.chapter);
            result = true;
          }
          break;
        case 'devotionals':
          await syncDevotionals();
          result = true;
          break;
        case 'votd':
          await syncVerseOfTheDay();
          result = true;
          break;
      }

      const now = new Date();
      localStorage.setItem('lastSyncTime', now.toISOString());
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: now,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [syncBook, syncChapter, syncDevotionals, syncVerseOfTheDay]);

  // Check for content updates
  const checkForUpdates = useCallback(async (): Promise<ContentUpdate[]> => {
    try {
      const response = await fetch('/api/offline-sync');
      if (!response.ok) throw new Error('Failed to fetch content versions');
      
      const data = await response.json();
      const { versions } = data || {};
      
      // Safety check for versions
      if (!versions || typeof versions !== 'object') {
        console.warn('No versions received from API');
        return [];
      }

      // Get local versions from localStorage
      const localVersions = JSON.parse(localStorage.getItem('contentVersions') || '{}');
      
      // Compare versions and build update list
      const updates: ContentUpdate[] = [];
      
      const categoryMap: Record<string, string> = {
        bibleBooks: 'Bible Books',
        bibleVerses: 'Bible Verses',
        commentaries: 'Commentaries',
        prayers: 'Prayer Passages',
        introductions: 'Introductions',
        theological: 'Theological Insights',
        historical: 'Historical Context',
        devotionals: 'Devotionals',
        qa: 'Q&A',
        verseOfTheDay: 'Verse of the Day',
      };

      Object.entries(versions).forEach(([key, value]: [string, any]) => {
        // Safety checks for version data
        if (!value || typeof value !== 'object') return;
        
        const localVersion = localVersions[key];
        const hasUpdate = !localVersion || (value.version && new Date(value.version) > new Date(localVersion));
        
        updates.push({
          category: categoryMap[key] || key,
          label: value.label || key,
          hasUpdate,
          localVersion,
          serverVersion: value.version || new Date().toISOString(),
          count: value.count || 0,
        });
      });
      
      return updates;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return [];
    }
  }, []);

  // Selective sync - sync only selected categories
  const syncSelectedCategories = useCallback(async (
    selectedCategories: string[],
    serverVersions: Record<string, ContentVersion>,
    onProgress?: (progress: number) => void
  ) => {
    setSyncStatus({
      isSyncing: true,
      lastSyncTime: null,
      itemsSynced: 0,
      totalItems: 0,
      error: null,
      currentCategory: '',
      categoryProgress: {},
    });

    try {
      const totalCategories = selectedCategories.length;
      let completedCategories = 0;

      // Initialize category progress
      const initialProgress: Record<string, any> = {};
      selectedCategories.forEach(cat => {
        initialProgress[cat] = { completed: 0, total: 0, status: 'pending' };
      });

      setSyncStatus(prev => ({
        ...prev,
        categoryProgress: initialProgress,
      }));

      // Get server version info for updating local versions
      const versionResponse = await fetch('/api/offline-sync');
      if (!versionResponse.ok) {
        throw new Error('Failed to fetch server versions');
      }
      const responseData = await versionResponse.json();
      const versions = responseData?.versions || {};

      // Sync selected categories sequentially
      let books: any[] = [];
      
      for (const category of selectedCategories) {
        const progressStart = (completedCategories / totalCategories) * 100;
        const progressEnd = ((completedCategories + 1) / totalCategories) * 100;

        // Get books if needed (for Bible-related categories)
        if (category.includes('Bible') || category.includes('Commentaries') || 
            category.includes('Prayer') || category.includes('Introductions')) {
          if (books.length === 0) {
            const booksResponse = await fetch('/api/bible-books');
            books = await booksResponse.json();
          }
        }

        switch (category) {
          case 'Bible Books':
            await syncBibleBooks();
            if (versions?.bibleBooks?.version) {
              saveContentVersion(category, versions.bibleBooks.version);
            }
            break;
          case 'Bible Verses':
            await syncBibleVerses(books);
            if (versions?.bibleVerses?.version) {
              saveContentVersion(category, versions.bibleVerses.version);
            }
            break;
          case 'Commentaries':
            await syncCommentaries(books);
            if (versions?.commentaries?.version) {
              saveContentVersion(category, versions.commentaries.version);
            }
            break;
          case 'Prayer Passages':
            await syncPrayers(books);
            if (versions?.prayers?.version) {
              saveContentVersion(category, versions.prayers.version);
            }
            break;
          case 'Introductions':
            await syncIntroductions(books);
            if (versions?.introductions?.version) {
              saveContentVersion(category, versions.introductions.version);
            }
            break;
          case 'Theological Insights':
            await syncTheologicalInsights(books);
            if (versions?.theological?.version) {
              saveContentVersion(category, versions.theological.version);
            }
            break;
          case 'Historical Context':
            await syncHistoricalContext(books);
            if (versions?.historical?.version) {
              saveContentVersion(category, versions.historical.version);
            }
            break;
          case 'Devotionals':
            await syncDevotionals();
            if (versions?.devotionals?.version) {
              saveContentVersion(category, versions.devotionals.version);
            }
            break;
          case 'Q&A':
            await syncQA();
            if (versions?.qa?.version) {
              saveContentVersion(category, versions.qa.version);
            }
            break;
          case 'Verse of the Day':
            await syncVerseOfTheDay();
            if (versions?.verseOfTheDay?.version) {
              saveContentVersion(category, versions.verseOfTheDay.version);
            }
            break;
        }

        completedCategories++;
        onProgress?.(progressEnd);
      }

      // Complete
      const now = new Date();
      localStorage.setItem('lastSyncTime', now.toISOString());
      localStorage.removeItem('downloadProgress');
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: now,
        error: null,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [
    syncBibleBooks,
    syncBibleVerses,
    syncCommentaries,
    syncPrayers,
    syncIntroductions,
    syncTheologicalInsights,
    syncHistoricalContext,
    syncDevotionals,
    syncQA,
    syncVerseOfTheDay,
    saveContentVersion,
  ]);

  return {
    syncStatus,
    syncAll,
    syncSpecificContent,
    syncBibleBooks,
    syncBook,
    syncChapter,
    syncDevotionals,
    syncVerseOfTheDay,
    checkForUpdates,
    syncSelectedCategories,
  };
}
