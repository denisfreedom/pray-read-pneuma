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
} from '@/app/utils/offlineStorage';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  itemsSynced: number;
  totalItems: number;
  error: string | null;
}

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    itemsSynced: 0,
    totalItems: 0,
    error: null,
  });

  // Load last sync time from localStorage
  useEffect(() => {
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date(lastSync),
      }));
    }
  }, []);

  // Sync all Bible books
  const syncBibleBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/bible-books');
      if (!response.ok) throw new Error('Failed to fetch books');
      
      const books = await response.json();
      await saveBooks(books);
      
      return books.length;
    } catch (error) {
      console.error('Error syncing books:', error);
      throw error;
    }
  }, []);

  // Sync a specific chapter
  const syncChapter = useCallback(async (bookId: number, chapter: number) => {
    try {
      // Fetch verses
      const versesResponse = await fetch(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}`);
      if (versesResponse.ok) {
        const verses = await versesResponse.json();
        await saveChapterVerses(bookId, chapter, verses);
      }

      // Fetch chapter content (commentary, prayers, etc.)
      const contentResponse = await fetch(`/api/bible-content?bookId=${bookId}&chapter=${chapter}`);
      if (contentResponse.ok) {
        const content = await contentResponse.json();
        await saveChapterContent(bookId, chapter, content);
      }

      return true;
    } catch (error) {
      console.error(`Error syncing chapter ${bookId}:${chapter}:`, error);
      throw error;
    }
  }, []);

  // Sync a full book (all chapters)
  const syncBook = useCallback(async (bookId: number, totalChapters: number) => {
    const results = [];
    
    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      try {
        await syncChapter(bookId, chapter);
        results.push(true);
        
        // Update progress
        setSyncStatus(prev => ({
          ...prev,
          itemsSynced: results.length,
        }));
      } catch (error) {
        results.push(false);
      }
    }

    return results.filter(r => r).length;
  }, [syncChapter]);

  // Sync devotionals
  const syncDevotionals = useCallback(async () => {
    try {
      const response = await fetch('/api/devotional-plans');
      if (!response.ok) throw new Error('Failed to fetch devotionals');
      
      const devotionals = await response.json();
      
      for (const devotional of devotionals) {
        await saveDevotional(devotional);
      }
      
      return devotionals.length;
    } catch (error) {
      console.error('Error syncing devotionals:', error);
      throw error;
    }
  }, []);

  // Sync verse of the day
  const syncVerseOfTheDay = useCallback(async () => {
    try {
      const response = await fetch('/api/verse-of-the-day');
      if (!response.ok) throw new Error('Failed to fetch verse of the day');
      
      const verse = await response.json();
      const today = new Date().toISOString().split('T')[0];
      await saveVerseOfTheDay(today, verse);
      
      return true;
    } catch (error) {
      console.error('Error syncing verse of the day:', error);
      throw error;
    }
  }, []);

  // Full sync - sync everything
  const syncAll = useCallback(async (onProgress?: (progress: number) => void) => {
    setSyncStatus({
      isSyncing: true,
      lastSyncTime: null,
      itemsSynced: 0,
      totalItems: 0,
      error: null,
    });

    try {
      // Step 1: Sync books (metadata)
      const bookCount = await syncBibleBooks();
      onProgress?.(10);

      // Step 2: Get books to determine total chapters
      const books = await getBooks();
      const totalChapters = books.reduce((sum, book) => sum + (book.total_chapters || 0), 0);
      
      setSyncStatus(prev => ({
        ...prev,
        totalItems: totalChapters + bookCount + 10, // +10 for devotionals/misc
      }));

      // Step 3: Sync all chapters for all books
      let syncedChapters = 0;
      for (const book of books) {
        if (book.total_chapters) {
          const synced = await syncBook(book.id, book.total_chapters);
          syncedChapters += synced;
          
          const progress = 10 + (syncedChapters / totalChapters) * 70;
          onProgress?.(Math.min(progress, 80));
        }
      }

      // Step 4: Sync devotionals
      await syncDevotionals();
      onProgress?.(90);

      // Step 5: Sync verse of the day
      await syncVerseOfTheDay();
      onProgress?.(95);

      // Complete
      const now = new Date();
      localStorage.setItem('lastSyncTime', now.toISOString());
      
      setSyncStatus({
        isSyncing: false,
        lastSyncTime: now,
        itemsSynced: syncedChapters + bookCount,
        totalItems: totalChapters + bookCount,
        error: null,
      });

      onProgress?.(100);
      
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
  }, [syncBibleBooks, syncBook, syncDevotionals, syncVerseOfTheDay]);

  // Sync specific content
  const syncSpecificContent = useCallback(async (
    type: 'book' | 'chapter' | 'devotionals' | 'votd',
    params?: { bookId?: number; chapter?: number; totalChapters?: number }
  ) => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      let result = false;

      switch (type) {
        case 'book':
          if (params?.bookId && params?.totalChapters) {
            await syncBook(params.bookId, params.totalChapters);
            result = true;
          }
          break;
        case 'chapter':
          if (params?.bookId && params?.chapter) {
            await syncChapter(params.bookId, params.chapter);
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

  return {
    syncStatus,
    syncAll,
    syncSpecificContent,
    syncBibleBooks,
    syncBook,
    syncChapter,
    syncDevotionals,
    syncVerseOfTheDay,
  };
}
