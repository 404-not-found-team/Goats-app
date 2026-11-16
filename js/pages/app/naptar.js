let maiDatum = new Date();
let meglatogatottEv = maiDatum.getFullYear();
let meglatogatottHonap = maiDatum.getMonth(); // 0 - 11
let esemenyekListaja = [];
let aktivEsemeny = null;
let kivalasztottDatumString = ''; // a Hónap nézetben kiválasztott nap ("ÉÉÉÉ-HH-NN"), alapból a mai

const honapNevek = [
    "Január", "Február", "Március", "Április", "Május", "Június",
    "Július", "Augusztus", "Szeptember", "Október", "November", "December"
].map((nev, i) => tr(`month_${i + 1}`, nev));

document.addEventListener('DOMContentLoaded', () => {
    initNaptar();
});

// aktualisGroupCode(): lásd js/segedek/csoport-kod.js (közös, minden klasszikus oldalscript használja)

async function initNaptar() {
    kivalasztottDatumString = datumKulcs(new Date());
    setupGombok();
    naptarNyitoBekotese();
    nezetValtoBekotese();
    kirajzolNaptar(); // a hónap rácsa adat nélkül is azonnal látszik
    if (window.goatsAuth) await window.goatsAuth.ready;
    await betoltEsemenyek();
}

function setupGombok() {
    document.getElementById('elozo-honap-btn')?.addEventListener('click', () => {
        meglatogatottHonap--;
        if (meglatogatottHonap < 0) {
            meglatogatottHonap = 11;
            meglatogatottEv--;
        }
        kirajzolNaptar();
    });

    document.getElementById('kovetkezo-honap-btn')?.addEventListener('click', () => {
        meglatogatottHonap++;
        if (meglatogatottHonap > 11) {
            meglatogatottHonap = 0;
            meglatogatottEv++;
        }
        kirajzolNaptar();
    });

    // "Ma": vissza a mai hónapra, és a mai nap lesz kiválasztva
    document.getElementById('naptar-ma-btn')?.addEventListener('click', () => {
        maiDatum = new Date();
        meglatogatottEv = maiDatum.getFullYear();
        meglatogatottHonap = maiDatum.getMonth();
        kivalasztottDatumString = datumKulcs(maiDatum);
        kirajzolNaptar();
    });

    // új esemény a kiválasztott napra, illetve a Lista nézetből a mai dátummal
    document.getElementById('naptar-nap-uj')?.addEventListener('click', () => ujEsemenyModal(kivalasztottDatumString));
    document.getElementById('naptar-lista-uj')?.addEventListener('click', () => ujEsemenyModal(datumKulcs(new Date())));

    document.getElementById('close-esemeny-modal')?.addEventListener('click', () => {
        const modal = document.getElementById('esemeny-modal');
        if (modal) modal.hidden = true;
    });
    document.getElementById('ment-esemeny-btn')?.addEventListener('click', mentUjEsemeny);

    // Szerkesztő modal gombjai
    document.getElementById('close-esemeny-reszletek-modal')?.addEventListener('click', () => {
        document.getElementById('esemeny-reszletek-modal').hidden = true;
    });

    // "Közelgő események" kártya: új esemény a mai dátummal
    document.getElementById('kozelgo-uj-gomb')?.addEventListener('click', () => ujEsemenyModal(datumKulcs(new Date())));

    document.getElementById('modosit-esemeny-btn')?.addEventListener('click', modositEsemeny);
    document.getElementById('torol-esemeny-btn')?.addEventListener('click', () => {
        if (aktivEsemeny && confirm(tr('confirm_delete_event', 'Biztosan törlöd ezt az eseményt: "{title}"?', { title: aktivEsemeny.cim }))) {
            torolEsemeny(aktivEsemeny.id);
            document.getElementById('esemeny-reszletek-modal').hidden = true;
        }
    });
}

// Előbb az utoljára látott események (azonnal), majd a friss lista a háttérben (js/segedek/adat-gyorsitotar.js)
async function betoltEsemenyek() {
    const groupCode = aktualisGroupCode();
    if (!groupCode) return;

    const lekero = async () => {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        const { data, error } = await client
            .from('esemenyek')
            .select('*')
            .eq('group_code', groupCode);
        if (window.goatsHiba.hibaVan(error, 'az események betöltésekor')) {
            return undefined;
        }
        return data || [];
    };
    const megjelenito = (adat) => {
        esemenyekListaja = adat;
        kirajzolNaptar();
    };

    if (window.goatsAdatTar) await window.goatsAdatTar.betolt('esemenyek', lekero, megjelenito);
    else {
        const adat = await lekero();
        if (adat !== undefined) megjelenito(adat);
    }
}

