// Goats Game: pontozótábla a csoport tagjainak, Supabase-ben tárolva.
// Ez a vezérlő: az állapot (játékosok, színek, játékok) itt van, és ez köti össze az adatréteget
// (goatsgame-adat.js) a megjelenítéssel (goatsgame-megjelenites.js).
// Minden user_id-ra kulcsolt, így az átnevezés nem veszít adatot; a hozzáférést az RLS a csoporttagságra szűri.
import { ready, getState } from '../../hitelesites.js';
import { betolt, ir } from '../../segedek/adat-gyorsitotar.js';
import {
    tabellaLekerese, jatekosSzinMentese, jatekFelvetele, meccsMentese, meccsTorlese, jatekTorlese,
} from './goatsgame-adat.js';
import {
    ALAP_SZIN, jatekosSzine, jatekosSzinFrissitese, tablaKirajzolasa, jatekListaKirajzolasa,
    ujJatekModalNyitasa, ujJatekModalZarasa,
} from './goatsgame-megjelenites.js';

const SZIN_MINTA = /^#[0-9a-f]{6}$/i;

let jatekosok = [];          // [{ user_id, display_name }]
let jatekosSzinek = new Map(); // user_id -> '#rrggbb'
let jatekok = [];            // [{ id, nev, szin, meccsek: [{ id, pontok: Map(user_id -> pont) }] }]

// amit a tábla és a játéklista gombjai hívnak (callbackek a megjelenítésnek)
const MUVELETEK = {
    szinValtaskor: frissitJatekosSzinet,
    meccsHozzaadasakor: ujMeccsHozzaadasa,
    meccsTorlesekor: meccsTorlesKerese,
    jatekTorlesekor: jatekTorlesKerese,
};

function aktualisCsoportId() {
    return getState()?.group?.id || null;
}

function kirajzolas() {
    tablaKirajzolasa({ jatekosok, jatekosSzinek, jatekok }, MUVELETEK);
}

async function indit() {
    // az új játék ablak gombjai (korábban data-katt a HTML-ben)
    document.getElementById('ujJatekGomb')?.addEventListener('click', ujJatekModalNyitasa);
    document.getElementById('ujJatekBezaras')?.addEventListener('click', ujJatekModalZarasa);
    document.getElementById('ujJatekMegse')?.addEventListener('click', ujJatekModalZarasa);
    document.getElementById('ujJatekMentes')?.addEventListener('click', mentUjJatek);
    // az ablakon kívüli (sötét) részre kattintva bezárul
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('ujJatekModal')) ujJatekModalZarasa();
    });

    await ready;
    jatekosok = (getState()?.members || []).map(m => ({ user_id: m.user_id, display_name: m.display_name }));
    kirajzolas();
    await betoltes();
}

// Előbb az utoljára látott tábla jelenik meg azonnal, a friss adat a háttérben érkezik
// (js/segedek/adat-gyorsitotar.js). A tárolt formátum a nyers lekérdezési eredmény.
async function betoltes() {
    const groupId = aktualisCsoportId();
    if (!groupId) return;

    await betolt('goatsgame', () => tabellaLekerese(groupId), (adat) => {
        allapotBeallitasa(adat);
        kirajzolas();
    });
}

function allapotBeallitasa({ szinek, jatekok: jatekSorok }) {
    jatekosSzinek = new Map(szinek.map(sor => [sor.user_id, sor.szin]));
    jatekok = jatekSorok.map(j => ({
        id: j.id,
        nev: j.nev,
        szin: j.szin,
        meccsek: (j.goatgame_meccsek || [])
            .slice()
            .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
            .map(m => ({ id: m.id, pontok: new Map((m.goatgame_pontok || []).map(p => [p.user_id, p.pont])) })),
    }));
}

// Helyi módosítás után a tárolt példány is frissül (a következő betöltés a mostani állapotot mutatja)
function allapotTarolasa() {
    ir('goatsgame', {
        szinek: [...jatekosSzinek].map(([user_id, szin]) => ({ user_id, szin })),
        jatekok: jatekok.map(j => ({
            id: j.id,
            nev: j.nev,
            szin: j.szin,
            goatgame_meccsek: j.meccsek.map((m, i) => ({
                id: m.id,
                created_at: String(i).padStart(6, '0'),
                goatgame_pontok: [...m.pontok].map(([user_id, pont]) => ({ user_id, pont })),
            })),
        })),
    });
}

// --- Műveletek ---

