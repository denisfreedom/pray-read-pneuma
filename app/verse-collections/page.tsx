'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookMarked, Bookmark, Heart, Plus, Trash2, X, ExternalLink, BookOpen, Search } from 'lucide-react';
import AppNavbar from '@/app/components/AppNavbar';

const BG = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/dashboard-bg_png.jpeg';

interface Bookmark {
  id: number;
  book_id: number;
  chapter: number;
  verse_number: number;
  created_at: string;
  text_english: string;
  text_luganda: string;
  name_english: string;
  name_luganda: string;
}

interface Collection {
  id: number;
  name: string;
  description: string;
  verse_count: number;
  created_at: string;
}

interface CollectionVerse {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  added_at: string;
}

type Tab = 'bookmarks' | 'collections';

export default function VerseCollectionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('bookmarks');

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [bmSearch, setBmSearch] = useState('');

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionVerses, setCollectionVerses] = useState<CollectionVerse[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  // Session check
  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.success || !data.isUser) { router.push('/user-login'); return; }
        setUser(data.user);
      })
      .catch(() => router.push('/user-login'))
      .finally(() => setLoading(false));
  }, [router]);

  const fetchBookmarks = useCallback(async (email: string) => {
    setBookmarksLoading(true);
    try {
      const res = await fetch(`/api/verse-bookmarks?userEmail=${encodeURIComponent(email)}`, { cache: 'no-store' });
      const data = await res.json();
      setBookmarks(data.bookmarks || []);
    } catch (e) { console.error(e); }
    finally { setBookmarksLoading(false); }
  }, []);

  const fetchCollections = useCallback(async (email: string) => {
    setCollectionsLoading(true);
    try {
      const res = await fetch(`/api/verse-collections?userEmail=${encodeURIComponent(email)}`, { cache: 'no-store' });
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (e) { console.error(e); }
    finally { setCollectionsLoading(false); }
  }, []);

  const fetchCollectionVerses = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/verse-collections/${id}/verses`, { cache: 'no-store' });
      const data = await res.json();
      setCollectionVerses(data.verses || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchBookmarks(user.email);
      fetchCollections(user.email);
    }
  }, [user, fetchBookmarks, fetchCollections]);

  useEffect(() => {
    if (selectedCollection) fetchCollectionVerses(selectedCollection.id);
  }, [selectedCollection, fetchCollectionVerses]);

  const deleteBookmark = async (bm: Bookmark) => {
    if (!confirm('Remove this bookmark?')) return;
    await fetch(
      `/api/verse-bookmarks?userEmail=${encodeURIComponent(user.email)}&bookId=${bm.book_id}&chapter=${bm.chapter}&verseNumber=${bm.verse_number}`,
      { method: 'DELETE' }
    );
    setBookmarks(prev => prev.filter(b => b.id !== bm.id));
  };

  const createCollection = async () => {
    if (!newName.trim()) return;
    await fetch('/api/verse-collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, userEmail: user.email }),
    });
    setNewName(''); setNewDesc(''); setShowCreateModal(false);
    fetchCollections(user.email);
  };

  const deleteCollection = async (id: number) => {
    if (!confirm('Delete this collection and all its verses?')) return;
    await fetch(`/api/verse-collections?id=${id}`, { method: 'DELETE' });
    if (selectedCollection?.id === id) { setSelectedCollection(null); setCollectionVerses([]); }
    fetchCollections(user.email);
  };

  const removeFromCollection = async (verseId: number) => {
    if (!selectedCollection) return;
    await fetch(`/api/verse-collections/${selectedCollection.id}/verses?verseId=${verseId}`, { method: 'DELETE' });
    setCollectionVerses(prev => prev.filter(v => v.id !== verseId));
    fetchCollections(user.email);
  };

  const filteredBookmarks = bookmarks.filter(b => {
    const q = bmSearch.toLowerCase();
    return !q || b.name_english?.toLowerCase().includes(q) || b.text_english?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img src={BG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(10,6,40,0.82) 0%,rgba(15,8,50,0.85) 60%,rgba(10,6,35,0.90) 100%)' }} />
      </div>

      <AppNavbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 rounded-2xl p-1.5 border border-white/10 w-fit">
          <button
            onClick={() => setTab('bookmarks')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'bookmarks' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
          >
            <Bookmark className="w-4 h-4" />
            Bookmarks
            {bookmarks.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${tab === 'bookmarks' ? 'bg-white/20' : 'bg-white/10'}`}>{bookmarks.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('collections')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'collections' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
          >
            <BookMarked className="w-4 h-4" />
            Collections
            {collections.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${tab === 'collections' ? 'bg-white/20' : 'bg-white/10'}`}>{collections.length}</span>
            )}
          </button>
        </div>

        {/* ─── BOOKMARKS TAB ─── */}
        {tab === 'bookmarks' && (
          <div>
            {/* Search */}
            <div className="relative mb-5 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={bmSearch}
                onChange={e => setBmSearch(e.target.value)}
                placeholder="Search bookmarks..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400/50"
              />
            </div>

            {bookmarksLoading ? (
              <div className="text-center py-20 text-white/40">Loading bookmarks...</div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="text-center py-20">
                <Bookmark className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <p className="text-white/50 text-lg font-medium">No bookmarks yet</p>
                <p className="text-white/30 text-sm mt-2">Tap the bookmark icon on any verse while reading to save it here.</p>
                <Link href="/bible-reader" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold hover:opacity-90 transition-all">
                  <BookOpen className="w-4 h-4" /> Start Reading
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredBookmarks.map(b => (
                  <div key={b.id} className="group rounded-2xl border border-white/10 backdrop-blur-md p-4 hover:border-pink-400/30 transition-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Link
                        href={`/bible-reader/${b.book_id}/${b.chapter}`}
                        className="flex items-center gap-1.5 text-pink-400 hover:text-pink-300 font-bold text-sm transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        {b.name_english} {b.chapter}:{b.verse_number}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <button
                        onClick={() => deleteBookmark(b)}
                        className="p-1.5 rounded-lg bg-red-500/0 hover:bg-red-500/20 text-red-400/0 group-hover:text-red-400/60 hover:!text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {b.text_english && (
                      <p className="text-white/80 text-sm leading-relaxed line-clamp-3 italic">"{b.text_english}"</p>
                    )}
                    <p className="text-white/25 text-xs mt-2">{new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── COLLECTIONS TAB ─── */}
        {tab === 'collections' && (
          <div className="grid md:grid-cols-3 gap-5">
            {/* Left: collections list */}
            <div className="md:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-bold text-base">My Collections</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold border border-amber-500/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              {collectionsLoading ? (
                <div className="text-white/30 text-sm py-6 text-center">Loading...</div>
              ) : collections.length === 0 ? (
                <div className="rounded-2xl border border-white/10 p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <BookMarked className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No collections yet.</p>
                  <button onClick={() => setShowCreateModal(true)} className="mt-3 text-amber-400 text-xs hover:underline">Create your first one →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCollection(c)}
                      className={`group flex items-start justify-between gap-2 p-3.5 rounded-xl border cursor-pointer transition-all ${selectedCollection?.id === c.id ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/10 hover:border-white/20 bg-white/4'}`}
                      style={selectedCollection?.id === c.id ? {} : { background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{c.name}</p>
                        {c.description && <p className="text-white/40 text-xs truncate mt-0.5">{c.description}</p>}
                        <p className="text-amber-400/60 text-xs mt-1">{c.verse_count} {Number(c.verse_count) === 1 ? 'verse' : 'verses'}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteCollection(c.id); }}
                        className="p-1 rounded text-red-400/0 group-hover:text-red-400/50 hover:!text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: collection contents */}
            <div className="md:col-span-2">
              {!selectedCollection ? (
                <div className="rounded-2xl border border-white/10 h-64 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-center">
                    <BookMarked className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">Select a collection to view its verses</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div>
                      <h3 className="text-white font-bold">{selectedCollection.name}</h3>
                      {selectedCollection.description && <p className="text-white/40 text-xs mt-0.5">{selectedCollection.description}</p>}
                    </div>
                    <span className="text-amber-400 text-xs font-medium">{collectionVerses.length} verses</span>
                  </div>
                  {collectionVerses.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-white/30 text-sm">No verses in this collection yet.</p>
                      <p className="text-white/20 text-xs mt-2">Add verses from the Bible reader using the collections button on each verse.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5 max-h-[560px] overflow-y-auto">
                      {collectionVerses.map(v => (
                        <div key={v.id} className="group flex items-start gap-3 px-5 py-4 hover:bg-white/5 transition-colors">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/bible-reader`}
                              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold text-sm mb-1.5 transition-colors"
                            >
                              <BookMarked className="w-3.5 h-3.5" />
                              {v.book} {v.chapter}:{v.verse}
                              <ExternalLink className="w-3 h-3 opacity-50" />
                            </Link>
                            {v.text && <p className="text-white/70 text-sm leading-relaxed italic">"{v.text}"</p>}
                          </div>
                          <button
                            onClick={() => removeFromCollection(v.id)}
                            className="p-1.5 rounded-lg text-red-400/0 group-hover:text-red-400/50 hover:!text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border border-white/20 w-full max-w-md p-6" style={{ background: 'rgba(20,15,55,0.97)' }}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold text-lg">New Collection</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-xs font-medium block mb-1.5">Collection Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-amber-400/50"
                  placeholder="e.g. Verses of Hope"
                  onKeyDown={e => e.key === 'Enter' && createCollection()}
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium block mb-1.5">Description (optional)</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-amber-400/50 resize-none"
                  placeholder="What is this collection about?"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white text-sm transition-all">Cancel</button>
                <button onClick={createCollection} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-all">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
