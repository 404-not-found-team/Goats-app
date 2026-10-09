if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker regisztrálva'));
}

const BUCKET_NEV = 'kepek';

// Főoldali galéria: csak lapozható nézegető, kis képekkel (nagyítás nincs, FELADAT12).
// Feltöltés, törlés, jelentés és a feltöltő neve a Képek oldalon van (kepek.html, js/pages/kepek.js).
// A képeket a helyi gyorsítótár (js/segedek/kep-gyorsitotar.js) adja blob URL-ként.

let kepekLista = []; // { name, path } elemek
let currentIndex = 0;
let megjelenitesSorszam = 0; // gyors lapozásnál a régebbi, később befutó betöltést eldobjuk

// aktualisGroupCode(): lásd js/segedek/csoport-kod.js (közös, minden klasszikus oldalscript használja)

// A képek mappája a csoport azonosítója (groups.id), a kódcsere után sem változik
function aktualisGroupId() {
    return window.goatsAuth?.getState()?.group?.id || null;
}

// A korábbi, sessionStorage-os aláírtURL-gyorsítótár maradványa (FELADAT12 óta nem használjuk)
try { sessionStorage.removeItem('goats_kep_url'); } catch { /* nem kritikus */ }

async function betoltKepek() {
    const groupId = aktualisGroupId();
    const groupCode = aktualisGroupCode();

    if (!groupId) {
        kepekLista = [];
        frissitGaleria();
        return;
    }

    // A csoport mappái: a csoport azonosítója (és átmenetileg a régi, kód alapú mappa)
    const utak = [];
    for (const mappa of window.goatsKepek.csoportMappak(groupId, groupCode)) {
        try {
            utak.push(...await window.goatsKepek.mappaFajljai(mappa));
        } catch (error) {
            console.error('Hiba a képek listázásakor:', error);
        }
    }

    kepekLista = utak.map(u => ({ name: u.split('/').pop(), path: u }));

    if (currentIndex >= kepekLista.length) {
        currentIndex = Math.max(0, kepekLista.length - 1);
    }

    frissitGaleria();
}

function uresAllapot(lathato) {
    const placeholder = document.getElementById('galeria-placeholder');
    if (!placeholder) return;
    placeholder.hidden = !lathato;
    if (lathato && !placeholder.hasChildNodes()) {
        const ikon = document.createElement('span');
        ikon.className = 'ures-ikon';
        ikon.textContent = '🖼️';
        const cim = document.createElement('p');
        cim.className = 'ures-cim';
        cim.textContent = 'Még nincsenek képek';
        const leiras = document.createElement('span');
        leiras.className = 'ures-leiras';
        leiras.textContent = 'Képet a Képek oldalon tölthetsz fel.';
        placeholder.append(ikon, cim, leiras);
    }
}

function frissitGaleria() {
    if (!aktualisGroupId()) return;

    const vanKep = kepekLista.length > 0;
    document.querySelectorAll('.kepek .galeria-kep, .kepek .nyil').forEach(el => { el.hidden = !vanKep; });
    uresAllapot(!vanKep);
    if (!vanKep) return;

    const balIndex = (currentIndex - 1 + kepekLista.length) % kepekLista.length;
    const jobbIndex = (currentIndex + 1) % kepekLista.length;
    const aktualis = kepekLista[currentIndex];

    kepekMegjelenitese([
        ['kepBal', kepekLista[balIndex]],
        ['kepKozep', aktualis],
        ['kepJobb', kepekLista[jobbIndex]],
    ]);
}

// A három látható kép betöltése a helyi gyorsítótárból (hiányzónál egy aláírás + letöltés)
async function kepekMegjelenitese(parok) {
    const sorszam = ++megjelenitesSorszam;
    let urlek;
    try {
        urlek = await window.goatsKepGyorsitotar.kepUrlek(parok.map(([, kep]) => kep.path));
    } catch (err) {
        console.error('Hiba a képek betöltésekor:', err);
        return;
    }
    if (sorszam !== megjelenitesSorszam) return;
    parok.forEach(([id, kep]) => {
        const elem = document.getElementById(id);
        if (!elem) return;
        const url = urlek.get(kep.path);
        if (url) elem.src = url;
        else elem.removeAttribute('src');
    });
}

function eloKep() {
    if (kepekLista.length === 0) return;
    currentIndex = (currentIndex + 1) % kepekLista.length;
    frissitGaleria();
}

function kovKep() {
    if (kepekLista.length === 0) return;
    currentIndex = (currentIndex - 1 + kepekLista.length) % kepekLista.length;
    frissitGaleria();
}

// Az "Összes kép" link csak akkor látszik, ha a csoportnál a Képek oldal engedélyezett
function osszesKepLinkFrissites() {
    const link = document.getElementById('osszesKepLink');
    const oldalak = window.goatsAuth?.getState()?.group?.enabled_pages;
    if (link) link.hidden = !aktualisGroupId() || (Array.isArray(oldalak) && !oldalak.includes('kepek'));
}

document.addEventListener("DOMContentLoaded", async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    osszesKepLinkFrissites();
    betoltKepek();
});
