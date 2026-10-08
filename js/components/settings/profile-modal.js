import { getState, onChange, signOut, deleteMyAccount } from '../../auth-service.js';
import { torolCsoportKepei } from '../../utils/csoport-kepek.js';
import { updateMyDisplayName } from '../../admin.js';
import { debounce } from '../../utils/debounce.js';
import { fokuszAllit } from '../../utils/modal-fokusz.js';

export function initProfileModal() {
  const get = id => document.getElementById(id);

  const profileModal = get('profile-modal');
  const profilDetailsModal = get('profil-details-modal');
  const groupDetailsModal = get('group-details-modal');
  const settingsModal = get('settings-modal');
  const authModal = get('auth-modal');

  const STATUS_OSZTALY = { '#ef4444': 'status-hiba', '#10b981': 'status-ok', '#3b82f6': 'status-info' };
  const setStatus = (msg, color = '') => {
    const s = get('profile-details-status');
    if (s) { s.textContent = msg || ''; s.className = STATUS_OSZTALY[color] || ''; }
  };
  const setNameStatus = (msg, color = '') => {
    const s = get('own-name-status');
    if (s) { s.textContent = msg || ''; s.className = STATUS_OSZTALY[color] || ''; }
  };

  function fill() {
    const s = getState();
    if (get('profile-display-name')) get('profile-display-name').textContent = s.displayName || 'Nincs név';
    if (get('profile-display-email')) get('profile-display-email').value = s.user?.email || '';

    // A saját név mezőt csak akkor írjuk felül, ha épp nem gépelünk bele (pl. egy másik fülön módosult)
    const ownName = get('own-name-input');
    if (ownName && document.activeElement !== ownName) {
      ownName.value = s.displayName || '';
      utolsoMentettNev = s.displayName || '';
    }

    // Csoportfüggő menüpontok
    const hasGroup = !!s.group;
    if (get('open-group-details-btn')) get('open-group-details-btn').hidden = !hasGroup;
    if (get('open-join-group-btn')) get('open-join-group-btn').hidden = hasGroup;
  }

  onChange(fill);

  // Profil megnyitása
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#open-profile-modal-btn')) {
      fill();
      if (profileModal) { profileModal.hidden = false; fokuszAllit(profileModal); }
    }
  });

  // Navigáció az al-ablakokba
  get('open-profile-details-btn')?.addEventListener('click', () => {
    fill();
    setStatus('');
    setNameStatus('');
    zarjProfilMuveletek();
    profileModal.hidden = true;
    profilDetailsModal.hidden = false;
    fokuszAllit(profilDetailsModal);
  });
  get('open-group-details-btn')?.addEventListener('click', () => {
    profileModal.hidden = true;
    groupDetailsModal.hidden = false;
    fokuszAllit(groupDetailsModal);
  });
  get('open-join-group-btn')?.addEventListener('click', () => {
    profileModal.hidden = true;
    authModal.hidden = false;
    fokuszAllit(authModal);
  });
  get('open-settings-btn')?.addEventListener('click', () => {
    profileModal.hidden = true;
    settingsModal.hidden = false;
    fokuszAllit(settingsModal);
  });
  // Kijelentkezés
  get('logout-btn')?.addEventListener('click', async () => {
    if (!confirm('Biztosan ki szeretnél jelentkezni?')) return;
    await signOut();
    location.reload();
  });

  // Saját megjelenített név: automatikus mentés gépelés közben, nincs külön "Mentés" gomb
  let utolsoMentettNev = null;
  async function mentNevet() {
    const input = get('own-name-input');
    if (!input) return;
    const nev = input.value.trim();
    if (nev === utolsoMentettNev) return;
    if (nev.length < 1 || nev.length > 40) {
      return setNameStatus('A név 1–40 karakter legyen.', '#ef4444');
    }
    setNameStatus('Mentés...', '#3b82f6');
    const ok = await updateMyDisplayName(nev);
    if (ok) {
      utolsoMentettNev = nev;
      setNameStatus('Mentve ✓', '#10b981');
    } else {
      setNameStatus('A mentés nem sikerült.', '#ef4444');
    }
  }
  const mentNevetKesleltetve = debounce(mentNevet, 800);
  get('own-name-input')?.addEventListener('input', () => {
    setNameStatus('');
    mentNevetKesleltetve();
  });
  get('own-name-input')?.addEventListener('blur', () => mentNevetKesleltetve.flush());

  // Műveletek: lenyíló blokk (alapból csukva, mint a Csoport adatoknál)
  function zarjProfilMuveletek() {
    const tartalom = get('profil-muveletek-tartalom');
    const btn = get('toggle-profil-muveletek-btn');
    const nyil = get('profil-muveletek-nyil');
    if (tartalom) tartalom.hidden = true;
    btn?.setAttribute('aria-expanded', 'false');
    if (nyil) nyil.textContent = '›';
  }
  get('toggle-profil-muveletek-btn')?.addEventListener('click', () => {
    const tartalom = get('profil-muveletek-tartalom');
    const btn = get('toggle-profil-muveletek-btn');
    const nyil = get('profil-muveletek-nyil');
    if (!tartalom) return;
    const nyitva = tartalom.hidden; // most nyitjuk-e
    tartalom.hidden = !nyitva;
    btn?.setAttribute('aria-expanded', String(nyitva));
    if (nyil) nyil.textContent = nyitva ? '⌄' : '›';
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
