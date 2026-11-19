// Ranglista szűrő: a csoport mentett beállítása és a saját (böngészőben tárolt) nézet, és ezek alkalmazása.

import { szuroMentese } from './ranglista-adat.js';
import { K, ujElem } from './ranglista-seged.js';
import { allapot, ujSajatSzuro } from './ranglista-allapot.js';

const ZERO_ERTEKEK = ['mind', 'zero', 'nem_zero'];
const ZERO_FELIRAT = { mind: tr('zero_all', 'Mind'), zero: tr('sugar_free_label', 'Cukormentes'), nem_zero: tr('with_sugar', 'Cukros') };

/* ==========================================================================
   RANGLISTA SZŰRŐK LOGIKÁJA
   ========================================================================== */

// A régi (v1) beállítás: { kikapcsolt_kategoriak: [kod], kizart_szoveg_tomb: [] } -> az összes, kivéve a kikapcsoltakat
function szuroAtalakitas(regi) {
    if (!regi || typeof regi !== 'object') return null;
    if (regi.v === 2) return regi.beallitva ? regi : null;
    if (Array.isArray(regi.kikapcsolt_kategoriak)) {
        const ki = regi.kikapcsolt_kategoriak.map(k => String(k).toLowerCase());
        return { v: 2, beallitva: true, kategoriak: K().fo.map(f => f.kod).filter(k => !ki.includes(k)), alkategoriak_ki: [], zero: {} };
    }
    return null;
}

// A csoport mentett szűrője (groups.filter_settings) a lekérdezett adatból
export function alkalmazCsoportSzurot(filterSettings) {
    betoltSajatSzuro();
    const groupId = window.goatsAuth?.getState()?.group?.id;
    if (!groupId) {
        // Csoport nélkül (vendégként): minden látszik, csoport-beállítás nincs
        allapot.csoportSzuro = { v: 2, beallitva: true, kategoriak: K().fo.map(f => f.kod), alkategoriak_ki: [], zero: {} };
        // vendégként csak a saját nézet van, így a fülsor sem kell
        const fulek = document.querySelector('#szuro-modal .szuro-fulek');
        if (fulek) fulek.hidden = true;
        alkalmazSzurot();
        return;
    }
    allapot.csoportSzuro = szuroAtalakitas(filterSettings);
    alkalmazSzurot();
}

// A csoport szűrőjét alapból bármelyik tag módosíthatja; a csoportszuro_csak_admin kapcsolóval csak
// a csoport adminja (a superadmin mindig). A tényleges ellenőrzést a save_filter_settings RPC végzi.
export function csoportSzuroModosithato() {
    const auth = window.goatsAuth;
    const authAllapot = auth?.getState();
    if (!authAllapot?.group) return false;
    if (auth.isSuperadmin?.()) return true;
    const csakAdmin = authAllapot.beallitasok?.csoportszuro_csak_admin === true;
    return !csakAdmin || authAllapot.groupRole === 'admin';
}

export function nyisdSzuroModal(ful = 'sajat') {
    renderSajatSzuro();
    renderCsoportSzuro();
    szuroFul(!allapot.csoportSzuro ? 'csoport' : ful);
    document.getElementById('szuro-modal').hidden = false;
}

export function zardSzuroModal() {
    document.getElementById('szuro-modal').hidden = true;
    allapot.csoportVazlat = null; // a nem mentett csoport-módosítás elvész
    const allapotElem = document.getElementById('csoport-szuro-allapotElem');
    if (allapotElem) allapotElem.textContent = '';
}

export function szuroFul(nev) {
    ['sajat', 'csoport'].forEach(f => {
        const ful = document.getElementById(`szuro-ful-${f}`);
        const panel = document.getElementById(`szuro-panel-${f}`);
        const aktiv = f === nev;
        ful?.classList.toggle('aktiv', aktiv);
        ful?.setAttribute('aria-selected', String(aktiv));
        if (panel) panel.hidden = !aktiv;
    });
}

// A saját szűrő ebben a böngészőben megmarad (csoportonként külön), újratöltés után is
function sajatSzuroKulcs() {
    return `goats_ranglista_szuro_${aktualisGroupCode() || 'vendeg'}`;
}

function betoltSajatSzuro() {
    try {
        const adat = JSON.parse(localStorage.getItem(sajatSzuroKulcs()) || 'null');
        if (adat && typeof adat === 'object') {
            allapot.sajatSzuro = {
                kategoriak_ki: Array.isArray(adat.kategoriak_ki) ? adat.kategoriak_ki : [],
                zero: adat.zero && typeof adat.zero === 'object' ? adat.zero : {},
            };
            return;
        }
    } catch { /* sérült vagy nem elérhető tároló: alaphelyzet */ }
    allapot.sajatSzuro = ujSajatSzuro();
}

export function mentSajatSzuro() {
    try { localStorage.setItem(sajatSzuroKulcs(), JSON.stringify(allapot.sajatSzuro)); } catch { /* privát mód: csak most él */ }
}

