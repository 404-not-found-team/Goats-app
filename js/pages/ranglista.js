let aktivElemId = null;
let aktivItalAdat = null;
let aktualisMod = 'arany';
let kizartMarkakTomb = [];

// aktualisGroupCode(): lásd js/segedek/csoport-kod.js (közös, minden klasszikus oldalscript használja)

async function inicializalas() {
    if (window.goatsAuth) await window.goatsAuth.ready;
    const groupCode = aktualisGroupCode();
    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;

    // Supabase rendezés név (A-Z) szerint
    const { data: katalogus, error: katError } = await client
        .from('ital_katalogus')
        .select('*')
        .order('nev', { ascending: true })
        .range(0, 999);

    if (katError) {
        console.error('Hiba a katalógus betöltésekor:', katError);
        return;
    }

    katalogus.forEach(ital => {
        addItalKartyaToUI(ital);
    });

    document.querySelectorAll('.forras-doboz').forEach(doboz => {
        const listaDiv = doboz.querySelector('.ital-lista');
        if (listaDiv) {
            const kezdodb = listaDiv.getElementsByClassName('ital-kartya').length;
            doboz.setAttribute('data-osszes', kezdodb);
        }
    });

    if (groupCode) {
        const { data: mentettAdatok, error: rangError } = await client
            .from('ital_ranglista')
            .select('*')
            .eq('group_code', groupCode);

        if (rangError) {
            console.error('Hiba a ranglista betöltésekor:', rangError);
        } else if (mentettAdatok) {
            mentettAdatok.forEach(item => {
                const kartyaElem = document.getElementById(item.id);

                if (kartyaElem) {
                    let celZona = null;

                    if (item.kategoria === 'forras') {
                        const eredetiKategoria = kartyaElem.dataset.kategoria;
                        celZona = getListaDivByKategoria(eredetiKategoria);
                    } else {
                        celZona = document.querySelector(`[data-kategoria="${item.kategoria}"] .tier-tartalom`) ||
                            document.querySelector(`[data-kategoria="${item.kategoria}"] .ranglista-dropzone`) ||
                            document.querySelector(`.ranglista-dropzone[data-kategoria="${item.kategoria}"]`) ||
                            document.querySelector(`[data-kategoria="${item.kategoria}"]`) ||
                            document.getElementById(`tier-${item.kategoria}`);
                    }

                    if (celZona) {
                        celZona.appendChild(kartyaElem);
                        rendezKartyakatContainerben(celZona);
                    }
                }
            });
        }
    }

    frissitsSzamlalokat();
}

/**
 * Segédfüggvény: Egy adott konténerben lévő kártyákat ábécésorrendbe rendezi a nevük alapján
 */
function rendezKartyakatContainerben(container) {
    if (!container) return;
    const kartyak = Array.from(container.querySelectorAll(':scope > .ital-kartya'));
    
    kartyak.sort((a, b) => {
        const nevA = a.querySelector('.ital-nev')?.textContent.trim() || '';
        const nevB = b.querySelector('.ital-nev')?.textContent.trim() || '';
        return nevA.localeCompare(nevB, 'hu', { sensitivity: 'base' });
    });

    kartyak.forEach(kartya => container.appendChild(kartya));
}

async function kategoriatValaszt(kategoriaNev) {
    if (!aktivElemId) return;

    const groupCode = aktualisGroupCode();
    const kartyaElem = document.getElementById(aktivElemId);
    let celZona;

    if (kategoriaNev === 'forras') {
        const eredetiKategoria = kartyaElem.dataset.kategoria;
        celZona = getListaDivByKategoria(eredetiKategoria);
    } else {
        celZona = document.querySelector(`[data-kategoria="${kategoriaNev}"] .tier-tartalom`) ||
            document.querySelector(`[data-kategoria="${kategoriaNev}"] .ranglista-dropzone`) ||
            document.querySelector(`.ranglista-dropzone[data-kategoria="${kategoriaNev}"]`) ||
            document.querySelector(`[data-kategoria="${kategoriaNev}"]`) ||
            document.getElementById(`tier-${kategoriaNev}`);
    }

    if (kartyaElem && celZona) {
        celZona.appendChild(kartyaElem);
        rendezKartyakatContainerben(celZona);

        if (groupCode) {
            const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
            const { error } = await client
                .from('ital_ranglista')
                .upsert({
                    id: aktivElemId,
                    kategoria: kategoriaNev,
                    group_code: groupCode
                }, { onConflict: 'id,group_code' });

            if (error) {
                console.error('Hiba a mentés során:', error);
            }
        }
    }

    frissitsSzamlalokat();
    modalBezár();
}

