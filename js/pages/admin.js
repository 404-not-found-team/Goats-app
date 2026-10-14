// Admin oldal (admin.html), csak superadminnak (FELADAT15).
// - Belépő védelem: session nélkül index.html, nem superadminnak app.html (location.replace),
//   az admin adatai addig nem töltődnek be. A profil későbbi változásakor (onChange) is.
// - Globális kapcsolók: public.app_kapcsolok; mentés az admin_beallitas_mentese RPC-vel, amit a
//   szerver is ellenőriz (csak superadmin). Hiba esetén a kapcsoló visszaáll.
// - Italkategóriák: js/pages/admin-kategoriak.js.
import { client } from '../supabase-client.js';
import { ready, getState, isSuperadmin, onChange } from '../hitelesites.js';
import { OLDALAK, FUNKCIOK } from '../segedek/oldalak.js';
import { updateEnabledPages } from '../admin-muveletek.js';

const $ = (id) => document.getElementById(id);

// Oldal-kapcsolók (a Kezdőlap nem kapcsolható) és funkció-kapcsolók egy listában
const KAPCSOLOK = [
    ...OLDALAK.filter(o => o.kapcsolo).map(o => ({ kulcs: o.kapcsolo, nev: `${o.emoji} ${o.nev}`, leiras: null, csoport: 'adminOldalak' })),
    ...FUNKCIOK.map(f => ({ kulcs: f.kulcs, nev: f.nev, leiras: f.leiras, csoport: 'adminFunkciok' })),
    // Beállítás (nem tiltás): alapból kikapcsolt, ezért nem kerül a "Jelenleg kikapcsolva" sorba
    {
        kulcs: 'csoportszuro_csak_admin',
        nev: 'A csoportszűrőt csak a csoport adminja módosíthatja',
        leiras: 'Kikapcsolva a csoport bármelyik tagja beállíthatja, mely italok jelenjenek meg a Ranglistán.',
        csoport: 'adminBeallitasok',
        figyelmeztet: false,
    },
];

let ertekek = {}; // kulcs -> boolean (a szerver szerinti állapot)

// Igaz, ha továbbirányítottunk (ilyenkor semmit nem töltünk be)
function jogosultsagEllenorzes() {
    if (!getState().user) {
        location.replace('index.html');
        return true;
    }
    if (!isSuperadmin()) {
        location.replace('app.html');
        return true;
    }
    return false;
}

