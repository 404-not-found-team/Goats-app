// Goats Game: pontozótábla a csoport tagjainak, Supabase-ben tárolva.
// Táblák: goatgame_jatekok (csoport játékai), goatgame_meccsek (lejátszott meccsek, a játékhoz kötve),
// goatgame_pontok (meccsenként és játékosonként egy pont), goatgame_szinek (játékosszínek csoportonként).
// Minden user_id-ra kulcsolt, így az átnevezés nem veszít adatot; a hozzáférést az RLS a csoporttagságra szűri.
// A színek CSS-osztályként kerülnek az elemekre (window.szinOsztaly), nem inline stílusként.
// A felhasználói szövegek (játéknév, játékosnév) textContent-tel kerülnek be, nem innerHTML-lel (XSS).

const ALAP_SZIN = '#4caf50';
const SZIN_MINTA = /^#[0-9a-f]{6}$/i;

let jatekosok = [];          // [{ user_id, display_name }]
let jatekosSzinek = new Map(); // user_id -> '#rrggbb'
let jatekok = [];            // [{ id, nev, szin, meccsek: [{ id, pontok: Map(user_id -> pont) }] }]

window.addEventListener('load', async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    await initGoatsGame();
});

function aktualisCsoportId() {
    return window.goatsAuth?.getState()?.group?.id || null;
}

function supabaseKliens() {
    return window._supabase || null;
}

async function initGoatsGame() {
    const allapot = window.goatsAuth?.getState();
    jatekosok = (allapot?.members || []).map(m => ({ user_id: m.user_id, display_name: m.display_name }));
    await betoltesSupabasebol();
    renderMinden();
}

async function betoltesSupabasebol() {
    const groupId = aktualisCsoportId();
    const db = supabaseKliens();
    if (!groupId || !db) return;

    const [szinRes, jatekRes] = await Promise.all([
        db.from('goatgame_szinek').select('user_id, szin').eq('group_id', groupId),
        db.from('goatgame_jatekok')
            .select('id, nev, szin, created_at, goatgame_meccsek(id, created_at, goatgame_pontok(user_id, pont))')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true }),
    ]);

    if (szinRes.error) console.error('Színek betöltési hiba:', szinRes.error);
    jatekosSzinek = new Map((szinRes.data || []).map(sor => [sor.user_id, sor.szin]));

    if (jatekRes.error) {
        console.error('Játékok betöltési hiba:', jatekRes.error);
        return;
    }
    jatekok = (jatekRes.data || []).map(j => ({
        id: j.id,
        nev: j.nev,
        szin: j.szin,
        meccsek: (j.goatgame_meccsek || [])
            .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
            .map(m => ({ id: m.id, pontok: new Map((m.goatgame_pontok || []).map(p => [p.user_id, p.pont])) })),
    }));
}

// --- Megjelenítés: minden az állapotból épül újra, így az összpont sosem csúszik el ---

function szinesOsztalyok(szin) {
    const osztaly = typeof window.szinOsztaly === 'function' ? window.szinOsztaly(szin || ALAP_SZIN) : 'szin-ures';
    return ['szines-hatter', osztaly];
}

function szinBeallitasa(elem, szin) {
    [...elem.classList].filter(o => o.startsWith('szin-')).forEach(o => elem.classList.remove(o));
    elem.classList.add(...szinesOsztalyok(szin));
}

function jatekosSzine(userId) {
    return jatekosSzinek.get(userId) || ALAP_SZIN;
}

function renderMinden() {
    renderTabellaFejlecek();
    renderOszlopok();
    renderJatekLista();
}

function renderTabellaFejlecek() {
    const nevekContainer = document.getElementById('nevekOszlop');
    const osszContainer = document.getElementById('osszOszlop');
    if (!nevekContainer || !osszContainer) return;

    nevekContainer.innerHTML = '<div class="fejlec">Név</div>';
    osszContainer.innerHTML = '<div class="fejlec">Összpont</div>';

    if (jatekosok.length === 0) {
        const uzenet = document.createElement('div');
        uzenet.className = 'nev-sor ures-uzenet';
        uzenet.textContent = 'A csoport tagjai nem tölthetők be.';
        nevekContainer.appendChild(uzenet);
        return;
    }

    const osszpontok = osszpontSzamitas();
    jatekosok.forEach(jatekos => {
        const sor = document.createElement('div');
        sor.className = 'nev-sor';
        sor.dataset.userId = jatekos.user_id;
        szinBeallitasa(sor, jatekosSzine(jatekos.user_id));

        const nevSpan = document.createElement('span');
        nevSpan.textContent = jatekos.display_name;

        const szinPicker = document.createElement('input');
        szinPicker.type = 'color';
        szinPicker.className = 'nev-szin-picker';
        szinPicker.value = jatekosSzine(jatekos.user_id);
        szinPicker.setAttribute('aria-label', `${jatekos.display_name} színe`);
        szinPicker.addEventListener('change', (e) => frissitJatekosSzinet(jatekos.user_id, e.target));

        sor.append(nevSpan, szinPicker);
        nevekContainer.appendChild(sor);

        const ossz = document.createElement('div');
        ossz.className = 'pontOssz';
        ossz.dataset.userId = jatekos.user_id;
        ossz.textContent = String(osszpontok.get(jatekos.user_id) || 0);
        szinBeallitasa(ossz, jatekosSzine(jatekos.user_id));
        osszContainer.appendChild(ossz);
    });
}

