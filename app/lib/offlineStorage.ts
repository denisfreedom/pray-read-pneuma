// Offline storage using IndexedDB for Bible content

interface BibleBook {
  id: number;
  name_english: string;
  name_luganda: string;
  book_number: number;
  testament: string;
  total_chapters: number;
}

interface BibleVerse {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  text_english: string;
  text_luganda: string;
}

interface ChapterCache {
  book_id: number;
  chapter: number;
  book_name: string;
  verses: BibleVerse[];
  cached_at: number;
}

class OfflineStorage {
  private dbName = 'PrayReadBibleDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('chapters')) {
          const chapterStore = db.createObjectStore('chapters', { keyPath: ['book_id', 'chapter'] });
          chapterStore.createIndex('book_id', 'book_id', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async saveBooks(books: BibleBook[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');

    for (const book of books) {
      store.put(book);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getBooks(): Promise<BibleBook[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books'], 'readonly');
    const store = transaction.objectStore('books');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveChapterVerses(
    bookId: number,
    chapter: number,
    verses: BibleVerse[],
    bookName: string
  ): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['chapters'], 'readwrite');
    const store = transaction.objectStore('chapters');

    const chapterCache: ChapterCache = {
      book_id: bookId,
      chapter,
      book_name: bookName,
      verses,
      cached_at: Date.now(),
    };

    store.put(chapterCache);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChapterVerses(bookId: number, chapter: number): Promise<BibleVerse[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['chapters'], 'readonly');
    const store = transaction.objectStore('chapters');
    const request = store.get([bookId, chapter]);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as ChapterCache | undefined;
        resolve(result?.verses || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async isChapterDownloaded(bookId: number, chapter: number): Promise<boolean> {
    try {
      const verses = await this.getChapterVerses(bookId, chapter);
      return verses.length > 0;
    } catch {
      return false;
    }
  }

  async deleteChapter(bookId: number, chapter: number): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['chapters'], 'readwrite');
    const store = transaction.objectStore('chapters');
    store.delete([bookId, chapter]);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getDownloadedChapters(): Promise<{ bookId: number; chapter: number; bookName: string }[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['chapters'], 'readonly');
    const store = transaction.objectStore('chapters');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const chapters = request.result as ChapterCache[];
        resolve(
          chapters.map((c) => ({
            bookId: c.book_id,
            chapter: c.chapter,
            bookName: c.book_name,
          }))
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['books', 'chapters'], 'readwrite');
    
    transaction.objectStore('books').clear();
    transaction.objectStore('chapters').clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
