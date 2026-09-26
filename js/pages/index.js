document.addEventListener('DOMContentLoaded', () => {
    frissitsNezetet();
    ellenorizVideokLathatosagát();
    kezelPWATelepitest();
});

function frissitsNezetet() {
    const isLogged = !!localStorage.getItem('goats_group_code');

    const kijelentkezettDiv = document.getElementById('kijelentkezett-nezet');
    const bejelentkezettDiv = document.getElementById('bejelentkezett-nezet');

    if (isLogged) {
        if (kijelentkezettDiv) {
            kijelentkezettDiv.classList.add('hidden');
            kijelentkezettDiv.style.display = 'none';
        }
        if (bejelentkezettDiv) {
            bejelentkezettDiv.classList.remove('hidden');
            bejelentkezettDiv.style.display = 'grid';
        }
    } else {
        if (kijelentkezettDiv) {
            kijelentkezettDiv.classList.remove('hidden');
            kijelentkezettDiv.style.display = 'flex';
        }
        if (bejelentkezettDiv) {
            bejelentkezettDiv.classList.add('hidden');
            bejelentkezettDiv.style.display = 'none';
        }
    }
}

function ellenorizVideokLathatosagát() {
    const groupCode = localStorage.getItem('goats_group_code');
    const youtubeDoboz = document.getElementById('youtube-doboz');

    if (youtubeDoboz) {
        // Csak akkor jelenik meg, ha a csoportkód pontosan 'duckies'
        if (groupCode && groupCode.toLowerCase() === 'duckies') {
            youtubeDoboz.style.display = 'flex';
        } else {
            youtubeDoboz.style.display = 'none';
        }
    }
}

// PWA Telepítési logika
let deferredPrompt;

function kezelPWATelepitest() {
    const installBtn = document.getElementById('pwa-install-btn');
    const installCard = document.getElementById('pwa-install-card');
    const iosNotice = document.getElementById('ios-notice');

    // 1. Ha már appként van megnyitva (standalone mód), elrejtjük a kártyát
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        if (installCard) installCard.style.display = 'none';
    }

    // 2. iOS felismerés
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        if (installBtn) installBtn.style.display = 'none';
        if (iosNotice) iosNotice.classList.remove('hidden');
    }

    // 3. Android / Chrome prompt elkapása
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        if (installBtn) {
            installBtn.style.display = 'inline-flex';
        }
    });

    // 4. Kattintás a Telepítés gombra
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            deferredPrompt.prompt();

            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Telepítési döntés: ${outcome}`);

            deferredPrompt = null;
            if (outcome === 'accepted' && installCard) {
                installCard.style.display = 'none';
            }
        });
    }

    // 5. Ha sikeresen telepítette
    window.addEventListener('appinstalled', () => {
        if (installCard) installCard.style.display = 'none';
        deferredPrompt = null;
    });
}