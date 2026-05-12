'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Power } from 'lucide-react';

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

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTime, setNewTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    fetchReminders();
    checkNotificationPermission();
    scheduleNotifications();
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
      if (permission === 'granted') {
        scheduleNotifications();
      }
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
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time: newTime,
          days: selectedDays,
          enabled: true,
        }),
      });
      
      if (response.ok) {
        await fetchReminders();
        setShowAddForm(false);
        setNewTime('09:00');
        scheduleNotifications();
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  const toggleReminder = async (reminder: Reminder) => {
    try {
      await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reminder,
          enabled: !reminder.enabled,
        }),
      });
      await fetchReminders();
      scheduleNotifications();
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const deleteReminder = async (id: number) => {
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      await fetchReminders();
      scheduleNotifications();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const scheduleNotifications = () => {
    // Clear existing scheduled notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Store reminders in localStorage for the service worker to access
      localStorage.setItem('bibleReminders', JSON.stringify(reminders));
      
      // Schedule check every minute
      setInterval(checkAndShowNotification, 60000);
      checkAndShowNotification(); // Check immediately
    }
  };

  const checkAndShowNotification = () => {
    if (Notification.permission !== 'granted') return;
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    
    reminders.forEach(reminder => {
      if (reminder.enabled && reminder.time === currentTime && reminder.days.includes(currentDay)) {
        showNotification();
      }
    });
  };

  const showNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Bible Reading Reminder', {
        body: 'Time for your daily Bible reading! 📖',
        icon: '/bible-icon.png',
        tag: 'bible-reminder',
        requireInteraction: false,
      });
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Bell className="w-8 h-8 text-purple-600" />
            Reading Reminders
          </h1>
          <p className="text-gray-600">
            Set daily reminders to stay consistent with your Bible reading
          </p>
        </div>

        {/* Notification Permission */}
        {notificationPermission !== 'granted' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 mb-3">
              Enable notifications to receive reading reminders
            </p>
            <button
              onClick={requestNotificationPermission}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Enable Notifications
            </button>
          </div>
        )}

        {/* Add Reminder Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl mb-6 flex items-center justify-center gap-2 hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Add New Reminder
          </button>
        )}

        {/* Add Reminder Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">New Reminder</h3>
            
            {/* Time Picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Days Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat on
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day.short}
                    onClick={() => toggleDay(day.short)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedDays.includes(day.short)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.short.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={addReminder}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Save Reminder
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 && !showAddForm && (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No reminders set yet</p>
            </div>
          )}

          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`bg-white rounded-xl shadow-md p-6 transition-all ${
                reminder.enabled ? 'border-l-4 border-purple-600' : 'opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Bell className={`w-6 h-6 ${reminder.enabled ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className="text-2xl font-bold text-gray-800">
                    {reminder.time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleReminder(reminder)}
                    className={`p-2 rounded-lg transition-colors ${
                      reminder.enabled
                        ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <span
                    key={day.short}
                    className={`px-3 py-1 rounded-full text-sm ${
                      reminder.days.includes(day.short)
                        ? 'bg-purple-100 text-purple-700'
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
          <a
            href="/"
            className="inline-block text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
