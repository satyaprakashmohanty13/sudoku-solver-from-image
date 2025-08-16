const CACHE_NAME = 'sudoku-solver-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  '/logo.svg',
  '/facebook.svg',
  '/instagram.svg',
  '/twitter.svg',
  '/pinterest.svg',
  '/youtube.svg',
  '/email.svg',
  '/share.svg',
  '/whatsapp.svg',
  '/fb.svg',
  '/ins.svg',
  '/telegram.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use a more robust caching strategy that ignores search parameters for external resources
        const cachePromises = urlsToCache.map(urlToCache => {
          const url = new URL(urlToCache, self.location.origin);
          // For cross-origin requests, we need to use 'no-cors' mode, but this can be tricky.
          // A simple addAll should work for most cases, but let's handle potential failures.
          return cache.add(new Request(url, {mode: 'no-cors'})).catch(err => {
            console.warn(`Failed to cache ${urlToCache}:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              // For cross-origin resources, the response type will be 'opaque'.
              // We can cache opaque responses, but we can't inspect them.
              if (response.type === 'opaque') {
                 const responseToCache = response.clone();
                 caches.open(CACHE_NAME)
                   .then(cache => {
                     cache.put(event.request, responseToCache);
                   });
              }
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
