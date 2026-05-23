# Progressive Web App (PWA) Features

## Overview
Pray-Read Bible is now a fully functional Progressive Web App with comprehensive offline support, allowing users to read the Bible, access commentaries, prayers, and devotionals without an internet connection.

## Key Features Implemented

### 1. Service Worker (`/public/sw.js`)
- **Pre-caching**: Critical assets are cached during installation
- **Runtime caching**: API responses, Bible content, and images are cached as users browse
- **Cache strategies**:
  - **Cache First**: Static assets, Bible content pages (for instant offline loading)
  - **Network First**: API requests (ensures fresh data when online, falls back to cache offline)
- **Offline fallback**: Shows `/offline` page when content isn't cached
- **Automatic cache cleanup**: Removes old cache versions on update

### 2. IndexedDB Offline Storage (`/app/utils/offlineStorage.ts`)
- **Structured storage** for large datasets:
  - Bible verses (by book/chapter)
  - Commentaries
  - Prayers
  - Devotionals
  - Theological insights
  - Historical context
  - Verse of the Day
- **Automatic caching**: Content is saved to IndexedDB as users browse
- **Fast retrieval**: Optimized indexes for quick lookups
- **Storage quota management**: Tracks and displays storage usage

### 3. Web Manifest (`/public/manifest.json`)
- **Installability**: Users can add the app to their home screen
- **App icons**: Full set of icons (72x72 to 512x512)
- **Standalone display**: App runs in its own window without browser UI
- **App shortcuts**: Quick access to Bible Reader, Verse of the Day, and Devotionals
- **Theme colors**: Matches app branding

### 4. Offline Indicator (`/app/components/OfflineIndicator.tsx`)
- **Real-time status**: Shows when user goes offline/online
- **Non-intrusive**: Auto-dismisses when back online
- **Visual feedback**: Clear indication of offline mode

### 5. Install Prompt (`/app/components/InstallPWA.tsx`)
- **Smart timing**: Appears after 10 seconds (gives users time to explore)
- **Dismissal handling**: Doesn't re-appear for 7 days if dismissed
- **Cross-browser support**: Works on Chrome, Edge, Safari (iOS), Firefox
- **Manual instructions**: Fallback instructions for browsers without install prompt API

### 6. Offline Page (`/app/offline/page.tsx`)
- **Graceful fallback**: Shows when requested content isn't cached
- **Status indicator**: Shows online/offline state with retry option
- **Cached content overview**: Lists available offline books and storage usage
- **Navigation**: Easy return to home or cached content

### 7. Bible Reader Offline Integration
The Bible Reader now automatically:
- **Caches verses** to IndexedDB as users read
- **Caches commentaries and prayers** for offline access
- **Serves from cache** when offline
- **Shows cache indicator** when serving offline content
- **Syncs highlights** made offline when connection returns

### 8. Offline Sync API (`/app/api/offline-sync/route.ts`)
- **Background sync**: Syncs user data (highlights, notes, reading progress) when connection returns
- **Batch operations**: Efficient syncing of multiple items
- **Conflict resolution**: Handles offline/online data conflicts

## How It Works

### For Users
1. **First Visit**: 
   - Service worker installs
   - Critical assets are cached
   - Bible content is cached as they browse

2. **Install Prompt**:
   - After exploring for 10 seconds, an install banner appears
   - Tap "Install" to add to home screen
   - App opens like a native app

3. **Offline Usage**:
   - Previously read chapters are available offline
   - Commentaries, prayers, and insights work offline
   - Highlights and notes are saved locally
   - Syncs automatically when back online

4. **Returning Online**:
   - Fresh content is fetched
   - Offline changes (highlights, notes) are synced to server
   - Cache is updated in background

### Technical Details

**Storage Breakdown**:
- **Service Worker Cache**: ~5-10 MB (HTML, CSS, JS, images)
- **IndexedDB**: Grows as user reads (1-2 MB per book)
- **localStorage**: User preferences, bookmarks, notes (~1 MB)

**Cache Duration**:
- Static assets: Permanent (updates on new app version)
- Bible content: 30 days (localStorage), 90 days (IndexedDB)
- API responses: Fresh on network, fallback to cache offline

**Browser Support**:
- ✅ Chrome/Edge (Android, Desktop): Full support
- ✅ Safari (iOS, macOS): Full support (requires manual install)
- ✅ Firefox (Android, Desktop): Service worker + caching (install prompt varies)
- ✅ Samsung Internet: Full support

## Installation Instructions

### Android (Chrome, Edge, Samsung Internet)
1. Visit the app in your browser
2. Tap the install banner when it appears, OR
3. Tap browser menu (⋮) → "Add to Home screen" or "Install app"
4. Tap "Add" or "Install"
5. App icon appears on home screen

### iOS (Safari)
1. Visit the app in Safari
2. Tap the Share button (□ with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. App icon appears on home screen

### Desktop (Chrome, Edge)
1. Visit the app
2. Click the install icon (⊕) in the address bar, OR
3. Click browser menu → "Install Pray-Read Bible"
4. App opens in its own window

## Benefits for Users

1. **Offline Bible Reading**: Read any previously visited chapter offline
2. **Faster Loading**: Instant page loads (no network delay)
3. **Save Data**: Reduces mobile data usage (content cached after first load)
4. **Native Feel**: Fullscreen, no browser UI, smooth animations
5. **Push Notifications**: (Future) Daily verse reminders
6. **Background Sync**: Changes sync automatically when connection returns
7. **Always Accessible**: Works even with poor/no internet connection

## Testing Offline Mode

### Chrome DevTools (Desktop)
1. Open DevTools (F12)
2. Go to "Application" tab → "Service Workers"
3. Check "Offline" checkbox
4. Reload the page — should work from cache

### Mobile Testing
1. Enable Airplane Mode
2. Open the installed app
3. Navigate to previously visited chapters — should load instantly
4. Try highlighting, bookmarking — should work offline
5. Disable Airplane Mode — changes sync automatically

## Storage Management

Users can check their storage usage:
1. Visit the `/offline` page
2. Storage usage is displayed at the bottom
3. Shows MB used out of available quota

To clear cached data:
- Browser Settings → Storage → Clear site data
- Or uninstall and reinstall the app

## Future Enhancements

- **Pre-download books**: Let users download entire books for offline reading
- **Background sync**: Sync reading progress in background
- **Push notifications**: Daily verse reminders
- **Update notifications**: Alert users when new content is available
- **Selective caching**: Let users choose which books to cache

## Maintenance

### Updating the Service Worker
When updating the service worker (`/public/sw.js`):
1. Increment the `CACHE_VERSION` constant
2. Old caches are automatically cleaned up on activation
3. Users get the update on next visit

### Adding New Cacheable Routes
Add new routes to the appropriate cache strategy in `sw.js`:
```javascript
// For static assets
if (url.pathname.includes('/new-page/')) {
  event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  return;
}
```

## Troubleshooting

**Service Worker not registering?**
- Check browser console for errors
- Ensure HTTPS (service workers require secure context)
- Check `/sw.js` is accessible

**Content not loading offline?**
- Visit the content while online first (must be cached)
- Check Application → Cache Storage in DevTools
- Verify IndexedDB has the data

**Install prompt not showing?**
- Some browsers don't support it (provide manual instructions)
- User may have dismissed it (check localStorage)
- App must meet PWA criteria (manifest, service worker, HTTPS)

**Cache not updating?**
- Force-refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Unregister service worker in DevTools
- Clear cache and reload

## Resources
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [Can I Use: Service Workers](https://caniuse.com/serviceworkers)
