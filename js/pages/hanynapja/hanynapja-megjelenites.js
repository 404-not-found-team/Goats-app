// Hány napja – megjelenítés: a DOM-elemek felépítése és kirajzolása. Az adatbázist nem ismeri;
// ha a felhasználó csinál valamit (újrakezdés, törlés), a vezérlőtől kapott callbacket hívja meg:
//   muveletek = { ujrakezdeskor(h, datum), torleskor(h) }
// Egyesített nézet: számlálónként EGY kártya – fölül a te értéked, középen a csoport rangsora,
// legalul a gombok. Amit csak te viszel: "Ezt csak te viszed". Amit a csoport visz, de te nem:
// a lap alján, külön rangsor-kártyaként.
import { UJ_JAVASLAT, sablonNev, szamlaloNev, maiDatum, napokOta, kulcs } from './hanynapja-seged.js';

// Statikus (megbízható) korona ikon a „Soha" jelzéshez
const KORONA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7l3.6 2.4L12 3l5.4 6.4L21 7l-1.6 11H4.6L3 7z"></path></svg>';

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

// ---------- Kártya-építő darabok ----------

// Fejléc: a számláló neve + (függő sablonnál) jelvény + ⋮ menü
function fejlecEpites(h, sablonok, muveletek) {
    const cim = document.createElement('h3');
    cim.className = 'hn-cim';
    cim.textContent = szamlaloNev(h, sablonok);

    const fejlec = document.createElement('div');
    fejlec.className = 'hn-kartya-fejlec';
    const cimDoboz = document.createElement('div');
    cimDoboz.className = 'hn-cim-doboz';
    cimDoboz.append(cim);
    const sablon = h.sablon_id ? sablonok.find(x => x.id === h.sablon_id) : null;
    if (sablon && !sablon.jovahagyva) {
        const jelveny = document.createElement('span');
        jelveny.className = 'hn-jelveny';
        jelveny.textContent = tr('pending_approval', 'Jóváhagyásra vár');
        cimDoboz.append(jelveny);
    }
    fejlec.append(cimDoboz, muveletMenu(h, muveletek));
    return fejlec;
}

// A kártya alján a gombok: "Ma csináltam"/"Most csináltam" + "Másik napon" (dátum).
// Soha-számlálónál is ez váltja dátumossá (a vezérlő törli a soha jelzőt). Visszaad: [gombok, panel].
function epitGombok(h, muveletek) {
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
        gomb(h.soha ? tr('hn_did_now', 'Most csináltam') : tr('hn_reset', 'Ma csináltam'),
            'hn-gomb-ujra', () => muveletek.ujrakezdeskor(h, maiDatum())),
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
    return [gombok, panel];
}

// A csoport rangsora egy habithoz: fölül a "sosem csinálták" (arany chipek), alatta a "leszoktak" dobogó.
// Ha csak te viszed (nincs rajtad kívül más), "Ezt csak te viszed".
function csoportRangsor(group, sajatId, nev) {
    const doboz = document.createElement('div');
    doboz.className = 'hn-egyesit-csoport';

    if (new Set(group.map(h => h.user_id)).size < 2) {
        const p = document.createElement('p');
        p.className = 'hn-egyesit-csak-te';
        p.textContent = tr('hn_only_you', 'Ezt csak te viszed.');
        doboz.append(p);
        return doboz;
    }

    const sohak = group.filter(h => h.soha);
    const leszoktak = group.filter(h => !h.soha)
        .map(h => ({ ...h, napok: napokOta(h.utoljara) }))
        .sort((a, b) => b.napok - a.napok);
    // azonos napszám azonos helyezés (1, 2, 2, 4 ...)
    let elozo = null;
    leszoktak.forEach((h, i) => {
        h.hely = (elozo && elozo.napok === h.napok) ? elozo.hely : i + 1;
        elozo = h;
    });

    const alcim = (szoveg, arany) => {
        const p = document.createElement('p');
        p.className = 'hn-top-alcim' + (arany ? ' hn-top-alcim-arany' : '');
        p.textContent = szoveg;
        return p;
    };

    // "Sosem csinálták" – arany chipek, rang nélkül
    if (sohak.length) {
        if (leszoktak.length) doboz.append(alcim(tr('hn_never_section', 'Sosem csinálták'), true));
        const chipSor = document.createElement('div');
        chipSor.className = 'hn-chip-sor';
        sohak.forEach(h => {
            const chip = document.createElement('span');
            chip.className = 'hn-chip' + (h.user_id === sajatId ? ' hn-en' : '');
            chip.textContent = h.user_id === sajatId ? tr('hn_you', 'Te') : nev(h.user_id);
            chipSor.append(chip);
        });
        doboz.append(chipSor);
    }

    // "Leszoktak" – a megszokott napszám-rangsor (első három + a saját helyezésed)
    if (leszoktak.length) {
        if (sohak.length) doboz.append(alcim(tr('hn_quit_section', 'Leszoktak'), false));
        const lista = document.createElement('ol');
        lista.className = 'hn-top-lista';
        leszoktak.slice(0, 3).forEach(h => {
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
            lista.append(li);
        });
        doboz.append(lista);

        const en = leszoktak.find(h => h.user_id === sajatId);
        if (en && en.hely > 3) {
            const sajat = document.createElement('p');
            sajat.className = 'hn-top-sajat';
            sajat.textContent = tr('hn_your_place', 'A te helyezésed: {n}. ({d} nap)', { n: en.hely, d: en.napok });
            doboz.append(sajat);
        }
    }
    return doboz;
}

