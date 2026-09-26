if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker regisztrálva'));
}

const BUCKET_NEV = 'kepek';

// KORLÁTOZÁSOK SETTINGS
const MAX_FAJL_MERET_MB = 5; // Maximum 5 MB per kép
const ENGEDELYEZETT_TIPUSOK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

let kepekLista = []; // { name: 'fajlnev.jpg', url: 'https://...' } elemeket tárol
let currentIndex = 0;

async function betoltKepek() {
    const groupCode = localStorage.getItem('goats_group_code');
    
    if (!groupCode) {
        kepekLista = [];
        frissitGaleria();
        return;
    }

    const { data, error } = await supabase
        .storage
        .from(BUCKET_NEV)
        .list(groupCode, {
            sortBy: { column: 'name', order: 'asc' }
        });

    if (error) {
        console.error('Hiba a képek betöltésekor:', error);
        kepekLista = [];
        frissitGaleria();
        return;
    }

    const fajlok = data ? data.filter(item => item.id !== null && item.name !== '.emptyFolderPlaceholder') : [];

    kepekLista = fajlok.map(fajl => {
        const { data: publicData } = supabase
            .storage
            .from(BUCKET_NEV)
            .getPublicUrl(`${groupCode}/${fajl.name}`);
            
        return {
            name: fajl.name, // A pontos fájlnév
            url: publicData.publicUrl
        };
    });

    if (currentIndex >= kepekLista.length) {
        currentIndex = Math.max(0, kepekLista.length - 1);
    }

    frissitGaleria();
}

function frissitGaleria() {
    const groupCode = localStorage.getItem('goats_group_code');
    if (!groupCode) return;

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
        torlesGomb.style.cssText = `
            position: absolute;
            bottom: 15px;
            right: 15px;
            z-index: 10;
            color: #ef4444;
            font-size: 1.2rem;
            cursor: pointer;
            transition: transform 0.2s;
        `;
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
        placeholder.style.cssText = `
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            width: 100%; height: 100%; min-height: 200px; color: #a1a1aa; text-align: center; font-family: sans-serif;
            background: #18181b; border-radius: 16px; border: 1px solid #27272a; box-sizing: border-box; padding: 20px;
        `;
        galeriaDoboz.appendChild(placeholder);
    }

    const toggleGombok = (show) => {
        if (!galeriaDoboz) return;
        const elemek = galeriaDoboz.querySelectorAll('i, a, img');
        elemek.forEach(el => {
            el.style.display = show ? '' : 'none';
        });
    };

    if (kepekLista.length === 0) {
        toggleGombok(false);

        const feltoltGomb = document.getElementById('kepFeltoltesGomb');
        if (feltoltGomb) feltoltGomb.style.display = 'inline-block';
        if (torlesGomb) torlesGomb.style.display = 'none';

        if (placeholder) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML = `
                <span style="font-size: 32px; margin-bottom: 8px;">🖼️</span>
                <p style="margin: 0; font-weight: bold; color: #fff; font-size: 16px;">Még nincsenek képek</p>
                <span style="font-size: 13px; margin-top: 4px; color: #a1a1aa;">Töltsd fel az első képet a gombbal!</span>
            `;
        }
        return;
    }

    if (placeholder) placeholder.style.display = 'none';
    toggleGombok(true);
    if (torlesGomb) torlesGomb.style.display = 'inline-block';

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
    const groupCode = localStorage.getItem('goats_group_code');
    if (!groupCode || kepekLista.length === 0) return;

    const torlendoKep = kepekLista[currentIndex];
    if (!torlendoKep || !torlendoKep.name) {
        alert('Nem található a törlendő kép!');
        return;
    }

    if (!confirm('Biztosan törölni szeretnéd ezt a képet?')) return;

    const eleresiUt = `${groupCode}/${torlendoKep.name}`;
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

// FELTÖLTÉS MEGSZORÍTÁSOKKAL ÉS EGYEDI NÉVVEL
async function feltoltKepek(event) {
    const groupCode = localStorage.getItem('goats_group_code');
    if (!groupCode) {
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

    for (const fajl of fajlok) {
        // 1. Fájltípus ellenőrzése
        if (!ENGEDELYEZETT_TIPUSOK.includes(fajl.type)) {
            alert(`A(z) "${fajl.name}" nem engedélyezett formátum! (Kizárólag JPG, PNG, WEBP, GIF megengedett)`);
            continue;
        }

        // 2. Méret ellenőrzése
        const maxMeretBajtokban = MAX_FAJL_MERET_MB * 1024 * 1024;
        if (fajl.size > maxMeretBajtokban) {
            alert(`A(z) "${fajl.name}" túl nagy! Maximum ${MAX_FAJL_MERET_MB} MB tölthető fel.`);
            continue;
        }

        // 3. Egyedi név képzés
        const kiterjesztes = fajl.name.split('.').pop().toLowerCase();
        const egyediNev = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${kiterjesztes}`;
        const eleresiUt = `${groupCode}/${egyediNev}`;

        const { error } = await supabase
            .storage
            .from(BUCKET_NEV)
            .upload(eleresiUt, fajl, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Hiba a feltöltéskor:', error);
            alert(`Nem sikerült feltölteni: ${fajl.name}`);
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
    const currentGroup = localStorage.getItem('goats_group_code');
    if (!currentGroup) return;

    const ytDoboz = document.getElementById('youtube-doboz');

    if (currentGroup === 'duckies') {
        if (ytDoboz) ytDoboz.style.display = 'flex';
    } else {
        if (ytDoboz) ytDoboz.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", function () {
    betoltKepek();
    frissitsKezdolapElrendezes();

    const fajlInput = document.getElementById('kepFeltoltesInput');
    if (fajlInput) {
        fajlInput.addEventListener('change', feltoltKepek);
    }
});