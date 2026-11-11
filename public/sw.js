// Service Worker for Pray-Read Bible App — FIXED
// v2: API calls are NEVER cached. App shell cached for offline.
// Bible content offline comes from IndexedDB (offlineStorage.ts),
// NOT from this cache.
const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
// NOTE: API_CACHE removed on purpose — API responses must never be cached.

// Critical assets to pre-cache on install.
// /manifest.json is NOT listed: it currently 404s, and one missing file
// makes cache.addAll() fail and saves NOTHING. Add it back once the
// file exists in public/.
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
];

// Install event - pre-cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      console.log('[SW] Pre-caching static assets');
      // Add one by one: one missing file must NOT kill the whole pre-cache.
      for (const url of STATIC_ASSETS) {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (err) {
          console.warn('[SW] Skipped missing asset:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches (v1 caches get deleted here,
// because their names no longer match)
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - handle requests with offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip external URLs
  if (url.origin !== self.location.origin) {
    return;
  }

  // ── FIX 1: NEVER intercept API calls ──────────────────────────────
  // All /api/ requests (GET and POST) go straight to the network.
  // This fixes the visitor counter (no stale cached 0s) and stops the
  // service worker swallowing POST heartbeats. When offline, the app
  // code reads Bible content from IndexedDB instead — the service
  // worker does not need to cache API answers for that.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip non-GET requests (POST/PUT/DELETE pass through untouched)
  if (request.method !== 'GET') {
    return;
  }

  // Handle static assets with Cache First strategy
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Handle navigation requests with Network First strategy (fallback to offline page)
  // NOTE: Bible reader pages now come through HERE (network-first),
  // not the old Cache-First block — so they never go stale, and when
  // offline they fall back to the cached page or /offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful navigation responses
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Try cache first
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to offline page
            return caches.match('/offline');
          });
        })
    );
    return;
  }

  // Default: try network first, fallback to cache
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

// Network First Strategy - for dynamic content (NOT for API — API is never intercepted)
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache (offline):', request.url);
      return cachedResponse;
    }

    // No cache available
    throw error;
  }
}

// Cache First Strategy - for static assets only
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(cacheName).then((cache) => {
            cache.put(request, networkResponse);
          });
        }
      })
      .catch(() => {
        // Network error, but we have cache
      });

    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed and no cache
    throw error;
  }
}

// Background sync for offline actions (if needed)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-bible-data') {
    event.waitUntil(syncBibleData());
  }
});

async function syncBibleData() {
  console.log('[SW] Syncing Bible data...');
  // Implement sync logic here if needed
}

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Pray-Read Bible';
  const options = {
    body: data.body || 'New update available',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