function modalBezár() {
    document.getElementById('modal-hatter').hidden = true;
    aktivElemId = null;
    aktivItalAdat = null;
}

function getListaDivByKategoria(kategoria) {
    const kat = kategoria ? kategoria.toLowerCase() : 'egyeb';
    switch (kat) {
        case 'vodka': return document.getElementById('vodkaLista');
        case 'rum': return document.getElementById('rumLista');
        case 'whiskey': return document.getElementById('whiskeyLista');
        case 'likor':
        case 'likőr': return document.getElementById('likorLista');
        case 'bitter': return document.getElementById('bitterLista');
        case 'sor':
        case 'sör': return document.getElementById('sorLista');
        case 'cider': return document.getElementById('ciderLista');
        case 'bor': return document.getElementById('borLista');
        case 'froccs':
        case 'fröccs': return document.getElementById('froccsLista');
        case 'energiaital': return document.getElementById('energiaitalLista');
        case 'koktel':
        case 'koktél': return document.getElementById('koktelLista');
        default: return document.getElementById('italLista');
    }
}

function frissitsSzamlalokat() {
    const kikapcsoltKategoriak = Array.from(document.querySelectorAll('.szuro-pill:not(.aktiv)'))
        .map(pill => pill.dataset.id.toLowerCase());

    const forrasDobozok = document.querySelectorAll('.forras-doboz');

    forrasDobozok.forEach(doboz => {
        const listaDiv = doboz.querySelector('.ital-lista');
        const szamlalo = doboz.querySelector('.ital-szamlalo');

        if (listaDiv) {
            const lathatoKartyak = Array.from(listaDiv.getElementsByClassName('ital-kartya'))
                .filter(k => !k.hidden);

            const jelenlegiDb = lathatoKartyak.length;
            const osszesDb = doboz.getAttribute('data-osszes') || listaDiv.getElementsByClassName('ital-kartya').length;

            if (szamlalo) {
                szamlalo.textContent = `${jelenlegiDb} / ${osszesDb}`;
            }

            const katId = listaDiv.id.replace('Lista', '').toLowerCase();
            const veglegesKatId = katId === 'ital' ? 'egyeb' : katId;

            if (kikapcsoltKategoriak.includes(veglegesKatId) || jelenlegiDb === 0) {
                doboz.hidden = true;
            } else {
                doboz.hidden = false;
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const kategoriak = [
        { kod: 'S', cls: 'legeslegjobb' },
        { kod: 'A', cls: 'legjobb' },
        { kod: 'B', cls: 'elmegy' },
        { kod: 'C', cls: 'soha' },
        { kod: 'D', cls: 'megjobbansoha' }
    ];

    const italKategoriak = [
        { nev: 'Vodkák', id: 'vodka' },
        { nev: 'Rumok', id: 'rum' },
        { nev: 'Whiskeyk', id: 'whiskey' },
        { nev: 'Likőrök', id: 'likor' },
        { nev: 'Bitterek', id: 'bitter' },
        { nev: 'Ciderek', id: 'cider' },
        { nev: 'Sörök', id: 'sor' },
        { nev: 'Borok', id: 'bor' },
        { nev: 'Fröccsök', id: 'froccs' },
        { nev: 'Energiaitalok', id: 'energiaital' },
        { nev: 'Koktélok', id: 'koktel' },
        { nev: 'Egyéb', id: 'egyeb' }
    ];

    const katKontener = document.getElementById('kategoriak-kontener');
    if (katKontener) {
        katKontener.replaceChildren(...kategoriak.map(k => {
            const doboz = ujElem('div', 'kategoria-kontener');
            const cimke = ujElem('h3', `cimke ${k.cls} dark`, k.kod);
            const dropzone = ujElem('div', 'ranglista-dropzone');
            dropzone.dataset.kategoria = k.kod;
            doboz.append(cimke, dropzone);
            return doboz;
        }));
    }

    const forrasKontener = document.getElementById('forras-dobozok-kontener');
    if (forrasKontener) {
        forrasKontener.replaceChildren(...italKategoriak.map(k => {
            const doboz = ujElem('div', 'forras-doboz csukva');
            const fejlec = ujElem('div', 'forras-fejlec');
            fejlec.addEventListener('click', () => toggleForrasDoboz(fejlec));
            const cim = ujElem('h3');
            cim.append(document.createTextNode(`${k.nev} `));
            cim.appendChild(ujElem('span', 'nyil-ikon', '▼'));
            const szamlalo = ujElem('span', 'ital-szamlalo', '0 / 0');
            szamlalo.id = `szamlalo-${k.id}`;
            fejlec.append(cim, szamlalo);
            const lista = ujElem('div', 'ital-lista');
            lista.id = k.id === 'egyeb' ? 'italLista' : k.id + 'Lista';
            doboz.append(fejlec, lista);
            return doboz;
        }));
    }

    epitSzuroUI(italKategoriak);
});

/* ==========================================================================
   RANGLISTA SZŰRŐK LOGIKÁJA
   ========================================================================== */

function nyisdSzuroModal() {
    document.getElementById('szuro-modal').hidden = false;
}

function zardSzuroModal() {
    document.getElementById('szuro-modal').hidden = true;
}

function epitSzuroUI(italKategoriak) {
    const kontener = document.getElementById('kategoria-szuro-list');
    if (!kontener) return;

    kontener.replaceChildren(...italKategoriak.map(k => {
        const pill = ujElem('div', 'szuro-pill aktiv', k.nev);
        pill.dataset.id = k.id;
        pill.addEventListener('click', () => toggleKategoriaPill(pill));
        return pill;
    }));

    betoltSzuroBeallitasokat();
}

function toggleKategoriaPill(elem) {
    elem.classList.toggle('aktiv');
    frissitsSzureseketEsMents();
}

function kezeldTagEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        hozzaadKizartTag();
    }
}

function hozzaadKizartTag() {
    const input = document.getElementById('kizart-kulcsszo-input');
    if (!input) return;

    const ertek = input.value.trim().toLowerCase();
    if (ertek && !kizartMarkakTomb.includes(ertek)) {
        kizartMarkakTomb.push(ertek);
        input.value = '';
        renderKizartTagem();
        frissitsSzureseketEsMents();
    }
}

function torolKizartTag(szoveg) {
    kizartMarkakTomb = kizartMarkakTomb.filter(t => t !== szoveg);
    renderKizartTagem();
    frissitsSzureseketEsMents();
}

function renderKizartTagem() {
    const kontener = document.getElementById('kizart-tagek-kontener');
    if (!kontener) return;

    kontener.innerHTML = '';
    kizartMarkakTomb.forEach(tag => {
        const spanTag = document.createElement('span');
        spanTag.className = 'kizart-tag';
        spanTag.textContent = tag + ' ';

        const xSpan = document.createElement('span');
        xSpan.className = 'torles-x';
        xSpan.textContent = '✕';

        spanTag.appendChild(xSpan);

        spanTag.addEventListener('click', () => torolKizartTag(tag));

        kontener.appendChild(spanTag);
    });
}

async function frissitsSzureseketEsMents() {
    const kikapcsoltKategoriak = Array.from(document.querySelectorAll('.szuro-pill:not(.aktiv)'))
        .map(pill => pill.dataset.id.toLowerCase());

    document.querySelectorAll('.ital-kartya').forEach(kartya => {
        const nev = kartya.querySelector('.ital-nev')?.textContent.toLowerCase() || '';
        const kategoria = kartya.dataset.kategoria?.toLowerCase() || '';

        const kategoriaKizarva = kikapcsoltKategoriak.includes(kategoria);
        const nevKizarva = kizartMarkakTomb.some(szoveg => nev.includes(szoveg));

        if (kategoriaKizarva || nevKizarva) {
            kartya.hidden = true;
        } else {
            kartya.hidden = false;
        }
    });

    frissitsSzamlalokat();

    const groupId = window.goatsAuth?.getState()?.group?.id;
    if (groupId && window.goatsAuth) {
        const szuroAdat = {
            kikapcsolt_kategoriak: kikapcsoltKategoriak,
            kizart_szoveg_tomb: kizartMarkakTomb
        };

        try {
            // A groups tábla kliens felől csak olvasható (RLS), az írás RPC-n megy.
            await window.goatsAuth.callRpc('save_filter_settings', {
                group_id_input: groupId,
                settings: szuroAdat
            });
        } catch (err) {
            console.error('Hiba a szűrő beállítások mentésekor:', err);
        }
    }
}

async function betoltSzuroBeallitasokat() {
    if (window.goatsAuth) await window.goatsAuth.ready;
    const groupCode = aktualisGroupCode();
    if (!groupCode) return;

    try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        const { data, error } = await client
            .from('groups')
            .select('filter_settings')
            .eq('group_code', groupCode)
            .maybeSingle();

        if (error || !data || !data.filter_settings) return;

        const filterSettings = data.filter_settings;
        const kikapcsoltKategoriak = filterSettings.kikapcsolt_kategoriak || [];
        kizartMarkakTomb = filterSettings.kizart_szoveg_tomb || [];

        renderKizartTagem();

        document.querySelectorAll('.szuro-pill').forEach(pill => {
            const id = pill.dataset.id.toLowerCase();
            if (kikapcsoltKategoriak.includes(id)) {
                pill.classList.remove('aktiv');
            } else {
                pill.classList.add('aktiv');
            }
        });

        frissitsSzureseketEsMents();
    } catch (err) {
        console.error('Hiba a szűrő beállítások betöltésekor:', err);
    }
}

