// Cache verzió: minden éles kiadás után EMELD (pl. 'goats-v8'), hogy a felhasználók
// eszközén a régi, lecserélt fájlok biztosan frissüljenek.
const CACHE_NEV = 'goats-v57';

// Előgyorsítótár: az alkalmazás összes oldala, szkriptje és stíluslapja, hogy már az első
// indítás után minden oldal azonnal (és offline is) betöltsön. Új fájl felvételekor ide is írd be
// (ha kimarad, az első használatkor a futás közbeni gyorsítótárba kerül, csak lassabban).
// Egyesével töltjük: ha egy fájl hiányzik, a telepítés attól még sikeres marad.
const ELOGYORSITOTT = [
    './',
    'index.html',
    'app.html',
    'ranglista.html',
    'tartozasok.html',
    'tervek.html',
    'kepek.html',
    'admin.html',
    'goatsgame.html',
    'jatekszabalyok.html',
    'jogi.html',
    'privacy.html',
    'felhasznalasi-feltetelek.html',
    'fiok-torles.html',
    'tesztelok.html',
    'favicon.ico',
    'img/favicon-192.png',
    'css/base/segedosztalyok.css',
    'css/base/valtozok.css',
    'css/base/visszaallitas.css',
    'css/elemek/ital-szinezes.css',
    'css/elemek/lebego-cimke.css',
    'css/elemek/lenyilo-menu.css',
    'css/elemek/modals.css',
    'css/elemek/navbar.css',
    'css/elemek/tartozasok-egyenlitese.css',
    'css/elemek/telepites.css',
    'css/elemek/valaszto-kartyak.css',
    'css/kulso/fontawesome-6.5.1/css/fontawesome.min.css',
    'css/kulso/fontawesome-6.5.1/css/solid.min.css',
    'css/kulso/fontawesome-6.5.1/webfonts/fa-solid-900.woff2',
    'css/main.css',
    'css/pages/admin.css',
    'css/pages/bejelentkezes.css',
    'css/pages/fooldal.css',
    'css/pages/goatsgame.css',
    'css/pages/jatekszabalyok.css',
    'css/pages/jogi.css',
    'css/pages/kepek.css',
    'css/pages/ranglista.css',
    'css/pages/tartozasok.css',
    'css/pages/tervek.css',
    'css/pages/tesztelok.css',
    'js/admin-muveletek.js',
    'js/elemek/beallitasok-modal.js',
    'js/elemek/beallitasok/beallitasok-sablonok.js',
    'js/elemek/beallitasok/belepes-modal.js',
    'js/elemek/beallitasok/csoport-adatok.js',
    'js/elemek/beallitasok/profil-modal.js',
    'js/elemek/beallitasok/tema-valaszto.js',
    'js/elemek/beallitasok/nyelv-valaszto.js',
    'js/elemek/beallitasok/ertesitesek.js',
    'js/elemek/beallitasok/google-naptar.js',
    'js/elemek/ertesites-felajanlas.js',
    'js/elemek/beallitasok/tos-ujraelfogadas.js',
    'js/elemek/galeria.js',
    'js/elemek/kep-kivago.js',
    'js/elemek/naptar.js',
    'js/elemek/nav-bar.js',
    'js/elemek/tartozasok-egyenlitese.js',
    'js/hitelesites.js',
    'js/main.js',
    'js/pages/admin-javaslatok.js',
    'js/pages/admin-kategoriak.js',
    'js/pages/admin-jelentesek.js',
    'js/pages/admin-szinek.js',
    'js/pages/admin.js',
    'js/pages/app-orzo.js',
    'js/pages/bejelentkezes-oldal.js',
    'js/pages/goatsgame.js',
    'js/pages/jatekszabalyok.js',
    'js/pages/kepek.js',
    'js/pages/ranglista.js',
    'js/pages/tartozasok.js',
    'js/pages/tervek.js',
    'js/pages/tesztelok.js',
    'js/pages/tesztelok-ujdonsagok.js',
    'js/segedek/adat-gyorsitotar.js',
    'js/segedek/csoport-kepek.js',
    'js/segedek/csoport-kod.js',
    'js/segedek/funkcio-kapcsolo.js',
    'js/segedek/gyors-atiranyitas.js',
    'js/segedek/html-esemenyek.js',
    'js/segedek/ital-kategoriak.js',
    'js/segedek/ital-kep.js',
    'js/segedek/kep-gyorsitotar.js',
    'js/segedek/kep-tomorites.js',
    'js/segedek/keslelteto.js',
    'js/segedek/modal-fokusz.js',
    'js/segedek/oldal-orzo.js',
    'js/segedek/nyelv.js',
    'js/segedek/oldalak.js',
    'js/segedek/sw-regisztracio.js',
    'js/segedek/szin-osztaly.js',
    'js/segedek/teljesitmeny.js',
    'js/segedek/tema.js',
    'js/kulso/supabase-js-2.117.2.js',
    'js/supabase-client.js',
    'manifest.json',
    'img/icon-192.png',
    'img/ertesites-jelveny.png',
    'img/zaszlok/en.svg',
    'img/zaszlok/hu.svg',
    'nyelvek/en.json',
    'nyelvek/hu.json',
];

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
            // a galériaképek helyi tárát (goats-kepek-*) a kep-gyorsitotar.js kezeli, azt nem töröljük
            Promise.all(kulcsok
                .filter((k) => k !== CACHE_NEV && !k.startsWith('goats-kepek-'))
                .map((k) => caches.delete(k)))
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

    // A Supabase Storage kéréseket (aláírt kép-URL-ek) nem cache-eljük: az aláírt URL
    // minden aláíráskor új, így a cache-ben csak felhalmozódna. A galériaképeket a
    // js/segedek/kep-gyorsitotar.js tárolja a saját Cache Storage-ában (goats-kepek-v1)
    // az útvonal alapján, a SW ezt nem kezeli és nem is törli (lásd activate).
    const supabaseStorageKeres = url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/');
    if (supabaseStorageKeres) {
        return; // nincs event.respondWith hívás -> a böngésző a sima, SW nélküli utat követi
    }

    // Oldalnavigáció: azonnal a gyorsítótárból (nincs fekete képernyő a hálózatra várva), a háttérben
    // frissítjük; a friss HTML a következő megnyitáskor látszik. Gyorsítótár nélkül a hálózat a válasz.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE_NEV).then((cache) =>
                cache.match(event.request, { ignoreSearch: true }).then((gyorsitott) => {
                    const frissites = fetch(event.request, { cache: 'no-cache' })
                        .then((valasz) => {
                            if (valasz && valasz.ok && !valasz.redirected) cache.put(event.request, valasz.clone());
                            return valasz;
                        })
                        .catch(() => null);
                    if (gyorsitott) {
                        event.waitUntil(frissites);
                        return gyorsitott;
                    }
                    return frissites.then((valasz) => valasz || Response.error());
                })
            )
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

