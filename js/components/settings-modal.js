document.addEventListener('DOMContentLoaded', () => {
  injectUserNavUI();

  const get = id => document.getElementById(id);

  // Modalok
  const authModal = get('auth-modal');
  const profileModal = get('profile-modal');
  const groupDetailsModal = get('group-details-modal');
  const settingsModal = get('settings-modal');
  const devModal = get('dev-modal');
  const verifyCodeModal = get('verify-code-modal');
  const emailModal = get('email-modal');
  const tosModal = get('tos-modal');

  // Globális változók a biztonsági kódhoz
  let generaltBiztonsagiKod = null;
  let aktivMuvelet = null; // 'email_modositas' vagy 'csoport_torles'
  let ideiglenesUjEmail = '';

  const setStatus = (elem, msg, color) => {
    if (elem) {
      elem.innerText = msg;
      elem.style.color = color;
    }
  };

  const EMOJIK = ['🐐', '🍺', '🍸', '🔥', '🎉', '👑', '🚀', '⚽', '🎮', '💎'];

  const frissitsAvatarKezdest = (groupName, emoji) => {
    const avatarElem = get('group-avatar-badge');
    const headerAvatarElem = get('header-user-avatar');
    
    const jelolas = emoji || (groupName ? groupName.charAt(0).toUpperCase() : '🐐');

    if (avatarElem) avatarElem.textContent = jelolas;
    if (headerAvatarElem) headerAvatarElem.textContent = jelolas;
  };

  // 6-jegyű biztonsági kód generálása és kiküldése EmailJS-sel
  const kuldjBiztonsagiKodot = async (celEmail, muveletNev) => {
    generaltBiztonsagiKod = Math.floor(100000 + Math.random() * 900000).toString();
    const groupCode = localStorage.getItem('goats_group_code') || '';

    console.log(`[EmailJS] Kód kiküldése ide: ${celEmail}, Kód: ${generaltBiztonsagiKod}`);

    try {
      if (typeof emailjs !== 'undefined') {
        await emailjs.send("service_default", "template_verification", {
          to_email: celEmail,
          group_code: groupCode,
          verification_code: generaltBiztonsagiKod,
          action_name: muveletNev
        });
      }
    } catch (err) {
      console.warn("EmailJS küldési hiba, tartalék kód a konzolon:", err);
    }

    // Megnyitjuk az ellenőrző modalt
    get('verify-code-input').value = '';
    setStatus(get('verify-code-status'), `Kódot elküldtük ide: ${celEmail}`, 'var(--text-secondary)');
    verifyCodeModal.style.display = 'flex';
  };

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
      themeDropdown.classList.toggle('open');
    });
  }

  // User Dropdown ("Ki vagyok")
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
      if (userSelectedText) userSelectedText.textContent = currentUser;
      if (get('profile-display-name')) get('profile-display-name').textContent = currentUser;
    } else {
      if (userSelectedText) userSelectedText.textContent = 'Válaszd ki, ki vagy...';
      if (get('profile-display-name')) get('profile-display-name').textContent = 'Nincs kiválasztva név';
    }

    members.forEach(member => {
      const optionDiv = document.createElement('div');
      optionDiv.className = `dropdown-option ${member === currentUser ? 'selected' : ''}`;
      optionDiv.textContent = member;

      optionDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('goats_current_user', member);
        if (userSelectedText) userSelectedText.textContent = member;
        if (get('profile-display-name')) get('profile-display-name').textContent = member;

        const allOpts = userOptionsContainer.querySelectorAll('.dropdown-option');
        allOpts.forEach(o => o.classList.remove('selected'));
        optionDiv.classList.add('selected');

        userDropdown.classList.remove('open');
      });

      userOptionsContainer.appendChild(optionDiv);
    });
  };

  // "Még nincs kódod?" felnyitó gomb
  get('toggle-request-code-btn')?.addEventListener('click', () => {
    const section = get('request-code-section');
    if (section) {
      const isHidden = section.style.display === 'none';
      section.style.display = isHidden ? 'block' : 'none';
      get('toggle-request-code-btn').textContent = isHidden ? '❌ Kód igénylés elrejtése' : '📩 Még nincs kódod? Igényelj egyet!';
    }
  });

  // Belépés submit
  get('auth-submit-btn')?.addEventListener('click', async () => {
    const tosCheckbox = get('accept-tos-checkbox');
    if (tosCheckbox && !tosCheckbox.checked) {
      return setStatus(get('auth-status'), '⚠️ Fogadd el a Feltételeket!', '#ef4444');
    }

    const rawCode = get('auth-group-code-input') ? get('auth-group-code-input').value.trim().toLowerCase() : '';
    if (!rawCode) return setStatus(get('auth-status'), '⚠️ Adj meg egy csoportkódot!', '#ef4444');

    const userEmail = get('auth-email-input') ? get('auth-email-input').value.trim() : '';
    if (userEmail) {
      localStorage.setItem('goats_user_email', userEmail);
    }

    setStatus(get('auth-status'), 'Belépés...', 'var(--text-secondary)');

    try {
      const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
      const { data, error } = await client
        .from('groups')
        .select('*')
        .eq('group_code', rawCode)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return setStatus(get('auth-status'), '❌ Hibás csoportkód!', '#ef4444');
      }

      const members = data.members || [];
      localStorage.setItem('goats_group_code', rawCode);
      localStorage.setItem('goats_group_members', JSON.stringify(members));

      setStatus(get('auth-status'), ' Sikeres belépés!', '#22c55e');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      console.error(err);
      setStatus(get('auth-status'), '❌ Hiba a belépésnél!', '#ef4444');
    }
  });

  // 1. LÉPÉS: E-mail Módosítás Indítása (Kód igénylése)
  get('request-email-change-btn')?.addEventListener('click', () => {
    ideiglenesUjEmail = get('new-email-input').value.trim();
    if (!ideiglenesUjEmail) {
      return alert('Adj meg egy érvényes új e-mail címet!');
    }

    const jelenlegiEmail = localStorage.getItem('goats_user_email') || ideiglenesUjEmail;
    aktivMuvelet = 'email_modositas';
    emailModal.style.display = 'none';

    kuldjBiztonsagiKodot(jelenlegiEmail, 'E-mail cím módosítása');
  });

  // 1. LÉPÉS: Csoport Törlés Indítása (Kód igénylése)
  get('delete-group-btn')?.addEventListener('click', () => {
    const jelenlegiEmail = localStorage.getItem('goats_user_email');
    if (!jelenlegiEmail) {
      return alert('Nincs megadva e-mail cím a csoporthoz! Előbb adj meg egy e-mail címet.');
    }

    aktivMuvelet = 'csoport_torles';
    groupDetailsModal.style.display = 'none';

    kuldjBiztonsagiKodot(jelenlegiEmail, 'Csoport törlése');
  });

  // 2. LÉPÉS: Biztonsági Kód Ellenőrzése
  get('verify-code-btn')?.addEventListener('click', async () => {
    const beirtKod = get('verify-code-input').value.trim();

    if (beirtKod !== generaltBiztonsagiKod) {
      return setStatus(get('verify-code-status'), '❌ Hibás biztonsági kód!', '#ef4444');
    }

    // Ha a kód helyes:
    if (aktivMuvelet === 'email_modositas') {
      localStorage.setItem('goats_user_email', ideiglenesUjEmail);
      if (get('profile-display-email')) get('profile-display-email').textContent = ideiglenesUjEmail;
      if (get('group-email-display')) get('group-email-display').textContent = ideiglenesUjEmail;
      verifyCodeModal.style.display = 'none';
      alert(' Az e-mail cím sikeresen módosítva lett!');
    } else if (aktivMuvelet === 'csoport_torles') {
      const code = localStorage.getItem('goats_group_code');
      try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        await client.from('groups').delete().eq('group_code', code);
        
        localStorage.clear();
        alert(' A csoport sikeresen törölve lett.');
        location.reload();
      } catch (err) {
        alert('Hiba történt a törlés során!');
      }
    }
  });

  // Kijelentkezés
  get('logout-btn')?.addEventListener('click', () => {
    if (confirm('Biztosan ki szeretnél jelentkezni?')) {
      localStorage.clear();
      setTimeout(() => location.reload(), 300);
    }
  });

  // Emoji választó gombok generálása
  const emojiPickerContainer = get('emoji-picker-container');
  if (emojiPickerContainer) {
    emojiPickerContainer.innerHTML = '';
    EMOJIK.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'emoji-select-btn';
      btn.textContent = e;
      btn.addEventListener('click', () => {
        localStorage.setItem('goats_group_emoji', e);
        frissitsAvatarKezdest(null, e);
        groupDetailsModal.style.display = 'none';
      });
      emojiPickerContainer.appendChild(btn);
    });
  }

  // Modal Navigációs Gombok
  get('open-group-details-btn')?.addEventListener('click', () => {
    const code = localStorage.getItem('goats_group_code') || '';
    const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');
    const email = localStorage.getItem('goats_user_email') || 'nincs_email@goats.app';

    const groupCodeDisplay = get('group-code-display');
    const toggleBtn = get('toggle-group-code-visibility');

    if (groupCodeDisplay) {
        groupCodeDisplay.value = code;
        groupCodeDisplay.type = 'password';
    }
    if (toggleBtn) {
        toggleBtn.textContent = '👁️';
    }

    if (get('group-name-display')) get('group-name-display').value = localStorage.getItem('goats_group_name') || code.toUpperCase();
    if (get('group-email-display')) get('group-email-display').textContent = email;
    if (get('group-members-input')) get('group-members-input').value = members.join(', ');

    profileModal.style.display = 'none';
    groupDetailsModal.style.display = 'flex';
  });

  // Csoport kód elrejtése / megjelenítése toggle
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'toggle-group-code-visibility') {
      const codeInput = get('group-code-display');
      if (codeInput) {
        const isPassword = codeInput.type === 'password';
        codeInput.type = isPassword ? 'text' : 'password';
        e.target.textContent = isPassword ? '🙈' : '👁️';
      }
    }
  });

  get('open-settings-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    settingsModal.style.display = 'flex';
  });

  get('open-dev-btn')?.addEventListener('click', () => {
    profileModal.style.display = 'none';
    devModal.style.display = 'flex';
    betoltChangelog();
  });

  get('open-edit-email-btn')?.addEventListener('click', () => {
    if (get('new-email-input')) get('new-email-input').value = localStorage.getItem('goats_user_email') || '';
    groupDetailsModal.style.display = 'none';
    emailModal.style.display = 'flex';
  });

  // Bezáró gombok
  get('close-auth-btn')?.addEventListener('click', () => authModal.style.display = 'none');
  get('close-profile-btn')?.addEventListener('click', () => profileModal.style.display = 'none');
  get('close-group-details-btn')?.addEventListener('click', () => groupDetailsModal.style.display = 'none');
  get('close-settings-btn')?.addEventListener('click', () => settingsModal.style.display = 'none');
  get('close-dev-btn')?.addEventListener('click', () => devModal.style.display = 'none');
  get('close-email-btn')?.addEventListener('click', () => emailModal.style.display = 'none');
  get('close-verify-btn')?.addEventListener('click', () => verifyCodeModal.style.display = 'none');

  // Gombok megnyitása
  document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'open-auth-modal-btn') {
      authModal.style.display = 'flex';
    }
    if (e.target && (e.target.id === 'open-profile-modal-btn' || e.target.closest('#open-profile-modal-btn'))) {
      const code = localStorage.getItem('goats_group_code') || '';
      const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');
      const savedEmail = localStorage.getItem('goats_user_email') || 'nincs_email@goats.app';
      const savedEmoji = localStorage.getItem('goats_group_emoji');

      if (get('profile-display-email')) get('profile-display-email').textContent = savedEmail;
      populateUserSelect(members);
      frissitsAvatarKezdest(code, savedEmoji);

      profileModal.style.display = 'flex';
    }
  });

  // TOS Modal
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'open-tos-modal') {
      e.preventDefault();
      if (tosModal) tosModal.style.display = 'flex';
    }
  });

  get('close-tos-modal')?.addEventListener('click', () => {
    if (tosModal) tosModal.style.display = 'none';
  });

  get('accept-tos-modal-btn')?.addEventListener('click', () => {
    const chk = get('accept-tos-checkbox');
    if (chk) chk.checked = true;
    if (tosModal) tosModal.style.display = 'none';
  });
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

    if (error || !frissitesek) {
      kontener.innerHTML = '<p style="color: #ef4444; text-align: center;">Nem sikerült betölteni a frissítéseket.</p>';
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
    console.error('Changelog hiba:', err);
  }
}