function toggleForrasDoboz(fejlecElem) {
    const doboz = fejlecElem.closest('.forras-doboz');
    if (doboz) {
        doboz.classList.toggle('csukva');
    }
}

function nyisdUjItalModal() {
    document.getElementById('uj-ital-modal').hidden = false;
    kategoriaValtozasCheck();
}

function zardUjItalModal() {
    document.getElementById('uj-ital-modal').hidden = true;
    document.getElementById('uj-ital-nev').value = '';
    document.getElementById('uj-ital-szazalek').value = '';
    document.getElementById('uj-ital-kiszereles').value = 'dobozos';
    document.getElementById('hozzavalok-lista').innerHTML = '';
}

function isKevertItal(kat) {
    if (!kat) return false;
    const k = kat.toLowerCase();
    return k === 'koktel' || k === 'koktél' || k === 'froccs' || k === 'fröccs';
}

function kategoriaValtozasCheck() {
    const kat = document.getElementById('uj-ital-kategoria').value;
    const resz = document.getElementById('koktel-összeallitas-resz');
    const alkoholGroup = document.getElementById('alkoholfok-group');
    const kiszerelesGroup = document.getElementById('kiszereles-group');

    if (alkoholGroup) {
        const elrejtAlkohol = (kat === 'energiaital' || kat === 'koktel' || kat === 'froccs');
        alkoholGroup.hidden = elrejtAlkohol;
    }

    if (kiszerelesGroup) {
        kiszerelesGroup.hidden = (kat !== 'sor');
    }

    if (resz) {
        const kevert = isKevertItal(kat);
        resz.hidden = !kevert;
        if (kevert && document.getElementById('hozzavalok-lista').children.length === 0) {
            if (kat === 'froccs') {
                ujHozzavaloSor('1', 'dl', 'Bor');
                ujHozzavaloSor('1', 'dl', 'Szóda');
            } else {
                ujHozzavaloSor();
            }
        }
    }
}

