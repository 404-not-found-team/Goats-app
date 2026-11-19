// Ranglista: az „Új ital” / szerkesztő ablak: kategória, kinézet (forma, minta, színek), hozzávalók, mentés.

import { italModositasa, receptMentese, ujItalMentese } from './ranglista-adat.js';
import { K, ujElem } from './ranglista-seged.js';
import { addItalKartyaToUI, effektivSzinek, frissitsItalKartyaDOM, megjelenitettMarka, megjelenitettNev, modalBezár } from './ranglista-kartyak.js';
import { allapot, osszetevokItalonkent } from './ranglista-allapot.js';
import { alkalmazSzurot } from './ranglista-szuro.js';

// Az új ital űrlap kiszerelés-legördülője (sörnél; az első, a 0,5 l-es doboz az alap)
export function epitKiszerelesValaszto() {
    const select = document.getElementById('uj-ital-kiszereles');
    if (!select) return;
    select.replaceChildren(...K().KISZERELESEK.map(k => {
        const opt = document.createElement('option');
        opt.value = k.kod;
        opt.textContent = k.nev;
        return opt;
    }));
}

// ---------- Kinézet az űrlapon (italok.kep_forma, kep_minta, kep_szin_1/2/3) ----------
// A forma rajzokból, a minta pirulákból választható (a kiválasztott érték egy-egy rejtett mezőben van:
// #uj-ital-forma, #uj-ital-minta), a színek a böngésző saját színválasztójával. Mentett színek nincsenek.

const ALAP_SZINEK = { 1: '#e30613', 2: '#111111', 3: '#ffffff' };
const SZURKE_FORMA = { kep_szin_1: '#9a96a8', kep_szin_2: '#c9c6d3' };

export function epitFormaValaszto() {
    const kontener = document.getElementById('forma-valaszto');
    if (!kontener) return;
    const aktiv = document.getElementById('uj-ital-forma')?.value || '';
    const szinek = aktualisSzinek();
    const gomb = (kod, nev, tartalom) => {
        const g = ujElem('button', 'forma-csempe');
        g.type = 'button';
        g.setAttribute('role', 'radio');
        g.setAttribute('aria-checked', String(kod === aktiv));
        g.setAttribute('aria-label', nev);
        g.title = nev;
        g.classList.toggle('aktiv', kod === aktiv);
        g.append(tartalom);
        g.addEventListener('click', () => formaValaszt(kod));
        return g;
    };
    kontener.replaceChildren(
        gomb('', tr('form_none', 'Nincs (márkakép / ikon)'), ujElem('span', 'forma-nincs', tr('none', 'Nincs'))),
        ...window.italKep.FORMAK.map(([kod, nev]) => {
            const kep = window.italKep.elemLetrehoz({ nev, kep_forma: kod, ...(kod === aktiv ? szinek : SZURKE_FORMA) });
            kep.removeAttribute('role');
            kep.setAttribute('aria-hidden', 'true');
            return gomb(kod, nev, kep);
        }));
}

function formaValaszt(kod) {
    document.getElementById('uj-ital-forma').value = kod;
    formaValtozott();
}

// A minta-pirulák csak a kiválasztott formához rajzolt mintákat mutatják; ha a korábbi minta
// az új formához nincs meg, "Nincs" lesz
function epitMintaValaszto(ertek) {
    const mezo = document.getElementById('uj-ital-minta');
    const kontener = document.getElementById('minta-valaszto');
    if (!mezo || !kontener) return;
    const elozo = ertek !== undefined ? ertek : mezo.value;
    const forma = document.getElementById('uj-ital-forma')?.value || '';
    const elerheto = window.italKep.mintakFormahoz(forma);
    mezo.value = elerheto.some(([kod]) => kod === elozo) ? elozo : '';
    const pirula = (kod, nev) => {
        const g = ujElem('button', 'minta-pirula', nev);
        g.type = 'button';
        g.setAttribute('role', 'radio');
        g.setAttribute('aria-checked', String(kod === mezo.value));
        g.classList.toggle('aktiv', kod === mezo.value);
        g.addEventListener('click', () => {
            mezo.value = kod;
            epitMintaValaszto();
            mintaValtozott();
        });
        return g;
    };
    kontener.replaceChildren(pirula('', tr('none', 'Nincs')), ...elerheto.map(([kod, nev]) => pirula(kod, nev)));
    const csoport = document.getElementById('minta-group');
    if (csoport) csoport.hidden = elerheto.length === 0;
}

function formaValtozott() {
    epitMintaValaszto();
    mintaValtozott();
}

// Minta kiválasztásakor jelenik meg a minta saját színe (3. szín)
function mintaValtozott() {
    const vanMinta = !!document.getElementById('uj-ital-minta')?.value;
    const hely = document.getElementById('szin-3-hely');
    if (hely) hely.hidden = !vanMinta;
    kepElonezetFrissit();
}

