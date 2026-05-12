'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  replied_at: string;
}

export default function AdminMessages() {
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  async function fetchMessages() {
    try {
      const response = await fetch(`/api/admin/contact-messages?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateMessageStatus(messageId: number, status: string) {
    try {
      const response = await fetch('/api/admin/contact-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, status })
      });

      if (response.ok) {
        fetchMessages();
        if (selectedMessage?.id === messageId) {
          setSelectedMessage({ ...selectedMessage, status });
        }
      }
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
            <p className="text-gray-600 mt-1">Manage support and contact requests</p>
          </div>
          <button
            onClick={() => router.push('/admin-panel')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Back to Admin Panel
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          {['all', 'unread', 'read', 'replied'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Messages ({messages.length})
            </h2>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No messages found</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedMessage?.id === msg.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${msg.status === 'unread' ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900">{msg.name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          msg.status === 'unread'
                            ? 'bg-orange-100 text-orange-700'
                            : msg.status === 'replied'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{msg.email}</p>
                    {msg.subject && (
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {msg.subject}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(msg.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {selectedMessage ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Message Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">From</label>
                    <p className="font-medium text-gray-900">{selectedMessage.name}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedMessage.email}</p>
                  </div>

                  {selectedMessage.subject && (
                    <div>
                      <label className="text-sm text-gray-500">Subject</label>
                      <p className="font-medium text-gray-900">{selectedMessage.subject}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-500">Message</label>
                    <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Received</label>
                    <p className="text-gray-900">{formatDate(selectedMessage.created_at)}</p>
                  </div>

                  {selectedMessage.replied_at && (
                    <div>
                      <label className="text-sm text-gray-500">Replied</label>
                      <p className="text-gray-900">{formatDate(selectedMessage.replied_at)}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-3">
                    <p className="text-sm text-gray-500 mb-2">Update Status:</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateMessageStatus(selectedMessage.id, 'read')}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Mark as Read
                      </button>
                      <button
                        onClick={() => updateMessageStatus(selectedMessage.id, 'replied')}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Mark as Replied
                      </button>
                    </div>
                    <button
                      onClick={() => updateMessageStatus(selectedMessage.id, 'unread')}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                      Mark as Unread
                    </button>
                  </div>

                  <div className="pt-4 border-t">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || 'Your Message'}`}
                      className="block w-full px-4 py-2 bg-indigo-600 text-white text-center rounded-lg hover:bg-indigo-700 transition"
                    >
                      Reply via Email
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p>Select a message to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
