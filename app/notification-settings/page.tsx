'use client';

import { useState, useEffect, useRef } from 'react';
import { BookOpen, MessageSquare, Heart, HelpCircle, FileText, Bell, ChevronLeft, Save, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

type Settings = {
  books_notifications: boolean;
  commentaries_notifications: boolean;
  devotionals_notifications: boolean;
  prayers_notifications: boolean;
  qa_notifications: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  books_notifications: true,
  commentaries_notifications: true,
  devotionals_notifications: true,
  prayers_notifications: true,
  qa_notifications: true,
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

// FIX: accept only the five known keys, coerce to booleans, merge over
// defaults. Handles both { ...fields } and { settings: { ...fields } }.
function normalizeSettings(data: any): Settings {
  const raw = data?.settings && typeof data.settings === 'object' ? data.settings : data ?? {};
  const out = { ...DEFAULT_SETTINGS };
  for (const key of SETTING_KEYS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key];
    else if (raw[key] === 1 || raw[key] === '1' || raw[key] === 'true') out[key] = true;
    else if (raw[key] === 0 || raw[key] === '0' || raw[key] === 'false') out[key] = false;
  }
  return out;
}

export default function NotificationSettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    setUserEmail(email);
    if (email) {
      loadSettings(email);
    } else {
      setLoading(false);
    }
    return () => {
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
    };
  }, []);

  // FIX: warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const loadSettings = async (email: string) => {
    try {
      const res = await fetch(`/api/notification-settings?userEmail=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const clean = normalizeSettings(data);
      setSettings(clean);
      setInitialSettings(clean);
      setLoadError(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSetAll = (value: boolean) => {
    const all: Settings = {
      books_notifications: value,
      commentaries_notifications: value,
      devotionals_notifications: value,
      prayers_notifications: value,
      qa_notifications: value,
    };
    setSettings(all);
    setSaved(false);
    setSaveError(null);
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!userEmail) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, ...settings }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setInitialSettings(settings);
      setSaved(true);
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
      savedTimeout.current = setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveError('Could not save your settings. Check your connection and try again.');
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
    },
    {
      key: 'commentaries_notifications' as const,
      title: 'Commentaries',
      description: 'Get notified about new verse commentaries and insights',
      icon: FileText,
    },
    {
      key: 'devotionals_notifications' as const,
      title: 'Devotionals',
      description: 'Get notified when new daily devotionals are published',
      icon: Heart,
    },
    {
      key: 'prayers_notifications' as const,
      title: 'Verse Prayers',
      description: 'Get notified about new verse-by-verse prayer passages',
      icon: MessageSquare,
    },
    {
      key: 'qa_notifications' as const,
      title: 'Bible Q&A',
      description: 'Get notified when new questions and answers are added',
      icon: HelpCircle,
    },
  ];

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[#FDFBF6] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-[#1B2340]/5 border border-[#E8B84B]/30 p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1B2340] mb-4">
            <Bell className="w-7 h-7 text-[#E8B84B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1B2340] mb-2">Sign In Required</h2>
          <p className="text-[#6B6455] mb-6 text-sm leading-relaxed">
            Please sign in to manage your notification settings
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-[#1B2340] text-white font-semibold rounded-full hover:bg-[#2A3358] transition-all shadow-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-[#E8B84B]/30 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Back to home"
              className="p-2 rounded-full hover:bg-[#F3EEDF] transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-[#1B2340]" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#1B2340]">Notification Settings</h1>
              <p className="text-sm text-[#6B6455] mt-0.5">
                Manage content update notifications for offline downloads
              </p>
            </div>
            {isDirty && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#6B4E0B] bg-[#FFF8E6] border border-[#E8B84B]/60 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E8B84B] animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8B84B] border-t-transparent" />
            <p className="text-sm text-[#6B6455] mt-4">Loading your settings…</p>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className="bg-[#FFF8E6] border border-[#E8B84B]/50 rounded-2xl p-5 mb-6">
              <div className="flex gap-3">
                <Bell className="w-5 h-5 text-[#B98A2F] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#1B2340] mb-1">
                    About Content Notifications
                  </h3>
                  <p className="text-xs text-[#6B6455] leading-relaxed">
                    Enable notifications to stay informed when new content becomes available for offline download.
                    You&apos;ll see a notification badge and can download updates directly from the notification panel.
                    These are content-update notices — for daily reading reminders, see{' '}
                    <Link href="/reminders" className="font-bold text-[#B98A2F] underline">
                      Reading Reminders
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Load error */}
            {loadError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Couldn’t load your saved settings — showing defaults instead.
                  </p>
                  <button
                    onClick={() => userEmail && loadSettings(userEmail)}
                    className="text-sm font-bold text-red-700 underline mt-1"
                  >
                    Try loading again
                  </button>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[#1B2340]">
                {contentSections.filter((s) => settings[s.key]).length} of {contentSections.length} enabled
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSetAll(true)}
                  className="text-xs font-bold text-[#1B2340] bg-[#F3EEDF] hover:bg-[#EADFC2] px-3 py-1.5 rounded-full transition-colors"
                >
                  Enable all
                </button>
                <button
                  onClick={() => handleSetAll(false)}
                  className="text-xs font-bold text-[#6B6455] bg-[#F3EEDF] hover:bg-[#EADFC2] px-3 py-1.5 rounded-full transition-colors"
                >
                  Disable all
                </button>
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
                    className={`bg-white rounded-2xl shadow-md shadow-[#1B2340]/5 border overflow-hidden transition-all ${
                      isEnabled ? 'border-[#E8B84B]/50' : 'border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-4 p-6">
                      <div className="bg-[#F3EEDF] p-3 rounded-xl flex-shrink-0">
                        <Icon className="w-6 h-6 text-[#B98A2F]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-[#1B2340]">{section.title}</h3>
                        <p className="text-sm text-[#6B6455] mt-0.5">{section.description}</p>
                      </div>

                      {/* Toggle — proper switch semantics for screen readers */}
                      <button
                        role="switch"
                        aria-checked={isEnabled}
                        aria-label={`${section.title} notifications ${isEnabled ? 'on' : 'off'}`}
                        onClick={() => handleToggle(section.key)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E8B84B] focus:ring-offset-2 flex-shrink-0 ${
                          isEnabled ? 'bg-[#1B2340]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save error */}
            {saveError && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-800">{saveError}</p>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                title={!isDirty ? 'No changes to save' : 'Save your notification settings'}
                className="px-8 py-3 bg-[#1B2340] text-white font-semibold rounded-full hover:bg-[#2A3358] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-[#E8B84B]" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving…' : 'Save Settings'}
                  </>
                )}
              </button>
              {isDirty && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-[#F3EEDF] text-[#6B6455] font-semibold rounded-full hover:bg-[#EADFC2] transition-colors flex items-center gap-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Discard changes
                </button>
              )}
            </div>
            {!isDirty && !saved && (
              <p className="text-center text-xs text-[#9A927E] mt-3">
                Your settings are up to date.
              </p>
            )}

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-xs text-[#9A927E]">
                Notifications are checked automatically every 5 minutes while the app is open.
              </p>
              <p className="text-xs text-[#9A927E] mt-1">
                You can also check for updates manually from the notification bell in the header.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
