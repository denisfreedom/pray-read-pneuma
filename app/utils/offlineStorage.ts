// app/utils/offlineStorage.ts
// Single IndexedDB layer for ALL offline Bible content.
// Stores: books, chapters, verses, prayers, crossRefs, devotionals, meta.

const DB_NAME = 'prayread-offline';
const DB_VERSION = 1;
const STORES = ['books', 'chapters', 'verses', 'prayers', 'crossRefs', 'devotionals', 'meta'] as const;
type StoreName = (typeof STORES)[number];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          // Secondary indexes for fast chapter lookups
          if (name === 'chapters') store.createIndex('byBook', 'bookId', { unique: false });
          if (name === 'verses') store.createIndex('byChapter', 'chapterId', { unique: false });
          if (name === 'prayers') store.createIndex('byChapter', 'chapterId', { unique: false });
          if (name === 'crossRefs') store.createIndex('byVerse', 'verseId', { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

// ---- Generic helpers (used by OfflinePage) ----
export async function getAllFromStore(store: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putAllInStore(store: string, items: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    for (const item of items) s.put(item);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getStorageUsage(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage?.estimate) {
    const e = await navigator.storage.estimate();
    return { usage: e.usage || 0, quota: e.quota || 0 };
  }
  return { usage: 0, quota: 0 };
}

// ---- Books / chapters / verses / prayers ----
export async function getBooks(): Promise<any[]> {
  return getAllFromStore('books');
}

export async function getBookChapters(bookId: string | number): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('chapters', 'readonly')
      .objectStore('chapters')
      .index('byBook')
      .getAll(String(bookId));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getChapterVerses(chapterId: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('verses', 'readonly')
      .objectStore('verses')
      .index('byChapter')
      .getAll(chapterId);
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.verse - b.verse));
    req.onerror = () => reject(req.error);
  });
}

export async function getChapterPrayers(chapterId: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('prayers', 'readonly')
      .objectStore('prayers')
      .index('byChapter')
      .getAll(chapterId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getVerseCrossRefs(verseId: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('crossRefs', 'readonly')
      .objectStore('crossRefs')
      .index('byVerse')
      .getAll(verseId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ---- Download progress bookkeeping ----
export async function getMeta(key: string): Promise<any> {
  const all = await getAllFromStore('meta');
  return all.find((m) => m.id === key)?.value ?? null;
}

export async function setMeta(key: string, value: any): Promise<void> {
  await putAllInStore('meta', [{ id: key, value }]);
}

export async function clearOfflineData(): Promise<void> {
  const db = await openDB();
  await Promise.all(
    STORES.map(
      (store) =>
        new Promise<void>((resolve, reject) => {
          const req = db.transaction(store, 'readwrite').objectStore(store).clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    )
  );
}