function valtsMódot(uMod) {
    if (aktualisMod === uMod) return;
    aktualisMod = uMod;

    const btnArany = document.getElementById('mode-arany-btn');
    const btnPontos = document.getElementById('mode-pontos-btn');

    if (btnArany) btnArany.classList.toggle('active', uMod === 'arany');
    if (btnPontos) btnPontos.classList.toggle('active', uMod === 'pontos');

    frissitsMindenSorSemat();
}

function ujHozzavaloSor(m = '', e = 'dl', n = '') {
    const kontener = document.getElementById('hozzavalok-lista');
    if (!kontener) return;

    const sorDiv = document.createElement('div');
    sorDiv.className = 'hozzavalo-sor';

    sorDiv.replaceChildren(...keszitSorElemek(m, e, n));
    kontener.appendChild(sorDiv);

    frissitsTorlesGombokat();
}

// Hozzávaló-sor elemei DOM-építéssel: a felhasználó által írt szöveg (m, n) value-ként
// kerül be, nem HTML-ként (XSS-védelem).
function keszitInput(osztaly, stilus, placeholder, ertek, tipus = 'text') {
    const input = document.createElement('input');
    input.type = tipus;
    input.className = `sm-input ${osztaly}`;
    input.classList.add(stilus === '2' ? 'nyujt-2' : 'nyujt');
    input.placeholder = placeholder;
    input.value = ertek;
    return input;
}

