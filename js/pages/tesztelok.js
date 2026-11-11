// Tesztelőoldal (tesztelok.html): nyilvános, bejelentkezés nélkül is működik.
// Feladata: az "Újdonságok" idővonal kirajzolása a kiválasztott nyelven, és a lábléci nyelvváltó.
import { UJDONSAGOK } from './tesztelok-ujdonsagok.js';

// az újdonságok magyarul, angolul és németül vannak meg; ha egy bejegyzésből hiányzik a nyelv, az angol jelenik meg
function nyelv() {
    const ny = window.goatsNyelv?.aktualis?.();
    return ['hu', 'en', 'de'].includes(ny) ? ny : 'en';
}

function datumSzoveg(iso) {
    const [ev, ho, nap] = iso.split('-').map(Number);
    const locale = window.goatsNyelv?.locale?.() || 'hu-HU';
    return new Date(ev, ho - 1, nap).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

function kirajzolUjdonsagokat() {
    const lista = document.getElementById('to-ujdonsag-lista');
    if (!lista) return;
    const kod = nyelv();
    // a tesztelőoldalon csak a legutóbbi 5 kiadás; a teljes lista az Újdonságok oldalon (ujdonsagok.html)
    const elemek = UJDONSAGOK.slice(0, 5).map((bejegyzes, i) => {
        const li = document.createElement('li');
        if (i === 0) li.className = 'friss';

        const datum = document.createElement('time');
        datum.className = 'to-datum';
        datum.dateTime = bejegyzes.datum;
        datum.textContent = datumSzoveg(bejegyzes.datum);
        li.append(datum);

        if (i === 0) {
            const jel = document.createElement('span');
            jel.className = 'to-uj-jel';
            jel.textContent = tr('tst_new_badge', 'Új');
            li.append(jel);
        }

        const ul = document.createElement('ul');
        (bejegyzes[kod] || bejegyzes.en || bejegyzes.hu).forEach((szoveg) => {
            const pont = document.createElement('li');
            pont.textContent = szoveg;
            ul.append(pont);
        });
        li.append(ul);
        return li;
    });
    lista.replaceChildren(...elemek);
}

function kezelNyelvvaltot() {
    const gombok = [...document.querySelectorAll('[data-nyelv]')];
    const jelol = () => gombok.forEach((g) => g.setAttribute('aria-pressed', String(g.dataset.nyelv === window.goatsNyelv?.aktualis?.())));
    gombok.forEach((g) => g.addEventListener('click', () => window.goatsNyelv?.valt?.(g.dataset.nyelv)));
    jelol();
    window.goatsNyelv?.onValtozas?.(() => {
        jelol();
        kirajzolUjdonsagokat();
    });
}

kirajzolUjdonsagokat();
kezelNyelvvaltot();
