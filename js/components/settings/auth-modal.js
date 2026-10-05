export function initAuthModal() {
  const get = id => document.getElementById(id);

  const googleLoginBtn = get('google-login-btn');
  const authStatus = get('auth-status');
  const authGroupCodeInput = get('auth-group-code-input');
  const newGroupNameInput = get('new-group-name-input');
  const authSubmitBtn = get('auth-submit-btn');
  const createGroupBtn = get('create-group-btn');
  const acceptTosCheckbox = get('accept-tos-checkbox');

  const setStatus = (msg, color) => {
    if (authStatus) {
      authStatus.textContent = msg;
      authStatus.style.color = color;
    }
  };

  const getClient = () => typeof _supabase !== 'undefined' ? _supabase : (window._supabase || window.supabase || window.supabaseClient);

  // 1. Google Bejelentkezés
  googleLoginBtn?.addEventListener('click', async () => {
    if (acceptTosCheckbox && !acceptTosCheckbox.checked) {
      return setStatus('A belépéshez el kell fogadnod a Használati Feltételeket!', '#ef4444');
    }

    const client = getClient();
    if (!client) return setStatus('Adatbázis kapcsolódási hiba!', '#ef4444');

    setStatus('Átirányítás a Google bejelentkezéshez...', '#3b82f6');
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
  });

  // 2. Csatlakozás meglévő csoporthoz
  authSubmitBtn?.addEventListener('click', async () => {
    const client = getClient();
    const groupCode = (authGroupCodeInput?.value || '').trim();
    if (!groupCode) return setStatus('Kérjük, írd be a csoportkódot!', '#ef4444');

    setStatus('Csatlakozás a csoporthoz...', '#3b82f6');
    try {
      const { error } = await client.rpc('join_group_with_code', { code_input: groupCode });
      if (error) throw error;
      setStatus('Sikeresen csatlakoztál!', '#10b981');
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      setStatus(err.message || 'Érvénytelen csoportkód!', '#ef4444');
    }
  });

  // 3. Új csoport létrehozása
  createGroupBtn?.addEventListener('click', async () => {
    const client = getClient();
    const groupName = (newGroupNameInput?.value || '').trim();
    if (!groupName) return setStatus('Kérjük, adj meg egy csoportnevet!', '#ef4444');

    setStatus('Új csoport létrehozása...', '#3b82f6');
    try {
      const { data, error } = await client.rpc('create_new_group', { group_name_input: groupName });
      if (error) throw error;
      setStatus(`Csoport létrehozva! Kódod: ${data.join_code}`, '#10b981');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      setStatus(err.message || 'Hiba a csoport létrehozásakor!', '#ef4444');
    }
  });
}