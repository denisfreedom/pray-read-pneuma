'use client';

import { useState, useEffect } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import { BookOpen, Search, Edit2, Trash2, Plus, Save, X, Lightbulb } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';

interface Book {
  id: number;
  book_number: number;
  name: string;
  abbreviation: string;
  testament: string;
  total_chapters: number;
}

interface PrayerPassage {
  id?: number;
  book_id: number;
  chapter: number;
  verse_number: number;
  english_prayer: string;
  luganda_prayer: string;
  created_at?: string;
  updated_at?: string;
}

export default function PrayerPassagesPanel() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapter, setChapter] = useState<string>('');
  const [verseNumber, setVerseNumber] = useState<string>('');
  const [englishPrayer, setEnglishPrayer] = useState<string>('');
  const [lugandaPrayer, setLugandaPrayer] = useState<string>('');
  const [prayers, setPrayers] = useState<PrayerPassage[]>([]);
  const [filteredPrayers, setFilteredPrayers] = useState<PrayerPassage[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBooks();
    fetchPrayers();
  }, []);

  useEffect(() => {
    // Filter prayers based on search term
    if (searchTerm) {
      const filtered = prayers.filter(p => {
        const book = books.find(b => b.id === p.book_id);
        const bookName = book?.name.toLowerCase() || '';
        const reference = `${bookName} ${p.chapter}:${p.verse_number}`;
        return reference.includes(searchTerm.toLowerCase()) ||
               p.english_prayer.toLowerCase().includes(searchTerm.toLowerCase()) ||
               p.luganda_prayer.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredPrayers(filtered);
    } else {
      setFilteredPrayers(prayers);
    }
  }, [searchTerm, prayers, books]);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/bible-books');
      if (!res.ok) throw new Error('Failed to fetch books');
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching books:', error instanceof Error ? error.message : String(error));
      setBooks([]);
    }
  };

  const fetchPrayers = async () => {
    try {
      const res = await fetch('/api/prayer-passages');
      if (!res.ok) throw new Error('Failed to fetch prayer passages');
      const data = await res.json();
      setPrayers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching prayer passages:', error instanceof Error ? error.message : String(error));
      setPrayers([]);
    }
  };

  const loadPrayer = async () => {
    if (!selectedBook || !chapter || !verseNumber) return;
    
    const book = books.find(b => b.name === selectedBook);
    if (!book) return;

    try {
      const res = await fetch(`/api/prayer-passages?bookId=${book.id}&chapter=${chapter}&verseNumber=${verseNumber}`);
      if (!res.ok) {
        setEnglishPrayer('');
        setLugandaPrayer('');
        return;
      }
      const data = await res.json();
      if (data) {
        setEnglishPrayer(data.english_prayer || '');
        setLugandaPrayer(data.luganda_prayer || '');
        setEditingId(data.id || null);
      }
    } catch (error) {
      console.error('Error loading prayer passage:', error instanceof Error ? error.message : String(error));
      setEnglishPrayer('');
      setLugandaPrayer('');
    }
  };

  useEffect(() => {
    if (selectedBook && chapter && verseNumber) {
      loadPrayer();
    }
  }, [selectedBook, chapter, verseNumber]);

  const savePrayer = async () => {
    if (!selectedBook || !chapter || !verseNumber) {
      setMessage('❌ Please select book, chapter, and verse number');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!englishPrayer.trim() && !lugandaPrayer.trim()) {
      setMessage('❌ Please enter at least one prayer passage (English or Luganda)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSaving(true);
    try {
      const book = books.find(b => b.name === selectedBook);
      if (!book) throw new Error('Book not found');

      const res = await fetch('/api/prayer-passages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          chapter: parseInt(chapter),
          verseNumber: parseInt(verseNumber),
          englishPrayer: englishPrayer.trim() || null,
          lugandaPrayer: lugandaPrayer.trim() || null
        })
      });

      if (!res.ok) throw new Error('Failed to save prayer passage');

      setMessage('✅ Prayer passage saved successfully!');
      fetchPrayers();
      clearForm();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editPrayer = (prayer: PrayerPassage) => {
    const book = books.find(b => b.id === prayer.book_id);
    if (book) {
      setSelectedBook(book.name);
      setChapter(String(prayer.chapter));
      setVerseNumber(String(prayer.verse_number));
      setEnglishPrayer(prayer.english_prayer || '');
      setLugandaPrayer(prayer.luganda_prayer || '');
      setEditingId(prayer.id || null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const deletePrayer = async (prayer: PrayerPassage) => {
    if (!confirm('Are you sure you want to delete this prayer passage?')) return;

    try {
      const res = await fetch(`/api/prayer-passages?bookId=${prayer.book_id}&chapter=${prayer.chapter}&verseNumber=${prayer.verse_number}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete prayer passage');

      setMessage('✅ Prayer passage deleted successfully!');
      fetchPrayers();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const clearForm = () => {
    setSelectedBook('');
    setChapter('');
    setVerseNumber('');
    setEnglishPrayer('');
    setLugandaPrayer('');
    setEditingId(null);
  };

  const stripHtml = (html: string): string => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Lightbulb className="text-amber-600" />
              Prayer Passages Management
            </h2>
            {message && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                message.includes('Error') || message.includes('failed') || message.includes('❌')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Choose a book...</option>
                  {books.map(book => (
                    <option key={book.id} value={book.name}>
                      {book.book_number}. {book.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                <input
                  type="number"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verse</label>
                <input
                  type="number"
                  value={verseNumber}
                  onChange={(e) => setVerseNumber(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* English Prayer */}
            <div className="border border-amber-300 rounded-lg p-4 bg-amber-50">
              <h4 className="text-lg font-semibold text-amber-900 mb-4">🙏 English Prayer Passage</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prayer Text</label>
                <RichTextEditor
                  value={englishPrayer}
                  onChange={setEnglishPrayer}
                  placeholder="Enter English prayer passage..."
                  defaultColor="amber"
                />
              </div>
            </div>

            {/* Luganda Prayer */}
            <div className="border border-purple-300 rounded-lg p-4 bg-purple-50">
              <h4 className="text-lg font-semibold text-purple-900 mb-4">🙏 Luganda Prayer Passage</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Okukubaganya (Luganda)</label>
                <RichTextEditor
                  value={lugandaPrayer}
                  onChange={setLugandaPrayer}
                  placeholder="Wandiika okukubaganya mu Luganda..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={savePrayer}
                disabled={saving}
                className="flex-1 bg-amber-600 text-white py-3 px-6 rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : editingId ? 'Update Prayer Passage' : 'Save Prayer Passage'}
              </button>
              {editingId && (
                <button
                  onClick={clearForm}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium flex items-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prayer Passages List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-700">Existing Prayer Passages</h3>
            <div className="relative flex-1 max-w-md ml-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by reference or text..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">REFERENCE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ENGLISH PREVIEW</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">LUGANDA PREVIEW</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrayers.length > 0 ? (
                  filteredPrayers.map((prayer) => {
                    const book = books.find(b => b.id === prayer.book_id);
                    const englishPreview = stripHtml(prayer.english_prayer || '').substring(0, 80);
                    const lugandaPreview = stripHtml(prayer.luganda_prayer || '').substring(0, 80);
                    
                    return (
                      <tr key={prayer.id || `${prayer.book_id}-${prayer.chapter}-${prayer.verse_number}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">
                          {book?.name} {prayer.chapter}:{prayer.verse_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {englishPreview ? `${englishPreview}...` : <span className="text-gray-400 italic">No English</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {lugandaPreview ? `${lugandaPreview}...` : <span className="text-gray-400 italic">No Luganda</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editPrayer(prayer)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors text-sm"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => deletePrayer(prayer)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? 'No prayer passages found matching your search.' : 'No prayer passages added yet. Add your first prayer passage above.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
