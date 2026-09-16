if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker regisztrálva'));
}

const BUCKET_NEV = 'kepek';

let kepekLista = [];
let currentIndex = 0;

async function betoltKepek() {
    const groupCode = localStorage.getItem('goats_group_code');
    
    if (!groupCode) {
        kepekLista = [];
        frissitGaleria();
        return;
    }

    const { data, error } = await _supabase
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
        const { data: publicData } = _supabase
            .storage
            .from(BUCKET_NEV)
            .getPublicUrl(`${groupCode}/${fajl.name}`);
        return publicData.publicUrl;
    });

    if (currentIndex >= kepekLista.length) {
        currentIndex = 0;
    }

    frissitGaleria();
}

function frissitGaleria() {
    const groupCode = localStorage.getItem('goats_group_code');
    const elemBal = document.getElementById("kepBal");
    const elemKozep = document.getElementById("kepKozep");
    const elemJobb = document.getElementById("kepJobb");

    const galeriaDoboz = document.querySelector('.kepek');

    let placeholder = document.getElementById('galeria-placeholder');
    if (!placeholder && galeriaDoboz) {
        placeholder = document.createElement('div');
        placeholder.id = 'galeria-placeholder';
        placeholder.style.cssText = `
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            width: 100%; height: 100%; min-height: 280px; color: #a1a1aa; text-align: center; font-family: sans-serif;
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

    // 1. ESET: NINCS BEJELENTKEZVE CSOPORTBA
    if (!groupCode) {
        toggleGombok(false);

        if (placeholder) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML = `
                <span style="font-size: 40px; margin-bottom: 12px;">🔒</span>
                <p style="margin: 0; font-weight: bold; color: #fff; font-size: 18px;">Nincs kiválasztva csoport</p>
                <span style="font-size: 14px; margin-top: 6px; color: #a1a1aa;">Kattints a ⚙️ beállítások gombra a belépéshez!</span>
            `;
        }
        return;
    }

    // 2. ESET: BE VAN JELENTKEZVE, DE NINCS KÉP
    if (kepekLista.length === 0) {
        toggleGombok(false);

        const feltoltGomb = document.getElementById('kepFeltoltesGomb');
        if (feltoltGomb) feltoltGomb.style.display = 'inline-block';

        if (placeholder) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML = `
                <span style="font-size: 40px; margin-bottom: 12px;">🖼️</span>
                <p style="margin: 0; font-weight: bold; color: #fff; font-size: 18px;">Még nincsenek képek</p>
                <span style="font-size: 14px; margin-top: 6px; color: #a1a1aa;">Töltsd fel az első képet a gombbal!</span>
            `;
        }
        return;
    }

    // 3. ESET: NORMÁL MŰKÖDÉS
    if (placeholder) placeholder.style.display = 'none';
    toggleGombok(true);

    let balIndex = (currentIndex - 1 + kepekLista.length) % kepekLista.length;
    let jobbIndex = (currentIndex + 1) % kepekLista.length;

    if (elemBal) elemBal.src = kepekLista[balIndex];
    if (elemKozep) elemKozep.src = kepekLista[currentIndex];
    if (elemJobb) elemJobb.src = kepekLista[jobbIndex];
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
        const kiterjesztes = fajl.name.split('.').pop();
        const egyediNev = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${kiterjesztes}`;
        const eleresiUt = `${groupCode}/${egyediNev}`;

        const { error } = await _supabase
            .storage
            .from(BUCKET_NEV)
            .upload(eleresiUt, fajl);

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

// KEZDŐLAP DYNAMIC LAYOUT IGAZÍTÁS
function frissitsKezdolapElrendezes() {
    const currentGroup = localStorage.getItem('goats_group_code');
    const ytDoboz = document.getElementById('youtube-doboz');
    const naptarDoboz = document.getElementById('naptar-doboz');
    const hatterKontener = document.querySelector('.hatter');
    const kepekDoboz = document.querySelector('.kepek');

    if (currentGroup === 'duckies') {
        if (ytDoboz) ytDoboz.style.display = 'flex';
        if (naptarDoboz) naptarDoboz.style.display = 'block';
        if (hatterKontener) hatterKontener.style.display = '';
        if (kepekDoboz) {
            kepekDoboz.style.width = '';
            kepekDoboz.style.minWidth = '';
        }
    } else {
        if (ytDoboz) ytDoboz.style.display = 'none';
        if (naptarDoboz) naptarDoboz.style.display = 'none';

        if (hatterKontener) {
            hatterKontener.style.display = 'flex';
            hatterKontener.style.justifyContent = 'center';
            hatterKontener.style.alignItems = 'center';
            hatterKontener.style.width = '100%';
        }

        if (kepekDoboz) {
            kepekDoboz.style.width = '100%';
            kepekDoboz.style.maxWidth = '500px';
            kepekDoboz.style.minHeight = '280px';
        }
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