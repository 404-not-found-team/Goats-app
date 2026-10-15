// Admin oldal: jóváhagyásra váró italjavaslatok (korábban a beállítások ablakában volt).
// Csak superadminnak: az admin.js a jogosultság-ellenőrzés után tölti be. A listát és a döntést a
// list_pending_drinks / approve_drink / reject_drink RPC adja, amelyek a szerveren is ellenőrzik a szerepkört.
// A részletek (kategória, kiszerelés, alkoholfok, recept) a public.italok / ital_osszetevok táblából jönnek.
import { client } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const K = () => window.italKategoriak;

function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

function allapot(szoveg, tipus) {
    const elem = $('adminJavaslatokAllapot');
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

function darab(db) {
    const jelveny = $('adminJavaslatokDb');
    jelveny.hidden = !db;
    jelveny.textContent = db ? String(db) : '';
}

// A javaslat részletei egy sorban: kategória · márka · kiszerelés · alkoholfok · recept
function reszletSzoveg(javaslat, ital, recept) {
    const fo = ital ? K().kategoria(ital.kategoria_id) : null;
    const reszek = [fo?.nev || javaslat.kategoria];
    reszek.push(javaslat.marka ? `márka: ${javaslat.marka}` : 'márka nélkül');
    if (ital?.kiszereles) reszek.push(K().kiszerelesNev(ital.kiszereles));
    if (fo?.alkoholos && ital?.alkohol_fok !== null && ital?.alkohol_fok !== undefined) reszek.push(`${ital.alkohol_fok}%`);
    if (recept?.length) {
        const egyseg = (h) => h.egyseg || (ital?.recept_mod === 'arany' ? 'rész' : '');
        reszek.push(`recept: ${recept.map(h => `${h.nev} ${h.mennyiseg ?? ''} ${egyseg(h)}`.replace(/\s+/g, ' ').trim()).join(', ')}`);
    }
    return reszek.filter(Boolean).join(' · ');
}

function sor(javaslat, ital, recept) {
    const li = ujElem('li', 'admin-sor admin-javaslat');
    const szoveg = ujElem('div', 'admin-sor-szoveg');
    const datum = javaslat.created_at ? new Date(javaslat.created_at).toLocaleDateString('hu-HU') : '';
    szoveg.append(
        ujElem('span', 'admin-sor-nev', javaslat.nev || '(névtelen)'),
        ujElem('span', 'admin-sor-leiras', reszletSzoveg(javaslat, ital, recept)),
        ujElem('span', 'admin-sor-leiras', `javasolta: ${javaslat.javasolta_nev || 'ismeretlen'}${datum ? ` · ${datum}` : ''}`)
    );

    const gombok = ujElem('div', 'admin-sor-gombok');
    const jovahagy = ujElem('button', 'admin-gomb', 'Jóváhagy');
    jovahagy.type = 'button';
    jovahagy.addEventListener('click', () => dontes('approve_drink', javaslat, `${javaslat.nev}: jóváhagyva, bekerült a katalógusba.`, gombok));
    const elutasit = ujElem('button', 'admin-gomb veszelyes', 'Elutasít');
    elutasit.type = 'button';
    elutasit.addEventListener('click', () => {
        if (!confirm(`Biztosan elutasítod és törlöd ezt az italt: „${javaslat.nev}”? Ez nem vonható vissza.`)) return;
        dontes('reject_drink', javaslat, `${javaslat.nev}: elutasítva, törölve.`, gombok);
    });
    gombok.append(jovahagy, elutasit);

    li.append(szoveg, gombok);
    return li;
}

async function dontes(rpc, javaslat, siker, gombok) {
    gombok.querySelectorAll('button').forEach(g => { g.disabled = true; });
    const { error } = await client.rpc(rpc, { drink_id: javaslat.id });
    if (error) {
        console.error(`${rpc} hiba:`, error);
        allapot(error.message || 'Hiba a művelet során.', 'hiba');
        gombok.querySelectorAll('button').forEach(g => { g.disabled = false; });
        return;
    }
    allapot(siker, 'ok');
    await betoltes();
}

async function betoltes() {
    const { data: javaslatok, error } = await client.rpc('list_pending_drinks');
    if (error) {
        console.error('A javaslatok betöltése nem sikerült:', error);
        allapot(error.message || 'A javaslatok betöltése nem sikerült.', 'hiba');
        return;
    }
    const lista = javaslatok || [];
    darab(lista.length);
    if (lista.length === 0) {
        $('adminJavaslatok').replaceChildren(ujElem('li', 'admin-sor admin-ures', 'Nincs jóváhagyásra váró ital.'));
        return;
    }

    // Részletek az új táblákból (a superadmin a jóvá nem hagyottakat is látja)
    const azonositok = lista.map(j => j.id);
    const [italRes, receptRes] = await Promise.all([
        client.from('italok').select('id, kategoria_id, alkohol_fok, kiszereles, recept_mod').in('id', azonositok),
        client.from('ital_osszetevok').select('ital_id, sorrend, nev, mennyiseg, egyseg').in('ital_id', azonositok).order('sorrend'),
    ]);
    if (italRes.error) console.error('A javaslatok részletei nem tölthetők be:', italRes.error);
    const italok = new Map((italRes.data || []).map(i => [i.id, i]));
    const receptek = new Map();
    (receptRes.data || []).forEach(o => {
        if (!receptek.has(o.ital_id)) receptek.set(o.ital_id, []);
        receptek.get(o.ital_id).push(o);
    });

    $('adminJavaslatok').replaceChildren(...lista.map(j => sor(j, italok.get(j.id), receptek.get(j.id))));
}

export async function indit() {
    try {
        if (!K().fo.length) await K().betolt(client);
    } catch (err) {
        console.error('Az italkategóriák betöltése nem sikerült:', err);
    }
    await betoltes();
}
