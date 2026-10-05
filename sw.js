// Cache verzió: minden éles kiadás után EMELD (pl. 'goats-v3'), hogy a felhasználók
// eszközén a régi, lecserélt fájlok biztosan frissüljenek.
const CACHE_NEV = 'goats-v2';

self.addEventListener('install', (event) => {
    // Azonnal aktiváljuk az új Service Workert, ne várakozzon
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((kulcsok) =>
            Promise.all(kulcsok.filter((k) => k !== CACHE_NEV).map((k) => caches.delete(k)))
        ).then(() => clients.claim()) // Átveszi az irányítást az összes nyitott ablak felett
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // A Supabase (auth, adatbázis, storage) kéréseket SOHA ne cache-eljük:
    // a válaszuk felhasználónként/pillanatonként eltér, egy elcache-elt session
    // vagy csoportadat komoly hibákhoz vezetne.
    const supabaseKeres = url.hostname.endsWith('.supabase.co');
    if (supabaseKeres || event.request.method !== 'GET') {
        event.respondWith(fetch(event.request, { cache: 'no-cache' }));
        return;
    }

    // Egyéb (saját domain + CDN) kérések: hálózat elsőként, offline/hibás
    // hálózat esetén a korábban elmentett válasz a tartalék.
    event.respondWith(
        fetch(event.request, { cache: 'no-cache' })
            .then((valasz) => {
                if (valasz && valasz.ok) {
                    const masolat = valasz.clone();
                    caches.open(CACHE_NEV).then((cache) => cache.put(event.request, masolat));
                }
                return valasz;
            })
            .catch(() => caches.match(event.request))
    );
});
