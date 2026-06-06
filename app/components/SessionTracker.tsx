'use client';

import { useEffect } from 'react';

/**
 * SessionTracker - Tracks app sessions for activity metrics
 * Logs a session once per visit to track "days active"
 */
export default function SessionTracker() {
  useEffect(() => {
    const trackSession = async () => {
      try {
        // Check if we already tracked a session today
        const lastSessionDate = localStorage.getItem('lastSessionDate');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        if (lastSessionDate === today) {
          // Already tracked today, skip
          return;
        }

        // Get user session
        const sessionRes = await fetch('/api/auth/session', { 
          credentials: 'include', 
          cache: 'no-store' 
        });
        
        if (!sessionRes.ok) return;
        const sessionData = await sessionRes.json();
        
        if (!sessionData.success || !sessionData.user?.email) return;

        // Log session - we'll use book_visit with null book_id to track app opens
        await fetch('/api/activity-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_email: sessionData.user.email,
            activity_type: 'book_visit',
            book_id: 1, // Use book 1 (Genesis) as a placeholder for app session
            chapter: null
          })
        });

        // Update last session date
        localStorage.setItem('lastSessionDate', today);
      } catch (error) {
        console.error('Error tracking session:', error);
      }
    };

    // Track on mount
    trackSession();
  }, []);

  // This component doesn't render anything
  return null;
}