// Az űrlapon most beállított színek (a 2. csak bekapcsolva, a 3. csak mintával)
function aktualisSzinek() {
    const ertek = (n) => document.getElementById(`uj-ital-szin-${n}`)?.value || null;
    const vanSzin2 = document.getElementById('uj-ital-van-szin-2')?.checked;
    const vanMinta = !!document.getElementById('uj-ital-minta')?.value;
    return { kep_szin_1: ertek(1), kep_szin_2: vanSzin2 ? ertek(2) : null, kep_szin_3: vanMinta ? ertek(3) : null };
}

// Az űrlap képmezőinek értéke mentéshez; forma nélkül minden mező üres.
// A régi, mentett színekre mutató hivatkozásokat (kep_szin_N_id) mentéskor töröljük: a szín az italon van.
function kepAdatokUrlapbol() {
    const forma = document.getElementById('uj-ital-forma')?.value || '';
    const urest = { kep_szin_1_id: null, kep_szin_2_id: null, kep_szin_3_id: null };
    if (!forma) {
        return { kep_forma: null, kep_minta: null, kep_szin_1: null, kep_szin_2: null, kep_szin_3: null, ...urest };
    }
    return {
        kep_forma: forma,
        kep_minta: document.getElementById('uj-ital-minta')?.value || null,
        ...aktualisSzinek(),
        ...urest,
    };
}

// Az űrlap képmezőinek kitöltése (szerkesztéskor az ital adataival, új italnál alaphelyzetbe)
function kepMezokBeallit(ital = {}) {
    const szinek = effektivSzinek(ital);
    document.getElementById('uj-ital-forma').value = ital.kep_forma || '';
    epitMintaValaszto(ital.kep_minta || '');
    document.getElementById('uj-ital-van-szin-2').checked = !!szinek.kep_szin_2;
    [1, 2, 3].forEach(n => {
        document.getElementById(`uj-ital-szin-${n}`).value = szinek[`kep_szin_${n}`] || ALAP_SZINEK[n];
    });
    mintaValtozott();
    masodikSzinValtozott();
    // a kiválasztott forma rajza legyen látható a vízszintesen görgethető sorban
    requestAnimationFrame(() => {
        const sor = document.getElementById('forma-valaszto');
        const aktiv = sor?.querySelector('.forma-csempe.aktiv');
        if (sor && aktiv) sor.scrollLeft = Math.max(0, aktiv.offsetLeft - sor.offsetLeft - 8);
    });
}

// Élő előnézet: a kép a ranglista-kártyán látható névvel (márka + név), a színek kódja, a forma-rajzok
export function kepElonezetFrissit() {
    const adatok = kepAdatokUrlapbol();
    const resz = document.getElementById('kep-szinezes-resz');
    if (resz) resz.hidden = !adatok.kep_forma;

    const nev = document.getElementById('uj-ital-nev')?.value || '';
    const fo = valasztottFoKategoria();
    const elonezet = document.getElementById('kep-elonezet');
    if (elonezet) {
        elonezet.replaceChildren(window.italKep.elemLetrehoz(adatok.kep_forma
            ? { nev, ...adatok }
            : { nev, kategoria: fo?.kod, ikon: fo?.ikon }));
    }
    const marka = document.getElementById('elonezet-marka');
    const nevElem = document.getElementById('elonezet-nev');
    if (marka) marka.textContent = megjelenitettMarka(nev);
    if (nevElem) nevElem.textContent = megjelenitettNev(nev) || tr('drink_name', 'Ital neve');

    [1, 2, 3].forEach(n => {
        const kod = document.getElementById(`szin-${n}-kod`);
        if (kod) kod.textContent = (document.getElementById(`uj-ital-szin-${n}`)?.value || '').toUpperCase();
    });
    epitFormaValaszto();
}

// A második szín kapcsolója: kikapcsolva a 2. szín halvány és nem választható
export function masodikSzinValtozott() {
    const van = document.getElementById('uj-ital-van-szin-2')?.checked;
    document.getElementById('szin-2-sor')?.classList.toggle('ki', !van);
    const picker = document.getElementById('uj-ital-szin-2');
    if (picker) picker.disabled = !van;
    kepElonezetFrissit();
}

// Az új ital űrlap kategória-legördülője (a főkategóriák a táblából)
export function epitKategoriaValaszto() {
    const select = document.getElementById('uj-ital-kategoria');
    if (!select) return;
    select.replaceChildren(...K().fo.map(fo => {
        const opt = document.createElement('option');
        opt.value = String(fo.id);
        opt.textContent = K().nevForditva(fo);
        return opt;
    }));
}

