'use client';

import React from 'react';

interface Book {
  id: number;
  name: string;
}

interface VerseSelectorProps {
  // Values
  selectedBook: string;
  selectedChapter: string;
  selectedVerse: string;
  
  // Event handlers
  onBookChange: (value: string) => void;
  onChapterChange: (value: string) => void;
  onVerseChange: (value: string) => void;
  
  // Configuration options
  gridCols?: number;
  optionalVerse?: boolean;
  showSearchButton?: boolean;
  focusRing?: boolean;
  
  // Search-specific features
  onSearch?: () => void;
  isSearching?: boolean;
  
  // Data
  books: Book[];
}

const VerseSelector: React.FC<VerseSelectorProps> = ({
  selectedBook,
  selectedChapter,
  selectedVerse,
  onBookChange,
  onChapterChange,
  onVerseChange,
  gridCols = 3,
  optionalVerse = false,
  showSearchButton = false,
  focusRing = false,
  onSearch,
  isSearching = false,
  books,
}) => {
  const inputClasses = `w-full px-3 py-2 border border-gray-300 rounded-lg ${
    focusRing ? 'focus:ring-2 focus:ring-blue-500' : ''
  } transition-colors`;

  const gridColsClass =
    gridCols === 3
      ? 'md:grid-cols-3'
      : gridCols === 4
      ? 'md:grid-cols-4'
      : 'md:grid-cols-2';

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        {optionalVerse ? '🔍 Find & Edit Verses' : 'Select Book & Chapter'}
      </h3>

      <div className={`grid grid-cols-1 ${gridColsClass} gap-4 ${showSearchButton ? 'mb-4' : ''}`}>
        {/* Book Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
          <select
            value={selectedBook}
            onChange={(e) => {
              onBookChange(e.target.value);
              onChapterChange('');
              if (!optionalVerse) {
                onVerseChange('');
              }
            }}
            className={inputClasses}
          >
            <option value="">-- Select a book --</option>
            {books.map((book) => (
              <option key={book.id} value={book.name}>
                {book.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
          <input
            type="number"
            value={selectedChapter}
            onChange={(e) => onChapterChange(e.target.value)}
            placeholder="Chapter number"
            className={inputClasses}
          />
        </div>

        {/* Verse Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verse {optionalVerse && <span className="text-gray-500">(Optional)</span>}
          </label>
          <input
            type="number"
            value={selectedVerse}
            onChange={(e) => onVerseChange(e.target.value)}
            placeholder={optionalVerse ? 'Optional' : 'Verse number'}
            className={inputClasses}
          />
        </div>

        {/* Search Button (optional) */}
        {showSearchButton && (
          <div className="flex items-end">
            <button
              onClick={onSearch}
              disabled={isSearching || !selectedBook || !selectedChapter}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerseSelector;
