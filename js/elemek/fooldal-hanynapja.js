// Főoldal: a saját "Hány napja" számlálóid röviden a képek alatt (a részletek a hanynapja.html-en).
// Az Admin → Globális kapcsolók "Hány napja" kapcsolójával az oldallal együtt ez is kikapcsolható.
// Betöltéskor előbb az utoljára látott lista jelenik meg (js/segedek/adat-gyorsitotar.js), a friss a háttérben érkezik.
import { client } from '../supabase-client.js';
import { ready, getState, oldalEngedelyezett } from '../hitelesites.js';
import { betolt } from '../segedek/adat-gyorsitotar.js';
import { ut } from '../segedek/utvonal.js';

// Hány nap telt el az "utoljara" dátum (ÉÉÉÉ-HH-NN) óta, helyi idő szerint
function napokOta(datum) {
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((ma - new Date(`${datum}T00:00:00`)) / 86400000));
}

// Egy számláló csempéje: név, nagy szám, "napja"; rákattintva a Hány napja oldalra visz
function csempe(h) {
    const a = document.createElement('a');
    a.className = 'fo-hn-csempe';
    a.href = ut('oldalak/hanynapja.html');

    const nev = document.createElement('span');
    nev.className = 'fo-hn-nev';
    // sablonos számlálónál a sablon neve a választott nyelven (ha nincs fordítás, a magyar)
    const ny = window.goatsNyelv?.aktualis?.();
    const x = h.sablon;
    nev.textContent = (x && ((ny === 'en' ? x.nev_en : ny === 'de' ? x.nev_de : null) || x.nev)) || h.mit;

    const szam = document.createElement('span');
    szam.className = 'fo-hn-szam';
    szam.textContent = napokOta(h.utoljara);

    const egyseg = document.createElement('span');
    egyseg.className = 'fo-hn-egyseg';
    egyseg.textContent = tr('hn_days_unit', 'napja');

    a.append(nev, szam, egyseg);
    return a;
}

function kirajzol(sorok) {
    const szakasz = document.getElementById('fo-hn');
    const lista = document.getElementById('fo-hn-lista');
    if (!szakasz || !lista) return;

    if (sorok.length) {
        lista.replaceChildren(...sorok.map(csempe));
    } else {
        const ures = document.createElement('a');
        ures.className = 'fo-hn-ures';
        ures.href = ut('oldalak/hanynapja.html');
        ures.textContent = tr('hn_home_empty', 'Még nincs számlálód. Vegyél fel egyet!');
        lista.replaceChildren(ures);
    }
    szakasz.hidden = false;
}

async function indit() {
    await ready;
    const { user, group } = getState();
    // csoport nélkül, vagy ha az admin kikapcsolta a Hány napja oldalt (oldal_hanynapja), nem jelenik meg
    if (!user || !group || !oldalEngedelyezett('hanynapja')) return;

    await betolt('fooldal_hanynapja', async () => {
        const { data, error } = await client
            .from('hanynapja')
            .select('id, mit, utoljara, sablon:hanynapja_sablonok(nev, nev_en, nev_de)')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .order('letrehozva', { ascending: false })
            .limit(12);
        if (error) {
            console.error('A Hány napja számlálók betöltése nem sikerült:', error);
            return undefined;
        }
        return data || [];
    }, kirajzol);
}

indit();