async function frissitJatekosSzinet(userId, picker) {
    const ujSzin = picker.value.toLowerCase();
    const regiSzin = jatekosSzine(jatekosSzinek, userId);
    if (!SZIN_MINTA.test(ujSzin) || ujSzin === regiSzin) return;

    const groupId = aktualisCsoportId();
    if (!groupId) return;

    // azonnal átszínezzük, hiba esetén visszaállítjuk
    jatekosSzinek.set(userId, ujSzin);
    jatekosSzinFrissitese(userId, ujSzin);

    const hiba = await jatekosSzinMentese(groupId, userId, ujSzin);
    if (hiba) {
        alert(tr('err_color_save', 'Nem sikerült menteni a színt: {msg}', { msg: hiba.message }));
        jatekosSzinek.set(userId, regiSzin);
        picker.value = regiSzin;
        jatekosSzinFrissitese(userId, regiSzin);
        return;
    }
    allapotTarolasa();
}

async function mentUjJatek() {
    const nevInput = document.getElementById('ujJatekNevInput');
    const szinInput = document.getElementById('ujJatekSzinInput');

    const jatekNev = nevInput.value.trim();
    const szin = SZIN_MINTA.test(szinInput.value) ? szinInput.value.toLowerCase() : ALAP_SZIN;

    if (!jatekNev) {
        alert(tr('err_game_name', 'Kérlek add meg a játék nevét!'));
        return;
    }

    const groupId = aktualisCsoportId();
    if (!groupId) {
        alert(tr('err_game_add_need', 'A játék felvételéhez csoporttagság és internetkapcsolat kell.'));
        return;
    }

    const { data, error } = await jatekFelvetele(groupId, jatekNev, szin);
    if (error) {
        alert(tr('err_game_add', 'Hiba történt a játék felvételekor: {msg}', { msg: error.message }));
        return;
    }

    jatekok.push({ id: data.id, nev: data.nev, szin: data.szin, meccsek: [] });
    allapotTarolasa();
    jatekListaKirajzolasa(jatekok, MUVELETEK);
    ujJatekModalZarasa();
}

async function ujMeccsHozzaadasa(jatek, gombElem) {
    if (jatekosok.length === 0) {
        alert(tr('err_no_players', 'Nincsenek betöltve játékosok!'));
        return;
    }

    const pontok = [];
    for (const jatekos of jatekosok) {
        const bekeres = prompt(tr('prompt_points', 'Hány pontot ért el {name} ({game})?', { name: jatekos.display_name, game: jatek.nev }), '0');
        if (bekeres === null) return;

        let pont = Math.round(Number(bekeres));
        if (!Number.isFinite(pont)) pont = 0;
        pont = Math.max(-1000000, Math.min(1000000, pont));
        pontok.push({ user_id: jatekos.user_id, pont });
    }

    gombElem.disabled = true;
    const { data: meccsId, error } = await meccsMentese(jatek.id, pontok);
    if (error) {
        alert(tr('err_points_save', 'Hiba történt a pontok mentése során: {msg}', { msg: error.message }));
        gombElem.disabled = false;
        return;
    }

    jatek.meccsek.push({ id: meccsId, pontok: new Map(pontok.map(p => [p.user_id, p.pont])) });
    allapotTarolasa();
    kirajzolas();
}

async function meccsTorlesKerese(jatek, meccs) {
    if (!confirm(tr('confirm_delete_match', 'Biztosan törlöd ezt a meccset ({game})?', { game: jatek.nev }))) return;

    const hiba = await meccsTorlese(meccs.id);
    if (hiba) {
        alert(tr('err_match_delete', 'Nem sikerült törölni a meccset: {msg}', { msg: hiba.message }));
        return;
    }

    jatek.meccsek = jatek.meccsek.filter(m => m.id !== meccs.id);
    allapotTarolasa();
    kirajzolas();
}

async function jatekTorlesKerese(jatek, gombElem) {
    if (!confirm(tr('confirm_delete_game', 'Biztosan törölni szeretnéd ezt a játékot és a hozzá tartozó adatokat?'))) return;

    gombElem.disabled = true;
    const hiba = await jatekTorlese(jatek.id);
    if (hiba) {
        alert(tr('err_game_delete', 'Nem sikerült törölni a játékot: {msg}', { msg: hiba.message }));
        gombElem.disabled = false;
        return;
    }

    jatekok = jatekok.filter(j => j.id !== jatek.id);
    allapotTarolasa();
    kirajzolas();
}

indit();
