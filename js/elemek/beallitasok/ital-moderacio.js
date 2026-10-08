import { callRpc, isSuperadmin, onChange } from '../../hitelesites.js';

// Superadmin: jóváhagyásra váró italok listája, jóváhagyás és elutasítás.
// A jogosultságot minden hívásnál az adatbázis (RPC) ellenőrzi; ez a felület csak
// a superadmin számára mutatja a blokkot.
export function initDrinkModeration() {
  const blokk = document.getElementById('drink-moderation');
  const lista = document.getElementById('pending-drinks-list');
  const statusz = document.getElementById('pending-drinks-status');
  if (!blokk || !lista) return;

  const setStatus = (msg, hiba = false) => {
    if (!statusz) return;
    statusz.textContent = msg || '';
    statusz.classList.toggle('hiba', hiba);
  };

  function sor(ital) {
    const elem = document.createElement('div');
    elem.className = 'moderalas-sor';

    const leiras = document.createElement('div');
    leiras.className = 'moderalas-leiras';
    const nev = document.createElement('strong');
    nev.textContent = ital.nev || '(névtelen)';
    const reszlet = document.createElement('span');
    const marka = ital.marka ? `márka: ${ital.marka}` : 'márka nélkül';
    reszlet.textContent = `${marka} · javasolta: ${ital.javasolta_nev || 'ismeretlen'}`;
    leiras.append(nev, reszlet);

    const gombok = document.createElement('div');
    gombok.className = 'moderalas-gombok';
    const jovahagy = document.createElement('button');
    jovahagy.type = 'button';
    jovahagy.className = 'sm-btn sm-btn-save';
    jovahagy.textContent = 'Jóváhagy';
    jovahagy.addEventListener('click', () => moderal('approve_drink', ital, 'Jóváhagyva.'));

    const elutasit = document.createElement('button');
    elutasit.type = 'button';
    elutasit.className = 'sm-btn sm-btn-logout';
    elutasit.textContent = 'Elutasít';
    elutasit.addEventListener('click', () => {
      if (!confirm(`Biztosan törlöd ezt az italt: "${ital.nev}"? Ez nem vonható vissza.`)) return;
      moderal('reject_drink', ital, 'Elutasítva, törölve.');
    });

    gombok.append(jovahagy, elutasit);
    elem.append(leiras, gombok);
    return elem;
  }

  async function moderal(rpc, ital, siker) {
    try {
      await callRpc(rpc, { drink_id: ital.id });
      setStatus(siker);
      await betolt();
    } catch (err) {
      setStatus(err.message || 'Hiba a művelet során.', true);
    }
  }

  async function betolt() {
    if (!isSuperadmin()) {
      blokk.hidden = true;
      return;
    }
    blokk.hidden = false;
    setStatus('Betöltés...');
    try {
      const rows = await callRpc('list_pending_drinks', {});
      if (!rows || rows.length === 0) {
        const ures = document.createElement('p');
        ures.className = 'moderalas-ures';
        ures.textContent = 'Nincs jóváhagyásra váró ital.';
        lista.replaceChildren(ures);
      } else {
        lista.replaceChildren(...rows.map(sor));
      }
      setStatus('');
    } catch (err) {
      lista.replaceChildren();
      setStatus(err.message || 'Nem sikerült betölteni a listát.', true);
    }
  }

  // A blokk láthatósága a szerepkörtől függ; a lista a beállítások megnyitásakor töltődik
  onChange(() => { blokk.hidden = !isSuperadmin(); });
  blokk.hidden = !isSuperadmin();
  document.getElementById('open-settings-btn')?.addEventListener('click', betolt);
}
