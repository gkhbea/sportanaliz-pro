// sw.js — Service Worker for SportAnaliz Pro (Network First & Cache Purging)
const CACHE_NAME = 'sportanaliz-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // API veya dinamik proxy çağrılarını asla önbelleğe alma
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network First: Önce her zaman güncel dosyayı sunucudan çek
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
