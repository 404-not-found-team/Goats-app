// Nyilvános Újdonságok oldal (ujdonsagok.html): a változásnapló dátum szerint, a legfrissebb felül.
// Az adat ugyanaz, mint a tesztelőoldalé (js/pages/tesztelok-ujdonsagok.js); ha egy bejegyzésből
// hiányzik a választott nyelv, az angol, végül a magyar jelenik meg.
import { UJDONSAGOK } from './tesztelok-ujdonsagok.js';

function datumSzoveg(iso) {
    const [ev, ho, nap] = iso.split('-').map(Number);
    const locale = window.goatsNyelv?.locale?.() || 'hu-HU';
    return new Date(ev, ho - 1, nap).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

function kirajzol() {
    const doboz = document.getElementById('ujdonsag-lista');
    if (!doboz) return;
    const ny = window.goatsNyelv?.aktualis?.() || 'hu';
    const elemek = UJDONSAGOK.map((bejegyzes, i) => {
        const szakasz = document.createElement('section');
        szakasz.className = 'ujdonsag-bejegyzes';

        const cim = document.createElement('h4');
        const datum = document.createElement('time');
        datum.dateTime = bejegyzes.datum;
        datum.textContent = datumSzoveg(bejegyzes.datum);
        cim.append(datum);
        if (i === 0) {
            const jel = document.createElement('span');
            jel.className = 'ujdonsag-uj-jel';
            jel.textContent = tr('tst_new_badge', 'Új');
            cim.append(' ', jel);
        }

        const ul = document.createElement('ul');
        (bejegyzes[ny] || bejegyzes.en || bejegyzes.hu).forEach((szoveg) => {
            const li = document.createElement('li');
            li.textContent = szoveg;
            ul.append(li);
        });
        szakasz.append(cim, ul);
        return szakasz;
    });
    doboz.replaceChildren(...elemek);
}

kirajzol();
