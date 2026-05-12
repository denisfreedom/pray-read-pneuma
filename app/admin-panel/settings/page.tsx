'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Users, Globe, MessageSquare, TrendingUp, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';
import AdminNavbar from '@/app/components/AdminNavbar';

interface DashboardStats {
  totalUsers: number;
  todaySignups: number;
  weekSignups: number;
  activeUsers: number;
  locationStats: Array<{ country: string; city: string; count: number }>;
  unreadMessages: number;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  replied_at?: string;
}

export default function AdminSettings() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageFilter, setMessageFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  // Live stream config
  const [streamConfig, setStreamConfig] = useState({ is_live: false, stream_title: '', stream_description: '' });
  const [streamSaving, setStreamSaving] = useState(false);
  const [streamMsg, setStreamMsg] = useState('');

  useEffect(() => {
    fetch('/api/live-stream-config').then(r => r.json()).then(setStreamConfig).catch(() => {});
  }, []);

  async function saveStreamConfig() {
    setStreamSaving(true);
    try {
      await fetch('/api/live-stream-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamConfig),
      });
      setStreamMsg('✅ Saved!');
    } catch { setStreamMsg('❌ Failed to save'); }
    setStreamSaving(false);
    setTimeout(() => setStreamMsg(''), 3000);
  }

  // Security/Password states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);



  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);

    return () => clearInterval(interval);
  }, []);

  async function fetchAllData() {
    try {
      const [statsRes, messagesRes, sessionRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats'),
        fetch('/api/admin/contact-messages?status=all'),
        fetch('/api/auth/session')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages || []);
      }

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.admin) setAdminEmail(sessionData.admin.email);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateMessageStatus(messageId: number, newStatus: string) {
    setUpdatingStatus(messageId);
    try {
      const response = await fetch('/api/admin/contact-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, status: newStatus })
      });

      if (response.ok) {
        setMessages(messages.map(msg =>
          msg.id === messageId ? { ...msg, status: newStatus, replied_at: new Date().toISOString() } : msg
        ));
      }
    } catch (error) {
      console.error('Failed to update message:', error);
    } finally {
      setUpdatingStatus(null);
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0] + ' ' + date.toISOString().split('T')[1].substring(0, 5);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'unread':
        return 'bg-red-100 text-red-700';
      case 'read':
        return 'bg-yellow-100 text-yellow-700';
      case 'replied':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  const filteredMessages = messageFilter === 'all' 
    ? messages 
    : messages.filter(msg => msg.status === messageFilter);

  async function handlePasswordUpdate() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('❌ Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('❌ Passwords do not match');
      return;
    }
    setUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, currentPassword, newPassword })
      });
      const data = await res.json();
      setPasswordMessage(data.message || 'Password updated!');
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setPasswordMessage('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setUpdatingPassword(false);
    setTimeout(() => setPasswordMessage(''), 3000);
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⚙️ Settings & Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage metrics, user data, and support messages</p>
          </div>
          <Link
            href="/admin-panel"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <ArrowLeft size={20} />
            Back to Editor
          </Link>
        </div>

        {/* 🔴 Live Streaming Control */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-red-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">🔴 Live Streaming Control</h2>
          <p className="text-sm text-gray-500 mb-6">Toggle the live stream on/off and update the title shown to viewers.</p>

          <div className="flex items-center gap-4 mb-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={streamConfig.is_live}
                onChange={e => setStreamConfig({ ...streamConfig, is_live: e.target.checked })}
              />
              <div className="w-12 h-6 bg-gray-300 peer-checked:bg-red-500 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
            <span className={`font-bold text-sm ${streamConfig.is_live ? 'text-red-600' : 'text-gray-400'}`}>
              {streamConfig.is_live ? '🔴 Stream is LIVE' : '⚪ Stream is OFFLINE'}
            </span>
          </div>

          <div className="space-y-3 mb-5">
            <input
              type="text"
              value={streamConfig.stream_title}
              onChange={e => setStreamConfig({ ...streamConfig, stream_title: e.target.value })}
              placeholder="Stream title"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm"
            />
            <textarea
              value={streamConfig.stream_description}
              onChange={e => setStreamConfig({ ...streamConfig, stream_description: e.target.value })}
              placeholder="Stream description (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm resize-none"
            />
          </div>

          <button
            onClick={saveStreamConfig}
            disabled={streamSaving}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold text-sm transition"
          >
            {streamSaving ? 'Saving...' : 'Save Stream Settings'}
          </button>
          {streamMsg && <span className="ml-4 text-sm font-medium text-green-600">{streamMsg}</span>}
        </div>

        {/* Security Settings Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🔐 Security Settings</h2>
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              {showPasswordSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showPasswordSection && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Admin Email: <span className="font-semibold">{adminEmail}</span></p>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3 py-2 border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handlePasswordUpdate}
                disabled={updatingPassword}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold transition"
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
              {passwordMessage && (
                <p className={`mt-3 text-sm text-center font-medium ${passwordMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Message Count Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Messages Sent</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{messages.length}</p>
                <p className="text-xs text-gray-500 mt-2">{messages.filter(m => m.status === 'unread').length} unread</p>
              </div>
              <MessageSquare size={40} className="text-blue-400 opacity-50" />
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats?.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-2">{stats?.todaySignups || 0} new today</p>
              </div>
              <Users size={40} className="text-green-400 opacity-50" />
            </div>
          </div>

          {/* Active Users Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Users</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats?.activeUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-2">last 24 hours</p>
              </div>
              <Globe size={40} className="text-purple-400 opacity-50" />
            </div>
          </div>

          {/* Weekly Signups Card */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Weekly Signups</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats?.weekSignups || 0}</p>
                <p className="text-xs text-gray-500 mt-2">last 7 days</p>
              </div>
              <Users size={40} className="text-orange-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Registered Users Table */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Registered Users ({stats?.totalUsers || 0})
          </h3>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Country</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Registered</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {messages && messages.length > 0 ? (
                  messages.slice(0, 10).map((msg: any) => (
                    <tr key={msg.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-600">{msg.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{msg.email}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">N/A</td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-3 text-center text-gray-500">
                      No registered users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Locations Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-orange-500" />
            User Locations (Live & Historical)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Country</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">City</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-semibold">Users</th>
                </tr>
              </thead>
              <tbody>
                {stats?.locationStats && stats.locationStats.length > 0 ? (
                  stats.locationStats.map((loc, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50 transition">
                      <td className="py-4 px-4 font-medium text-gray-900">{loc.country || 'Unknown'}</td>
                      <td className="py-4 px-4 text-gray-600">{loc.city || 'Unknown'}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                          {loc.count}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      No location data available yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Messages Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-500" />
              Support Messages
            </h2>
            <div className="flex gap-2">
              {['all', 'unread', 'read', 'replied'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setMessageFilter(filter)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    messageFilter === filter
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">From</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Subject</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Message</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Status</th>
                  <th className="text-center py-3 px-4 text-gray-600 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.length > 0 ? (
                  filteredMessages.map((msg) => (
                    <tr key={msg.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{msg.name}</p>
                          <p className="text-xs text-gray-500">{msg.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-900 max-w-xs truncate">
                        {msg.subject}
                      </td>
                      <td className="py-4 px-4 text-gray-600 max-w-xs truncate">
                        {msg.message}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {formatDate(msg.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(msg.status)}`}>
                          {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={msg.status}
                          onChange={(e) => updateMessageStatus(msg.id, e.target.value)}
                          disabled={updatingStatus === msg.id}
                          className="text-sm border rounded px-2 py-1 cursor-pointer hover:bg-gray-50 disabled:opacity-50"
                        >
                          <option value="unread">Unread</option>
                          <option value="read">Read</option>
                          <option value="replied">Replied</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No messages found
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
