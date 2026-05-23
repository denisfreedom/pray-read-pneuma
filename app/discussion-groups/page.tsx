'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, MessageCircle, Plus, Pencil, Trash2, X, Check, Settings } from 'lucide-react';
import AppNavbar from '@/app/components/AppNavbar';

interface DiscussionGroup {
  id: number;
  name: string;
  description: string;
  icon: string;
  member_count: number;
  post_count: number;
  created_at: string;
}

export default function DiscussionGroupsPage() {
  const [groups, setGroups] = useState<DiscussionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DiscussionGroup | null>(null);
  const [memberModal, setMemberModal] = useState<DiscussionGroup | null>(null);
  const [mockMemberCount, setMockMemberCount] = useState('');
  const [newGroup, setNewGroup] = useState({ name: '', description: '', icon: '💬' });

  useEffect(() => {
    fetchGroups();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.admin) setIsAdmin(true);
      }
    } catch {}
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/discussion-groups');
      const data = await res.json();
      setGroups(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/discussion-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newGroup, created_by: 'admin' })
    });
    if (res.ok) { setNewGroup({ name: '', description: '', icon: '💬' }); setShowCreateForm(false); fetchGroups(); }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    const res = await fetch(`/api/discussion-groups/${editingGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingGroup.name, description: editingGroup.description, icon: editingGroup.icon })
    });
    if (res.ok) { setEditingGroup(null); fetchGroups(); }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Delete this group and all its posts and replies? This cannot be undone.')) return;
    await fetch(`/api/discussion-groups/${groupId}`, { method: 'DELETE' });
    fetchGroups();
  };

  const handleSaveMemberCount = async () => {
    if (!memberModal) return;
    const count = parseInt(mockMemberCount);
    if (isNaN(count) || count < 0) return;
    await fetch(`/api/discussion-groups/${memberModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_count: count })
    });
    setMemberModal(null);
    setMockMemberCount('');
    fetchGroups();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0d0d15 0%,#0a0a18 100%)' }}>
      <AppNavbar />
      {/* Sub-header */}
      <div className="sticky top-[72px] z-40 border-b border-white/8 backdrop-blur-xl" style={{ background: 'rgba(10,10,20,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Discussion Groups</h1>
            <p className="text-white/40 text-xs">Join groups and connect with other believers</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Create Group
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-8">
        {/* Create Group Form */}
        {isAdmin && showCreateForm && (
          <div className="rounded-xl border border-white/10 p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <h2 className="text-white text-xl font-semibold mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Group Name</label>
                <input type="text" value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Description</label>
                <textarea value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400/50" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Icon (emoji)</label>
                <input type="text" value={newGroup.icon} onChange={(e) => setNewGroup({ ...newGroup, icon: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400/50" maxLength={4} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="px-6 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors font-semibold">Create Group</button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-6 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Group Modal */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="rounded-2xl border border-white/15 p-6 w-full max-w-md" style={{ background: '#0f0f1a' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-xl font-semibold">Edit Group</h2>
                <button onClick={() => setEditingGroup(null)}><X className="w-5 h-5 text-white/40" /></button>
              </div>
              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Group Name</label>
                  <input type="text" value={editingGroup.name} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400/50" required />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <textarea value={editingGroup.description} onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400/50" rows={3} />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Icon (emoji)</label>
                  <input type="text" value={editingGroup.icon} onChange={(e) => setEditingGroup({ ...editingGroup, icon: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400/50" maxLength={4} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 font-semibold">
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                  <button type="button" onClick={() => setEditingGroup(null)} className="px-6 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Member Count Modal */}
        {memberModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="rounded-2xl border border-white/15 p-6 w-full max-w-sm" style={{ background: '#0f0f1a' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white text-xl font-semibold">Set Member Count</h2>
                  <p className="text-sm text-white/40 mt-1">{memberModal.icon} {memberModal.name}</p>
                </div>
                <button onClick={() => setMemberModal(null)}><X className="w-5 h-5 text-white/40" /></button>
              </div>
              <p className="text-sm text-white/50 mb-4">Set a display member count for this group card.</p>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-white/30" />
                <span className="text-sm text-white/40">Current: <strong className="text-white/70">{memberModal.member_count}</strong></span>
              </div>
              <input
                type="number" min="0" placeholder="Enter new member count"
                value={mockMemberCount} onChange={(e) => setMockMemberCount(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400/50 mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveMemberCount()}
              />
              <div className="flex gap-3">
                <button onClick={handleSaveMemberCount} className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 flex-1 justify-center font-semibold">
                  <Check className="w-4 h-4" /> Save Count
                </button>
                <button onClick={() => setMemberModal(null)} className="px-5 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div key={group.id} className="relative rounded-2xl border border-white/10 hover:border-amber-400/30 transition-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {isAdmin && (
                <div className="absolute top-3 right-3 flex gap-1 z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); setMemberModal(group); setMockMemberCount(String(group.member_count)); }}
                    className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    title="Set member count"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setEditingGroup(group); }}
                    className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    title="Edit group"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDeleteGroup(group.id); }}
                    className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <Link href={`/discussion-groups/${group.id}`} className="block p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-white/5">
                    {group.icon}
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <h3 className="font-semibold text-base text-white mb-1.5">{group.name}</h3>
                    <p className="text-white/50 text-sm line-clamp-2">{group.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/8 text-sm text-white/40">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{group.member_count.toLocaleString()} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{group.post_count} posts</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="text-center py-20">
            <MessageCircle className="w-16 h-16 mx-auto text-white/10 mb-4" />
            <h3 className="text-xl font-semibold text-white/50 mb-2">No groups yet</h3>
            <p className="text-white/30">Create the first discussion group!</p>
          </div>
        )}
      </div>
    </div>
  );
}
