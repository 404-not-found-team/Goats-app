// A 404-oldal (404.html) scriptje: a régi, mappa nélküli címeket (pl. .../kepek.html, .../privacy.html)
// az új helyükre küldi tovább (oldalak/, jogi/), így a régi linkek és könyvjelzők is működnek.
// A GitHub Pages minden nem létező címre a 404.html-t adja vissza, ezért itt az útvonalból döntünk.
// Klasszikus, szinkron script a <head>-ben: még a kirajzolás előtt átirányít. Az app gyökerét e script
// helyéből számoljuk (js/segedek/ -> ../../), lásd js/segedek/utvonal.js.
(function () {
    const GYOKER = new URL('../../', document.currentScript.src);
    const UJ_HELY = {
        'app.html': 'oldalak/app.html',
        'admin.html': 'oldalak/admin.html',
        'goatsgame.html': 'oldalak/goatsgame.html',
        'hanynapja.html': 'oldalak/hanynapja.html',
        'jatekszabalyok.html': 'oldalak/jatekszabalyok.html',
        'kepek.html': 'oldalak/kepek.html',
        'ranglista.html': 'oldalak/ranglista.html',
        'tartozasok.html': 'oldalak/tartozasok.html',
        'tervek.html': 'oldalak/tervek.html',
        'tesztelok.html': 'oldalak/tesztelok.html',
        'ujdonsagok.html': 'oldalak/ujdonsagok.html',
        'jogi.html': 'jogi/',
        'privacy.html': 'jogi/privacy.html',
        'felhasznalasi-feltetelek.html': 'jogi/felhasznalasi-feltetelek.html',
        'fiok-torles.html': 'jogi/fiok-torles.html',
        'impresszum.html': 'jogi/impresszum.html',
    };
    const regi = location.pathname.slice(GYOKER.pathname.length);
    const uj = UJ_HELY[regi];
    if (uj) location.replace(new URL(uj, GYOKER).href + location.search + location.hash);
})();
