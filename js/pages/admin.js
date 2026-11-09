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
        nev: tr('sw_filter_admin_only', 'A csoportszűrőt csak a csoport adminja módosíthatja'),
        leiras: tr('sw_filter_admin_only_desc', 'Kikapcsolva a csoport bármelyik tagja beállíthatja, mely italok jelenjenek meg a Ranglistán.'),
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
    doboz.textContent = kikapcsolt.length ? tr('currently_off', 'Jelenleg kikapcsolva: {list}', { list: kikapcsolt.join(', ') }) : '';
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
    // admin.html#jelentesek / #javaslatok: a megfelelő fül nyílik meg (pl. egy push-értesítésből)
    const cel = location.hash.slice(1);
    if (cel) document.querySelector(`.sm-tab-btn[data-tab="tab-${CSS.escape(cel)}"]`)?.click();
}

async function betoltes() {
    // Mindig friss lekérdezés (nem a munkamenet-gyorsítótárból)
    const { data, error } = await client.from('app_kapcsolok').select('kulcs, ertek');
    if (error) {
        console.error('A kapcsolók betöltése nem sikerült:', error);
        allapot(tr('err_switches_load', 'A kapcsolók betöltése nem sikerült. Lefutott már a FELADAT15 SQL-je?'), 'hiba');
        return;
    }
    ertekek = Object.fromEntries((data || []).map(r => [r.kulcs, r.ertek]));
    const hianyzo = KAPCSOLOK.filter(k => !(k.kulcs in ertekek)).map(k => k.kulcs);
    if (hianyzo.length) allapot(tr('err_missing_setting', 'Hiányzó beállítás a táblában: {list}', { list: hianyzo.join(', ') }), 'hiba');
    kirajzolas();
}

async function mentes(input, k) {
    const uj = input.checked;
    input.disabled = true;
    allapot(tr('saving_item', 'Mentés: {name}…', { name: k.nev }), null);
    const { error } = await client.rpc('admin_beallitas_mentese', { kulcs_in: k.kulcs, ertek_in: uj });
    input.disabled = false;

    if (error) {
        console.error('A beállítás mentése nem sikerült:', error);
        input.checked = !uj; // visszaáll a szerver szerinti állapotra
        allapot(error.code === '42501'
            ? tr('err_no_permission_settings', 'Nincs jogosultságod a beállítások módosításához.')
            : tr('err_save_item', 'A mentés nem sikerült ({name}). Próbáld újra.', { name: k.nev }), 'hiba');
        return;
    }

    ertekek[k.kulcs] = uj;
    // A saját állapotban is frissítjük, hogy a többi oldal (pillanatkép) ne régi értéket mutasson
    const allapotObj = getState();
    allapotObj.beallitasok = { ...allapotObj.beallitasok, [k.kulcs]: uj };
    try { sessionStorage.removeItem('goats_snapshot'); } catch { /* nem kritikus */ }
    allapot(uj ? tr('switch_on_x', '{name}: bekapcsolva.', { name: k.nev }) : tr('switch_off_x', '{name}: kikapcsolva.', { name: k.nev }), 'ok');
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
    import('./admin-jelentesek.js')
        .then(m => m.indit())
        .catch(err => console.error('A jelentések betöltése nem sikerült:', err));
}
// Ha a profil később változik (pl. kijelentkezés másik fülön, szerepkör-váltás), újra ellenőrzünk
onChange(() => {
    if (jogosultsagEllenorzes()) $('adminTartalom').hidden = true;
});
