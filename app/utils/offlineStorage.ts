// Offline Storage Utility for Bible Content
// Uses IndexedDB for large Bible content storage

const DB_NAME = 'PrayReadBibleDB';
const DB_VERSION = 4;

// Store names
const STORES = {
  VERSES: 'verses',
  CHAPTERS: 'chapters',
  BOOKS: 'books',
  COMMENTARIES: 'commentaries',
  PRAYERS: 'prayers',
  DEVOTIONALS: 'devotionals',
  THEOLOGICAL_INSIGHTS: 'theological_insights',
  HISTORICAL_CONTEXT: 'historical_context',
  VERSE_OF_THE_DAY: 'verse_of_the_day',
  QA: 'qa',
};

// Initialize IndexedDB
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available (server-side)'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      // Create or upgrade verses store
      let versesStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.VERSES)) {
        versesStore = db.createObjectStore(STORES.VERSES, { keyPath: 'id', autoIncrement: true });
      } else {
        versesStore = transaction!.objectStore(STORES.VERSES);
        // Delete old indexes if they exist
        if (versesStore.indexNames.contains('book_chapter_verse')) {
          versesStore.deleteIndex('book_chapter_verse');
        }
        if (versesStore.indexNames.contains('book_chapter')) {
          versesStore.deleteIndex('book_chapter');
        }
      }
      // Create new indexes with correct column names
      versesStore.createIndex('book_chapter_verse', ['book_id', 'chapter', 'verse'], { unique: false });
      versesStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: false });

      if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
        const chaptersStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'id' });
        chaptersStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.BOOKS)) {
        db.createObjectStore(STORES.BOOKS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.COMMENTARIES)) {
        const commentariesStore = db.createObjectStore(STORES.COMMENTARIES, { keyPath: 'id', autoIncrement: true });
        commentariesStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: false });
      }

      let prayersStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.PRAYERS)) {
        prayersStore = db.createObjectStore(STORES.PRAYERS, { keyPath: 'id', autoIncrement: true });
        prayersStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: false });
        prayersStore.createIndex('book_chapter_verse', ['book_id', 'chapter', 'verse_number'], { unique: false });
      } else {
        prayersStore = transaction!.objectStore(STORES.PRAYERS);
        // Add the verse-specific index if it doesn't exist (for DB version upgrade)
        if (!prayersStore.indexNames.contains('book_chapter_verse')) {
          prayersStore.createIndex('book_chapter_verse', ['book_id', 'chapter', 'verse_number'], { unique: false });
        }
      }

      if (!db.objectStoreNames.contains(STORES.DEVOTIONALS)) {
        db.createObjectStore(STORES.DEVOTIONALS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.THEOLOGICAL_INSIGHTS)) {
        const insightsStore = db.createObjectStore(STORES.THEOLOGICAL_INSIGHTS, { keyPath: 'id', autoIncrement: true });
        insightsStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.HISTORICAL_CONTEXT)) {
        const historicalStore = db.createObjectStore(STORES.HISTORICAL_CONTEXT, { keyPath: 'id', autoIncrement: true });
        historicalStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.VERSE_OF_THE_DAY)) {
        const votdStore = db.createObjectStore(STORES.VERSE_OF_THE_DAY, { keyPath: 'date' });
      }

      if (!db.objectStoreNames.contains(STORES.QA)) {
        db.createObjectStore(STORES.QA, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Generic save function
export async function saveToStore<T>(storeName: string, data: T): Promise<void> {
  console.log(`[INDEXEDDB] Writing single item to store "${storeName}"...`);
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => {
      console.log(`[INDEXEDDB] ✓ Successfully wrote item to IndexedDB store "${storeName}" (persisted to device storage)`);
      resolve();
    };
    request.onerror = () => {
      console.error(`[INDEXEDDB] ✗ Error writing to store "${storeName}":`, request.error);
      reject(request.error);
    };
  });
}

// Generic bulk save function
export async function saveBulkToStore<T>(storeName: string, dataArray: T[]): Promise<void> {
  console.log(`[INDEXEDDB] Writing ${dataArray.length} items to store "${storeName}"...`);
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    let completed = 0;
    let hasError = false;

    dataArray.forEach((data) => {
      const request = store.put(data);
      request.onsuccess = () => {
        completed++;
        if (completed === dataArray.length && !hasError) {
          console.log(`[INDEXEDDB] ✓ Successfully wrote all ${dataArray.length} items to IndexedDB store "${storeName}" (persisted to device storage)`);
          resolve();
        }
      };
      request.onerror = () => {
        hasError = true;
        console.error(`[INDEXEDDB] ✗ Error writing to store "${storeName}":`, request.error);
        reject(request.error);
      };
    });

    if (dataArray.length === 0) {
      console.log(`[INDEXEDDB] No items to write to store "${storeName}"`);
      resolve();
    }
  });
}

