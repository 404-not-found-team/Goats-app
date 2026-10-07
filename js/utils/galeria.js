if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker regisztrálva'));
}

const BUCKET_NEV = 'kepek';

// KORLÁTOZÁSOK SETTINGS
const MAX_FAJL_MERET_MB = 10;
const ENGEDELYEZETT_TIPUSOK = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
];

let kepekLista = []; // { name: 'fajlnev.jpg', url: 'https://...' } elemeket tárol
let currentIndex = 0;

function aktualisGroupCode() {
    return window.goatsAuth?.getState()?.group?.group_code || localStorage.getItem('goats_group_code');
}

// A képek mappája a csoport azonosítója (groups.id), a kódcsere után sem változik
function aktualisGroupId() {
    return window.goatsAuth?.getState()?.group?.id || null;
}

// Aláírt URL-ek (privát bucket). A böngésző ugyanazt az URL-t használja, így a képeket
// a normál HTTP cache-ből szolgálja ki (egy új aláírás új URL, azaz cache-miss lenne).
const KEP_LEJARAT_MP = 60 * 60 * 24;       // 1 nap
const KEP_UJRA_ALAIRAS_MS = 60 * 60 * 1000; // ha 1 óránál kevesebb van hátra, újra aláírjuk
const KEP_GYORSITOTAR_KULCS = 'goats_kep_url';

function kepGyorsitotarOlvas() {
    try { return JSON.parse(sessionStorage.getItem(KEP_GYORSITOTAR_KULCS) || '{}'); } catch { return {}; }
}

function kepGyorsitotarIr(map) {
    try { sessionStorage.setItem(KEP_GYORSITOTAR_KULCS, JSON.stringify(map)); } catch { /* nem kritikus */ }
}

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

    // Aláírt URL-ek: a hiányzókat egy hívással írjuk alá, a többit a gyorsítótárból vesszük
    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const gyorsitotar = kepGyorsitotarOlvas();
    const most = Date.now();
    const hianyzo = utak.filter(u => !gyorsitotar[u] || gyorsitotar[u].lejar - most < KEP_UJRA_ALAIRAS_MS);

    if (hianyzo.length > 0) {
        const { data: alairt, error: alairasHiba } = await client
            .storage
            .from(BUCKET_NEV)
            .createSignedUrls(hianyzo, KEP_LEJARAT_MP);

        if (alairasHiba) {
            console.error('Hiba az aláírt URL-ek készítésekor:', alairasHiba);
        } else {
            alairt.forEach(a => {
                if (a.signedUrl && !a.error) {
                    gyorsitotar[a.path] = { url: a.signedUrl, lejar: most + KEP_LEJARAT_MP * 1000 };
                }
            });
            kepGyorsitotarIr(gyorsitotar);
        }
    }

    kepekLista = utak
        .filter(u => gyorsitotar[u])
        .map(u => ({ name: u.split('/').pop(), path: u, url: gyorsitotar[u].url }));

    if (currentIndex >= kepekLista.length) {
        currentIndex = Math.max(0, kepekLista.length - 1);
    }

    frissitGaleria();
}

