// Custom hook for offline data synchronization
import { useState, useEffect } from 'react';
import { isOffline } from '@/app/utils/offlineStorage';

interface UseOfflineSyncOptions {
  onlineCallback?: () => void;
  offlineCallback?: () => void;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Check initial status
    setOffline(isOffline());

    const handleOnline = () => {
      setOffline(false);
      options.onlineCallback?.();
      syncOfflineData();
    };

    const handleOffline = () => {
      setOffline(true);
      options.offlineCallback?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [options]);

  const syncOfflineData = async () => {
    if (offline || syncing) return;

    setSyncing(true);
    try {
      // Sync any pending data here
      console.log('Syncing offline data...');
      
      // You can implement sync logic for:
      // - Highlights
      // - Notes
      // - Reading progress
      // - Bookmarks
      
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  return {
    offline,
    syncing,
    syncOfflineData,
  };
}

// Hook for fetching data with offline support
export function useOfflineFetch<T>(
  url: string,
  cacheGetter: () => Promise<T | null>,
  cacheSetter: (data: T) => Promise<void>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { offline } = useOfflineSync();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to fetch from network first
        if (!offline) {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const jsonData = await response.json();
          
          // Cache the data
          await cacheSetter(jsonData);
          
          if (isMounted) {
            setData(jsonData);
          }
        } else {
          // We're offline, try cache
          const cachedData = await cacheGetter();
          
          if (cachedData && isMounted) {
            setData(cachedData);
          } else {
            throw new Error('No cached data available offline');
          }
        }
      } catch (err) {
        // Try cache as fallback
        try {
          const cachedData = await cacheGetter();
          if (cachedData && isMounted) {
            setData(cachedData);
            setError(null);
          } else {
            throw err;
          }
        } catch (cacheErr) {
          if (isMounted) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [url, offline, cacheGetter, cacheSetter]);

  return { data, loading, error, offline };
}
