import { callRpc, isSuperadmin, onChange } from '../../auth-service.js';

// Superadmin: a beérkezett jelentések listája és állapotváltása.
// A jogosultságot minden hívásnál az adatbázis (RPC) ellenőrzi; ez a felület csak
// a superadmin számára mutatja a blokkot. A csoport nevét nem mutatjuk, csak az azonosítóját.
const CEL_CIMKE = { kep: 'Kép', ital: 'Ital', tag: 'Csoporttag', egyeb: 'Egyéb' };
const OK_CIMKE = {
  gyermekbiztonsag: 'Gyermekbiztonsági aggály (CSAE/CSAM)',
  jogellenes: 'Jogellenes vagy sértő tartalom',
  zaklatas: 'Zaklatás',
  egyeb: 'Egyéb',
};
const STATUSZ_CIMKE = { uj: 'Új', folyamatban: 'Folyamatban', lezarva: 'Lezárva' };

export function initReportModeration() {
  const blokk = document.getElementById('report-moderation');
  const lista = document.getElementById('reports-list');
  const statusz = document.getElementById('reports-status');
  if (!blokk || !lista) return;

  const setStatus = (msg, hiba = false) => {
    if (!statusz) return;
    statusz.textContent = msg || '';
    statusz.classList.toggle('hiba', hiba);
  };

  function sor(jelentes) {
    const elem = document.createElement('div');
    elem.className = 'moderalas-sor';

    const leiras = document.createElement('div');
    leiras.className = 'moderalas-leiras';
    const cim = document.createElement('strong');
    cim.textContent = `${CEL_CIMKE[jelentes.cel_tipus] || jelentes.cel_tipus} · ${OK_CIMKE[jelentes.ok] || jelentes.ok}`;
    const reszlet = document.createElement('span');
    const idopont = new Date(jelentes.letrehozva).toLocaleString('hu-HU');
    const csoport = jelentes.group_id ? `csoport: ${jelentes.group_id}` : 'csoport: nincs (törölt)';
    const cel = jelentes.cel_azonosito ? `célazonosító: ${jelentes.cel_azonosito}` : 'célazonosító: –';
    reszlet.textContent = `${idopont} · ${csoport} · ${cel} · állapot: ${STATUSZ_CIMKE[jelentes.statusz] || jelentes.statusz}`;
    leiras.append(cim, reszlet);

    if (jelentes.leiras) {
      const szoveg = document.createElement('span');
      szoveg.textContent = `"${jelentes.leiras}"`;
      leiras.appendChild(szoveg);
    }

    const gombok = document.createElement('div');
    gombok.className = 'moderalas-gombok';
    ['folyamatban', 'lezarva'].forEach((allapot) => {
      const gomb = document.createElement('button');
      gomb.type = 'button';
      gomb.className = 'sm-btn sm-btn-save';
      gomb.textContent = STATUSZ_CIMKE[allapot];
      gomb.disabled = jelentes.statusz === allapot;
      gomb.addEventListener('click', () => allapotValt(jelentes.id, allapot));
      gombok.appendChild(gomb);
    });

    elem.append(leiras, gombok);
    return elem;
  }

  async function allapotValt(id, ujAllapot) {
    try {
      await callRpc('set_report_status', { report_id: id, new_status: ujAllapot });
      setStatus('Állapot mentve.');
      await betolt();
    } catch (err) {
      setStatus(err.message || 'Hiba az állapot mentésekor.', true);
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
      const rows = await callRpc('list_reports', {});
      if (!rows || rows.length === 0) {
        const ures = document.createElement('p');
        ures.className = 'moderalas-ures';
        ures.textContent = 'Nincs beérkezett jelentés.';
        lista.replaceChildren(ures);
      } else {
        lista.replaceChildren(...rows.map(sor));
      }
      setStatus('');
    } catch (err) {
      lista.replaceChildren();
      setStatus(err.message || 'Nem sikerült betölteni a jelentéseket.', true);
    }
  }

  // A blokk láthatósága a szerepkörtől függ; a lista a beállítások megnyitásakor töltődik
  onChange(() => { blokk.hidden = !isSuperadmin(); });
  blokk.hidden = !isSuperadmin();
  document.getElementById('open-settings-btn')?.addEventListener('click', betolt);
}
