// Cache verzió: minden éles kiadás után EMELD (pl. 'goats-v8'), hogy a felhasználók
// eszközén a régi, lecserélt fájlok biztosan frissüljenek.
const CACHE_NEV = 'goats-v13';

// Előgyorsítótár: az alkalmazás váza, hogy az első oldalváltás is gyors legyen.
// Egyesével töltjük: ha egy fájl hiányzik, a telepítés attól még sikeres marad.
// FELADAT8 3. pont: index.html (kijelentkezett) és app.html (bejelentkezett) is itt van.
const ELOGYORSITOTT = [
    './',
    'index.html',
    'app.html',
    'ranglista.html',
    'tartozasok.html',
    'tervek.html',
    'goatsgame.html',
    'css/main.css',
    'js/main.js',
    'js/supabase-client.js',
    'js/hitelesites.js',
    'js/elemek/nav-bar.js',
    'js/pages/bejelentkezes-oldal.js',
    'js/pages/app-orzo.js',
    'js/segedek/teljesitmeny.js',
    'js/segedek/tema.js',
    'manifest.json',
];

// Navigációnál a hálózatra várunk ennyit, utána a gyorsítótárt mutatjuk
const NAVIGACIO_IDOKORLAT_MS = 2000;

// A saját domain és a CDN-ek statikus fájljai: "stale-while-revalidate"
const STATIKUS_HOSTOK = new Set(['cdn.jsdelivr.net', 'cdnjs.cloudflare.com']);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NEV).then((cache) =>
            Promise.all(ELOGYORSITOTT.map((fajl) => cache.add(fajl).catch(() => null)))
        )
    );
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

// A hálózati választ időkorláttal kérjük le (navigációhoz)
function halozatIdokorlattal(keres, ms) {
    return new Promise((siker, hiba) => {
        const ido = setTimeout(() => hiba(new Error('időtúllépés')), ms);
        fetch(keres, { cache: 'no-cache' }).then(
            (valasz) => { clearTimeout(ido); siker(valasz); },
            (err) => { clearTimeout(ido); hiba(err); }
        );
    });
}

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

    // Oldalnavigáció: a hálózatot 2 másodpercig várjuk, utána a gyorsítótár a válasz
    if (event.request.mode === 'navigate') {
        event.respondWith(
            halozatIdokorlattal(event.request, NAVIGACIO_IDOKORLAT_MS)
                .then((valasz) => {
                    if (valasz && valasz.ok) {
                        const masolat = valasz.clone();
                        caches.open(CACHE_NEV).then((cache) => cache.put(event.request, masolat));
                    }
                    return valasz;
                })
                .catch(() => caches.match(event.request).then((v) => v || fetch(event.request)))
        );
        return;
    }

    // Saját statikus fájlok és a CDN-ek: azonnal a gyorsítótárból, a háttérben frissítjük
    if (url.origin === self.location.origin || STATIKUS_HOSTOK.has(url.hostname)) {
        event.respondWith(
            caches.open(CACHE_NEV).then((cache) =>
                cache.match(event.request).then((gyorsitott) => {
                    const frissites = fetch(event.request, { cache: 'no-cache' })
                        .then((valasz) => {
                            if (valasz && valasz.ok) cache.put(event.request, valasz.clone());
                            return valasz;
                        })
                        .catch(() => null);
                    return gyorsitott || frissites.then((valasz) => valasz || Response.error());
                })
            )
        );
    }
    // Minden más (pl. egyéb harmadik fél) a böngésző normál útját követi
});
