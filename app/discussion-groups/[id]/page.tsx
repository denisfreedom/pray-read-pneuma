'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Clock, User, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Group {
  id: number;
  name: string;
  description: string;
  icon: string;
  member_count: number;
  post_count: number;
}

interface Post {
  id: number;
  title: string;
  content: string;
  user_name: string;
  reply_count: number;
  created_at: string;
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [newPost, setNewPost] = useState({ title: '', content: '', user_name: '' });
  const [postError, setPostError] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);

  useEffect(() => {
    fetchGroupData();
    checkSession();
  }, [id]);

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

  const fetchGroupData = async () => {
    try {
      const [groupRes, postsRes] = await Promise.all([
        fetch(`/api/discussion-groups/${id}`),
        fetch(`/api/forum-posts?group_id=${id}`)
      ]);
      setGroup(await groupRes.json());
      setPosts(await postsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = currentUser?.name || newPost.user_name.trim();
    const email = currentUser?.email || `${(newPost.user_name.trim() || 'guest').toLowerCase().replace(/\s+/g, '.')}@guest.com`;
    if (!name) { setPostError('Please enter your name.'); return; }
    setPostError('');
    setPostSubmitting(true);
    try {
      const res = await fetch('/api/forum-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: id, user_email: email, user_name: name, title: newPost.title, content: newPost.content })
      });
      if (res.ok) {
        setNewPost({ title: '', content: '', user_name: '' });
        setShowCreateForm(false);
        fetchGroupData();
      } else {
        const err = await res.json();
        setPostError(err.error || 'Failed to create post.');
      }
    } catch {
      setPostError('Network error. Please try again.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    try {
      const res = await fetch(`/api/forum-posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingPost.title, content: editingPost.content })
      });
      if (res.ok) {
        setEditingPost(null);
        fetchGroupData();
      }
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Delete this post and all its replies?')) return;
    try {
      await fetch(`/api/forum-posts/${postId}`, { method: 'DELETE' });
      fetchGroupData();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Group not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Post</h2>
              <button onClick={() => setEditingPost(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleUpdatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Check className="w-4 h-4" /> Save
                </button>
                <button type="button" onClick={() => setEditingPost(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
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
          <Link href="/discussion-groups" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </Link>
          <div className="flex items-start gap-4">
            <div className="text-5xl flex-shrink-0 w-16 h-16 flex items-center justify-center">
              {group.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              <p className="text-gray-600 mt-1">{group.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{group.member_count.toLocaleString()} members</span>
                <span>{group.post_count} posts</span>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Create Post Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Start a New Discussion</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              {currentUser ? (
                <p className="text-sm text-gray-500">Posting as <span className="font-medium text-gray-700">{currentUser.name}</span></p>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newPost.user_name}
                    onChange={(e) => setNewPost({ ...newPost, user_name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  required
                />
              </div>
              {postError && <p className="text-sm text-red-600">{postError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={postSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {postSubmitting ? 'Posting...' : 'Post'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-all hover:border-blue-300">
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-1 z-10">
                  <button
                    onClick={() => setEditingPost(post)}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                    title="Edit post"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    title="Delete post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <Link href={`/discussion-groups/${id}/posts/${post.id}`} className="block p-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-2 pr-20">{post.title}</h3>
                <p className="text-gray-600 line-clamp-2 mb-4">{post.content}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{post.user_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.reply_count} replies</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-gray-400 mb-4">
              <MessageCircle className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No posts yet</h3>
            <p className="text-gray-500">Be the first to start a discussion!</p>
          </div>
        )}
      </div>
    </div>
  );
}
