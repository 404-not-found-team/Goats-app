// Ranglista oldal: az italok tier-listája (S–D), szűrőkkel, új ital javaslásával és szerkesztésével.
// Modul: az adatréteg (ranglista-adat.js) végzi a Supabase-hívásokat; ez a fájl a felület és a vezérlés.

import { helyezesMentese, ranglistaLekerese } from './ranglista-adat.js';
import { betolt, olvas } from '../../segedek/adat-gyorsitotar.js';
import { allapot, osszetevokItalonkent, ujSajatSzuro } from './ranglista-allapot.js';
import { alkalmazCsoportSzurot, alkalmazSzurot, csoportSzuroModosithato, mentCsoportSzuro, mentSajatSzuro, nyisdSzuroModal, renderSajatSzuro, szuroFul, zardSzuroModal } from './ranglista-szuro.js';
import { K } from './ranglista-seged.js';
import { addItalKartyaToUI, epitForrasDobozok, epitTierek, forrasKontener, modalBezár, rendezKartyakatContainerben, tierKontener } from './ranglista-kartyak.js';
import { epitFormaValaszto, epitKategoriaValaszto, epitKiszerelesValaszto, kategoriaValtozasCheck, kepElonezetFrissit, masodikSzinValtozott, mentUjItal, nyisdSzerkesztesModal, nyisdUjItalModal, ujHozzavaloSor, valtsMódot, zardUjItalModal } from './ranglista-urlap.js';

// Ital ranglista (ranglista.html).
// Adatok: public.italok (katalógus), public.ital_kategoriak (fő- és alkategóriák, lásd
// js/segedek/ital-kategoriak.js), public.ital_osszetevok (koktél/fröccs recept),
// public.ital_ranglista (a csoport besorolásai).
// Szűrés két szinten:
//  - Csoport beállítás (groups.filter_settings, mentett): mely fő- és alkategóriák, és energiaitalnál
//    a zero/nem zero látszik. Amíg nincs beállítva, egyetlen ital sem látszik, és az oldal felkínálja.
//  - Saját nézet: ezen belül tovább szűkít (kategóriák, zero, név szerinti elrejtés), de nem mentjük.

// ---------- Kinézet ----------

// Az admin oldali „Új ranglista-kinézet” kapcsoló (app_kapcsolok.ranglista_uj_kinezet). Közvetlenül az
// értéket olvassuk, nem a funkcioEngedelyezett()-et, így a superadminokra is ugyanúgy vonatkozik.
// Kijelentkezve a kapcsolók nem olvashatók: ott a megszokott kinézet marad. A stílus: css/pages/ranglista.css.
function kinezetBeallit() {
    const uj = window.goatsAuth?.getState()?.beallitasok?.ranglista_uj_kinezet === true;
    document.body.classList.toggle('rl-uj-kinezet', uj);
}

// ---------- Betöltés ----------

async function inicializalas() {
    if (window.goatsAuth) await window.goatsAuth.ready;
    kinezetBeallit();
    window.goatsAuth?.onChange(kinezetBeallit); // menet közbeni váltáskor is átáll
    // Globálisan kikapcsolt italjavaslat (FELADAT15): a gomb letiltva, a szerver is elutasítaná
    window.goatsKapcsolok?.funkcioGombTiltas(document.getElementById('uj-ital-gomb'), 'funkcio_italjavaslat');
    const groupCode = aktualisGroupCode();
    const groupId = window.goatsAuth?.getState()?.group?.id || null;

    // Minden lekérdezés párhuzamosan (ranglista-adat.js)
    const lekero = () => ranglistaLekerese(groupCode, groupId);

    // Bejelentkezve előbb az utoljára látott állapot jelenik meg azonnal, a friss a háttérben érkezik
    // (js/segedek/adat-gyorsitotar.js); kijelentkezve nincs tárolás, ott csak a friss adat
    let frissMegjott = false;
    const megjelenito = (adat, tarolt) => {
        teljesKirajzolas(adat);
        if (!tarolt) frissMegjott = true;
    };
    if (window.goatsAuth?.getState()?.user) {
        await betolt('ranglista', lekero, megjelenito);
    } else {
        const adat = await lekero();
        if (adat !== undefined) megjelenito(adat, false);
    }

    // A csoport szűrője még nincs beállítva: felkínáljuk (ha a tag módosíthatja). Csak a friss adat
    // alapján (vagy ha az azonos volt a tárolttal, azzal), hogy egy elavult tárolt állapot ne nyissa meg.
    if (groupId && !allapot.csoportSzuro && csoportSzuroModosithato() && (frissMegjott || olvas('ranglista'))) {
        nyisdSzuroModal('csoport');
    }
}

