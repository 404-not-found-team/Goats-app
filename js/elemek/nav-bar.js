import { ready, getState, isSuperadmin, oldalEngedelyezett } from '../hitelesites.js';
import { jeloles } from '../segedek/teljesitmeny.js';
import { OLDALAK, ADMIN_OLDAL } from '../segedek/oldalak.js';

document.addEventListener('DOMContentLoaded', async () => {
    const navBar = document.getElementById("navBar");
    if (!navBar) return;

    // Megvárjuk a session + csoport betöltését (nincs külön lekérdezés, nincs villogás)
    await ready;
    const { user, group } = getState();

    // Egy oldal látszik, ha (superadmin) VAGY (a csoport enabled_pages-ében benne van ÉS a globális
    // kapcsolója be van kapcsolva). Csoport nélkül (kijelentkezve vagy még nincs csoport) csak a
    // publikus oldalak. Az Admin csak superadminnak, a csoporttól és a kapcsolóktól függetlenül.
    const superadmin = isSuperadmin();
    const csoportOldalai = group && Array.isArray(group.enabled_pages) ? group.enabled_pages : null;
    const lathato = (o) => {
        if (superadmin) return true;
        if (!group) return !!o.publikus;
        if (csoportOldalai && !csoportOldalai.includes(o.kulcs)) return false;
        return oldalEngedelyezett(o.kulcs);
    };
    const menuOldalak = OLDALAK.filter(lathato);
    if (superadmin) menuOldalak.push(ADMIN_OLDAL);

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
                <span>További menüpontok</span>
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
        const aktivE = aktualisUtvonal === celFajl || (o.kulcs === 'index' && aktualisUtvonal === 'app.html');
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

    // Mobilon a "Több ☰" gomb, ha van extra oldal
    if (vanExtraOldal) {
        const moreLi = document.createElement('li');
        moreLi.className = 'mobile-more-btn';
        moreLi.innerHTML = `
            <a href="#">
                <span class="rovid-szoveg">☰</span>
                <span class="teljes-szoveg">Több</span>
            </a>
        `;
        moreLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            window.toggleNavDrawer();
        });
        navBar.appendChild(moreLi);
    }
    jeloles('nav-kirajzolva');
});

window.toggleNavDrawer = function () {
    const drawer = document.getElementById('nav-more-drawer');
    const overlay = document.getElementById('nav-drawer-overlay');
    if (drawer && overlay) {
        const nyitva = drawer.classList.toggle('open');
        overlay.classList.toggle('open');
        document.body.classList.toggle('drawer-nyitva', nyitva);
    }
};