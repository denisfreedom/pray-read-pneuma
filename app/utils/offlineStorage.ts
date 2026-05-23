// Offline Storage Utility for Bible Content
// Uses IndexedDB for large Bible content storage

const DB_NAME = 'PrayReadBibleDB';
const DB_VERSION = 1;

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

      // Create object stores
      if (!db.objectStoreNames.contains(STORES.VERSES)) {
        const versesStore = db.createObjectStore(STORES.VERSES, { keyPath: 'id', autoIncrement: true });
        versesStore.createIndex('book_chapter_verse', ['book_number', 'chapter', 'verse_number'], { unique: false });
        versesStore.createIndex('book_chapter', ['book_number', 'chapter'], { unique: false });
      }

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

      if (!db.objectStoreNames.contains(STORES.PRAYERS)) {
        const prayersStore = db.createObjectStore(STORES.PRAYERS, { keyPath: 'id', autoIncrement: true });
        prayersStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: false });
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
    };
  });
}

// Generic save function
export async function saveToStore<T>(storeName: string, data: T): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Generic bulk save function
export async function saveBulkToStore<T>(storeName: string, dataArray: T[]): Promise<void> {
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
          resolve();
        }
      };
      request.onerror = () => {
        hasError = true;
        reject(request.error);
      };
    });

    if (dataArray.length === 0) {
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

export async function saveChapterVerses(bookNumber: number, chapter: number, verses: any[]): Promise<void> {
  return saveBulkToStore(STORES.VERSES, verses);
}

export async function getChapterVerses(bookNumber: number, chapter: number): Promise<any[]> {
  return getByIndex(STORES.VERSES, 'book_chapter', [bookNumber, chapter]);
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
