document.addEventListener('DOMContentLoaded', () => {
  injectSettingsUI();

  const get = id => document.getElementById(id);
  const btnSettings = get('settings-btn'), modal = get('settings-modal');
  const codeInput = get('group-code-input'), membersInput = get('group-members-input');
  const loggedWrapper = get('logged-in-wrapper'), notice = get('login-notice');
  const btnLogout = get('logout-btn'), btnSave = get('save-settings-btn');
  const status = get('settings-status');

  // Custom Dropdown elemek
  const userDropdown = get('custom-user-dropdown');
  const userSelectedText = get('user-dropdown-selected-text');
  const userOptionsContainer = get('user-dropdown-options');

  const setStatus = (msg, color) => {
    status.innerText = msg;
    status.style.color = color;
  };

  // Custom Dropdown nyitása / zárása
  userDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    userDropdown.classList.remove('open');
  });

  // Tagok feltöltése az egyedi dropdownba
  const populateUserSelect = (members) => {
    if (!members || members.length === 0) return;

    const currentUser = localStorage.getItem('goats_current_user');
    userOptionsContainer.innerHTML = '';

    if (currentUser && members.includes(currentUser)) {
      userSelectedText.textContent = currentUser;
      setStatus(` Belépve mint: ${currentUser}`, '#22c55e');
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
        
        // Kijelölési stílus frissítése
        const allOpts = userOptionsContainer.querySelectorAll('.dropdown-option');
        allOpts.forEach(o => o.classList.remove('selected'));
        optionDiv.classList.add('selected');

        userDropdown.classList.remove('open');
        setStatus(` Mentve: ${member}`, '#22c55e');
      });

      userOptionsContainer.appendChild(optionDiv);
    });
  };

  btnSettings.addEventListener('click', () => {
    const code = localStorage.getItem('goats_group_code') || '';
    const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');
    const isLogged = !!code;

    codeInput.value = code;
    membersInput.value = members.join(', ');
    codeInput.disabled = isLogged;

    loggedWrapper.style.display = isLogged ? 'block' : 'none';
    notice.style.display = isLogged ? 'none' : 'block';
    btnLogout.style.display = isLogged ? 'block' : 'none';
    btnSave.style.display = isLogged ? 'none' : 'block';

    if (isLogged) populateUserSelect(members);

    modal.style.display = 'flex';
  });

  get('close-modal-btn').addEventListener('click', () => modal.style.display = 'none');

  membersInput.addEventListener('change', async () => {
    const rawCode = localStorage.getItem('goats_group_code');
    if (!rawCode) return;

    const membersArray = membersInput.value.split(',').map(n => n.trim()).filter(Boolean);
    
    try {
      const { error } = await _supabase.from('groups').upsert(
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
      setStatus(' Kijelentkezés...', '#ef4444');
      setTimeout(() => location.reload(), 500);
    }
  });

  btnSave.addEventListener('click', async () => {
    const rawCode = codeInput.value.trim().toLowerCase();
    if (!rawCode) return setStatus('⚠️ Adj meg egy csoportkódot!', '#ef4444');

    setStatus('Feldolgozás...', 'var(--text-secondary)');

    try {
      const { data, error } = await _supabase.from('groups').select('*').eq('group_code', rawCode).maybeSingle();
      if (error) throw error;

      const members = data?.members || [];
      localStorage.setItem('goats_group_code', rawCode);
      localStorage.setItem('goats_group_members', JSON.stringify(members));

      setStatus(' Sikeres belépés!', '#22c55e');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      console.error(err);
      setStatus('❌ Hiba történt!', '#ef4444');
    }
  });
});

function injectSettingsUI() {
  document.body.insertAdjacentHTML('beforeend', `
    <button id="settings-btn">⚙️</button>
    <div id="settings-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3>Beállítások</h3>
          <button id="close-modal-btn" class="sm-close-btn">&times;</button>
        </div>
        
        <label class="sm-label">Csoport kódja:</label>
        <input type="text" id="group-code-input" class="sm-input" />
        
        <p id="login-notice" class="sm-notice">🔒 A tagok szerkesztéséhez először lépj be a csoport kódjával!</p>
        
        <div id="logged-in-wrapper" style="display:none;">
          <label class="sm-label">Én vagyok a csoportból:</label>
          
          <!-- Custom Single-Select Dropdown -->
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

        <button id="save-settings-btn" class="sm-btn sm-btn-save">Belépés</button>
        <button id="logout-btn" class="sm-btn sm-btn-logout">Kijelentkezés</button>
        <p id="settings-status"></p>
      </div>
    </div>
  `);
}