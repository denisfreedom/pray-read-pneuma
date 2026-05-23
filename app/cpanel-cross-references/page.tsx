'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';

const LS_LAST_VERSE_KEY = 'crossref_last_verse';
const LS_REFS_PREFIX = 'crossref_saved_';

function saveCrossRefsToLocalStorage(bookId: string, chapter: string, verse: string, refs: CrossReference[]) {
  try {
    const key = `${LS_REFS_PREFIX}${bookId}_${chapter}_${verse}`;
    localStorage.setItem(key, JSON.stringify(refs));
    localStorage.setItem(LS_LAST_VERSE_KEY, JSON.stringify({ bookId, chapter, verse }));
  } catch {}
}

function loadCrossRefsFromLocalStorage(bookId: string, chapter: string, verse: string): CrossReference[] {
  try {
    const key = `${LS_REFS_PREFIX}${bookId}_${chapter}_${verse}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getLastVerse(): { bookId: string; chapter: string; verse: string } | null {
  try {
    const raw = localStorage.getItem(LS_LAST_VERSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface Book {
  id: number;
  name_english: string;
  name_luganda: string;
  total_chapters: number;
}

interface CrossReference {
  id: number;
  source_book_id: number;
  source_chapter: number;
  source_verse: number;
  target_book_id: number;
  target_chapter: number;
  target_verse: number;
  relationship_type: string;
  notes: string;
  source_book_name: string;
  target_book_name: string;
  text_english?: string;
}

function CrossReferencesContent() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [localCacheInfo, setLocalCacheInfo] = useState<string>('');

  // Source verse fields
  const [sourceBookId, setSourceBookId] = useState('');
  const [sourceChapter, setSourceChapter] = useState('');
  const [sourceVerse, setSourceVerse] = useState('');
  const [sourceText, setSourceText] = useState('');

  // Target verse fields
  const [targetBookId, setTargetBookId] = useState('');
  const [targetChapter, setTargetChapter] = useState('');
  const [targetVerse, setTargetVerse] = useState('');
  const [targetText, setTargetText] = useState('');

  // Additional fields
  const [relationshipType, setRelationshipType] = useState('related');
  const [notes, setNotes] = useState('');

  // Bulk paste cross-references
  const [bulkCrossRefs, setBulkCrossRefs] = useState('');
  const [parsedReferences, setParsedReferences] = useState<Array<{
    bookName: string;
    chapter: number;
    verse: number;
    targetBookId?: number;
    status: 'pending' | 'valid' | 'invalid';
    errorMessage?: string;
  }>>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Cross-references list
  const [crossReferences, setCrossReferences] = useState<CrossReference[]>([]);
  const [viewingBookId, setViewingBookId] = useState('');
  const [viewingChapter, setViewingChapter] = useState('');
  const [viewingVerse, setViewingVerse] = useState('');
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTargetBookId, setEditTargetBookId] = useState('');
  const [editTargetChapter, setEditTargetChapter] = useState('');
  const [editTargetVerse, setEditTargetVerse] = useState('');
  const [editRelationshipType, setEditRelationshipType] = useState('related');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
    fetchBooks();
  }, []);

  // After books load, restore last-worked verse from localStorage
  useEffect(() => {
    if (books.length === 0) return;
    const last = getLastVerse();
    if (last) {
      setViewingBookId(last.bookId);
      setViewingChapter(last.chapter);
      setViewingVerse(last.verse);
      // Show cached refs instantly before DB loads
      const cached = loadCrossRefsFromLocalStorage(last.bookId, last.chapter, last.verse);
      if (cached.length > 0) {
        setCrossReferences(cached);
        setLocalCacheInfo(`Showing ${cached.length} cached reference(s) — syncing from database…`);
        // Then fetch fresh from DB
        fetchCrossReferencesForVerse(last.bookId, last.chapter, last.verse, true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/bible-books?full=true');
      const data = await response.json();
      setBooks(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching books:', error);
      setLoading(false);
    }
  };

  const fetchVerseText = async (bookId: string, chapter: string, verse: string, isSource: boolean) => {
    if (!bookId || !chapter || !verse) return;
    
    try {
      const response = await fetch(`/api/bible-verses?bookId=${bookId}&chapter=${chapter}`);
      const data = await response.json();
      
      const verseData = data.verses?.find((v: any) => v.verse === parseInt(verse));
      if (verseData) {
        if (isSource) {
          setSourceText(verseData.text_english);
        } else {
          setTargetText(verseData.text_english);
        }
      }
    } catch (error) {
      console.error('Error fetching verse:', error);
    }
  };

  const fetchCrossReferencesForVerse = async (bookId: string, chapter: string, verse: string, silent = false) => {
    if (!bookId || !chapter || !verse) return;
    if (!silent) setLoadingRefs(true);
    try {
      const response = await fetch(
        `/api/cross-references?bookId=${bookId}&chapter=${chapter}&verse=${verse}`
      );
      const data = await response.json();
      const refs = Array.isArray(data) ? data : (data.crossReferences || []);
      setCrossReferences(refs);
      setLocalCacheInfo('');
      // Persist to localStorage for instant future loads
      saveCrossRefsToLocalStorage(bookId, chapter, verse, refs);
    } catch (error) {
      console.error('Error fetching cross-references:', error);
    } finally {
      if (!silent) setLoadingRefs(false);
    }
  };

  const fetchCrossReferences = async (bId?: string, ch?: string, vs?: string) => {
    const bookId = bId ?? viewingBookId;
    const chapter = ch ?? viewingChapter;
    const verse = vs ?? viewingVerse;
    await fetchCrossReferencesForVerse(bookId, chapter, verse, false);
  };

  const handleEditCrossReference = (ref: CrossReference) => {
    setEditingId(ref.id);
    setEditTargetBookId(String(ref.target_book_id));
    setEditTargetChapter(String(ref.target_chapter));
    setEditTargetVerse(String(ref.target_verse));
    setEditRelationshipType(ref.relationship_type || 'related');
    setEditNotes(ref.notes || '');
  };

  const handleUpdateCrossReference = async (id: number) => {
    if (!editTargetBookId || !editTargetChapter || !editTargetVerse) {
      setMessage('Please fill in all target verse fields');
      return;
    }
    setEditSaving(true);
    try {
      const response = await fetch('/api/cross-references', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          sourceBookId: parseInt(viewingBookId),
          sourceChapter: parseInt(viewingChapter),
          sourceVerse: parseInt(viewingVerse),
          targetBookId: parseInt(editTargetBookId),
          targetChapter: parseInt(editTargetChapter),
          targetVerse: parseInt(editTargetVerse),
          relationshipType: editRelationshipType,
          notes: editNotes
        })
      });
      if (response.ok) {
        setMessage('Cross-reference updated successfully!');
        setEditingId(null);
        fetchCrossReferences();
      } else {
        setMessage('Failed to update cross-reference');
      }
    } catch (error) {
      setMessage('Error updating cross-reference');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveCrossReference = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceBookId || !sourceChapter || !sourceVerse || !targetBookId || !targetChapter || !targetVerse) {
      setMessage('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/cross-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBookId: parseInt(sourceBookId),
          sourceChapter: parseInt(sourceChapter),
          sourceVerse: parseInt(sourceVerse),
          targetBookId: parseInt(targetBookId),
          targetChapter: parseInt(targetChapter),
          targetVerse: parseInt(targetVerse),
          relationshipType,
          notes
        })
      });

      if (response.ok) {
        setMessage('Cross-reference saved successfully!');
        setTargetBookId('');
        setTargetChapter('');
        setTargetVerse('');
        setTargetText('');
        setRelationshipType('related');
        setNotes('');
        // Sync viewing fields and auto-refresh list (also writes to localStorage)
        setViewingBookId(sourceBookId);
        setViewingChapter(sourceChapter);
        setViewingVerse(sourceVerse);
        localStorage.setItem(LS_LAST_VERSE_KEY, JSON.stringify({ bookId: sourceBookId, chapter: sourceChapter, verse: sourceVerse }));
        fetchCrossReferences(sourceBookId, sourceChapter, sourceVerse);
      } else {
        setMessage('Failed to save cross-reference');
      }
    } catch (error) {
      console.error('Error saving cross-reference:', error);
      setMessage('Error saving cross-reference');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCrossReference = async (id: number) => {
    if (!confirm('Are you sure you want to delete this cross-reference?')) return;

    try {
      const response = await fetch(`/api/cross-references?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Cross-reference deleted successfully');
        fetchCrossReferences();
      } else {
        setMessage('Failed to delete cross-reference');
      }
    } catch (error) {
      console.error('Error deleting cross-reference:', error);
      setMessage('Error deleting cross-reference');
    }
  };

  const parseBulkCrossReferences = (text: string) => {
    // Parse formats like:
    // Romans 1:6; 1 Corinthians 1:2; John 17:11–12; 1 Peter 1:2; 1 Thessalonians 5:23
    const references: Array<{ book: string; chapter: number; verse: number }> = [];
    
    // Split by semicolons and commas
    const parts = text.split(/[;,]/);
    
    parts.forEach(part => {
      part = part.trim();
      if (!part) return;
      
      // Match patterns like "Romans 1:6" or "John 17:11-12" or "1 Corinthians 1:2"
      const match = part.match(/^([\d\s]*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)(?:[-–]\d+)?/);
      
      if (match) {
        const bookName = match[1].trim();
        const chapter = parseInt(match[2]);
        const verse = parseInt(match[3]);
        
        references.push({ book: bookName, chapter, verse });
      }
    });
    
    return references;
  };

  const findBookByName = (name: string): Book | undefined => {
    const normalizedName = name.toLowerCase().trim();
    return books.find(book => 
      book.name_english.toLowerCase() === normalizedName ||
      book.name_english.toLowerCase().startsWith(normalizedName) ||
      normalizedName.includes(book.name_english.toLowerCase())
    );
  };

  const handleParseBulkReferences = () => {
    if (!bulkCrossRefs.trim()) {
      setParsedReferences([]);
      return;
    }

    const parsedRefs = parseBulkCrossReferences(bulkCrossRefs);
    
    const validatedRefs = parsedRefs.map(ref => {
      const targetBook = findBookByName(ref.book);
      
      if (!targetBook) {
        return {
          bookName: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
          status: 'invalid' as const,
          errorMessage: `Book "${ref.book}" not found`
        };
      }
      
      if (ref.chapter > targetBook.total_chapters) {
        return {
          bookName: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
          targetBookId: targetBook.id,
          status: 'invalid' as const,
          errorMessage: `${targetBook.name_english} only has ${targetBook.total_chapters} chapters`
        };
      }
      
      return {
        bookName: targetBook.name_english,
        chapter: ref.chapter,
        verse: ref.verse,
        targetBookId: targetBook.id,
        status: 'valid' as const
      };
    });
    
    setParsedReferences(validatedRefs);
  };

  // Auto-parse when bulk cross-refs change
  useEffect(() => {
    if (bulkCrossRefs.trim()) {
      const parsedRefs = parseBulkCrossReferences(bulkCrossRefs);
      
      const validatedRefs = parsedRefs.map(ref => {
        const targetBook = findBookByName(ref.book);
        
        if (!targetBook) {
          return {
            bookName: ref.book,
            chapter: ref.chapter,
            verse: ref.verse,
            status: 'invalid' as const,
            errorMessage: `Book "${ref.book}" not found`
          };
        }
        
        if (ref.chapter > targetBook.total_chapters) {
          return {
            bookName: ref.book,
            chapter: ref.chapter,
            verse: ref.verse,
            targetBookId: targetBook.id,
            status: 'invalid' as const,
            errorMessage: `${targetBook.name_english} only has ${targetBook.total_chapters} chapters`
          };
        }
        
        return {
          bookName: targetBook.name_english,
          chapter: ref.chapter,
          verse: ref.verse,
          targetBookId: targetBook.id,
          status: 'valid' as const
        };
      });
      
      setParsedReferences(validatedRefs);
    } else {
      setParsedReferences([]);
    }
  }, [bulkCrossRefs, books]);

  const handleSaveParsedReferences = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const validRefs = parsedReferences.filter(ref => ref.status === 'valid');
    
    if (validRefs.length === 0) {
      setMessage('No valid references to save');
      return;
    }
    
    if (!sourceBookId || !sourceChapter || !sourceVerse) {
      setMessage('Please select a pray-read prayer verse first (Source Verse: Book, Chapter, Verse)');
      return;
    }

    setBulkSaving(true);
    setMessage('');

    try {
      let successCount = 0;
      let failCount = 0;

      for (const ref of validRefs) {
        try {
          const response = await fetch('/api/cross-references', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceBookId: parseInt(sourceBookId),
              sourceChapter: parseInt(sourceChapter),
              sourceVerse: parseInt(sourceVerse),
              targetBookId: ref.targetBookId,
              targetChapter: ref.chapter,
              targetVerse: ref.verse,
              relationshipType: relationshipType,
              notes: notes || 'Added via bulk paste'
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      setMessage(`✅ Saved ${successCount} cross-references successfully${failCount > 0 ? `, ${failCount} failed` : ''} for ${books.find(b => b.id === parseInt(sourceBookId))?.name_english} ${sourceChapter}:${sourceVerse}`);
      setBulkCrossRefs('');
      setParsedReferences([]);
      setNotes('');
      // Sync viewing fields and auto-refresh list from DB (also writes to localStorage)
      setViewingBookId(sourceBookId);
      setViewingChapter(sourceChapter);
      setViewingVerse(sourceVerse);
      // Save the verse key immediately so it restores on next load
      localStorage.setItem(LS_LAST_VERSE_KEY, JSON.stringify({ bookId: sourceBookId, chapter: sourceChapter, verse: sourceVerse }));
      fetchCrossReferences(sourceBookId, sourceChapter, sourceVerse);
    } catch (error) {
      console.error('Error saving cross-references:', error);
      setMessage('Error saving cross-references');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleRemoveParsedRef = (index: number) => {
    setParsedReferences(prev => prev.filter((_, i) => i !== index));
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Cross-References</h1>
          <p className="text-gray-600 mt-2">Add and manage scripture cross-references</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('✅') || message.includes('successfully') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Load Saved Cross-References — full width at top */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">📂 Load Saved Cross-References</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter a verse to view, edit, update, or delete its saved cross-references.
                {' '}<span className="text-amber-600 font-medium">Last worked verse is auto-restored from cache on page load.</span>
              </p>
            </div>
          </div>

          {/* localStorage cache status */}
          {localCacheInfo && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
              <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {localCacheInfo}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
              <select
                value={viewingBookId}
                onChange={(e) => setViewingBookId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="">Select Book</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>{book.name_english || book.name_luganda}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
              <input type="number" min="1" value={viewingChapter}
                onChange={(e) => setViewingChapter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="e.g. 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verse</label>
              <input type="number" min="1" value={viewingVerse}
                onChange={(e) => setViewingVerse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="e.g. 1"
              />
            </div>
          </div>

          <div className="flex gap-3 mb-1">
            <button
              onClick={() => fetchCrossReferences()}
              disabled={!viewingBookId || !viewingChapter || !viewingVerse || loadingRefs}
              className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
            >
              {loadingRefs ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Loading from database…
                </>
              ) : (
                <>📂 Load from Database</>
              )}
            </button>
            {viewingBookId && viewingChapter && viewingVerse && (
              <button
                type="button"
                onClick={() => {
                  const cached = loadCrossRefsFromLocalStorage(viewingBookId, viewingChapter, viewingVerse);
                  if (cached.length > 0) {
                    setCrossReferences(cached);
                    setLocalCacheInfo(`Loaded ${cached.length} reference(s) from local cache ✓`);
                    setTimeout(() => setLocalCacheInfo(''), 3000);
                  } else {
                    setLocalCacheInfo('No local cache found for this verse — use "Load from Database" instead.');
                    setTimeout(() => setLocalCacheInfo(''), 4000);
                  }
                }}
                className="px-4 py-2.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm whitespace-nowrap"
                title="Load instantly from browser cache (no network)"
              >
                ⚡ From Cache
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            💡 "From Cache" loads instantly from your browser — "Load from Database" always fetches the latest from the server.
          </p>

          {/* Results */}
          {crossReferences.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="font-semibold text-gray-700">
                  📌 {crossReferences.length} cross-reference{crossReferences.length !== 1 ? 's' : ''} for{' '}
                  <span className="text-blue-700">{books.find(b => b.id === parseInt(viewingBookId))?.name_english} {viewingChapter}:{viewingVerse}</span>
                </span>
                <span className="text-xs text-gray-400">Scroll to see all</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {crossReferences.map((ref) => (
                  <div key={ref.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {editingId === ref.id ? (
                      <div className="p-4 bg-blue-50 space-y-3">
                        <p className="text-sm font-semibold text-blue-800">✏️ Edit Cross-Reference</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Target Book</label>
                            <select value={editTargetBookId} onChange={(e) => setEditTargetBookId(e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400">
                              <option value="">Book</option>
                              {books.map(b => <option key={b.id} value={b.id}>{b.name_english}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Chapter</label>
                            <input type="number" min="1" value={editTargetChapter}
                              onChange={(e) => setEditTargetChapter(e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400"/>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Verse</label>
                            <input type="number" min="1" value={editTargetVerse}
                              onChange={(e) => setEditTargetVerse(e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400"/>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Relationship Type</label>
                          <select value={editRelationshipType} onChange={(e) => setEditRelationshipType(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400">
                            <option value="related">Related</option>
                            <option value="parallel">Parallel</option>
                            <option value="fulfillment">Fulfillment</option>
                            <option value="prophecy">Prophecy</option>
                            <option value="quote">Quote</option>
                            <option value="reference">Reference</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Notes</label>
                          <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                            rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400"
                            placeholder="Optional notes..."/>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateCrossReference(ref.id)} disabled={editSaving}
                            className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 font-semibold">
                            {editSaving ? 'Saving...' : '💾 Update'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex-1 bg-gray-200 text-gray-700 py-1.5 px-3 rounded text-sm hover:bg-gray-300">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a href={`/bible-reader/${ref.target_book_id}/${ref.target_chapter}#verse-${ref.target_verse}`}
                                target="_blank" rel="noopener noreferrer"
                                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-sm">
                                {ref.target_book_name} {ref.target_chapter}:{ref.target_verse} ↗
                              </a>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{ref.relationship_type}</span>
                            </div>
                            {ref.text_english && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ref.text_english}</p>}
                            {ref.notes && <p className="text-xs text-gray-400 mt-1 italic">📝 {ref.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleEditCrossReference(ref)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium border border-blue-200">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteCrossReference(ref.id)}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded font-medium border border-red-200">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {crossReferences.length === 0 && !loadingRefs && viewingBookId && viewingChapter && viewingVerse && (
            <div className="mt-4 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-400 text-sm">No cross-references saved for this verse yet.</p>
              <p className="text-gray-300 text-xs mt-1">Use the form below to add some.</p>
            </div>
          )}
        </div>

        {/* Add Cross-Reference Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">➕ Add New Cross-Reference</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              // If there are parsed references, save them; otherwise save single reference
              if (parsedReferences.length > 0 && parsedReferences.some(r => r.status === 'valid')) {
                handleSaveParsedReferences(e);
              } else {
                handleSaveCrossReference(e);
              }
            }} className="space-y-4">
              {/* Bulk Paste Section - Top */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Bulk Paste Cross-References
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  Paste multiple references (e.g., Romans 1:6; 1 Corinthians 1:2; John 17:11-12), select source verse below, then click Save
                </p>
                <textarea
                  value={bulkCrossRefs}
                  onChange={(e) => {
                    setBulkCrossRefs(e.target.value);
                  }}
                  rows={3}
                  placeholder="Romans 1:6; 1 Corinthians 1:2; John 17:11–12; 1 Peter 1:2; 1 Thessalonians 5:23"
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />

                {/* Parsed References List */}
                {parsedReferences.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto bg-white rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      📋 Parsed: {parsedReferences.filter(r => r.status === 'valid').length} valid, {parsedReferences.filter(r => r.status === 'invalid').length} invalid
                    </h4>
                    {parsedReferences.map((ref, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          ref.status === 'valid' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex-1">
                          <span className={`font-medium ${ref.status === 'valid' ? 'text-green-900' : 'text-red-900'}`}>
                            {ref.status === 'valid' ? '✅' : '❌'} {ref.bookName} {ref.chapter}:{ref.verse}
                          </span>
                          {ref.status === 'invalid' && ref.errorMessage && (
                            <p className="text-xs text-red-600 mt-1">{ref.errorMessage}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveParsedRef(index)}
                          className="text-gray-500 hover:text-red-600 ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center text-gray-400 text-sm">
                {parsedReferences.length > 0 ? '↓ Select Pray-Read Prayer Verse (Source) Below ↓' : 'OR'}
              </div>

              {/* Source Verse (Pray-Read Prayer Verse) */}
              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <span className={parsedReferences.length > 0 ? 'text-green-600' : ''}>
                    {parsedReferences.length > 0 ? '🎯 ' : ''}Source Verse (Pray-Read Prayer Verse)
                  </span>
                  {parsedReferences.length > 0 && parsedReferences.some(r => r.status === 'valid') && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {parsedReferences.filter(r => r.status === 'valid').length} cross-refs will be linked here
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                    <select
                      value={sourceBookId}
                      onChange={(e) => {
                        setSourceBookId(e.target.value);
                        setSourceText('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Book</option>
                      {books && books.length > 0 && books.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.name_english || book.name_luganda}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                    <input
                      type="number"
                      min="1"
                      value={sourceChapter}
                      onChange={(e) => {
                        setSourceChapter(e.target.value);
                        setSourceText('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verse</label>
                    <input
                      type="number"
                      min="1"
                      value={sourceVerse}
                      onChange={(e) => {
                        setSourceVerse(e.target.value);
                        setSourceText('');
                      }}
                      onBlur={() => fetchVerseText(sourceBookId, sourceChapter, sourceVerse, true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                {sourceText && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    {sourceText.substring(0, 150)}...
                  </div>
                )}
              </div>

              {/* Target Verse - Only show if no bulk references */}
              {parsedReferences.length === 0 && (
                <div className="border-b pb-4">
                  <h3 className="font-medium text-gray-700 mb-3">Target Verse (Related)</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                      <select
                        value={targetBookId}
                        onChange={(e) => {
                          setTargetBookId(e.target.value);
                          setTargetText('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={parsedReferences.length === 0}
                      >
                        <option value="">Select Book</option>
                        {books && books.length > 0 && books.map((book) => (
                          <option key={book.id} value={book.id}>
                            {book.name_english || book.name_luganda}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                      <input
                        type="number"
                        min="1"
                        value={targetChapter}
                        onChange={(e) => {
                          setTargetChapter(e.target.value);
                          setTargetText('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={parsedReferences.length === 0}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Verse</label>
                      <input
                        type="number"
                        min="1"
                        value={targetVerse}
                        onChange={(e) => {
                          setTargetVerse(e.target.value);
                          setTargetText('');
                        }}
                        onBlur={() => fetchVerseText(targetBookId, targetChapter, targetVerse, false)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={parsedReferences.length === 0}
                      />
                    </div>
                  </div>
                  {targetText && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                      {targetText.substring(0, 150)}...
                    </div>
                  )}
                </div>
              )}

              {/* Relationship Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="related">Related</option>
                  <option value="parallel">Parallel</option>
                  <option value="fulfillment">Fulfillment</option>
                  <option value="prophecy">Prophecy</option>
                  <option value="quote">Quote</option>
                  <option value="reference">Reference</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this cross-reference..."
                />
              </div>

              {/* Save button — bulk mode or single mode */}
              {parsedReferences.length > 0 && parsedReferences.some(r => r.status === 'valid') ? (
                <>
                  <button
                    type="submit"
                    disabled={bulkSaving || !sourceBookId || !sourceChapter || !sourceVerse}
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    {bulkSaving ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>💾 Save {parsedReferences.filter(r => r.status === 'valid').length} Cross-References</>
                    )}
                  </button>
                  <p className="text-xs text-center text-gray-500">
                    Saves all {parsedReferences.filter(r => r.status === 'valid').length} references linked to the selected source verse
                  </p>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={saving || !sourceBookId || !sourceChapter || !sourceVerse || !targetBookId || !targetChapter || !targetVerse}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>➕ Add Cross-Reference</>
                  )}
                </button>
              )}
            </form>
        </div>

        {/* Back to Admin Panel */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/admin-panel')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CrossReferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CrossReferencesContent />
    </Suspense>
  );
}
