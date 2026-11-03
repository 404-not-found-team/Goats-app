// HTML-ből kötött eseménykezelők, inline onclick/onchange/oninput nélkül (a CSP script-src 'self' ezeket tiltja).
// Használat a HTML-ben:
//   <button data-katt="nyisdSzuroModal">           -> kattintásra: nyisdSzuroModal()
//   <button data-katt="kategoriatValaszt" data-arg="S">  -> kategoriatValaszt('S')
//   <select data-valtozas="formaValtozott">         -> change eseményre
//   <input data-bevitel="kepElonezetFrissit">       -> input eseményre
// A függvény az oldal klasszikus scriptjének globális függvénye; a nevét a kattintáskor keresi meg,
// így a kötés sorrendje mindegy. A data-arg számként megy át, ha egész szám (pl. data-arg="1").
// Klasszikus script defer-rel: a DOM addigra felépült, de a többi defer script még nem feltétlenül futott le.
(function () {
    const ESEMENYEK = { katt: 'click', valtozas: 'change', bevitel: 'input' };

    function argumentum(elem) {
        if (!elem.hasAttribute('data-arg')) return [];
        const ertek = elem.getAttribute('data-arg');
        return [/^-?\d+$/.test(ertek) ? Number(ertek) : ertek];
    }

    Object.entries(ESEMENYEK).forEach(([kulcs, esemeny]) => {
        document.querySelectorAll(`[data-${kulcs}]`).forEach(elem => {
            const nev = elem.getAttribute(`data-${kulcs}`);
            elem.addEventListener(esemeny, () => {
                const fn = window[nev];
                if (typeof fn === 'function') fn(...argumentum(elem));
                else console.error(`Nincs ilyen függvény: ${nev}`);
            });
        });
    });
})();
