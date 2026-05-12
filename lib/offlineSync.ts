// Offline sync manager for downloading Bible content

import {
  saveBooks,
  saveVerses,
  saveIntroduction,
  saveOutlines,
  updateSyncStatus,
  getSyncStatus,
  getBooks as getOfflineBooks,
  isBookDownloaded,
} from './offlineDB';

export interface SyncProgress {
  total: number;
  completed: number;
  currentBook: string;
  currentChapter: number;
  status: 'idle' | 'downloading' | 'completed' | 'error';
  error?: string;
}

type ProgressCallback = (progress: SyncProgress) => void;

// Download all books metadata
export async function downloadAllBooks(onProgress?: ProgressCallback): Promise<void> {
  try {
    onProgress?.({
      total: 1,
      completed: 0,
      currentBook: 'Downloading books list',
      currentChapter: 0,
      status: 'downloading',
    });

    const response = await fetch('/api/bible-books');
    const data = await response.json();

    if (!data.success || !data.books) {
      throw new Error('Failed to fetch books');
    }

    await saveBooks(data.books);

    onProgress?.({
      total: 1,
      completed: 1,
      currentBook: 'Books downloaded',
      currentChapter: 0,
      status: 'downloading',
    });
  } catch (error) {
    console.error('Failed to download books:', error);
    throw error;
  }
}