export function nyisdUjItalModal() {
    if (window.goatsKapcsolok && !window.goatsKapcsolok.funkcioEngedelyezett('funkcio_italjavaslat')) {
        goatsAblak.toast(window.goatsKapcsolok.TILTVA_SZOVEG, 'info');
        return;
    }
    document.getElementById('uj-ital-modal').hidden = false;
    kategoriaValtozasCheck();
    kepMezokBeallit();
}

export function zardUjItalModal() {
    document.getElementById('uj-ital-modal').hidden = true;
    document.getElementById('uj-ital-nev').value = '';
    document.getElementById('uj-ital-szazalek').value = '';
    document.getElementById('uj-ital-kiszereles').selectedIndex = 0;
    document.getElementById('uj-ital-van-szin-2').checked = false;
    document.getElementById('szin-3-hely').hidden = true;
    document.getElementById('hozzavalok-lista').replaceChildren();
    allapot.szerkesztettItalId = null;
    document.getElementById('uj-ital-modal-cim').textContent = tr('add_new_drink_cocktail', 'Új ital / koktél felvétele');
    document.getElementById('uj-ital-mentes-gomb').textContent = tr('add', 'Hozzáadás');
}

// A kiválasztott főkategória az új ital űrlapon
function valasztottFoKategoria() {
    return K().kategoria(Number(document.getElementById('uj-ital-kategoria')?.value)) || null;
}

export function kategoriaValtozasCheck() {
    const fo = valasztottFoKategoria();
    const resz = document.getElementById('koktel-összeallitas-resz');
    const alkoholGroup = document.getElementById('alkoholfok-group');
    const kiszerelesGroup = document.getElementById('kiszereles-group');

    if (alkoholGroup) alkoholGroup.hidden = !fo?.alkoholos;
    if (kiszerelesGroup) kiszerelesGroup.hidden = !fo?.kiszereles;
    kepElonezetFrissit(); // forma nélkül az előnézet a kategória ikonja

    if (resz) {
        const kevert = !!fo?.recept;
        resz.hidden = !kevert;
        if (kevert && document.getElementById('hozzavalok-lista').children.length === 0) {
            if (fo.kod === 'froccs') {
                ujHozzavaloSor('1', 'dl', 'Bor');
                ujHozzavaloSor('1', 'dl', 'Szóda');
            } else {
                ujHozzavaloSor();
            }
        }
    }
}

export function valtsMódot(uMod) {
    if (allapot.aktualisMod === uMod) return;
    allapot.aktualisMod = uMod;

    const btnArany = document.getElementById('mode-arany-btn');
    const btnPontos = document.getElementById('mode-pontos-btn');

    if (btnArany) btnArany.classList.toggle('active', uMod === 'arany');
    if (btnPontos) btnPontos.classList.toggle('active', uMod === 'pontos');

    frissitsMindenSorSemat();
}