// Helyi módosítás után a tárolt példány is frissül (a következő betöltés is a mostani állapotot mutatja)
function esemenyekTarolasa() {
    window.goatsAdatTar?.ir('esemenyek', esemenyekListaja);
}

function kirajzolNaptar() {
    const honapNevElem = document.getElementById('naptar-honap-nev');
    const racs = document.getElementById('naptar-rács');
    if (!racs || !honapNevElem) return;

    honapNevElem.textContent = `${meglatogatottEv} ${honapNevek[meglatogatottHonap]}`;
    racs.innerHTML = '';

    // Mindig 6 hét (42 nap) hétfőtől: az előző és a következő hónap napjai halványan töltik ki a rácsot,
    // így lapozáskor nem változik a naptár magassága. Egy nap: szám körben (mai: keret, kiválasztott:
    // kitöltve), alatta pötty, ha van eseménye. Koppintásra kiválasztódik, és a rács alatt megjelennek
    // az eseményei; más hónap napjára koppintva oda lapoz.
    const elsoNap = new Date(meglatogatottEv, meglatogatottHonap, 1);
    const eltolas = (elsoNap.getDay() + 6) % 7; // hétfő = 0
    const ma = datumKulcs(new Date());
    for (let i = 0; i < 42; i++) {
        const datum = new Date(meglatogatottEv, meglatogatottHonap, 1 - eltolas + i);
        const dString = datumKulcs(datum);
        const hetNapja = datum.getDay();
        const masHonap = datum.getMonth() !== meglatogatottHonap;
        const vanEsemeny = esemenyekListaja.some(e => e.datum === dString);

        const napGomb = document.createElement('button');
        napGomb.type = 'button';
        napGomb.className = 'naptar-nap';
        napGomb.classList.toggle('mas-honap', masHonap);
        napGomb.classList.toggle('hetvege', hetNapja === 0 || hetNapja === 6);
        napGomb.classList.toggle('mai-nap', dString === ma);
        napGomb.classList.toggle('kivalasztott', dString === kivalasztottDatumString);
        napGomb.classList.toggle('van-esemeny', vanEsemeny);
        napGomb.setAttribute('aria-pressed', String(dString === kivalasztottDatumString));
        napGomb.setAttribute('aria-label', hosszuDatum(dString)
            + (vanEsemeny ? `, ${tr('has_events', 'van esemény')}` : ''));

        const napSzamSpan = document.createElement('span');
        napSzamSpan.className = 'nap-szam';
        napSzamSpan.textContent = datum.getDate();
        const pont = document.createElement('span');
        pont.className = 'nap-pont';
        pont.setAttribute('aria-hidden', 'true');
        napGomb.append(napSzamSpan, pont);

        napGomb.addEventListener('click', () => {
            kivalasztottDatumString = dString;
            if (masHonap) {
                meglatogatottEv = datum.getFullYear();
                meglatogatottHonap = datum.getMonth();
                kirajzolNaptar();
                return;
            }
            racs.querySelectorAll('.naptar-nap.kivalasztott').forEach(n => {
                n.classList.remove('kivalasztott');
                n.setAttribute('aria-pressed', 'false');
            });
            napGomb.classList.add('kivalasztott');
            napGomb.setAttribute('aria-pressed', 'true');
            kirajzolNapReszleteket();
        });

        racs.appendChild(napGomb);
    }

    kirajzolNapReszleteket();
    kirajzolListat();
    kirajzolKozelgoket();
}

function ujEsemenyModal(datum) {
    const datumInput = document.getElementById('esemeny-datum-input');
    if (datumInput) datumInput.value = datum;
    document.getElementById('esemeny-modal').hidden = false;
}

// "ÉÉÉÉ-HH-NN" -> helyi Date (éjfél)
function datumbol(dString) {
    const [ev, honap, nap] = dString.split('-').map(Number);
    return new Date(ev, honap - 1, nap);
}

// pl. "november 20., péntek" (a nyelvnek megfelelően)
function hosszuDatum(dString) {
    return datumbol(dString).toLocaleDateString(goatsNyelv.locale(), { month: 'long', day: 'numeric', weekday: 'long' });
}

