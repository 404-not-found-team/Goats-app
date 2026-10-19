// Az oldalak utoljára látott adatai helyben (localStorage), hogy betöltéskor azonnal kirajzolódjanak,
// és a friss adat a háttérben érkezzen ("stale-while-revalidate"). Offline is az utolsó állapot látszik.
// Csak megjelenítésre szolgál, a jogosultságot a szerver (RLS) dönti el. A kulcs a felhasználóhoz és a
// csoporthoz kötött; kijelentkezéskor a hitelesites.js törli (minden goats_ előtagú kulcsot).
// Modul: a main.js importálja; a klasszikus oldalscriptek a window.goatsAdatTar-on érik el.
import { getState } from '../hitelesites.js';

const ELOTAG = 'goats_adat_';
// Egy bejegyzés legfeljebb ekkora lehet (a localStorage kb. 5 MB-os keretén belül)
const MAX_MERET = 512 * 1024;

function kulcs(nev) {
    const { user, group } = getState();
    if (!user) return null;
    return `${ELOTAG}${user.id}_${group?.id || 'nincs'}_${nev}`;
}

export function olvas(nev) {
    const k = kulcs(nev);
    if (!k) return null;
    try {
        const nyers = localStorage.getItem(k);
        return nyers === null ? null : JSON.parse(nyers);
    } catch {
        return null;
    }
}

export function ir(nev, adat) {
    const k = kulcs(nev);
    if (!k) return;
    let nyers;
    try {
        nyers = JSON.stringify(adat);
    } catch {
        return;
    }
    if (nyers.length > MAX_MERET) {
        torol(nev);
        return;
    }
    try {
        localStorage.setItem(k, nyers);
    } catch {
        // Betelt a tárhely: a más felhasználóhoz/csoporthoz tartozó régi bejegyzéseket töröljük, és még egyszer próbáljuk
        const sajat = `${ELOTAG}${getState().user?.id}_${getState().group?.id || 'nincs'}_`;
        Object.keys(localStorage)
            .filter(x => x.startsWith(ELOTAG) && !x.startsWith(sajat))
            .forEach(x => localStorage.removeItem(x));
        try { localStorage.setItem(k, nyers); } catch { /* nem fér el: csak a gyorsítás marad el */ }
    }
}

export function torol(nev) {
    const k = kulcs(nev);
    if (k) {
        try { localStorage.removeItem(k); } catch { /* nem kritikus */ }
    }
}

/**
 * Előbb a tárolt adatot rajzolja ki (ha van), majd lekéri a frissat; ha az eltér, eltárolja és újrarajzol.
 * @param {string} nev a bejegyzés neve (pl. 'tervek')
 * @param {() => Promise<any>} lekero a friss adat; hibánál undefined-ot adjon (a tárolt nézet marad)
 * @param {(adat: any, tarolt: boolean) => void} megjelenito
 * @param {{ taroltElobb?: boolean }} [beallitas] taroltElobb: false egy módosítás utáni újratöltésnél
 *   (ott már a friss állapot látszik, a régi tárolt adat felvillanna)
 */
export async function betolt(nev, lekero, megjelenito, { taroltElobb = true } = {}) {
    const tarolt = olvas(nev);
    if (tarolt !== null && taroltElobb) megjelenito(tarolt, true);

    let friss;
    try {
        friss = await lekero();
    } catch (err) {
        console.error(`A(z) ${nev} adat lekérése nem sikerült:`, err);
        return;
    }
    if (friss === undefined) return;
    if (taroltElobb && tarolt !== null && JSON.stringify(tarolt) === JSON.stringify(friss)) return;
    ir(nev, friss);
    megjelenito(friss, false);
}

window.goatsAdatTar = { olvas, ir, torol, betolt };