export function ujHozzavaloSor(m = '', e = 'dl', n = '') {
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
    if (allapot.aktualisMod === 'arany') {
        return [
            keszitInput('hozzavalo-mennyiseg', '1', tr('amount', 'Mennyiség'), m),
            keszitInput('hozzavalo-nev', '2', tr('ingredient_name', 'Hozzávaló neve'), n),
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
        keszitInput('hozzavalo-nev', '2', tr('ingredient_name', 'Hozzávaló neve'), n),
        keszitInput('hozzavalo-mennyiseg', '1', tr('amount', 'Mennyiség'), m, 'number'),
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

export async function mentUjItal() {
    const nev = document.getElementById('uj-ital-nev').value.trim();
    const fo = valasztottFoKategoria();
    const szazalek = document.getElementById('uj-ital-szazalek').value.trim();

    if (!nev) {
        goatsAblak.toast(tr('err_drink_name', 'Kérlek add meg az ital nevét!'), 'hiba');
        return;
    }
    if (!fo) {
        goatsAblak.toast(tr('err_choose_category', 'Válassz kategóriát!'), 'hiba');
        return;
    }

    const hozzavalok = [];
    if (fo.recept) {
        document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor').forEach((sor, i) => {
            const m = (sor.querySelector('.hozzavalo-mennyiseg')?.value || '').trim().replace(',', '.');
            const e = sor.querySelector('.hozzavalo-egyseg')?.value || (allapot.aktualisMod === 'arany' ? 'rész' : 'dl');
            const n = (sor.querySelector('.hozzavalo-nev')?.value || '').trim();
            if (n) hozzavalok.push({ sorrend: i + 1, nev: n.slice(0, 60), mennyiseg: /^\d+(\.\d+)?$/.test(m) ? Number(m) : null, egyseg: e });
        });
    }

    if (allapot.szerkesztettItalId) {
        const italId = allapot.szerkesztettItalId;
        const valtozas = {
            nev,
            marka: window.italKep ? window.italKep.markaNevbol(nev) : null,
            kategoria_id: fo.id,
            alkohol_fok: fo.alkoholos ? (szazalek ? parseFloat(szazalek) : null) : 0,
            kiszereles: fo.kiszereles ? (document.getElementById('uj-ital-kiszereles')?.value || null) : null,
            recept_mod: fo.recept ? allapot.aktualisMod : null,
            ...kepAdatokUrlapbol(),
        };

        const { data, error } = await italModositasa(italId, valtozas);
        if (error) {
            goatsAblak.toast(tr('err_saving_msg', 'Hiba történt a mentéskor: {msg}', { msg: error.message }), 'hiba');
            return;
        }

        const receptRendben = await receptMentese(italId, hozzavalok, true);
        if (hozzavalok.length > 0) {
            if (!receptRendben) {
                goatsAblak.toast(tr('err_ingredients_save', 'Az ital elmentve, de a hozzávalók mentése nem sikerült.'), 'hiba');
            } else {
                osszetevokItalonkent.set(italId, hozzavalok);
            }
        } else {
            osszetevokItalonkent.delete(italId);
        }

        frissitsItalKartyaDOM(italId, data);
        alkalmazSzurot();
        zardUjItalModal();
        return;
    }

    // A kép nélküli új ital: a kép a márkából vagy a kategória-ikonból jön (ital-kep.js),
    // a jóváhagyásig pedig nem látszik a közös katalógusban.
    const ujItalAdat = {
        nev,
        marka: window.italKep ? window.italKep.markaNevbol(nev) : null,
        kategoria_id: fo.id,
        alkohol_fok: fo.alkoholos ? (szazalek ? parseFloat(szazalek) : null) : 0,
        kiszereles: fo.kiszereles ? (document.getElementById('uj-ital-kiszereles')?.value || null) : null,
        recept_mod: fo.recept ? allapot.aktualisMod : null,
        ...kepAdatokUrlapbol(),
        jovahagyva: false,
        javasolta_id: window.goatsAuth?.getState()?.user?.id || null,
    };

    const { data, error } = await ujItalMentese(ujItalAdat);
    if (error) {
        goatsAblak.toast(tr('err_saving_msg', 'Hiba történt a mentéskor: {msg}', { msg: error.message }), 'hiba');
        return;
    }

    if (hozzavalok.length > 0) {
        if (!await receptMentese(data.id, hozzavalok, false)) {
            goatsAblak.toast(tr('err_ingredients_save', 'Az ital elmentve, de a hozzávalók mentése nem sikerült.'), 'hiba');
        } else {
            osszetevokItalonkent.set(data.id, hozzavalok);
        }
    }

    addItalKartyaToUI(data);
    alkalmazSzurot();
    zardUjItalModal();
}

// ---------- Szerkesztés (superadmin): a kinagyított ital adatainak módosítása ----------

export function nyisdSzerkesztesModal() {
    if (!allapot.aktivItalAdat || !window.goatsAuth?.isSuperadmin?.()) return;
    const ital = allapot.aktivItalAdat;
    allapot.szerkesztettItalId = ital.id;
    modalBezár();

    document.getElementById('uj-ital-modal-cim').textContent = tr('edit_drink', 'Ital szerkesztése');
    document.getElementById('uj-ital-mentes-gomb').textContent = tr('save', 'Mentés');

    document.getElementById('uj-ital-nev').value = ital.nev || '';
    document.getElementById('uj-ital-kategoria').value = String(ital.kategoria_id);
    document.getElementById('uj-ital-szazalek').value = ital.alkohol_fok ?? '';
    document.getElementById('uj-ital-kiszereles').value = ital.kiszereles || 'dobozos';
    kepMezokBeallit(ital);

    const mod = ital.recept_mod === 'pontos' ? 'pontos' : 'arany';
    allapot.aktualisMod = mod;
    document.getElementById('mode-arany-btn')?.classList.toggle('active', mod === 'arany');
    document.getElementById('mode-pontos-btn')?.classList.toggle('active', mod === 'pontos');

    const hozzavalokLista = document.getElementById('hozzavalok-lista');
    hozzavalokLista.replaceChildren();
    const recept = osszetevokItalonkent.get(ital.id) || [];
    recept.forEach(r => ujHozzavaloSor(r.mennyiseg ?? '', r.egyseg || 'dl', r.nev || ''));

    // Beállítja a láthatóságokat (alkoholfok/kiszerelés/recept-rész), és ha recept-es kategória,
    // de nincs mentett hozzávaló, indít egy üres sorral
    kategoriaValtozasCheck();

    document.getElementById('uj-ital-modal').hidden = false;
}
