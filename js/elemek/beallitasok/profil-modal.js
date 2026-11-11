import { getState, onChange, signOut, deleteMyAccount, callRpc } from '../../hitelesites.js';
import { torolCsoportKepei } from '../../segedek/csoport-kepek.js';
import { updateMyDisplayName } from '../../admin-muveletek.js';
import { debounce } from '../../segedek/keslelteto.js';
import { fokuszAllit } from '../../segedek/modal-fokusz.js';
import { leiratkozas } from './ertesitesek.js';

// A profil menü a profilgomb alatt nyílik le (gépen az oldalsáv profilkártyája, telefonon a jobb felső
// kör): a helyét a gomb képernyőn lévő helyéből számoljuk (CSS változók, lásd modals.css .profil-lenyilo).
// A Beállítások / Profil adatok / Csoport adatok ‹ gombja is ezzel nyitja vissza (beallitasok-modal.js).
export function profilMenuNyitas() {
  const modal = document.getElementById('profile-modal');
  const gomb = document.getElementById('open-profile-modal-btn');
  if (!modal) return;
  if (gomb) {
    const r = gomb.getBoundingClientRect();
    modal.style.setProperty('--profil-felul', `${Math.round(r.bottom + 8)}px`);
    modal.style.setProperty('--profil-jobbra', `${Math.max(8, Math.round(window.innerWidth - r.right))}px`);
    modal.style.setProperty('--profil-szeles', `${Math.round(Math.max(r.width, 260))}px`);
  }
  // az oldalsávos (asztali) profilkártya már mutatja a nevet: ott a menü fejléce rejtve
  modal.dataset.oldalsav = gomb?.closest('.sav-profil') && gomb.offsetWidth > 100 ? 'igen' : '';
  modal.hidden = false;
  fokuszAllit(modal);
}

export function initProfileModal() {
  const get = id => document.getElementById(id);

  const profileModal = get('profile-modal');
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
    if (s) { s.textContent = msg || ''; s.className = `beall-mezo-allapot ${STATUS_OSZTALY[color] || ''}`; }
  };

  function fill() {
    const s = getState();
    if (get('profile-display-name')) get('profile-display-name').textContent = s.displayName || tr('no_name', 'Nincs név');
    if (get('profile-display-email')) get('profile-display-email').textContent = s.user?.email || '';
    if (get('profile-group-name')) get('profile-group-name').textContent = s.group?.group_name || '';

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
      profilMenuNyitas();
    }
  });

  // Navigáció az al-ablakokba
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
  // A Beállításokban van a Fiók rész is (név, e-mail, fiók törlése)
  get('open-settings-btn')?.addEventListener('click', () => {
    fill();
    setStatus('');
    setNameStatus('');
    profileModal.hidden = true;
    settingsModal.hidden = false;
    fokuszAllit(settingsModal);
  });
  // Kijelentkezés
  get('logout-btn')?.addEventListener('click', async () => {
    if (!confirm(tr('confirm_logout', 'Biztosan ki szeretnél jelentkezni?'))) return;
    // az eszköz ne kapja tovább ennek a fióknak az értesítéseit (ha nem sikerül, a kijelentkezés akkor is megy)
    await leiratkozas().catch(err => console.error('Leiratkozási hiba:', err));
    await signOut();
    location.reload();
  });

  // Saját megjelenített név: automatikus mentés gépelés közben, nincs külön "Mentés" gomb.
  // Mentés előtt egy gyors (kb. 400 ms) kényelmi ellenőrzés fut az is_display_name_available
  // RPC-vel ("van-e már ilyen nevű tag a csoportomban?") — a valódi védelem a szerveren (trigger)
  // van, ez csak előre jelez, hogy ne kelljen a trigger hibájára (alert) várni.
  let utolsoMentettNev = null;
  let ellenorzesSorszam = 0;
  async function mentNevet() {
    const input = get('own-name-input');
    if (!input) return;
    const nev = input.value.trim();
    if (nev === utolsoMentettNev) return;
    if (nev.length < 2 || nev.length > 30) {
      return setNameStatus(tr('err_name_2_30', 'A név 2–30 karakter legyen.'), '#ef4444');
    }

    const sajatSorszam = ++ellenorzesSorszam;
    setNameStatus(tr('checking', 'Ellenőrzés...'), '#3b82f6');
    try {
      const szabad = await callRpc('is_display_name_available', { p_name: nev });
      if (sajatSorszam !== ellenorzesSorszam) return; // közben újabb gépelés indult, ez elavult
      if (!szabad) {
        return setNameStatus(tr('err_name_taken', 'Ebben a csoportban már van ilyen nevű tag.'), '#ef4444');
      }
    } catch (err) {
      // Ha az ellenőrzés hibázik (pl. hálózat), a mentést a szerveri trigger úgyis védi
      console.warn('Névütközés-ellenőrzés sikertelen, mentés megkísérelve:', err);
    }
    if (sajatSorszam !== ellenorzesSorszam) return;

    setNameStatus(tr('saving', 'Mentés...'), '#3b82f6');
    const ok = await updateMyDisplayName(nev);
    if (sajatSorszam !== ellenorzesSorszam) return;
    if (ok) {
      utolsoMentettNev = nev;
      setNameStatus(tr('saved_check', 'Mentve ✓'), '#10b981');
    } else {
      setNameStatus(tr('err_save', 'A mentés nem sikerült.'), '#ef4444');
    }
  }
  const mentNevetKesleltetve = debounce(mentNevet, 400);
  get('own-name-input')?.addEventListener('input', () => {
    setNameStatus('');
    mentNevetKesleltetve();
  });
  get('own-name-input')?.addEventListener('blur', () => mentNevetKesleltetve.flush());

  // Fiók végleges törlése (Google Play követelmény: az appban is elérhető legyen)
  get('delete-account-btn')?.addEventListener('click', async () => {
    const warning =
      tr('confirm_delete_account', 'A fiókod végleg törlődik (profil, csoporttagság). Ha te vagy a csoport utolsó tagja, a csoport és adatai is törlődnek.\n\nA megerősítéshez írd be: {word}', { word: tr('delete_word', 'TÖRLÉS') });
    const answer = prompt(warning);
    if (answer === null) return;
    if (answer.trim().toUpperCase() !== tr('delete_word', 'TÖRLÉS').toUpperCase()) {
      return setStatus(tr('err_confirm_mismatch_account', 'A megerősítő szöveg nem egyezik, a fiók nem lett törölve.'), '#ef4444');
    }

    setStatus(tr('deleting_account', 'Fiók törlése...'), '#3b82f6');
    try {
      // Utolsó tagként a csoport képei is törlődnek (a fiók törlése után már nincs jogunk)
      const { group, members } = getState();
      if (group && members.length === 1) {
        const hibak = await torolCsoportKepei(group.id, group.group_code);
        if (hibak.length) console.warn('Néhány kép nem törlődött a fiók törlésekor:', hibak);
      }
      await deleteMyAccount();
      alert(tr('account_deleted', 'A fiókod törölve lett.'));
      location.reload();
    } catch (err) {
      setStatus(err.message || tr('err_account_delete', 'A fiók törlése nem sikerült.'), '#ef4444');
    }
  });
}
