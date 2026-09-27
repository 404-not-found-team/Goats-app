document.addEventListener('DOMContentLoaded', () => {
  injectSettingsUI();

  const get = id => document.getElementById(id);
  const btnSettings = get('settings-btn'), modal = get('settings-modal');
  const codeInput = get('group-code-input'), membersInput = get('group-members-input');
  const loggedWrapper = get('logged-in-wrapper'), notice = get('login-notice');
  const btnLogout = get('logout-btn'), btnSave = get('save-settings-btn');
  const status = get('settings-status');
  const toggleCodeVisibilityBtn = get('toggle-code-visibility');
  const tosWrapper = get('tos-wrapper');

  const tabs = document.querySelectorAll('.sm-tab-btn');
  const tabContents = document.querySelectorAll('.sm-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetTab = tab.dataset.tab;
      const targetContent = get(`tab-${targetTab}`);
      if (targetContent) targetContent.classList.add('active');

      if (targetTab === 'dev') {
        betoltChangelog();
      }
    });
  });

  const setStatus = (msg, color) => {
    if (status) {
      status.innerText = msg;
      status.style.color = color;
    }
  };

  // Csoport Kép Feltöltés
  const groupAvatarInput = get('group-avatar-input');
  if (groupAvatarInput) {
    groupAvatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const rawCode = localStorage.getItem('goats_group_code');
      if (!file || !rawCode) return;

      setStatus('Kép feltöltése...', 'var(--text-secondary)');
      try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        const ext = file.name.split('.').pop();
        const filePath = `avatars/${rawCode}.${ext}`;

        const { error: uploadErr } = await client.storage
          .from('kepek')
          .upload(filePath, file, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = client.storage.from('kepek').getPublicUrl(filePath);
        const avatarUrl = urlData.publicUrl;

        await client.from('groups').update({ avatar_url: avatarUrl }).eq('group_code', rawCode);

        const imgElem = get('group-avatar-preview');
        if (imgElem) imgElem.src = avatarUrl;
        setStatus(' Csoportkép frissítve!', '#22c55e');
      } catch (err) {
        console.error(err);
        setStatus('❌ Képfeltöltési hiba!', '#ef4444');
      }
    });
  }

  // Csoportkód elrejtése / Megjelenítése
  if (toggleCodeVisibilityBtn && codeInput) {
    toggleCodeVisibilityBtn.addEventListener('click', () => {
      const isPassword = codeInput.type === 'password';
      codeInput.type = isPassword ? 'text' : 'password';
      toggleCodeVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
    });

    codeInput.addEventListener('focus', () => {
      codeInput.type = 'text';
      if (toggleCodeVisibilityBtn) toggleCodeVisibilityBtn.textContent = '🙈';
    });

    codeInput.addEventListener('blur', () => {
      codeInput.type = 'password';
      if (toggleCodeVisibilityBtn) toggleCodeVisibilityBtn.textContent = '👁️';
    });
  }

  // Téma választó dropdown
  const themeDropdown = get('custom-theme-dropdown');
  const themeSelectedText = get('theme-dropdown-selected-text');
  const themeOptionsContainer = get('theme-dropdown-options');

  const themes = [
    { id: 'dark', name: '🌙 Dark (Alapértelmezett)' },
    { id: 'light', name: '☀️ Light' },
    { id: 'discord', name: '🎮 Discord Classic' },
    { id: 'discord-brown', name: '🪵 Discord Meleg Barna' },
    { id: 'discord-purple', name: '🔮 Discord Mélylila' },
    { id: 'cyberpunk', name: '🤖 Cyberpunk Neon' }
  ];

  const currentTheme = localStorage.getItem('goats_theme') || 'dark';
  const foundTheme = themes.find(t => t.id === currentTheme);
  if (themeSelectedText && foundTheme) themeSelectedText.textContent = foundTheme.name;

  if (themeOptionsContainer) {
    themeOptionsContainer.innerHTML = '';
    themes.forEach(t => {
      const optionDiv = document.createElement('div');
      optionDiv.className = `dropdown-option ${t.id === currentTheme ? 'selected' : ''}`;
      optionDiv.textContent = t.name;

      optionDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        document.documentElement.setAttribute('data-theme', t.id);
        localStorage.setItem('goats_theme', t.id);
        themeSelectedText.textContent = t.name;

        const allOpts = themeOptionsContainer.querySelectorAll('.dropdown-option');
        allOpts.forEach(o => o.classList.remove('selected'));
        optionDiv.classList.add('selected');
        themeDropdown.classList.remove('open');
      });

      themeOptionsContainer.appendChild(optionDiv);
    });
  }

  if (themeDropdown) {
    themeDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      if (themeDropdown) themeDropdown.classList.toggle('open');
    });
  }

  // User Dropdown
  const userDropdown = get('custom-user-dropdown');
  const userSelectedText = get('user-dropdown-selected-text');
  const userOptionsContainer = get('user-dropdown-options');

  if (userDropdown) {
    userDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('open');
    });
  }

  document.addEventListener('click', () => {
    if (themeDropdown) themeDropdown.classList.remove('open');
    if (userDropdown) userDropdown.classList.remove('open');
  });

  const populateUserSelect = (members) => {
    if (!members || members.length === 0 || !userOptionsContainer) return;

    const currentUser = localStorage.getItem('goats_current_user');
    userOptionsContainer.innerHTML = '';

    if (currentUser && members.includes(currentUser)) {
      userSelectedText.textContent = currentUser;
      setStatus(` Üdvözlünk: ${currentUser}`, '#22c55e');
    } else {
      userSelectedText.textContent = 'Válaszd ki, hogy ki vagy...';
      setStatus('⚠️ Válaszd ki, ki vagy te a csoportból!', '#eab308');
    }

    members.forEach(member => {
      const optionDiv = document.createElement('div');
      optionDiv.className = `dropdown-option ${member === currentUser ? 'selected' : ''}`;
      optionDiv.textContent = member;

      optionDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('goats_current_user', member);
        userSelectedText.textContent = member;

        const allOpts = userOptionsContainer.querySelectorAll('.dropdown-option');
        allOpts.forEach(o => o.classList.remove('selected'));
        optionDiv.classList.add('selected');

        userDropdown.classList.remove('open');
        setStatus(` Mentve: ${member}`, '#22c55e');
      });

      userOptionsContainer.appendChild(optionDiv);
    });
  };

  btnSettings.addEventListener('click', async () => {
    const code = localStorage.getItem('goats_group_code') || '';
    const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');
    const isLogged = !!code;

    codeInput.value = code;
    codeInput.type = 'password';
    if (toggleCodeVisibilityBtn) toggleCodeVisibilityBtn.textContent = '👁️';

    membersInput.value = members.join(', ');
    codeInput.disabled = isLogged;

    loggedWrapper.style.display = isLogged ? 'block' : 'none';
    notice.style.display = isLogged ? 'none' : 'block';
    btnSave.style.display = isLogged ? 'none' : 'block';
    if (tosWrapper) tosWrapper.style.display = isLogged ? 'none' : 'block';

    btnLogout.style.display = isLogged ? 'block' : 'none';

    if (isLogged) {
      populateUserSelect(members);

      try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        const { data } = await client.from('groups').select('avatar_url').eq('group_code', code).maybeSingle();
        if (data && data.avatar_url) {
          const preview = get('group-avatar-preview');
          if (preview) preview.src = data.avatar_url;
        }
      } catch (err) {
        console.error(err);
      }
    }

    modal.style.display = 'flex';
  });

  get('close-modal-btn').addEventListener('click', () => modal.style.display = 'none');

  membersInput.addEventListener('change', async () => {
    const rawCode = localStorage.getItem('goats_group_code');
    if (!rawCode) return;

    const membersArray = membersInput.value.split(',').map(n => n.trim()).filter(Boolean);

    try {
      const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
      const { error } = await client.from('groups').upsert(
        { group_code: rawCode, members: membersArray, updated_at: new Date() },
        { onConflict: 'group_code' }
      );
      if (error) throw error;

      localStorage.setItem('goats_group_members', JSON.stringify(membersArray));
      populateUserSelect(membersArray);
      setStatus(' Tagok frissítve!', '#22c55e');
    } catch (err) {
      console.error(err);
      setStatus('❌ Hiba a mentéskor!', '#ef4444');
    }
  });

  btnLogout.addEventListener('click', () => {
    if (confirm('Biztosan ki szeretnél jelentkezni a csoportból?')) {
      localStorage.removeItem('goats_group_code');
      localStorage.removeItem('goats_group_members');
      localStorage.removeItem('goats_group_pages');
      setStatus(' Kijelentkezés...', '#ef4444');
      setTimeout(() => location.reload(), 500);
    }
  });

  btnSave.addEventListener('click', async () => {
    const tosCheckbox = document.getElementById('accept-tos-checkbox');
    if (tosCheckbox && !tosCheckbox.checked) {
      return setStatus('⚠️ A belépéshez el kell fogadnod a Használati Feltételeket!', '#ef4444');
    }

    const rawCode = codeInput.value.trim().toLowerCase();
    if (!rawCode) return setStatus('⚠️ Adj meg egy csoportkódot!', '#ef4444');

    setStatus('Feldolgozás...', 'var(--text-secondary)');

    try {
      const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
      const { data, error } = await client
        .from('groups')
        .select('*')
        .eq('group_code', rawCode)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return setStatus('❌ Hibás vagy nem létező csoportkód!', '#ef4444');
      }

      const members = data.members || [];
      localStorage.setItem('goats_group_code', rawCode);
      localStorage.setItem('goats_group_members', JSON.stringify(members));

      setStatus(' Sikeres belépés!', '#22c55e');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      console.error(err);
      setStatus('❌ Hiba történt a belépés során!', '#ef4444');
    }
  });

  const tosModal = get('tos-modal');
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'open-tos-modal') {
      e.preventDefault();
      if (tosModal) tosModal.style.display = 'flex';
    }
  });

  if (get('close-tos-modal')) {
    get('close-tos-modal').addEventListener('click', () => {
      if (tosModal) tosModal.style.display = 'none';
    });
  }

  if (get('accept-tos-modal-btn')) {
    get('accept-tos-modal-btn').addEventListener('click', () => {
      const chk = get('accept-tos-checkbox');
      if (chk) chk.checked = true;
      if (tosModal) tosModal.style.display = 'none';
    });
  }
});

