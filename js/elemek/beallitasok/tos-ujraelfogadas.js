import { onChange, callRpc, refresh, TOS_VERSION, isTosUjraelfogadasSzukseges } from '../../auth-service.js';

// Ha a felhasználó már be van jelentkezve, de a nála rögzített elfogadott verzió (profiles.tos_version,
// az accept_tos RPC írja) nem egyezik a hatályos TOS_VERSION-nel, ez a modal kéri az újraelfogadást.
// Első bejelentkezéskor ez nem fut le: azt a login-képernyő szövege és a goats_tos_pending mechanizmus
// (auth-service.js) kezeli, változatlanul.
export function initTosUjraelfogadas() {
  const modal = document.getElementById('tos-ujraelfogadas-modal');
  const btn = document.getElementById('ujraelfogad-btn');
  if (!modal) return;

  const setStatus = (msg, hiba = false) => {
    const s = document.getElementById('ujraelfogadas-status');
    if (!s) return;
    s.textContent = msg || '';
    s.className = hiba ? 'status-hiba' : '';
  };

  function frissit() {
    modal.hidden = !isTosUjraelfogadasSzukseges();
  }
  onChange(frissit);
  frissit();

  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    setStatus('Mentés...');
    try {
      await callRpc('accept_tos', { version_input: TOS_VERSION });
      await refresh(); // ez emit()-tel frissíti a modal láthatóságát is
      setStatus('');
    } catch (err) {
      setStatus(err.message || 'A mentés nem sikerült, próbáld újra.', true);
    } finally {
      btn.disabled = false;
    }
  });
}
