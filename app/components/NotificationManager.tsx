'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';

interface NotificationManagerProps {
  userEmail: string;
}

export default function NotificationManager({ userEmail }: NotificationManagerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    daily_verse_enabled: true,
    notification_time: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
    loadPreferences();
  }, [userEmail]);

  const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await fetch(`/api/notifications/preferences?userEmail=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setPreferences({
          daily_verse_enabled: data.daily_verse_enabled ?? true,
          notification_time: data.notification_time?.substring(0, 5) || '08:00',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in your browser');
      return;
    }

    setIsLoading(true);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please allow notifications to receive daily verses');
        setIsLoading(false);
        return;
      }

      // Subscribe to push notifications
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        setIsLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userEmail
        })
      });

      if (res.ok) {
        setIsSubscribed(true);
        alert('Successfully subscribed to daily verse notifications!');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to subscribe to notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromNotifications = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            userEmail
          })
        });
      }

      setIsSubscribed(false);
      alert('Unsubscribed from notifications');
    } catch (error) {
      console.error('Unsubscribe error:', error);
      alert('Failed to unsubscribe');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          ...preferences
        })
      });

      if (res.ok) {
        alert('Notification preferences updated!');
        setShowSettings(false);
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Update preferences error:', error);
      alert('Failed to update preferences');
    }
  };

  const sendTestNotification = async () => {
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      if (res.ok) {
        alert('Test notification sent!');
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      alert('Failed to send test notification');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-green-600" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">Daily Verse Notifications</h3>
            <p className="text-sm text-gray-600">
              {isSubscribed ? 'Enabled - Receive daily scripture at 8:00 AM' : 'Disabled'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isSubscribed ? (
            <>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={unsubscribeFromNotifications}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Disable
              </button>
            </>
          ) : (
            <button
              onClick={subscribeToNotifications}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              Enable Notifications
            </button>
          )}
        </div>
      </div>

      {showSettings && isSubscribed && (
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h4 className="font-semibold text-gray-900">Notification Settings</h4>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <input
                type="checkbox"
                checked={preferences.daily_verse_enabled}
                onChange={(e) => setPreferences({ ...preferences, daily_verse_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable daily verse notifications
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Time
            </label>
            <input
              type="time"
              value={preferences.notification_time}
              onChange={(e) => setPreferences({ ...preferences, notification_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={updatePreferences}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Save Settings
            </button>
            <button
              onClick={sendTestNotification}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Send Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
