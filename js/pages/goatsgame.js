const jatekosok = ['Ákos', 'Feri', 'Zalán', 'Zoli'];
let osszPontok = [0, 0, 0, 0];

function ujJatekHozzaadasa(jatekNev, szin) {
    let pontokTombja = [];

    for (let i = 0; i < jatekosok.length; i++) {
        let bekeres = prompt(`Hány pontot ért el ${jatekosok[i]} (${jatekNev})?`, "0");

        if (bekeres === null) {
            return; 
        }

        let pont = Number(bekeres);
        if (isNaN(pont)) {
            pont = 0;
        }

        pontokTombja.push(pont);
    }

    const kontener = document.getElementById('pontJatekOszlopok');
    const ujOszlop = document.createElement('div');
    ujOszlop.className = 'tablazat szines-jatek-oszlop';
    ujOszlop.style.backgroundColor = szin;

    const gomb = window.event && window.event.target ? window.event.target : null;

    ujOszlop.innerHTML = `
        <div class="fejlec" title="${jatekNev}">
            <span>${jatekNev}</span>
            <span class="torles-gomb" title="Törlés">🗑️</span>
        </div>
        <div>${pontokTombja[0]}</div>
        <div>${pontokTombja[1]}</div>
        <div>${pontokTombja[2]}</div>
        <div>${pontokTombja[3]}</div>
    `;

    const deleteBtn = ujOszlop.querySelector('.torles-gomb');
    deleteBtn.addEventListener('click', () => {
        jatekTorlese(ujOszlop, pontokTombja, gomb);
    });

    kontener.appendChild(ujOszlop);

    frissitOsszpontszamot(pontokTombja, 'hozzaadas');
    if (gomb) {
        gomb.disabled = true;
        gomb.innerText = "Kész ✓";
    }
}

function jatekTorlese(oszlopElem, pontokTombja, gombElem) {
    oszlopElem.remove();
    frissitOsszpontszamot(pontokTombja, 'kivonas');

    if (gombElem) {
        gombElem.disabled = false;
        gombElem.innerText = "Kész";
    }
}
function frissitOsszpontszamot(pontokTombja, muvelet) {
    const pontOsszElemek = document.querySelectorAll('.pontOssz');

    for (let i = 0; i < 4; i++) {
        if (muvelet === 'hozzaadas') {
            osszPontok[i] += pontokTombja[i];
        } else if (muvelet === 'kivonas') {
            osszPontok[i] -= pontokTombja[i];
        }
        pontOsszElemek[i].innerText = osszPontok[i];
    }
}