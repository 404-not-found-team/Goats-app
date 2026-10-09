// Közös képtömörítő (FELADAT12). Minden képfeltöltés ezt használja, dinamikus import()-tal
// töltődik be az első feltöltéskor.
// - Betöltés createImageBitmap(..., { imageOrientation: 'from-image' })-gel: az EXIF-forgatás
//   érvényesül, a vászonra rajzolás után pedig semmilyen metaadat (EXIF, GPS) nem kerül a kimenetbe.
// - Méret: a rövidebb oldal legfeljebb a kijelzett méret 2×-ese (a galéria 180 px-es négyzetre vágja
//   a képet, így 360 px), a hosszabb oldal legfeljebb 720 px.
// - Kimenet: WebP (ha a böngésző nem tud WebP-t kódolni, JPEG), célméret 100 KB, kemény korlát 150 KB.

export const MAX_HOSSZABB_OLDAL = 720;
export const MAX_ROVIDEBB_OLDAL = 360;   // a galéria legnagyobb kijelzett mérete (180 px) 2×-ese
export const MIN_HOSSZABB_OLDAL = 480;   // ennél kisebbre a méretcsökkentő lépés nem megy
export const CEL_MERET = 100 * 1024;
export const KEMENY_KORLAT = 150 * 1024; // a bucket file_size_limit-je is ennyi
export const MAX_BEMENET = 15 * 1024 * 1024;

const WEBP_KEZDO_MINOSEG = 0.65;
const JPEG_KEZDO_MINOSEG = 0.6;
const MIN_MINOSEG = 0.4;
const MINOSEG_LEPES = 0.05;
const MERET_LEPES = 0.9;

const HEIC_FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';

// Felhasználónak szóló hiba (a hívó a message-et mutatja)
export class KepHiba extends Error {}

function heicE(fajl) {
    const tipus = (fajl.type || '').toLowerCase();
    const kiterjesztes = (String(fajl.name || '').split('.').pop() || '').toLowerCase();
    return tipus.includes('heic') || tipus.includes('heif') || ['heic', 'heif'].includes(kiterjesztes);
}

function kepTipusE(fajl) {
    return (fajl.type || '').toLowerCase().startsWith('image/') || heicE(fajl);
}

// Animált GIF: egynél több grafikai vezérlő blokk, amit közvetlenül képkocka követ.
// Egyszerű bájtminta-keresés; a fájl első 4 MB-ja elég a döntéshez.
async function animaltGifE(fajl) {
    if ((fajl.type || '').toLowerCase() !== 'image/gif') return false;
    const bajtok = new Uint8Array(await fajl.slice(0, 4 * 1024 * 1024).arrayBuffer());
    let kepkockak = 0;
    // Blokk: 21 F9 04 <jelzők> <késleltetés 2 bájt> <átlátszó index> 00, utána 2C (képleíró)
    for (let i = 0; i < bajtok.length - 8; i++) {
        if (bajtok[i] === 0x21 && bajtok[i + 1] === 0xF9 && bajtok[i + 2] === 0x04
            && bajtok[i + 7] === 0x00 && bajtok[i + 8] === 0x2C) {
            if (++kepkockak > 1) return true;
        }
    }
    return false;
}

function dekodolasImg(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new KepHiba('A böngésző nem tudta beolvasni a képet.')); };
        img.src = url;
    });
}

function dekodolas(blob) {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(() => dekodolasImg(blob));
    }
    return dekodolasImg(blob);
}

// Csak akkor töltjük be a heic2any-t, ha a böngésző maga nem tudja dekódolni a HEIC-et
function heicKonvertalo() {
    if (window.heic2any) return Promise.resolve(window.heic2any);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = HEIC_FALLBACK_URL;
        script.onload = () => resolve(window.heic2any);
        script.onerror = () => reject(new KepHiba('A HEIC-kép átalakítója nem tölthető be.'));
        document.head.appendChild(script);
    });
}

async function forrasBetoltes(fajl) {
    try {
        return await dekodolas(fajl);
    } catch (hiba) {
        if (!heicE(fajl)) throw hiba;
        const heic2any = await heicKonvertalo();
        const kimenet = await heic2any({ blob: fajl, toType: 'image/jpeg', quality: 0.9 });
        return dekodolas(Array.isArray(kimenet) ? kimenet[0] : kimenet);
    }
}

