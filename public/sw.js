// public/sw.js
// 4N Planet Service Worker for Mobile PWA Installation

const CACHE_NAME = '4nplanet-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event listener required for mobile PWA installability
self.addEventListener('fetch', (event) => {
  // Never intercept or cache API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network first with cache fallback for app shell assets
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

