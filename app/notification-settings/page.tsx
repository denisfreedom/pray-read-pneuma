'use client';

import { useState, useEffect } from 'react';
import { BookOpen, MessageSquare, Heart, HelpCircle, FileText, Bell, ChevronLeft, Save, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function NotificationSettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    books_notifications: true,
    commentaries_notifications: true,
    devotionals_notifications: true,
    prayers_notifications: true,
    qa_notifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    setUserEmail(email);

    if (email) {
      loadSettings(email);
    } else {
      setLoading(false);
    }
  }, []);

  const loadSettings = async (email: string) => {
    try {
      const res = await fetch(`/api/notification-settings?userEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!userEmail) return;

    setSaving(true);
    try {
      const res = await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, ...settings }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const contentSections = [
    {
      key: 'books_notifications' as const,
      title: 'Bible Books',
      description: 'Get notified when new books are added or updated',
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      darkBgColor: 'dark:bg-blue-900/20',
    },
    {
      key: 'commentaries_notifications' as const,
      title: 'Commentaries',
      description: 'Get notified about new verse commentaries and insights',
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      darkBgColor: 'dark:bg-purple-900/20',
    },
    {
      key: 'devotionals_notifications' as const,
      title: 'Devotionals',
      description: 'Get notified when new daily devotionals are published',
      icon: Heart,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      darkBgColor: 'dark:bg-amber-900/20',
    },
    {
      key: 'prayers_notifications' as const,
      title: 'Verse Prayers',
      description: 'Get notified about new verse-by-verse prayer passages',
      icon: MessageSquare,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
      darkBgColor: 'dark:bg-rose-900/20',
    },
    {
      key: 'qa_notifications' as const,
      title: 'Bible Q&A',
      description: 'Get notified when new questions and answers are added',
      icon: HelpCircle,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
      darkBgColor: 'dark:bg-indigo-900/20',
    },
  ];

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign In Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in to manage your notification settings
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Notification Settings
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage content update notifications for offline downloads
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    About Content Notifications
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Enable notifications to stay informed when new content becomes available for offline download. 
                    You'll see a notification badge and can download updates directly from the notification panel.
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Cards */}
            <div className="space-y-4">
              {contentSections.map((section) => {
                const Icon = section.icon;
                const isEnabled = settings[section.key];

                return (
                  <div
                    key={section.key}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-4 p-6">
                      {/* Icon */}
                      <div className={`${section.bgColor} ${section.darkBgColor} p-3 rounded-xl flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${section.color}`} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {section.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {section.description}
                        </p>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(section.key)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 ${
                          isEnabled ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </>
                )}
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Notifications are checked automatically every 5 minutes while the app is open.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You can also check for updates manually from the notification bell in the header.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
