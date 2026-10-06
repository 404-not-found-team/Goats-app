// Jelentés küldése (FELADAT5): egy közös modal kép, ital vagy csoporttag jelentéséhez.
// Dinamikus import: csak az első jelentésnél töltődik be. A sort az RLS engedélyezi
// (jelento_id = a bejelentkezett felhasználó, a csoport a tagod, óránkénti korlát).
import { client } from '../supabase-client.js';

const LEIRAS_MAX = 1000;
const OKOK = ['gyermekbiztonsag', 'jogellenes', 'zaklatas', 'egyeb'];

let cel = null;      // { cel_tipus, cel_azonosito, group_id }
let bekotve = false;

const get = id => document.getElementById(id);

function statusz(msg, hiba = false) {
  const el = get('jelentes-status');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('status-hiba', hiba);
  el.classList.toggle('status-ok', !hiba && !!msg);
}

function szamlaloFrissit() {
  const leiras = get('jelentes-leiras');
  const sz = get('jelentes-szamlalo');
  if (leiras && sz) sz.textContent = `${leiras.value.length} / ${LEIRAS_MAX}`;
}

function bezar() {
  const modal = get('jelentes-modal');
  if (modal) modal.hidden = true;
}

function kivalasztottOk() {
  const kivalasztott = document.querySelector('input[name="jelentes-ok"]:checked');
  return kivalasztott && OKOK.includes(kivalasztott.value) ? kivalasztott.value : null;
}

async function kuldes() {
  const ok = kivalasztottOk();
  const leiras = (get('jelentes-leiras')?.value || '').trim();
  if (!cel) return;
  if (!ok) return statusz('Válassz okot a jelentéshez.', true);
  if (leiras.length > LEIRAS_MAX) return statusz('A leírás legfeljebb 1000 karakter lehet.', true);

  const gomb = get('jelentes-kuldes');
  if (gomb) gomb.disabled = true;
  statusz('Küldés...');

  const { error } = await client.from('jelentesek').insert({
    group_id: cel.group_id || null,
    cel_tipus: cel.cel_tipus,
    cel_azonosito: cel.cel_azonosito || null,
    ok,
    leiras: leiras || null,
  });

  if (gomb) gomb.disabled = false;
  if (error) {
    // 42501: az RLS elutasította (nem tag, saját tartalom, vagy elérte az óránkénti korlátot)
    const korlat = error.code === '42501';
    console.error('Jelentés küldési hiba:', error);
    return statusz(korlat
      ? 'Ezt most nem lehet jelenteni (óránként legfeljebb 20 jelentés küldhető).'
      : 'Nem sikerült elküldeni a jelentést, próbáld újra később.', true);
  }

  statusz('Köszönjük, a csapat megvizsgálja.');
  cel = null;
}

function bekotes() {
  if (bekotve) return;
  bekotve = true;

  get('jelentes-bezar')?.addEventListener('click', bezar);
  get('jelentes-megse')?.addEventListener('click', bezar);
  get('jelentes-kuldes')?.addEventListener('click', kuldes);
  get('jelentes-leiras')?.addEventListener('input', szamlaloFrissit);
}

// Megnyitja a jelentés-modalt a megadott célra. A hívó (kép, ital, tag) adja meg a célt.
export function jelentesMegnyit({ cel_tipus, cel_azonosito = null, group_id = null }) {
  bekotes();
  cel = { cel_tipus, cel_azonosito, group_id };

  const modal = get('jelentes-modal');
  if (!modal) return;

  const alap = document.querySelector('input[name="jelentes-ok"][value="egyeb"]');
  if (alap) alap.checked = true;
  const leiras = get('jelentes-leiras');
  if (leiras) leiras.value = '';
  szamlaloFrissit();
  statusz('');
  modal.hidden = false;
}