function keszitTorlesGomb() {
    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'hozzavalo-torles-btn';
    gomb.textContent = '🗑️';
    gomb.addEventListener('click', () => torolSor(gomb));
    return gomb;
}

function keszitSorElemek(m, e, n) {
    if (aktualisMod === 'arany') {
        return [
            keszitInput('hozzavalo-mennyiseg', '1', 'Mennyiség', m),
            keszitInput('hozzavalo-nev', '2', 'Hozzávaló neve', n),
            keszitTorlesGomb()
        ];
    }

    const egysegek = ['dl', 'ml', 'cl', 'db', 'öntet'];
    const select = document.createElement('select');
    select.className = 'sm-input hozzavalo-egyseg';
    select.classList.add('nyujt');
    egysegek.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        option.selected = opt === e;
        select.appendChild(option);
    });

    return [
        keszitInput('hozzavalo-nev', '2', 'Hozzávaló neve', n),
        keszitInput('hozzavalo-mennyiseg', '1', 'Mennyiség', m, 'number'),
        select,
        keszitTorlesGomb()
    ];
}

function frissitsMindenSorSemat() {
    const sorok = document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor');
    sorok.forEach(sor => {
        const m = sor.querySelector('.hozzavalo-mennyiseg')?.value || '';
        const e = sor.querySelector('.hozzavalo-egyseg')?.value || 'dl';
        const n = sor.querySelector('.hozzavalo-nev')?.value || '';

        sor.replaceChildren(...keszitSorElemek(m, e, n));
    });

    frissitsTorlesGombokat();
}

function torolSor(gomb) {
    const kontener = document.getElementById('hozzavalok-lista');
    if (kontener.children.length > 1) {
        gomb.parentElement.remove();
        frissitsTorlesGombokat();
    }
}

function frissitsTorlesGombokat() {
    const sorok = document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor');
    const letiltva = sorok.length < 2;

    sorok.forEach(sor => {
        const btn = sor.querySelector('.hozzavalo-torles-btn');
        if (btn) btn.disabled = letiltva;
    });
}

