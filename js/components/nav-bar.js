document.addEventListener('DOMContentLoaded', async () => {
    const htmlNevek = ["index", "tartozasok", "ranglista", "tervek", "goatsgame"];
    const oldalNevek = ["Kezdőlap", "Tartozások", "Ranglista", "Tervek", "Goats Game"];
    const oldalEmojik = ["🏠", "💸", "🍹", "📋", "🎮"];

    // A 3 kiemelt oldal, ami mindig látszik az alsó sávban mobilon
    const FO_OLDALAK = ["index", "tartozasok", "ranglista"];

    const publicPages = ["index", "ranglista"];

    const groupCode = localStorage.getItem('goats_group_code');
    const isLogged = !!groupCode;
    const navBar = document.getElementById("navBar");

    if (!navBar) return;

    let allowedPages = publicPages;

    if (isLogged) {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        const { data } = await client
            .from('groups')
            .select('enabled_pages')
            .eq('group_code', groupCode)
            .maybeSingle();

        if (data && data.enabled_pages) {
            allowedPages = data.enabled_pages;
        } else {
            allowedPages = htmlNevek; 
        }
    }

    const aktualisUtvonal = window.location.pathname.split('/').pop() || "index.html";
    navBar.innerHTML = '';

    // Létrehozzuk a felnyíló fiókot (More Drawer) mobilon a háttérben
    let drawer = document.getElementById('nav-more-drawer');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'nav-more-drawer';
        drawer.className = 'nav-more-drawer';
        drawer.innerHTML = `
            <div class="drawer-header">
                <span>További menüpontok</span>
                <span class="drawer-close" onclick="toggleNavDrawer()">&times;</span>
            </div>
            <ul id="drawer-list" class="drawer-list"></ul>
        `;
        document.body.appendChild(drawer);

        // Háttér homályosító overlay
        const overlay = document.createElement('div');
        overlay.id = 'nav-drawer-overlay';
        overlay.className = 'nav-drawer-overlay';
        overlay.onclick = toggleNavDrawer;
        document.body.appendChild(overlay);
    }

    const drawerList = document.getElementById('drawer-list');
    if (drawerList) drawerList.innerHTML = '';

    let vanExtraOldal = false;

    for (let i = 0; i < htmlNevek.length; i++) {
        const pageKey = htmlNevek[i];
        const celFajl = `${pageKey}.html`;

        if (!allowedPages.includes(pageKey)) {
            continue;
        }

        const isMainTab = FO_OLDALAK.includes(pageKey);

        const oldal = document.createElement('li');
        const link = document.createElement('a');
        const teljesNev = document.createElement('span');
        const emojiNev = document.createElement('span');

        if (aktualisUtvonal === celFajl) {
            oldal.className = "active";
        }

        teljesNev.textContent = `${oldalNevek[i]}`;
        teljesNev.className = "teljes-szoveg";
        link.appendChild(teljesNev);

        emojiNev.textContent = `${oldalEmojik[i]}`;
        emojiNev.className = "rovid-szoveg";
        link.appendChild(emojiNev);

        link.href = celFajl;
        oldal.appendChild(link);

        // Asztali nézetben vagy ha fő oldal -> bemegy a navBar-ba
        if (isMainTab) {
            navBar.appendChild(oldal);
        } else {
            // Ha másodlagos oldal -> bemegy a mobil fiókba (és asztali nézetben is a navBarba)
            vanExtraOldal = true;
            if (drawerList) drawerList.appendChild(oldal.cloneNode(true));
            
            // Asztali nézethez is hozzáadjuk a sima navBar-hoz:
            oldal.classList.add('desktop-only-item');
            navBar.appendChild(oldal);
        }
    }

    // Mobilon hozzáadjuk a "Több ☰" gombot, ha van extra oldal
    if (vanExtraOldal) {
        const moreLi = document.createElement('li');
        moreLi.className = 'mobile-more-btn';
        moreLi.innerHTML = `
            <a href="#" onclick="toggleNavDrawer(); return false;">
                <span class="rovid-szoveg">☰</span>
                <span class="teljes-szoveg">Több</span>
            </a>
        `;
        navBar.appendChild(moreLi);
    }
});

// A nav-bar.js fájl aljára vagy a függvény definiálásához írd be:
window.toggleNavDrawer = function() {
    const drawer = document.getElementById('nav-more-drawer');
    const overlay = document.getElementById('nav-drawer-overlay');
    if (drawer && overlay) {
        const nyitva = drawer.classList.toggle('open');
        overlay.classList.toggle('open');
        
        // Elrejtjük/megjelenítjük a settings gombot a body osztályán keresztül
        if (nyitva) {
            document.body.classList.add('drawer-nyitva');
        } else {
            document.body.classList.remove('drawer-nyitva');
        }
    }
};