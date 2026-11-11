'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, Power, Check } from 'lucide-react';

interface Reminder {
  id: number;
  time: string;
  days: string[];
  enabled: boolean;
}

const DAYS = [
  { short: 'sun', full: 'Sunday' },
  { short: 'mon', full: 'Monday' },
  { short: 'tue', full: 'Tuesday' },
  { short: 'wed', full: 'Wednesday' },
  { short: 'thu', full: 'Thursday' },
  { short: 'fri', full: 'Friday' },
  { short: 'sat', full: 'Saturday' },
];

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// "09:00" -> "9:00 AM" (input stays 24h, display is friendly)
function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTime, setNewTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(ALL_DAYS);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default');
  const [saving, setSaving] = useState(false);

  // ── FIX: refs always hold the LATEST values, so the one timer ──
  // ── created below never goes stale ──
  const remindersRef = useRef<Reminder[]>([]);
  const permissionRef = useRef<NotificationPermission>('default');
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    remindersRef.current = reminders;
    // Keep a copy for the service worker to read later
    try {
      localStorage.setItem('bibleReminders', JSON.stringify(reminders));
    } catch {}
  }, [reminders]);

  useEffect(() => {
    permissionRef.current = notificationPermission;
  }, [notificationPermission]);

  // ── FIX: ONE timer for the whole page, created once, cleaned up ──
  useEffect(() => {
    fetchReminders();
    checkNotificationPermission();
    const interval = setInterval(checkAndShowNotification, 30000);
    checkAndShowNotification(); // check immediately on load
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders');
      const data = await response.json();
      setReminders(data.reminders || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const addReminder = async () => {
    if (selectedDays.length === 0) return;
    setSaving(true);
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: newTime, days: selectedDays, enabled: true }),
      });
      if (response.ok) {
        await fetchReminders();
        setShowAddForm(false);
        setNewTime('09:00');
        setSelectedDays(ALL_DAYS);
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (reminder: Reminder) => {
    try {
      await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reminder, enabled: !reminder.enabled }),
      });
      await fetchReminders();
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const deleteReminder = async (id: number) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      await fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  // ── FIX: reads the LATEST reminders from the ref, and remembers ──
  // ── what already fired so one reminder fires once per minute ──
  const checkAndShowNotification = () => {
    if (permissionRef.current !== 'granted') return;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const todayKey = now.toDateString();

    remindersRef.current.forEach((reminder) => {
      if (!reminder.enabled) return;
      if (reminder.time !== currentTime) return;
      if (!reminder.days.includes(currentDay)) return;

      const fireKey = `${reminder.id}-${todayKey}-${currentTime}`;
      if (firedRef.current.has(fireKey)) return; // already fired this minute
      firedRef.current.add(fireKey);
      showNotification();
    });
  };

  const showNotification = () => {
    if (permissionRef.current !== 'granted') return;
    try {
      new Notification('Bible Reading Reminder', {
        body: 'Time for your daily Bible reading!',
        icon: '/icon-192x192.png',
        tag: 'bible-reminder',
      });
    } catch (e) {
      console.error('Could not show notification:', e);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const activeCount = reminders.filter((r) => r.enabled).length;

  return (
    <div className="min-h-screen bg-[#FDFBF6] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1B2340] shadow-lg shadow-[#1B2340]/30 mb-4">
            <Bell className="w-7 h-7 text-[#E8B84B]" />
          </div>
          <p className="text- font-bold tracking-[0.3em] text-[#B98A2F] uppercase mb-1">
            Pray-Read Bible
          </p>
          <h1 className="text-3xl font-bold text-[#1B2340] mb-2">Reading Reminders</h1>
          <p className="text-[#6B6455]">
            Set daily reminders to stay consistent with your Bible reading
          </p>
          {reminders.length > 0 && (
            <p className="mt-2 inline-block text-xs font-semibold text-[#1B2340] bg-[#F3E9CF] border border-[#E8B84B]/50 rounded-full px-3 py-1">
              {activeCount} active · {reminders.length} total
            </p>
          )}
        </div>

        {/* Notification Permission */}
        {notificationPermission !== 'granted' && (
          <div className="bg-[#FFF8E6] border border-[#E8B84B]/60 rounded-2xl p-5 mb-6">
            <p className="text-[#6B4E0B] mb-3 text-sm leading-relaxed">
              Enable notifications so your reminders can reach you while the app is open.
            </p>
            <button
              onClick={requestNotificationPermission}
              className="bg-[#1B2340] text-white px-5 py-2.5 rounded-lg hover:bg-[#2A3358] transition-colors text-sm font-semibold"
            >
              Enable Notifications
            </button>
          </div>
        )}

        {/* Add Reminder Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-[#1B2340] to-[#2A3358] text-white py-4 rounded-2xl mb-6 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-[#1B2340]/20 transition-all font-semibold"
          >
            <Plus className="w-5 h-5 text-[#E8B84B]" />
            Add New Reminder
          </button>
        )}

        {/* Add Reminder Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg shadow-[#1B2340]/5 border border-[#E8B84B]/30 p-6 mb-6">
            <h3 className="text-lg font-bold text-[#1B2340] mb-4">New Reminder</h3>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#1B2340] mb-2">Time</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-[#E5DCC3] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#E8B84B] focus:border-[#E8B84B] outline-none text-[#1B2340]"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#1B2340] mb-2">Repeat on</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.short}
                    onClick={() => toggleDay(day.short)}
                    title={day.full}
                    className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                      selectedDays.includes(day.short)
                        ? 'bg-[#1B2340] text-white'
                        : 'bg-[#F3EEDF] text-[#6B6455] hover:bg-[#EADFC2]'
                    }`}
                  >
                    {day.short.toUpperCase()}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-red-600 mt-2">Pick at least one day.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={addReminder}
                disabled={saving || selectedDays.length === 0}
                className="flex-1 bg-[#E8B84B] text-[#1B2340] py-3 rounded-xl hover:bg-[#D9A62E] transition-colors font-bold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Reminder'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-[#F3EEDF] text-[#6B6455] py-3 rounded-xl hover:bg-[#EADFC2] transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 && !showAddForm && (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E8B84B]/30">
              <Bell className="w-14 h-14 mx-auto mb-4 text-[#E8B84B] opacity-60" />
              <p className="text-[#6B6455] font-medium">No reminders set yet</p>
              <p className="text-sm text-[#9A927E] mt-1">
                Tap “Add New Reminder” to create your first one.
              </p>
            </div>
          )}

          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`bg-white rounded-2xl shadow-md shadow-[#1B2340]/5 border p-6 transition-all ${
                reminder.enabled ? 'border-[#E8B84B]/50' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Bell className={`w-6 h-6 ${reminder.enabled ? 'text-[#B98A2F]' : 'text-gray-400'}`} />
                  <span className="text-2xl font-bold text-[#1B2340]">
                    {formatTime(reminder.time)}
                  </span>
                  {reminder.enabled && (
                    <span className="flex items-center gap-1 text- font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <Check className="w-3 h-3" /> ON
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleReminder(reminder)}
                    title={reminder.enabled ? 'Turn off' : 'Turn on'}
                    className={`p-2.5 rounded-xl transition-colors ${
                      reminder.enabled
                        ? 'bg-[#F3E9CF] text-[#B98A2F] hover:bg-[#EADFC2]'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    title="Delete reminder"
                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <span
                    key={day.short}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      reminder.days.includes(day.short)
                        ? 'bg-[#1B2340] text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {day.short.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <a href="/" className="inline-block text-[#B98A2F] hover:text-[#1B2340] font-semibold text-sm">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
