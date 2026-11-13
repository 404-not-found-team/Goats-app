// Útvonalak az app gyökeréhez (ahol az index.html van) viszonyítva.
// Az oldalak almappákban vannak (oldalak/, jogi/), a JS-ből írt relatív cím (location.replace,
// link.href, fetch) viszont mindig az éppen megnyitott oldalhoz képest oldódik fel. Ezért a JS
// mindig ezen keresztül hivatkozik oldalra vagy fájlra: ut('oldalak/kepek.html').
// A gyökeret ennek a fájlnak a helyéből számoljuk (js/segedek/ -> két szinttel feljebb), így
// élesben (/Goats-app/) és helyi szerveren (/) is jó.
// A klasszikus (nem modul) scriptek ugyanezt a document.currentScript.src-ből számolják.

export const GYOKER = new URL('../../', import.meta.url);

// Gyökérhez viszonyított útvonalból teljes cím, pl. ut('oldalak/kepek.html')
export function ut(utvonal) {
    return new URL(utvonal, GYOKER).href;
}

// A megnyitott oldal gyökérhez viszonyított útvonala, pl. 'oldalak/kepek.html'.
// Mappára végződő cím esetén az index.html: a kezdőlap 'index.html', a jogi főoldal 'jogi/index.html'.
export function aktualisOldal() {
    const utvonal = location.pathname.slice(GYOKER.pathname.length);
    return !utvonal || utvonal.endsWith('/') ? utvonal + 'index.html' : utvonal;
}
