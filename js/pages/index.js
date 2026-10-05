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
        if (kijelentkezettDiv) kijelentkezettDiv.style.display = 'none';
        if (bejelentkezettDiv) bejelentkezettDiv.style.display = 'grid';
        ellenorizVideokLathatosagat(group.group_code);
        return;
    }

    if (kijelentkezettDiv) kijelentkezettDiv.style.display = 'flex';
    if (bejelentkezettDiv) bejelentkezettDiv.style.display = 'none';

    // Be van lépve, de még nincs csoportja
    if (user && !group) {
        const authStatus = document.getElementById('auth-status');
        if (authStatus) {
            authStatus.textContent = 'Be vagy lépve! Csatlakozz egy meglévő csoporthoz vagy hozz létre egy újat.';
            authStatus.style.color = '#10b981';
        }
    }
}

function ellenorizVideokLathatosagat(groupCode) {
    const youtubeDoboz = document.getElementById('youtube-doboz');
    if (youtubeDoboz) {
        const lathato = !!groupCode && groupCode.toLowerCase() === 'duckies';
        youtubeDoboz.style.display = lathato ? 'flex' : 'none';
    }
}

let deferredPrompt;
function kezelPWATelepitest() {
    const installBtn = document.getElementById('pwa-install-btn');
    const installCard = document.getElementById('pwa-install-card');
    const iosNotice = document.getElementById('ios-notice');

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        if (installCard) installCard.style.display = 'none';
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        if (installBtn) installBtn.style.display = 'none';
        if (iosNotice) iosNotice.classList.remove('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.style.display = 'inline-flex';
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            if (outcome === 'accepted' && installCard) installCard.style.display = 'none';
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installCard) installCard.style.display = 'none';
        deferredPrompt = null;
    });
}