function injectUserNavUI() {
  const code = localStorage.getItem('goats_group_code');
  const savedEmoji = localStorage.getItem('goats_group_emoji');
  const isLogged = !!code;

  const headerContainer = document.createElement('div');
  headerContainer.className = 'top-user-nav';

  if (!isLogged) {
    headerContainer.innerHTML = `
      <button id="open-auth-modal-btn" class="nav-auth-btn">
        SIGN IN
      </button>
    `;
  } else {
    const kezdoJel = savedEmoji || (code ? code.charAt(0).toUpperCase() : '🐐');
    headerContainer.innerHTML = `
      <button id="open-profile-modal-btn" class="nav-profile-btn" title="Profil">
        <div id="header-user-avatar" class="google-avatar-circle">${kezdoJel}</div>
      </button>
    `;
  }

  document.body.appendChild(headerContainer);

  document.body.insertAdjacentHTML('beforeend', `
    <!-- 1. SIGN IN MODAL -->
    <div id="auth-modal" class="sm-overlay" style="display: none;">
      <div class="sm-card" style="height: auto; min-height: 380px; display: flex; flex-direction: column; justify-content: space-between;">
        
        <div>
          <div class="sm-header">
            <h3>Sign In / Belépés 🔑</h3>
            <button id="close-auth-btn" class="sm-close-btn">&times;</button>
          </div>

          <div class="sm-body" style="height: auto;">
            <label class="sm-label">Kód beírása (Csoport kód):</label>
            <input type="password" id="auth-group-code-input" class="sm-input"/>

            <!-- Gomb az e-mail mező megnyitásához -->
            <button id="toggle-request-code-btn" type="button" class="google-mini-edit-btn" style="color: var(--accent-color); font-weight: bold; margin-bottom: 12px; display: block;">
              📩 Még nincs kódod? Igényelj egyet!
            </button>

            <!-- Rejtett E-mail mező szekció -->
            <div id="request-code-section" style="display: none; background: var(--inner-bg); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 15px;">
              <label class="sm-label" style="margin-bottom: 4px;">E-mail cím a kód igényléséhez:</label>
              <input type="email" id="auth-email-input" class="sm-input" placeholder="peldas.pisti@gmail.com" style="margin-bottom: 0;" />
            </div>
          </div>
        </div>

        <!-- Alsó fix szekció: Status + Checkbox + Zöld Gomb -->
        <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid var(--border-color);">
          <div id="tos-wrapper" class="tos-wrapper" style="margin-bottom: 12px;">
            <label class="tos-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="accept-tos-checkbox" class="tos-checkbox" />
              <span style="font-size: 0.85rem;">
                Elfogadom a <a href="#" id="open-tos-modal" class="tos-link">Használati Feltételeket</a>.
              </span>
            </label>
          </div>

          <p id="auth-status" style="font-size: 13px; text-align: center; margin: 8px 0; min-height: 18px;"></p>
          <button id="auth-submit-btn" class="sm-btn sm-btn-save" style="width: 100%; font-size: 1rem; padding: 12px; border-radius: 12px;">Belépés / Igénylés</button>
        </div>

      </div>
    </div>

    <!-- 2. GOOGLE STÍLUSÚ PROFIL POPOVER / MODAL -->
    <div id="profile-modal" class="sm-overlay" style="display: none;">
      <div class="google-profile-card">
        <button id="close-profile-btn" class="google-close-btn">&times;</button>
        
        <div class="google-user-header">
          <div id="group-avatar-badge" class="google-avatar-circle large">🐐</div>
          
          <div class="google-user-info">
            <h4 id="profile-display-name">Nincs kiválasztva név</h4>
            <div class="google-email-row">
              <span id="profile-display-email">email@goats.app</span>
            </div>
            <span class="google-plus-badge">V1.0.3</span>
          </div>
        </div>

        <div class="google-menu-list">
          <button id="open-group-details-btn" class="google-menu-btn">
            <span>👥 Csoport Adatok</span>
            <span class="arrow-icon">›</span>
          </button>

          <button id="open-settings-btn" class="google-menu-btn">
            <span>⚙️ Beállítások</span>
            <span class="arrow-icon">›</span>
          </button>

          <button id="open-dev-btn" class="google-menu-btn">
            <span>🚀 Frissítések & Dev Log</span>
            <span class="arrow-icon">›</span>
          </button>

          <button id="logout-btn" class="google-menu-btn danger">
            <span>🚪 Kijelentkezés</span>
          </button>
        </div>

        <p id="profile-status" style="font-size: 12px; text-align: center; margin-top: 10px;"></p>
      </div>
    </div>

    <!-- 3. CSOPORT ADATOK MODAL -->
    <div id="group-details-modal" class="sm-overlay" style="display: none;">
      <div class="sm-card" style="height: auto; max-height: 90vh;">
        <div class="sm-header">
          <h3>👥 Csoport Adatok</h3>
          <button id="close-group-details-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body" style="height: auto; max-height: 75vh;">
          <label class="sm-label">Csoport neve:</label>
          <input type="text" id="group-name-display" class="sm-input" placeholder="GOATS Csoport" />
          
          <label class="sm-label">Csoport e-mail címe:</label>
          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--inner-bg); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 15px;">
            <span id="group-email-display" style="font-size: 0.9rem; font-weight: bold; color: var(--text-primary);">email@goats.app</span>
            <button id="open-edit-email-btn" class="google-mini-edit-btn" style="background: var(--accent-color); color: #fff; padding: 4px 8px; border-radius: 6px;" title="E-mail módosítása">✏️ Módosít</button>
          </div>
          
          <label class="sm-label">Csoport kódja (Group Code):</label>
          <div style="position: relative; display: flex; align-items: center; margin-bottom: 15px;">
            <input type="password" id="group-code-display" class="sm-input" readonly style="margin-bottom: 0; padding-right: 40px; opacity: 0.9;" />
            <button id="toggle-group-code-visibility" type="button" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; font-size: 16px;">👁️</button>
          </div>

          <label class="sm-label">Én vagyok a csoportból:</label>
          <div id="custom-user-dropdown" class="custom-dropdown" style="margin-bottom: 15px;">
            <div class="dropdown-selected">
              <span id="user-dropdown-selected-text">Válaszd ki, ki vagy...</span>
              <span class="arrow">▼</span>
            </div>
            <div id="user-dropdown-options" class="dropdown-options"></div>
          </div>

          <label class="sm-label">Válassz csoport ikont:</label>
          <div id="emoji-picker-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;"></div>

          <label class="sm-label">Tagok (vesszővel elválasztva):</label>
          <input type="text" id="group-members-input" class="sm-input" placeholder="Peti, Géza, Vivi" style="margin-bottom: 20px;" />

          <button id="delete-group-btn" class="google-menu-btn danger-dark" style="margin-top: 10px;">
            🗑️ Csoport törlése
          </button>
        </div>
      </div>
    </div>

    <!-- 4. E-MAIL MÓDOSÍTÁS MODAL -->
    <div id="email-modal" class="sm-overlay" style="display: none;">
      <div class="sm-card" style="height: auto;">
        <div class="sm-header">
          <h3>✏️ Új E-mail Cím</h3>
          <button id="close-email-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body" style="height: auto;">
          <label class="sm-label">Adj meg egy új e-mail címet:</label>
          <input type="email" id="new-email-input" class="sm-input" placeholder="ujemail@gmail.com" />
          <button id="request-email-change-btn" class="sm-btn sm-btn-save">Kód igénylése e-mailben 📩</button>
        </div>
      </div>
    </div>

    <!-- 5. BIZTONSÁGI KÓD ELLENŐRZŐ MODAL -->
    <div id="verify-code-modal" class="sm-overlay" style="display: none;">
      <div class="sm-card" style="height: auto;">
        <div class="sm-header">
          <h3>🔒 Biztonsági Ellenőrzés</h3>
          <button id="close-verify-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body" style="height: auto;">
          <p id="verify-code-status" style="font-size: 13px; text-align: center; margin-bottom: 12px;"></p>
          <label class="sm-label">Írd be az e-mailben kapott 6-jegyű kódot:</label>
          <input type="text" id="verify-code-input" class="sm-input" placeholder="123456" maxlength="6" style="text-align: center; font-size: 1.2rem; letter-spacing: 4px;" />
          <button id="verify-code-btn" class="sm-btn sm-btn-save">Művelet Megerősítése</button>
        </div>
      </div>
    </div>

    <!-- 6. SETTINGS MODAL (TÉMA) -->
    <div id="settings-modal" class="sm-overlay" style="display: none;">
      <div class="sm-card" style="height: auto;">
        <div class="sm-header">
          <h3>⚙️ Beállítások</h3>
          <button id="close-settings-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body" style="height: auto;">
          <label class="sm-label">Téma kiválasztása:</label>
          <div id="custom-theme-dropdown" class="custom-dropdown">
            <div class="dropdown-selected">
              <span id="theme-dropdown-selected-text">🌙 Dark (Alapértelmezett)</span>
              <span class="arrow">▼</span>
            </div>
            <div id="theme-dropdown-options" class="dropdown-options"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 7. DEV LOG MODAL -->
    <div id="dev-modal" class="sm-overlay" style="display: none;">
      <div class="sm-card" style="height: 450px;">
        <div class="sm-header">
          <h3>🚀 Frissítések & Dev Log</h3>
          <button id="close-dev-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <div id="changelog-lista" class="changelog-lista">
            <p style="text-align: center; color: var(--text-secondary);">Frissítések betöltése...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- HASZNÁLATI FELTÉTELEK MODAL -->
    <div id="tos-modal" class="sm-overlay tos-modal-overlay" style="display: none;">
      <div class="sm-card tos-modal-card">
        <div class="sm-header">
          <h3 class="tos-modal-header">📜 Használati Feltételek</h3>
          <button id="close-tos-modal" class="sm-close-btn">&times;</button>
        </div>
        <div class="tos-modal-body">
          <h4>1. Felelősségkizárás</h4>
          <p>Az alkalmazást az üzemeltető adott állapotában (as-is), garanciavállalás nélkül biztosítja.</p>
          <h4>2. Pénzügyi elszámolások</h4>
          <p>A Tartozások modul kizárólag a felhasználók közötti tájékoztató jellegű nyilvántartásra szolgál.</p>
          <h4>3. Feltöltött tartalmak</h4>
          <p>A feltöltött képekért és adatokért kizárólag a feltöltő személy vállalja a felelősséget.</p>
        </div>
        <button id="accept-tos-modal-btn" class="sm-btn sm-btn-save tos-modal-btn">Elfogadom</button>
      </div>
    </div>
  `);
}