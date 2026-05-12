'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, BookOpen } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface Book {
  id: number;
  name: string;
}

interface DevotionalEntry {
  id: number;
  scheduled_date: string;
  title: string;
  devotional_text: string;
  scripture_book: string;
  scripture_chapter: number;
  scripture_verse: number;
  scripture_quotation: string;
  related_scriptures?: string;
  further_readings?: string;
  author?: string;
  cover_photo_url?: string;
  is_published: boolean;
}

export default function DevotionalManagement({ books }: { books: Book[] }) {
  const [devotionals, setDevotionals] = useState<DevotionalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [scheduledDate, setScheduledDate] = useState('');
  const [title, setTitle] = useState('');
  const [devotionalText, setDevotionalText] = useState('');
  const [scriptureBook, setScriptureBook] = useState('');
  const [scriptureChapter, setScriptureChapter] = useState('');
  const [scriptureVerse, setScriptureVerse] = useState('');
  const [scriptureQuotation, setScriptureQuotation] = useState('');
  const [relatedScriptures, setRelatedScriptures] = useState('');
  const [furtherReadings, setFurtherReadings] = useState('');
  const [author, setAuthor] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    fetchDevotionals();
  }, []);

  const fetchDevotionals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devotional-entries');
      if (res.ok) {
        const data = await res.json();
        setDevotionals(data || []);
      }
    } catch (error) {
      console.error('Error fetching devotionals:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const clearForm = () => {
    setEditingId(null);
    setScheduledDate('');
    setTitle('');
    setDevotionalText('');
    setScriptureBook('');
    setScriptureChapter('');
    setScriptureVerse('');
    setScriptureQuotation('');
    setRelatedScriptures('');
    setFurtherReadings('');
    setAuthor('');
    setCoverPhotoUrl('');
    setIsPublished(true);
  };

  const handleSave = async () => {
    if (!scheduledDate || !title || !devotionalText || !scriptureBook || !scriptureChapter || !scriptureVerse) {
      showMessage('❌ Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        scheduled_date: scheduledDate,
        title,
        devotional_text: devotionalText,
        scripture_book: scriptureBook,
        scripture_chapter: parseInt(scriptureChapter),
        scripture_verse: parseInt(scriptureVerse),
        scripture_quotation: scriptureQuotation,
        related_scriptures: relatedScriptures || null,
        further_readings: furtherReadings || null,
        author: author || null,
        cover_photo_url: coverPhotoUrl || null,
        is_published: isPublished
      };

      const res = await fetch('/api/devotional-entries', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }

      showMessage(editingId ? '✅ Devotional updated!' : '✅ Devotional created!');
      clearForm();
      fetchDevotionals();
    } catch (error) {
      showMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (devotional: DevotionalEntry) => {
    setEditingId(devotional.id);
    setScheduledDate(devotional.scheduled_date);
    setTitle(devotional.title);
    setDevotionalText(devotional.devotional_text);
    setScriptureBook(devotional.scripture_book);
    setScriptureChapter(String(devotional.scripture_chapter));
    setScriptureVerse(String(devotional.scripture_verse));
    setScriptureQuotation(devotional.scripture_quotation || '');
    setRelatedScriptures(devotional.related_scriptures || '');
    setFurtherReadings(devotional.further_readings || '');
    setAuthor(devotional.author || '');
    setCoverPhotoUrl(devotional.cover_photo_url || '');
    setIsPublished(devotional.is_published);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this devotional?')) return;
    
    try {
      const res = await fetch(`/api/devotional-entries?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      showMessage('✅ Devotional deleted!');
      fetchDevotionals();
    } catch (error) {
      showMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div>
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg font-medium ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          {editingId ? 'Edit Devotional' : 'Create New Devotional'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scripture Book <span className="text-red-500">*</span>
            </label>
            <select
              value={scriptureBook}
              onChange={(e) => setScriptureBook(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select book...</option>
              {books.map(book => (
                <option key={book.id} value={book.name}>{book.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chapter <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={scriptureChapter}
              onChange={(e) => setScriptureChapter(e.target.value)}
              placeholder="Chapter #"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verse <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={scriptureVerse}
              onChange={(e) => setScriptureVerse(e.target.value)}
              placeholder="Verse #"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo URL</label>
            <input
              type="text"
              value={coverPhotoUrl}
              onChange={(e) => setCoverPhotoUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Devotional Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Devotional title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scripture Quotation
          </label>
          <RichTextEditor value={scriptureQuotation} onChange={setScriptureQuotation} placeholder="Full text of the scripture verse..." minHeight="100px" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Devotional Text <span className="text-red-500">*</span>
          </label>
          <RichTextEditor value={devotionalText} onChange={setDevotionalText} placeholder="Write your devotional content here..." minHeight="200px" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Related Scriptures
          </label>
          <RichTextEditor value={relatedScriptures} onChange={setRelatedScriptures} placeholder="e.g., John 3:16; Romans 8:28; Philippians 4:13" minHeight="80px" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Further Readings
          </label>
          <RichTextEditor value={furtherReadings} onChange={setFurtherReadings} placeholder="Suggested further reading passages..." minHeight="80px" />
        </div>

        <div className="flex items-center gap-4 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-700 font-medium">Published</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
          >
            {saving ? '💾 Saving...' : editingId ? '✏️ Update Devotional' : '➕ Create Devotional'}
          </button>
          {editingId && (
            <button
              onClick={clearForm}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Saved Devotionals ({devotionals.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading devotionals...</div>
        ) : devotionals.length > 0 ? (
          <div className="space-y-3">
            {devotionals.map(devotional => (
              <div key={devotional.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-gray-900">{devotional.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        devotional.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {devotional.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(devotional.scheduled_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={14} />
                        {devotional.scripture_book} {devotional.scripture_chapter}:{devotional.scripture_verse}
                      </span>
                      {devotional.author && (
                        <span>By {devotional.author}</span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-2">{devotional.devotional_text}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(devotional)}
                      className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(devotional.id)}
                      className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            No devotionals yet. Create your first devotional above!
          </div>
        )}
      </div>
    </div>
  );
}
