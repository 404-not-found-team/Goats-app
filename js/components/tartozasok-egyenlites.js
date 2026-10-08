// Tartozások: lenyíló részletek, kölcsönös egyenlítés és visszavonás.
// Dinamikusan importálva a tartozasok.js-ből (FELADAT4 teljesítményszabály): csak akkor töltődik be,
// amikor a felhasználó először kinyit egy sort vagy megnyitja az egyenlítés modalt.

function sajatId() {
  return window.goatsAuth?.getState()?.user?.id || null;
}

function sajatAdmin() {
  return window.goatsAuth?.getState()?.groupRole === 'admin';
}

function fmt(szam) {
  return window.formatFt ? window.formatFt(szam) : `${szam} Ft`;
}

function nev(id) {
  return window.tagNev ? window.tagNev(id) : 'Törölt tag';
}

function nak(nevSzoveg) {
  return window.getNakNek ? window.getNakNek(nevSzoveg) : `${nevSzoveg}-nak`;
}

// A megadott ados–hitelező pár egyedi tartozás-tételeit és az egyenlítési előzményeket
// tölti be, és a kontener elembe rajzolja.
export async function toltsReszleteket(kontener, adosId, hitelezoId) {
  kontener.innerHTML = '<p class="empty-msg">Betöltés...</p>';

  const [reszletekRes, elozmenyekRes] = await Promise.all([
    _supabase.rpc('tartozas_reszletek', { p_a: adosId, p_b: hitelezoId }),
    _supabase
      .from('tartozas_egyenlitesek')
      .select('*')
      .or(`and(fel_a.eq.${adosId},fel_b.eq.${hitelezoId}),and(fel_a.eq.${hitelezoId},fel_b.eq.${adosId})`)
      .order('letrehozva', { ascending: false }),
  ]);

  if (reszletekRes.error || elozmenyekRes.error) {
    kontener.innerHTML = '<p class="empty-msg">A részletek betöltése nem sikerült.</p>';
    console.error('Tartozás-részletek hiba:', reszletekRes.error || elozmenyekRes.error);
    return;
  }

  const tetelek = (reszletekRes.data || []).filter(t => t.ados_id === adosId && t.hitelezo_id === hitelezoId);
  const elozmenyek = elozmenyekRes.data || [];

  const lista = document.createElement('div');
  lista.className = 'tartozas-reszlet-lista';

  if (tetelek.length === 0) {
    lista.innerHTML = '<p class="empty-msg">Nincs megjeleníthető tétel.</p>';
  } else {
    tetelek.forEach(t => {
      const sor = document.createElement('div');
      sor.className = 'tartozas-reszlet-sor';
      if (t.nyitott_osszeg <= 0) sor.classList.add('egyenlitve');

      // Felső sor: szöveg + törlés (ez a mai "kifizetve" mechanizmusa – a sor törlésével jelezzük,
      // hogy a tartozás rendeződött, ugyanúgy, mint a nem összevont kártyáknál eddig is).
      const felsoSor = document.createElement('div');
      felsoSor.className = 'tartozas-reszlet-sor-felso';

      const szoveg = document.createElement('span');
      szoveg.textContent = `${t.miert} – ${fmt(t.eredeti_osszeg)}`;

      const torlesSpan = document.createElement('span');
      torlesSpan.textContent = '🗑️';
      torlesSpan.title = 'Törlés (kifizetve)';
      torlesSpan.className = 'torles-jel';
      torlesSpan.addEventListener('click', () => window.deleteTartozas?.(t.id));

      felsoSor.appendChild(szoveg);
      felsoSor.appendChild(torlesSpan);
      sor.appendChild(felsoSor);

      if (t.nyitott_osszeg <= 0) {
        const jelzes = document.createElement('span');
        jelzes.className = 'tartozas-reszlet-allapot';
        jelzes.textContent = 'egyenlítve';
        sor.appendChild(jelzes);
      } else if (t.nyitott_osszeg < t.eredeti_osszeg) {
        const jelzes = document.createElement('span');
        jelzes.className = 'tartozas-reszlet-allapot';
        jelzes.textContent = `részben egyenlítve · nyitott: ${fmt(t.nyitott_osszeg)}`;
        sor.appendChild(jelzes);
      }

      lista.appendChild(sor);
    });
  }

  kontener.replaceChildren(lista);

  if (elozmenyek.length === 0) return;

  const sajat = sajatId();
  const admin = sajatAdmin();

  // Alapból csukva – csak gombnyomásra épül fel, hogy ne legyen zsúfolt a nézet.
  const elozmenyGomb = document.createElement('button');
  elozmenyGomb.type = 'button';
  elozmenyGomb.className = 'tartozas-egyenlites-elozmenyek-gomb';
  elozmenyGomb.setAttribute('aria-expanded', 'false');
  elozmenyGomb.textContent = `› Egyenlítési előzmények (${elozmenyek.length})`;

  const elozmenyBlokk = document.createElement('div');
  elozmenyBlokk.className = 'tartozas-egyenlites-elozmenyek';
  elozmenyBlokk.hidden = true;

  elozmenyGomb.addEventListener('click', () => {
    const nyitva = !elozmenyBlokk.hidden;
    elozmenyBlokk.hidden = nyitva;
    elozmenyGomb.setAttribute('aria-expanded', String(!nyitva));
    elozmenyGomb.textContent = `${nyitva ? '›' : '⌄'} Egyenlítési előzmények (${elozmenyek.length})`;
  });

  elozmenyek.forEach(e => {
    const sor = document.createElement('div');
    sor.className = 'tartozas-egyenlites-elozmeny-sor';
    if (e.visszavonva) sor.classList.add('visszavonva');

    const datum = e.letrehozva ? new Date(e.letrehozva).toLocaleDateString('hu-HU') : '';
    const szoveg = document.createElement('span');
    szoveg.textContent = e.visszavonva
      ? `${fmt(e.osszeg)} beszámítva (${datum}, ${nev(e.letrehozta)}) – visszavonva`
      : `${fmt(e.osszeg)} beszámítva (${datum}, ${nev(e.letrehozta)})`;
    sor.appendChild(szoveg);

    if (!e.visszavonva && (admin || sajat === e.fel_a || sajat === e.fel_b)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tartozas-egyenlites-visszavon-btn';
      btn.textContent = 'Visszavonás';
      btn.addEventListener('click', async () => {
        if (!confirm('Biztosan visszavonod ezt az egyenlítést? Az érintett tartozások nyitott összege visszaáll.')) return;
        btn.disabled = true;
        const { error } = await _supabase.rpc('tartozas_egyenlites_visszavonasa', { p_egyenlites: e.id });
        if (error) {
          alert(error.message || 'A visszavonás nem sikerült.');
          btn.disabled = false;
          return;
        }
        window.loadTartozasok?.();
      });
      sor.appendChild(btn);
    }

    elozmenyBlokk.appendChild(sor);
  });

  kontener.appendChild(elozmenyGomb);
  kontener.appendChild(elozmenyBlokk);
}

