// Service Worker for caching static assets (PROD build output)
const CACHE_NAME = 'richo-cache-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/notification-sound.mp3',
];

const isCacheableAsset = (request, url) => {
  // Never cache Vite dev dependency chunks
  if (url.pathname.startsWith('/node_modules/.vite/')) return false;

  // Cache Vite build assets + common static files
  if (url.pathname.startsWith('/assets/')) return true;
  if (url.pathname.startsWith('/icons/')) return true;
  if (url.pathname === '/favicon.ico') return true;
  if (url.pathname === '/manifest.json') return true;

  // Images/fonts requested outside /assets (e.g., /placeholder.svg)
  if (request.destination === 'image' || request.destination === 'font') return true;

  return false;
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Cache-first only for safe, versioned build/static assets
  if (isCacheableAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background
          event.waitUntil(
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse.ok) {
                  return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
                }
              })
              .catch(() => {}),
          );
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  // Network-first for navigation/API; fallback to cache for offline
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok && request.destination === 'document') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request)),
  );
});

