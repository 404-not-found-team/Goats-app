// Globálisan kikapcsolt funkciók gombjainak letiltása (FELADAT15). Csak kozmetika: a tiltást a
// szerver kényszeríti ki (public.funkcio_engedelyezve() a policykban és az RPC-kben).
// A superadminra nem vonatkozik (a funkcioEngedelyezett() neki mindig igaz).
// Modul: a main.js importálja; a klasszikus oldalscriptek a window.goatsKapcsolok-on érik el.
import { ready, funkcioEngedelyezett, oldalEngedelyezett } from '../hitelesites.js';

export const TILTVA_SZOVEG = 'Ez a funkció jelenleg ki van kapcsolva.';

/**
 * Ha a funkció ki van kapcsolva, a gombot letiltja, és mellé magyarázó szöveget tesz.
 * @param {HTMLElement|null} gomb
 * @param {string} kulcs pl. 'funkcio_kepfeltoltes'
 * @returns {boolean} engedélyezett-e a funkció
 */
export function funkcioGombTiltas(gomb, kulcs) {
    const engedelyezett = funkcioEngedelyezett(kulcs);
    if (!gomb) return engedelyezett;
    const megjegyzesId = `${gomb.id || kulcs}-tiltva`;
    let megjegyzes = document.getElementById(megjegyzesId);

    gomb.disabled = !engedelyezett;
    gomb.classList.toggle('funkcio-kikapcsolva', !engedelyezett);
    if (engedelyezett) {
        gomb.removeAttribute('aria-disabled');
        if (megjegyzes) megjegyzes.hidden = true;
        return true;
    }

    gomb.setAttribute('aria-disabled', 'true');
    gomb.title = TILTVA_SZOVEG;
    if (!megjegyzes) {
        megjegyzes = document.createElement('p');
        megjegyzes.id = megjegyzesId;
        megjegyzes.className = 'funkcio-tiltva-szoveg';
        megjegyzes.textContent = TILTVA_SZOVEG;
        gomb.insertAdjacentElement('afterend', megjegyzes);
    }
    megjegyzes.hidden = false;
    gomb.setAttribute('aria-describedby', megjegyzesId);
    return false;
}

// Ha az állapot betöltése után kell alkalmazni (klasszikus oldalscriptekből)
export async function funkcioGombTiltasBetoltesUtan(gomb, kulcs) {
    await ready;
    return funkcioGombTiltas(gomb, kulcs);
}

window.goatsKapcsolok = {
    TILTVA_SZOVEG,
    funkcioEngedelyezett,
    oldalEngedelyezett,
    funkcioGombTiltas,
    funkcioGombTiltasBetoltesUtan,
};
