// Push-értesítések be- és kikapcsolása a beállításokban (eszközönként).
// - Bekapcsoláskor engedélyt kér, feliratkozik a böngésző push-szolgáltatására (VAPID), és a feliratkozást
//   a push_feliratkozas_mentese() RPC-vel elmenti a bejelentkezett felhasználóhoz.
// - Kikapcsoláskor leiratkozik, és a push_leiratkozas() RPC törli a sort.
// - Az értesítéseket a supabase/functions/push-kuldes küldi (adatbázis-triggerek hívják), a megjelenítést
//   a sw.js "push" és "notificationclick" eseménykezelője végzi.
// A VAPID-kulcspár nyilvános fele; a titkos fele csak az Edge Function titkos beállításai között van.
export const VAPID_NYILVANOS = 'BFGVX3bnT-_HbdPPQP1gkb3NKE3ghGKGQYM_RzZP0Axpkxh2jqrK7serklLTUS9FLpD7mu9NO9r7Ia9KH7tST_c';

const kliens = () => window._supabase || null;

export const tamogatott = () =>
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// iPhone/iPad: a push csak a kezdőképernyőre tett (telepített) appban érhető el
const iosBongeszoben = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

function base64UrlBajtok(szoveg) {
    const kiegeszitett = (szoveg + '='.repeat((4 - (szoveg.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(kiegeszitett), c => c.charCodeAt(0));
}

async function regisztracio() {
    return navigator.serviceWorker.ready;
}

async function aktualisFeliratkozas() {
    if (!tamogatott()) return null;
    const reg = await regisztracio();
    return reg.pushManager.getSubscription();
}

export async function bekapcsol() {
    const engedely = await Notification.requestPermission();
    if (engedely !== 'granted') throw new Error(tr('push_denied', 'Az értesítések le vannak tiltva. A böngésző vagy a telefon beállításaiban engedélyezheted őket.'));
    const reg = await regisztracio();
    const feliratkozas = await reg.pushManager.getSubscription()
        || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlBajtok(VAPID_NYILVANOS) });
    const { endpoint, keys } = feliratkozas.toJSON();
    const { error } = await kliens().rpc('push_feliratkozas_mentese', {
        endpoint_in: endpoint,
        p256dh_in: keys.p256dh,
        auth_in: keys.auth,
        nyelv_in: window.goatsNyelv?.aktualis() || 'hu',
    });
    if (error) throw new Error(error.message);
}

// Kijelentkezéskor is ezt hívjuk: az eszköz ne kapja tovább az előző felhasználó értesítéseit
export async function leiratkozas() {
    const feliratkozas = await aktualisFeliratkozas().catch(() => null);
    if (!feliratkozas) return;
    const endpoint = feliratkozas.endpoint;
    await feliratkozas.unsubscribe().catch(() => { /* a sort ettől még töröljük */ });
    const c = kliens();
    if (c) {
        const { error } = await c.rpc('push_leiratkozas', { endpoint_in: endpoint });
        if (error) console.error('Hiba a leiratkozáskor:', error.message);
    }
}

export function initErtesitesek(state) {
    const szakasz = document.getElementById('ertesites-szakasz');
    const gomb = document.getElementById('ertesites-kapcsolo');
    const allapot = document.getElementById('ertesites-allapot');
    if (!szakasz || !gomb) return;

    // csak bejelentkezve van értelme (a feliratkozás a felhasználóhoz tartozik)
    szakasz.hidden = !state?.user;
    if (!state?.user) return;

    const uzenet = (szoveg = '', hiba = false) => {
        allapot.textContent = szoveg;
        allapot.classList.toggle('status-hiba', hiba);
    };
    const jelol = (be) => {
        gomb.setAttribute('aria-checked', String(be));
        gomb.querySelector('.ertesites-kapcsolo-szoveg').textContent = be ? tr('push_on', 'Bekapcsolva') : tr('push_off', 'Kikapcsolva');
    };

    if (!tamogatott()) {
        gomb.disabled = true;
        jelol(false);
        uzenet(iosBongeszoben()
            ? tr('push_ios_hint', 'iPhone-on az értesítésekhez előbb tedd ki az appot a kezdőképernyőre (Megosztás → Hozzáadás a kezdőképernyőhöz).')
            : tr('push_unsupported', 'Ez a böngésző nem támogatja az értesítéseket.'));
        return;
    }

    aktualisFeliratkozas().then(f => jelol(!!f && Notification.permission === 'granted')).catch(() => jelol(false));

    gomb.addEventListener('click', async () => {
        const be = gomb.getAttribute('aria-checked') !== 'true';
        gomb.disabled = true;
        uzenet(tr('saving', 'Mentés...'));
        try {
            if (be) await bekapcsol(); else await leiratkozas();
            jelol(be);
            uzenet(be ? tr('push_enabled_msg', 'Ezen az eszközön mostantól kapsz értesítéseket.') : '');
        } catch (err) {
            console.error('Értesítés-beállítási hiba:', err);
            uzenet(err.message || tr('err_save_retry', 'A mentés nem sikerült, próbáld újra.'), true);
        } finally {
            gomb.disabled = false;
        }
    });
}
