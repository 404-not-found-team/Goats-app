import { getState, refresh, onChange, leaveGroup } from '../../auth-service.js';
import { torolCsoportKepei } from '../../utils/csoport-kepek.js';
import {
  removeMember, transferOwnership, renameGroup, regenerateGroupCode, deleteCurrentGroup,
} from '../../admin.js';
import { debounce } from '../../utils/debounce.js';

export function initGroupDetails() {
  const get = id => document.getElementById(id);

  const STATUS_OSZTALY = { '#ef4444': 'status-hiba', '#10b981': 'status-ok', '#3b82f6': 'status-info' };
  const setStatus = (msg, color = '') => {
    const s = get('group-details-status');
    if (s) { s.textContent = msg || ''; s.className = STATUS_OSZTALY[color] || ''; }
  };
  // A Profil adatok ablakba költöztetett gombok (új kód, kilépés, csoport törlése) saját visszajelzése
  const setMuveletekStatus = (msg, color = '') => {
    const s = get('profil-muveletek-status');
    if (s) { s.textContent = msg || ''; s.className = STATUS_OSZTALY[color] || ''; }
  };

  let utolsoMentettCsoportnev = null;

  const updateAvatars = () => {
    const { group, displayName } = getState();
    const emoji = localStorage.getItem('goats_group_emoji');
    const sign = emoji || (group?.group_name || displayName || '🐐').charAt(0).toUpperCase();
    if (get('group-avatar-badge')) get('group-avatar-badge').textContent = sign;
    if (get('header-user-avatar')) get('header-user-avatar').textContent = sign;
  };

  // Tag sor felépítése (csak textContent, nincs innerHTML)
  function memberRow(m, me, isAdmin, groupId) {
    const row = document.createElement('div');
    row.className = 'tag-sor';

    const name = document.createElement('span');
    name.className = 'nyujt';
    name.textContent = m.display_name + (m.user_id === me ? ' (te)' : '');
    row.appendChild(name);

    if (m.group_role === 'admin') {
      const badge = document.createElement('span');
      badge.className = 'admin-jel';
      badge.textContent = '👑 admin';
      row.appendChild(badge);
    }

    if (isAdmin && m.user_id !== me) {
      const give = document.createElement('button');
      give.type = 'button';
      give.className = 'google-mini-edit-btn';
      give.textContent = 'Admin jog átadása';
      give.addEventListener('click', async () => {
        if (!confirm(`Átadod az admin jogot neki: ${m.display_name}? Utána te sima tag leszel.`)) return;
        setStatus('Mentés...', '#3b82f6');
        const ok = await transferOwnership(m.user_id, groupId);
        setStatus(ok ? 'Az admin jog átadva.' : '', '#10b981');
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'google-mini-edit-btn';
      del.textContent = 'Eltávolít';
      del.addEventListener('click', async () => {
        if (!confirm(`Eltávolítod a csoportból: ${m.display_name}?`)) return;
        setStatus('Mentés...', '#3b82f6');
        const ok = await removeMember(m.user_id, groupId);
        setStatus(ok ? 'A tag eltávolítva.' : '', '#10b981');
      });

      row.appendChild(give);
      row.appendChild(del);
    }
    return row;
  }

  function render() {
    const { group, groupRole, user, members } = getState();
    const isAdmin = groupRole === 'admin';

    const noGroup = get('group-no-group');
    const content = get('group-content');
    const muveletek = get('profil-muveletek');
    if (noGroup) noGroup.hidden = !!group;
    if (content) content.hidden = !group;
    if (muveletek) muveletek.hidden = !group;
    updateAvatars();
    if (!group) return;

    // A név mezőt csak akkor írjuk felül, ha épp nem gépelünk bele
    const nameInput = get('group-name-display');
    if (nameInput && document.activeElement !== nameInput) {
      nameInput.value = group.group_name || '';
      utolsoMentettCsoportnev = group.group_name || '';
    }
    if (nameInput) nameInput.readOnly = !isAdmin;

    const codeInput = get('group-code-display');
    if (codeInput) { codeInput.value = group.group_code; codeInput.type = 'password'; }
    if (get('toggle-group-code-visibility')) get('toggle-group-code-visibility').textContent = '👁️';

    const regen = get('regenerate-code-btn');
    if (regen) regen.hidden = !isAdmin;
    const del = get('delete-group-btn');
    if (del) del.hidden = !isAdmin;

    const list = get('group-members-list');
    if (list) {
      list.replaceChildren(...members.map(m => memberRow(m, user?.id, isAdmin, group.id)));
    }
  }

  onChange(render);
  render();

  // Megnyitáskor friss adat a szerverről
  get('open-group-details-btn')?.addEventListener('click', async () => {
    setStatus('');
    render();
    await refresh();
  });

  // A csoport képeinek törlése a csoport törlése/utolsó tag kilépése ELŐTT (utána már nincs jogunk).
  // Csak a leave-group-btn és a delete-group-btn hívja, azok pedig a Profil adatok ablakban vannak.
  async function csoportKepeinekTorlese(group) {
    const hibak = await torolCsoportKepei(group.id, group.group_code);
    if (hibak.length) setMuveletekStatus('Néhány kép törlése nem sikerült, de a művelet folytatódik.', '#ef4444');
  }

  // Kód mutatása/elrejtése, másolása
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'toggle-group-code-visibility') {
      const input = get('group-code-display');
      if (!input) return;
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      e.target.textContent = hidden ? '🙈' : '👁️';
    }
    if (e.target.id === 'copy-group-code-btn') {
      const code = getState().group?.group_code;
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        setStatus('A csoportkód a vágólapra másolva.', '#10b981');
      } catch {
        setStatus('A másolás nem sikerült, jelöld ki kézzel.', '#ef4444');
      }
    }
  });

  // Csoportnév: automatikus mentés gépelés közben, csak admin (a mező a többieknek readonly)
  const setNameStatus = (msg, color = '') => {
    const s = get('group-name-status');
    if (s) { s.textContent = msg || ''; s.className = STATUS_OSZTALY[color] || ''; }
  };
  async function mentCsoportnevet() {
    const { group, groupRole } = getState();
    if (groupRole !== 'admin' || !group) return;
    const name = (get('group-name-display')?.value || '').trim();
    if (name === utolsoMentettCsoportnev) return;
    if (name.length < 2 || name.length > 40) {
      return setNameStatus('A név 2–40 karakter legyen.', '#ef4444');
    }
    setNameStatus('Mentés...', '#3b82f6');
    const ok = await renameGroup(group.id, name);
    if (ok) {
      utolsoMentettCsoportnev = name;
      setNameStatus('Mentve ✓', '#10b981');
    } else {
      setNameStatus('A mentés nem sikerült.', '#ef4444');
    }
  }
  const mentCsoportnevetKesleltetve = debounce(mentCsoportnevet, 800);
  get('group-name-display')?.addEventListener('input', () => {
    setNameStatus('');
    mentCsoportnevetKesleltetve();
  });
  get('group-name-display')?.addEventListener('blur', () => mentCsoportnevetKesleltetve.flush());

  // Új kód (admin) — a gomb a Profil adatok ablakban van
  get('regenerate-code-btn')?.addEventListener('click', async () => {
    if (!confirm('Új csoportkódot generálsz. A régi kód azonnal érvénytelen lesz, a meglévő tagok bent maradnak. Az új kódot MEG KELL OSZTANOD a tagokkal, mert a régivel már nem tudnak csatlakozni. A csoport képei nem változnak. Folytatod?')) return;
    const code = await regenerateGroupCode(getState().group.id);
    if (code) setMuveletekStatus(`Új csoportkód: ${code}`, '#10b981');
  });

  // Kilépés — a gomb a Profil adatok ablakban van
  get('leave-group-btn')?.addEventListener('click', async () => {
    if (!confirm('Biztosan kilépsz a csoportból?')) return;
    try {
      const { group, members } = getState();
      if (members.length === 1) await csoportKepeinekTorlese(group);
      await leaveGroup();
      location.reload();
    } catch (err) {
      setMuveletekStatus(err.message, '#ef4444');
    }
  });

  // Csoport törlése (admin) – a csoport nevét kell begépelni. A gomb a Profil adatok ablakban van
  get('delete-group-btn')?.addEventListener('click', async () => {
    const { group } = getState();
    const typed = prompt(
      `A csoport és MINDEN adata (tartozások, tervek, események...) véglegesen törlődik.\n\nA megerősítéshez írd be a csoport nevét: ${group.group_name}`
    );
    if (typed === null) return;
    if (typed.trim() !== group.group_name) return setMuveletekStatus('A név nem egyezik, a csoport nem lett törölve.', '#ef4444');
    await csoportKepeinekTorlese(group);
    const ok = await deleteCurrentGroup(group.id);
    if (ok) location.reload();
  });
}