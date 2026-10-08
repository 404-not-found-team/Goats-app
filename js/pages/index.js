// Kezdőlap (kijelentkezett nézet). FELADAT8 3. pont: minimális JS, csak a munkamenet-ellenőrzés,
// az átirányítás és a Google-gombos bejelentkezés. A teljes alkalmazás (galéria, naptár, nav stb.)
// az app.html-en tölt be, ide nem.
import { ready, getState, signInWithGoogle } from '../auth-service.js';

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
        setStatus('Átirányítás a Google bejelentkezéshez...');
        try {
            await signInWithGoogle(); // az oldal elnavigál, ha sikeres
        } catch (err) {
            setStatus(err.message || 'Nem sikerült elindítani a bejelentkezést.', true);
            btn.disabled = false;
        }
    });
});

// PWA telepítés felkínálása (változatlan logika, a korábbi index.js-ből áthozva)
let deferredPrompt;
function kezelPWATelepitest() {
    const installBtn = document.getElementById('pwa-install-btn');
    const installCard = document.getElementById('pwa-install-card');
    const iosNotice = document.getElementById('ios-notice');

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        if (installCard) installCard.hidden = true;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        if (installBtn) installBtn.hidden = true;
        if (iosNotice) iosNotice.classList.remove('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.hidden = false;
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            if (outcome === 'accepted' && installCard) installCard.hidden = true;
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installCard) installCard.hidden = true;
        deferredPrompt = null;
    });
}
