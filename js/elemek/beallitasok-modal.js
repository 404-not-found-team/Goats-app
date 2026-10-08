import { ready, getState } from '../hitelesites.js';
import { injectUserNavHTML } from './beallitasok/beallitasok-sablonok.js';
import { initAuthModal } from './beallitasok/belepes-modal.js';
import { initProfileModal } from './beallitasok/profil-modal.js';
import { initGroupDetails } from './beallitasok/csoport-adatok.js';
import { initThemePicker } from './beallitasok/tema-valaszto.js';
import { initDrinkModeration } from './beallitasok/ital-moderacio.js';
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
  initDrinkModeration();
  initTosUjraelfogadas();

  const get = id => document.getElementById(id);

  // A beállítások-rendszer "kezdőlapja" a Profil menü. Az almenükben (Profil adatok, Csoport
  // adatok, Beállítások/téma) az X / Esc / háttérre kattintás ide visz vissza, nem zárja be az
  // egészet. A kezdőlapon (és a Belépés/Csatlakozás ablakban, ami önálló belépési pont, nem
  // "almenü") ugyanez a gomb/Esc/háttér egyszerűen bezár, ahogy eddig.
  // A tos-ujraelfogadas-modal szándékosan kimarad: annak nincs bezáró útja, csak az "Elfogadom".
  const KEZDOLAP_MODAL = 'profile-modal';
  const ALMENU_HAZA = {
    'profil-details-modal': KEZDOLAP_MODAL,
    'group-details-modal': KEZDOLAP_MODAL,
    'settings-modal': KEZDOLAP_MODAL,
  };
  const ESC_HATTER_KIVETEL = new Set(['tos-ujraelfogadas-modal']);

  // X / Esc / háttér: almenüben haza visz, a kezdőlapon (és minden más önálló modalnál) bezár
  function zarjVagyHaza(modalId) {
    const m = get(modalId);
    if (!m || m.hidden) return;
    m.hidden = true;
    const haza = ALMENU_HAZA[modalId];
    const celModal = haza ? get(haza) : null;
    if (celModal) {
      celModal.hidden = false;
      fokuszAllit(celModal);
    }
  }

  const closeBtns = [
    { btn: 'close-auth-btn', modal: 'auth-modal' },
    { btn: 'close-profile-btn', modal: 'profile-modal' },
    { btn: 'close-profil-details-btn', modal: 'profil-details-modal' },
    { btn: 'close-group-details-btn', modal: 'group-details-modal' },
    { btn: 'close-settings-btn', modal: 'settings-modal' },
  ];
  closeBtns.forEach(({ btn, modal }) => {
    get(btn)?.addEventListener('click', () => zarjVagyHaza(modal));
  });

  // Esc: a jelenleg látható (nem kivételezett) sm-overlay modalra ugyanaz a szabály, mint az X-re
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const nyitott = [...document.querySelectorAll('.sm-overlay')]
      .find((m) => !m.hidden && !ESC_HATTER_KIVETEL.has(m.id));
    if (nyitott) zarjVagyHaza(nyitott.id);
  });

  // Háttérre kattintás: ugyanaz a szabály, mint az X-re (a kártyán belüli kattintás nem számít,
  // mert az eseményt a kártya gyermekei nem buborékoltatják el az overlay sima kattintásaként,
  // itt az e.target === overlay ellenőrzés zárja ki azt)
  document.querySelectorAll('.sm-overlay').forEach((overlay) => {
    if (ESC_HATTER_KIVETEL.has(overlay.id)) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) zarjVagyHaza(overlay.id);
    });
  });

  // Belépés ablak nyitása (a gombot több oldal is tartalmazhatja)
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#open-auth-modal-btn')) {
      get('auth-modal').hidden = false;
    }
  });

  // Bejelentkezett, de csoport nélküli felhasználó: egyszer / fül megkínáljuk a csatlakozást
  if (state.user && !state.group && !sessionStorage.getItem('goats_auth_prompted')) {
    sessionStorage.setItem('goats_auth_prompted', '1');
    get('auth-modal').hidden = false;
  }
});