// A kezdő hosszabb oldal: a rövidebb oldal legfeljebb MAX_ROVIDEBB_OLDAL, a hosszabb legfeljebb
// MAX_HOSSZABB_OLDAL, és nagyítani soha nem nagyítunk
function kezdoHosszabbOldal(w, h) {
    const hosszabb = Math.max(w, h);
    const rovidebb = Math.min(w, h);
    const rovidebbSzerint = hosszabb * (MAX_ROVIDEBB_OLDAL / rovidebb);
    return Math.round(Math.min(hosszabb, MAX_HOSSZABB_OLDAL, rovidebbSzerint));
}

function vaszonra(forras, w, h, hosszabbOldal) {
    const arany = Math.min(1, hosszabbOldal / Math.max(w, h));
    const vaszon = document.createElement('canvas');
    vaszon.width = Math.max(1, Math.round(w * arany));
    vaszon.height = Math.max(1, Math.round(h * arany));
    const ctx = vaszon.getContext('2d');
    ctx.fillStyle = '#ffffff'; // átlátszó forrásnál is értelmes háttér (JPEG-nél kötelező)
    ctx.fillRect(0, 0, vaszon.width, vaszon.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(forras, 0, 0, vaszon.width, vaszon.height);
    return vaszon;
}

function kodolas(vaszon, tipus, minoseg) {
    return new Promise(r => vaszon.toBlob(r, tipus, minoseg));
}

// A böngésző tud-e WebP-t kódolni (a Safari régebbi verziói PNG-t adnak vissza helyette)
let webpTamogatott = null;
async function webpKodolhato() {
    if (webpTamogatott === null) {
        const proba = document.createElement('canvas');
        proba.width = proba.height = 2;
        const blob = await kodolas(proba, 'image/webp', 0.5);
        webpTamogatott = !!blob && blob.type === 'image/webp';
    }
    return webpTamogatott;
}

/**
 * Egy képfájl tömörítése feltöltéshez.
 * @returns {Promise<{blob: Blob, kiterjesztes: string, szelesseg: number, magassag: number}>}
 * @throws {KepHiba} érthető magyar üzenettel, ha a kép nem tölthető fel
 */
export async function kepTomorites(fajl) {
    if (!fajl || fajl.size === 0) throw new KepHiba('A fájl üres vagy sérült.');
    if (!kepTipusE(fajl)) throw new KepHiba('Csak képfájl tölthető fel.');
    if (fajl.size > MAX_BEMENET) {
        throw new KepHiba(`A kép túl nagy (${(fajl.size / 1048576).toFixed(1)} MB). Legfeljebb 15 MB-os képet válassz.`);
    }
    if (await animaltGifE(fajl)) {
        throw new KepHiba('Animált GIF nem tölthető fel (csak az első képkocka maradna meg).');
    }

    const forras = await forrasBetoltes(fajl);
    const w = forras.naturalWidth || forras.width;
    const h = forras.naturalHeight || forras.height;
    if (!w || !h) throw new KepHiba('A kép mérete nem olvasható.');

    const webp = await webpKodolhato();
    const tipus = webp ? 'image/webp' : 'image/jpeg';
    const kezdoMinoseg = webp ? WEBP_KEZDO_MINOSEG : JPEG_KEZDO_MINOSEG;
    const minHosszabb = Math.min(MIN_HOSSZABB_OLDAL, Math.max(w, h));

    let hosszabbOldal = kezdoHosszabbOldal(w, h);
    let legjobb = null;
    for (;;) {
        const vaszon = vaszonra(forras, w, h, hosszabbOldal);
        for (let minoseg = kezdoMinoseg; minoseg >= MIN_MINOSEG - 1e-9; minoseg -= MINOSEG_LEPES) {
            const blob = await kodolas(vaszon, tipus, minoseg);
            if (!blob || blob.size === 0) throw new KepHiba('A kép tömörítése nem sikerült.');
            legjobb = { blob, szelesseg: vaszon.width, magassag: vaszon.height };
            if (blob.size <= CEL_MERET) break;
        }
        if (legjobb.blob.size <= CEL_MERET || hosszabbOldal <= minHosszabb) break;
        hosszabbOldal = Math.max(minHosszabb, Math.round(hosszabbOldal * MERET_LEPES));
    }
    if (typeof forras.close === 'function') forras.close();

    if (legjobb.blob.size > KEMENY_KORLAT) {
        throw new KepHiba('A kép tömörítés után is túl nagy (legfeljebb 150 KB lehet), ezért nem töltöttük fel.');
    }
    return { ...legjobb, kiterjesztes: webp ? 'webp' : 'jpg' };
}
