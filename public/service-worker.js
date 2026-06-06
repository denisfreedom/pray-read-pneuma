self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'daily-verse',
    requireInteraction: false,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      bookNumber: data.bookNumber,
      chapter: data.chapter,
      verse: data.verse
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const notificationData = event.notification.data;
  let targetUrl = notificationData.url || '/';
  
  // If we have specific verse data, construct the Bible reader URL
  if (notificationData.bookNumber && notificationData.chapter && notificationData.verse) {
    targetUrl = `/bible-reader/${notificationData.bookNumber}/${notificationData.chapter}?verse=${notificationData.verse}#verse-${notificationData.verse}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            // Navigate existing window to the target URL
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // No existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