// Az egész oldal felépítése egy adatcsomagból (tárolt vagy friss). Újrarajzoláskor a nyitott
// forrásdobozok nyitva maradnak.
function teljesKirajzolas(adat) {
    const nyitottDobozok = new Set([...document.querySelectorAll('.forras-doboz:not(.csukva)')].map(d => d.dataset.kategoria));

    K().beallit(adat.kategoriak);
    allapot.szinPaletta = adat.szinPaletta || [];
    epitForrasDobozok();
    epitKategoriaValaszto();
    epitKiszerelesValaszto();
    epitFormaValaszto();
    document.querySelectorAll('.forras-doboz').forEach(d => {
        if (!nyitottDobozok.has(d.dataset.kategoria)) return;
        d.classList.remove('csukva');
        d.querySelector('.forras-fejlec')?.setAttribute('aria-expanded', 'true');
    });

    document.querySelectorAll('.ranglista-dropzone .ital-kartya').forEach(k => k.remove());
    osszetevokItalonkent.clear();
    adat.osszetevok.forEach(o => {
        if (!osszetevokItalonkent.has(o.ital_id)) osszetevokItalonkent.set(o.ital_id, []);
        osszetevokItalonkent.get(o.ital_id).push(o);
    });

    adat.katalogus.forEach(ital => addItalKartyaToUI(ital, false));
    document.querySelectorAll('.ital-lista, .ital-alcsoport-lista').forEach(rendezKartyakatContainerben);

    adat.ranglista.forEach(item => {
        const kartyaElem = document.getElementById(item.id);
        if (!kartyaElem) return;
        const celZona = item.kategoria === 'forras' ? forrasKontener(kartyaElem) : tierKontener(item.kategoria);
        if (celZona) {
            celZona.appendChild(kartyaElem);
            rendezKartyakatContainerben(celZona);
        }
    });

    alkalmazCsoportSzurot(adat.filterSettings);
}

async function kategoriatValaszt(tier) {
    if (!allapot.aktivElemId) return;

    const groupCode = aktualisGroupCode();
    const kartyaElem = document.getElementById(allapot.aktivElemId);
    const celZona = tier === 'forras' ? forrasKontener(kartyaElem) : tierKontener(tier);

    if (kartyaElem && celZona) {
        celZona.appendChild(kartyaElem);
        rendezKartyakatContainerben(celZona);

        if (groupCode) {
            await helyezesMentese(allapot.aktivElemId, tier, groupCode);
        }
    }

    alkalmazSzurot();
    modalBezár();
}

document.addEventListener('DOMContentLoaded', () => {
    epitTierek();

    // A kiválasztott ital ablaka bezárul a háttérre (az ablakon kívülre) kattintva és Esc-re is
    const hatter = document.getElementById('modal-hatter');
    hatter?.addEventListener('click', (e) => {
        if (e.target === hatter) modalBezár();
    });

    // Szűrő ablak: fülek, gombok, bezárás (háttér, Esc)
    const szuroModal = document.getElementById('szuro-modal');
    szuroModal?.addEventListener('click', (e) => {
        if (e.target === szuroModal) zardSzuroModal();
    });
    document.querySelectorAll('#szuro-modal .szuro-bezar').forEach(g => g.addEventListener('click', zardSzuroModal));
    document.getElementById('szuro-ful-sajat')?.addEventListener('click', () => szuroFul('sajat'));
    document.getElementById('szuro-ful-csoport')?.addEventListener('click', () => szuroFul('csoport'));
    document.getElementById('uj-ital-nev')?.addEventListener('input', kepElonezetFrissit);
    document.getElementById('sajat-szuro-alaphelyzet')?.addEventListener('click', () => {
        allapot.sajatSzuro = ujSajatSzuro();
        mentSajatSzuro();
        renderSajatSzuro();
        alkalmazSzurot();
    });
    document.getElementById('csoport-szuro-mentes')?.addEventListener('click', mentCsoportSzuro);
    document.getElementById('csoport-szuro-beallitas-gomb')?.addEventListener('click', () => nyisdSzuroModal('csoport'));

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (hatter && !hatter.hidden) modalBezár();
        else if (szuroModal && !szuroModal.hidden) zardSzuroModal();
    });
});

window.addEventListener('DOMContentLoaded', inicializalas);

// ---------- Globális elérés ----------
// Modulként a függvények nem kerülnek automatikusan a window-ra; a HTML data-katt / data-valtozas /
// data-bevitel attribútumai (js/segedek/html-esemenyek.js) viszont a window-on keresik őket.
Object.assign(window, {
    nyisdSzuroModal, nyisdUjItalModal, zardUjItalModal, nyisdSzerkesztesModal, modalBezár, kategoriatValaszt,
    kategoriaValtozasCheck, kepElonezetFrissit, masodikSzinValtozott, valtsMódot, ujHozzavaloSor, mentUjItal,
});
