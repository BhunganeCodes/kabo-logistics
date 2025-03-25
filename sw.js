const CACHE_NAME = 'kabo-logistics-v2';
const OFFLINE_PAGE = '/offline.html';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/offline.html',
  '/public/assets/images/KABO-removebg-preview (1).png',
  '/public/assets/videos/aerial-footage-of-cargo-ship.mp4',
  '/public/assets/images/fallback-bg.jpg',
  '/public/assets/images/team1.jpg',
  '/public/assets/images/team2.jpg',
  '/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Cache addAll error:', error);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Skip caching for non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle navigation requests separately
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for caching
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // If fetch fails, try to serve from cache
          return caches.match(event.request)
            .then(response => response || caches.match(OFFLINE_PAGE));
        })
    );
    return;
  }

  // For all other requests, try cache first with network fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // No cache match - fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // For some requests (like images) we might want to serve a fallback
            if (event.request.headers.get('accept').includes('image')) {
              return caches.match('/public/assets/images/fallback-bg.jpg');
            }
            return new Response('Offline content unavailable', { status: 503 });
          });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});