// Dinamikus színek CSS-osztályként, inline style helyett (FELADAT2 0. pont).
// A színt a JS adja, a megjelenítést a CSS végzi: szinOsztaly(szin) egy osztálynevet ad,
// amely a --szin CSS-változót állítja be. A szabályt egy konstruált stíluslapban
// generáljuk, így a CSP style-src szabály nem blokkolja (nincs <style> elem és
// nincs style attribútum).
// Klasszikus script (nem modul): window.szinOsztaly-n keresztül érhető el.
(function () {
    const ENGEDETT = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
    const ismert = new Set();
    let lap = null;

    function stiluslap() {
        if (lap) return lap;
        if ('adoptedStyleSheets' in Document.prototype && typeof CSSStyleSheet === 'function') {
            lap = new CSSStyleSheet();
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, lap];
        } else {
            // Régi böngésző: a főoldal már betöltött stíluslapjába szúrunk szabályt (CSSOM, nem <style>)
            lap = document.styleSheets[0];
        }
        return lap;
    }

    window.szinOsztaly = function (szin) {
        if (!ENGEDETT.test(String(szin || '').trim())) return 'szin-ures';
        const nev = 'szin-' + String(szin).trim().replace(/[^a-zA-Z0-9]/g, '_');
        if (!ismert.has(nev)) {
            ismert.add(nev);
            const sl = stiluslap();
            sl.insertRule(`.${nev} { --szin: ${String(szin).trim()}; }`, sl.cssRules.length);
        }
        return nev;
    };
})();
