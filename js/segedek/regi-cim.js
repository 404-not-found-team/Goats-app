// A 404-oldal (404.html) scriptje: a régi oldalcímeket az új helyükre küldi tovább (html/pages/,
// html/jogi/), így a régi linkek, könyvjelzők és a Play Console-ban megadott címek is működnek.
// Kétféle régi cím van: a mappa nélküli (pl. .../kepek.html, .../privacy.html) és a korábbi
// oldalak/ és jogi/ mappás (pl. .../oldalak/kepek.html, .../jogi/privacy.html).
// A GitHub Pages minden nem létező címre a 404.html-t adja vissza, ezért itt az útvonalból döntünk.
// Klasszikus, szinkron script a <head>-ben: még a kirajzolás előtt átirányít. Az app gyökerét e script
// helyéből számoljuk (js/segedek/ -> ../../), lásd js/segedek/utvonal.js.
(function () {
    const GYOKER = new URL('../../', document.currentScript.src);
    const OLDALAK = ['app', 'admin', 'goatsgame', 'hanynapja', 'jatekszabalyok', 'kepek', 'ranglista',
        'tartozasok', 'tervek', 'tesztelok', 'ujdonsagok'];
    const JOGI = ['privacy', 'felhasznalasi-feltetelek', 'fiok-torles', 'impresszum'];

    const UJ_HELY = { 'jogi.html': 'html/jogi/', 'jogi/': 'html/jogi/', 'jogi/index.html': 'html/jogi/' };
    for (const o of OLDALAK) {
        UJ_HELY[`${o}.html`] = `html/pages/${o}.html`;
        UJ_HELY[`oldalak/${o}.html`] = `html/pages/${o}.html`;
    }
    for (const j of JOGI) {
        UJ_HELY[`${j}.html`] = `html/jogi/${j}.html`;
        UJ_HELY[`jogi/${j}.html`] = `html/jogi/${j}.html`;
    }

    const regi = location.pathname.slice(GYOKER.pathname.length);
    const uj = UJ_HELY[regi] || (regi === 'jogi' ? 'html/jogi/' : null);
    if (uj) location.replace(new URL(uj, GYOKER).href + location.search + location.hash);
})();
