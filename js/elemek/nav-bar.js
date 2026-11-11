import { ready, getState, onChange, isSuperadmin, oldalEngedelyezett } from '../hitelesites.js';
import { jeloles } from '../segedek/teljesitmeny.js';
import { OLDALAK, ADMIN_OLDAL, MENUK } from '../segedek/oldalak.js';

// Az utoljára kirajzolt menü azonosítója: a háttérfrissítés (onChange) csak változáskor rajzol újra
let kirajzoltMenu = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById("navBar")) return;

    // Az állapot a helyben tárolt pillanatképből azonnal megvan (lásd hitelesites.js); a háttérben
    // érkező friss állapot (csoport, globális kapcsolók) változásakor újrarajzoljuk
    await ready;
    rajzol();
    onChange(rajzol);
});

function rajzol() {
    const navBar = document.getElementById("navBar");
    if (!navBar) return;
    const { user, group } = getState();

    // Egy oldal látszik, ha (superadmin) VAGY a globális kapcsolója be van kapcsolva. Csoport nélkül
    // (kijelentkezve vagy még nincs csoport) csak a publikus oldalak. Az Admin csak superadminnak.
    // (A groups.enabled_pages csoportonkénti listáját már nem nézzük: abba az új oldalak nem kerültek
    // bele maguktól, így a globálisan bekapcsolt új oldal sem jelent meg a csoportoknál.)
    const superadmin = isSuperadmin();
    const lathato = (o) => {
        if (superadmin) return true;
        if (!group) return !!o.publikus;
        return oldalEngedelyezett(o.kulcs);
    };
    // csakAndroid: csak androidos eszközön jelenik meg (pl. a Play Áruházas zárt teszt oldala)
    const android = /Android/i.test(navigator.userAgent);
    const lathatoOldalak = OLDALAK.filter(o => o.navban !== false && (!o.csakAndroid || android) && lathato(o));
    // az azonos "menu" kulcsú oldalak egy menüpontba kerülnek (az első látható tag helyén)
    const menuOldalak = [];
    for (const o of lathatoOldalak) {
        if (!o.menu) { menuOldalak.push(o); continue; }
        if (menuOldalak.some(m => m.kulcs === o.menu)) continue;
        const tagok = lathatoOldalak.filter(t => t.menu === o.menu);
        menuOldalak.push({ ...MENUK[o.menu], fajl: tagok[0].fajl, tagok });
    }
    if (superadmin) menuOldalak.push(ADMIN_OLDAL);

    const menuAzonosito = JSON.stringify([!!user, menuOldalak.map(o => [o.kulcs, (o.tagok || []).map(t => t.kulcs)])]);
    if (menuAzonosito === kirajzoltMenu) return;
    kirajzoltMenu = menuAzonosito;

    const aktualisUtvonal = window.location.pathname.split('/').pop() || "index.html";
    navBar.innerHTML = '';

    // Felnyíló fiók (More Drawer) mobilon
    let drawer = document.getElementById('nav-more-drawer');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'nav-more-drawer';
        drawer.className = 'nav-more-drawer';
        drawer.innerHTML = `
            <div class="drawer-header">
                <span>${tr('more_menu_items', 'További menüpontok')}</span>
                <span class="drawer-close">&times;</span>
            </div>
            <ul id="drawer-list" class="drawer-list"></ul>
        `;
        document.body.appendChild(drawer);
        drawer.querySelector('.drawer-close').addEventListener('click', () => window.toggleNavDrawer());

        const overlay = document.createElement('div');
        overlay.id = 'nav-drawer-overlay';
        overlay.className = 'nav-drawer-overlay';
        overlay.addEventListener('click', () => window.toggleNavDrawer());
        document.body.appendChild(overlay);
    }

    const drawerList = document.getElementById('drawer-list');
    if (drawerList) drawerList.innerHTML = '';

    let vanExtraOldal = false;

    for (const o of menuOldalak) {
        // A "Kezdőlap" fül bejelentkezve az app.html-re visz (ott az alkalmazás), kijelentkezve
        // (vagy ha még nincs session) az index.html-re (a bejelentkezési oldalra).
        const celFajl = o.kulcs === 'index' ? (user ? 'app.html' : 'index.html') : o.fajl;
        const isMainTab = !!o.fo;

        const oldal = document.createElement('li');
        const link = document.createElement('a');
        const teljesNev = document.createElement('span');
        const emojiNev = document.createElement('span');

        // Az "app.html" is a "Kezdőlap" fület jelöli aktívnak, nem csak az "index.html"
        const aktivE = aktualisUtvonal === celFajl || (o.kulcs === 'index' && aktualisUtvonal === 'app.html')
            || !!o.tagok?.some(t => t.fajl === aktualisUtvonal);
        if (aktivE) oldal.className = "active";

        teljesNev.textContent = o.nev;
        teljesNev.className = "teljes-szoveg";
        link.appendChild(teljesNev);

        emojiNev.textContent = o.emoji;
        emojiNev.className = "rovid-szoveg";
        link.appendChild(emojiNev);

        link.href = celFajl;
        oldal.appendChild(link);

        if (isMainTab) {
            navBar.appendChild(oldal);
        } else {
            // Másodlagos oldal: mobilon a fiókba, asztali nézetben a sávba
            vanExtraOldal = true;
            if (drawerList) drawerList.appendChild(oldal.cloneNode(true));
            oldal.classList.add('desktop-only-item');
            navBar.appendChild(oldal);
        }
    }

    oldalFulekKirajzolasa(menuOldalak, aktualisUtvonal);

    // oldalra húzás telefonon: az alsó sáv fő oldalai között (Kezdőlap, Tartozások, Ranglista)
    lapozhatoOldalak = menuOldalak.filter(o => o.fo).map(o => (o.kulcs === 'index' ? (user ? 'app.html' : 'index.html') : o.fajl));
    lapozasBekotese();

    // Mobilon a "Több ☰" gomb, ha van extra oldal
    if (vanExtraOldal) {
        const moreLi = document.createElement('li');
        moreLi.className = 'mobile-more-btn';
        moreLi.innerHTML = `
            <a href="#">
                <span class="rovid-szoveg">☰</span>
                <span class="teljes-szoveg">${tr('more', 'Több')}</span>
            </a>
        `;
        moreLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            window.toggleNavDrawer();
        });
        navBar.appendChild(moreLi);
    }
    jeloles('nav-kirajzolva');
}

