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

  let utolsoMentettCsoportnev = null;
  // A "Műveletek" blokk kiválasztási módja: null (nincs kiválasztás), 'eltavolitas' vagy 'atadas'
  let kivalasztasMod = null;

  const updateAvatars = () => {
    const { group, displayName } = getState();
    const emoji = localStorage.getItem('goats_group_emoji');
    const sign = emoji || (group?.group_name || displayName || '🐐').charAt(0).toUpperCase();
    if (get('group-avatar-badge')) get('group-avatar-badge').textContent = sign;
    if (get('header-user-avatar')) get('header-user-avatar').textContent = sign;
  };

  // Egy tag sora. Kiválasztás módban (admin, nem a saját sor) checkbox vagy rádiógomb jelenik meg
  // gomb helyett; a tényleges műveletet a "Végrehajtás" gomb indítja a kiválasztott tag(ok)ra.
  function memberRow(m, me, isAdmin, mod) {
    const row = document.createElement('div');
    row.className = 'tag-sor';

    const valaszthato = isAdmin && m.user_id !== me && mod;
    if (valaszthato) {
      const input = document.createElement('input');
      input.type = mod === 'eltavolitas' ? 'checkbox' : 'radio';
      input.className = mod === 'eltavolitas' ? 'tag-eltavolitas-cb' : 'tag-atadas-radio';
      if (mod === 'atadas') input.name = 'tag-atadas-radio';
      input.value = m.user_id;
      row.appendChild(input);
    }

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

    return row;
  }

  // A tag-lista frissítése a jelenlegi kiválasztási mód szerint (állapotváltozáskor és módváltáskor is)
  function renderTagok() {
    const { group, groupRole, user, members } = getState();
    const isAdmin = groupRole === 'admin';
    const list = get('group-members-list');
    if (list && group) {
      list.replaceChildren(...members.map(m => memberRow(m, user?.id, isAdmin, kivalasztasMod)));
    }
  }

  function render() {
    const { group, groupRole, members } = getState();
    const isAdmin = groupRole === 'admin';

    const noGroup = get('group-no-group');
    const content = get('group-content');
    if (noGroup) noGroup.hidden = !!group;
    if (content) content.hidden = !group;
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

    // A Műveletek blokk mindenkinek látszik (a Kilépés mindig ott van), a tartalma admin-függő
    const muveletekBlokk = get('csoport-muveletek-blokk');
    if (muveletekBlokk) muveletekBlokk.hidden = false;
    if (!isAdmin && kivalasztasMod) zarjMuveletMod();
    frissitsAdminGombokLathatosagat(isAdmin);

    renderTagok();
    // Ha az admin jog átkerült máshoz (vagy elfogyott a kiválasztható tag), lépjünk ki a kiválasztásból
    if (kivalasztasMod && !members.some(m => m.user_id !== getState().user?.id)) zarjMuveletMod();
  }

  onChange(render);
  render();

  // Megnyitáskor friss adat a szerverről
  get('open-group-details-btn')?.addEventListener('click', async () => {
    setStatus('');
    zarjMuveletMod();
    zarjTagok();
    render();
    await refresh();
  });

  // Tagok: lenyíló blokk, alapból csukva
  function zarjTagok() {
    const tartalom = get('tagok-tartalom');
    const nyil = get('tagok-nyil');
    if (tartalom) tartalom.hidden = true;
    get('toggle-tagok-btn')?.setAttribute('aria-expanded', 'false');
    if (nyil) nyil.textContent = '›';
  }
  get('toggle-tagok-btn')?.addEventListener('click', () => {
    const tartalom = get('tagok-tartalom');
    const nyil = get('tagok-nyil');
    if (!tartalom) return;
    const nyitva = tartalom.hidden; // most nyitjuk-e
    tartalom.hidden = !nyitva;
    get('toggle-tagok-btn')?.setAttribute('aria-expanded', String(nyitva));
    if (nyil) nyil.textContent = nyitva ? '⌄' : '›';
  });

  // A csoport képeinek törlése a csoport törlése/utolsó tag kilépése ELŐTT (utána már nincs jogunk)
  async function csoportKepeinekTorlese(group) {
    const hibak = await torolCsoportKepei(group.id, group.group_code);
    if (hibak.length) setStatus('Néhány kép törlése nem sikerült, de a művelet folytatódik.', '#ef4444');
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
        //setStatus('A csoportkód a vágólapra másolva.', '#10b981');
      } catch {
        //setStatus('A másolás nem sikerült, jelöld ki kézzel.', '#ef4444');
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

  // ---------- Műveletek blokk: lenyitás, kiválasztásos eltávolítás/átadás ----------

  // Az admin-only gombok láthatósága. Kiválasztás közben az indító gombok amúgy is el vannak
  // rejtve, azokat ilyenkor nem írjuk felül (a kiválasztás lezárásakor úgyis újrafut).
  function frissitsAdminGombokLathatosagat(isAdmin) {
    if (!kivalasztasMod) {
      get('indit-eltavolitas-btn')?.toggleAttribute('hidden', !isAdmin);
      get('indit-atadas-btn')?.toggleAttribute('hidden', !isAdmin);
    }
    get('regenerate-code-btn')?.toggleAttribute('hidden', !isAdmin);
    get('delete-group-btn')?.toggleAttribute('hidden', !isAdmin);
  }

  function zarjMuveletMod() {
    kivalasztasMod = null;
    get('muveletek-sugo')?.setAttribute('hidden', '');
    get('muveletek-vegrehajt-btn')?.setAttribute('hidden', '');
    get('muveletek-megse-btn')?.setAttribute('hidden', '');
    frissitsAdminGombokLathatosagat(getState().groupRole === 'admin');
    renderTagok();
  }

  get('toggle-muveletek-btn')?.addEventListener('click', () => {
    const tartalom = get('csoport-muveletek-tartalom');
    const btn = get('toggle-muveletek-btn');
    if (!tartalom) return;
    const nyitva = tartalom.hidden; // most nyitjuk-e
    tartalom.hidden = !nyitva;
    btn?.setAttribute('aria-expanded', String(nyitva));
    const nyil = get('muveletek-nyil');
    if (nyil) nyil.textContent = nyitva ? '⌄' : '›';
    if (!nyitva) zarjMuveletMod();
  });

  function inditsdKivalasztast(mod, sugoSzoveg) {
    kivalasztasMod = mod;
    get('indit-eltavolitas-btn')?.setAttribute('hidden', '');
    get('indit-atadas-btn')?.setAttribute('hidden', '');
    const sugo = get('muveletek-sugo');
    if (sugo) { sugo.textContent = sugoSzoveg; sugo.hidden = false; }
    get('muveletek-vegrehajt-btn')?.removeAttribute('hidden');
    get('muveletek-megse-btn')?.removeAttribute('hidden');
    renderTagok();
  }

  get('indit-eltavolitas-btn')?.addEventListener('click', () => {
    inditsdKivalasztast('eltavolitas', 'Jelöld be, kiket távolítasz el a csoportból, majd nyomd meg a Végrehajtást.');
  });

  get('indit-atadas-btn')?.addEventListener('click', () => {
    inditsdKivalasztast('atadas', 'Válaszd ki, kire ruházod át az admin jogot, majd nyomd meg a Végrehajtást.');
  });

  get('muveletek-megse-btn')?.addEventListener('click', () => zarjMuveletMod());

  get('muveletek-vegrehajt-btn')?.addEventListener('click', async () => {
    const { group, members } = getState();
    if (!group) return;

    if (kivalasztasMod === 'eltavolitas') {
      const kijeloltek = [...document.querySelectorAll('#group-members-list .tag-eltavolitas-cb:checked')]
        .map(cb => cb.value);
      if (kijeloltek.length === 0) return setStatus('Jelölj be legalább egy tagot.', '#ef4444');
      const nevek = kijeloltek
        .map(id => members.find(m => m.user_id === id)?.display_name || id)
        .join(', ');
      if (!confirm(`Eltávolítod a csoportból: ${nevek}?`)) return;

      setStatus('Eltávolítás...', '#3b82f6');
      let hibaDb = 0;
      for (const userId of kijeloltek) {
        const ok = await removeMember(userId, group.id);
        if (!ok) hibaDb += 1;
      }
      setStatus(hibaDb === 0 ? 'A kiválasztott tagok eltávolítva.' : `${hibaDb} tag eltávolítása nem sikerült.`, hibaDb === 0 ? '#10b981' : '#ef4444');
      zarjMuveletMod();
      return;
    }

    if (kivalasztasMod === 'atadas') {
      const kijelolt = document.querySelector('#group-members-list .tag-atadas-radio:checked');
      if (!kijelolt) return setStatus('Válassz ki egy tagot.', '#ef4444');
      const nev = members.find(m => m.user_id === kijelolt.value)?.display_name || '';
      if (!confirm(`Átadod az admin jogot neki: ${nev}? Utána te sima tag leszel.`)) return;

      setStatus('Mentés...', '#3b82f6');
      const ok = await transferOwnership(kijelolt.value, group.id);
      setStatus(ok ? 'Az admin jog átadva.' : 'Az átadás nem sikerült.', ok ? '#10b981' : '#ef4444');
      zarjMuveletMod();
    }
  });

  // Új kód (admin)
  get('regenerate-code-btn')?.addEventListener('click', async () => {
    if (!confirm('Új csoportkódot generálsz. A régi kód azonnal érvénytelen lesz, a meglévő tagok bent maradnak. Az új kódot MEG KELL OSZTANOD a tagokkal, mert a régivel már nem tudnak csatlakozni. A csoport képei nem változnak. Folytatod?')) return;
    const code = await regenerateGroupCode(getState().group.id);
    if (code) setStatus(`Új csoportkód: ${code}`, '#10b981');
  });

  // Csoport törlése (admin) – a csoport nevét kell begépelni
  get('delete-group-btn')?.addEventListener('click', async () => {
    const { group } = getState();
    const typed = prompt(
      `A csoport és MINDEN adata (tartozások, tervek, események...) véglegesen törlődik.\n\nA megerősítéshez írd be a csoport nevét: ${group.group_name}`
    );
    if (typed === null) return;
    if (typed.trim() !== group.group_name) return setStatus('A név nem egyezik, a csoport nem lett törölve.', '#ef4444');
    await csoportKepeinekTorlese(group);
    const ok = await deleteCurrentGroup(group.id);
    if (ok) location.reload();
  });

  // Kilépés (mindenkinek, nem csak adminnak)
  get('leave-group-btn')?.addEventListener('click', async () => {
    if (!confirm('Biztosan kilépsz a csoportból?')) return;
    try {
      const { group, members } = getState();
      if (members.length === 1) await csoportKepeinekTorlese(group);
      await leaveGroup();
      location.reload();
    } catch (err) {
      setStatus(err.message, '#ef4444');
    }
  });
}
