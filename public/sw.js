self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('All caches deleted by Kill Switch SW');
            return self.clients.claim(); // Take control of all clients immediately
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Pass through all requests, do not cache anything
    event.respondWith(fetch(event.request));
});
