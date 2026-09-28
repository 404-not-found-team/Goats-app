export function initAuthModal() {
  const get = id => document.getElementById(id);

  const setStatus = (elem, msg, color) => {
    if (elem) {
      elem.innerText = msg;
      elem.style.color = color;
    }
  };

  // "Még nincs kódod?" gomb
  get('toggle-request-code-btn')?.addEventListener('click', () => {
    const section = get('request-code-section');
    if (section) {
      const isHidden = section.classList.contains('hidden');
      section.classList.toggle('hidden');
      get('toggle-request-code-btn').textContent = isHidden ? '❌ Kód igénylés elrejtése' : '📩 Még nincs kódod? Igényelj egyet!';
    }
  });

  // Használati feltételek modal (megnyitás, bezárás, elfogadás)
  const tosModal = get('tos-modal');

  get('open-tos-modal')?.addEventListener('click', (e) => {
    e.preventDefault(); // különben a href="#" felugrik az oldal tetejére
    if (tosModal) tosModal.style.display = 'flex';
  });

  get('close-tos-modal')?.addEventListener('click', () => {
    if (tosModal) tosModal.style.display = 'none';
  });

  get('accept-tos-modal-btn')?.addEventListener('click', () => {
    const cb = get('accept-tos-checkbox');
    if (cb) cb.checked = true;
    if (tosModal) tosModal.style.display = 'none';
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

      // Ha van elmentett utolsó név, azt visszaállítjuk az aktív felhasználónak
      const lastUser = localStorage.getItem('goats_last_user');
      if (lastUser && members.includes(lastUser)) {
        localStorage.setItem('goats_current_user', lastUser);
      }

      setStatus(get('auth-status'), ' Sikeres belépés!', '#22c55e');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      console.error(err);
      setStatus(get('auth-status'), '❌ Hiba a belépésnél!', '#ef4444');
    }
  });
}