function frissitGaleria() {
    const groupId = aktualisGroupId();
    if (!groupId) return;

    const elemBal = document.getElementById("kepBal");
    const elemKozep = document.getElementById("kepKozep");
    const elemJobb = document.getElementById("kepJobb");
    const galeriaDoboz = document.querySelector('.kepek');

    // Törlés gomb ellenőrzése / beszúrása
    let torlesGomb = document.getElementById('kepTorlesGomb');
    if (!torlesGomb && galeriaDoboz) {
        torlesGomb = document.createElement('a');
        torlesGomb.id = 'kepTorlesGomb';
        torlesGomb.href = '#';
        torlesGomb.title = 'Aktuális kép törlése';
        torlesGomb.innerHTML = '<i class="fa-solid fa-trash"></i>';
        torlesGomb.className = 'galeria-torles-gomb';
        torlesGomb.addEventListener('click', (e) => {
            e.preventDefault();
            torolAktualisKep();
        });
        galeriaDoboz.appendChild(torlesGomb);
    }

    let placeholder = document.getElementById('galeria-placeholder');
    if (!placeholder && galeriaDoboz) {
        placeholder = document.createElement('div');
        placeholder.id = 'galeria-placeholder';
        placeholder.className = 'galeria-ures';
        galeriaDoboz.appendChild(placeholder);
    }

    const toggleGombok = (show) => {
        if (!galeriaDoboz) return;
        const elemek = galeriaDoboz.querySelectorAll('i, a, img');
        elemek.forEach(el => {
            el.hidden = !show;
        });
    };

    if (kepekLista.length === 0) {
        toggleGombok(false);

        const feltoltGomb = document.getElementById('kepFeltoltesGomb');
        if (feltoltGomb) {
            feltoltGomb.hidden = false;
            // A toggleGombok(false) a gombon belüli ikont (<i>) is elrejtette, azt is vissza kell kapcsolni
            feltoltGomb.querySelectorAll('i').forEach(ikon => { ikon.hidden = false; });
        }
        if (torlesGomb) torlesGomb.hidden = true;

        if (placeholder) {
            placeholder.hidden = false;
            placeholder.innerHTML = `
                <span class="ures-ikon">🖼️</span>
                <p class="ures-cim">Még nincsenek képek</p>
                <span class="ures-leiras">Töltsd fel az első képet a gombbal!</span>
            `;
        }
        return;
    }

    if (placeholder) placeholder.hidden = true;
    toggleGombok(true);
    if (torlesGomb) torlesGomb.hidden = false;

    let balIndex = (currentIndex - 1 + kepekLista.length) % kepekLista.length;
    let jobbIndex = (currentIndex + 1) % kepekLista.length;

    if (elemBal) elemBal.src = kepekLista[balIndex].url;
    if (elemKozep) elemKozep.src = kepekLista[currentIndex].url;
    if (elemJobb) elemJobb.src = kepekLista[jobbIndex].url;
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

function nyisdMegFajlValasztot() {
    const fajlInput = document.getElementById('kepFeltoltesInput');
    if (fajlInput) fajlInput.click();
}

// KÉP TÖRLESE SUPABASE STORAGE-BÓL
async function torolAktualisKep() {
    if (!aktualisGroupId() || kepekLista.length === 0) return;

    const torlendoKep = kepekLista[currentIndex];
    if (!torlendoKep || !torlendoKep.name) {
        alert('Nem található a törlendő kép!');
        return;
    }

    if (!confirm('Biztosan törölni szeretnéd ezt a képet?')) return;

    const eleresiUt = torlendoKep.path;
    console.log('Törlésre küldött útvonal:', eleresiUt);

    const { data, error } = await supabase
        .storage
        .from(BUCKET_NEV)
        .remove([eleresiUt]);

    if (error) {
        console.error('Hiba a törléskor:', error);
        alert(`Sikertelen törlés! Hiba: ${error.message}`);
        return;
    }

    console.log('Törlés eredménye:', data);

    // Ha sikeres, frissítjük a nézetet
    await betoltKepek();
}

// FELTÖLTÉS: a böngésző saját dekódolójával olvassuk be (iOS Safari natívan kezeli a HEIC-et),
// canvasra rajzoljuk max 1280 px-re, és WebP vagy JPEG kimenetet készítünk. A feltöltött
// fájl típusa és kiterjesztése mindig a kimenetből jön.
const KEP_MAX_OLDAL = 1280;
const KEP_TOMORITES_MINOSEG = 0.8;
const KEP_MAX_KIMENET_MB = 10;
const HEIC_FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';

function heicE(fajl) {
    const tipus = (fajl.type || '').toLowerCase();
    const kiterjesztes = (fajl.name.split('.').pop() || '').toLowerCase();
    return tipus.includes('heic') || tipus.includes('heif') || ['heic', 'heif'].includes(kiterjesztes);
}

// A böngésző dekódolója. Elsőként createImageBitmap (EXIF-forgatással), tartalékként <img>.
function kepDekodolas(blob) {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(() => kepDekodolasImg(blob));
    }
    return kepDekodolasImg(blob);
}

function kepDekodolasImg(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('A böngésző nem tudta dekódolni a képet.')); };
        img.src = url;
    });
}

// Csak akkor töltjük be a heic2any-t, ha a böngésző nem tudja dekódolni a HEIC-et
function heicKonvertaloBetoltes() {
    if (window.heic2any) return Promise.resolve(window.heic2any);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = HEIC_FALLBACK_URL;
        script.onload = () => resolve(window.heic2any);
        script.onerror = () => reject(new Error('A HEIC-konvertáló nem tölthető be.'));
        document.head.appendChild(script);
    });
}

async function heicJpegge(fajl) {
    const heic2any = await heicKonvertaloBetoltes();
    const kimenet = await heic2any({ blob: fajl, toType: 'image/jpeg', quality: KEP_TOMORITES_MINOSEG });
    const jpeg = Array.isArray(kimenet) ? kimenet[0] : kimenet;
    if (!jpeg || jpeg.size === 0) throw new Error('A HEIC-konvertálás üres eredményt adott.');
    return jpeg;
}

function kepVaszon(forras) {
    const w = forras.naturalWidth || forras.width;
    const h = forras.naturalHeight || forras.height;
    if (!w || !h) throw new Error('A kép mérete nem olvasható.');
    const arany = Math.min(1, KEP_MAX_OLDAL / Math.max(w, h));
    const cw = Math.round(w * arany);
    const ch = Math.round(h * arany);
    const vaszon = document.createElement('canvas');
    vaszon.width = cw;
    vaszon.height = ch;
    const ctx = vaszon.getContext('2d');
    ctx.fillStyle = '#ffffff'; // átlátszó forrásnál is értelmes JPEG-háttér
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(forras, 0, 0, cw, ch);
    return vaszon;
}