// Zero-választó (Mind / Csak zero / Nem zero)
function zeroValaszto(ertek, valtas) {
    const sor = ujElem('div', 'szuro-zero');
    sor.setAttribute('role', 'radiogroup');
    sor.setAttribute('aria-label', tr('sugar', 'Cukor'));
    ZERO_ERTEKEK.forEach(z => {
        const gomb = ujElem('button', 'szuro-zero-gomb', ZERO_FELIRAT[z]);
        gomb.type = 'button';
        gomb.setAttribute('role', 'radio');
        gomb.setAttribute('aria-checked', String(z === ertek));
        gomb.classList.toggle('aktiv', z === ertek);
        gomb.addEventListener('click', () => valtas(z));
        sor.appendChild(gomb);
    });
    return sor;
}

// Egy kategória-csempe: ikon, név, darabszám; bekapcsolva kerettel és pipával (aktív = látszik).
// Alkategóriánként nem lehet szűrni: egy kategória vagy teljesen látszik, vagy egyáltalán nem.
function kategoriaCsempe(fo, aktiv, valtas) {
    const gomb = ujElem('button', 'szuro-csempe');
    gomb.type = 'button';
    gomb.classList.toggle('aktiv', aktiv);
    gomb.setAttribute('aria-pressed', String(aktiv));
    const ikon = ujElem('span', `ital-ikon ikon-${fo.ikon && /^[a-z0-9-]{1,30}$/.test(fo.ikon) ? fo.ikon : window.italKep.ikonFajl(fo.kod)}`);
    ikon.setAttribute('aria-hidden', 'true');
    const db = document.querySelectorAll(`.ital-kartya[data-kategoria="${fo.kod}"]`).length;
    gomb.append(
        ujElem('span', 'szuro-csempe-jel', '✓'),
        ikon,
        ujElem('span', 'szuro-csempe-nev', K().nevForditva(fo)),
        ujElem('span', 'szuro-csempe-db', tr('drinks_count', '{n} ital', { n: db })),
    );
    gomb.addEventListener('click', valtas);
    return gomb;
}

// A kategória-csempék rácsa egy szűrőhöz, alatta a cukor-választó(k) a bekapcsolt, zero-szűrős kategóriákhoz.
// beallitas: { foLathato(fo), foValt(fo), zero(fo), zeroValt(fo, z), csakEzek }
function kategoriaLista(kontener, beallitas) {
    const fok = K().fo.filter(fo => !beallitas.csakEzek || beallitas.csakEzek(fo));
    const racs = ujElem('div', 'szuro-csempek');
    racs.append(...fok.map(fo => kategoriaCsempe(fo, beallitas.foLathato(fo), () => beallitas.foValt(fo))));
    const zerok = fok.filter(fo => fo.zero_szuro && beallitas.foLathato(fo)).map(fo => {
        const doboz = ujElem('div', 'szuro-finom');
        doboz.append(ujElem('b', '', K().nevForditva(fo)), zeroValaszto(beallitas.zero(fo), (z) => beallitas.zeroValt(fo, z)));
        return doboz;
    });
    kontener.replaceChildren(racs, ...zerok);
}

const valt = (tomb, ertek) => (tomb.includes(ertek) ? tomb.filter(t => t !== ertek) : [...tomb, ertek]);

// --- Saját nézet (nem mentett) ---

export function renderSajatSzuro() {
    const kontener = document.getElementById('sajat-szuro-kategoriak');
    if (!kontener) return;
    const cs = allapot.csoportSzuro || { kategoriak: [], alkategoriak_ki: [], zero: {} };
    if (!allapot.csoportSzuro) {
        kontener.replaceChildren(ujElem('p', 'szuro-leiras', tr('filter_group_first', 'Előbb a csoport beállításban válaszd ki, mely italok jelenjenek meg.')));
    } else {
        kategoriaLista(kontener, {
            csakEzek: (fo) => cs.kategoriak.includes(fo.kod),
            foLathato: (fo) => !allapot.sajatSzuro.kategoriak_ki.includes(fo.kod),
            foValt: (fo) => { allapot.sajatSzuro.kategoriak_ki = valt(allapot.sajatSzuro.kategoriak_ki, fo.kod); mentSajatSzuro(); renderSajatSzuro(); alkalmazSzurot(); },
            zero: (fo) => allapot.sajatSzuro.zero[fo.kod] || cs.zero?.[fo.kod] || 'mind',
            zeroValt: (fo, z) => { allapot.sajatSzuro.zero[fo.kod] = z; mentSajatSzuro(); renderSajatSzuro(); alkalmazSzurot(); },
        });
    }

}

