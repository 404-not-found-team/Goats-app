// Globálisan kikapcsolt oldal közvetlen megnyitásának kivédése (FELADAT15).
// Az oldal a <body data-oldal="..."> attribútummal jelzi magát (lásd js/segedek/oldalak.js).
// Ha ki van kapcsolva, és a felhasználó be van jelentkezve, de nem superadmin, az app.html-re
// irányít, ott pedig egyszer megjelenik: "Ez az oldal jelenleg nem elérhető."
// Csak kozmetika: az adatokat a szerver (RLS) védi. Kijelentkezve a kapcsolók nem olvashatók,
// ezért a publikus oldalakat (pl. Ranglista) ilyenkor nem korlátozza.
// Modul: a main.js importálja.
import { ready, getState, oldalEngedelyezett } from '../hitelesites.js';

const UZENET_KULCS = 'goats_oldal_uzenet';
export const NEM_ELERHETO_SZOVEG = 'Ez az oldal jelenleg nem elérhető.';

async function orzes() {
    const oldal = document.body?.dataset.oldal;
    if (!oldal) return;
    await ready;
    if (!getState().user || oldalEngedelyezett(oldal)) return;
    try { sessionStorage.setItem(UZENET_KULCS, NEM_ELERHETO_SZOVEG); } catch { /* nem kritikus */ }
    location.replace('app.html');
}

// Az app.html-en: az átirányítás okának egyszeri kiírása
function uzenetMegjelenites() {
    let szoveg = null;
    try {
        szoveg = sessionStorage.getItem(UZENET_KULCS);
        sessionStorage.removeItem(UZENET_KULCS);
    } catch { /* nem kritikus */ }
    if (!szoveg) return;
    const sav = document.createElement('div');
    sav.className = 'oldal-uzenet';
    sav.setAttribute('role', 'status');
    sav.textContent = szoveg;
    const bezar = document.createElement('button');
    bezar.type = 'button';
    bezar.className = 'oldal-uzenet-bezar';
    bezar.setAttribute('aria-label', 'Üzenet bezárása');
    bezar.textContent = '×';
    bezar.addEventListener('click', () => sav.remove());
    sav.appendChild(bezar);
    document.body.prepend(sav);
    setTimeout(() => sav.remove(), 6000);
}

orzes();
uzenetMegjelenites();
