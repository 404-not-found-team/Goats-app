import { callRpc, isSuperadmin, onChange } from '../../auth-service.js';

// Superadmin: a beérkezett jelentések listája, állapotváltás, zárolás és hatósági továbbítás jelölése.
// A jogosultságot minden hívásnál az adatbázis (RPC) ellenőrzi; ez a felület csak
// a superadmin számára mutatja a blokkot. A csoport nevét nem mutatjuk, csak az azonosítóját.
// A zárolt vagy továbbított jelentést a tisztítás (cleanup_old_reports) nem törli.
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

  function gomb(szoveg, onClick, { letiltva = false, primer = true } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = primer ? 'sm-btn sm-btn-save' : 'sm-btn sm-btn-logout';
    b.textContent = szoveg;
    b.disabled = letiltva;
    b.addEventListener('click', onClick);
    return b;
  }

  function sor(jelentes) {
    const zarolt = !!jelentes.megorzes_zarolva;
    const tovabbitva = !!jelentes.hatosagnak_tovabbitva;

    const elem = document.createElement('div');
    elem.className = 'moderalas-sor';
    if (zarolt || tovabbitva) elem.classList.add('jelentes-megorzott');

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

    if (zarolt || tovabbitva) {
      const jelzes = document.createElement('span');
      const reszek = [];
      if (zarolt) reszek.push('zárolva (nem törlődik tisztításkor)');
      if (tovabbitva) {
        reszek.push(`hatóságnak továbbítva: ${new Date(jelentes.hatosagnak_tovabbitva).toLocaleString('hu-HU')}`);
      }
      jelzes.textContent = reszek.join(' · ');
      leiras.appendChild(jelzes);
    }

    if (jelentes.leiras) {
      const szoveg = document.createElement('span');
      szoveg.textContent = `"${jelentes.leiras}"`;
      leiras.appendChild(szoveg);
    }

    const gombok = document.createElement('div');
    gombok.className = 'moderalas-gombok';
    ['folyamatban', 'lezarva'].forEach((allapot) => {
      gombok.appendChild(gomb(STATUSZ_CIMKE[allapot], () => allapotValt(jelentes.id, allapot), {
        letiltva: jelentes.statusz === allapot,
      }));
    });
    gombok.appendChild(gomb(zarolt ? 'Feloldás' : 'Zárolás',
      () => zarolValt(jelentes, !zarolt), { primer: false }));
    gombok.appendChild(gomb(tovabbitva ? 'Továbbítás visszavonása' : 'Hatóságnak továbbítva',
      () => tovabbitValt(jelentes, !tovabbitva), { primer: false }));

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

  // Zárolás/feloldás: a továbbítás jelölése megmarad
  async function zarolValt(jelentes, zarol) {
    try {
      await callRpc('set_report_hold', {
        report_id: jelentes.id,
        hold: zarol,
        forwarded: !!jelentes.hatosagnak_tovabbitva,
      });
      setStatus(zarol ? 'Jelentés zárolva.' : 'Zárolás feloldva.');
      await betolt();
    } catch (err) {
      setStatus(err.message || 'Hiba a zárolás mentésekor.', true);
    }
  }

  // Hatósági továbbítás jelölése/visszavonása: a zárolás állapota megmarad
  async function tovabbitValt(jelentes, tovabbit) {
    if (!tovabbit && !confirm('Biztosan visszavonod a "hatóságnak továbbítva" jelölést?')) return;
    try {
      await callRpc('set_report_hold', {
        report_id: jelentes.id,
        hold: !!jelentes.megorzes_zarolva,
        forwarded: tovabbit,
      });
      setStatus(tovabbit ? 'Megjelölve: hatóságnak továbbítva.' : 'A továbbítási jelölés visszavonva.');
      await betolt();
    } catch (err) {
      setStatus(err.message || 'Hiba a jelölés mentésekor.', true);
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