// Generic get function
export async function getFromStore<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Get all from store
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Get by index
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  key: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(key);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Delete from store
export async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear entire store
export async function clearStore(storeName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Bible-specific helper functions
// Note: All functions below save BOTH English and Luganda content from the API

export async function saveChapterVerses(bookId: number, chapter: number, verses: any[]): Promise<void> {
  console.log(`[STORAGE] Saving ${verses.length} verses (English & Luganda) for book ${bookId} chapter ${chapter} to IndexedDB`);
  try {
    await saveBulkToStore(STORES.VERSES, verses);
    console.log(`[STORAGE] ✓ Successfully saved ${verses.length} verses to IndexedDB for book ${bookId} chapter ${chapter}`);
    
    // Verify the write operation by reading back from IndexedDB
    const savedVerses = await getByIndex(STORES.VERSES, 'book_chapter', [bookId, chapter]);
    console.log(`[STORAGE] ✓ Verification: ${savedVerses.length} verses confirmed in IndexedDB (persisted to device storage)`);
    
    if (savedVerses.length !== verses.length) {
      console.warn(`[STORAGE] ⚠ Warning: Saved ${verses.length} verses but only ${savedVerses.length} were verified in IndexedDB for book ${bookId} chapter ${chapter}`);
    }
  } catch (error) {
    console.error(`[STORAGE ERROR] ✗ Failed to save verses for book ${bookId} chapter ${chapter}:`, error);
    throw error;
  }
}

export async function getChapterVerses(bookId: number, chapter: number): Promise<any[]> {
  return getByIndex(STORES.VERSES, 'book_chapter', [bookId, chapter]);
}

export async function saveChapterContent(bookId: number, chapter: number, content: any): Promise<void> {
  const chapterData = {
    id: `${bookId}-${chapter}`,
    book_id: bookId,
    chapter,
    ...content,
    cached_at: new Date().toISOString(),
  };
  return saveToStore(STORES.CHAPTERS, chapterData);
}

export async function getChapterContent(bookId: number, chapter: number): Promise<any | null> {
  return getFromStore(STORES.CHAPTERS, `${bookId}-${chapter}`);
}

export async function saveBooks(books: any[]): Promise<void> {
  return saveBulkToStore(STORES.BOOKS, books);
}

export async function getBooks(): Promise<any[]> {
  return getAllFromStore(STORES.BOOKS);
}

export async function saveCommentary(bookId: number, chapter: number, commentary: any): Promise<void> {
  // Saves commentary with both English and Luganda content
  const commentaryData = {
    book_id: bookId,
    chapter,
    ...commentary,
    cached_at: new Date().toISOString(),
  };
  return saveToStore(STORES.COMMENTARIES, commentaryData);
}

export async function getCommentary(bookId: number, chapter: number): Promise<any[]> {
  return getByIndex(STORES.COMMENTARIES, 'book_chapter', [bookId, chapter]);
}

export async function savePrayer(bookId: number, chapter: number, prayer: any): Promise<void> {
  // Saves prayer with both English and Luganda content
  const prayerData = {
    book_id: bookId,
    chapter,
    ...prayer,
    cached_at: new Date().toISOString(),
  };
  return saveToStore(STORES.PRAYERS, prayerData);
}

export async function getPrayer(bookId: number, chapter: number): Promise<any[]> {
  return getByIndex(STORES.PRAYERS, 'book_chapter', [bookId, chapter]);
}

export async function saveVersePrayer(bookId: number, chapter: number, verseNumber: number, prayer: any): Promise<void> {
  // Saves verse prayer with both English and Luganda content
  const prayerData = {
    book_id: bookId,
    chapter,
    verse_number: verseNumber,
    ...prayer,
    cached_at: new Date().toISOString(),
  };
  return saveToStore(STORES.PRAYERS, prayerData);
}

export async function getVersePrayers(bookId: number, chapter: number): Promise<any[]> {
  return getByIndex(STORES.PRAYERS, 'book_chapter', [bookId, chapter]);
}

export async function saveVerseOfTheDay(date: string, verse: any): Promise<void> {
  const votdData = {
    date,
    ...verse,
    cached_at: new Date().toISOString(),
  };
  return saveToStore(STORES.VERSE_OF_THE_DAY, votdData);
}

export async function getVerseOfTheDay(date: string): Promise<any | null> {
  return getFromStore(STORES.VERSE_OF_THE_DAY, date);
}

export async function saveDevotional(devotional: any): Promise<void> {
  return saveToStore(STORES.DEVOTIONALS, devotional);
}

export async function getDevotional(id: number): Promise<any | null> {
  return getFromStore(STORES.DEVOTIONALS, id);
}

export async function getAllDevotionals(): Promise<any[]> {
  return getAllFromStore(STORES.DEVOTIONALS);
}

// Check if offline
export function isOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return !navigator.onLine;
}

// Get storage usage
export async function getStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return null;
  }
  
  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return null;
  }
}