window.toggleNavDrawer = function () {
    const drawer = document.getElementById('nav-more-drawer');
    const overlay = document.getElementById('nav-drawer-overlay');
    if (drawer && overlay) {
        const nyitva = drawer.classList.toggle('open');
        overlay.classList.toggle('open');
        document.body.classList.toggle('drawer-nyitva', nyitva);
    }
};

// Egy összevont menüpont oldalain (pl. Játékok: Szabályok / Tabella) a fejlécben a #oldal-fulek
// elem kapja meg a tagok linkjeit; csak a látható oldalak, és csak ha legalább kettő van
function oldalFulekKirajzolasa(menuOldalak, aktualisUtvonal) {
    const fulek = document.getElementById('oldal-fulek');
    if (!fulek) return;
    const tagok = menuOldalak.find(m => m.kulcs === fulek.dataset.menu)?.tagok || [];
    fulek.innerHTML = '';
    fulek.hidden = tagok.length < 2;
    tagok.forEach(t => {
        const link = document.createElement('a');
        link.className = 'oldal-ful';
        link.href = t.fajl;
        link.textContent = t.nev;
        if (t.fajl === aktualisUtvonal) link.setAttribute('aria-current', 'page');
        fulek.appendChild(link);
    });
}

// ---------- Lapozás oldalra húzással (telefonon, mint az Instán) ----------
// Balra húzva a következő, jobbra húzva az előző fő oldal nyílik meg. Nem lapoz, ha a húzás egy
// beviteli mezőn, a galérián, egy vízszintesen görgethető elemen indult, ha egy ablak vagy a fiók
// nyitva van, vagy ha a képernyő szélénél kezdődik (ott a telefon saját "vissza" mozdulata van).
let lapozhatoOldalak = [];
let lapozasBekotve = false;

const LAPOZAS_KIVETEL = 'input, textarea, select, [contenteditable="true"], .kepek, .ital-kartya, [data-nem-lapoz]';
const NYITOTT_ABLAK = '.sm-overlay:not([hidden]), #modal-hatter:not([hidden]), .nav-more-drawer.open, dialog[open]';

function vizszintesenGorgetheto(elem) {
    for (let e = elem; e && e !== document.body; e = e.parentElement) {
        if (e.scrollWidth > e.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)) return true;
    }
    return false;
}

function lapozasBekotese() {
    if (lapozasBekotve) return;
    lapozasBekotve = true;
    const telefon = window.matchMedia('(max-width: 600px)');
    let kezdet = null;

    document.addEventListener('touchstart', (e) => {
        kezdet = null;
        if (!telefon.matches || e.touches.length !== 1) return;
        const t = e.touches[0];
        if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
        if (e.target.closest?.(LAPOZAS_KIVETEL) || document.querySelector(NYITOTT_ABLAK)) return;
        if (vizszintesenGorgetheto(e.target)) return;
        kezdet = { x: t.clientX, y: t.clientY, ido: Date.now() };
    }, { passive: true });

    document.addEventListener('touchcancel', () => { kezdet = null; }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!kezdet) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - kezdet.x;
        const dy = t.clientY - kezdet.y;
        const ido = Date.now() - kezdet.ido;
        kezdet = null;
        if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || ido > 700) return;
        if (window.getSelection?.()?.toString()) return; // szöveget jelöltek ki

        const aktualis = window.location.pathname.split('/').pop() || 'index.html';
        const i = lapozhatoOldalak.indexOf(aktualis === 'index.html' && lapozhatoOldalak.includes('app.html') ? 'app.html' : aktualis);
        if (i === -1) return;
        const cel = lapozhatoOldalak[i + (dx < 0 ? 1 : -1)];
        if (!cel) return;
        lapozasFolyamatban = true;
        window.location.href = cel;
    }, { passive: true });
}

// Csak a húzással indított oldalváltásnál legyen áttűnés (lásd navbar.css @view-transition), minden más
// oldalváltásnál kihagyjuk; ezért a figyelő minden oldalon fut, nem csak ahol van menü
let lapozasFolyamatban = false;
window.addEventListener('pageswap', (e) => {
    if (!lapozasFolyamatban) e.viewTransition?.skipTransition();
    lapozasFolyamatban = false;
});