async function mentUjItal() {
    const nev = document.getElementById('uj-ital-nev').value.trim();
    const kategoria = document.getElementById('uj-ital-kategoria').value;
    const szazalek = document.getElementById('uj-ital-szazalek').value.trim();

    if (!nev) {
        alert('Kérlek add meg az ital nevét!');
        return;
    }

    let hozzavalokTomb = [];
    if (isKevertItal(kategoria)) {
        const sorok = document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor');
        sorok.forEach(sor => {
            const m = sor.querySelector('.hozzavalo-mennyiseg')?.value.trim() || '';
            const e = sor.querySelector('.hozzavalo-egyseg')?.value || (aktualisMod === 'arany' ? 'rész' : 'dl');
            const n = sor.querySelector('.hozzavalo-nev')?.value.trim() || '';
            if (n) {
                hozzavalokTomb.push({ mennyiseg: m, egyseg: e, nev: n });
            }
        });
    }

    const mentesiAlkohol = (kategoria === 'energiaital' || kategoria === 'koktel' || kategoria === 'froccs')
        ? 0
        : (szazalek ? parseFloat(szazalek) : null);

    // A kép nélküli új ital: a kép a márkából vagy a kategória-ikonból jön (ital-kep.js),
    // a jóváhagyásig pedig nem látszik a közös katalógusban.
    const kiszereles = kategoria === 'sor'
        ? (document.getElementById('uj-ital-kiszereles')?.value || null)
        : null;

    const ujItalAdat = {
        nev: nev,
        kategoria: kategoria,
        alkohol_fok: mentesiAlkohol,
        kiszereles: kiszereles,
        marka: window.italKep ? window.italKep.markaNevbol(nev) : null,
        jovahagyva: false,
        osszetevok: isKevertItal(kategoria) ? JSON.stringify({ mod: aktualisMod, elemek: hozzavalokTomb }) : null
    };

    try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;

        const { data, error } = await client
            .from('ital_katalogus')
            .insert([ujItalAdat])
            .select();

        if (error) {
            console.error('❌ Supabase hiba:', error);
            alert(`Hiba történt a mentéskor: ${error.message}`);
            return;
        }

        const beszurtItal = data && data[0] ? data[0] : ujItalAdat;
        addItalKartyaToUI(beszurtItal);

        zardUjItalModal();
    } catch (err) {
        console.error('Hiba:', err);
    }
}

// Új elem szöveggel és osztállyal, textContent-tel (nincs innerHTML)
function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

// Alkoholfok-jelvény szövege: előtag + kiemelt érték, textContent-tel (nincs innerHTML)
function badgeSzoveg(elem, elotag, ertek) {
    elem.replaceChildren();
    if (elotag) elem.appendChild(document.createTextNode(elotag));
    const kiemelt = document.createElement('span');
    kiemelt.textContent = ertek;
    elem.appendChild(kiemelt);
}

// Sörnél a kiszerelés (dobozos/üveges) rövid, emojis jelzése
function kiszerelesSzoveg(ital) {
    if (String(ital.kategoria || '').toLowerCase() !== 'sor' || !ital.kiszereles) return null;
    return ital.kiszereles === 'uveges' ? '🍾 Üveges' : '📦 Dobozos';
}