// "Ma" / "Holnap" / "4 nap múlva" / "2 napja"
function mikorSzoveg(dString) {
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    const hanyNap = Math.round((datumbol(dString) - ma) / 86400000);
    if (hanyNap === 0) return tr('today', 'Ma');
    if (hanyNap === 1) return tr('tomorrow', 'Holnap');
    if (hanyNap > 1) return tr('in_days', '{n} nap múlva', { n: hanyNap });
    return tr('days_ago', '{n} napja', { n: -hanyNap });
}

// Egy esemény kártyája (a kiválasztott nap alatt és a Lista nézetben); koppintásra szerkeszthető
function esemenyKartya(es, mutatMikor = true) {
    const kartya = document.createElement('button');
    kartya.type = 'button';
    kartya.className = 'naptar-esemeny-kartya';
    const csik = document.createElement('span');
    csik.className = 'naptar-esemeny-csik';
    csik.setAttribute('aria-hidden', 'true');
    const cim = document.createElement('b');
    cim.textContent = es.cim;
    kartya.append(csik, cim);
    if (mutatMikor) {
        const mikor = document.createElement('span');
        mikor.className = 'naptar-esemeny-mikor';
        mikor.textContent = mikorSzoveg(es.datum);
        kartya.appendChild(mikor);
    }
    kartya.addEventListener('click', () => nyisdEsemenySzerkesztest(es));
    return kartya;
}

// A rács alatti rész: a kiválasztott nap dátuma és eseményei
function kirajzolNapReszleteket() {
    const cim = document.getElementById('naptar-nap-cim');
    const lista = document.getElementById('naptar-nap-lista');
    if (!cim || !lista) return;
    cim.textContent = hosszuDatum(kivalasztottDatumString);
    const napiEsemenyek = esemenyekListaja
        .filter(e => e.datum === kivalasztottDatumString)
        .sort((a, b) => a.cim.localeCompare(b.cim));
    if (napiEsemenyek.length === 0) {
        const ures = document.createElement('p');
        ures.className = 'naptar-ures';
        ures.textContent = tr('no_events_day', 'Nincsenek események ezen a napon.');
        lista.replaceChildren(ures);
        return;
    }
    lista.replaceChildren(...napiEsemenyek.map(es => esemenyKartya(es)));
}

// Lista nézet: a mai és a későbbi események hónaponként csoportosítva, a lista elején a "Ma" jelölővel
function kirajzolListat() {
    const lista = document.getElementById('naptar-lista');
    if (!lista) return;
    const maKulcs = datumKulcs(new Date());
    const maiEv = new Date().getFullYear();
    const kovetkezok = esemenyekListaja
        .filter(e => e.datum >= maKulcs)
        .sort((a, b) => a.datum.localeCompare(b.datum) || a.cim.localeCompare(b.cim));

    const elemek = [];
    let honapKulcs = '';
    const honapCim = (dString) => {
        const d = datumbol(dString);
        const cim = document.createElement('h4');
        cim.className = 'naptar-lista-honap';
        cim.textContent = d.toLocaleDateString(goatsNyelv.locale(), d.getFullYear() === maiEv
            ? { month: 'long' } : { month: 'long', year: 'numeric' });
        return cim;
    };

    // a mai hónap címe és a "Ma" jelölő mindig az elején áll
    elemek.push(honapCim(maKulcs));
    honapKulcs = maKulcs.slice(0, 7);
    const maJelolo = document.createElement('div');
    maJelolo.className = 'naptar-lista-ma';
    maJelolo.textContent = `${tr('today', 'Ma')}, ${datumbol(maKulcs).toLocaleDateString(goatsNyelv.locale(), { day: 'numeric', weekday: 'long' })}`;
    elemek.push(maJelolo);

    kovetkezok.forEach(es => {
        if (es.datum.slice(0, 7) !== honapKulcs) {
            honapKulcs = es.datum.slice(0, 7);
            elemek.push(honapCim(es.datum));
        }
        const sor = document.createElement('div');
        sor.className = 'naptar-lista-sor';
        const datum = document.createElement('span');
        datum.className = 'naptar-lista-datum';
        const napSzam = document.createElement('b');
        napSzam.textContent = datumbol(es.datum).getDate();
        const hetNap = document.createElement('span');
        hetNap.textContent = datumbol(es.datum).toLocaleDateString(goatsNyelv.locale(), { weekday: 'short' }).replace('.', '');
        datum.append(napSzam, hetNap);
        sor.append(datum, esemenyKartya(es));
        elemek.push(sor);
    });

    if (kovetkezok.length === 0) {
        const ures = document.createElement('p');
        ures.className = 'naptar-ures';
        ures.textContent = tr('no_upcoming_events', 'Még nincs tervezett program. Vegyetek fel egyet!');
        elemek.push(ures);
    }
    lista.replaceChildren(...elemek);
}

