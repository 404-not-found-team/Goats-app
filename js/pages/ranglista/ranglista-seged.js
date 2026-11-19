// Ranglista: apró, közös segédek (kategóriák elérése, DOM-elem készítése, billentyűzetes kattintás).

export const K = () => window.italKategoriak;

// Az alkategória-szűrő kulcsa: az alkategória kódja, vagy "<fokód>:egyeb" az alkategória nélküliekre
export const alKulcs = (foKod, alKod) => alKod || `${foKod}:egyeb`;

// Egy nem gomb elem (pl. italkártya, lenyitható fejléc) billentyűzettel is elérhető és megnyomható:
// Tab-bal ráléphető, Enter vagy szóköz ugyanazt csinálja, mint a kattintás
export function billentyuvelKattinthato(elem, muvelet) {
    elem.tabIndex = 0;
    elem.setAttribute('role', 'button');
    elem.addEventListener('click', muvelet);
    elem.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        muvelet();
    });
}

// Új elem szöveggel és osztállyal, textContent-tel (nincs innerHTML)
export function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}
