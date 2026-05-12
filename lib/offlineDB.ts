// IndexedDB utilities for offline Bible content storage

const DB_NAME = 'PrayReadBibleDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  BOOKS: 'books',
  VERSES: 'verses',
  INTRODUCTIONS: 'introductions',
  OUTLINES: 'outlines',
  SYNC_STATUS: 'syncStatus',
};

interface Book {
  id: number;
  name_english: string;
  name_luganda: string;
  abbreviation_english: string;
  abbreviation_luganda: string;
  testament: string;
  chapters: number;
}

interface Verse {
  id: number;
  book_id: number;
  chapter: number;
  verse_number: number;
  en_text: string;
  lu_text: string;
}

interface Introduction {
  id: string; // composite key: type:book:chapter
  type: string;
  book: string;
  chapter?: number;
  english_introduction?: string;
  luganda_introduction?: string;
  english_prayer?: string;
  luganda_prayer?: string;
}

interface Outline {
  id: number;
  book_id: number;
  title: string;
  content: string;
  chapter: number | null;
  order_index: number;
}

interface SyncStatus {
  id: string; // 'lastSync'
  timestamp: number;
  completedBooks: number[];
}

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Books store
      if (!db.objectStoreNames.contains(STORES.BOOKS)) {
        const bookStore = db.createObjectStore(STORES.BOOKS, { keyPath: 'id' });
        bookStore.createIndex('testament', 'testament', { unique: false });
      }

      // Verses store (book_id + chapter composite index)
      if (!db.objectStoreNames.contains(STORES.VERSES)) {
        const verseStore = db.createObjectStore(STORES.VERSES, { keyPath: 'id' });
        verseStore.createIndex('book_chapter', ['book_id', 'chapter'], { unique: false });
        verseStore.createIndex('book_id', 'book_id', { unique: false });
      }

      // Introductions store
      if (!db.objectStoreNames.contains(STORES.INTRODUCTIONS)) {
        db.createObjectStore(STORES.INTRODUCTIONS, { keyPath: 'id' });
      }

      // Outlines store
      if (!db.objectStoreNames.contains(STORES.OUTLINES)) {
        const outlineStore = db.createObjectStore(STORES.OUTLINES, { keyPath: 'id' });
        outlineStore.createIndex('book_id', 'book_id', { unique: false });
      }

      // Sync status store
      if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
        db.createObjectStore(STORES.SYNC_STATUS, { keyPath: 'id' });
      }
    };
  });
}

// ===================== BOOKS =====================

export async function saveBooks(books: Book[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.BOOKS, 'readwrite');
  const store = tx.objectStore(STORES.BOOKS);

  for (const book of books) {
    store.put(book);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getBooks(): Promise<Book[]> {
  const db = await initDB();
  const tx = db.transaction(STORES.BOOKS, 'readonly');
  const store = tx.objectStore(STORES.BOOKS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getBook(bookId: number): Promise<Book | null> {
  const db = await initDB();
  const tx = db.transaction(STORES.BOOKS, 'readonly');
  const store = tx.objectStore(STORES.BOOKS);

  return new Promise((resolve, reject) => {
    const request = store.get(bookId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// ===================== VERSES =====================

export async function saveVerses(verses: Verse[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.VERSES, 'readwrite');
  const store = tx.objectStore(STORES.VERSES);

  for (const verse of verses) {
    store.put(verse);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getVerses(bookId: number, chapter: number): Promise<Verse[]> {
  const db = await initDB();
  const tx = db.transaction(STORES.VERSES, 'readonly');
  const store = tx.objectStore(STORES.VERSES);
  const index = store.index('book_chapter');

  return new Promise((resolve, reject) => {
    const request = index.getAll([bookId, chapter]);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getAllVersesForBook(bookId: number): Promise<Verse[]> {
  const db = await initDB();
  const tx = db.transaction(STORES.VERSES, 'readonly');
  const store = tx.objectStore(STORES.VERSES);
  const index = store.index('book_id');

  return new Promise((resolve, reject) => {
    const request = index.getAll(bookId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// ===================== INTRODUCTIONS =====================

export async function saveIntroduction(intro: Introduction): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.INTRODUCTIONS, 'readwrite');
  const store = tx.objectStore(STORES.INTRODUCTIONS);

  return new Promise((resolve, reject) => {
    const request = store.put(intro);
    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getIntroduction(type: string, book: string, chapter?: number): Promise<Introduction | null> {
  const id = chapter ? `${type}:${book}:${chapter}` : `${type}:${book}`;
  const db = await initDB();
  const tx = db.transaction(STORES.INTRODUCTIONS, 'readonly');
  const store = tx.objectStore(STORES.INTRODUCTIONS);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// ===================== OUTLINES =====================

export async function saveOutlines(outlines: Outline[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.OUTLINES, 'readwrite');
  const store = tx.objectStore(STORES.OUTLINES);

  for (const outline of outlines) {
    store.put(outline);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getOutlines(bookId: number): Promise<Outline[]> {
  const db = await initDB();
  const tx = db.transaction(STORES.OUTLINES, 'readonly');
  const store = tx.objectStore(STORES.OUTLINES);
  const index = store.index('book_id');

  return new Promise((resolve, reject) => {
    const request = index.getAll(bookId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// ===================== SYNC STATUS =====================

export async function getSyncStatus(): Promise<SyncStatus | null> {
  const db = await initDB();
  const tx = db.transaction(STORES.SYNC_STATUS, 'readonly');
  const store = tx.objectStore(STORES.SYNC_STATUS);

  return new Promise((resolve, reject) => {
    const request = store.get('lastSync');
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function updateSyncStatus(status: SyncStatus): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.SYNC_STATUS, 'readwrite');
  const store = tx.objectStore(STORES.SYNC_STATUS);

  return new Promise((resolve, reject) => {
    const request = store.put(status);
    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// ===================== CLEAR DATA =====================

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction([STORES.BOOKS, STORES.VERSES, STORES.INTRODUCTIONS, STORES.OUTLINES, STORES.SYNC_STATUS], 'readwrite');

  tx.objectStore(STORES.BOOKS).clear();
  tx.objectStore(STORES.VERSES).clear();
  tx.objectStore(STORES.INTRODUCTIONS).clear();
  tx.objectStore(STORES.OUTLINES).clear();
  tx.objectStore(STORES.SYNC_STATUS).clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// ===================== HELPER: Check if book is downloaded =====================

export async function isBookDownloaded(bookId: number): Promise<boolean> {
  const verses = await getAllVersesForBook(bookId);
  return verses.length > 0;
}

// ===================== HELPER: Get storage usage =====================

export async function getStorageInfo(): Promise<{ used: number; quota: number; percentage: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (used / quota) * 100 : 0;
    return { used, quota, percentage };
  }
  return { used: 0, quota: 0, percentage: 0 };
}
