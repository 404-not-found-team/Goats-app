let jatekosok = [];
let osszPontok = [];

window.onload = async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    initGoatsGame();
};

async function initGoatsGame() {
    // A tagok forrása az auth-service élő állapota (RPC-ből töltve), nem a nyers localStorage.
    const allapot = window.goatsAuth ? window.goatsAuth.getState() : null;
    jatekosok = allapot?.group
        ? allapot.members.map(m => m.display_name)
        : JSON.parse(localStorage.getItem('goats_group_members') || '[]');

    osszPontok = new Array(jatekosok.length).fill(0);
    renderTabellaHeaders();
}

function renderTabellaHeaders() {
    const nevekContainer = document.getElementById('nevekOszlop');
    const osszContainer = document.getElementById('osszOszlop');

    if (nevekContainer) {
        nevekContainer.innerHTML = '<div class="fejlec">Név</div>';
        jatekosok.forEach(nev => {
            const div = document.createElement('div');
            div.className = 'nev';
            div.textContent = nev;
            nevekContainer.appendChild(div);
        });
    }

    if (osszContainer) {
        osszContainer.innerHTML = '<div class="fejlec">Összpont</div>';
        jatekosok.forEach(() => {
            const div = document.createElement('div');
            div.className = 'pontOssz';
            div.textContent = '0';
            osszContainer.appendChild(div);
        });
    }
}

function hexToRgba(hex, alpha = 0.75) {
    if (!hex) return `rgba(76, 175, 80, ${alpha})`;
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;

    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return `rgba(76, 175, 80, ${alpha})`;

    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function openUjJatekModal() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = false;
        document.getElementById('ujJatekNevInput').focus();
    }
}

function closeUjJatekModal() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = true;
        document.getElementById('ujJatekNevInput').value = '';
    }
}

window.addEventListener('click', function (event) {
    const modal = document.getElementById('ujJatekModal');
    if (event.target === modal) {
        closeUjJatekModal();
    }
});

function mentUjJatek() {
    const nevInput = document.getElementById('ujJatekNevInput');
    const szinInput = document.getElementById('ujJatekSzinInput');

    const jatekNev = nevInput.value.trim();
    const szin = szinInput.value;

    if (!jatekNev) {
        alert('Kérlek add meg a játék nevét!');
        return;
    }

    renderJatekKartya(jatekNev, szin);
    closeUjJatekModal();
}

function renderJatekKartya(jatekNev, szin) {
    const jatekLista = document.getElementById('jatekLista');
    if (!jatekLista) return;

    const jatekElem = document.createElement('div');
    jatekElem.className = 'jatek-elem';

    jatekElem.aktivOszlopok = [];

    const span = document.createElement('span');
    span.textContent = jatekNev.toUpperCase();

    const gombokKontener = document.createElement('div');
    gombokKontener.className = 'jatek-gombok';

    const pontGomb = document.createElement('button');
    pontGomb.className = 'teljesit-gomb';
    pontGomb.textContent = 'Kész';
    pontGomb.addEventListener('click', function (e) {
        ujJatekHozzaadasa(jatekNev, szin, e.currentTarget, jatekElem);
    });

    const torlesGomb = document.createElement('span');
    torlesGomb.className = 'torles-gomb';
    torlesGomb.textContent = '🗑️';
    torlesGomb.addEventListener('click', function () {
        if (confirm('Biztosan törölni szeretnéd ezt a játékot és a hozzá tartozó pontokat a tabellából?')) {
            [...jatekElem.aktivOszlopok].forEach(obj => {
                jatekTorlese(obj.oszlopElem, obj.pontok, pontGomb, jatekElem);
            });
            jatekElem.remove();
        }
    });

    gombokKontener.appendChild(pontGomb);
    gombokKontener.appendChild(torlesGomb);

    jatekElem.appendChild(span);
    jatekElem.appendChild(gombokKontener);

    jatekLista.appendChild(jatekElem);
}

function ujJatekHozzaadasa(jatekNev, szin, gombElem, jatekElem) {
    if (jatekosok.length === 0) {
        alert('Nincsenek betöltve játékosok!');
        return;
    }

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

    renderOszlop(jatekNev, szin, pontokTombja, gombElem, jatekElem);
    frissitOsszpontszamot(pontokTombja, 'hozzaadas');

    if (gombElem) {
        gombElem.disabled = true;
        gombElem.innerText = "Kész ✓";
    }
}

function renderOszlop(jatekNev, szin, pontokTombja, gombElem, jatekElem) {
    const kontener = document.getElementById('pontJatekOszlopok');
    const ujOszlop = document.createElement('div');
    ujOszlop.className = 'tablazat szines-jatek-oszlop';

    ujOszlop.classList.add('szines-oszlop-hatter', szinOsztaly(hexToRgba(szin, 0.75)));

    // A játék neve felhasználói bevitel: textContent-tel kerül be, nem innerHTML-lel (XSS)
    const fejlec = document.createElement('div');
    fejlec.className = 'fejlec';
    fejlec.title = jatekNev;

    const nevSpan = document.createElement('span');
    nevSpan.textContent = jatekNev;

    const torlesSpan = document.createElement('span');
    torlesSpan.className = 'torles-gomb';
    torlesSpan.title = 'Törlés';
    torlesSpan.textContent = '🗑️';

    fejlec.append(nevSpan, torlesSpan);
    ujOszlop.appendChild(fejlec);

    pontokTombja.forEach(p => {
        const sor = document.createElement('div');
        sor.textContent = String(p);
        ujOszlop.appendChild(sor);
    });

    if (jatekElem && jatekElem.aktivOszlopok) {
        jatekElem.aktivOszlopok.push({ oszlopElem: ujOszlop, pontok: pontokTombja });
    }

    const deleteBtn = ujOszlop.querySelector('.torles-gomb');
    deleteBtn.addEventListener('click', () => {
        jatekTorlese(ujOszlop, pontokTombja, gombElem, jatekElem);
    });

    kontener.appendChild(ujOszlop);
}

function jatekTorlese(oszlopElem, pontokTombja, gombElem, jatekElem) {
    oszlopElem.remove();
    frissitOsszpontszamot(pontokTombja, 'kivonas');

    if (jatekElem && jatekElem.aktivOszlopok) {
        jatekElem.aktivOszlopok = jatekElem.aktivOszlopok.filter(item => item.oszlopElem !== oszlopElem);
    }

    if (gombElem) {
        gombElem.disabled = false;
        gombElem.innerText = "Kész";
    }
}

function frissitOsszpontszamot(pontokTombja, muvelet) {
    const pontOsszElemek = document.querySelectorAll('.pontOssz');

    for (let i = 0; i < jatekosok.length; i++) {
        if (muvelet === 'hozzaadas') {
            osszPontok[i] += pontokTombja[i];
        } else if (muvelet === 'kivonas') {
            osszPontok[i] -= pontokTombja[i];
        }

        if (pontOsszElemek[i]) {
            pontOsszElemek[i].innerText = osszPontok[i];
        }
    }
}