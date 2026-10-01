import { frissitsProfilEmail } from './profile-modal.js';

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
        e.target.textContent = isPassword ? '🙈' : '👁️️';
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
  get('open-group-details-btn')?.addEventListener('click', async () => {
    const code = localStorage.getItem('goats_group_code') || '';
    const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');

    const groupCodeDisplay = get('group-code-display');
    const toggleBtn = get('toggle-group-code-visibility');

    if (groupCodeDisplay) {
      groupCodeDisplay.value = code;
      groupCodeDisplay.type = 'password';
    }
    if (toggleBtn) toggleBtn.textContent = '👁️';

    if (get('group-name-display')) get('group-name-display').value = localStorage.getItem('goats_group_name') || code.toUpperCase();
    if (get('group-members-input')) get('group-members-input').value = members.join(', ');

    // Valós e-mail lekérése Supabase-ből és a DOM elemek frissítése
    await frissitsCsoportEmail();

    // Dropdown feltöltése tagokkal és a mentett név kiválasztása
    if (userOptionsContainer) {
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

export async function frissitsCsoportEmail() {
  const code = localStorage.getItem('goats_group_code');
  if (!code) return;

  try {
    const client = typeof _supabase !== 'undefined' ? _supabase : (window._supabase || window.supabase);
    if (!client) return console.warn('Supabase client nem érhető el!');

    const { data, error } = await client
      .from('groups_code')
      .select('email')
      .ilike('group_code', code)
      .maybeSingle();

    if (error) {
      console.error('Hiba az e-mail lekérésekor (groups_code):', error);
      return;
    }

    if (data && data.email) {
      localStorage.setItem('goats_user_email', data.email);
      
      const profileElem = document.getElementById('profile-display-email');
      const groupElem = document.getElementById('group-email-display');

      if (profileElem) profileElem.textContent = data.email;
      if (groupElem) groupElem.textContent = data.email;
    }
  } catch (err) {
    console.error('Lekérdezési hiba:', err);
  }
}