function renderCsoportSzuro() {
    const kontener = document.getElementById('csoport-szuro-kategoriak');
    if (!kontener) return;
    const modosithato = csoportSzuroModosithato();
    allapot.csoportVazlat = allapot.csoportVazlat || JSON.parse(JSON.stringify(allapot.csoportSzuro || { v: 2, beallitva: true, kategoriak: [], alkategoriak_ki: [], zero: {} }));
    const v = allapot.csoportVazlat;
    const ujra = () => renderCsoportSzuro();
    kategoriaLista(kontener, {
        foLathato: (fo) => v.kategoriak.includes(fo.kod),
        foValt: (fo) => { if (!modosithato) return; v.kategoriak = valt(v.kategoriak, fo.kod); ujra(); },
        zero: (fo) => v.zero?.[fo.kod] || 'mind',
        zeroValt: (fo, z) => { if (!modosithato) return; v.zero = { ...(v.zero || {}), [fo.kod]: z }; ujra(); },
    });
    kontener.classList.toggle('csak-olvashato', !modosithato);
    const mentes = document.getElementById('csoport-szuro-mentes');
    if (mentes) mentes.disabled = !modosithato;
    const allapotElem = document.getElementById('csoport-szuro-allapotElem');
    if (allapotElem && !modosithato) {
        allapotElem.className = 'szuro-allapotElem';
        allapotElem.textContent = tr('filter_admin_only', 'A csoport szűrőjét csak a csoport adminja módosíthatja.');
    }
}

export async function mentCsoportSzuro() {
    const groupId = window.goatsAuth?.getState()?.group?.id;
    const allapotElem = document.getElementById('csoport-szuro-allapotElem');
    const gomb = document.getElementById('csoport-szuro-mentes');
    if (!groupId || !allapot.csoportVazlat) return;

    // Alkategóriánként már nem lehet szűrni: a régi, elmentett alkategória-tiltásokat is töröljük
    const beallitas = { ...allapot.csoportVazlat, v: 2, beallitva: true, alkategoriak_ki: [] };
    gomb.disabled = true;
    allapotElem.className = 'szuro-allapotElem';
    allapotElem.textContent = tr('filter_saving', 'Mentés…');
    const szuroHiba = await szuroMentese(groupId, beallitas);
    if (szuroHiba) {
        allapotElem.className = 'szuro-allapotElem hiba';
        allapotElem.textContent = szuroHiba.message || tr('err_save_retry', 'A mentés nem sikerült, próbáld újra.');
        gomb.disabled = false;
        return;
    }
    gomb.disabled = false;
    allapot.csoportSzuro = beallitas;
    allapot.csoportVazlat = null;
    allapotElem.className = 'szuro-allapotElem ok';
    allapotElem.textContent = tr('filter_saved_group', 'Elmentve, a csoport minden tagjánál ez érvényes.');
    renderSajatSzuro();
    alkalmazSzurot();
    setTimeout(zardSzuroModal, 900);
}

// --- A szűrés alkalmazása ---

function kartyaLathato(kartya) {
    if (!allapot.csoportSzuro) return false;
    const fo = kartya.dataset.kategoria;
    if (!allapot.csoportSzuro.kategoriak.includes(fo) || allapot.sajatSzuro.kategoriak_ki.includes(fo)) return false;

    if (kartya.dataset.zeroSzuro === '1') {
        const zero = allapot.sajatSzuro.zero[fo] || allapot.csoportSzuro.zero?.[fo] || 'mind';
        const zeroE = kartya.dataset.zero === '1';
        if ((zero === 'zero' && !zeroE) || (zero === 'nem_zero' && zeroE)) return false;
    }

    return true;
}

export function alkalmazSzurot() {
    document.querySelectorAll('.ital-kartya').forEach(kartya => {
        kartya.hidden = !kartyaLathato(kartya);
    });
    document.getElementById('csoport-szuro-hianyzik').hidden = !!allapot.csoportSzuro;
    frissitsSzamlalokat();
}

// Darabszámok és az üres dobozok/alcsoportok elrejtése.
// A nevező a kategória TELJES darabszáma (a mar rangsorolt, tier-dobozokba athelyezett kartyakkal
// egyutt), nem csak a meg a forras-dobozban levoke - igy a szam tenyleg a rangsorolasi haladast
// mutatja, nem csak azt, hogy a szurés hany darabot rejt el a (ranggal mar csokkent) poolbol.
function frissitsSzamlalokat() {
    document.querySelectorAll('.forras-doboz').forEach(doboz => {
        const lista = doboz.querySelector('.ital-lista');
        if (!lista) return;
        const kategoria = lista.dataset.kategoria;
        const kartyak = Array.from(lista.getElementsByClassName('ital-kartya'));
        const lathato = kartyak.filter(k => !k.hidden).length;
        const osszesen = kategoria
            ? document.querySelectorAll(`.ital-kartya[data-kategoria="${kategoria}"]`).length
            : kartyak.length;
        const szamlalo = doboz.querySelector('.ital-szamlalo');
        if (szamlalo) szamlalo.textContent = `${lathato} / ${osszesen}`;
        doboz.hidden = lathato === 0;
        lista.querySelectorAll('.ital-alcsoport').forEach(cs => {
            cs.hidden = !cs.querySelector('.ital-kartya:not([hidden])');
        });
    });
}
