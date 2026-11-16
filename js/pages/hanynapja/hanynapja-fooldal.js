// Főoldal: a saját "Hány napja" számlálóid röviden a képek alatt (a részletek a hanynapja.html-en).
// Az Admin → Globális kapcsolók "Hány napja" kapcsolójával az oldallal együtt ez is kikapcsolható.
// Betöltéskor előbb az utoljára látott lista jelenik meg (js/segedek/adat-gyorsitotar.js), a friss a háttérben érkezik.
import { ready, getState, oldalEngedelyezett } from '../../hitelesites.js';
import { betolt } from '../../segedek/adat-gyorsitotar.js';
import { ut } from '../../segedek/utvonal.js';
import { napokOta, sablonNev } from './hanynapja-seged.js';
import { sajatSzamlalokLekerese } from './hanynapja-adat.js';

// Egy számláló csempéje: név, nagy szám, "napja"; rákattintva a Hány napja oldalra visz
function csempe(h) {
    const a = document.createElement('a');
    a.className = 'fo-hn-csempe';
    a.href = ut('oldalak/hanynapja.html');

    const nev = document.createElement('span');
    nev.className = 'fo-hn-nev';
    nev.textContent = (h.sablon && sablonNev(h.sablon)) || h.mit;

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

    await betolt('fooldal_hanynapja', () => sajatSzamlalokLekerese(group.id, user.id), kirajzol);
}

indit();