function allapot(szoveg, tipus) {
    const elem = $('adminAllapot');
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

function figyelmeztetesFrissites() {
    const kikapcsolt = KAPCSOLOK.filter(k => k.figyelmeztet !== false && ertekek[k.kulcs] === false).map(k => k.nev);
    const doboz = $('adminFigyelmeztetes');
    doboz.hidden = kikapcsolt.length === 0;
    doboz.textContent = kikapcsolt.length ? `Jelenleg kikapcsolva: ${kikapcsolt.join(', ')}` : '';
}

function sor(k) {
    const li = document.createElement('li');
    li.className = 'admin-sor';

    const szoveg = document.createElement('div');
    szoveg.className = 'admin-sor-szoveg';
    const cim = document.createElement('span');
    cim.className = 'admin-sor-nev';
    cim.id = `kapcsolo-${k.kulcs}-cim`;
    cim.textContent = k.nev;
    szoveg.appendChild(cim);
    if (k.leiras) {
        const leiras = document.createElement('span');
        leiras.className = 'admin-sor-leiras';
        leiras.textContent = k.leiras;
        szoveg.appendChild(leiras);
    }

    const cimke = document.createElement('label');
    cimke.className = 'admin-kapcsolo';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.setAttribute('aria-labelledby', cim.id);
    input.checked = ertekek[k.kulcs] !== false;
    input.dataset.kulcs = k.kulcs;
    input.addEventListener('change', () => mentes(input, k));
    const csuszka = document.createElement('span');
    csuszka.className = 'admin-kapcsolo-csuszka';
    csuszka.setAttribute('aria-hidden', 'true');
    cimke.append(input, csuszka);

    li.append(szoveg, cimke);
    return li;
}

function kirajzolas() {
    $('adminOldalak').replaceChildren(...KAPCSOLOK.filter(k => k.csoport === 'adminOldalak').map(sor));
    $('adminFunkciok').replaceChildren(...KAPCSOLOK.filter(k => k.csoport === 'adminFunkciok').map(sor));
    $('adminBeallitasok').replaceChildren(...KAPCSOLOK.filter(k => k.csoport === 'adminBeallitasok').map(sor));
    figyelmeztetesFrissites();
}

// ---- Csoportonkénti oldal-engedélyezés (groups.enabled_pages, kizárólag superadmin) ----

const CSOPORT_KAPCSOLHATO_OLDALAK = OLDALAK.filter(o => o.kulcs !== 'index');
let csoportok = []; // [{ id, group_name, group_code, enabled_pages }]
let kivalasztottCsoportId = null;

function csoportAllapot(szoveg, tipus) {
    const elem = $('adminCsoportOldalakAllapot');
    if (!elem) return;
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

function csoportValasztoKirajzolas() {
    const select = $('adminCsoportValaszto');
    if (!select) return;
    select.replaceChildren(...csoportok.map(cs => {
        const opt = document.createElement('option');
        opt.value = cs.id;
        opt.textContent = `${cs.group_name} (${cs.group_code})`;
        return opt;
    }));
    if (kivalasztottCsoportId) select.value = kivalasztottCsoportId;
}

function csoportSor(oldal, csoport) {
    const engedelyezett = Array.isArray(csoport.enabled_pages) && csoport.enabled_pages.includes(oldal.kulcs);

    const li = document.createElement('li');
    li.className = 'admin-sor';

    const szoveg = document.createElement('div');
    szoveg.className = 'admin-sor-szoveg';
    const cim = document.createElement('span');
    cim.className = 'admin-sor-nev';
    cim.id = `csoport-kapcsolo-${oldal.kulcs}-cim`;
    cim.textContent = `${oldal.emoji} ${oldal.nev}`;
    szoveg.appendChild(cim);

    const cimke = document.createElement('label');
    cimke.className = 'admin-kapcsolo';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.setAttribute('aria-labelledby', cim.id);
    input.checked = engedelyezett;
    input.dataset.kulcs = oldal.kulcs;
    input.addEventListener('change', () => csoportOldalValtozas(input, oldal));
    const csuszka = document.createElement('span');
    csuszka.className = 'admin-kapcsolo-csuszka';
    csuszka.setAttribute('aria-hidden', 'true');
    cimke.append(input, csuszka);

    li.append(szoveg, cimke);
    return li;
}

function csoportOldalakKirajzolas() {
    const lista = $('adminCsoportOldalak');
    if (!lista) return;
    const csoport = csoportok.find(cs => cs.id === kivalasztottCsoportId);
    if (!csoport) {
        lista.replaceChildren();
        return;
    }
    lista.replaceChildren(...CSOPORT_KAPCSOLHATO_OLDALAK.map(o => csoportSor(o, csoport)));
}

async function csoportOldalValtozas(input, oldal) {
    const csoport = csoportok.find(cs => cs.id === kivalasztottCsoportId);
    if (!csoport) return;

    const jelenlegi = Array.isArray(csoport.enabled_pages) ? csoport.enabled_pages : [];
    const uj = input.checked
        ? [...new Set([...jelenlegi, oldal.kulcs])]
        : jelenlegi.filter(k => k !== oldal.kulcs);
    // A Kezdőlap mindig benne marad, akkor is, ha valamiért hiányozna a korábbi listából
    if (!uj.includes('index')) uj.unshift('index');

    input.disabled = true;
    csoportAllapot(`Mentés: ${csoport.group_name} – ${oldal.nev}…`, null);

    const sikerult = await updateEnabledPages(csoport.id, uj);
    input.disabled = false;

    if (!sikerult) {
        input.checked = !input.checked; // visszaáll, a run() wrapper már adott alert-et
        csoportAllapot(`A mentés nem sikerült (${csoport.group_name} – ${oldal.nev}).`, 'hiba');
        return;
    }

    csoport.enabled_pages = uj;
    csoportAllapot(`${csoport.group_name}: ${oldal.nev} ${input.checked ? 'engedélyezve' : 'letiltva'}.`, 'ok');
}

async function csoportokBetoltese() {
    const { data, error } = await client.from('groups')
        .select('id, group_name, group_code, enabled_pages')
        .order('group_name', { ascending: true });

    if (error) {
        console.error('A csoportok betöltése nem sikerült:', error);
        csoportAllapot('A csoportok betöltése nem sikerült.', 'hiba');
        return;
    }

    csoportok = data || [];
    if (!kivalasztottCsoportId && csoportok.length > 0) kivalasztottCsoportId = csoportok[0].id;
    csoportValasztoKirajzolas();
    csoportOldalakKirajzolas();

    $('adminCsoportValaszto')?.addEventListener('change', (e) => {
        kivalasztottCsoportId = e.target.value;
        csoportAllapot('', null);
        csoportOldalakKirajzolas();
    });
}

async function betoltes() {
    // Mindig friss lekérdezés (nem a munkamenet-gyorsítótárból)
    const { data, error } = await client.from('app_kapcsolok').select('kulcs, ertek');
    if (error) {
        console.error('A kapcsolók betöltése nem sikerült:', error);
        allapot('A kapcsolók betöltése nem sikerült. Lefutott már a FELADAT15 SQL-je?', 'hiba');
        return;
    }
    ertekek = Object.fromEntries((data || []).map(r => [r.kulcs, r.ertek]));
    const hianyzo = KAPCSOLOK.filter(k => !(k.kulcs in ertekek)).map(k => k.kulcs);
    if (hianyzo.length) allapot(`Hiányzó beállítás a táblában: ${hianyzo.join(', ')}`, 'hiba');
    kirajzolas();
}

async function mentes(input, k) {
    const uj = input.checked;
    input.disabled = true;
    allapot(`Mentés: ${k.nev}…`, null);
    const { error } = await client.rpc('admin_beallitas_mentese', { kulcs_in: k.kulcs, ertek_in: uj });
    input.disabled = false;

    if (error) {
        console.error('A beállítás mentése nem sikerült:', error);
        input.checked = !uj; // visszaáll a szerver szerinti állapotra
        allapot(error.code === '42501'
            ? 'Nincs jogosultságod a beállítások módosításához.'
            : `A mentés nem sikerült (${k.nev}). Próbáld újra.`, 'hiba');
        return;
    }

    ertekek[k.kulcs] = uj;
    // A saját állapotban is frissítjük, hogy a többi oldal (pillanatkép) ne régi értéket mutasson
    const allapotObj = getState();
    allapotObj.beallitasok = { ...allapotObj.beallitasok, [k.kulcs]: uj };
    try { sessionStorage.removeItem('goats_snapshot'); } catch { /* nem kritikus */ }
    allapot(`${k.nev}: ${uj ? 'bekapcsolva' : 'kikapcsolva'}.`, 'ok');
    figyelmeztetesFrissites();
}

await ready;
if (!jogosultsagEllenorzes()) {
    $('adminTartalom').hidden = false;
    betoltes();
    csoportokBetoltese();
    // Italkategóriák és az italok besorolása (csak az ellenőrzés után töltődik be)
    import('./admin-kategoriak.js')
        .then(m => m.indit())
        .catch(err => console.error('Az italkategóriák betöltése nem sikerült:', err));
}
// Ha a profil később változik (pl. kijelentkezés másik fülön, szerepkör-váltás), újra ellenőrzünk
onChange(() => {
    if (jogosultsagEllenorzes()) $('adminTartalom').hidden = true;
});