function osszpontSzamitas() {
    const ossz = new Map();
    jatekok.forEach(j => j.meccsek.forEach(m => {
        m.pontok.forEach((pont, userId) => ossz.set(userId, (ossz.get(userId) || 0) + pont));
    }));
    return ossz;
}

function renderOszlopok() {
    const kontener = document.getElementById('pontJatekOszlopok');
    if (!kontener) return;
    kontener.replaceChildren();

    jatekok.forEach(jatek => jatek.meccsek.forEach(meccs => {
        const oszlop = document.createElement('div');
        oszlop.className = 'tablazat szines-jatek-oszlop';
        szinBeallitasa(oszlop, jatek.szin);

        const fejlec = document.createElement('div');
        fejlec.className = 'fejlec';
        fejlec.title = jatek.nev;

        const nevSpan = document.createElement('span');
        nevSpan.textContent = jatek.nev;

        const torlesGomb = document.createElement('button');
        torlesGomb.type = 'button';
        torlesGomb.className = 'torles-gomb';
        torlesGomb.title = 'Meccs törlése';
        torlesGomb.setAttribute('aria-label', `${jatek.nev}: meccs törlése`);
        torlesGomb.textContent = '🗑️';
        torlesGomb.addEventListener('click', () => meccsTorlese(jatek, meccs));

        fejlec.append(nevSpan, torlesGomb);
        oszlop.appendChild(fejlec);

        jatekosok.forEach(jatekos => {
            const sor = document.createElement('div');
            sor.textContent = String(meccs.pontok.get(jatekos.user_id) ?? 0);
            oszlop.appendChild(sor);
        });

        kontener.appendChild(oszlop);
    }));
}

function renderJatekLista() {
    const jatekLista = document.getElementById('jatekLista');
    if (!jatekLista) return;
    jatekLista.replaceChildren();

    jatekok.forEach(jatek => {
        const lejatszva = jatek.meccsek.length > 0;

        const jatekElem = document.createElement('div');
        jatekElem.className = 'jatek-elem';
        jatekElem.dataset.jatekId = jatek.id;

        const span = document.createElement('span');
        span.textContent = jatek.nev.toUpperCase();

        const gombokKontener = document.createElement('div');
        gombokKontener.className = 'jatek-gombok';

        const pontGomb = document.createElement('button');
        pontGomb.type = 'button';
        pontGomb.className = 'teljesit-gomb';
        pontGomb.textContent = lejatszva ? 'Kész ✓' : 'Kész';
        pontGomb.disabled = lejatszva;
        pontGomb.addEventListener('click', () => ujMeccsHozzaadasa(jatek, pontGomb));

        const torlesGomb = document.createElement('button');
        torlesGomb.type = 'button';
        torlesGomb.className = 'torles-gomb';
        torlesGomb.title = 'Játék törlése';
        torlesGomb.setAttribute('aria-label', `${jatek.nev} törlése`);
        torlesGomb.textContent = '🗑️';
        torlesGomb.addEventListener('click', () => jatekTorlese(jatek, torlesGomb));

        gombokKontener.append(pontGomb, torlesGomb);
        jatekElem.append(span, gombokKontener);
        jatekLista.appendChild(jatekElem);
    });
}

// --- Műveletek ---

async function frissitJatekosSzinet(userId, picker) {
    const ujSzin = picker.value.toLowerCase();
    const regiSzin = jatekosSzine(userId);
    if (!SZIN_MINTA.test(ujSzin) || ujSzin === regiSzin) return;

    const groupId = aktualisCsoportId();
    const db = supabaseKliens();
    if (!groupId || !db) return;

    jatekosSzinek.set(userId, ujSzin);
    document.querySelectorAll(`#nevekOszlop .nev-sor[data-user-id="${userId}"], #osszOszlop .pontOssz[data-user-id="${userId}"]`)
        .forEach(elem => szinBeallitasa(elem, ujSzin));

    const { error } = await db
        .from('goatgame_szinek')
        .upsert({ group_id: groupId, user_id: userId, szin: ujSzin }, { onConflict: 'group_id,user_id' });

    if (error) {
        console.error('Hiba a szín mentésekor:', error);
        alert('Nem sikerült menteni a színt: ' + error.message);
        jatekosSzinek.set(userId, regiSzin);
        picker.value = regiSzin;
        document.querySelectorAll(`#nevekOszlop .nev-sor[data-user-id="${userId}"], #osszOszlop .pontOssz[data-user-id="${userId}"]`)
            .forEach(elem => szinBeallitasa(elem, regiSzin));
    }
}

