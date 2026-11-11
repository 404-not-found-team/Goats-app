// Hány napja: a saját számlálóid és a csoporttársak megosztott számlálói (public.hanynapja).
// A láthatóságot és a jogosultságot az RLS dönti el: a sajátod mindig látszik és módosítható,
// másé csak akkor látszik, ha lathato_csoportnak = true (és csak olvasható).
import { client } from '../supabase-client.js';
import { ready, getState } from '../hitelesites.js';

// a választható sablonok: a jóváhagyottak + a saját függő javaslataid (az RLS csak ezeket adja vissza)
let sablonok = [];
const UJ_JAVASLAT = '__uj';

// A sablon neve a választott nyelven (ha nincs fordítás, a magyar)
function sablonNev(x) {
    const ny = window.goatsNyelv?.aktualis?.();
    return (ny === 'en' ? x.nev_en : ny === 'de' ? x.nev_de : null) || x.nev;
}

// Egy számláló megjelenített neve: sablonosnál a sablon (lefordított) neve, különben a beírt szöveg
function szamlaloNev(h) {
    const x = h.sablon_id ? sablonok.find(s => s.id === h.sablon_id) : null;
    return x ? sablonNev(x) : h.mit;
}

// A mai nap helyi idő szerint, ÉÉÉÉ-HH-NN formában (a "date" oszlop és a dátummező is ezt várja)
function maiDatum() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Hány nap telt el az "utoljara" dátum óta, helyi idő szerint
function napokOta(datum) {
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    const akkor = new Date(`${datum}T00:00:00`);
    return Math.max(0, Math.round((ma - akkor) / 86400000));
}

function allapot(szoveg, hiba = false) {
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
function kartya(h) {
    const napok = napokOta(h.utoljara);

    const elem = document.createElement('div');
    elem.className = 'hn-kartya';

    const cim = document.createElement('h3');
    cim.className = 'hn-cim';
    cim.textContent = szamlaloNev(h);

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
    fejlec.append(cimDoboz, muveletMenu(h));

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
        gomb(tr('hn_reset', 'Ma csináltam'), 'hn-gomb-ujra', () => ujrakezdes(h, maiDatum())),
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
        gomb(tr('save', 'Mentés'), 'hn-gomb-fo', () => ujrakezdes(h, datumMezo.value)),
    );

    elem.append(fejlec, szamSor, rekord, gombok, panel);
    return elem;
}

