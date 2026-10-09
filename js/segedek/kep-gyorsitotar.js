// Galériaképek helyi gyorsítótára (FELADAT12).
// A kepek bucket privát, a megjelenítéshez aláírt URL kell, ami minden aláíráskor új, így a böngésző
// HTTP-cache-e nem segít. Ezért a letöltött képet a Cache Storage-ban tároljuk az útvonal alapján
// (a fájlok soha nem módosulnak, mindig új útvonalra töltünk fel), és a következő megnyitáskor
// onnan, blob URL-ként jelenítjük meg. Egy képet így eszközönként csak egyszer töltünk le.
// - Aláírás csak a hiányzó képekre, egy kötegelt createSignedUrls hívással, rövid lejárattal.
// - Korlát: legfeljebb MAX_DARAB kép vagy MAX_BAJT, a legrégebben használt törlődik (LRU).
//   A használati időket egy kis localStorage-index tárolja.
// - Kijelentkezéskor a hitelesites.js üríti (uritKepGyorsitotar).
// - Ha a Cache Storage nem érhető el (pl. privát mód), az aláírt URL-t használjuk közvetlenül.
// Modul: a main.js importálja, a klasszikus galeria.js a window.goatsKepGyorsitotar-on éri el.
import { client } from '../supabase-client.js';

const CACHE_NEV = 'goats-kepek-v1';
const INDEX_KULCS = 'goats_kep_cache_index';
const BUCKET = 'kepek';
const MAX_DARAB = 150;
const MAX_BAJT = 20 * 1024 * 1024;
const ALAIRAS_LEJARAT_MP = 120; // csak a letöltés idejére kell

// A Cache Storage kulcsa: belső, soha le nem kért URL (a service worker nem találkozik vele)
const kulcsUrl = (utvonal) => new URL(`__kep-gyorsitotar/${encodeURIComponent(utvonal)}`, self.location.origin).href;

// Az ebben a munkamenetben már létrehozott blob URL-ek (útvonal -> object URL)
const blobUrlek = new Map();

function indexOlvas() {
    try { return JSON.parse(localStorage.getItem(INDEX_KULCS) || '{}'); } catch { return {}; }
}

function indexIr(index) {
    try { localStorage.setItem(INDEX_KULCS, JSON.stringify(index)); } catch { /* nem kritikus */ }
}

async function cacheNyitas() {
    try {
        return 'caches' in self ? await caches.open(CACHE_NEV) : null;
    } catch {
        return null;
    }
}

function blobUrl(utvonal, blob) {
    const regi = blobUrlek.get(utvonal);
    if (regi) return regi;
    const url = URL.createObjectURL(blob);
    blobUrlek.set(utvonal, url);
    return url;
}

// A korlát feletti, legrégebben használt képek törlése (a most megjelenítetteket megkímélve)
async function takaritas(cache, index, kimelt) {
    const sorrend = Object.entries(index).sort((a, b) => a[1].t - b[1].t);
    let darab = sorrend.length;
    let bajt = sorrend.reduce((s, [, e]) => s + (e.b || 0), 0);
    for (const [utvonal, e] of sorrend) {
        if (darab <= MAX_DARAB && bajt <= MAX_BAJT) break;
        if (kimelt.has(utvonal)) continue;
        await cache.delete(kulcsUrl(utvonal)).catch(() => {});
        const url = blobUrlek.get(utvonal);
        if (url) { URL.revokeObjectURL(url); blobUrlek.delete(utvonal); }
        delete index[utvonal];
        darab--;
        bajt -= e.b || 0;
    }
}

/**
 * A megadott útvonalú képek megjeleníthető URL-jei (blob URL, vagy tartalékként aláírt URL).
 * @param {string[]} utvonalak
 * @returns {Promise<Map<string, string>>} útvonal -> URL (ami nem tölthető be, kimarad)
 */
export async function kepUrlek(utvonalak) {
    const eredmeny = new Map();
    const egyedi = [...new Set(utvonalak.filter(Boolean))];
    if (egyedi.length === 0) return eredmeny;

    const cache = await cacheNyitas();
    const index = indexOlvas();
    const most = Date.now();
    const hianyzo = [];

    for (const utvonal of egyedi) {
        if (blobUrlek.has(utvonal)) {
            eredmeny.set(utvonal, blobUrlek.get(utvonal));
            if (index[utvonal]) index[utvonal].t = most;
            continue;
        }
        const talalat = cache ? await cache.match(kulcsUrl(utvonal)).catch(() => null) : null;
        if (talalat) {
            const blob = await talalat.blob();
            eredmeny.set(utvonal, blobUrl(utvonal, blob));
            index[utvonal] = { t: most, b: blob.size };
        } else {
            hianyzo.push(utvonal);
        }
    }

    if (hianyzo.length > 0) {
        const { data, error } = await client.storage.from(BUCKET).createSignedUrls(hianyzo, ALAIRAS_LEJARAT_MP);
        if (error) {
            console.error('Hiba a képek aláírásakor:', error);
        } else {
            await Promise.all((data || []).map(async (a) => {
                if (!a.signedUrl || a.error) return;
                if (!cache) { eredmeny.set(a.path, a.signedUrl); return; }
                try {
                    const valasz = await fetch(a.signedUrl);
                    if (!valasz.ok) throw new Error(`HTTP ${valasz.status}`);
                    const blob = await valasz.blob();
                    await cache.put(kulcsUrl(a.path), new Response(blob, {
                        headers: { 'Content-Type': blob.type || 'image/webp' }
                    }));
                    index[a.path] = { t: most, b: blob.size };
                    eredmeny.set(a.path, blobUrl(a.path, blob));
                } catch (err) {
                    console.warn('A kép helyi mentése nem sikerült, aláírt URL-lel jelenítjük meg:', err);
                    eredmeny.set(a.path, a.signedUrl);
                }
            }));
        }
    }

    if (cache) await takaritas(cache, index, new Set(egyedi));
    indexIr(index);
    return eredmeny;
}

// Egy kép eltávolítása a helyi tárból (törléskor)
export async function torolKepGyorsitotarbol(utvonal) {
    const url = blobUrlek.get(utvonal);
    if (url) { URL.revokeObjectURL(url); blobUrlek.delete(utvonal); }
    const index = indexOlvas();
    delete index[utvonal];
    indexIr(index);
    const cache = await cacheNyitas();
    if (cache) await cache.delete(kulcsUrl(utvonal)).catch(() => {});
}

// A teljes helyi képtár ürítése (kijelentkezéskor)
export async function uritKepGyorsitotar() {
    blobUrlek.forEach(url => URL.revokeObjectURL(url));
    blobUrlek.clear();
    try { localStorage.removeItem(INDEX_KULCS); } catch { /* nem kritikus */ }
    try { if ('caches' in self) await caches.delete(CACHE_NEV); } catch { /* nem kritikus */ }
}

window.goatsKepGyorsitotar = { kepUrlek, torolKepGyorsitotarbol, uritKepGyorsitotar };
