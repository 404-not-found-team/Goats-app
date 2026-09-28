export function initGroupDetails() {
  const get = id => document.getElementById(id);
  const EMOJIK = ['🐐', '🍺', '🍸', '🔥', '🎉', '👑', '🚀', '⚽', '🎮', '💎'];

  const frissitsAvatarKezdest = (groupName, emoji) => {
    const avatarElem = get('group-avatar-badge');
    const headerAvatarElem = get('header-user-avatar');
    const jelolas = emoji || (groupName ? groupName.charAt(0).toUpperCase() : '🐐');

    if (avatarElem) avatarElem.textContent = jelolas;
    if (headerAvatarElem) headerAvatarElem.textContent = jelolas;
  };

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
        get('group-details-modal').style.display = 'none';
      });
      emojiPickerContainer.appendChild(btn);
    });
  }

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

  // User Dropdown ("Ki vagyok")
  const userDropdown = get('custom-user-dropdown');
  const userSelectedText = get('user-dropdown-selected-text');
  const userOptionsContainer = get('user-dropdown-options');

  userDropdown?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => userDropdown?.classList.remove('open'));

  // Amikor megnyitják a csoport adatokat, betöltjük az értékeket
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
    if (toggleBtn) toggleBtn.textContent = '👁️';

    if (get('group-name-display')) get('group-name-display').value = localStorage.getItem('goats_group_name') || code.toUpperCase();
    if (get('group-email-display')) get('group-email-display').textContent = email;
    if (get('group-members-input')) get('group-members-input').value = members.join(', ');

    // Dropdown feltöltése tagokkal és a mentett név kiválasztása
    if (userOptionsContainer) {
      // Vagy az aktuális nevet, vagy az utoljára elmentett nevet keressük
      const currentUser = localStorage.getItem('goats_current_user') || localStorage.getItem('goats_last_user');
      userOptionsContainer.innerHTML = '';

      if (currentUser && members.includes(currentUser)) {
        if (userSelectedText) userSelectedText.textContent = currentUser;
        if (get('profile-display-name')) get('profile-display-name').textContent = currentUser;
      }

      members.forEach(member => {
        const optionDiv = document.createElement('div');
        optionDiv.className = `dropdown-option ${member === currentUser ? 'selected' : ''}`;
        optionDiv.textContent = member;

        optionDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          // Eltároljuk az aktuális és az utolsó nevet is!
          localStorage.setItem('goats_current_user', member);
          localStorage.setItem('goats_last_user', member);

          if (userSelectedText) userSelectedText.textContent = member;
          if (get('profile-display-name')) get('profile-display-name').textContent = member;
          userDropdown.classList.remove('open');
        });

        userOptionsContainer.appendChild(optionDiv);
      });
    }
  });
}