// Cache verzió: minden éles kiadás után EMELD (pl. 'goats-v3'), hogy a felhasználók
// eszközén a régi, lecserélt fájlok biztosan frissüljenek.
const CACHE_NEV = 'goats-v3';

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

    // Az auth/adatbázis (REST/RPC) hívásokat SOHA ne cache-eljük: a válaszuk
    // felhasználónként/pillanatonként eltér, egy elcache-elt session vagy
    // csoportadat komoly hibákhoz vezetne.
    const supabaseApiKeres = url.hostname.endsWith('.supabase.co')
        && (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/rest/'));
    if (supabaseApiKeres || event.request.method !== 'GET') {
        event.respondWith(fetch(event.request, { cache: 'no-cache' }));
        return;
    }

    // A Supabase Storage fájlok (galéria képek) egyedi, soha nem újrahasznált
    // fájlnévvel kerülnek fel - ezeket a böngésző normál HTTP cache-ére bízzuk
    // (nem avatkozunk bele), különben minden oldalbetöltéskor újra letöltődnének
    // a Supabase CDN-jéről (ez hajtotta fel a "Cached Egress" kvótát).
    const supabaseStorageKeres = url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/');
    if (supabaseStorageKeres) {
        return; // nincs event.respondWith hívás -> a böngésző a sima, SW nélküli utat követi
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
