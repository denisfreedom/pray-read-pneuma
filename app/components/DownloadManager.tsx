'use client';

import { useState, useEffect } from 'react';
import { Download, Check, X, Loader, AlertCircle, HardDrive, Trash2 } from 'lucide-react';
import { useOfflineSync } from '@/app/hooks/useOfflineSync';
import { getBooks, clearStore, getStorageUsage } from '@/app/utils/offlineStorage';

interface DownloadManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadManager({ isOpen, onClose }: DownloadManagerProps) {
  const { syncStatus, syncAll, syncSpecificContent } = useOfflineSync();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'download' | 'manage'>('download');

  useEffect(() => {
    if (isOpen) {
      loadBooks();
      loadStorageInfo();
    }
  }, [isOpen]);

  const loadBooks = async () => {
    try {
      const response = await fetch('/api/bible-books');
      if (response.ok) {
        const booksData = await response.json();
        setBooks(booksData);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const loadStorageInfo = async () => {
    const info = await getStorageUsage();
    setStorageInfo(info);
  };

  const toggleBookSelection = (bookId: number) => {
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedBooks(new Set(books.map(b => b.id)));
  };

  const deselectAll = () => {
    setSelectedBooks(new Set());
  };

  const downloadSelected = async () => {
    if (selectedBooks.size === 0) return;

    try {
      for (const bookId of Array.from(selectedBooks)) {
        const book = books.find(b => b.id === bookId);
        if (book && book.total_chapters) {
          await syncSpecificContent('book', {
            bookId: book.id,
            totalChapters: book.total_chapters,
          });
        }
      }

      setDownloadProgress(100);
      setTimeout(() => {
        setDownloadProgress(0);
        deselectAll();
      }, 2000);

      loadStorageInfo();
    } catch (error) {
      console.error('Error downloading books:', error);
    }
  };

  const downloadEverything = async () => {
    try {
      await syncAll((progress) => {
        setDownloadProgress(progress);
      });

      setTimeout(() => {
        setDownloadProgress(0);
      }, 2000);

      loadStorageInfo();
    } catch (error) {
      console.error('Error downloading everything:', error);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to delete all offline content? This cannot be undone.')) {
      return;
    }

    try {
      await clearStore('verses');
      await clearStore('chapters');
      await clearStore('commentaries');
      await clearStore('prayers');
      await clearStore('devotionals');
      await clearStore('theological_insights');
      await clearStore('historical_context');
      await clearStore('verse_of_the_day');

      loadStorageInfo();
      alert('All offline content has been deleted.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing offline content. Please try again.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Offline Content</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('download')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'download'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Download
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Manage Storage
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'download' ? (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Quick Download</h3>
                <button
                  onClick={downloadEverything}
                  disabled={syncStatus.isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncStatus.isSyncing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Downloading... {Math.round(downloadProgress)}%
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download All Bible Content
                    </>
                  )}
                </button>
                <p className="text-sm text-blue-700 mt-2">
                  Downloads all 66 books, devotionals, and daily content for complete offline access
                </p>
              </div>

              {/* Progress Bar */}
              {syncStatus.isSyncing && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Download Progress</span>
                    <span className="text-sm text-gray-600">{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {syncStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">Download Error</h4>
                    <p className="text-sm text-red-700">{syncStatus.error}</p>
                  </div>
                </div>
              )}

              {/* Book Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Select Books to Download</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {books.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => toggleBookSelection(book.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        selectedBooks.has(book.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          selectedBooks.has(book.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedBooks.has(book.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {book.name_english}
                        </div>
                        <div className="text-sm text-gray-600">
                          {book.total_chapters} chapters
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={downloadSelected}
                  disabled={selectedBooks.size === 0 || syncStatus.isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Download {selectedBooks.size} Selected {selectedBooks.size === 1 ? 'Book' : 'Books'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Storage Info */}
              {storageInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <HardDrive className="w-6 h-6 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Storage Usage</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Used</span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {formatBytes(storageInfo.usage)}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available</span>
                      <span className="text-sm text-gray-600">
                        {formatBytes(storageInfo.quota - storageInfo.usage)} of {formatBytes(storageInfo.quota)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Sync */}
              {syncStatus.lastSyncTime && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check className="w-5 h-5" />
                    <div>
                      <div className="font-medium">Last Synced</div>
                      <div className="text-sm text-green-700">
                        {syncStatus.lastSyncTime.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Clear Data */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Delete Offline Content</h3>
                    <p className="text-sm text-red-700">
                      This will permanently delete all downloaded Bible content, devotionals, and cached data.
                      You can re-download content anytime when online.
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearAllData}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Offline Content
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