// Egy SAJÁT számláló egyesített kártyája: te értéked + a csoport rangsora + gombok
function egyesitettKartya(enyem, group, sablonok, sajatId, nev, muveletek) {
    const elem = document.createElement('div');
    elem.className = 'hn-kartya';
    elem.append(fejlecEpites(enyem, sablonok, muveletek));

    if (enyem.soha) {
        const allapotDoboz = document.createElement('div');
        allapotDoboz.className = 'hn-soha-allapot';
        const korong = document.createElement('span');
        korong.className = 'hn-soha-korong';
        korong.setAttribute('aria-hidden', 'true');
        korong.innerHTML = KORONA;
        const szoveg = document.createElement('span');
        szoveg.className = 'hn-soha-szoveg';
        szoveg.textContent = tr('hn_never_card', 'Sosem csináltad');
        allapotDoboz.append(korong, szoveg);
        elem.append(allapotDoboz);
    } else {
        const napok = napokOta(enyem.utoljara);
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
        rekord.textContent = tr('hn_record', 'Rekord: {n} nap', { n: Math.max(enyem.rekord, napok) });
        elem.append(szamSor, rekord);
    }

    const valaszto = document.createElement('div');
    valaszto.className = 'hn-egyesit-valaszto';
    const [gombok, panel] = epitGombok(enyem, muveletek);
    elem.append(valaszto, csoportRangsor(group, sajatId, nev), gombok, panel);
    return elem;
}

// Egy habit, amit a csoport visz, de te NEM: csak a rangsor (nincs saját érték, nincs gomb)
function csakRangsorKartya(group, sajatId, nev, sablonok) {
    const elem = document.createElement('div');
    elem.className = 'hn-kartya hn-kartya-csoport';
    const cim = document.createElement('h3');
    cim.className = 'hn-cim';
    cim.textContent = szamlaloNev(group[0], sablonok);
    elem.append(cim, csoportRangsor(group, sajatId, nev));
    return elem;
}

export function uzenet(doboz, szoveg) {
    const p = document.createElement('p');
    p.className = 'hn-ures';
    p.textContent = szoveg;
    doboz.replaceChildren(p);
}

// Egyesített kirajzolás: a te számlálóid (sosem csináltam alulra), majd a csoport többi számlálója.
export function egyesitettKirajzolasa(doboz, osszes, sajatId, sablonok, members, muveletek) {
    const nev = (id) => members.find(m => m.user_id === id)?.display_name || tr('unknown', 'ismeretlen');

    // habit szerint: sablonos a sablon_id, a régi (sablon nélküli) a neve szerint
    const csoportok = new Map();
    osszes.forEach(h => {
        const k = h.sablon_id || kulcs(h.mit);
        if (!csoportok.has(k)) csoportok.set(k, []);
        csoportok.get(k).push(h);
    });

    const sajatKartyak = [];
    const csoportCsak = [];
    csoportok.forEach(group => {
        const enyem = group.find(h => h.user_id === sajatId);
        if (enyem) sajatKartyak.push({ enyem, group });
        else if (new Set(group.map(h => h.user_id)).size >= 2) csoportCsak.push(group);
    });
    // a "sosem csináltam" saját számlálók a lista aljára
    sajatKartyak.sort((a, b) => (a.enyem.soha ? 1 : 0) - (b.enyem.soha ? 1 : 0));

    const elemek = [];
    if (sajatKartyak.length) {
        sajatKartyak.forEach(({ enyem, group }) =>
            elemek.push(egyesitettKartya(enyem, group, sablonok, sajatId, nev, muveletek)));
    } else {
        const p = document.createElement('p');
        p.className = 'hn-ures';
        p.textContent = tr('hn_none_yet', 'Még nincs számlálód. Vegyél fel egyet fent!');
        elemek.push(p);
    }
    if (csoportCsak.length) {
        const cimke = document.createElement('p');
        cimke.className = 'hn-egyesit-szakcim';
        cimke.textContent = tr('hn_group_other', 'A csoport többi számlálója');
        elemek.push(cimke);
        // a népszerűbbek (többen viszik) előre
        csoportCsak.sort((a, b) => b.length - a.length);
        csoportCsak.forEach(group => elemek.push(csakRangsorKartya(group, sajatId, nev, sablonok)));
    }
    doboz.replaceChildren(...elemek);
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
