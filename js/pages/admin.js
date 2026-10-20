// Admin oldal (admin.html), csak superadminnak (FELADAT15).
// - Belépő védelem: session nélkül index.html, nem superadminnak app.html (location.replace),
//   az admin adatai addig nem töltődnek be. A profil későbbi változásakor (onChange) is.
// - Globális kapcsolók: public.app_kapcsolok; mentés az admin_beallitas_mentese RPC-vel, amit a
//   szerver is ellenőriz (csak superadmin). Hiba esetén a kapcsoló visszaáll.
// - Italjavaslatok: js/pages/admin-javaslatok.js; italkategóriák: js/pages/admin-kategoriak.js.
import { client } from '../supabase-client.js';
import { ready, getState, isSuperadmin, onChange } from '../hitelesites.js';
import { OLDALAK, FUNKCIOK } from '../segedek/oldalak.js';

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

// ---- Fülek (a .sm-tabs/.sm-tab-content a css/elemek/modals.css meglévő, eddig máshol nem
// használt stílusa - a settings-rendszer modaljaival azonos mintát követi) ----
function fulekBekotese() {
    const gombok = document.querySelectorAll('.sm-tab-btn');
    gombok.forEach(gomb => {
        gomb.addEventListener('click', () => {
            gombok.forEach(g => { g.classList.remove('active'); g.setAttribute('aria-selected', 'false'); });
            document.querySelectorAll('.sm-tab-content').forEach(c => c.classList.remove('active'));
            gomb.classList.add('active');
            gomb.setAttribute('aria-selected', 'true');
            $(gomb.dataset.tab)?.classList.add('active');
        });
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
    fulekBekotese();
    betoltes();
    // Italjavaslatok, italkategóriák és az italok besorolása (csak az ellenőrzés után töltődnek be)
    import('./admin-javaslatok.js')
        .then(m => m.indit())
        .catch(err => console.error('Az italjavaslatok betöltése nem sikerült:', err));
    import('./admin-kategoriak.js')
        .then(m => m.indit())
        .catch(err => console.error('Az italkategóriák betöltése nem sikerült:', err));
}
// Ha a profil később változik (pl. kijelentkezés másik fülön, szerepkör-váltás), újra ellenőrzünk
onChange(() => {
    if (jogosultsagEllenorzes()) $('adminTartalom').hidden = true;
});
