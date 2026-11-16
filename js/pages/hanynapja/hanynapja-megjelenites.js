// Hány napja – megjelenítés: a DOM-elemek felépítése és kirajzolása. Az adatbázist nem ismeri;
// ha a felhasználó csinál valamit (újrakezdés, törlés), a vezérlőtől kapott callbacket hívja meg:
//   muveletek = { ujrakezdeskor(h, datum), torleskor(h) }
// A sablonok listáját is a vezérlő adja át (a nevek és a "Jóváhagyásra vár" jelvény ehhez kell).
import { UJ_JAVASLAT, sablonNev, szamlaloNev, maiDatum, napokOta, kulcs } from './hanynapja-seged.js';

export function allapot(szoveg, hiba = false) {
    const el = document.getElementById('hn-allapot');
    if (!el) return;
    el.textContent = szoveg || '';
    el.classList.toggle('status-hiba', hiba);
}

function gomb(szoveg, osztaly, muvelet) {
    const g = document.createElement('button');
    g.type = 'button';
    g.className = `hn-gomb ${osztaly}`;
    g.textContent = szoveg;
    g.addEventListener('click', muvelet);
    return g;
}

// Egy saját számláló kártyája: felül a neve, középen nagy számmal a napok, alatta a rekord és a gombok.
// A beírt szöveg textContent-tel kerül ki (nem HTML-ként).
function kartya(h, sablonok, muveletek) {
    const napok = napokOta(h.utoljara);

    const elem = document.createElement('div');
    elem.className = 'hn-kartya';

    const cim = document.createElement('h3');
    cim.className = 'hn-cim';
    cim.textContent = szamlaloNev(h, sablonok);

    const szamSor = document.createElement('p');
    szamSor.className = 'hn-napok';
    const szam = document.createElement('span');
    szam.className = 'hn-szam';
    szam.textContent = napok;
    const egyseg = document.createElement('span');
    egyseg.className = 'hn-egyseg';
    egyseg.textContent = tr('hn_days_unit', 'napja');
    szamSor.append(szam, egyseg);

    const rekord = document.createElement('p');
    rekord.className = 'hn-rekord';
    // a mostani sorozat is lehet már hosszabb, mint az elmentett rekord
    rekord.textContent = tr('hn_record', 'Rekord: {n} nap', { n: Math.max(h.rekord, napok) });

    const fejlec = document.createElement('div');
    fejlec.className = 'hn-kartya-fejlec';
    const cimDoboz = document.createElement('div');
    cimDoboz.className = 'hn-cim-doboz';
    cimDoboz.append(cim);
    // a saját, még jóváhagyatlan sablonjavaslat jelvénye
    const sablon = h.sablon_id ? sablonok.find(x => x.id === h.sablon_id) : null;
    if (sablon && !sablon.jovahagyva) {
        const jelveny = document.createElement('span');
        jelveny.className = 'hn-jelveny';
        jelveny.textContent = tr('pending_approval', 'Jóváhagyásra vár');
        cimDoboz.append(jelveny);
    }
    fejlec.append(cimDoboz, muveletMenu(h, muveletek));

    const gombok = document.createElement('div');
    gombok.className = 'hn-gombok';
    const masikNap = gomb(tr('hn_other_day', 'Másik napon'), 'hn-gomb-masik', () => {
        const nyitva = !panel.hidden;
        panel.hidden = nyitva;
        masikNap.setAttribute('aria-expanded', String(!nyitva));
        if (!nyitva) datumMezo.focus();
    });
    masikNap.setAttribute('aria-expanded', 'false');
    gombok.append(
        gomb(tr('hn_reset', 'Ma csináltam'), 'hn-gomb-ujra', () => muveletek.ujrakezdeskor(h, maiDatum())),
        masikNap,
    );

    // "Másik napon": régebbi dátum megadása (pl. tegnap csináltam, csak most írom be)
    const panel = document.createElement('div');
    panel.className = 'hn-masik-panel';
    panel.hidden = true;
    const cimke = document.createElement('label');
    cimke.className = 'hn-datum-cimke';
    const cimkeSzoveg = document.createElement('span');
    cimkeSzoveg.textContent = tr('hn_when', 'Mikor?');
    const datumMezo = document.createElement('input');
    datumMezo.type = 'date';
    datumMezo.className = 'hn-mezo';
    datumMezo.max = maiDatum();
    datumMezo.value = maiDatum();
    cimke.append(cimkeSzoveg, datumMezo);
    panel.append(
        cimke,
        gomb(tr('save', 'Mentés'), 'hn-gomb-fo', () => muveletek.ujrakezdeskor(h, datumMezo.value)),
    );

    elem.append(fejlec, szamSor, rekord, gombok, panel);
    return elem;
}

