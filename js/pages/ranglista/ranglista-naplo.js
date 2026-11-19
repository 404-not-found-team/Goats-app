// Ranglista-napló: ki, mikor, hová tette az italt (a kinagyított ital ablakában).

import { naploLekerese } from './ranglista-adat.js';
import { allapot } from './ranglista-allapot.js';
import { ujElem } from './ranglista-seged.js';

// ---------- Ranglista-napló: ki, mikor, hová tette az italt ----------
// A naplót a szerver írja (public.ital_ranglista_naplo, az ital_ranglista triggere), a kliens csak olvassa.

const NAPLO_KATEGORIA = { S: 'S', A: 'A', B: 'B', C: 'C', D: 'D', forras: tr('log_list', 'lista') };

// regi = null: előtte nem volt rangsorolva; uj = null: a sort törölték (nem az appból, hanem adatbázisból)
function naploKategoria(kod, uj = false) {
    if (!kod) return uj ? tr('log_removed', 'eltávolítva') : '–';
    return NAPLO_KATEGORIA[kod] || kod;
}

function naploIdo(iso) {
    try {
        return new Date(iso).toLocaleString(goatsNyelv.locale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

// Felhasználó nélküli bejegyzés: nem az appból, hanem adminisztrátori hozzáféréssel (adatbázisból) történt
function naploNev(userId) {
    if (!userId) return tr('log_admin_db', 'Adminisztrátor (adatbázis)');
    const tag = (window.goatsAuth?.getState()?.members || []).find(m => m.user_id === userId);
    return tag?.display_name || tr('unknown_cap', 'Ismeretlen');
}

export async function betoltNaplo(ital) {
    const doboz = document.getElementById('modal-naplo-doboz');
    const utolso = document.getElementById('modal-naplo-utolso');
    const lista = document.getElementById('modal-naplo-lista');
    if (!doboz || !utolso || !lista) return;
    doboz.hidden = true;
    lista.replaceChildren();

    const groupId = window.goatsAuth?.getState()?.group?.id;
    if (!groupId || !ital?.id) return;

    const keresettId = ital.id;
    const data = await naploLekerese(groupId, ital.id);
    // közben másik italt nyitottak meg, vagy bezárták az ablakot
    if (allapot.aktivItalAdat?.id !== keresettId) return;
    if (data === undefined) return;
    if (!data || data.length === 0) return;

    const elso = data[0];
    const ki = naploNev(elso.user_id);
    const mikor = naploIdo(elso.created_at);
    if (!elso.uj_kategoria) utolso.textContent = tr('log_removed_by', 'Eltávolította a ranglistáról: {who} · {when}', { who: ki, when: mikor });
    else if (elso.uj_kategoria === 'forras') utolso.textContent = tr('log_returned_by', 'Visszarakta a listába: {who} · {when}', { who: ki, when: mikor });
    else utolso.textContent = tr('log_placed_by', 'Ide tette: {who} · {when}', { who: ki, when: mikor });

    lista.replaceChildren(...data.map(sor => ujElem('li', 'modal-naplo-sor',
        `${naploNev(sor.user_id)}: ${naploKategoria(sor.regi_kategoria)} → ${naploKategoria(sor.uj_kategoria, true)} · ${naploIdo(sor.created_at)}`)));
    doboz.hidden = false;
}