// WebP, ha a böngésző valóban WebP-t ad vissza (a Safari PNG-t ad, ilyenkor JPEG).
// PNG-t soha nem töltünk fel fotóként.
async function kepKodolas(vaszon) {
    const webp = await new Promise(r => vaszon.toBlob(r, 'image/webp', KEP_TOMORITES_MINOSEG));
    if (webp && webp.type === 'image/webp' && webp.size > 0) {
        return { blob: webp, kiterjesztes: 'webp' };
    }
    const jpeg = await new Promise(r => vaszon.toBlob(r, 'image/jpeg', KEP_TOMORITES_MINOSEG));
    if (!jpeg || jpeg.size === 0) throw new Error('A kép tömörítése nem sikerült.');
    return { blob: jpeg, kiterjesztes: 'jpg' };
}

async function fajlTomoritese(fajl) {
    let forras;
    try {
        forras = await kepDekodolas(fajl);
    } catch (dekodHiba) {
        if (!heicE(fajl)) throw dekodHiba;
        console.warn('Natív HEIC-dekódolás sikertelen, heic2any tartalék:', dekodHiba);
        forras = await kepDekodolas(await heicJpegge(fajl));
    }
    return kepKodolas(kepVaszon(forras));
}

function feltoltesiHiba(fajl, hiba) {
    const mb = (fajl.size / 1048576).toFixed(1);
    const tipus = fajl.type || 'ismeretlen típus';
    return `Nem sikerült feltölteni: ${fajl.name} (${tipus}, ${mb} MB). ${hiba && hiba.message ? hiba.message : hiba}`;
}

async function feltoltKepek(event) {
    const groupId = aktualisGroupId();
    if (!groupId) {
        alert('Előbb lépj be egy csoportba a beállításoknál!');
        return;
    }

    const fajlok = event.target.files;
    if (!fajlok || fajlok.length === 0) return;

    const gomb = document.getElementById('kepFeltoltesGomb');
    if (gomb) {
        gomb.classList.add('feltoltes-folyamatban');
        gomb.setAttribute('aria-busy', 'true');
    }

    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;

    for (const eredetiFajl of fajlok) {
        try {
            if (!eredetiFajl || eredetiFajl.size === 0) {
                alert(`A(z) "${eredetiFajl.name}" fájl üres vagy sérült, nem tölthető fel!`);
                continue;
            }

            const { blob, kiterjesztes } = await fajlTomoritese(eredetiFajl);

            // A méretkorlát a tömörítés UTÁN számít
            if (blob.size > KEP_MAX_KIMENET_MB * 1024 * 1024) {
                alert(`A(z) "${eredetiFajl.name}" a tömörítés után is túl nagy (${KEP_MAX_KIMENET_MB} MB a határ).`);
                continue;
            }

            const most = new Date();
            const idoBelyeg = `${most.getFullYear()}-${String(most.getMonth() + 1).padStart(2, '0')}-${String(most.getDate()).padStart(2, '0')}_${String(most.getHours()).padStart(2, '0')}-${String(most.getMinutes()).padStart(2, '0')}-${String(most.getSeconds()).padStart(2, '0')}`;
            const veletlen = Math.random().toString(36).substring(2, 8);
            const egyediNev = `${groupId}_${idoBelyeg}_${veletlen}.${kiterjesztes}`;
            const eleresiUt = `${groupId}/${egyediNev}`;

            const { error } = await client
                .storage
                .from(BUCKET_NEV)
                .upload(eleresiUt, blob, {
                    cacheControl: '31536000',
                    contentType: blob.type,
                    upsert: false
                });

            if (error) {
                console.error('Feltöltési hiba (Supabase Storage):', error, { tipus: eredetiFajl.type, meret: eredetiFajl.size });
                alert(feltoltesiHiba(eredetiFajl, error));
            }
        } catch (err) {
            console.error('Feltöltési hiba:', err, { tipus: eredetiFajl.type, nev: eredetiFajl.name, meret: eredetiFajl.size });
            alert(feltoltesiHiba(eredetiFajl, err));
        }
    }

    event.target.value = '';

    if (gomb) {
        gomb.classList.remove('feltoltes-folyamatban');
        gomb.removeAttribute('aria-busy');
    }

    await betoltKepek();
}

function frissitsKezdolapElrendezes() {
    const currentGroup = aktualisGroupCode();
    if (!currentGroup) return;

    const ytDoboz = document.getElementById('youtube-doboz');

    if (currentGroup === 'duckies') {
        if (ytDoboz) ytDoboz.hidden = false;
    } else {
        if (ytDoboz) ytDoboz.hidden = true;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    betoltKepek();
    frissitsKezdolapElrendezes();

    const fajlInput = document.getElementById('kepFeltoltesInput');
    if (fajlInput) {
        fajlInput.addEventListener('change', feltoltKepek);
    }
});