// ---------- Push-értesítések (supabase/functions/push-kuldes küldi) ----------
// A tartalom JSON: { cim, szoveg, url, tag }. Az url az app egyik oldala (relatív, pl. "tartozasok.html").
self.addEventListener('push', (event) => {
    let adat = {};
    try { adat = event.data ? event.data.json() : {}; } catch { adat = { szoveg: event.data?.text() || '' }; }
    const cim = adat.cim || 'ATG';
    event.waitUntil(self.registration.showNotification(cim, {
        body: adat.szoveg || '',
        icon: 'img/icon-192.png',
        // a státuszsorban az Android csak az átlátszóságot nézi: fehér sziluett átlátszó háttéren kell
        badge: 'img/ertesites-jelveny.png',
        tag: adat.tag || undefined,
        data: { url: adat.url || 'app.html' },
    }));
});

// Koppintásra: ha az app már nyitva van, azt hozza előre és oda navigál; különben új ablakot nyit
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const cel = new URL(event.notification.data?.url || 'app.html', self.registration.scope).href;
    event.waitUntil((async () => {
        const ablakok = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const nyitott = ablakok.find(a => a.url.startsWith(self.registration.scope));
        if (nyitott) {
            await nyitott.focus();
            if (nyitott.url !== cel && 'navigate' in nyitott) await nyitott.navigate(cel);
            return;
        }
        await self.clients.openWindow(cel);
    })());
});