// Lista / Hónap váltó; a választást a böngésző megjegyzi (alapból Hónap)
const NAPTAR_NEZET_KULCS = 'goats-naptar-nezet';

function nezetValtoBekotese() {
    let nezet = 'honap';
    try { if (localStorage.getItem(NAPTAR_NEZET_KULCS) === 'lista') nezet = 'lista'; } catch { /* privát mód */ }
    nezetAllit(nezet);
    document.querySelectorAll('.naptar-nezetvalto [data-nezet]').forEach(gomb => {
        gomb.addEventListener('click', () => {
            nezetAllit(gomb.dataset.nezet);
            try { localStorage.setItem(NAPTAR_NEZET_KULCS, gomb.dataset.nezet); } catch { /* privát mód */ }
        });
    });
}

function nezetAllit(nezet) {
    document.querySelectorAll('.naptar-nezetvalto [data-nezet]').forEach(g => {
        g.setAttribute('aria-pressed', String(g.dataset.nezet === nezet));
    });
    const honap = document.getElementById('naptar-honap-nezet');
    const lista = document.getElementById('naptar-lista-nezet');
    // a Hónap nézet Lista nézetben is helyet foglal (láthatatlanul), így nem változik a naptár magassága
    if (honap) {
        honap.classList.toggle('nezet-rejtett', nezet !== 'honap');
        honap.inert = nezet !== 'honap';
    }
    if (lista) lista.hidden = nezet !== 'lista';
}

// Telefonon a naptár egy összecsukható sáv a közelgő események alatt. A böngésző megjegyzi, hogy nyitva
// hagytad-e (localStorage; ha nem elérhető, mindig összecsukva indul). Asztalin a CSS mindig mutatja.
const NAPTAR_NYITVA_KULCS = 'goats-naptar-nyitva';

function naptarNyitoBekotese() {
    const gomb = document.getElementById('naptar-nyito');
    if (!gomb) return;
    let nyitva = false;
    try { nyitva = localStorage.getItem(NAPTAR_NYITVA_KULCS) === '1'; } catch { /* privát mód */ }
    naptarNyitvaAllit(nyitva);
    gomb.addEventListener('click', () => {
        const uj = gomb.getAttribute('aria-expanded') !== 'true';
        naptarNyitvaAllit(uj);
        try { localStorage.setItem(NAPTAR_NYITVA_KULCS, uj ? '1' : '0'); } catch { /* privát mód */ }
    });
}

function naptarNyitvaAllit(nyitva) {
    document.getElementById('naptar-nyito')?.setAttribute('aria-expanded', String(nyitva));
    document.querySelector('.naptar-kontener')?.classList.toggle('nyitva', nyitva);
    // a .hatter osztálya szűkíti a közelgő események kártyát (csak telefonon)
    document.querySelector('.hatter')?.classList.toggle('naptar-nyitva', nyitva);
}

