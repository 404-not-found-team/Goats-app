window.onload = async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    initMembersAndContainers();
    loadTartozasok();

    // Közös költség: előnézet és egyedi összegek élő frissítése
    document.getElementById('mennyiertInput')?.addEventListener('input', frissitKozosKoltseg);
    document.querySelectorAll('input[name="elosztasMod"]').forEach(r => r.addEventListener('change', frissitKozosKoltseg));
    document.getElementById('dropdownContent')?.addEventListener('change', frissitKozosKoltseg);
    document.getElementById('egyediOsszegek')?.addEventListener('input', frissitOsszesen);

    // Összevont sorok nyila / egyenlítés gomb – egyszer felkötve, a kártyák újrarajzolásakor is működik
    document.querySelector('.tartozasok-grid')?.addEventListener('click', kezeldTartozasKattintast);
};

// A csoportkód/taglista forrása az élő auth-állapot; localStorage csak akkor,
// ha az auth-service valamiért még nem futott le (sosem kéne előfordulnia).
function aktualisGroupCode() {
    return window.goatsAuth?.getState()?.group?.group_code || localStorage.getItem('goats_group_code');
}

// Tagok: [{ user_id, display_name }] – az azonosító a kulcs, a név csak megjelenítés.
function aktualisTagok() {
    const allapot = window.goatsAuth?.getState();
    return (allapot?.members || []).map(m => ({ user_id: m.user_id, display_name: m.display_name }));
}

function tagNev(userId, tartalekNev) {
    const tag = aktualisTagok().find(m => m.user_id === userId);
    return tag ? tag.display_name : (tartalekNev || 'Törölt tag');
}

function getNakNek(name) {
    if (!name) return '';

    const lowerName = name.toLowerCase().trim();
    const melyMgh = ['a', 'á', 'o', 'ó', 'u', 'ú'];
    const vanBenneMely = lowerName.split('').some(char => melyMgh.includes(char));

    if (vanBenneMely) {
        return name + 'nak';
    }

    return name + 'nek';
}

const PALETTE = [
    '#470047',
    '#FF7F50',
    '#5D3FD3',
    '#15BF16',
    '#9C27B0',
    '#FF9800',
    '#00BCD4',
    '#E91E63',
    '#4CAF50',
    '#FFEB3B',
    '#3F51B5',
    '#009688',
    '#FF5722',
    '#795548',
    '#607D8B'
];

function getMemberColor(index) {
    if (index < PALETTE.length) {
        return PALETTE[index];
    }
    const extraIndex = index - PALETTE.length;
    return `hsl(${(extraIndex * 137.5) % 360}, 70%, 50%)`;
}

let selectedKinek = '';      // user_id

function toggleDropdown() {
    const content = document.getElementById('dropdownContent');
    const isShowing = content ? content.classList.contains('show') : false;
    closeAllDropdowns();
    if (content && !isShowing) content.classList.add('show');
}

function toggleKinekDropdown() {
    const content = document.getElementById('kinekDropdownContent');
    const isShowing = content ? content.classList.contains('show') : false;
    closeAllDropdowns();
    if (content && !isShowing) content.classList.add('show');
}

function closeAllDropdowns() {
    const c1 = document.getElementById('dropdownContent');
    const c2 = document.getElementById('kinekDropdownContent');
    if (c1) c1.classList.remove('show');
    if (c2) c2.classList.remove('show');
}

window.addEventListener('click', function (e) {
    const d1 = document.getElementById('kiTartozikDropdown');
    const d2 = document.getElementById('kinekDropdown');

    if ((!d1 || !d1.contains(e.target)) && (!d2 || !d2.contains(e.target))) {
        closeAllDropdowns();
    }
});

