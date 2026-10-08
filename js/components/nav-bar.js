import { ready, getState } from '../auth-service.js';
import { jeloles } from '../utils/perf.js';

document.addEventListener('DOMContentLoaded', async () => {
    const htmlNevek = ["index", "tartozasok", "ranglista", "tervek", "goatsgame"];
    const oldalNevek = ["Kezdőlap", "Tartozások", "Ranglista", "Tervek", "Goats Game"];
    const oldalEmojik = ["🏠", "💸", "🍹", "📋", "🎮"];

    // A 3 kiemelt oldal, ami mindig látszik az alsó sávban mobilon
    const FO_OLDALAK = ["index", "tartozasok", "ranglista"];
    const publicPages = ["index", "ranglista"];

    const navBar = document.getElementById("navBar");
    if (!navBar) return;

    // Megvárjuk a session + csoport betöltését (nincs külön lekérdezés, nincs villogás)
    await ready;
    const { user, group } = getState();

    // Csoport nélkül (kijelentkezve vagy még nincs csoport) csak a publikus oldalak
    let allowedPages = publicPages;
    if (group) {
        allowedPages = Array.isArray(group.enabled_pages) ? group.enabled_pages : htmlNevek;
    }

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

    for (let i = 0; i < htmlNevek.length; i++) {
        const pageKey = htmlNevek[i];
        // A "Kezdőlap" fül bejelentkezve az app.html-re visz (ott az alkalmazás), kijelentkezve
        // (vagy ha még nincs session) az index.html-re (a bejelentkezési oldalra).
        const celFajl = pageKey === 'index' ? (user ? 'app.html' : 'index.html') : `${pageKey}.html`;

        if (!allowedPages.includes(pageKey)) continue;

        const isMainTab = FO_OLDALAK.includes(pageKey);

        const oldal = document.createElement('li');
        const link = document.createElement('a');
        const teljesNev = document.createElement('span');
        const emojiNev = document.createElement('span');

        // Az "app.html" is a "Kezdőlap" fület jelöli aktívnak, nem csak az "index.html"
        const aktivE = aktualisUtvonal === celFajl || (pageKey === 'index' && aktualisUtvonal === 'app.html');
        if (aktivE) oldal.className = "active";

        teljesNev.textContent = oldalNevek[i];
        teljesNev.className = "teljes-szoveg";
        link.appendChild(teljesNev);

        emojiNev.textContent = oldalEmojik[i];
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