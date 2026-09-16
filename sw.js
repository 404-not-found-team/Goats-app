self.addEventListener('install', (event) => {
    // Azonnal aktiváljuk az új Service Workert, ne várakozzon
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Átveszi az irányítást az összes nyitott ablak felett
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Hálózati kérés frissítéssel (bypass browser HTTP cache)
    event.respondWith(
        fetch(event.request, { cache: 'no-cache' }).catch(() => caches.match(event.request))
    );
});