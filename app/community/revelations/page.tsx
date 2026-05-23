'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, BookOpen, Plus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AppNavbar from '@/app/components/AppNavbar';

const goldGradient: React.CSSProperties = {
  backgroundImage: 'linear-gradient(135deg, #f5d790, #e8a428)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

interface Revelation {
  id: number;
  user_email: string;
  user_name: string;
  title: string;
  content: string;
  scripture_ref: string | null;
  likes_count: number;
  created_at: string;
}

export default function RevelationsPage() {
  const [revelations, setRevelations] = useState<Revelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({ user_name: '', title: '', content: '', scripture_ref: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/community-revelations')
      .then(r => r.json())
      .then(data => { setRevelations(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLike = async (id: number) => {
    if (likedIds.has(id)) return;
    setLikedIds(prev => new Set(prev).add(id));
    const res = await fetch('/api/community-revelations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setRevelations(prev => prev.map(r => r.id === id ? { ...r, likes_count: data.likes_count } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/community-revelations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_email: `${form.user_name.toLowerCase().replace(/\s/g, '.')}@community.app` }),
      });
      if (res.ok) {
        const newRev = await res.json();
        setRevelations(prev => [newRev, ...prev]);
        setForm({ user_name: '', title: '', content: '', scripture_ref: '' });
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0d0d0d] text-white min-h-screen font-sans antialiased">
      <AppNavbar />
      {/* Sub-header for context */}
      <div className="sticky top-[72px] z-40 border-b border-white/8 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 py-3" style={{ background: 'rgba(10,10,10,0.85)' }}>
        <div className="flex items-center gap-3">
          <Link href="/community" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-white font-semibold text-sm">Share Revelations</span>
          <span className="text-white/30 text-xs hidden sm:inline">· Insights from the Word</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Share Insight
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Intro */}
        <div className="text-center mb-10 space-y-3">
          <p className="text-amber-400 text-sm uppercase tracking-widest font-medium">Community Insights</p>
          <h1 className="font-serif text-4xl font-bold text-white">
            Revelations from the <span style={goldGradient}>Living Word</span>
          </h1>
          <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
            Post insights and revelations received during your time in the Word. Learn from others' fresh enlightenment and grow together in Christ.
          </p>
        </div>

        {/* Share Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-lg rounded-2xl border border-white/10 p-8 relative" style={{ background: '#141414' }}>
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-serif text-2xl font-bold text-white mb-6">Share a Revelation</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">Your Name</label>
                  <input
                    required
                    value={form.user_name}
                    onChange={e => setForm(p => ({ ...p, user_name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                    placeholder="e.g. John O."
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-2">Scripture Reference (optional)</label>
                  <input
                    value={form.scripture_ref}
                    onChange={e => setForm(p => ({ ...p, scripture_ref: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                    placeholder="e.g. John 15:5"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-2">Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                    placeholder="What did you receive from the Lord?"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-2">Your Insight</label>
                  <textarea
                    required
                    rows={5}
                    value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 resize-none"
                    placeholder="Share what the Lord revealed to you through His Word..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {submitting ? 'Sharing...' : 'Share Revelation'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="text-center text-white/40 py-20">Loading revelations...</div>
        ) : (
          <div className="space-y-6">
            {revelations.map(rev => (
              <div
                key={rev.id}
                className="p-7 rounded-2xl border border-white/5 hover:border-amber-400/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm">
                      {rev.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{rev.user_name}</div>
                      <div className="text-white/40 text-xs">{formatDistanceToNow(new Date(rev.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                  {rev.scripture_ref && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-400/30 text-amber-300 bg-amber-400/10">
                      <BookOpen className="w-3 h-3" />
                      {rev.scripture_ref}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-bold text-lg mb-3">{rev.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm mb-5">{rev.content}</p>
                <button
                  onClick={() => handleLike(rev.id)}
                  className={`flex items-center gap-2 text-sm transition-all ${likedIds.has(rev.id) ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}
                >
                  <Heart className={`w-4 h-4 ${likedIds.has(rev.id) ? 'fill-red-400' : ''}`} />
                  <span>{rev.likes_count} {rev.likes_count === 1 ? 'blessing' : 'blessings'}</span>
                </button>
              </div>
            ))}
            {revelations.length === 0 && (
              <div className="text-center py-20 text-white/30">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No revelations yet. Be the first to share!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