function openUjJatekModal() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = false;
        document.getElementById('ujJatekNevInput').focus();
    }
}

function closeUjJatekModal() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = true;
        document.getElementById('ujJatekNevInput').value = '';
    }
}

window.addEventListener('click', function (event) {
    const modal = document.getElementById('ujJatekModal');
    if (event.target === modal) {
        closeUjJatekModal();
    }
});

async function mentUjJatek() {
    const nevInput = document.getElementById('ujJatekNevInput');
    const szinInput = document.getElementById('ujJatekSzinInput');

    const jatekNev = nevInput.value.trim();
    const szin = SZIN_MINTA.test(szinInput.value) ? szinInput.value.toLowerCase() : ALAP_SZIN;

    if (!jatekNev) {
        alert('Kérlek add meg a játék nevét!');
        return;
    }

    const groupId = aktualisCsoportId();
    const db = supabaseKliens();
    if (!groupId || !db) {
        alert('A játék felvételéhez csoporttagság és internetkapcsolat kell.');
        return;
    }

    const { data, error } = await db
        .from('goatgame_jatekok')
        .insert({ group_id: groupId, nev: jatekNev, szin })
        .select('id, nev, szin')
        .single();

    if (error) {
        console.error('Hiba a játék mentésekor:', error);
        alert('Hiba történt a játék felvételekor: ' + error.message);
        return;
    }

    jatekok.push({ id: data.id, nev: data.nev, szin: data.szin, meccsek: [] });
    renderJatekLista();
    closeUjJatekModal();
}

async function ujMeccsHozzaadasa(jatek, gombElem) {
    if (jatekosok.length === 0) {
        alert('Nincsenek betöltve játékosok!');
        return;
    }

    const pontok = [];
    for (const jatekos of jatekosok) {
        const bekeres = prompt(`Hány pontot ért el ${jatekos.display_name} (${jatek.nev})?`, '0');
        if (bekeres === null) return;

        let pont = Math.round(Number(bekeres));
        if (!Number.isFinite(pont)) pont = 0;
        pont = Math.max(-1000000, Math.min(1000000, pont));
        pontok.push({ user_id: jatekos.user_id, pont });
    }

    const db = supabaseKliens();
    if (!db) return;

    gombElem.disabled = true;
    // A meccs és a pontok egy tranzakcióban mentődnek, így nem maradhat félig mentett meccs
    const { data: meccsId, error } = await db.rpc('goatgame_meccs_mentese', { p_jatek_id: jatek.id, p_pontok: pontok });
    if (error) {
        console.error('Hiba a pontok mentésekor:', error);
        alert('Hiba történt a pontok mentése során: ' + error.message);
        gombElem.disabled = false;
        return;
    }

    jatek.meccsek.push({ id: meccsId, pontok: new Map(pontok.map(p => [p.user_id, p.pont])) });
    renderMinden();
}

async function meccsTorlese(jatek, meccs) {
    if (!confirm(`Biztosan törlöd ezt a meccset (${jatek.nev})?`)) return;

    const db = supabaseKliens();
    if (!db) return;

    const { error } = await db.from('goatgame_meccsek').delete().eq('id', meccs.id);
    if (error) {
        console.error('Hiba a meccs törlésekor:', error);
        alert('Nem sikerült törölni a meccset: ' + error.message);
        return;
    }

    jatek.meccsek = jatek.meccsek.filter(m => m.id !== meccs.id);
    renderMinden();
}

async function jatekTorlese(jatek, gombElem) {
    if (!confirm('Biztosan törölni szeretnéd ezt a játékot és a hozzá tartozó adatokat?')) return;

    const db = supabaseKliens();
    if (!db) return;

    gombElem.disabled = true;
    // A meccsek és a pontok az adatbázisban kaszkádoltan törlődnek a játékkal együtt
    const { error } = await db.from('goatgame_jatekok').delete().eq('id', jatek.id);
    if (error) {
        console.error('Hiba a játék törlésekor:', error);
        alert('Nem sikerült törölni a játékot: ' + error.message);
        gombElem.disabled = false;
        return;
    }

    jatekok = jatekok.filter(j => j.id !== jatek.id);
    renderMinden();
}
