'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Pencil, Trash2, X, Check, MessageSquarePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: number;
  group_id: number;
  title: string;
  content: string;
  user_name: string;
  created_at: string;
  replies?: Reply[];
}

interface Reply {
  id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingReply, setEditingReply] = useState<Reply | null>(null);
  const [editingPost, setEditingPost] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [showMockMsgModal, setShowMockMsgModal] = useState(false);
  const [mockMsg, setMockMsg] = useState({ user_name: '', content: '', created_at: '' });

  useEffect(() => {
    fetchPost();
    checkSession();
  }, [postId]);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.isAdmin) setIsAdmin(true);
        if (data.user) setCurrentUser({ name: data.user.name || 'Anonymous', email: data.user.email });
      }
    } catch {}
  };

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/forum-posts/${postId}`);
      const data = await res.json();
      setPost(data);
      setEditedTitle(data.title);
      setEditedContent(data.content);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    const name = currentUser?.name || guestName.trim();
    const email = currentUser?.email || `${(guestName.trim() || 'guest').toLowerCase().replace(/\s+/g, '.')}@guest.com`;
    if (!name) { setSubmitError('Please enter your name to post a reply.'); return; }
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum-posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: email, user_name: name, content: replyContent })
      });
      if (res.ok) {
        setReplyContent('');
        setGuestName('');
        fetchPost();
      } else {
        const err = await res.json();
        setSubmitError(err.error || 'Failed to post reply. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/forum-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editedTitle, content: editedContent })
      });
      if (res.ok) {
        setEditingPost(false);
        fetchPost();
      }
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleUpdateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReply) return;
    try {
      const res = await fetch(`/api/forum-posts/${postId}/replies/${editingReply.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingReply.content })
      });
      if (res.ok) {
        setEditingReply(null);
        fetchPost();
      }
    } catch (error) {
      console.error('Error updating reply:', error);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this post and all its replies?')) return;
    try {
      await fetch(`/api/forum-posts/${postId}`, { method: 'DELETE' });
      window.location.href = `/discussion-groups/${id}`;
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleAddMockMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockMsg.user_name.trim() || !mockMsg.content.trim()) return;
    const body: Record<string, string> = {
      user_email: `${mockMsg.user_name.toLowerCase().replace(/\s+/g, '.')}@mock.com`,
      user_name: mockMsg.user_name,
      content: mockMsg.content,
    };
    if (mockMsg.created_at) body.created_at = new Date(mockMsg.created_at).toISOString();
    await fetch(`/api/forum-posts/${postId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    setMockMsg({ user_name: '', content: '', created_at: '' });
    setShowMockMsgModal(false);
    fetchPost();
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!confirm('Delete this reply?')) return;
    try {
      await fetch(`/api/forum-posts/${postId}/replies/${replyId}`, { method: 'DELETE' });
      fetchPost();
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Post not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mock Message Modal */}
      {showMockMsgModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-semibold">Add Mock Chat Message</h2>
              <button onClick={() => setShowMockMsgModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">This message will appear in the thread as if posted by a real user, with the name and timestamp you set.</p>
            <form onSubmit={handleAddMockMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sister Grace, Brother Paul"
                  value={mockMsg.user_name}
                  onChange={(e) => setMockMsg({ ...mockMsg, user_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
                <textarea
                  placeholder="Type the mock message here..."
                  value={mockMsg.content}
                  onChange={(e) => setMockMsg({ ...mockMsg, content: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp (optional)</label>
                <input
                  type="datetime-local"
                  value={mockMsg.created_at}
                  onChange={(e) => setMockMsg({ ...mockMsg, created_at: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use current time</p>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1 justify-center">
                  <MessageSquarePlus className="w-4 h-4" /> Add Message
                </button>
                <button type="button" onClick={() => setShowMockMsgModal(false)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reply Modal */}
      {editingReply && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Reply</h2>
              <button onClick={() => setEditingReply(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleUpdateReply} className="space-y-4">
              <textarea
                value={editingReply.content}
                onChange={(e) => setEditingReply({ ...editingReply, content: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                required
              />
              <div className="flex gap-3">
                <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Check className="w-4 h-4" /> Save
                </button>
                <button type="button" onClick={() => setEditingReply(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/discussion-groups/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Group
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Original Post */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {editingPost ? (
            <form onSubmit={handleUpdatePost} className="space-y-4">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-2xl font-bold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={6}
                required
              />
              <div className="flex gap-3">
                <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Check className="w-4 h-4" /> Save
                </button>
                <button type="button" onClick={() => setEditingPost(false)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold text-gray-900 mb-4 flex-1">{post.title}</h1>
                {isAdmin && (
                  <div className="flex gap-1 ml-4">
                    <button onClick={() => setEditingPost(true)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title="Edit post">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={handleDeletePost} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Delete post">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{post.user_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
            </>
          )}
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Replies ({post.replies?.length || 0})</h2>
            {isAdmin && (
              <button
                onClick={() => setShowMockMsgModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Add Mock Message
              </button>
            )}
          </div>
          {post.replies && post.replies.length > 0 ? (
            post.replies.map((reply) => (
              <div key={reply.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{reply.user_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditingReply(reply)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title="Edit reply">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteReply(reply.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Delete reply">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-white rounded-lg border">
              <p className="text-gray-500">No replies yet. Be the first to reply!</p>
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Post a Reply</h3>
          <form onSubmit={handleSubmitReply} className="space-y-3">
            {currentUser ? (
              <p className="text-sm text-gray-500">Posting as <span className="font-medium text-gray-700">{currentUser.name}</span></p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              required
            />
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
