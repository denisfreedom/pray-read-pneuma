import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BibleDB extends DBSchema {
  books: {
    key: number;
    value: {
      id: number;
      name_english: string;
      name_luganda: string;
      book_number: number;
      testament: string;
      total_chapters: number;
    };
  };
  verses: {
    key: string;
    value: {
      id: number;
      book_id: number;
      chapter: number;
      verse: number;
      text_english: string;
      text_luganda: string;
    };
    indexes: { 'by-book-chapter': [number, number] };
  };
  downloads: {
    key: string;
    value: {
      bookId: number;
      chapter: number;
      downloadedAt: number;
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<BibleDB> | null = null;

  private async getDB(): Promise<IDBPDatabase<BibleDB>> {
    if (this.db) return this.db;

    this.db = await openDB<BibleDB>('BibleDB', 1, {
      upgrade(db) {
        // Books store
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }

        // Verses store with index
        if (!db.objectStoreNames.contains('verses')) {
          const verseStore = db.createObjectStore('verses', { keyPath: 'id' });
          verseStore.createIndex('by-book-chapter', ['book_id', 'chapter']);
        }

        // Downloads tracking
        if (!db.objectStoreNames.contains('downloads')) {
          db.createObjectStore('downloads', { keyPath: ['bookId', 'chapter'] });
        }
      },
    });

    return this.db;
  }

  async saveBooks(books: BibleDB['books']['value'][]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('books', 'readwrite');
    for (const book of books) {
      await tx.store.put(book);
    }
    await tx.done;
  }

  async getBooks(): Promise<BibleDB['books']['value'][]> {
    const db = await this.getDB();
    return await db.getAll('books');
  }

  async saveChapterVerses(
    bookId: number,
    chapter: number,
    verses: BibleDB['verses']['value'][],
    _bookName: string
  ): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['verses', 'downloads'], 'readwrite');

    // Save verses
    for (const verse of verses) {
      await tx.objectStore('verses').put(verse);
    }

    // Mark as downloaded
    await tx.objectStore('downloads').put({
      bookId,
      chapter,
      downloadedAt: Date.now(),
    });

    await tx.done;
  }

  async getChapterVerses(bookId: number, chapter: number): Promise<BibleDB['verses']['value'][]> {
    const db = await this.getDB();
    return await db.getAllFromIndex('verses', 'by-book-chapter', [bookId, chapter]);
  }

  async isChapterDownloaded(bookId: number, chapter: number): Promise<boolean> {
    const db = await this.getDB();
    const download = await db.get('downloads', [bookId, chapter]);
    return !!download;
  }

  async deleteChapter(bookId: number, chapter: number): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['verses', 'downloads'], 'readwrite');

    // Delete verses
    const verses = await tx.objectStore('verses').index('by-book-chapter').getAll([bookId, chapter]);
    for (const verse of verses) {
      await tx.objectStore('verses').delete(verse.id);
    }

    // Remove download record
    await tx.objectStore('downloads').delete([bookId, chapter]);

    await tx.done;
  }
}

export const offlineStorage = new OfflineStorage();
