'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Plus, X, Clock, Calendar, Image as ImageIcon, Book, ChevronDown, ChevronUp } from 'lucide-react';

interface Book {
  id: number;
  name_english: string;
  name_luganda: string;
}

interface DevotionalPlan {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  devotional_text: string;
  schedule_type: string;
  schedule_time: string;
  is_active: boolean;
  created_at: string;
}

export default function DevotionalPlansManagement() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<DevotionalPlan[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [devotionalText, setDevotionalText] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('06:00');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Expanded cards state
  const [expandedCards, setExpandedCards] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchPlans();
      fetchBooks();
    }
  }, [mounted]);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/devotional-plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching devotional plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/bible-books?full=true');
      if (res.ok) {
        const data = await res.json();
        setBooks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    setDevotionalText('');
    setScheduleType('daily');
    setScheduleTime('06:00');
    setIsActive(true);
    setShowForm(false);
  };



  const handleSave = async () => {
    if (!title.trim()) {
      setMessage('❌ Title is required');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId,
        title,
        description,
        thumbnail_url: thumbnailUrl,
        devotional_text: devotionalText,
        schedule_type: scheduleType,
        schedule_time: scheduleTime,
        is_active: isActive
      };

      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/devotional-plans', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage(editingId ? '✅ Plan updated successfully!' : '✅ Plan created successfully!');
        await fetchPlans();
        resetForm();
      } else {
        const data = await res.json();
        setMessage('❌ ' + (data.error || 'Failed to save plan'));
      }
    } catch (error) {
      setMessage('❌ Error saving plan');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleEdit = (plan: DevotionalPlan) => {
    setEditingId(plan.id);
    setTitle(plan.title);
    setDescription(plan.description || '');
    setThumbnailUrl(plan.thumbnail_url || '');
    setDevotionalText(plan.devotional_text || '');
    setScheduleType(plan.schedule_type || 'daily');
    setScheduleTime(plan.schedule_time || '06:00');
    setIsActive(plan.is_active !== false);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this devotional plan?')) return;

    try {
      const res = await fetch(`/api/devotional-plans?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage('✅ Plan deleted successfully!');
        await fetchPlans();
      } else {
        setMessage('❌ Failed to delete plan');
      }
    } catch (error) {
      setMessage('❌ Error deleting plan');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const toggleExpanded = (id: number) => {
    setExpandedCards({ ...expandedCards, [id]: !expandedCards[id] });
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Devotional Plan Settings</h1>
              <p className="text-gray-600 mt-1">Manage your daily devotional content and scheduling</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin-panel')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                ← Back to Admin
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg font-medium ${
            message.includes('✅') ? 'bg-green-100 text-green-800' :
            message.includes('❌') ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        {/* Display current plan or create form */}
{plans.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-purple-600">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Create Devotional Plan
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Morning Grace"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the devotional plan..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Thumbnail URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ImageIcon size={16} /> Thumbnail Image URL
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1776125439055_1mjj08.png"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {thumbnailUrl && (
                  <div className="mt-2">
                    <img src={thumbnailUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg shadow" />
                  </div>
                )}
              </div>

              {/* Devotional Text/Notes */}
              <div className="md:col-span-2 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  📝 Devotional Notes
                </h3>
                <textarea
                  value={devotionalText}
                  onChange={(e) => setDevotionalText(e.target.value)}
                  placeholder="Write your devotional insights, reflections, or teaching notes here..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Scheduling */}
              <div className="md:col-span-2 bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar size={20} /> Schedule Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</label>
                    <select
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} /> Schedule Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active (visible to users)</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Settings' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {plans.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Current Plan Settings</h2>
              <button
                onClick={() => {
                  const plan = plans[0];
                  handleEdit(plan);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Pencil size={18} /> Edit Settings
              </button>
            </div>

            {plans.map((plan) => (
              <div key={plan.id} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Title</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{plan.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {plan.is_active ? '✓ Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-700 mt-1">{plan.description || 'No description provided'}</p>
                  </div>
                  {plan.thumbnail_url && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Cover Image</label>
                      <div className="mt-2">
                        <img src={plan.thumbnail_url} alt="Cover" className="w-48 h-48 object-cover rounded-lg shadow" />
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Schedule</label>
                    <p className="text-gray-700 mt-1 flex items-center gap-2">
                      <Clock size={16} />
                      {plan.schedule_type.charAt(0).toUpperCase() + plan.schedule_type.slice(1)} at {plan.schedule_time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && editingId && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-600">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Plan Settings</h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Living Christ Daily"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the devotional plan..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Thumbnail URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ImageIcon size={16} /> Cover Image URL
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://app-cdn.appgen.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {thumbnailUrl && (
                  <div className="mt-2">
                    <img src={thumbnailUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg shadow" />
                  </div>
                )}
              </div>

              {/* Devotional Text/Notes */}
              <div className="md:col-span-2 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  📝 Devotional Notes
                </h3>
                <textarea
                  value={devotionalText}
                  onChange={(e) => setDevotionalText(e.target.value)}
                  placeholder="Write your devotional insights, reflections, or teaching notes here..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Scheduling */}
              <div className="md:col-span-2 bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar size={20} /> Schedule Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</label>
                    <select
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} /> Notification Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Plan is active (users can access devotionals)
                  </span>
                </label>
              </div>

              {/* Save Button */}
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
