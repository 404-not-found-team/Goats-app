import { getState, signOut, deleteMyAccount } from '../../auth-service.js';

export function initProfileModal() {
  const get = id => document.getElementById(id);

  const profileModal = get('profile-modal');
  const groupDetailsModal = get('group-details-modal');
  const settingsModal = get('settings-modal');
  const authModal = get('auth-modal');

  const setStatus = (msg, color = '') => {
    const s = get('profile-status');
    if (s) { s.textContent = msg || ''; s.style.color = color; }
  };

  function fill() {
    const s = getState();
    if (get('profile-display-name')) get('profile-display-name').textContent = s.displayName || 'Nincs név';
    if (get('profile-display-email')) get('profile-display-email').textContent = s.user?.email || '';

    // Csoportfüggő menüpontok
    const hasGroup = !!s.group;
    if (get('open-group-details-btn')) get('open-group-details-btn').style.display = hasGroup ? '' : 'none';
    if (get('open-join-group-btn')) get('open-join-group-btn').style.display = hasGroup ? 'none' : '';
    setStatus('');
  }

  // Profil megnyitása
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#open-profile-modal-btn')) {
      fill();
      if (profileModal) profileModal.style.display = 'flex';
    }
  });

  // Navigáció az al-ablakokba
  get('open-group-details-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    groupDetailsModal.style.display = 'flex';
  });
  get('open-join-group-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    authModal.style.display = 'flex';
  });
  get('open-settings-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    settingsModal.style.display = 'flex';
  });
  // Kijelentkezés
  get('logout-btn')?.addEventListener('click', async () => {
    if (!confirm('Biztosan ki szeretnél jelentkezni?')) return;
    await signOut();
    location.reload();
  });

  // Fiók végleges törlése (Google Play követelmény: az appban is elérhető legyen)
  get('delete-account-btn')?.addEventListener('click', async () => {
    const warning =
      'A fiókod végleg törlődik (profil, csoporttagság). Ha te vagy a csoport utolsó tagja, a csoport és adatai is törlődnek.\n\n' +
      'A megerősítéshez írd be: TÖRLÉS';
    const answer = prompt(warning);
    if (answer === null) return;
    if (answer.trim().toUpperCase() !== 'TÖRLÉS') {
      return setStatus('A megerősítő szöveg nem egyezik, a fiók nem lett törölve.', '#ef4444');
    }

    setStatus('Fiók törlése...', '#3b82f6');
    try {
      await deleteMyAccount();
      alert('A fiókod törölve lett.');
      location.reload();
    } catch (err) {
      setStatus(err.message || 'A fiók törlése nem sikerült.', '#ef4444');
    }
  });
}