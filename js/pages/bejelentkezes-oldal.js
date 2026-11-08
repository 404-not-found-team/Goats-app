// Kezdőlap (kijelentkezett nézet). FELADAT8 3. pont: minimális JS, csak a munkamenet-ellenőrzés,
// az átirányítás és a Google-gombos bejelentkezés. A teljes alkalmazás (galéria, naptár, nav stb.)
// az app.html-en tölt be, ide nem.
import { ready, getState, signInWithGoogle } from '../hitelesites.js';

// Gyors, hálózat nélküli előzetes ellenőrzés: a supabase-js alapból a localStorage-ban tárolja a
// munkamenet-tokent ("sb-<projekt>-auth-token" néven). Ha ez megvan, szinte biztos, hogy a
// felhasználó be van jelentkezve, és nem kell megvárni a teljes `ready`-t (ami egy async
// getSession()-t is futtat) ahhoz, hogy átirányítsunk az app.html-re. Ha a token hiányzik (pl.
// kijelentkezve, vagy épp az OAuth-visszatérésnél, amikor a token még nincs eltéve), a lenti
// teljes `ready`-alapú ellenőrzés dönt.
function vanGyorsitotarazottMunkamenet() {
    try {
        return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    } catch {
        return false;
    }
}

const gyorsAtiranyitasFolyamatban = vanGyorsitotarazottMunkamenet();
if (gyorsAtiranyitasFolyamatban) {
    location.replace('app.html');
}

document.addEventListener('DOMContentLoaded', async () => {
    kezelPWATelepitest();

    if (gyorsAtiranyitasFolyamatban) return; // a fenti gyors ág már elindította az átirányítást

    await ready;
    const { user } = getState();
    if (user) {
        location.replace('app.html');
        return;
    }

    // Google bejelentkezés gomb
    const btn = document.getElementById('google-login-btn');
    const statusz = document.getElementById('login-status');
    const setStatus = (msg, hiba = false) => {
        if (!statusz) return;
        statusz.textContent = msg || '';
        statusz.className = hiba ? 'status-hiba' : 'status-info';
    };

    btn?.addEventListener('click', async () => {
        btn.disabled = true;
        setStatus(tr('redirect_google', 'Átirányítás a Google bejelentkezéshez...'));
        try {
            await signInWithGoogle(); // az oldal elnavigál, ha sikeres
        } catch (err) {
            setStatus(err.message || tr('err_login_start', 'Nem sikerült elindítani a bejelentkezést.'), true);
            btn.disabled = false;
        }
    });
});

// PWA telepítés: lapfüles útmutató (Android / iPhone / Számítógép). A felismert eszköz füle nyílik meg,
// és ha a böngésző felkínálja (beforeinstallprompt), megjelenik az egy koppintásos telepítés gomb.
// Androidon alul a Play Áruházas tesztelésre hívjuk fel a figyelmet (tesztelok.html).
let deferredPrompt;

function felismertPlatform() {
    const ua = navigator.userAgent || '';
    // az iPadOS 13+ asztali Safarinak adja ki magát, de érintőképernyős
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'gep';
}

function kezelPWATelepitest() {
    const installBtn = document.getElementById('pwa-install-btn');
    const installCard = document.getElementById('pwa-install-card');
    if (!installCard) return;

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        installCard.hidden = true;
        return;
    }

    const platform = felismertPlatform();
    const fulek = [...installCard.querySelectorAll('[role="tab"]')];
    const tesztelo = document.getElementById('telepito-tesztelo');

    const valaszt = (kod) => {
        fulek.forEach((ful) => {
            const aktiv = ful.dataset.platform === kod;
            ful.setAttribute('aria-selected', String(aktiv));
            ful.tabIndex = aktiv ? 0 : -1;
            const panel = document.getElementById(ful.getAttribute('aria-controls'));
            if (panel) panel.hidden = !aktiv;
        });
        if (tesztelo) tesztelo.hidden = kod !== 'android';
    };

    fulek.forEach((ful, i) => {
        ful.addEventListener('click', () => valaszt(ful.dataset.platform));
        // nyilakkal is lehessen lépni a fülek között
        ful.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const kov = fulek[(i + (e.key === 'ArrowRight' ? 1 : fulek.length - 1)) % fulek.length];
            kov.focus();
            valaszt(kov.dataset.platform);
        });
    });
    valaszt(platform);

    // a felismert eszköz címkéje a cím fölött
    const cimke = document.getElementById('telepito-cimke');
    const cimkeSzoveg = document.getElementById('telepito-cimke-szoveg');
    if (cimke && cimkeSzoveg && platform !== 'gep') {
        cimkeSzoveg.textContent = platform === 'ios'
            ? tr('inst_you_use_ios', 'iPhone-t használsz')
            : tr('inst_you_use_android', 'Androidot használsz');
        cimke.hidden = false;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.hidden = false;
    });

    installBtn?.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.hidden = true;
        if (outcome === 'accepted') installCard.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
        installCard.hidden = true;
        deferredPrompt = null;
    });
}
