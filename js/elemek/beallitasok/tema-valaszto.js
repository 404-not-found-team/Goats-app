// Témaválasztó a beállításokban: minden téma egy kártya, ami a saját színeivel mutatja a témát
// (a kártya data-theme attribútumot kap, a színeket a css/base/valtozok.css adja; css/elemek/valaszto-kartyak.css).
// A téma helyben (localStorage: goats_theme) tárolódik; az alapértelmezett a js/segedek/tema.js-ben van.

const ALAP_TEMA = 'discord-purple';

const temak = () => [
  { id: 'discord-purple', name: tr('theme_purple', 'Mélylila') },
  { id: 'dark', name: tr('theme_dark', 'Sötét') },
  { id: 'light', name: tr('theme_light', 'Világos') },
  { id: 'discord-brown', name: tr('theme_brown', 'Barna') },
  { id: 'cyberpunk', name: tr('theme_neon', 'Neon') },
];

function aktualisTema() {
  try { return localStorage.getItem('goats_theme') || ALAP_TEMA; } catch { return ALAP_TEMA; }
}

function ujElem(tag, osztaly) {
  const e = document.createElement(tag);
  if (osztaly) e.className = osztaly;
  return e;
}

function temaKartya(tema) {
  const gomb = ujElem('button', 'valaszto-kartya tema-kartya');
  gomb.type = 'button';
  gomb.setAttribute('role', 'radio');
  gomb.dataset.theme = tema.id; // a kártyán belül ennek a témának a színei érvényesek
  gomb.dataset.tema = tema.id;

  const elonezet = ujElem('span', 'tema-elonezet');
  elonezet.setAttribute('aria-hidden', 'true');
  elonezet.append(ujElem('span', 'tema-elonezet-sor'), ujElem('span', 'tema-elonezet-sor rovid'), ujElem('span', 'tema-elonezet-gomb'));

  const nev = ujElem('span', 'valaszto-nev');
  nev.textContent = tema.name;

  gomb.append(elonezet, nev);
  return gomb;
}

export function initThemePicker() {
  const racs = document.getElementById('tema-kartyak');
  if (!racs) return;

  function jelol() {
    const aktualis = aktualisTema();
    racs.querySelectorAll('.tema-kartya').forEach(k =>
      k.setAttribute('aria-checked', String(k.dataset.tema === aktualis)));
  }

  racs.replaceChildren(...temak().map(tema => {
    const kartya = temaKartya(tema);
    kartya.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', tema.id);
      try { localStorage.setItem('goats_theme', tema.id); } catch { /* privát mód: csak erre a megnyitásra */ }
      jelol();
    });
    return kartya;
  }));
  jelol();
}
