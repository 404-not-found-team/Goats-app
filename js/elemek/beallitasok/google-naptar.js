// A csoport eseményeinek szinkronja a Google Naptárba (be/ki kapcsoló a beállításokban).
// - Bekapcsoláskor egy sor kerül a naptar_szinkron táblába (csak a saját sorát látja és kezeli mindenki).
// - A többit a szerver végzi: egy adatbázis-trigger meghívja a supabase/functions/naptar-szinkron függvényt,
//   ami megosztja a csoport Google-naptárát a felhasználó (Google-fiókos) e-mail címével. A Google e-mailt küld,
//   abban egyszer hozzá kell adnia a naptárt; utána az események maguktól megjelennek és frissülnek.
// - Kikapcsoláskor a sor törlődik, a szerver visszavonja a megosztást.
// - Globálisan kapcsolható (admin oldal: funkcio_google_naptar). Kikapcsolva csak az látja a kapcsolót, akinél
//   már be van kapcsolva (hogy ki tudja kapcsolni); az új bekapcsolást a szerver is tiltja. A superadminra nem vonatkozik.
import { funkcioEngedelyezett } from '../../hitelesites.js';

const kliens = () => window._supabase || null;

export function initGoogleNaptar(state) {
    const szakasz = document.getElementById('gnaptar-szakasz');
    const gomb = document.getElementById('gnaptar-kapcsolo');
    const allapot = document.getElementById('gnaptar-allapot');
    if (!szakasz || !gomb) return;

    // bejelentkezve és csoportban van értelme (a csoport naptárát osztjuk meg)
    szakasz.hidden = !(state?.user && state?.group);
    if (szakasz.hidden) return;

    const uzenet = (szoveg = '', hiba = false) => {
        allapot.textContent = szoveg;
        allapot.classList.toggle('status-hiba', hiba);
    };
    const jelol = (be) => {
        gomb.setAttribute('aria-checked', String(be));
        gomb.querySelector('.ertesites-kapcsolo-szoveg').textContent = be ? tr('push_on', 'Bekapcsolva') : tr('push_off', 'Kikapcsolva');
    };

    const engedelyezett = funkcioEngedelyezett('funkcio_google_naptar');
    gomb.disabled = true;
    kliens()?.from('naptar_szinkron').select('user_id').eq('user_id', state.user.id).maybeSingle()
        .then(({ data, error }) => {
            if (error) console.error('Google Naptár állapot:', error.message);
            jelol(!!data);
            if (!engedelyezett && !data) szakasz.hidden = true;
        })
        .finally(() => { gomb.disabled = false; });

    gomb.addEventListener('click', async () => {
        const be = gomb.getAttribute('aria-checked') !== 'true';
        gomb.disabled = true;
        uzenet(tr('saving', 'Mentés...'));
        try {
            const c = kliens();
            const { error } = be
                ? await c.from('naptar_szinkron').insert({})
                : await c.from('naptar_szinkron').delete().eq('user_id', state.user.id);
            if (error) throw new Error(error.message);
            jelol(be);
            uzenet(be
                ? tr('gcal_enabled_msg', 'Pár percen belül kapsz egy e-mailt a Google-től. Nyisd meg, és add hozzá a naptárt – utána az események maguktól megjelennek a Google Naptáradban.')
                : tr('gcal_disabled_msg', 'Kikapcsolva. A csoport naptára hamarosan eltűnik a Google Naptáradból.'));
        } catch (err) {
            console.error('Google Naptár beállítási hiba:', err);
            uzenet(err.message || tr('err_save_retry', 'A mentés nem sikerült, próbáld újra.'), true);
        } finally {
            gomb.disabled = false;
        }
    });
}