function selectKinek(member, ragozottNev) {
    selectedKinek = member;
    const label = document.getElementById('kinekDropdownLabel');
    if (label) {
        label.textContent = ragozottNev;
    }

    const items = document.querySelectorAll('#kinekDropdownContent .dropdown-item');
    items.forEach(item => {
        if (item.dataset.value === member) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    frissitKozosKoltseg();
    closeAllDropdowns();
}

function updateDropdownLabel() {
    const checkedBoxes = document.querySelectorAll('#dropdownContent input[type="checkbox"]:checked');
    const label = document.getElementById('dropdownBtnLabel');
    if (!label) return;

    if (checkedBoxes.length === 0) {
        label.textContent = 'Ki tartozik?';
    } else if (checkedBoxes.length === 1) {
        label.textContent = checkedBoxes[0].parentElement.querySelector('span')?.textContent || 'Ki tartozik?';
    } else {
        label.textContent = `${checkedBoxes.length} ember kiválasztva`;
    }
}

async function initMembersAndContainers() {
    const members = aktualisTagok();

    const kinekContent = document.getElementById('kinekDropdownContent');
    const dropdownContent = document.getElementById('dropdownContent');

    if (kinekContent) {
        kinekContent.innerHTML = '';
        members.forEach(member => {
            const ragozottNev = getNakNek(member.display_name);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dropdown-item';
            itemDiv.dataset.value = member.user_id;
            itemDiv.textContent = ragozottNev;

            itemDiv.addEventListener('click', () => selectKinek(member.user_id, ragozottNev));
            kinekContent.appendChild(itemDiv);
        });
    }

    if (dropdownContent) {
        dropdownContent.innerHTML = '';
        members.forEach(member => {
            const itemDiv = document.createElement('label');
            itemDiv.className = 'dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member.user_id;
            checkbox.addEventListener('change', updateDropdownLabel);

            const span = document.createElement('span');
            span.textContent = member.display_name;

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(span);
            dropdownContent.appendChild(itemDiv);
        });
    }

    const gridContainer = document.querySelector('.tartozasok-grid');
    if (gridContainer) {
        gridContainer.innerHTML = '';
        members.forEach((member, index) => {
            const boxDiv = document.createElement('div');
            boxDiv.className = 'box';
            boxDiv.classList.add('tagdoboz', szinOsztaly(getMemberColor(index)));

            const h3 = document.createElement('h3');
            h3.textContent = member.display_name;

            const listDiv = document.createElement('div');
            listDiv.dataset.memberId = member.user_id;

            boxDiv.appendChild(h3);
            boxDiv.appendChild(listDiv);
            gridContainer.appendChild(boxDiv);
        });
    }
}

// Az utolsó betöltött összesítés ([{ados_id, hitelezo_id, nyitott_osszeg}]) – az egyenlítés-modal
// "előtte" összegeit ebből olvassuk ki, nem kell külön RPC-hívás a gomb megnyitásakor.
let osszesitesAdatok = [];

function nyitottOsszeg(adosId, hitelezoId) {
    const sor = osszesitesAdatok.find(s => s.ados_id === adosId && s.hitelezo_id === hitelezoId);
    return sor ? sor.nyitott_osszeg : 0;
}

async function loadTartozasok() {
    const groupCode = aktualisGroupCode();
    const members = aktualisTagok();
    const tagById = id => members.find(m => m.user_id === id);
    // A migráció előtti, nem párosított sorokhoz: név alapú tartalék
    const tagByName = nev => members.find(m => m.display_name === nev);

    const [osszesitesRes, legacyRes] = await Promise.all([
        _supabase.rpc('tartozas_osszesites', { p_group: null }),
        _supabase
            .from('tartozasok')
            .select('*')
            .eq('group_code', groupCode)
            .or('ados_id.is.null,hitelezo_id.is.null')
            .order('id', { ascending: false }),
    ]);

    if (osszesitesRes.error) {
        console.error('Hiba az összesítés betöltésekor:', osszesitesRes.error);
        return;
    }
    if (legacyRes.error) {
        console.error('Hiba a régi tartozások betöltésekor:', legacyRes.error);
    }

    osszesitesAdatok = osszesitesRes.data || [];

    members.forEach(member => {
        const targetDiv = document.querySelector(`[data-member-id="${CSS.escape(member.user_id)}"]`);
        if (targetDiv) targetDiv.innerHTML = '';
    });

    members.forEach((ados, memberIndex) => {
        const targetDiv = document.querySelector(`[data-member-id="${CSS.escape(ados.user_id)}"]`);
        if (!targetDiv) return;

        const sajatSorok = osszesitesAdatok.filter(s => s.ados_id === ados.user_id && s.nyitott_osszeg > 0);
        sajatSorok.forEach(sor => {
            targetDiv.appendChild(epitsOsszevontKartyat(sor, ados, memberIndex, members));
        });
    });

    // Régi, azonosító nélküli sorok (a jelenlegi kód nem tud párba állítani se egyenlítéshez,
    // se összevonáshoz) – ugyanúgy, flat kártyaként jelenítjük meg, mint korábban.
    (legacyRes.data || []).forEach(item => {
        const ados = tagById(item.ados_id) || tagByName(item.kitartozik);
        if (!ados) return; // törölt vagy ismeretlen adós – nincs doboza

        const targetDiv = document.querySelector(`[data-member-id="${CSS.escape(ados.user_id)}"]`);
        if (!targetDiv) return;

        const hitelezo = tagById(item.hitelezo_id) || tagByName(item.kinek);
        const hitelezoNev = hitelezo ? hitelezo.display_name : (item.kinek || 'Törölt tag');
        const felvette = tagById(item.felvette_id);
        const memberIndex = members.indexOf(ados);

        const card = document.createElement('div');
        card.className = 'tartozas-kartya';
        if (memberIndex !== -1) card.classList.add('tagkartya', szinOsztaly(getMemberColor(memberIndex)));

        const row = document.createElement('div');
        row.className = 'tartozas-sor';

        const textSpan = document.createElement('span');
        textSpan.textContent = `${getNakNek(hitelezoNev)} ${item.mennyiert} Ft-tal - ${item.miert}`;

        const deleteSpan = document.createElement('span');
        deleteSpan.textContent = '🗑️';
        deleteSpan.title = 'Törlés';
        deleteSpan.className = 'torles-jel';
        deleteSpan.addEventListener('click', () => deleteTartozas(item.id));

        row.appendChild(textSpan);
        row.appendChild(deleteSpan);
        card.appendChild(row);

        if (item.felvette_id) {
            const meta = document.createElement('div');
            meta.className = 'meta-szoveg';
            const mikor = item.felvetel_ideje
                ? ' · ' + new Date(item.felvetel_ideje).toLocaleDateString('hu-HU')
                : '';
            meta.textContent = `Felvette: ${felvette ? felvette.display_name : 'Törölt tag'}${mikor}`;
            card.appendChild(meta);
        }

        targetDiv.appendChild(card);
    });

    // Üres üzenetek kirakása, ha nincs tartozás
    members.forEach(member => {
        const targetDiv = document.querySelector(`[data-member-id="${CSS.escape(member.user_id)}"]`);
        if (targetDiv && targetDiv.children.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-msg ures-tartozas';
            emptyMsg.textContent = 'Még nincs tartozás';
            targetDiv.appendChild(emptyMsg);
        }
    });
}
window.loadTartozasok = loadTartozasok; // a dinamikusan importált egyenlítés-modul frissítéshez hívja

// Egy összevont (ados → hitelező) sor kártyája: fejléc (összeg + nyíl + esetleg egyenlítés gomb)
// és egy üres, lazán betöltött részletek-konténer.
function epitsOsszevontKartyat(sor, ados, memberIndex, members) {
    const hitelezo = members.find(m => m.user_id === sor.hitelezo_id);
    const hitelezoNev = hitelezo ? hitelezo.display_name : 'Törölt tag';

    const card = document.createElement('div');
    card.className = 'tartozas-osszevont tagkartya';
    card.classList.add(szinOsztaly(getMemberColor(memberIndex)));
    card.dataset.ados = ados.user_id;
    card.dataset.hitelezo = sor.hitelezo_id;

    const fejlec = document.createElement('div');
    fejlec.className = 'tartozas-osszevont-fejlec';

    const nyilBtn = document.createElement('button');
    nyilBtn.type = 'button';
    nyilBtn.className = 'nyil-toggle';
    nyilBtn.setAttribute('aria-expanded', 'false');
    nyilBtn.textContent = '›';

    const osszegSpan = document.createElement('span');
    osszegSpan.className = 'tartozas-osszevont-osszeg';
    osszegSpan.textContent = `Tartozik ${getNakNek(hitelezoNev)}: ${formatFt(sor.nyitott_osszeg)}`;

    fejlec.appendChild(nyilBtn);
    fejlec.appendChild(osszegSpan);

    // Kölcsönös tartozás esetén bárki csoporttag indíthat egyenlítést (mint a törlésnél is)
    const masikIranyu = nyitottOsszeg(sor.hitelezo_id, ados.user_id);
    if (masikIranyu > 0) {
        const beszamithato = Math.min(sor.nyitott_osszeg, masikIranyu);
        const egyenlitBtn = document.createElement('button');
        egyenlitBtn.type = 'button';
        egyenlitBtn.className = 'gomb-egyenlit';
        egyenlitBtn.textContent = `Tartozások egyenlítése (${formatFt(beszamithato)} beszámítása)`;
        fejlec.appendChild(egyenlitBtn);
    }

    const reszletek = document.createElement('div');
    reszletek.className = 'tartozas-reszletek-kontener';
    reszletek.hidden = true;

    card.appendChild(fejlec);
    card.appendChild(reszletek);
    return card;
}

// Egy kattintás-figyelő a teljes rácson (delegálás, mert a kártyák minden betöltéskor újraépülnek)
async function kezeldTartozasKattintast(e) {
    const kartya = e.target.closest('.tartozas-osszevont');
    if (!kartya) return;

    const adosId = kartya.dataset.ados;
    const hitelezoId = kartya.dataset.hitelezo;

    if (e.target.closest('.nyil-toggle')) {
        const nyilBtn = e.target.closest('.nyil-toggle');
        const reszletek = kartya.querySelector('.tartozas-reszletek-kontener');
        const nyitva = !reszletek.hidden;
        reszletek.hidden = nyitva;
        nyilBtn.setAttribute('aria-expanded', String(!nyitva));
        nyilBtn.textContent = nyitva ? '›' : '⌄';

        if (!nyitva && !reszletek.dataset.betoltve) {
            reszletek.dataset.betoltve = '1';
            const modul = await import('../components/tartozasok-egyenlites.js');
            modul.toltsReszleteket(reszletek, adosId, hitelezoId);
        }
        return;
    }

    if (e.target.closest('.gomb-egyenlit')) {
        const members = aktualisTagok();
        const ados = members.find(m => m.user_id === adosId);
        const hitelezo = members.find(m => m.user_id === hitelezoId);

        const modul = await import('../components/tartozasok-egyenlites.js');
        modul.nyitEgyenlitesModal({
            aId: adosId,
            aNev: ados ? ados.display_name : 'Törölt tag',
            bId: hitelezoId,
            bNev: hitelezo ? hitelezo.display_name : 'Törölt tag',
            aTartozikBnek: nyitottOsszeg(adosId, hitelezoId),
            bTartozikAnak: nyitottOsszeg(hitelezoId, adosId),
            beszamithato: Math.min(nyitottOsszeg(adosId, hitelezoId), nyitottOsszeg(hitelezoId, adosId)),
        });
    }
}

async function deleteTartozas(id) {
    const groupCode = aktualisGroupCode();
    const { error } = await _supabase
        .from('tartozasok')
        .delete()
        .eq('id', id)
        .eq('group_code', groupCode);

    if (error) {
        alert('Hiba történt a törlés során!');
        return;
    }

    loadTartozasok();
}

// ---------- Közös költség elosztása ----------

// Ezres tagolás szóközzel ("2 500 Ft"). A hu-HU locale 4 jegyű számoknál nem tagol, ezért kézzel.
function formatFt(szam) {
    const egesz = String(Math.round(szam));
    return `${egesz.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Ft`;
}

// Kétállású választó: "egyenlo" (alapértelmezett) vagy "egyedi"
function egyenloElosztasE() {
    const valasztott = document.querySelector('input[name="elosztasMod"]:checked');
    return !valasztott || valasztott.value === 'egyenlo';
}

function kijeloltResztvevok() {
    return Array.from(document.querySelectorAll('#dropdownContent input[type="checkbox"]:checked')).map(cb => cb.value);
}

function osszegErtek() {
    const ertek = parseFloat(document.getElementById('mennyiertInput')?.value);
    return Number.isFinite(ertek) && ertek > 0 ? Math.round(ertek) : null;
}

function tagNeve(id) {
    return aktualisTagok().find(m => m.user_id === id)?.display_name || '';
}

// Egyenlő elosztás. A maradék forint a hitelezőnél marad, ha ő is résztvevő,
// különben az első résztvevő kapja. A hitelező saját része nem tartozás, nincs hozzá sor.
function egyenloAdatok(osszeg, resztvevok, hitelezo) {
    const n = resztvevok.length;
    const resz = Math.floor(osszeg / n);
    const maradek = osszeg - resz * n;
    const maradekGazda = resztvevok.includes(hitelezo) ? hitelezo : resztvevok[0];
    return { n, resz, maradek, maradekGazda };
}

function egyenloSorok(osszeg, resztvevok, hitelezo) {
    const { resz, maradek, maradekGazda } = egyenloAdatok(osszeg, resztvevok, hitelezo);
    return resztvevok
        .filter(id => id !== hitelezo)
        .map(id => ({ adosId: id, osszeg: resz + (id === maradekGazda ? maradek : 0) }));
}

// Egyedi összegek résztvevőnként (a mezők a #egyediOsszegek konténerben vannak)
function egyediOsszegekOlvas() {
    const map = {};
    document.querySelectorAll('#egyediOsszegek input').forEach(i => {
        map[i.dataset.id] = Math.round(parseFloat(i.value) || 0);
    });
    return map;
}

function egyediMezok(osszeg, resztvevok) {
    const konténer = document.getElementById('egyediOsszegek');
    if (!konténer) return;
    const elozo = egyediOsszegekOlvas();
    const alap = Math.floor(osszeg / resztvevok.length);

    konténer.replaceChildren(...resztvevok.map(id => {
        const sor = document.createElement('div');
        sor.className = 'egyedi-sor';
        const nev = document.createElement('span');
        nev.textContent = tagNeve(id);
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.className = 'egyedi-input';
        input.dataset.id = id;
        input.setAttribute('aria-label', `${tagNeve(id)} összege`);
        input.value = elozo[id] !== undefined ? elozo[id] : alap;
        sor.append(nev, input);
        return sor;
    }));
}

// Összeg-ellenőrző sor: szöveggel és színnel is jelez (nem csak színnel)
function frissitOsszesen() {
    const elonezet = document.getElementById('elosztasElonezet');
    const osszeg = osszegErtek();
    if (!elonezet || egyenloElosztasE() || !osszeg) return;
    const map = egyediOsszegekOlvas();
    const sum = kijeloltResztvevok().reduce((a, id) => a + (map[id] || 0), 0);
    const kulonbseg = osszeg - sum;
    elonezet.classList.remove('hiba', 'ok');
    if (kulonbseg === 0) {
        elonezet.textContent = `Egyezik: ${formatFt(sum)} / ${formatFt(osszeg)}`;
        elonezet.classList.add('ok');
    } else if (kulonbseg > 0) {
        elonezet.textContent = `Még ${formatFt(kulonbseg)} hiányzik (${formatFt(sum)} / ${formatFt(osszeg)})`;
        elonezet.classList.add('hiba');
    } else {
        elonezet.textContent = `${formatFt(-kulonbseg)} többet osztottál be a kelleténél (${formatFt(sum)} / ${formatFt(osszeg)})`;
        elonezet.classList.add('hiba');
    }
}

// Élő előnézet: egyenlő elosztásnál "4 fő × 2 500 Ft", egyedinél összeg-ellenőrzés
function frissitKozosKoltseg() {
    const konténer = document.getElementById('egyediOsszegek');
    const egyenlo = egyenloElosztasE();
    if (konténer) konténer.classList.toggle('hidden', egyenlo);

    const elonezet = document.getElementById('elosztasElonezet');
    if (!elonezet) return;
    const resztvevok = kijeloltResztvevok();
    const osszeg = osszegErtek();
    elonezet.classList.remove('hiba', 'ok');

    if (!osszeg || resztvevok.length === 0) {
        elonezet.textContent = '';
        if (!egyenlo && konténer) konténer.replaceChildren();
        return;
    }

    if (egyenlo) {
        const { n, resz, maradek, maradekGazda } = egyenloAdatok(osszeg, resztvevok, selectedKinek);
        let szoveg = `${n} fő × ${formatFt(resz)}`;
        if (maradek > 0) szoveg += ` (a ${maradek} Ft-os maradék: ${tagNeve(maradekGazda)})`;
        elonezet.textContent = szoveg;
    } else {
        egyediMezok(osszeg, resztvevok);
        frissitOsszesen();
    }
}

// Sorok a felvitel előtt. Hibaüzenetet ad vissza, ha az elosztás nem helyes.
function tartozasSorok(osszeg, resztvevok, hitelezo) {
    if (egyenloElosztasE()) {
        return { sorok: egyenloSorok(osszeg, resztvevok, hitelezo), mod: null };
    }
    const map = egyediOsszegekOlvas();
    const sum = resztvevok.reduce((a, id) => a + (map[id] || 0), 0);
    if (sum !== osszeg) {
        return { hiba: `Az egyedi összegek összege (${formatFt(sum)}) nem egyezik a teljes összeggel (${formatFt(osszeg)}).` };
    }
    const sorok = resztvevok
        .filter(id => id !== hitelezo && (map[id] || 0) > 0)
        .map(id => ({ adosId: id, osszeg: map[id] }));
    return { sorok, mod: 'egyedi összegek' };
}

// Az RLS-hibákat érthető magyar üzenetre fordítjuk (a szabályt maga az adatbázis tartja)
function tartozasHiba(error) {
    const uzenet = error?.message || '';
    if (/row-level security|policy/i.test(uzenet)) {
        return 'Ehhez nincs jogosultságod: csak a csoport tagjai rögzíthetnek tartozást.';
    }
    if (/foreign key|violates/i.test(uzenet)) {
        return 'A kiválasztott tag nem tagja ennek a csoportnak.';
    }
    return 'Hiba történt a mentés során!';
}

async function addTartozas() {
    const groupCode = aktualisGroupCode();
    const miert = document.getElementById('miertInput').value.trim();
    const kinek = selectedKinek;
    const resztvevok = kijeloltResztvevok();
    const osszeg = osszegErtek();

    if (!miert || !osszeg || !kinek || resztvevok.length === 0) {
        alert('Kérlek töltsd ki az összes mezőt és válassz ki legalább egy résztvevőt!');
        return;
    }

    const felvevoId = window.goatsAuth?.getState()?.user?.id;
    if (!felvevoId) {
        alert('A tartozás felvételéhez be kell jelentkezned!');
        return;
    }

    const { sorok, mod, hiba } = tartozasSorok(osszeg, resztvevok, kinek);
    if (hiba) {
        alert(hiba);
        return;
    }
    if (sorok.length === 0) {
        alert('Legalább egy adósnak kell lennie a hitelezőn kívül.');
        return;
    }

    // Leírás a teljes összeggel és a résztvevők számával, pl. "kaja (10 000 Ft / 4 fő)"
    const leirasSzoveg = mod
        ? `${miert} (${formatFt(osszeg)}, ${mod})`
        : `${miert} (${formatFt(osszeg)} / ${resztvevok.length} fő)`;

    const nevek = id => tagNeve(id) || null;
    const ujTartozasok = sorok.map(({ adosId, osszeg: resz }) => ({
        miert: leirasSzoveg,
        mennyiert: resz,
        hitelezo_id: kinek,
        ados_id: adosId,
        felvette_id: felvevoId,
        // régi, szöveges oszlopok: csak pillanatkép, a megjelenítés az azonosítókból megy
        kinek: nevek(kinek),
        kitartozik: nevek(adosId),
        group_code: groupCode
    }));

    // Egyetlen insert: vagy minden sor bekerül, vagy egy sem (nincs részleges mentés)
    const { error } = await _supabase
        .from('tartozasok')
        .insert(ujTartozasok);

    if (error) {
        console.error('Hiba a mentéskor:', error);
        alert(tartozasHiba(error));
        return;
    }

    document.getElementById('miertInput').value = '';
    document.getElementById('mennyiertInput').value = '';

    selectedKinek = '';
    document.getElementById('kinekDropdownLabel').textContent = 'Kinek tartozik?';
    document.querySelectorAll('#kinekDropdownContent .dropdown-item').forEach(i => i.classList.remove('selected'));

    document.querySelectorAll('#dropdownContent input[type="checkbox"]:checked').forEach(cb => cb.checked = false);
    updateDropdownLabel();
    frissitKozosKoltseg();

    loadTartozasok();
}