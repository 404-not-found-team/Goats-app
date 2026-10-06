import { ready, getState } from '../auth-service.js';
import { injectUserNavHTML } from './settings/settings-templates.js';
import { initAuthModal } from './settings/auth-modal.js';
import { initProfileModal } from './settings/profile-modal.js';
import { initGroupDetails } from './settings/group-details.js';
import { initThemePicker } from './settings/theme-picker.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Megvárjuk a session betöltését, hogy a felület már a valós állapotot mutassa
  await ready;
  const state = getState();

  injectUserNavHTML(state);

  initAuthModal();
  initProfileModal();
  initGroupDetails();
  initThemePicker();

  const get = id => document.getElementById(id);

  const closeBtns = [
    { btn: 'close-auth-btn', modal: 'auth-modal' },
    { btn: 'close-profile-btn', modal: 'profile-modal' },
    { btn: 'close-group-details-btn', modal: 'group-details-modal' },
    { btn: 'close-settings-btn', modal: 'settings-modal' },
  ];
  closeBtns.forEach(({ btn, modal }) => {
    get(btn)?.addEventListener('click', () => {
      const m = get(modal);
      if (m) m.style.display = 'none';
    });
  });

  // Belépés ablak nyitása (a gombot több oldal is tartalmazhatja)
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#open-auth-modal-btn')) {
      get('auth-modal').style.display = 'flex';
    }
  });

  // Bejelentkezett, de csoport nélküli felhasználó: egyszer / fül megkínáljuk a csatlakozást
  if (state.user && !state.group && !sessionStorage.getItem('goats_auth_prompted')) {
    sessionStorage.setItem('goats_auth_prompted', '1');
    get('auth-modal').style.display = 'flex';
  }
});