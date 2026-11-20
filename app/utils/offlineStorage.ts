// app/utils/offlineStorage.ts — V2 FULL OFFLINE STORE
// IndexedDB store for the ENTIRE Pray-Read app to work offline.
// Stores: books, chapters/verses, devotionals, commentary/insights,
// Q&A, verse-of-the-day, bookmarks/highlights.
// Online-only by design: verse-songs audio, auth, live-stats.

export const DB_NAME = 'prayread-offline';
export const DB_VERSION = 2;
export const STORES = ['books','chapters','verses','devotionals','commentary','qa','verseOfDay','meta','highlights','bookmarks'] as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function initDB(): Promise<IDBDatabase> { return openDB(); }
async function tx(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => void): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode); const s = t.objectStore(store);
    try { fn(s); } catch (e) { reject(e); return; }
    t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => { db.close(); reject(t.error); };
  });
}
async function put(store: string, value: any) { await tx(store, 'readwrite', s => { s.put(value); }); }
async function getAll(store: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly'); const req = t.objectStore(store).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
export async function getAllFromStore(store: string): Promise<any[]> { try { return await getAll(store); } catch { return []; } }
export async function getBooks(): Promise<any[]> { return getAllFromStore('books'); }
export async function saveToStore(store: string, value: any) { await put(store, value); }
export async function saveBulkToStore(store: string, values: any[]) { for (const v of values) await put(store, v); }
export async function saveBooks(books: any[]) { await saveBulkToStore('books', books); }
export async function saveChapterVerses(bookId: number| string, chapter: number, verses: any[]) {
  await put('chapters', { id: `chapter-${bookId}-${chapter}`, bookId, chapter, verses, savedAt: Date.now() });
  for (const v of verses) await put('verses', { id: v.id ?? `${bookId}-${chapter}-${v.verse}`, ...v, bookId, chapter });
}
export async function saveChapterContent(bookId: number|string, chapter: number, content: any) {
  await put('chapters', { id: `chapter-${bookId}-${chapter}`, bookId, chapter, content, verses: content?.verses || [], savedAt: Date.now() });
}
export async function saveDevotional(d: any) { await put('devotionals', { id: d.id ?? `dev-${Date.now()}`, ...d, savedAt: Date.now() }); }
export async function saveVerseOfTheDay(v: any) { await put('verseOfDay', { id: 'today', ...v, savedAt: Date.now() }); }
export async function saveCommentary(c: any) { await put('commentary', { id: c.id ?? `com-${Date.now()}`, ...c, savedAt: Date.now() }); }
export async function saveQA(q: any) { await put('qa', { id: q.id ?? `qa-${Date.now()}`, ...q, savedAt: Date.now() }); }
export async function clearStore(store: string) { await tx(store, 'readwrite', s => { s.clear(); }); }
export async function clearAllOffline() { for (const s of STORES) await clearStore(s); }
export async function getStorageUsage(): Promise<{usage:number;quota:number}> {
  try { const e: any = await (navigator as any).storage?.estimate?.(); return { usage: e?.usage || 0, quota: e?.quota || 0 }; }
  catch { return { usage: 0, quota: 0 }; }
}
// Progress helpers used by the Download centre
export async function getDownloadProgress(): Promise<{books:number;verses:number;devotionals:number;commentary:number;qa:number}> {
  const [books, verses, devotionals, commentary, qa] = await Promise.all([
    getAllFromStore('books'), getAllFromStore('verses'), getAllFromStore('devotionals'), getAllFromStore('commentary'), getAllFromStore('qa'),
  ]);
  return { books: books.length, verses: verses.length, devotionals: devotionals.length, commentary: commentary.length, qa: qa.length };
}
export async function getMeta(key: string): Promise<any> {
  const all = await getAllFromStore('meta'); return all.find((m:any)=>m.id===key)?.value ?? null;
}
export async function setMeta(key: string, value: any) { await put('meta', { id: key, value, savedAt: Date.now() }); }
