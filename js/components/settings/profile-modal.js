import { getState, signOut, deleteMyAccount } from '../../auth-service.js';
import { torolCsoportKepei } from '../../utils/csoport-kepek.js';

export function initProfileModal() {
  const get = id => document.getElementById(id);

  const profileModal = get('profile-modal');
  const groupDetailsModal = get('group-details-modal');
  const settingsModal = get('settings-modal');
  const authModal = get('auth-modal');

  const STATUS_OSZTALY = { '#ef4444': 'status-hiba', '#10b981': 'status-ok', '#3b82f6': 'status-info' };
  const setStatus = (msg, color = '') => {
    const s = get('profile-status');
    if (s) { s.textContent = msg || ''; s.className = STATUS_OSZTALY[color] || ''; }
  };

  function fill() {
    const s = getState();
    if (get('profile-display-name')) get('profile-display-name').textContent = s.displayName || 'Nincs név';
    if (get('profile-display-email')) get('profile-display-email').textContent = s.user?.email || '';

    // Csoportfüggő menüpontok
    const hasGroup = !!s.group;
    if (get('open-group-details-btn')) get('open-group-details-btn').hidden = !hasGroup;
    if (get('open-join-group-btn')) get('open-join-group-btn').hidden = hasGroup;
    setStatus('');
  }

  // Profil megnyitása
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#open-profile-modal-btn')) {
      fill();
      if (profileModal) profileModal.hidden = false;
    }
  });

  // Navigáció az al-ablakokba
  get('open-group-details-btn')?.addEventListener('click', () => {
    profileModal.hidden = true;
    groupDetailsModal.hidden = false;
  });
  get('open-join-group-btn')?.addEventListener('click', () => {
    profileModal.hidden = true;
    authModal.hidden = false;
  });
  get('open-settings-btn')?.addEventListener('click', () => {
    profileModal.hidden = true;
    settingsModal.hidden = false;
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
      // Utolsó tagként a csoport képei is törlődnek (a fiók törlése után már nincs jogunk)
      const { group, members } = getState();
      if (group && members.length === 1) {
        const hibak = await torolCsoportKepei(group.id, group.group_code);
        if (hibak.length) console.warn('Néhány kép nem törlődött a fiók törlésekor:', hibak);
      }
      await deleteMyAccount();
      alert('A fiókod törölve lett.');
      location.reload();
    } catch (err) {
      setStatus(err.message || 'A fiók törlése nem sikerült.', '#ef4444');
    }
  });
}