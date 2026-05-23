'use client';

import { useState, useEffect } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import { BookOpen, Search, Edit2, Trash2, Plus, Save, X, MessageCircle } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';

interface Book {
  id: number;
  book_number: number;
  name: string;
  abbreviation: string;
  testament: string;
  total_chapters: number;
}

interface Commentary {
  id?: number;
  book_id: number;
  chapter: number;
  verse_number: number;
  commentary_text: string;
  luganda_commentary_text: string;
  created_at?: string;
  updated_at?: string;
}

export default function CommentaryPanel() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapter, setChapter] = useState<string>('');
  const [verseNumber, setVerseNumber] = useState<string>('');
  const [englishCommentary, setEnglishCommentary] = useState<string>('');
  const [lugandaCommentary, setLugandaCommentary] = useState<string>('');
  const [commentaries, setCommentaries] = useState<Commentary[]>([]);
  const [filteredCommentaries, setFilteredCommentaries] = useState<Commentary[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBooks();
    fetchCommentaries();
  }, []);

  useEffect(() => {
    // Filter commentaries based on search term
    if (searchTerm) {
      const filtered = commentaries.filter(c => {
        const book = books.find(b => b.id === c.book_id);
        const bookName = book?.name.toLowerCase() || '';
        const reference = `${bookName} ${c.chapter}:${c.verse_number}`;
        return reference.includes(searchTerm.toLowerCase()) ||
               c.commentary_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
               c.luganda_commentary_text.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredCommentaries(filtered);
    } else {
      setFilteredCommentaries(commentaries);
    }
  }, [searchTerm, commentaries, books]);

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

  const fetchCommentaries = async () => {
    try {
      const res = await fetch('/api/commentaries');
      if (!res.ok) throw new Error('Failed to fetch commentaries');
      const data = await res.json();
      setCommentaries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching commentaries:', error instanceof Error ? error.message : String(error));
      setCommentaries([]);
    }
  };

  const loadCommentary = async () => {
    if (!selectedBook || !chapter || !verseNumber) return;
    
    const book = books.find(b => b.name === selectedBook);
    if (!book) return;

    try {
      const res = await fetch(`/api/commentaries?bookId=${book.id}&chapter=${chapter}&verseNumber=${verseNumber}`);
      if (!res.ok) {
        setEnglishCommentary('');
        setLugandaCommentary('');
        return;
      }
      const data = await res.json();
      if (data) {
        setEnglishCommentary(data.commentary_text || '');
        setLugandaCommentary(data.luganda_commentary_text || '');
        setEditingId(data.id || null);
      }
    } catch (error) {
      console.error('Error loading commentary:', error instanceof Error ? error.message : String(error));
      setEnglishCommentary('');
      setLugandaCommentary('');
    }
  };

  useEffect(() => {
    if (selectedBook && chapter && verseNumber) {
      loadCommentary();
    }
  }, [selectedBook, chapter, verseNumber]);

  const saveCommentary = async () => {
    if (!selectedBook || !chapter || !verseNumber) {
      setMessage('❌ Please select book, chapter, and verse number');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!englishCommentary.trim() && !lugandaCommentary.trim()) {
      setMessage('❌ Please enter at least one commentary (English or Luganda)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSaving(true);
    try {
      const book = books.find(b => b.name === selectedBook);
      if (!book) throw new Error('Book not found');

      const res = await fetch('/api/commentaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          chapter: parseInt(chapter),
          verseNumber: parseInt(verseNumber),
          commentaryText: englishCommentary.trim() || null,
          lugandaCommentaryText: lugandaCommentary.trim() || null
        })
      });

      if (!res.ok) throw new Error('Failed to save commentary');

      setMessage('✅ Commentary saved successfully!');
      fetchCommentaries();
      clearForm();
    } catch (error) {
      setMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const editCommentary = (commentary: Commentary) => {
    const book = books.find(b => b.id === commentary.book_id);
    if (book) {
      setSelectedBook(book.name);
      setChapter(String(commentary.chapter));
      setVerseNumber(String(commentary.verse_number));
      setEnglishCommentary(commentary.commentary_text || '');
      setLugandaCommentary(commentary.luganda_commentary_text || '');
      setEditingId(commentary.id || null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const deleteCommentary = async (commentary: Commentary) => {
    if (!confirm('Are you sure you want to delete this commentary?')) return;

    try {
      const res = await fetch(`/api/commentaries?bookId=${commentary.book_id}&chapter=${commentary.chapter}&verseNumber=${commentary.verse_number}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete commentary');

      setMessage('✅ Commentary deleted successfully!');
      fetchCommentaries();
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
    setEnglishCommentary('');
    setLugandaCommentary('');
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
              <MessageCircle className="text-blue-600" />
              Commentary Management
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verse</label>
                <input
                  type="number"
                  value={verseNumber}
                  onChange={(e) => setVerseNumber(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* English Commentary */}
            <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
              <h4 className="text-lg font-semibold text-blue-900 mb-4">💬 English Commentary</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Commentary Text</label>
                <RichTextEditor
                  value={englishCommentary}
                  onChange={setEnglishCommentary}
                  placeholder="Enter English commentary..."
                  defaultColor="blue"
                />
              </div>
            </div>

            {/* Luganda Commentary */}
            <div className="border border-purple-300 rounded-lg p-4 bg-purple-50">
              <h4 className="text-lg font-semibold text-purple-900 mb-4">💬 Luganda Commentary</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kunnyonnyola (Luganda)</label>
                <RichTextEditor
                  value={lugandaCommentary}
                  onChange={setLugandaCommentary}
                  placeholder="Wandiika kunnyonnyola mu Luganda..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={saveCommentary}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : editingId ? 'Update Commentary' : 'Save Commentary'}
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

        {/* Commentaries List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-700">Existing Commentaries</h3>
            <div className="relative flex-1 max-w-md ml-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by reference or text..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                {filteredCommentaries.length > 0 ? (
                  filteredCommentaries.map((commentary) => {
                    const book = books.find(b => b.id === commentary.book_id);
                    const englishPreview = stripHtml(commentary.commentary_text || '').substring(0, 80);
                    const lugandaPreview = stripHtml(commentary.luganda_commentary_text || '').substring(0, 80);
                    
                    return (
                      <tr key={commentary.id || `${commentary.book_id}-${commentary.chapter}-${commentary.verse_number}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">
                          {book?.name} {commentary.chapter}:{commentary.verse_number}
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
                              onClick={() => editCommentary(commentary)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => deleteCommentary(commentary)}
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
                      {searchTerm ? 'No commentaries found matching your search.' : 'No commentaries added yet. Add your first commentary above.'}
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