// "ÉÉÉÉ-HH-NN" a helyi dátumból (az esemenyek.datum is ilyen formájú)
function datumKulcs(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Közelgő események kártya (asztalin a naptár mellett, telefonon előtte): a mai és a későbbi események
// időrendben; ha nincs ilyen, egy rövid üzenet hív új esemény felvételére
const KOZELGO_MAX = 4;

function kirajzolKozelgoket() {
    const lista = document.getElementById('kozelgo-lista');
    if (!lista) return;
    const ma = datumKulcs(new Date());
    const kozelgok = esemenyekListaja
        .filter(e => e.datum >= ma)
        .sort((a, b) => a.datum.localeCompare(b.datum) || a.cim.localeCompare(b.cim))
        .slice(0, KOZELGO_MAX);
    lista.replaceChildren(...kozelgok.map(kozelgoElem));
    const ures = document.getElementById('kozelgo-ures');
    if (ures) ures.hidden = kozelgok.length > 0;
}

function kozelgoElem(es) {
    const datum = datumbol(es.datum);
    const nap = datum.getDate();

    const elem = document.createElement('button');
    elem.type = 'button';
    elem.className = 'kozelgo-elem';

    const jelveny = document.createElement('span');
    jelveny.className = 'kozelgo-datum';
    const napSzam = document.createElement('b');
    napSzam.textContent = nap;
    const honapNev = document.createElement('span');
    honapNev.textContent = datum.toLocaleDateString(goatsNyelv.locale(), { month: 'short' }).replace('.', '');
    jelveny.append(napSzam, honapNev);

    const szoveg = document.createElement('span');
    szoveg.className = 'kozelgo-szoveg';
    const cim = document.createElement('b');
    cim.textContent = es.cim;
    const mikor = document.createElement('span');
    mikor.textContent = mikorSzoveg(es.datum);
    szoveg.append(cim, mikor);

    elem.append(jelveny, szoveg);
    elem.addEventListener('click', () => nyisdEsemenySzerkesztest(es));
    return elem;
}

// Szerkesztő modal megnyitása
function nyisdEsemenySzerkesztest(esemeiny) {
    aktivEsemeny = esemeiny;
    const modal = document.getElementById('esemeny-reszletek-modal');
    const cimInput = document.getElementById('szerkeszt-esemeny-cim');
    const datumInput = document.getElementById('szerkeszt-esemeny-datum');

    if (modal && cimInput && datumInput) {
        cimInput.value = esemeiny.cim;
        datumInput.value = esemeiny.datum;
        modal.hidden = false;
    }
}

async function modositEsemeny() {
    if (!aktivEsemeny) return;

    const cimInput = document.getElementById('szerkeszt-esemeny-cim');
    const datumInput = document.getElementById('szerkeszt-esemeny-datum');

    const ujCim = cimInput ? cimInput.value.trim() : '';
    const ujDatum = datumInput ? datumInput.value : '';

    if (!ujCim || !ujDatum) {
        return alert(tr('err_title_date', 'Adj meg címet és dátumot!'));
    }

    try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;

        const { error } = await client
            .from('esemenyek')
            .update({ cim: ujCim, datum: ujDatum })
            .eq('id', aktivEsemeny.id);

        if (window.goatsHiba.hibaVan(error, 'az esemény módosításakor')) {
            alert(tr('err_modify', 'Hiba a módosításkor: {msg}', { msg: error.message }));
            return;
        }

        const index = esemenyekListaja.findIndex(e => e.id === aktivEsemeny.id);
        if (index !== -1) {
            esemenyekListaja[index].cim = ujCim;
            esemenyekListaja[index].datum = ujDatum;
        }

        document.getElementById('esemeny-reszletek-modal').hidden = true;
        esemenyekTarolasa();
        kirajzolNaptar();
    } catch (err) {
        console.error('Kivétel történt:', err);
        alert(tr('err_modify_unexpected', 'Váratlan hiba történt a módosítás során!'));
    }
}

async function mentUjEsemeny() {
    const groupCode = aktualisGroupCode();
    const cimInput = document.getElementById('esemeny-cim-input');
    const datumInput = document.getElementById('esemeny-datum-input');

    if (!groupCode) return alert(tr('err_join_group_first', 'Lépj be egy csoportba!'));
    if (!cimInput.value.trim() || !datumInput.value) {
        return alert(tr('err_title_date', 'Adj meg címet és dátumot!'));
    }

    const újEsemeny = {
        group_code: groupCode,
        cim: cimInput.value.trim(),
        datum: datumInput.value
    };

    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const { data, error } = await client
        .from('esemenyek')
        .insert([újEsemeny])
        .select();

    if (window.goatsHiba.hibaVan(error, 'az esemény mentésekor', tr('err_saving', 'Hiba történt a mentéskor!'))) return;

    if (data) esemenyekListaja.push(data[0]);

    cimInput.value = '';
    datumInput.value = '';
    document.getElementById('esemeny-modal').hidden = true;

    esemenyekTarolasa();
    kirajzolNaptar();
}

async function torolEsemeny(id) {
    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const { error } = await client
        .from('esemenyek')
        .delete()
        .eq('id', id);

    if (window.goatsHiba.hibaVan(error, 'az esemény törlésekor', tr('err_deleting', 'Hiba történt a törlés során!'))) return;

    esemenyekListaja = esemenyekListaja.filter(e => e.id !== id);
    esemenyekTarolasa();
    kirajzolNaptar();
}