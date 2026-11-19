// Hány napja: a saját számlálóid és a csoporttársak megosztott számlálói (public.hanynapja).
// Minden számlálót a csoport is lát (lathato_csoportnak = true, ez az alapérték); a jogosultságot
// az RLS dönti el: a sajátod módosítható, a csoporttársakéi csak olvashatók.
//
// Ez a vezérlő: összeköti az adatréteget (hanynapja-adat.js) és a megjelenítést (hanynapja-megjelenites.js).
// Itt dől el, mi történik egy gombnyomásra; a dátum- és rekordszámítás is itt van.
import { ready, getState } from '../../hitelesites.js';
import {
    szamlalokLekerese, sablonokLekerese, sablonJavaslasa,
    szamlaloFelvetele, szamlaloUjrakezdese, szamlaloTorlese,
} from './hanynapja-adat.js';
import {
    allapot, uzenet, menukBezarasa, kirajzolToplista,
    sajatKartyakKirajzolasa, sablonValasztoFrissites, ujJavaslatMezo,
} from './hanynapja-megjelenites.js';
import { UJ_JAVASLAT, szamlaloNev, maiDatum, napokKozott, kulcs } from './hanynapja-seged.js';

// a választható sablonok: a jóváhagyottak + a saját függő javaslataid (az RLS csak ezeket adja vissza)
let sablonok = [];

// amit a kártyák gombjai hívnak (callbackek a megjelenítésnek)
const MUVELETEK = { ujrakezdeskor: ujrakezdes, torleskor: torles };

async function betoltes() {
    const { group, user, members } = getState();
    const sajatDoboz = document.getElementById('fuggosegek');
    if (!sajatDoboz) return;

    if (!group) {
        document.getElementById('hn-uj')?.setAttribute('hidden', '');
        document.getElementById('hn-uj-nyito')?.setAttribute('hidden', '');
        uzenet(sajatDoboz, tr('err_join_group_first', 'Előbb csatlakozz egy csoporthoz!'));
        return;
    }

    const [hanynapja, sablonSorok] = await Promise.all([
        szamlalokLekerese(group.id),
        sablonokLekerese()
    ]);

    sablonok = sablonSorok;
    if (hanynapja === undefined) { uzenet(sajatDoboz, tr('err_operation', 'Hiba a művelet során.')); return; }

    const sajat = hanynapja.filter(h => h.user_id === user?.id);
    sablonValasztoFrissites(sajat, sablonok);

    sajatKartyakKirajzolasa(sajatDoboz, sajat, sablonok, MUVELETEK);
    kirajzolToplista(hanynapja, user?.id, members, sablonok);
}

// ---------- Műveletek ----------

async function felvetel(e) {
    e.preventDefault();
    const { group } = getState();
    if (!group) return;
    const valaszto = document.getElementById('hn-sablon');
    const mezo = document.getElementById('hn-mit');
    const datum = document.getElementById('hn-datum').value || maiDatum();
    if (!valaszto.value) {
        allapot(tr('hn_err_pick', 'Válaszd ki, mit számoljon.'), true);
        valaszto.focus();
        return;
    }
    if (datum > maiDatum()) {
        allapot(tr('hn_err_future', 'A dátum nem lehet a jövőben.'), true);
        return;
    }

    let sablon = sablonok.find(x => x.id === valaszto.value);
    allapot(tr('saving', 'Mentés...'));

    // új javaslat: előbb a sablon (jóváhagyásig csak nálad látszik), aztán a számláló
    if (valaszto.value === UJ_JAVASLAT) {
        const nev = mezo.value.trim();
        if (nev.length < 1 || nev.length > 40) {
            allapot(tr('hn_err_name', 'Írd be, mit számoljon (legfeljebb 40 karakter).'), true);
            mezo.focus();
            return;
        }
        const letezo = sablonok.find(x => [x.nev, x.nev_en, x.nev_de].some(n => n && kulcs(n) === kulcs(nev)));
        if (letezo) {
            sablon = letezo;
        } else {
            const { data, error } = await sablonJavaslasa(nev);
            if (error) {
                allapot(error.code === '23505'
                    ? tr('hn_err_suggested', 'Ezt már valaki javasolta, jóváhagyás után választhatod.')
                    : tr('err_saving', 'Hiba történt a mentéskor!'), true);
                return;
            }

            sablon = data;
            sablonok.push(data);
        }
    }

    const hiba = await szamlaloFelvetele({
        mit: sablon.nev,
        sablon_id: sablon.id,
        utoljara: datum,
        group_id: group.id,
        lathato_csoportnak: true,
    });
    if (hiba) {
        allapot(hiba.code === '23505'
            ? tr('hn_err_exists', 'Már van ilyen számlálód.')
            : tr('err_saving', 'Hiba történt a mentéskor!'), true);
        return;
    }
    e.target.reset();
    document.getElementById('hn-datum').value = maiDatum();
    // jóváhagyásra küldött javaslatnál nyitva marad, hogy látszódjon az üzenet
    if (sablon.jovahagyva) ujModalZar();
    allapot(!sablon.jovahagyva
        ? tr('hn_suggestion_sent', 'Elküldve jóváhagyásra. A számlálód már megy!')
        : '');
    await betoltes();
}