// ⋮ menü (mint a Képek oldalon): törlés
function muveletMenu(h, muveletek) {
    const menu = document.createElement('div');
    menu.className = 'hn-menu';
    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'hn-menu-gomb';
    gomb.title = tr('actions', 'Műveletek');
    gomb.setAttribute('aria-label', tr('hn_actions', 'Számláló műveletei'));
    gomb.setAttribute('aria-haspopup', 'menu');
    gomb.setAttribute('aria-expanded', 'false');
    const ikon = document.createElement('i');
    ikon.className = 'fa-solid fa-ellipsis-vertical';
    ikon.setAttribute('aria-hidden', 'true');
    gomb.append(ikon);

    const lista = document.createElement('div');
    lista.className = 'hn-menu-lista';
    lista.setAttribute('role', 'menu');
    lista.hidden = true;
    const pont = (szoveg, osztaly, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `hn-menupont ${osztaly}`;
        b.setAttribute('role', 'menuitem');
        b.textContent = szoveg;
        b.addEventListener('click', () => { menukBezarasa(); fn(); });
        return b;
    };
    lista.append(
        pont(tr('delete', 'Törlés'), 'veszelyes', () => muveletek.torleskor(h)),
    );

    gomb.addEventListener('click', (e) => {
        e.stopPropagation();
        const nyit = lista.hidden;
        menukBezarasa();
        lista.hidden = !nyit;
        gomb.setAttribute('aria-expanded', String(nyit));
        if (nyit) lista.querySelector('button')?.focus();
    });
    menu.append(gomb, lista);
    return menu;
}

export function menukBezarasa() {
    document.querySelectorAll('.hn-menu-lista').forEach(l => { l.hidden = true; });
    document.querySelectorAll('.hn-menu-gomb').forEach(g => g.setAttribute('aria-expanded', 'false'));
}

// ---------- Csoport toplista ----------
// Számlálónként (azonos "mit", kis- és nagybetűtől függetlenül) a csoport első három helyezettje a mostani
// sorozat hossza szerint, alatta a saját helyezésed. A sajátod akkor is beleszámít, ha nem osztottad meg
// (azt csak te látod); a többiek közül csak a megosztottak látszanak (RLS). Csak ott van toplista, ahol
// legalább ketten vagytok.
function toplistaKartya(cim, sorok, sajatId, nev) {
    // azonos napszám azonos helyezés (1, 2, 2, 4 ...)
    const rendezett = sorok
        .map(h => ({ ...h, napok: napokOta(h.utoljara) }))
        .sort((a, b) => b.napok - a.napok);
    let elozo = null;
    rendezett.forEach((h, i) => {
        h.hely = (elozo && elozo.napok === h.napok) ? elozo.hely : i + 1;
        elozo = h;
    });

    const elem = document.createElement('div');
    elem.className = 'hn-top-kartya';

    const fej = document.createElement('h3');
    fej.className = 'hn-top-cim';
    fej.textContent = cim;
    elem.append(fej);

    const lista = document.createElement('ol');
    lista.className = 'hn-top-lista';
    const sor = (h) => {
        const li = document.createElement('li');
        li.className = `hn-top-sor hn-hely-${Math.min(h.hely, 4)}${h.user_id === sajatId ? ' hn-en' : ''}`;
        const hely = document.createElement('span');
        hely.className = 'hn-top-hely';
        hely.textContent = h.hely;
        const ki = document.createElement('span');
        ki.className = 'hn-top-nev';
        ki.textContent = h.user_id === sajatId ? tr('hn_you', 'Te') : nev(h.user_id);
        const napok = document.createElement('span');
        napok.className = 'hn-top-napok';
        napok.textContent = tr('hn_n_days', '{n} nap', { n: h.napok });
        li.append(hely, ki, napok);
        return li;
    };
    rendezett.slice(0, 3).forEach(h => lista.append(sor(h)));
    elem.append(lista);

    const en = rendezett.find(h => h.user_id === sajatId);
    if (en && en.hely > 3) {
        const sajat = document.createElement('p');
        sajat.className = 'hn-top-sajat';
        sajat.textContent = tr('hn_your_place', 'A te helyezésed: {n}. ({d} nap)', { n: en.hely, d: en.napok });
        elem.append(sajat);
    }
    return elem;
}