// ---------- Egyenlítés megerősítő modal ----------

function bizonyosodjModalRol() {
  if (document.getElementById('tartozas-egyenlites-modal')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="tartozas-egyenlites-modal" class="sm-overlay" role="dialog" aria-modal="true" aria-labelledby="tartozas-egyenlites-title" hidden>
      <div class="sm-card tartozas-egyenlites-kartya">
        <div class="sm-header">
          <h3 id="tartozas-egyenlites-title">Tartozások egyenlítése</h3>
          <button id="tartozas-egyenlites-close-btn" class="sm-close-btn" type="button">&times;</button>
        </div>
        <div class="sm-body">
          <p id="tartozas-egyenlites-elotte" class="tartozas-egyenlites-sor"></p>
          <p id="tartozas-egyenlites-utana" class="tartozas-egyenlites-sor"></p>
        </div>
        <div class="sm-footer">
          <button id="tartozas-egyenlites-ok-btn" class="sm-btn sm-btn-save sm-btn-lg" type="button">Egyenlítés</button>
        </div>
      </div>
    </div>
  `);

  const modal = document.getElementById('tartozas-egyenlites-modal');
  const zar = () => { modal.hidden = true; };
  document.getElementById('tartozas-egyenlites-close-btn').addEventListener('click', zar);
  modal.addEventListener('click', (e) => { if (e.target === modal) zar(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) zar();
  });
}

// a és b: a két érintett fél (nem kell, hogy a megnyitó felhasználó valamelyikük legyen –
// a tartozások ma is mindenki-mindenkiét-kezeli modellt követnek, bárki csoporttag egyenlíthet).
export function nyitEgyenlitesModal({ aId, aNev, bId, bNev, aTartozikBnek, bTartozikAnak, beszamithato }) {
  bizonyosodjModalRol();
  const modal = document.getElementById('tartozas-egyenlites-modal');

  const bNak = nak(bNev);
  const aNak = nak(aNev);
  const utanaA = Math.max(aTartozikBnek - beszamithato, 0);
  const utanaB = Math.max(bTartozikAnak - beszamithato, 0);

  document.getElementById('tartozas-egyenlites-elotte').textContent =
    `Most: ${aNev} tartozik ${bNak} ${fmt(aTartozikBnek)}, ${bNev} tartozik ${aNak} ${fmt(bTartozikAnak)}.`;
  document.getElementById('tartozas-egyenlites-utana').textContent =
    `Egyenlítés után: ${aNev} tartozik ${bNak} ${fmt(utanaA)}, ${bNev} tartozik ${aNak} ${fmt(utanaB)}. (Beszámítva: ${fmt(beszamithato)})`;

  const okBtn = document.getElementById('tartozas-egyenlites-ok-btn');
  const ujOkBtn = okBtn.cloneNode(true); // az előző megnyitás kattintás-figyelőjének eltávolítása
  okBtn.replaceWith(ujOkBtn);
  ujOkBtn.addEventListener('click', async () => {
    ujOkBtn.disabled = true;
    const { error } = await _supabase.rpc('tartozasok_egyenlitese', { p_a: aId, p_b: bId });
    ujOkBtn.disabled = false;
    if (error) {
      alert(error.message || 'Az egyenlítés nem sikerült.');
      return;
    }
    modal.hidden = true;
    window.loadTartozasok?.();
  });

  modal.hidden = false;
}
