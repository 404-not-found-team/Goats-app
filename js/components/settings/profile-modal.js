import { betoltChangelog } from '../settings-modal.js';

export function initProfileModal() {
  const get = id => document.getElementById(id);

  const profileModal = get('profile-modal');
  const groupDetailsModal = get('group-details-modal');
  const settingsModal = get('settings-modal');
  const devModal = get('dev-modal');

  // Profil ablak megnyitásakor frissítjük a kijelzett nevet és e-mailt
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'open-profile-modal-btn' || e.target.closest('#open-profile-modal-btn'))) {
      const currentUser = localStorage.getItem('goats_current_user') || localStorage.getItem('goats_last_user');
      const savedEmail = localStorage.getItem('goats_user_email') || 'nincs_email@goats.app';

      if (get('profile-display-name')) {
        get('profile-display-name').textContent = currentUser || 'Nincs kiválasztva név';
      }
      if (get('profile-display-email')) {
        get('profile-display-email').textContent = savedEmail;
      }
    }
  });

  // Navigáció az al-modalokba
  get('open-group-details-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    groupDetailsModal.style.display = 'flex';
  });

  get('open-settings-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    settingsModal.style.display = 'flex';
  });

  get('open-dev-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    devModal.style.display = 'flex';
    if (typeof betoltChangelog === 'function') betoltChangelog();
  });

  // Kijelentkezés: Megőrizzük a nevet, az e-mailt és a témát
  get('logout-btn')?.addEventListener('click', () => {
    if (confirm('Biztosan ki szeretnél jelentkezni?')) {
      const lastUser = localStorage.getItem('goats_current_user') || localStorage.getItem('goats_last_user');
      const lastTheme = localStorage.getItem('goats_theme');
      const lastEmail = localStorage.getItem('goats_user_email');

      localStorage.clear();

      if (lastUser) {
        localStorage.setItem('goats_last_user', lastUser);
      }
      if (lastTheme) {
        localStorage.setItem('goats_theme', lastTheme);
      }
      if (lastEmail) {
        localStorage.setItem('goats_user_email', lastEmail);
      }

      setTimeout(() => location.reload(), 300);
    }
  });
}