function addItalKartyaToUI(ital) {
    const celListaDiv = getListaDivByKategoria(ital.kategoria);
    if (!celListaDiv) return;

    const kartya = document.createElement('div');
    kartya.className = 'ital-kartya';
    kartya.id = `ital-${ital.id}`;
    kartya.dataset.kategoria = ital.kategoria;

    const kep = window.italKep.elemLetrehoz(ital);

    const felirat = document.createElement('span');
    felirat.className = 'ital-nev';
    felirat.textContent = ital.nev;

    kartya.appendChild(kep);
    kartya.appendChild(felirat);

    const kiszerelesCimke = kiszerelesSzoveg(ital);
    if (kiszerelesCimke) {
        kartya.appendChild(ujElem('span', 'ital-kiszereles', kiszerelesCimke));
    }

    // A saját, még jóváhagyatlan italon jelvény (mást a szerver nem is ad vissza jóváhagyatlanul)
    const sajatJavaslat = !ital.jovahagyva && !!ital.javasolta_id
        && ital.javasolta_id === window.goatsAuth?.getState()?.user?.id;
    if (sajatJavaslat) {
        kartya.classList.add('sajat-javaslat');
        kartya.appendChild(ujElem('span', 'jovahagyasra-var', 'Jóváhagyásra vár'));
    }

    kartya.addEventListener('click', () => {
        aktivElemId = kartya.id;
        aktivItalAdat = ital;

        document.getElementById('modal-kep').src = window.italKep.elsoUrl(ital);

        const nevElem = document.getElementById('modal-nev');
        nevElem.textContent = ital.nev;

        const doboz = document.getElementById('modal-koktel-hozzavalok-doboz');
        const kontener = document.getElementById('modal-koktel-hozzavalok-lista');

        const badge = document.getElementById('modal-alkohol-badge');
        const kat = ital.kategoria ? ital.kategoria.toLowerCase() : '';

        if (badge) {
            if (kat === 'energiaital') {
                badge.className = 'alkohol-badge mentes';
                badgeSzoveg(badge, '', 'Alkoholmentes');
                badge.hidden = false;
            } else if (kat === 'froccs' || kat === 'fröccs' || kat === 'koktel' || kat === 'koktél') {
                badge.className = 'alkohol-badge valtozo';
                badgeSzoveg(badge, 'Alkoholfok: ', 'Változó');
                badge.hidden = false;
            } else if (ital.alkohol_fok !== null && ital.alkohol_fok !== undefined) {
                badge.className = 'alkohol-badge';
                badgeSzoveg(badge, 'Alkoholfok: ', `${ital.alkohol_fok}%`);
                badge.hidden = false;
            } else {
                badge.hidden = true;
            }
        }

        const kiszerelesBadge = document.getElementById('modal-kiszereles-badge');
        if (kiszerelesBadge) {
            const cimke = kiszerelesSzoveg(ital);
            if (cimke) {
                badgeSzoveg(kiszerelesBadge, '', cimke);
                kiszerelesBadge.hidden = false;
            } else {
                kiszerelesBadge.hidden = true;
            }
        }

        if (isKevertItal(ital.kategoria) && ital.osszetevok) {
            kontener.innerHTML = '';
            try {
                const adat = typeof ital.osszetevok === 'string' ? JSON.parse(ital.osszetevok) : ital.osszetevok;
                const list = Array.isArray(adat) ? adat : (adat?.elemek || []);

                if (Array.isArray(list) && list.length > 0) {
                    list.forEach((item, index) => {
                        const p = document.createElement('div');
                        const elvalaszto = index < list.length - 1;
                        p.className = 'koktel-sor' + (elvalaszto ? ' koktel-sor-elvalaszto' : '');
                        p.innerHTML = '';

                        const nevSpan = document.createElement('span');
                        nevSpan.className = 'koktel-nev';
                        nevSpan.textContent = item.nev;

                        const mennyisegSpan = document.createElement('span');
                        mennyisegSpan.className = 'koktel-mennyiseg';
                        mennyisegSpan.textContent = `${item.mennyiseg} ${item.egyseg || ''}`;

                        p.appendChild(nevSpan);
                        p.appendChild(mennyisegSpan); 
                        kontener.appendChild(p);
                    });
                    if (doboz) doboz.hidden = false;
                } else {
                    if (doboz) doboz.hidden = true;
                }
            } catch (e) {
                console.error('Hiba a hozzávalók feldolgozásakor:', e);
                kontener.textContent = ital.osszetevok;
                if (doboz) doboz.hidden = false;
            }
        } else {
            if (doboz) doboz.hidden = true;
        }

        document.getElementById('modal-hatter').hidden = false;
    });

    celListaDiv.appendChild(kartya);
    rendezKartyakatContainerben(celListaDiv);
    frissitsSzamlalokat();
}

window.addEventListener('DOMContentLoaded', inicializalas);