// ⋮ menü (mint a Képek oldalon): láthatóság váltása és törlés
function muveletMenu(h) {
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
        pont(h.lathato_csoportnak ? tr('hn_hide_from_group', 'Elrejtés a csoport elől') : tr('hn_show_to_group', 'Lássa a csoport is'),
            '', () => lathatosagValtas(h)),
        pont(tr('delete', 'Törlés'), 'veszelyes', () => torles(h)),
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

function menukBezarasa() {
    document.querySelectorAll('.hn-menu-lista').forEach(l => { l.hidden = true; });
    document.querySelectorAll('.hn-menu-gomb').forEach(g => g.setAttribute('aria-expanded', 'false'));
}

// Két ÉÉÉÉ-HH-NN dátum között eltelt napok (b - a)
function napokKozott(a, b) {
    return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

// ---------- Csoport toplista ----------
// Számlálónként (azonos "mit", kis- és nagybetűtől függetlenül) a csoport első három helyezettje a mostani
// sorozat hossza szerint, alatta a saját helyezésed. A sajátod akkor is beleszámít, ha nem osztottad meg
// (azt csak te látod); a többiek közül csak a megosztottak látszanak (RLS). Csak ott van toplista, ahol
// legalább ketten vagytok.
const kulcs = (mit) => String(mit || '').trim().toLocaleLowerCase();

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

function kirajzolToplista(sorok, sajatId, members) {
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
        .map(lista => toplistaKartya(szamlaloNev(lista.find(h => h.user_id === sajatId) || lista[0]), lista, sajatId, nev));

    szakasz.hidden = kartyak.length === 0;
    doboz.replaceChildren(...kartyak);
}

function uzenet(doboz, szoveg) {
    const p = document.createElement('p');
    p.className = 'hn-ures';
    p.textContent = szoveg;
    doboz.replaceChildren(p);
}

async function betoltes() {
    const { group, user, members } = getState();
    const sajatDoboz = document.getElementById('fuggosegek');
    if (!sajatDoboz) return;

    if (!group) {
        document.getElementById('hn-uj')?.setAttribute('hidden', '');
        uzenet(sajatDoboz, tr('err_join_group_first', 'Előbb csatlakozz egy csoporthoz!'));
        return;
    }

    const [{ data: hanynapja, error }, { data: sablonSorok, error: sablonHiba }] = await Promise.all([
        client.from('hanynapja')
            .select('id, user_id, mit, utoljara, rekord, lathato_csoportnak, sablon_id')
            .eq('group_id', group.id)
            .order('letrehozva', { ascending: false })
            .limit(50),
        client.from('hanynapja_sablonok')
            .select('id, nev, nev_en, nev_de, jovahagyva, javasolta_id')
            .order('nev'),
    ]);
    if (sablonHiba) console.error('A sablonok betöltése nem sikerült:', sablonHiba);
    sablonok = sablonSorok || [];
    if (error) {
        console.error('A Hány napja adatai betöltése nem sikerült:', error);
        uzenet(sajatDoboz, tr('err_operation', 'Hiba a művelet során.'));
        return;
    }

    const sajat = hanynapja.filter(h => h.user_id === user?.id);
    sablonValasztoFrissites(sajat);

    if (sajat.length) sajatDoboz.replaceChildren(...sajat.map(h => kartya(h)));
    else uzenet(sajatDoboz, tr('hn_none_yet', 'Még nincs számlálód. Vegyél fel egyet fent!'));

    kirajzolToplista(hanynapja, user?.id, members);
}

// ---------- Műveletek ----------

// A felvételi lista: a jóváhagyott sablonok (és a saját függő javaslataid), amik közül még nincs számlálód,
// a végén "+ Új javaslat..." - ekkor jelenik meg a szövegmező
function sablonValasztoFrissites(sajat) {
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

function ujJavaslatMezo() {
    const uj = document.getElementById('hn-sablon')?.value === UJ_JAVASLAT;
    const mezo = document.getElementById('hn-mit');
    if (!mezo) return;
    mezo.hidden = !uj;
    document.getElementById('hn-javaslat-tipp').hidden = !uj;
    if (uj) mezo.focus();
}

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
            const { data, error } = await client.from('hanynapja_sablonok')
                .insert({ nev }).select('id, nev, nev_en, nev_de, jovahagyva, javasolta_id').single();
            if (error) {
                console.error('A javaslat beküldése nem sikerült:', error);
                // 23505: van már ilyen nevű sablon, csak még más javaslataként jóváhagyásra vár
                allapot(error.code === '23505'
                    ? tr('hn_err_suggested', 'Ezt már valaki javasolta, jóváhagyás után választhatod.')
                    : tr('err_saving', 'Hiba történt a mentéskor!'), true);
                return;
            }
            sablon = data;
            sablonok.push(data);
        }
    }

    const { error } = await client.from('hanynapja').insert({
        mit: sablon.nev,
        sablon_id: sablon.id,
        utoljara: datum,
        group_id: group.id,
        lathato_csoportnak: document.getElementById('hn-lathato').checked,
    });
    if (error) {
        console.error('A számláló felvétele nem sikerült:', error);
        // 23505: már van ilyen számlálója (unique (user_id, mit) / (user_id, sablon_id))
        allapot(error.code === '23505'
            ? tr('hn_err_exists', 'Már van ilyen számlálód.')
            : tr('err_saving', 'Hiba történt a mentéskor!'), true);
        return;
    }
    e.target.reset();
    document.getElementById('hn-datum').value = maiDatum();
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
        ? tr('hn_confirm_reset', 'Újrakezded a(z) „{name}” számlálót? A mostani {n} nap a rekordba kerül, ha az a leghosszabb.', { name: szamlaloNev(h), n: napok })
        : tr('hn_confirm_reset_date', 'A(z) „{name}” számláló {date} napjától indul újra. Rendben?', { name: szamlaloNev(h), date: datum.replaceAll('-', '. ') + '.' });
    if (!confirm(kerdes)) return;
    const { error } = await client.from('hanynapja')
        .update({ utoljara: datum, rekord: Math.max(h.rekord, napok) })
        .eq('id', h.id);
    if (error) {
        console.error('Az újrakezdés nem sikerült:', error);
        allapot(tr('err_saving', 'Hiba történt a mentéskor!'), true);
        return;
    }
    allapot('');
    await betoltes();
}

async function lathatosagValtas(h) {
    const { error } = await client.from('hanynapja')
        .update({ lathato_csoportnak: !h.lathato_csoportnak })
        .eq('id', h.id);
    if (error) {
        console.error('A láthatóság módosítása nem sikerült:', error);
        allapot(tr('err_saving', 'Hiba történt a mentéskor!'), true);
        return;
    }
    await betoltes();
}

async function torles(h) {
    if (!confirm(tr('hn_confirm_delete', 'Biztosan törlöd a(z) „{name}” számlálót?', { name: szamlaloNev(h) }))) return;
    const { error } = await client.from('hanynapja').delete().eq('id', h.id);
    if (error) {
        console.error('A törlés nem sikerült:', error);
        allapot(tr('err_deleting', 'Hiba történt a törlés során!'), true);
        return;
    }
    await betoltes();
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
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hn-menu')) menukBezarasa();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') menukBezarasa();
    });
    await betoltes();
}

indit();