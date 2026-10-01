import { betoltChangelog } from '../settings-modal.js';

export function initProfileModal() {
  const get = id => document.getElementById(id);

  const profileModal = get('profile-modal');
  const groupDetailsModal = get('group-details-modal');
  const settingsModal = get('settings-modal');
  const devModal = get('dev-modal');

  // Profil ablak megnyitásakor frissítjük a kijelzett nevet és az adatbázisból az e-mailt
  document.addEventListener('click', async (e) => {
    if (e.target && (e.target.id === 'open-profile-modal-btn' || e.target.closest('#open-profile-modal-btn'))) {
      const currentUser = localStorage.getItem('goats_current_user') || localStorage.getItem('goats_last_user');

      if (get('profile-display-name')) {
        get('profile-display-name').textContent = currentUser || 'Nincs kiválasztva név';
      }

      // Lekérjük a legfrissebb e-mailt a Supabase-ből és frissítjük a kijelzőt
      await frissitsProfilEmail();
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

  // Kijelentkezés
  get('logout-btn')?.addEventListener('click', () => {
    if (confirm('Biztosan ki szeretnél jelentkezni?')) {
      const lastUser = localStorage.getItem('goats_current_user') || localStorage.getItem('goats_last_user');
      const lastTheme = localStorage.getItem('goats_theme');
      const lastEmail = localStorage.getItem('goats_user_email');

      localStorage.clear();

      if (lastUser) localStorage.setItem('goats_last_user', lastUser);
      if (lastTheme) localStorage.setItem('goats_theme', lastTheme);
      if (lastEmail) localStorage.setItem('goats_user_email', lastEmail);

      setTimeout(() => location.reload(), 300);
    }
  });
}

export async function frissitsProfilEmail() {
  const code = localStorage.getItem('goats_group_code');
  if (!code) return;

  try {
    const client = typeof _supabase !== 'undefined' ? _supabase : (window._supabase || window.supabase);
    if (!client) return console.warn('Supabase client nem érhető el!');

    const { data, error } = await client
      .from('groups_code')
      .select('email')
      .ilike('group_code', code)
      .maybeSingle();

    if (error) {
      console.error('Hiba az e-mail lekérésekor (groups_code):', error);
      return;
    }

    if (data && data.email) {
      localStorage.setItem('goats_user_email', data.email);
      
      const profileElem = document.getElementById('profile-display-email');
      const groupElem = document.getElementById('group-email-display');

      if (profileElem) profileElem.textContent = data.email;
      if (groupElem) groupElem.textContent = data.email;
    }
  } catch (err) {
    console.error('Lekérdezési hiba:', err);
  }
}