// Újrakezdés: a sorozat a megadott napon (alapból ma) indul újra. Ha a dátum későbbi az eddigi kezdetnél,
// a közte eltelt napok a rekordba kerülnek, ha az a leghosszabb; ha korábbi, csak a kezdőnapot javítjuk.
async function ujrakezdes(h, datum) {
    const ma = maiDatum();
    if (!datum || datum > ma) {
        allapot(tr('hn_err_future', 'A dátum nem lehet a jövőben.'), true);
        return;
    }
    const napok = Math.max(0, napokKozott(h.utoljara, datum));
    const kerdes = datum === ma
        ? tr('hn_confirm_reset', 'Újrakezded a(z) „{name}” számlálót? A mostani {n} nap a rekordba kerül, ha az a leghosszabb.', { name: szamlaloNev(h, sablonok), n: napok })
        : tr('hn_confirm_reset_date', 'A(z) „{name}” számláló {date} napjától indul újra. Rendben?', { name: szamlaloNev(h, sablonok), date: datum.replaceAll('-', '. ') + '.' });
    if (!await goatsAblak.megerosites(kerdes, { gomb: tr('hn_btn_restart', 'Újrakezdés') })) return;
    if (!await szamlaloUjrakezdese(h.id, datum, Math.max(h.rekord, napok))) {
        allapot(tr('err_saving', 'Hiba történt a mentéskor!'), true);
        return;
    }
    allapot('');
    await betoltes();
}

async function torles(h) {
    if (!await goatsAblak.megerosites(tr('hn_confirm_delete', 'Biztosan törlöd a(z) „{name}” számlálót?', { name: szamlaloNev(h, sablonok) }), { gomb: tr('delete', 'Törlés'), veszely: true })) return;
    if (!await szamlaloTorlese(h.id)) {
        allapot(tr('err_deleting', 'Hiba történt a törlés során!'), true);
        return;
    }
    await betoltes();
}

// ---------- Telefonos modal az új számláló űrlapjához ----------
// Gépen az űrlap a fejlécben van; telefonon csak a "Hozzáadás" gomb látszik, és az nyitja meg.

const TELEFON = window.matchMedia('(max-width: 600px)');

function ujModalNyit() {
    const hatter = document.getElementById('hn-uj-hatter');
    hatter.classList.add('nyitva');
    hatter.setAttribute('role', 'dialog');
    hatter.setAttribute('aria-modal', 'true');
    hatter.setAttribute('aria-labelledby', 'hn-uj-cim');
    document.getElementById('hn-uj-nyito').setAttribute('aria-expanded', 'true');
    document.getElementById('hn-sablon').focus();
}

function ujModalZar() {
    const hatter = document.getElementById('hn-uj-hatter');
    if (!hatter?.classList.contains('nyitva')) return;
    hatter.classList.remove('nyitva');
    hatter.removeAttribute('role');
    hatter.removeAttribute('aria-modal');
    hatter.removeAttribute('aria-labelledby');
    const nyito = document.getElementById('hn-uj-nyito');
    nyito.setAttribute('aria-expanded', 'false');
    if (TELEFON.matches) nyito.focus();
}

function ujModalBekotese() {
    document.getElementById('hn-uj-nyito')?.addEventListener('click', ujModalNyit);
    document.getElementById('hn-uj-bezar')?.addEventListener('click', ujModalZar);
    // a sötét háttérre koppintás is bezárja (az űrlapon belüli koppintás nem)
    document.getElementById('hn-uj-hatter')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) ujModalZar();
    });
    // ha közben gépi szélességre vált az ablak, ne maradjon modal-állapotban
    TELEFON.addEventListener('change', () => { if (!TELEFON.matches) ujModalZar(); });
}

// ---------- Indítás ----------

async function indit() {
    await ready;
    const datum = document.getElementById('hn-datum');
    if (datum) {
        datum.value = maiDatum();
        datum.max = maiDatum();
    }
    document.getElementById('hn-uj')?.addEventListener('submit', felvetel);
    document.getElementById('hn-sablon')?.addEventListener('change', ujJavaslatMezo);
    ujModalBekotese();
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hn-menu')) menukBezarasa();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            menukBezarasa();
            ujModalZar();
        }
    });
    await betoltes();
}

indit();
