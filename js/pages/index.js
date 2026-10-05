document.addEventListener('DOMContentLoaded', async () => {
    await frissitsNezetet();
    kezelPWATelepitest();
});

async function frissitsNezetet() {
    const client = typeof _supabase !== 'undefined' ? _supabase : (window._supabase || window.supabase || window.supabaseClient);
    
    const kijelentkezettDiv = document.getElementById('kijelentkezett-nezet');
    const bejelentkezettDiv = document.getElementById('bejelentkezett-nezet');

    if (!client) return;

    // 1. Munkamenet lekérése
    const { data: { session } } = await client.auth.getSession();

    if (session && session.user) {
        // 2. Felhasználói profil és csoporttagság lekérése
        const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

        const { data: memberData } = await client
            .from('group_members')
            .select('group_id, group_role, groups(group_code, group_name, enabled_pages)')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (memberData && memberData.groups) {
            // Elmentjük a felületnek szükséges adatokat
            const group = memberData.groups;
            localStorage.setItem('goats_group_code', group.group_code);
            localStorage.setItem('goats_group_role', memberData.group_role); // 'group_admin' vagy 'member'
            if (profile) localStorage.setItem('goats_user_role', profile.system_role); // 'superadmin' vagy 'user'

            if (kijelentkezettDiv) kijelentkezettDiv.style.display = 'none';
            if (bejelentkezettDiv) bejelentkezettDiv.style.display = 'grid';

            ellenorizVideokLathatosagát(group.group_code);
        } else {
            // Be van lépve Google-lal, de még nincsen csoportja
            if (kijelentkezettDiv) kijelentkezettDiv.style.display = 'flex';
            if (bejelentkezettDiv) bejelentkezettDiv.style.display = 'none';

            const authStatus = document.getElementById('auth-status');
            if (authStatus) {
                authStatus.textContent = 'Be vagy lépve! Csatlakozz egy meglévő csoporthoz vagy hozz létre egy újat.';
                authStatus.style.color = '#10b981';
            }
        }
    } else {
        localStorage.clear();
        if (kijelentkezettDiv) kijelentkezettDiv.style.display = 'flex';
        if (bejelentkezettDiv) bejelentkezettDiv.style.display = 'none';
    }
}

function ellenorizVideokLathatosagát(groupCode) {
    const youtubeDoboz = document.getElementById('youtube-doboz');
    if (youtubeDoboz) {
        if (groupCode && groupCode.toLowerCase() === 'duckies') {
            youtubeDoboz.style.display = 'flex';
        } else {
            youtubeDoboz.style.display = 'none';
        }
    }
}

// PWA Kezelés
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