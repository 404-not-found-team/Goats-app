// Teljes képernyős „Új az appban" üdvözlő a FŐOLDALON, CSAK TELEFONON. Akkor jelenik meg, ha a
// legfrissebb újdonság-bejegyzést (tesztelok-ujdonsagok.js) a felhasználó még nem látta ezen az eszközön.
// A „látta" állapot a legfrissebb bejegyzés dátuma, localStorage-ban (eszközönként). Gépen nincs: ott
// a sima Újdonságok oldal (ujdonsagok.html) marad. A TOS-újraelfogadás elsőbbséget élvez: amíg az kell,
// ez nem ugrik fel; az elfogadás után (onChange) próbálkozik újra.
import { UJDONSAGOK } from '../tesztelok/tesztelok-ujdonsagok.js';
import { onChange, isTosUjraelfogadasSzukseges } from '../../hitelesites.js';

const TAROLO_KULCS = 'goats_ujdonsag_latva';
const telefon = () => window.matchMedia('(max-width: 768px)').matches;

function olvas() {
    try { return localStorage.getItem(TAROLO_KULCS); } catch { return null; }
}
function latvaMent(datum) {
    try { localStorage.setItem(TAROLO_KULCS, datum); } catch { /* privát mód: csak ebben a munkamenetben nem jön fel újra */ }
}

// Ugyanaz a dátumformázás, mint az Újdonságok oldalon (a választott nyelv szerint)
function datumSzoveg(iso) {
    const [ev, ho, nap] = String(iso).split('-').map(Number);
    const locale = window.goatsNyelv?.locale?.() || 'hu-HU';
    return new Date(ev, ho - 1, nap).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

function elem(tag, osztaly, szoveg) {
    const e = document.createElement(tag);
    if (osztaly) e.className = osztaly;
    if (szoveg != null) e.textContent = szoveg;
    return e;
}

// Statikus (nem felhasználói) SVG ikon egy span-ben
function ikon(svg) {
    const s = document.createElement('span');
    s.className = 'ujd-ikon';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = svg;
    return s;
}
const CSILLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"></path></svg>';
const PIPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';

let nyitva = false;
let elozoFokusz = null;

function bezar(overlay, datum) {
    latvaMent(datum);
    overlay.remove();
    document.body.classList.remove('ujd-kepernyo-nyitva');
    nyitva = false;
    if (elozoFokusz && document.contains(elozoFokusz)) elozoFokusz.focus();
}

function mutat(bejegyzes) {
    const ny = window.goatsNyelv?.aktualis?.() || 'hu';
    const pontok = bejegyzes[ny] || bejegyzes.en || bejegyzes.hu || [];

    const overlay = elem('div', 'ujd-kepernyo');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ujd-kepernyo-cim');

    const panel = elem('div', 'ujd-kepernyo-panel');

    // Fejléc: ikon, cím, dátum
    const fej = elem('div', 'ujd-kepernyo-fej');
    const ikonKor = elem('span', 'ujd-ikon-kor');
    ikonKor.setAttribute('aria-hidden', 'true');
    ikonKor.appendChild(ikon(CSILLAG));
    const cim = elem('h1', 'ujd-kepernyo-cim', tr('ujd_screen_title', 'Új az appban'));
    cim.id = 'ujd-kepernyo-cim';
    const datum = elem('p', 'ujd-kepernyo-datum', datumSzoveg(bejegyzes.datum));
    fej.append(ikonKor, cim, datum);

    // Pontok
    const lista = elem('ul', 'ujd-kepernyo-lista');
    pontok.forEach((szoveg) => {
        const li = elem('li', 'ujd-kepernyo-sor');
        li.append(ikon(PIPA), elem('span', 'ujd-kepernyo-sor-szoveg', szoveg));
        lista.appendChild(li);
    });

    // Gombok
    const gombok = elem('div', 'ujd-kepernyo-gombok');
    const ertem = elem('button', 'ujd-kepernyo-fo', tr('ujd_screen_got_it', 'Értem'));
    ertem.type = 'button';
    ertem.addEventListener('click', () => bezar(overlay, bejegyzes.datum));
    const osszes = elem('a', 'ujd-kepernyo-link', tr('ujd_screen_all', 'Összes újdonság'));
    osszes.href = 'ujdonsagok.html';
    osszes.addEventListener('click', () => latvaMent(bejegyzes.datum));
    gombok.append(ertem, osszes);

    panel.append(fej, lista, gombok);
    overlay.appendChild(panel);

    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); bezar(overlay, bejegyzes.datum); }
    });

    elozoFokusz = document.activeElement;
    document.body.appendChild(overlay);
    document.body.classList.add('ujd-kepernyo-nyitva');
    nyitva = true;
    ertem.focus();
}

function probal() {
    if (nyitva) return;
    if (!telefon() || !UJDONSAGOK.length) return;
    if (!window.goatsAuth?.getState?.()?.user) return; // csak bejelentkezve (a főoldal amúgy is az)
    if (isTosUjraelfogadasSzukseges()) return;          // előbb a feltételek újraelfogadása
    const legujabb = UJDONSAGOK[0].datum;
    if (olvas() === legujabb) return;                   // ezt a bejegyzést már látta ezen az eszközön
    mutat(UJDONSAGOK[0]);
}

// Bejelentkezés / TOS-elfogadás után az onChange újra lefuttatja; a betöltéskori állapotot is nézzük
onChange(probal);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', probal);
else probal();
