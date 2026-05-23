'use client';

import { useState, useEffect } from 'react';
import { Download, X, Check, AlertCircle, Database, Trash2, RefreshCw } from 'lucide-react';
import {
  downloadEntireBible,
  downloadSelectedBooks,
  getDownloadStatus,
  SyncProgress,
} from '@/lib/offlineSync';
import {
  getBooks,
  clearAllData,
  getStorageInfo,
} from '@/lib/offlineDB';

interface Book {
  id: number;
  name_english: string;
  name_luganda: string;
  testament: string;
  chapters: number;
}

interface OfflineDownloadManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OfflineDownloadManager({ isOpen, onClose }: OfflineDownloadManagerProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [progress, setProgress] = useState<SyncProgress>({
    total: 0,
    completed: 0,
    currentBook: '',
    currentChapter: 0,
    status: 'idle',
  });
  const [downloadStatus, setDownloadStatus] = useState({
    hasData: false,
    lastSync: null as number | null,
    completedBooks: [] as number[],
    downloadedCount: 0,
    totalCount: 0,
  });
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    quota: 0,
    percentage: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadBooks();
      loadDownloadStatus();
      loadStorageInfo();
    }
  }, [isOpen]);

  const loadBooks = async () => {
    try {
      // Try to get from IndexedDB first
      const offlineBooks = await getBooks();
      if (offlineBooks.length > 0) {
        setBooks(offlineBooks);
        return;
      }

      // Otherwise fetch from API
      const response = await fetch('/api/bible-books');
      const data = await response.json();
      if (data.success && data.books) {
        setBooks(data.books);
      }
    } catch (error) {
      console.error('Failed to load books:', error);
    }
  };

  const loadDownloadStatus = async () => {
    const status = await getDownloadStatus();
    setDownloadStatus(status);
  };

  const loadStorageInfo = async () => {
    const info = await getStorageInfo();
    setStorageInfo(info);
  };

  const handleDownloadAll = async () => {
    try {
      setProgress({ total: 0, completed: 0, currentBook: 'Starting...', currentChapter: 0, status: 'downloading' });
      await downloadEntireBible(setProgress);
      await loadDownloadStatus();
      await loadStorageInfo();
    } catch (error) {
      console.error('Download failed:', error);
      setProgress({
        total: 0,
        completed: 0,
        currentBook: '',
        currentChapter: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed',
      });
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedBooks.length === 0) {
      alert('Please select at least one book');
      return;
    }

    try {
      setProgress({ total: 0, completed: 0, currentBook: 'Starting...', currentChapter: 0, status: 'downloading' });
      await downloadSelectedBooks(selectedBooks, setProgress);
      await loadDownloadStatus();
      await loadStorageInfo();
      setSelectedBooks([]);
    } catch (error) {
      console.error('Download failed:', error);
      setProgress({
        total: 0,
        completed: 0,
        currentBook: '',
        currentChapter: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed',
      });
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to delete all offline data? This cannot be undone.')) {
      return;
    }

    try {
      await clearAllData();
      await loadDownloadStatus();
      await loadStorageInfo();
      setProgress({ total: 0, completed: 0, currentBook: '', currentChapter: 0, status: 'idle' });
      alert('All offline data cleared successfully');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear offline data');
    }
  };

  const toggleBookSelection = (bookId: number) => {
    setSelectedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const selectAllBooks = () => {
    setSelectedBooks(books.map(b => b.id));
  };

  const deselectAllBooks = () => {
    setSelectedBooks([]);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    // Format without locale-dependent methods to avoid hydration mismatch
    const date = new Date(timestamp);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  if (!isOpen) return null;

  const isDownloading = progress.status === 'downloading';
  const isCompleted = progress.status === 'completed';
  const hasError = progress.status === 'error';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 700,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Download size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
                Offline Bible Manager
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                Download Bible content for offline access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {/* Storage Info */}
        <div style={{
          padding: 16,
          borderRadius: 12,
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Database size={16} color="#6b7280" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Storage Usage</span>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            {formatBytes(storageInfo.used)} used of {formatBytes(storageInfo.quota)} ({storageInfo.percentage.toFixed(1)}%)
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(storageInfo.percentage, 100)}%`,
              background: storageInfo.percentage > 80 ? '#ef4444' : '#8b5cf6',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Download Status */}
        {downloadStatus.hasData && (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Check size={16} color="#059669" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>
                {downloadStatus.downloadedCount} of {downloadStatus.totalCount} books downloaded
              </span>
            </div>
            {downloadStatus.lastSync && (
              <p style={{ margin: 0, fontSize: 12, color: '#047857' }}>
                Last synced: {formatDate(downloadStatus.lastSync)}
              </p>
            )}
          </div>
        )}

        {/* Progress */}
        {isDownloading && (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <RefreshCw size={16} color="#2563eb" className="animate-spin" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
                Downloading: {progress.currentBook}
              </span>
            </div>
            {progress.currentChapter > 0 && (
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#3b82f6' }}>
                Chapter {progress.currentChapter}
              </p>
            )}
            <div style={{ height: 6, background: '#dbeafe', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(progress.completed / progress.total) * 100}%`,
                background: '#3b82f6',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
              {Math.round((progress.completed / progress.total) * 100)}%
            </p>
          </div>
        )}

        {/* Completed */}
        {isCompleted && (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color="#059669" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>
                Download completed successfully!
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {hasError && (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="#dc2626" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#991b1b' }}>
                {progress.error || 'Download failed'}
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleDownloadAll}
            disabled={isDownloading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              background: isDownloading ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Download size={16} />
            Download Entire Bible
          </button>
          <button
            onClick={handleClearData}
            disabled={isDownloading || !downloadStatus.hasData}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: isDownloading || !downloadStatus.hasData ? '#f3f4f6' : '#fff',
              color: isDownloading || !downloadStatus.hasData ? '#9ca3af' : '#ef4444',
              border: '1px solid #e5e7eb',
              cursor: isDownloading || !downloadStatus.hasData ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Trash2 size={16} />
            Clear Data
          </button>
        </div>

        {/* Book Selection */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Select Books to Download
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={selectAllBooks}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#f3f4f6',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                Select All
              </button>
              <button
                onClick={deselectAllBooks}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#f3f4f6',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
            {books.map((book) => {
              const isSelected = selectedBooks.includes(book.id);
              const isDownloaded = downloadStatus.completedBooks.includes(book.id);

              return (
                <div
                  key={book.id}
                  onClick={() => toggleBookSelection(book.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: isSelected ? '#eff6ff' : 'transparent',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: isSelected ? '#bfdbfe' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: isSelected ? '#3b82f6' : '#d1d5db',
                      background: isSelected ? '#3b82f6' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && <Check size={12} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        {book.name_english}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {book.chapters} chapters • {book.testament === 'OT' ? 'Old Testament' : 'New Testament'}
                      </div>
                    </div>
                  </div>
                  {isDownloaded && (
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: '#d1fae5',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#065f46',
                    }}>
                      Downloaded
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Download Selected Button */}
        {selectedBooks.length > 0 && (
          <button
            onClick={handleDownloadSelected}
            disabled={isDownloading}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: 10,
              background: isDownloading ? '#e5e7eb' : '#3b82f6',
              color: '#fff',
              border: 'none',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Download size={16} />
            Download {selectedBooks.length} Selected Book{selectedBooks.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
