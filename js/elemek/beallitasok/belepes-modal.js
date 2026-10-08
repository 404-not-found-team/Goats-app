import { signInWithGoogle, joinGroup, createGroup, getState, onChange } from '../../auth-service.js';

export function initAuthModal() {
  const get = id => document.getElementById(id);

  const el = {
    title: get('auth-title'),
    stepLogin: get('auth-step-login'),
    stepGroup: get('auth-step-group'),
    userLine: get('auth-user-line'),
    status: get('auth-status'),
    googleBtn: get('google-login-btn'),
    codeInput: get('auth-group-code-input'),
    joinBtn: get('auth-submit-btn'),
    nameInput: get('new-group-name-input'),
    createBtn: get('create-group-btn'),
  };

  const STATUS_OSZTALY = { error: 'status-hiba', info: 'status-info', ok: 'status-ok' };
  const setStatus = (msg, kind) => {
    if (!el.status) return;
    el.status.textContent = msg || '';
    el.status.className = STATUS_OSZTALY[kind] || '';
  };
  const setBusy = (btn, on) => { if (btn) btn.disabled = on; };

  // A felület a valós állapotot tükrözi: nincs session -> belépés, van session -> csoport lépés
  function renderStep() {
    const { user } = getState();
    if (el.stepLogin) el.stepLogin.hidden = !!user;
    if (el.stepGroup) el.stepGroup.hidden = !user;
    if (el.title) el.title.textContent = user ? 'Csoport' : 'Belépés';
    if (el.userLine) el.userLine.textContent = user ? `Bejelentkezve: ${user.email}` : '';
  }
  renderStep();
  onChange(renderStep);

  // ---- 1. Google bejelentkezés ----
  // Nincs külön elfogadó checkbox: a bejelentkezési képernyőn lévő szöveg mondja ki, hogy a
  // bejelentkezés egyben elfogadás is. A tényleges rögzítés változatlanul az accept_tos RPC-vel
  // történik (lásd auth-service.js signInWithGoogle / applyPendingTos).
  el.googleBtn?.addEventListener('click', async () => {
    setBusy(el.googleBtn, true);
    setStatus('Átirányítás a Google bejelentkezéshez...', 'info');
    try {
      await signInWithGoogle(); // az oldal elnavigál, ha sikeres
    } catch (err) {
      setStatus(err.message || 'Nem sikerült elindítani a bejelentkezést.', 'error');
      setBusy(el.googleBtn, false);
    }
  });

  // ---- 2. Csatlakozás meglévő csoporthoz ----
  async function doJoin() {
    const code = (el.codeInput?.value || '').trim();
    if (!code) return setStatus('Írd be a csoportkódot!', 'error');

    setBusy(el.joinBtn, true);
    setStatus('Csatlakozás...', 'info');
    try {
      await joinGroup(code);
      setStatus('Sikeresen csatlakoztál!', 'ok');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      setStatus(err.message || 'Érvénytelen csoportkód!', 'error');
      setBusy(el.joinBtn, false);
    }
  }
  el.joinBtn?.addEventListener('click', doJoin);
  el.codeInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doJoin(); });

  // ---- 3. Új csoport létrehozása ----
  async function doCreate() {
    const name = (el.nameInput?.value || '').trim();
    if (name.length < 2 || name.length > 40) {
      return setStatus('A csoport neve 2–40 karakter legyen!', 'error');
    }

    setBusy(el.createBtn, true);
    setStatus('Új csoport létrehozása...', 'info');
    try {
      const data = await createGroup(name);
      try { await navigator.clipboard?.writeText(data.join_code); } catch { /* nem kritikus */ }
      setStatus(`Csoport létrehozva! Csoportkódod: ${data.join_code} (a vágólapra másoltuk, később a Csoport adatoknál is megtalálod)`, 'ok');
      setTimeout(() => location.reload(), 3500);
    } catch (err) {
      setStatus(err.message || 'Hiba a csoport létrehozásakor!', 'error');
      setBusy(el.createBtn, false);
    }
  }
  el.createBtn?.addEventListener('click', doCreate);
  el.nameInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCreate(); });
}