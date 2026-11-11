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
    const lathatoOldalak = OLDALAK.filter(o => o.navban !== false && lathato(o));
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