// Download a single book with all its content
export async function downloadBook(bookId: number, bookName: string, totalChapters: number, onProgress?: ProgressCallback): Promise<void> {
  try {
    onProgress?.({
      total: totalChapters,
      completed: 0,
      currentBook: bookName,
      currentChapter: 0,
      status: 'downloading',
    });

    // Download all chapters for this book
    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      // Fetch verses
      const versesRes = await fetch(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}`);
      const versesData = await versesRes.json();
      
      if (versesData.success && versesData.verses) {
        await saveVerses(versesData.verses);
      }

      // Fetch chapter introduction
      try {
        const chapterIntroRes = await fetch(`/api/introduction?type=chapter_introduction&book=${encodeURIComponent(bookName)}&chapter=${chapter}`);
        const chapterIntroData = await chapterIntroRes.json();
        if (chapterIntroData && !chapterIntroData.error) {
          await saveIntroduction({
            id: `chapter_introduction:${bookName}:${chapter}`,
            type: 'chapter_introduction',
            book: bookName,
            chapter,
            ...chapterIntroData,
          });
        }
      } catch (err) {
        console.log(`No chapter intro for ${bookName} ${chapter}`);
      }

      // Fetch chapter prayer
      try {
        const chapterPrayerRes = await fetch(`/api/introduction?type=chapter_concluding_prayer&book=${encodeURIComponent(bookName)}&chapter=${chapter}`);
        const chapterPrayerData = await chapterPrayerRes.json();
        if (chapterPrayerData && !chapterPrayerData.error) {
          await saveIntroduction({
            id: `chapter_concluding_prayer:${bookName}:${chapter}`,
            type: 'chapter_concluding_prayer',
            book: bookName,
            chapter,
            ...chapterPrayerData,
          });
        }
      } catch (err) {
        console.log(`No chapter prayer for ${bookName} ${chapter}`);
      }

      onProgress?.({
        total: totalChapters,
        completed: chapter,
        currentBook: bookName,
        currentChapter: chapter,
        status: 'downloading',
      });
    }

    // Download book-level content (introduction, outline, prayer)
    try {
      const bookIntroRes = await fetch(`/api/introduction?type=book_introduction&book=${encodeURIComponent(bookName)}`);
      const bookIntroData = await bookIntroRes.json();
      if (bookIntroData && !bookIntroData.error) {
        await saveIntroduction({
          id: `book_introduction:${bookName}`,
          type: 'book_introduction',
          book: bookName,
          ...bookIntroData,
        });
      }
    } catch (err) {
      console.log(`No book intro for ${bookName}`);
    }

    try {
      const bookPrayerRes = await fetch(`/api/introduction?type=book_closing_prayer&book=${encodeURIComponent(bookName)}`);
      const bookPrayerData = await bookPrayerRes.json();
      if (bookPrayerData && !bookPrayerData.error) {
        await saveIntroduction({
          id: `book_closing_prayer:${bookName}`,
          type: 'book_closing_prayer',
          book: bookName,
          ...bookPrayerData,
        });
      }
    } catch (err) {
      console.log(`No book prayer for ${bookName}`);
    }

    // Download outlines
    try {
      const outlinesRes = await fetch(`/api/outlines?book_id=${bookId}&language=english`);
      const outlinesData = await outlinesRes.json();
      if (Array.isArray(outlinesData)) {
        await saveOutlines(outlinesData);
      }
    } catch (err) {
      console.log(`No outlines for ${bookName}`);
    }

  } catch (error) {
    console.error(`Failed to download book ${bookName}:`, error);
    throw error;
  }
}

// Download entire Bible
export async function downloadEntireBible(onProgress?: ProgressCallback): Promise<void> {
  try {
    // Step 1: Download all books metadata
    await downloadAllBooks(onProgress);

    // Step 2: Get all books
    const books = await getOfflineBooks();
    
    if (books.length === 0) {
      throw new Error('No books found');
    }

    const totalBooks = books.length;
    let completedBooks = 0;

    // Step 3: Download each book
    for (const book of books) {
      const bookProgress: ProgressCallback = (progress) => {
        const overallProgress: SyncProgress = {
          total: totalBooks,
          completed: completedBooks + (progress.completed / progress.total),
          currentBook: progress.currentBook,
          currentChapter: progress.currentChapter,
          status: 'downloading',
        };
        onProgress?.(overallProgress);
      };

      await downloadBook(book.id, book.name_english, book.chapters, bookProgress);
      completedBooks++;
    }

    // Update sync status
    await updateSyncStatus({
      id: 'lastSync',
      timestamp: Date.now(),
      completedBooks: books.map(b => b.id),
    });

    onProgress?.({
      total: totalBooks,
      completed: totalBooks,
      currentBook: 'All books',
      currentChapter: 0,
      status: 'completed',
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    onProgress?.({
      total: 0,
      completed: 0,
      currentBook: '',
      currentChapter: 0,
      status: 'error',
      error: errorMessage,
    });
    throw error;
  }
}

// Download selected books
export async function downloadSelectedBooks(bookIds: number[], onProgress?: ProgressCallback): Promise<void> {
  try {
    // Ensure books metadata is downloaded
    await downloadAllBooks();
    
    const allBooks = await getOfflineBooks();
    const selectedBooks = allBooks.filter(book => bookIds.includes(book.id));
    
    if (selectedBooks.length === 0) {
      throw new Error('No books selected');
    }

    const totalBooks = selectedBooks.length;
    let completedBooks = 0;

    for (const book of selectedBooks) {
      const bookProgress: ProgressCallback = (progress) => {
        const overallProgress: SyncProgress = {
          total: totalBooks,
          completed: completedBooks + (progress.completed / progress.total),
          currentBook: progress.currentBook,
          currentChapter: progress.currentChapter,
          status: 'downloading',
        };
        onProgress?.(overallProgress);
      };

      await downloadBook(book.id, book.name_english, book.chapters, bookProgress);
      completedBooks++;
    }

    // Update sync status
    const syncStatus = await getSyncStatus();
    const currentCompleted = syncStatus?.completedBooks || [];
    const newCompleted = Array.from(new Set([...currentCompleted, ...bookIds]));

    await updateSyncStatus({
      id: 'lastSync',
      timestamp: Date.now(),
      completedBooks: newCompleted,
    });

    onProgress?.({
      total: totalBooks,
      completed: totalBooks,
      currentBook: 'Selected books',
      currentChapter: 0,
      status: 'completed',
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    onProgress?.({
      total: 0,
      completed: 0,
      currentBook: '',
      currentChapter: 0,
      status: 'error',
      error: errorMessage,
    });
    throw error;
  }
}

// Check download status
export async function getDownloadStatus(): Promise<{
  hasData: boolean;
  lastSync: number | null;
  completedBooks: number[];
  downloadedCount: number;
  totalCount: number;
}> {
  try {
    const syncStatus = await getSyncStatus();
    const books = await getOfflineBooks();
    const totalCount = books.length;
    const downloadedCount = syncStatus?.completedBooks.length || 0;

    return {
      hasData: downloadedCount > 0,
      lastSync: syncStatus?.timestamp || null,
      completedBooks: syncStatus?.completedBooks || [],
      downloadedCount,
      totalCount,
    };
  } catch (error) {
    return {
      hasData: false,
      lastSync: null,
      completedBooks: [],
      downloadedCount: 0,
      totalCount: 0,
    };
  }
}