export function kirajzolToplista(sorok, sajatId, members, sablonok) {
    const szakasz = document.getElementById('hn-toplista-szakasz');
    const doboz = document.getElementById('hn-toplista');
    if (!szakasz || !doboz) return;
    const nev = (id) => members.find(m => m.user_id === id)?.display_name || tr('unknown', 'ismeretlen');

    const csoportok = new Map();
    sorok.forEach(h => {
        // sablonos számláló a sablon szerint, a régi (sablon nélküli) a neve szerint csoportosul
        const k = h.sablon_id || kulcs(h.mit);
        if (!csoportok.has(k)) csoportok.set(k, []);
        csoportok.get(k).push(h);
    });
    // a saját számlálóid előre, azon belül a népszerűbbek
    const kartyak = [...csoportok.values()]
        .filter(lista => new Set(lista.map(h => h.user_id)).size >= 2)
        .sort((a, b) => (b.some(h => h.user_id === sajatId) - a.some(h => h.user_id === sajatId)) || (b.length - a.length))
        .map(lista => toplistaKartya(szamlaloNev(lista.find(h => h.user_id === sajatId) || lista[0], sablonok), lista, sajatId, nev));

    szakasz.hidden = kartyak.length === 0;
    doboz.replaceChildren(...kartyak);
}

export function uzenet(doboz, szoveg) {
    const p = document.createElement('p');
    p.className = 'hn-ures';
    p.textContent = szoveg;
    doboz.replaceChildren(p);
}

// A saját számlálók kártyái a dobozba; ha nincs egy sem, egy üzenet
export function sajatKartyakKirajzolasa(doboz, sajat, sablonok, muveletek) {
    if (sajat.length) doboz.replaceChildren(...sajat.map(h => kartya(h, sablonok, muveletek)));
    else uzenet(doboz, tr('hn_none_yet', 'Még nincs számlálód. Vegyél fel egyet fent!'));
}

// A felvételi lista: a jóváhagyott sablonok (és a saját függő javaslataid), amik közül még nincs számlálód,
// a végén "+ Új javaslat..." - ekkor jelenik meg a szövegmező
export function sablonValasztoFrissites(sajat, sablonok) {
    const valaszto = document.getElementById('hn-sablon');
    if (!valaszto) return;
    const elozo = valaszto.value;
    const foglalt = new Set(sajat.map(h => h.sablon_id).filter(Boolean));
    const sajatNevek = new Set(sajat.map(h => kulcs(h.mit)));
    const opcio = (ertek, szoveg) => {
        const o = document.createElement('option');
        o.value = ertek;
        o.textContent = szoveg;
        return o;
    };
    const ures = opcio('', tr('hn_pick', 'Válassz, mit számolj...'));
    ures.disabled = true;
    const szabadok = sablonok.filter(x => !foglalt.has(x.id) && !sajatNevek.has(kulcs(x.nev)))
        .sort((a, b) => sablonNev(a).localeCompare(sablonNev(b), window.goatsNyelv?.locale?.()));
    valaszto.replaceChildren(
        ures,
        ...szabadok.map(x => opcio(x.id, x.jovahagyva ? sablonNev(x) : `${sablonNev(x)} (${tr('pending_approval', 'Jóváhagyásra vár')})`)),
        opcio(UJ_JAVASLAT, tr('hn_new_suggestion', '+ Új javaslat...')),
    );
    valaszto.value = [...valaszto.options].some(o => o.value === elozo && !o.disabled) ? elozo : '';
    ujJavaslatMezo();
}

export function ujJavaslatMezo() {
    const uj = document.getElementById('hn-sablon')?.value === UJ_JAVASLAT;
    const mezo = document.getElementById('hn-mit');
    if (!mezo) return;
    mezo.hidden = !uj;
    document.getElementById('hn-javaslat-tipp').hidden = !uj;
    if (uj) mezo.focus();
}
