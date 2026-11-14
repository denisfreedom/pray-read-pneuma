"use client";
import { useEffect } from 'react';

// app/components/ReadingReminder.tsx
// Fires the daily reading reminder. Browser notifications only work while a
// page on this site is open (there is no push server), so mount this in the
// plan detail page — and ideally once in the root layout / dashboard too —
// and it checks every 30 seconds whether it is the reminder time. It fires
// at most once per plan per day (localStorage key), and never asks twice.
export default function ReadingReminder({ planId, planTitle, time, enabled }: {
  planId: number; planTitle: string; time: string; enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled || !time || !/^\d{2}:\d{2}$/.test(time)) return;
    if (typeof Notification === 'undefined') return;
    const tick = () => {
      try {
        if (Notification.permission !== 'granted') return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        if (`${hh}:${mm}` !== time) return;
        const dateKey = now.toISOString().slice(0, 10);
        const firedKey = `pr-reminder-fired-${planId}-${dateKey}`;
        if (localStorage.getItem(firedKey)) return;
        localStorage.setItem(firedKey, '1');
        new Notification(`📖 Time to read — ${planTitle}`, {
          body: 'Your daily reading is waiting. Open your plan and keep the streak going.',
          tag: `reading-reminder-${planId}`,
        });
      } catch { /* notifications unavailable — ignore */ }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [planId, planTitle, time, enabled]);

  return null;
}
