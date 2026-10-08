// Kezdőlap. Nem modul: a window.goatsAuth-ot használja (az auth-service.js állítja be).
document.addEventListener('DOMContentLoaded', async () => {
    await frissitsNezetet();
    kezelPWATelepitest();
});

async function frissitsNezetet() {
    const kijelentkezettDiv = document.getElementById('kijelentkezett-nezet');
    const bejelentkezettDiv = document.getElementById('bejelentkezett-nezet');

    if (!window.goatsAuth) return;
    await window.goatsAuth.ready;
    const { user, group } = window.goatsAuth.getState();

    if (user && group) {
        if (kijelentkezettDiv) kijelentkezettDiv.classList.add('hidden');
        if (bejelentkezettDiv) bejelentkezettDiv.classList.remove('hidden');
        return;
    }

    if (kijelentkezettDiv) kijelentkezettDiv.classList.remove('hidden');
    if (bejelentkezettDiv) bejelentkezettDiv.classList.add('hidden');

    // Be van lépve, de még nincs csoportja
    if (user && !group) {
        const authStatus = document.getElementById('auth-status');
        if (authStatus) {
            authStatus.textContent = 'Be vagy lépve! Csatlakozz egy meglévő csoporthoz vagy hozz létre egy újat.';
            authStatus.className = 'status-ok';
        }
    }
}

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