async function betoltChangelog() {
  const kontener = document.getElementById('changelog-lista');
  if (!kontener) return;

  try {
    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const { data: frissitesek, error } = await client
      .from('dev_changelog')
      .select('*')
      .order('datum', { ascending: false });

    if (error) {
      console.error('Hiba a changelog betöltésekor:', error);
      kontener.innerHTML = '<p style="color: #ef4444; text-align: center;">Nem sikerült betölteni a frissítéseket.</p>';
      return;
    }

    if (!frissitesek || frissitesek.length === 0) {
      kontener.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Még nincsenek rögzített frissítések.</p>';
      return;
    }

    kontener.innerHTML = frissitesek.map(item => {
      const datumObj = new Date(item.datum);
      const formatumDatum = datumObj.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return `
        <div class="changelog-kartya ${item.kategoria || 'uj'}">
          <div class="changelog-fejlec">
            <span class="changelog-verzio">${item.verzio}</span>
            <span class="changelog-datum">${formatumDatum}</span>
          </div>
          <h4 class="changelog-cim">${item.cim}</h4>
          <p class="changelog-leiras">${item.leiras}</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Changelog betöltési hiba:', err);
    kontener.innerHTML = '<p style="color: #ef4444; text-align: center;">Hiba történt a frissítések lekérése közben.</p>';
  }
}

function injectSettingsUI() {
  document.body.insertAdjacentHTML('beforeend', `
    <button id="settings-btn">⚙️</button>

    <!-- BEÁLLÍTÁSOK MODAL -->
    <div id="settings-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3>Beállítások</h3>
          <button id="close-modal-btn" class="sm-close-btn">&times;</button>
        </div>

        <div class="sm-tabs">
          <button class="sm-tab-btn active" data-tab="csoport">👥 Csoport</button>
          <button class="sm-tab-btn" data-tab="altalanos">🎨 Megjelenés</button>
          <button class="sm-tab-btn" data-tab="dev">🚀 Frissítések</button>
        </div>

        <div class="sm-body">
          <!-- TAB 1: MEGJELENÉS -->
          <div id="tab-altalanos" class="sm-tab-content">
            <label class="sm-label">Téma kiválasztása:</label>
            <div id="custom-theme-dropdown" class="custom-dropdown">
              <div class="dropdown-selected">
                <span id="theme-dropdown-selected-text">🌙 Dark (Alapértelmezett)</span>
                <span class="arrow">▼</span>
              </div>
              <div id="theme-dropdown-options" class="dropdown-options"></div>
            </div>
          </div>

          <!-- TAB 2: CSOPORT -->
          <div id="tab-csoport" class="sm-tab-content active">
            <label class="sm-label">Csoport kódja:</label>
            <div style="position: relative; display: flex; align-items: center; margin-bottom: 15px;">
              <input type="password" id="group-code-input" class="sm-input" style="margin-bottom: 0; padding-right: 40px;"/>
              <button id="toggle-code-visibility" type="button" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; font-size: 16px;">👁️</button>
            </div>
            
            <p id="login-notice" class="sm-notice">🔒 A tagok és profilkép szerkesztéséhez először lépj be a csoport kódjával!</p>
            
            <div id="logged-in-wrapper" style="display:none;">
              <!-- Csoport Profilkép -->
              <div style="display: none; align-items: center; gap: 12px; margin-bottom: 15px; background: var(--inner-bg); padding: 10px; border-radius: 8px;">
                <img id="group-avatar-preview" src="https://via.placeholder.com/50?text=Goats" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-color);" />
                <div>
                  <label class="sm-label" style="margin: 0; cursor: pointer; color: var(--accent-color); font-weight: bold;">
                    📸 Csoportkép feltöltése
                    <input type="file" id="group-avatar-input" accept="image/*" style="display: none;" />
                  </label>
                </div>
              </div>

              <label class="sm-label">Én vagyok a csoportból:</label>
              <div id="custom-user-dropdown" class="custom-dropdown">
                <div class="dropdown-selected">
                  <span id="user-dropdown-selected-text">Válaszd ki, hogy ki vagy...</span>
                  <span class="arrow">▼</span>
                </div>
                <div id="user-dropdown-options" class="dropdown-options"></div>
              </div>

              <label class="sm-label">Tagok (vesszővel elválasztva):</label>
              <input type="text" id="group-members-input" class="sm-input" placeholder="Peti, Géza, Vivi" />
            </div>
          </div>

          <!-- TAB 3: DEV LOG (FRISSÍTÉSEK) -->
          <div id="tab-dev" class="sm-tab-content">
            <div id="changelog-lista" class="changelog-lista">
              <p style="text-align: center; color: var(--text-secondary);">Frissítések betöltése...</p>
            </div>
          </div>
        </div>
            
        <!-- FIX KÖZÖS LÁBLÉC -->
        <div class="sm-footer">
          <p id="settings-status"></p>
          <button id="save-settings-btn" class="sm-btn sm-btn-save">Belépés</button>
          <div id="tos-wrapper" class="tos-wrapper">
            <label class="tos-label">
              <input type="checkbox" id="accept-tos-checkbox" class="tos-checkbox" />
              <span>
                A belépéssel elfogadom a <a href="#" id="open-tos-modal" class="tos-link">Használati Feltételeket</a> és a felelősségkizárási nyilatkozatot.
              </span>
            </label>
          </div>
          <button id="logout-btn" class="sm-btn sm-btn-logout">Kijelentkezés a csoportból</button>
        </div>
      </div>
    </div>

    <!-- EGYEDI HASZNÁLATI FELTÉTELEK MODAL -->
    <div id="tos-modal" class="sm-overlay tos-modal-overlay" style="display: none;">
      <div class="sm-card tos-modal-card">
        <div class="sm-header">
          <h3 class="tos-modal-header">📜 Használati Feltételek</h3>
          <button id="close-tos-modal" class="sm-close-btn">&times;</button>
        </div>
        <div class="tos-modal-body">
          <h4>1. Felelősségkizárás</h4>
          <p>Az alkalmazást az üzemeltető adott állapotában (as-is), garanciavállalás nélkül biztosítja.</p>
        </div>
        <button id="accept-tos-modal-btn" class="sm-btn sm-btn-save tos-modal-btn">Elfogadom</button>
      </div>
    </div>
  `);
}