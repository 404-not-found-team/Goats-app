// Első megnyitáskor (bejelentkezve) egy kis ablak felajánlja az értesítések bekapcsolását.
// Az engedélykérő rendszerablakot csak az "Igen" gomb nyomására hívjuk meg: a böngészők (Safari, Firefox)
// csak felhasználói mozdulatra engedik, a Chrome pedig a kérés nélkül felugró ablakokat elnémítja.
// Eszközönként egyszer jelenik meg (localStorage: goats_ertesites_felajanlva); utána a beállításokban kapcsolható.
import { tamogatott, bekapcsol } from './beallitasok/ertesitesek.js';
import { fokuszAllit } from '../segedek/modal-fokusz.js';

const TAROLO = 'goats_ertesites_felajanlva';

const olvas = () => { try { return localStorage.getItem(TAROLO); } catch { return '1'; } };
const megjelol = () => { try { localStorage.setItem(TAROLO, '1'); } catch { /* nem kritikus */ } };

const SABLON = () => `
  <div id="ertesites-ajanlo" class="sm-overlay" role="dialog" aria-modal="true" aria-labelledby="ertesites-ajanlo-cim" hidden>
    <div class="sm-card ertesites-ajanlo-kartya">
      <div class="sm-header">
        <h3 id="ertesites-ajanlo-cim">${tr('push_offer_title', 'Kérsz értesítéseket?')}</h3>
      </div>
      <div class="sm-body">
        <p>${tr('push_offer_text', 'Szólunk, ha valaki tartozást ír fel neked, vagy új esemény kerül a naptárba. Bármikor kikapcsolhatod a beállításokban.')}</p>
        <p id="ertesites-ajanlo-allapot" class="sm-status sm-status-small" role="status" aria-live="polite"></p>
      </div>
      <div class="ertesites-ajanlo-gombok">
        <button id="ertesites-ajanlo-nem" type="button" class="sm-btn">${tr('not_now', 'Most nem')}</button>
        <button id="ertesites-ajanlo-igen" type="button" class="sm-btn sm-btn-save">${tr('yes_please', 'Igen, kérem')}</button>
      </div>
    </div>
  </div>
`;

export function ertesitesFelajanlas(state) {
    if (!state?.user || olvas()) return;
    if (!tamogatott() || Notification.permission !== 'default') return;

    document.body.insertAdjacentHTML('beforeend', SABLON());
    const ablak = document.getElementById('ertesites-ajanlo');
    const allapot = document.getElementById('ertesites-ajanlo-allapot');
    const igen = document.getElementById('ertesites-ajanlo-igen');
    const zar = () => { ablak.hidden = true; ablak.remove(); };

    // ne takarja el a felhasználási feltételek újraelfogadását, és hagyjunk időt az oldal kirajzolására
    setTimeout(() => {
        if (document.getElementById('tos-ujraelfogadas-modal')?.hidden === false) return;
        ablak.hidden = false;
        fokuszAllit(ablak);
        megjelol();
    }, 1500);

    document.getElementById('ertesites-ajanlo-nem').addEventListener('click', zar);
    igen.addEventListener('click', async () => {
        igen.disabled = true;
        allapot.classList.remove('status-hiba');
        allapot.textContent = tr('saving', 'Mentés...');
        try {
            await bekapcsol();
            zar();
        } catch (err) {
            console.error('Értesítés-bekapcsolási hiba:', err);
            allapot.textContent = err.message || tr('err_save_retry', 'A mentés nem sikerült, próbáld újra.');
            allapot.classList.add('status-hiba');
            igen.disabled = false;
        }
    });
}
