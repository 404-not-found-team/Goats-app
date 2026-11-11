import { ready, getState } from '../hitelesites.js';
import { injectUserNavHTML } from './beallitasok/beallitasok-sablonok.js';
import { initAuthModal } from './beallitasok/belepes-modal.js';
import { initProfileModal, profilMenuNyitas } from './beallitasok/profil-modal.js';
import { initGroupDetails } from './beallitasok/csoport-adatok.js';
import { initThemePicker } from './beallitasok/tema-valaszto.js';
import { initLangPicker } from './beallitasok/nyelv-valaszto.js';
import { initErtesitesek } from './beallitasok/ertesitesek.js';
import { initGoogleNaptar } from './beallitasok/google-naptar.js';
import { ertesitesFelajanlas } from './ertesites-felajanlas.js';
import { initTosUjraelfogadas } from './beallitasok/tos-ujraelfogadas.js';
import { fokuszAllit } from '../segedek/modal-fokusz.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Megvárjuk a session betöltését, hogy a felület már a valós állapotot mutassa
  await ready;
  const state = getState();

  injectUserNavHTML(state);

  initAuthModal();
  initProfileModal();
  initGroupDetails();
  initThemePicker();
  initLangPicker();
  initErtesitesek(state);
  initGoogleNaptar(state);
  ertesitesFelajanlas(state);
  initTosUjraelfogadas();

  const get = id => document.getElementById(id);

  // A beállítások-rendszer "kezdőlapja" a Profil menü (lenyíló menü a profilgomb alatt). Az almenük
  // (Profil adatok, Csoport adatok, Beállítások) fejlécében a ‹ gomb ide visz vissza; az X, az Esc és a
  // háttérre kattintás mindenhol bezár. A tos-ujraelfogadas-modal szándékosan kimarad: annak nincs
  // bezáró útja, csak az "Elfogadom".
  const ESC_HATTER_KIVETEL = new Set(['tos-ujraelfogadas-modal']);

  function bezar(modalId) {
    const m = get(modalId);
    if (!m || m.hidden) return;
    m.hidden = true;
  }

  document.addEventListener('click', (e) => {
    const vissza = e.target.closest?.('[data-vissza-profil]');
    if (!vissza) return;
    const ablak = vissza.closest('.sm-overlay');
    if (ablak) ablak.hidden = true;
    profilMenuNyitas();
  });

  const closeBtns = [
    { btn: 'close-auth-btn', modal: 'auth-modal' },
    { btn: 'close-profile-btn', modal: 'profile-modal' },
    { btn: 'close-profil-details-btn', modal: 'profil-details-modal' },
    { btn: 'close-group-details-btn', modal: 'group-details-modal' },
    { btn: 'close-settings-btn', modal: 'settings-modal' },
  ];
  closeBtns.forEach(({ btn, modal }) => {
    get(btn)?.addEventListener('click', () => bezar(modal));
  });

  // Esc: a jelenleg látható (nem kivételezett) sm-overlay modalra ugyanaz a szabály, mint az X-re
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const nyitott = [...document.querySelectorAll('.sm-overlay')]
      .find((m) => !m.hidden && !ESC_HATTER_KIVETEL.has(m.id));
    if (nyitott) bezar(nyitott.id);
  });

  // Háttérre kattintás: ugyanaz a szabály, mint az X-re (a kártyán belüli kattintás nem számít,
  // mert az eseményt a kártya gyermekei nem buborékoltatják el az overlay sima kattintásaként,
  // itt az e.target === overlay ellenőrzés zárja ki azt)
  document.querySelectorAll('.sm-overlay').forEach((overlay) => {
    if (ESC_HATTER_KIVETEL.has(overlay.id)) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) bezar(overlay.id);
    });
  });

  // Belépés ablak nyitása (a gombot több oldal is tartalmazhatja)
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#open-auth-modal-btn')) {
      get('auth-modal').hidden = false;
    }
  });

  // Bejelentkezett, de csoport nélküli felhasználó: egyszer / fül megkínáljuk a csatlakozást.
  // allapotHiba esetén a group=null NEM megbízható (lehet, hogy csak a lekérdezés hibázott),
  // ilyenkor nem ugratjuk fel a modalt - inkább a háttérben sikeres frissítésre bízzuk.
  if (state.user && !state.group && !state.allapotHiba && !sessionStorage.getItem('goats_auth_prompted')) {
    sessionStorage.setItem('goats_auth_prompted', '1');
    get('auth-modal').hidden = false;
  }
});