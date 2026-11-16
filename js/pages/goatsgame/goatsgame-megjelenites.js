// GoatsGame – megjelenítés: a tábla (nevek, meccsoszlopok, összpontok), a játéklista és az új játék ablaka.
// Minden az állapotból épül újra, így az összpont sosem csúszik el. Az adatbázist nem ismeri; a gombok a
// vezérlőtől kapott callbackeket hívják:
//   muveletek = { szinValtaskor(userId, picker), meccsHozzaadasakor(jatek, gomb),
//                 meccsTorlesekor(jatek, meccs), jatekTorlesekor(jatek, gomb) }
// A színek CSS-osztályként kerülnek az elemekre (window.szinOsztaly), nem inline stílusként.
// A felhasználói szövegek (játéknév, játékosnév) textContent-tel kerülnek be, nem innerHTML-lel (XSS).

export const ALAP_SZIN = '#4caf50';

function szinesOsztalyok(szin) {
    const osztaly = typeof window.szinOsztaly === 'function' ? window.szinOsztaly(szin || ALAP_SZIN) : 'szin-ures';
    return ['szines-hatter', osztaly];
}

function szinBeallitasa(elem, szin) {
    [...elem.classList].filter(o => o.startsWith('szin-')).forEach(o => elem.classList.remove(o));
    elem.classList.add(...szinesOsztalyok(szin));
}

export function jatekosSzine(jatekosSzinek, userId) {
    return jatekosSzinek.get(userId) || ALAP_SZIN;
}

// Egy játékos sorának és összpontjának átszínezése (újrarajzolás nélkül, pl. színválasztáskor)
export function jatekosSzinFrissitese(userId, szin) {
    document.querySelectorAll(`#nevekOszlop .nev-sor[data-user-id="${userId}"], #osszOszlop .pontOssz[data-user-id="${userId}"]`)
        .forEach(elem => szinBeallitasa(elem, szin));
}

// Az egész tábla újrarajzolása az állapotból: a nevek és összpontok, a meccsoszlopok és a játéklista
export function tablaKirajzolasa(allapot, muveletek) {
    renderTabellaFejlecek(allapot, muveletek);
    renderOszlopok(allapot, muveletek);
    jatekListaKirajzolasa(allapot.jatekok, muveletek);
}

function renderTabellaFejlecek({ jatekosok, jatekosSzinek, jatekok }, muveletek) {
    const nevekContainer = document.getElementById('nevekOszlop');
    const osszContainer = document.getElementById('osszOszlop');
    if (!nevekContainer || !osszContainer) return;

    nevekContainer.innerHTML = `<div class="fejlec">${tr('name', 'Név')}</div>`;
    osszContainer.innerHTML = `<div class="fejlec">${tr('total_score', 'Összpont')}</div>`;

    if (jatekosok.length === 0) {
        const uzenet = document.createElement('div');
        uzenet.className = 'nev-sor ures-uzenet';
        uzenet.textContent = tr('err_members_load', 'A csoport tagjai nem tölthetők be.');
        nevekContainer.appendChild(uzenet);
        return;
    }

    const osszpontok = osszpontSzamitas(jatekok);
    jatekosok.forEach(jatekos => {
        const sor = document.createElement('div');
        sor.className = 'nev-sor';
        sor.dataset.userId = jatekos.user_id;
        szinBeallitasa(sor, jatekosSzine(jatekosSzinek, jatekos.user_id));

        const nevSpan = document.createElement('span');
        nevSpan.textContent = jatekos.display_name;

        const szinPicker = document.createElement('input');
        szinPicker.type = 'color';
        szinPicker.className = 'nev-szin-picker';
        szinPicker.value = jatekosSzine(jatekosSzinek, jatekos.user_id);
        szinPicker.setAttribute('aria-label', tr('color_of', '{name} színe', { name: jatekos.display_name }));
        szinPicker.addEventListener('change', (e) => muveletek.szinValtaskor(jatekos.user_id, e.target));

        sor.append(nevSpan, szinPicker);
        nevekContainer.appendChild(sor);

        const ossz = document.createElement('div');
        ossz.className = 'pontOssz';
        ossz.dataset.userId = jatekos.user_id;
        ossz.textContent = String(osszpontok.get(jatekos.user_id) || 0);
        szinBeallitasa(ossz, jatekosSzine(jatekosSzinek, jatekos.user_id));
        osszContainer.appendChild(ossz);
    });
}

function osszpontSzamitas(jatekok) {
    const ossz = new Map();
    jatekok.forEach(j => j.meccsek.forEach(m => {
        m.pontok.forEach((pont, userId) => ossz.set(userId, (ossz.get(userId) || 0) + pont));
    }));
    return ossz;
}

function renderOszlopok({ jatekosok, jatekok }, muveletek) {
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
        torlesGomb.title = tr('delete_match', 'Meccs törlése');
        torlesGomb.setAttribute('aria-label', tr('delete_match_of', '{game}: meccs törlése', { game: jatek.nev }));
        torlesGomb.textContent = '🗑️';
        torlesGomb.addEventListener('click', () => muveletek.meccsTorlesekor(jatek, meccs));

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

export function jatekListaKirajzolasa(jatekok, muveletek) {
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
        pontGomb.textContent = lejatszva ? tr('done_check', 'Kész ✓') : tr('done', 'Kész');
        pontGomb.disabled = lejatszva;
        pontGomb.addEventListener('click', () => muveletek.meccsHozzaadasakor(jatek, pontGomb));

        const torlesGomb = document.createElement('button');
        torlesGomb.type = 'button';
        torlesGomb.className = 'torles-gomb';
        torlesGomb.title = tr('delete_game_title', 'Játék törlése');
        torlesGomb.setAttribute('aria-label', tr('delete_of', '{name} törlése', { name: jatek.nev }));
        torlesGomb.textContent = '🗑️';
        torlesGomb.addEventListener('click', () => muveletek.jatekTorlesekor(jatek, torlesGomb));

        gombokKontener.append(pontGomb, torlesGomb);
        jatekElem.append(span, gombokKontener);
        jatekLista.appendChild(jatekElem);
    });
}

// --- Új játék ablak ---

export function ujJatekModalNyitasa() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = false;
        document.getElementById('ujJatekNevInput').focus();
    }
}

export function ujJatekModalZarasa() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = true;
        document.getElementById('ujJatekNevInput').value = '';
    }
}
