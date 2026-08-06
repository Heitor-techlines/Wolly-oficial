const CACHE_NAME = 'wolly-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

const isDev = self.location.hostname.includes('localhost') || 
              self.location.hostname.includes('run.app') || 
              self.location.hostname.includes('aistudio');

self.addEventListener('install', (event) => {
  if (isDev) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Wolly Service Worker] Caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Wolly Service Worker] Activating & cleaning old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Clear all caches in dev, or old versions in prod
          if (isDev || cache !== CACHE_NAME) {
            console.log('[Wolly Service Worker] Clearing cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests to enable standard offline mode for cached shell resources
self.addEventListener('fetch', (event) => {
  // In development/preview mode, we must still call event.respondWith() on local GET requests
  // to satisfy the browser's PWA installability criteria, but we bypass caching so we always get fresh assets.
  if (isDev) {
    if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
      event.respondWith(fetch(event.request));
    }
    return;
  }

  // Let browser handle requests normally for non-GET/cross-origin/API requests in production
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle SPA routing: if requesting page path (not containing file extension), serve index.html from cache
  const url = new URL(event.request.url);
  const isNavigate = event.request.mode === 'navigate' || 
                    (!url.pathname.includes('.') && !url.pathname.startsWith('/api'));

  if (isNavigate) {
    event.respondWith(
      caches.match('/index.html').then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Cache newly requested assets dynamically
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Return index.html as fallback for any failed navigate fetches
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
