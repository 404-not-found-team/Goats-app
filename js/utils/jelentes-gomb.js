// A "Jelentés" gomb (zászló ikon, currentColor). Szándékosan könnyű modul: a jelentés-modal
// logikája (jelentes.js) csak az első kattintáskor töltődik be.
const SVG_NS = 'http://www.w3.org/2000/svg';

export function jelentesGombElem(onClick) {
  const gomb = document.createElement('button');
  gomb.type = 'button';
  gomb.className = 'jelentes-gomb';
  gomb.setAttribute('aria-label', 'Jelentés');
  gomb.title = 'Jelentés';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const zaszlo = document.createElementNS(SVG_NS, 'path');
  zaszlo.setAttribute('d', 'M5 3v18h2v-7h6l1 2h5V5h-5l-1-2H5z');
  zaszlo.setAttribute('fill', 'currentColor');
  svg.appendChild(zaszlo);

  gomb.appendChild(svg);
  gomb.addEventListener('click', onClick);
  return gomb;
}
