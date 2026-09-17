const savedTheme = localStorage.getItem('goats_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('goats_theme', themeName);
}

document.addEventListener('DOMContentLoaded', () => {
  injectSettingsUI();

  const get = id => document.getElementById(id);
  const btnSettings = get('settings-btn'), modal = get('settings-modal');
  const codeInput = get('group-code-input'), membersInput = get('group-members-input');
  const membersWrapper = get('members-group-wrapper'), notice = get('login-notice');
  const btnLogout = get('logout-btn'), btnSave = get('save-settings-btn');
  const themeSelect = get('theme-select');
  const status = get('settings-status');

  const setStatus = (msg, color) => {
    status.innerText = msg;
    status.style.color = color;
  };

  btnSettings.addEventListener('click', () => {
    const code = localStorage.getItem('goats_group_code') || '';
    const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');
    const isLogged = !!code;

    codeInput.value = code;
    membersInput.value = members.join(', ');
    themeSelect.value = localStorage.getItem('goats_theme') || 'dark';

    codeInput.disabled = isLogged;
    membersInput.disabled = !isLogged;
    membersWrapper.style.display = isLogged ? 'block' : 'none';
    notice.style.display = isLogged ? 'none' : 'block';
    btnLogout.style.display = isLogged ? 'block' : 'none';
    btnSave.innerText = isLogged ? 'Mentés' : 'Belépés';

    modal.style.display = 'flex';
  });

  themeSelect.addEventListener('change', (e) => setTheme(e.target.value));
  get('close-modal-btn').addEventListener('click', () => modal.style.display = 'none');

  btnLogout.addEventListener('click', () => {
    if (confirm('Biztosan ki szeretnél jelentkezni a csoportból?')) {
      localStorage.removeItem('goats_group_code');
      localStorage.removeItem('goats_group_members');
      setStatus(' Kijelentkezés...', '#ef4444');
      setTimeout(() => location.reload(), 500);
    }
  });

  btnSave.addEventListener('click', async () => {
    const rawCode = codeInput.value.trim().toLowerCase();
    const currentCode = localStorage.getItem('goats_group_code');

    if (!rawCode) return setStatus('⚠️ Adj meg egy csoportkódot!', '#ef4444');

    setStatus('Feldolgozás...', 'var(--text-secondary)');

    try {
      if (!currentCode) {
        const { data, error } = await _supabase.from('groups').select('*').eq('group_code', rawCode).maybeSingle();
        if (error) throw error;

        localStorage.setItem('goats_group_code', rawCode);
        localStorage.setItem('goats_group_members', JSON.stringify(data?.members || []));
        setStatus(' Sikeres belépés!', '#22c55e');
        setTimeout(() => location.reload(), 800);
      } else {
        const membersArray = membersInput.value.split(',').map(n => n.trim()).filter(Boolean);
        const { error } = await _supabase.from('groups').upsert(
          { group_code: rawCode, members: membersArray, updated_at: new Date() },
          { onConflict: 'group_code' }
        );
        if (error) throw error;

        localStorage.setItem('goats_group_members', JSON.stringify(membersArray));
        setStatus(' Sikeresen elmentve!', '#22c55e');
        setTimeout(() => { modal.style.display = 'none'; location.reload(); }, 1000);
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ Hiba történt!', '#ef4444');
    }
  });
});

function injectSettingsUI() {
  document.body.insertAdjacentHTML('beforeend', `
    <style>
      #settings-btn { 
        position: fixed; top: 15px; right: 15px; z-index: 9999; 
        background: var(--card-bg, #1e1e24); color: var(--text-primary, #fff); 
        border: 1px solid var(--border-color, #333); border-radius: 50%; 
        width: 44px; height: 44px; font-size: 20px; cursor: pointer; 
        box-shadow: var(--box-shadow, 0 4px 10px rgba(0,0,0,0.3)); 
      }
      @media (max-width: 600px) { #settings-btn { top: auto; bottom: 15px; right: 15px; } }
      .sm-input { 
        width: 100%; padding: 10px; margin: 5px 0 15px; border-radius: 8px; 
        border: 1px solid var(--border-color, #3f3f46); 
        background: var(--input-bg, #09090b); color: var(--text-primary, #fff); 
        box-sizing: border-box; 
      }
      .sm-btn { width: 100%; padding: 12px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
    </style>
    <button id="settings-btn">⚙️</button>
    <div id="settings-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); justify-content:center; align-items:center; z-index:10000; backdrop-filter:blur(4px); font-family:sans-serif;">
      <div style="background: var(--card-bg, #18181b); color: var(--text-primary, #fff); padding:24px; border-radius:16px; width:90%; max-width:380px; border:1px solid var(--border-color, #27272a); position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3 style="margin:0; color: var(--text-primary);">Beállítások</h3>
          <button id="close-modal-btn" style="background:none; border:none; color: var(--text-secondary, #aaa); font-size:24px; cursor:pointer; line-height:1; padding:0 4px;">&times;</button>
        </div>
        <label style="font-size:12px; color: var(--text-secondary, #aaa);">Csoport kódja:</label>
        <input type="text" id="group-code-input" class="sm-input" />
        <p id="login-notice" style="font-size:12px; color:#eab308; margin:-5px 0 15px;">🔒 A tagok szerkesztéséhez először lépj be a csoport kódjával!</p>
        <div id="members-group-wrapper" style="display:none;">
          <label style="font-size:12px; color: var(--text-secondary, #aaa);">Tagok (vesszővel elválasztva):</label>
          <input type="text" id="group-members-input" class="sm-input" placeholder="Peti, Géza, Vivi" />
        </div>
        <label style="font-size:12px; color: var(--text-secondary, #aaa); margin-top:5px; display:block;">Téma választása:</label>
        <select id="theme-select" class="sm-input">
            <option value="dark">Sötét</option>
            <option value="light">Világos</option>
            <option value="discord">Sötét v2</option>
            <option value="discord-brown">Barna</option>
            <option value="discord-purple">Lila</option>
            <option value="cyberpunk">Neon</option>
        </select>
        <button id="save-settings-btn" class="sm-btn" style="background: #22c55e; color: #fff;">Belépés</button>
        <button id="logout-btn" class="sm-btn" style="display:none; margin-top:10px; background:#ef4444; color:#fff;">Kijelentkezés</button>
        <p id="settings-status" style="font-size:13px; text-align:center; margin:10px 0 0;"></p>
      </div>
    </div>
  `);
}