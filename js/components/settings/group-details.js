import { getState, refresh, onChange, leaveGroup } from '../../auth-service.js';
import {
  removeMember, transferOwnership, renameGroup, regenerateGroupCode, deleteCurrentGroup,
  updateMyDisplayName,
} from '../../admin.js';

export function initGroupDetails() {
  const get = id => document.getElementById(id);

  const setStatus = (msg, color = '') => {
    const s = get('group-details-status');
    if (s) { s.textContent = msg || ''; s.style.color = color; }
  };

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
    row.style.cssText =
      'display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:6px;' +
      'border:1px solid var(--border-color);background:var(--inner-bg);border-radius:8px;' +
      'color:var(--text-primary);';

    const name = document.createElement('span');
    name.style.flex = '1';
    name.textContent = m.display_name + (m.user_id === me ? ' (te)' : '');
    row.appendChild(name);

    if (m.group_role === 'admin') {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:12px;color:var(--accent-color);';
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
    const { group, groupRole, user, members, displayName } = getState();
    const isAdmin = groupRole === 'admin';

    // A saját név mezőt csak akkor írjuk felül, ha épp nem gépelünk bele
    const ownName = get('own-name-input');
    if (ownName && document.activeElement !== ownName) ownName.value = displayName || '';

    const noGroup = get('group-no-group');
    const content = get('group-content');
    if (noGroup) noGroup.style.display = group ? 'none' : 'block';
    if (content) content.style.display = group ? 'block' : 'none';
    updateAvatars();
    if (!group) return;

    const nameInput = get('group-name-display');
    if (nameInput) { nameInput.value = group.group_name || ''; nameInput.readOnly = !isAdmin; }
    const saveName = get('save-group-name-btn');
    if (saveName) saveName.style.display = isAdmin ? '' : 'none';

    const codeInput = get('group-code-display');
    if (codeInput) { codeInput.value = group.group_code; codeInput.type = 'password'; }
    if (get('toggle-group-code-visibility')) get('toggle-group-code-visibility').textContent = '👁️';

    const regen = get('regenerate-code-btn');
    if (regen) regen.style.display = isAdmin ? '' : 'none';
    const del = get('delete-group-btn');
    if (del) del.style.display = isAdmin ? '' : 'none';

    const list = get('group-members-list');
    if (list) {
      list.replaceChildren(...members.map(m => memberRow(m, user?.id, isAdmin, group.id)));
    }
  }

  onChange(render);
  updateAvatars();

  // Megnyitáskor friss adat a szerverről
  get('open-group-details-btn')?.addEventListener('click', async () => {
    setStatus('');
    render();
    await refresh();
  });

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

  // Saját megjelenített név mentése (minden bejelentkezett felhasználó)
  get('save-own-name-btn')?.addEventListener('click', async () => {
    const btn = get('save-own-name-btn');
    btn.disabled = true;
    const ok = await updateMyDisplayName(get('own-name-input')?.value);
    btn.disabled = false;
    const status = get('own-name-status');
    if (status) {
      status.textContent = ok ? 'A neved elmentve.' : '';
      status.style.color = '#10b981';
    }
  });

  // Átnevezés (admin)
  get('save-group-name-btn')?.addEventListener('click', async () => {
    const { group } = getState();
    const name = (get('group-name-display')?.value || '').trim();
    if (name.length < 2 || name.length > 40) return setStatus('A név 2–40 karakter legyen.', '#ef4444');
    const ok = await renameGroup(group.id, name);
    setStatus(ok ? 'A csoport neve elmentve.' : '', '#10b981');
  });

  // Új kód (admin)
  get('regenerate-code-btn')?.addEventListener('click', async () => {
    if (!confirm('Új csoportkódot generálsz. A régi kód azonnal érvénytelen lesz, a meglévő tagok bent maradnak. Folytatod?')) return;
    const code = await regenerateGroupCode(getState().group.id);
    if (code) setStatus(`Új csoportkód: ${code}`, '#10b981');
  });

  // Kilépés
  get('leave-group-btn')?.addEventListener('click', async () => {
    if (!confirm('Biztosan kilépsz a csoportból?')) return;
    try {
      await leaveGroup();
      location.reload();
    } catch (err) {
      setStatus(err.message, '#ef4444');
    }
  });

  // Csoport törlése (admin) – a csoport nevét kell begépelni
  get('delete-group-btn')?.addEventListener('click', async () => {
    const { group } = getState();
    const typed = prompt(
      `A csoport és MINDEN adata (tartozások, tervek, események...) véglegesen törlődik.\n\nA megerősítéshez írd be a csoport nevét: ${group.group_name}`
    );
    if (typed === null) return;
    if (typed.trim() !== group.group_name) return setStatus('A név nem egyezik, a csoport nem lett törölve.', '#ef4444');
    const ok = await deleteCurrentGroup(group.id);
    if (ok) location.reload();
  });
}