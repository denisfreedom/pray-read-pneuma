'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveChapterVerses,
  saveChapterContent,
  saveBooks,
  saveDevotional,
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
const CHUNK_SIZE = 10;
const RETRY_DELAY = 2000;
// FIX: throttle progress writes — 1,189 chapters used to mean 1,189
// setState + localStorage writes. Now at most 1 per 500ms per category.
const PROGRESS_THROTTLE_MS = 500;

type CategoryStatus = 'pending' | 'syncing' | 'completed' | 'error';
type ProgressMap = SyncStatus['categoryProgress'];

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

  // FIX: guards — one sync at a time, cancellable, no setState after unmount.
  const syncInProgress = useRef(false);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);
  const progressRef = useRef<ProgressMap>({});
  const lastProgressWrite = useRef<Record<string, number>>({});

  useEffect(() => {
    mounted.current = true;
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      const d = new Date(lastSync);
      if (!isNaN(d.getTime())) {
        setSyncStatus((prev) => ({ ...prev, lastSyncTime: d }));
      }
    }
    return () => {
      mounted.current = false;
      cancelled.current = true;
      abortController.current?.abort();
    };
  }, []);

  const safeSetStatus = useCallback((updater: (prev: SyncStatus) => SyncStatus) => {
    if (mounted.current) setSyncStatus(updater);
  }, []);

  // FIX: cancel a running sync — stops network + loops, clears the spinner.
  const cancelSync = useCallback(() => {
    cancelled.current = true;
    abortController.current?.abort();
    syncInProgress.current = false;
    safeSetStatus((prev) => ({ ...prev, isSyncing: false, error: 'Sync cancelled' }));
  }, [safeSetStatus]);

  const saveProgress = useCallback((progress: ProgressMap) => {
    try {
      localStorage.setItem('downloadProgress', JSON.stringify(progress));
    } catch {
      // Storage full / private mode — progress just won't resume. Don't crash sync.
    }
  }, []);

  // FIX: pure updater — no side effects inside setState. Progress is read
  // from a ref, merged, saved, then state is set from the same object.
  const updateCategoryProgress = useCallback((
    category: string,
    update: Partial<{ completed: number; total: number; status: CategoryStatus }>,
    force = false,
  ) => {
    const prev = progressRef.current[category] ?? { completed: 0, total: 0, status: 'pending' as CategoryStatus };
    const next = { ...prev, ...update };
    // Skip no-op writes; throttle count-only writes; always flush status changes.
    const statusChanged = update.status !== undefined && update.status !== prev.status;
    const now = Date.now();
    const lastWrite = lastProgressWrite.current[category] ?? 0;
    if (!force && !statusChanged && now - lastWrite < PROGRESS_THROTTLE_MS) {
      progressRef.current = { ...progressRef.current, [category]: next };
      return;
    }
    lastProgressWrite.current[category] = now;
    progressRef.current = { ...progressRef.current, [category]: next };
    saveProgress(progressRef.current);
    safeSetStatus((prevState) => ({
      ...prevState,
      categoryProgress: progressRef.current,
      currentCategory: category,
    }));
  }, [saveProgress, safeSetStatus]);

  const setCategoryError = useCallback((category: string) => {
    updateCategoryProgress(category, { status: 'error' }, true);
  }, [updateCategoryProgress]);

  // FIX: don't retry 404s forever — a missing endpoint will never succeed.
  const retryFetch = useCallback(async <T,>(
    fetchFn: () => Promise<T>,
    retries = MAX_RETRIES,
    delay = RETRY_DELAY,
  ): Promise<T> => {
    try {
      return await fetchFn();
    } catch (error: any) {
      if (error?.status === 404 || cancelled.current) throw error;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (cancelled.current) throw error;
        return retryFetch(fetchFn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  }, []);

  const fetchJson = useCallback(async (url: string) => {
    if (!abortController.current || abortController.current.signal.aborted) {
      abortController.current = new AbortController();
    }
    const response = await fetch(url, { signal: abortController.current.signal });
    if (!response.ok) {
      const err: any = new Error(`Request failed (${response.status}) for ${url}`);
      err.status = response.status;
      throw err;
    }
    return response.json();
  }, []);

  // Shared per-chapter loop used by verses / commentaries / prayers / intros.
  // FIX: failures are tracked separately and NEVER counted as completed.
  const syncChapters = useCallback(async (
    category: string,
    books: any[],
    fetchAndSave: (bookId: number, chapter: number) => Promise<void>,
  ): Promise<{ succeeded: number; failed: number }> => {
    const totalChapters = books.reduce((sum, book) => sum + (book.total_chapters || 0), 0);
    updateCategoryProgress(category, { completed: 0, total: totalChapters, status: 'syncing' }, true);
    let succeeded = 0;
    let failed = 0;

    for (const book of books) {
      if (cancelled.current) break;
      if (!book.total_chapters) continue;
      for (let chunkStart = 1; chunkStart <= book.total_chapters; chunkStart += CHUNK_SIZE) {
        if (cancelled.current) break;
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, book.total_chapters);
        await Promise.all(
          Array.from({ length: chunkEnd - chunkStart + 1 }, (_, i) => chunkStart + i).map(async (chapter) => {
            try {
              await retryFetch(() => fetchAndSave(book.id, chapter));
              succeeded++;
            } catch (error) {
              if (cancelled.current) return;
              failed++;
              console.error(`Failed to sync ${category} ${book.id}:${chapter}`, error);
            } finally {
              updateCategoryProgress(category, { completed: succeeded + failed, total: totalChapters });
            }
          }),
        );
      }
    }
    updateCategoryProgress(
      category,
      { completed: succeeded + failed, total: totalChapters, status: failed > 0 && succeeded === 0 ? 'error' : 'completed' },
      true,
    );
    return { succeeded, failed };
  }, [retryFetch, updateCategoryProgress]);

  const syncBibleBooks = useCallback(async () => {
    const category = 'Bible Books';
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' }, true);
    try {
      const books = await retryFetch(() => fetchJson('/api/bible-books'));
      await saveBooks(books);
      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' }, true);
      return books;
    } catch (error) {
      setCategoryError(category);
      console.error('Error syncing books:', error);
      throw error;
    }
  }, [retryFetch, fetchJson, updateCategoryProgress, setCategoryError]);

  const syncBibleVerses = useCallback(async (books: any[]) => {
    const { succeeded } = await syncChapters('Bible Verses', books, async (bookId, chapter) => {
      const data = await fetchJson(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}`);
      await saveChapterVerses(bookId, chapter, data.verses || []);
    });
    return succeeded;
  }, [syncChapters, fetchJson]);

  const syncCommentaries = useCallback(async (books: any[]) => {
    const { succeeded } = await syncChapters('Commentaries', books, async (bookId, chapter) => {
      const data = await fetchJson(`/api/commentaries?bookId=${bookId}&chapter=${chapter}`);
      if (data && Object.keys(data).length > 0) {
        await saveToStore('commentaries', { id: `${bookId}-${chapter}`, book_id: bookId, chapter, ...data, cached_at: new Date().toISOString() });
      }
    });
    return succeeded;
  }, [syncChapters, fetchJson]);

  const syncPrayers = useCallback(async (books: any[]) => {
    const { succeeded } = await syncChapters('Prayer Passages', books, async (bookId, chapter) => {
      const data = await fetchJson(`/api/chapter-prayers?bookId=${bookId}&chapter=${chapter}`);
      if (data && Object.keys(data).length > 0) {
        await saveToStore('prayers', { id: `${bookId}-${chapter}`, book_id: bookId, chapter, ...data, cached_at: new Date().toISOString() });
      }
    });
    return succeeded;
  }, [syncChapters, fetchJson]);

  const syncIntroductions = useCallback(async (books: any[]) => {
    const { succeeded } = await syncChapters('Introductions', books, async (bookId, chapter) => {
      const data = await fetchJson(`/api/chapter-introductions?bookId=${bookId}&chapter=${chapter}`);
      if (data && Object.keys(data).length > 0) {
        await saveChapterContent(bookId, chapter, data);
      }
    });
    return succeeded;
  }, [syncChapters, fetchJson]);

  const syncSingleList = useCallback(async (
    category: string,
    url: string,
    store: string,
  ): Promise<number> => {
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' }, true);
    try {
      const data = await retryFetch(() => fetchJson(url));
      if (Array.isArray(data)) await saveBulkToStore(store, data);
      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' }, true);
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      setCategoryError(category);
      console.error(`Error syncing ${category}:`, error);
      return 0;
    }
  }, [retryFetch, fetchJson, updateCategoryProgress, setCategoryError]);

  const syncTheologicalInsights = useCallback(async () =>
    syncSingleList('Theological Insights', '/api/all-theological-insights', 'theological_insights'),
  [syncSingleList]);

  const syncHistoricalContext = useCallback(async () =>
    syncSingleList('Historical Context', '/api/all-historical-context', 'historical_context'),
  [syncSingleList]);

  const syncDevotionals = useCallback(async () => {
    const category = 'Devotionals';
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' }, true);
    try {
      const devotionals = await retryFetch(() => fetchJson('/api/devotional-plans'));
      const list = Array.isArray(devotionals) ? devotionals : devotionals?.plans ?? [];
      for (const devotional of list) {
        if (cancelled.current) break;
        await saveDevotional(devotional);
      }
      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' }, true);
      return list.length;
    } catch (error) {
      setCategoryError(category);
      console.error('Error syncing devotionals:', error);
      return 0;
    }
  }, [retryFetch, fetchJson, updateCategoryProgress, setCategoryError]);

  const syncQA = useCallback(async () =>
    syncSingleList('Q&A', '/api/bible-qa', 'qa'),
  [syncSingleList]);

  const syncVerseOfTheDay = useCallback(async () => {
    const category = 'Verse of the Day';
    updateCategoryProgress(category, { completed: 0, total: 1, status: 'syncing' }, true);
    try {
      const verse = await retryFetch(() => fetchJson('/api/verse-of-the-day'));
      const today = new Date().toISOString().split('T')[0];
      await saveVerseOfTheDay(today, verse);
      updateCategoryProgress(category, { completed: 1, total: 1, status: 'completed' }, true);
      return true;
    } catch (error) {
      setCategoryError(category);
      console.error('Error syncing verse of the day:', error);
      return false;
    }
  }, [retryFetch, fetchJson, updateCategoryProgress, setCategoryError]);

  const saveContentVersion = useCallback((category: string, version: string) => {
    let localVersions: Record<string, string> = {};
    try {
      localVersions = JSON.parse(localStorage.getItem('contentVersions') || '{}');
    } catch {
      localVersions = {};
    }
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
      try {
        localStorage.setItem('contentVersions', JSON.stringify(localVersions));
      } catch { /* ignore */ }
    }
  }, []);

  // Runs one category, records its failure, but lets the rest continue.
  const runCategory = useCallback(async (
    category: string,
    fn: () => Promise<unknown>,
    versions: any,
    versionKey: string,
    onProgress?: (progress: number) => void,
    progressValue?: number,
  ): Promise<string | null> => {
    try {
      await fn();
      if (versions?.[versionKey]?.version) saveContentVersion(category, versions[versionKey].version);
      if (progressValue !== undefined) onProgress?.(progressValue);
      return null;
    } catch (error) {
      console.error(`Category ${category} failed, continuing with the rest:`, error);
      return category;
    }
  }, [saveContentVersion]);

  const beginSync = useCallback((): boolean => {
    // FIX: refuse a second sync while one is running — no more double downloads.
    if (syncInProgress.current) {
      console.warn('Sync already in progress — ignoring duplicate start.');
      return false;
    }
    syncInProgress.current = true;
    cancelled.current = false;
    abortController.current = new AbortController();
    progressRef.current = {};
    safeSetStatus((prev) => ({
      ...prev,
      isSyncing: true,
      error: null,
      // FIX: keep the previous lastSyncTime — it used to be wiped to null
      // at the start of every sync, so the UI showed "never synced".
      categoryProgress: {},
    }));
    return true;
  }, [safeSetStatus]);

  const finishSync = useCallback((failedCategories: string[]) => {
    syncInProgress.current = false;
    const now = new Date();
    if (failedCategories.length === 0 && !cancelled.current) {
      try {
        localStorage.setItem('lastSyncTime', now.toISOString());
        localStorage.removeItem('downloadProgress');
      } catch { /* ignore */ }
    }
    safeSetStatus((prev) => ({
      ...prev,
      isSyncing: false,
      lastSyncTime: failedCategories.length === 0 && !cancelled.current ? now : prev.lastSyncTime,
      error: cancelled.current
        ? 'Sync cancelled'
        : failedCategories.length > 0
          ? `Some content failed to download: ${failedCategories.join(', ')}. Your other downloads were saved — try again for the rest.`
          : null,
    }));
    return failedCategories.length === 0 && !cancelled.current;
  }, [safeSetStatus]);

  const syncAll = useCallback(async (onProgress?: (progress: number) => void) => {
    if (!beginSync()) return false;
    const failed: string[] = [];
    try {
      const responseData = await fetchJson('/api/offline-sync');
      const versions = responseData?.versions;
      if (!versions || !versions.bibleBooks) {
        throw new Error('Invalid server response: missing version data');
      }

      const categories = [
        'Bible Books', 'Bible Verses', 'Commentaries', 'Prayer Passages',
        'Introductions', 'Theological Insights', 'Historical Context',
        'Devotionals', 'Q&A', 'Verse of the Day',
      ];
      const initialProgress: ProgressMap = {};
      categories.forEach((cat) => {
        initialProgress[cat] = { completed: 0, total: 0, status: 'pending' };
      });
      progressRef.current = initialProgress;
      safeSetStatus((prev) => ({ ...prev, categoryProgress: initialProgress }));

      // Step 1: books first — everything else needs the book list.
      let books: any[] = [];
      try {
        books = await syncBibleBooks();
        if (versions?.bibleBooks?.version) saveContentVersion('Bible Books', versions.bibleBooks.version);
        onProgress?.(5);
      } catch (error) {
        console.error('Bible Books failed — cannot continue without the book list.', error);
        failed.push('Bible Books');
        return finishSync(failed);
      }

      // FIX: each remaining category runs even if a sibling fails.
      const steps: Array<[string, () => Promise<unknown>, string, number]> = [
        ['Bible Verses', () => syncBibleVerses(books), 'bibleVerses', 30],
        ['Commentaries', () => syncCommentaries(books), 'commentaries', 45],
        ['Prayer Passages', () => syncPrayers(books), 'prayers', 60],
        ['Introductions', () => syncIntroductions(books), 'introductions', 70],
        ['Theological Insights', () => syncTheologicalInsights(), 'theological', 78],
        ['Historical Context', () => syncHistoricalContext(), 'historical', 86],
        ['Devotionals', () => syncDevotionals(), 'devotionals', 92],
        ['Q&A', () => syncQA(), 'qa', 96],
        ['Verse of the Day', () => syncVerseOfTheDay(), 'verseOfTheDay', 100],
      ];
      for (const [category, fn, versionKey, pct] of steps) {
        if (cancelled.current) break;
        const failedCategory = await runCategory(category, fn, versions, versionKey, onProgress, pct);
        if (failedCategory) failed.push(failedCategory);
      }

      return finishSync(failed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      syncInProgress.current = false;
      safeSetStatus((prev) => ({ ...prev, isSyncing: false, error: errorMessage }));
      throw error;
    }
  }, [
    beginSync, finishSync, fetchJson, syncBibleBooks, syncBibleVerses,
    syncCommentaries, syncPrayers, syncIntroductions, syncTheologicalInsights,
    syncHistoricalContext, syncDevotionals, syncQA, syncVerseOfTheDay,
    saveContentVersion, runCategory, safeSetStatus,
  ]);

  // FIX: bookId everywhere — the old code mixed up the database id with
  // the book number (Genesis = id 1 AND number 1, but that coincidence
  // breaks for every other book). Callers must pass the book's id.
  const syncChapter = useCallback(async (bookId: number, chapter: number) => {
    const versesData = await retryFetch(() => fetchJson(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}`));
    await saveChapterVerses(bookId, chapter, versesData.verses || []);
    const content = await retryFetch(() => fetchJson(`/api/bible-content?bookId=${bookId}&chapter=${chapter}`))
      .catch(() => null); // Chapter content is optional — verses alone still count.
    if (content) await saveChapterContent(bookId, chapter, content);
    return true;
  }, [retryFetch, fetchJson]);

  const syncBook = useCallback(async (bookId: number, totalChapters: number) => {
    let successCount = 0;
    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      if (cancelled.current) break;
      try {
        await syncChapter(bookId, chapter);
        successCount++;
        safeSetStatus((prev) => ({ ...prev, itemsSynced: successCount, totalItems: totalChapters }));
      } catch (error) {
        console.error(`Failed to download book ${bookId} chapter ${chapter}:`, error);
      }
    }
    return successCount;
  }, [syncChapter, safeSetStatus]);

  const syncSpecificContent = useCallback(async (
    type: 'book' | 'chapter' | 'devotionals' | 'votd',
    params?: { bookId?: number; chapter?: number; totalChapters?: number },
  ) => {
    if (!beginSync()) return false;
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
      return finishSync([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      syncInProgress.current = false;
      safeSetStatus((prev) => ({ ...prev, isSyncing: false, error: errorMessage }));
      throw error;
    }
  }, [beginSync, finishSync, syncBook, syncChapter, syncDevotionals, syncVerseOfTheDay, safeSetStatus]);

  const checkForUpdates = useCallback(async (): Promise<ContentUpdate[]> => {
    try {
      const data = await fetchJson('/api/offline-sync');
      const versions = data?.versions;
      if (!versions || typeof versions !== 'object') return [];

      let localVersions: Record<string, string> = {};
      try {
        localVersions = JSON.parse(localStorage.getItem('contentVersions') || '{}');
      } catch {
        localVersions = {};
      }

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

      return Object.entries(versions).flatMap(([key, value]: [string, any]) => {
        if (!value || typeof value !== 'object') return [];
        const localVersion = localVersions[key];
        const serverVersion: string = value.version ?? new Date().toISOString();
        // FIX: compare as strings first — versions are NOT always dates.
        // Fall back to date comparison only when both parse as dates.
        const localDate = new Date(localVersion ?? '');
        const serverDate = new Date(serverVersion);
        const datesComparable = !isNaN(localDate.getTime()) && !isNaN(serverDate.getTime());
        const hasUpdate = !localVersion
          || localVersion !== serverVersion
          || (datesComparable && serverDate > localDate);
        return [{
          category: categoryMap[key] || key,
          label: value.label || key,
          hasUpdate,
          localVersion,
          serverVersion,
          count: value.count || 0,
        }];
      });
    } catch (error) {
      console.error('Error checking for updates:', error);
      return [];
    }
  }, [fetchJson]);

  const syncSelectedCategories = useCallback(async (
    selectedCategories: string[],
    _serverVersions: Record<string, ContentVersion>,
    onProgress?: (progress: number) => void,
  ) => {
    if (!beginSync()) return false;
    const failed: string[] = [];
    try {
      const responseData = await fetchJson('/api/offline-sync');
      const versions = responseData?.versions || {};

      const initialProgress: ProgressMap = {};
      selectedCategories.forEach((cat) => {
        initialProgress[cat] = { completed: 0, total: 0, status: 'pending' };
      });
      progressRef.current = initialProgress;
      safeSetStatus((prev) => ({ ...prev, categoryProgress: initialProgress }));

      const needsBooks = selectedCategories.some((c) =>
        c.includes('Bible') || c.includes('Commentaries') || c.includes('Prayer') || c.includes('Introductions'),
      );
      let books: any[] = [];
      if (needsBooks) {
        books = await syncBibleBooks();
        if (versions?.bibleBooks?.version) saveContentVersion('Bible Books', versions.bibleBooks.version);
      }

      const handlers: Record<string, [() => Promise<unknown>, string]> = {
        'Bible Books': [() => syncBibleBooks(), 'bibleBooks'],
        'Bible Verses': [() => syncBibleVerses(books), 'bibleVerses'],
        'Commentaries': [() => syncCommentaries(books), 'commentaries'],
        'Prayer Passages': [() => syncPrayers(books), 'prayers'],
        'Introductions': [() => syncIntroductions(books), 'introductions'],
        'Theological Insights': [() => syncTheologicalInsights(), 'theological'],
        'Historical Context': [() => syncHistoricalContext(), 'historical'],
        'Devotionals': [() => syncDevotionals(), 'devotionals'],
        'Q&A': [() => syncQA(), 'qa'],
        'Verse of the Day': [() => syncVerseOfTheDay(), 'verseOfTheDay'],
      };

      const total = selectedCategories.length;
      for (let i = 0; i < total; i++) {
        if (cancelled.current) break;
        const category = selectedCategories[i];
        const handler = handlers[category];
        if (!handler) continue;
        const [fn, versionKey] = handler;
        const failedCategory = await runCategory(category, fn, versions, versionKey, onProgress, ((i + 1) / total) * 100);
        if (failedCategory) failed.push(failedCategory);
      }

      return finishSync(failed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      syncInProgress.current = false;
      safeSetStatus((prev) => ({ ...prev, isSyncing: false, error: errorMessage }));
      throw error;
    }
  }, [
    beginSync, finishSync, fetchJson, syncBibleBooks, syncBibleVerses,
    syncCommentaries, syncPrayers, syncIntroductions, syncTheologicalInsights,
    syncHistoricalContext, syncDevotionals, syncQA, syncVerseOfTheDay,
    saveContentVersion, runCategory, safeSetStatus,
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
    // NEW: let the UI offer a Cancel button while a download runs.
    cancelSync,
  };
}
