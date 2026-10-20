// Admin oldal: Színek fül (public.szin_paletta). Csak superadminnak: az admin.js a jogosultság-
// ellenőrzés után tölti be; az írást a szerver is ellenőrzi (RLS: is_superadmin()).
// Névvel elmentett színek (pl. "Hell piros", RGB/színválasztóval megadva) - a Ranglista "Új ital"
// űrlapján bármelyik italnál ezek közül lehet választani, egyéni szín csak a lista alján adható meg.
import { client } from '../supabase-client.js';
import { getState } from '../hitelesites.js';

const $ = (id) => document.getElementById(id);

let szinek = [];

function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

function allapot(szoveg, tipus) {
    const elem = $('adminSzinekAllapot');
    if (!elem) return;
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

function szinMinta(hex) {
    const s = document.createElement('span');
    s.className = 'admin-szin-minta';
    s.style.setProperty('--szin', hex);
    return s;
}

function szinSor(sz) {
    const li = ujElem('li', 'admin-sor admin-szin-sor');
    const szoveg = ujElem('div', 'admin-sor-szoveg admin-szin-szoveg');
    szoveg.append(szinMinta(sz.kep_szin_1));
    if (sz.kep_szin_2) szoveg.append(szinMinta(sz.kep_szin_2));
    szoveg.append(ujElem('span', 'admin-sor-nev', sz.nev));

    const gombok = ujElem('div', 'admin-sor-gombok');
    const szerkeszt = ujElem('button', 'admin-gomb masodlagos', 'Szerkesztés');
    szerkeszt.type = 'button';
    szerkeszt.addEventListener('click', () => li.replaceWith(szinSzerkeszto(sz)));
    const torol = ujElem('button', 'admin-gomb veszelyes', 'Törlés');
    torol.type = 'button';
    torol.addEventListener('click', () => szinTorles(sz));
    gombok.append(szerkeszt, torol);

    li.append(szoveg, gombok);
    return li;
}

function szinSzerkeszto(sz) {
    const li = ujElem('li', 'admin-sor admin-szin-sor szerkesztes');
    const nev = ujElem('input', 'admin-bemenet');
    nev.value = sz.nev;
    nev.setAttribute('aria-label', 'A szín neve');

    const szin1 = ujElem('input');
    szin1.type = 'color';
    szin1.value = sz.kep_szin_1;
    szin1.setAttribute('aria-label', 'Fő szín');

    const vanSzin2 = ujElem('input');
    vanSzin2.type = 'checkbox';
    vanSzin2.checked = !!sz.kep_szin_2;
    vanSzin2.setAttribute('aria-label', 'Legyen második szín');
    const szin2 = ujElem('input');
    szin2.type = 'color';
    szin2.value = sz.kep_szin_2 || '#111111';
    szin2.disabled = !vanSzin2.checked;
    szin2.setAttribute('aria-label', 'Második szín');
    vanSzin2.addEventListener('change', () => { szin2.disabled = !vanSzin2.checked; });
    const masodikMezo = ujElem('label', 'admin-szin-masodik-mezo');
    masodikMezo.append(vanSzin2, szin2);

    const ment = ujElem('button', 'admin-gomb', 'Mentés');
    ment.type = 'button';
    ment.addEventListener('click', () => szinMentes(sz, {
        nev: nev.value,
        szin1: szin1.value,
        szin2: vanSzin2.checked ? szin2.value : null,
    }));
    const megse = ujElem('button', 'admin-gomb masodlagos', 'Mégse');
    megse.type = 'button';
    megse.addEventListener('click', kirajzolas);

    const sor = ujElem('div', 'admin-urlap-sor');
    sor.append(nev, szin1, masodikMezo, ment, megse);
    li.appendChild(sor);
    return li;
}

async function szinMentes(sz, { nev, szin1, szin2 }) {
    const tisztaNev = String(nev || '').trim();
    if (tisztaNev.length < 2 || tisztaNev.length > 40) return allapot('A szín neve 2–40 karakter legyen.', 'hiba');
    const { error } = await client
        .from('szin_paletta')
        .update({ nev: tisztaNev, kep_szin_1: szin1, kep_szin_2: szin2 })
        .eq('id', sz.id);
    if (error) {
        console.error('A szín mentése nem sikerült:', error);
        return allapot(`A mentés nem sikerült: ${error.message}`, 'hiba');
    }
    allapot(`${tisztaNev}: elmentve.`, 'ok');
    await ujratoltes();
}

async function szinTorles(sz) {
    if (!confirm(`Biztosan törlöd a(z) „${sz.nev}” színt?`)) return;
    const { error } = await client.from('szin_paletta').delete().eq('id', sz.id);
    if (error) {
        console.error('A szín törlése nem sikerült:', error);
        return allapot(`A törlés nem sikerült: ${error.message}`, 'hiba');
    }
    allapot(`${sz.nev}: törölve.`, 'ok');
    await ujratoltes();
}

async function ujSzinFelvetel(e) {
    e.preventDefault();
    const nev = $('adminUjSzinNev').value.trim();
    if (nev.length < 2 || nev.length > 40) return allapot('Add meg a szín nevét (2–40 karakter).', 'hiba');
    const vanSzin2 = $('adminUjVanSzin2').checked;

    const { error } = await client.from('szin_paletta').insert({
        nev,
        kep_szin_1: $('adminUjSzin1').value,
        kep_szin_2: vanSzin2 ? $('adminUjSzin2').value : null,
        letrehozta: getState().user?.id || null,
    });
    if (error) {
        console.error('A szín létrehozása nem sikerült:', error);
        return allapot(`A létrehozás nem sikerült: ${error.message}`, 'hiba');
    }
    $('adminUjSzin').reset();
    $('adminUjSzin2').disabled = true;
    allapot(`${nev}: létrehozva.`, 'ok');
    await ujratoltes();
}

function kirajzolas() {
    $('adminSzinek').replaceChildren(...(szinek.length
        ? szinek.map(szinSor)
        : [ujElem('li', 'admin-sor admin-ures', 'Nincs még elmentett szín.')]));
}

async function ujratoltes() {
    const { data, error } = await client
        .from('szin_paletta')
        .select('id, nev, kep_szin_1, kep_szin_2')
        .order('nev', { ascending: true });
    if (error) {
        console.error('A színek betöltése nem sikerült:', error);
        allapot('A színek betöltése nem sikerült.', 'hiba');
        return;
    }
    szinek = data || [];
    kirajzolas();
}

export async function indit() {
    $('adminUjSzin').addEventListener('submit', ujSzinFelvetel);
    $('adminUjVanSzin2').addEventListener('change', () => { $('adminUjSzin2').disabled = !$('adminUjVanSzin2').checked; });
    await ujratoltes();
}
