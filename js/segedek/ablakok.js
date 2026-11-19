// Az app saját üzenetei és megerősítő ablakai a böngésző alert() / confirm() / prompt() helyett.
// A main.js tölti be minden bejelentkezett oldalon, és window.goatsAblak-ként is elérhető
// (a klasszikus scripteknek). Mind a négy függvény az app témájának színeit használja (css/elemek/ablakok.css).
//
//   toast(szoveg, tipus)                 rövid sáv alul, magától eltűnik; tipus: 'ok' | 'hiba' | 'info'
//   megerosites(szoveg, { gomb, veszely }) kérdés Mégse + művelet gombbal  → Promise<boolean>
//   begepeloMegerosites({ szoveg, szo, gomb }) csak a szó/név beírása után engedi → Promise<boolean>
//   pontBekeres({ cim, jatekosok })      Goats Game: minden játékos pontja egy ablakban → Promise<tomb|null>

const t = (kulcs, alap, parameterek) => (window.tr ? window.tr(kulcs, alap, parameterek) : alap);

function elem(tag, osztaly, szoveg) {
    const e = document.createElement(tag);
    if (osztaly) e.className = osztaly;
    if (szoveg !== undefined) e.textContent = szoveg;
    return e;
}

// ---------- Toast ----------

const TOAST_IDO = { ok: 3000, info: 4000, hiba: 6000 };
const TOAST_JEL = { ok: '✓', info: 'i', hiba: '✕' };

function toastSav() {
    let sav = document.querySelector('.toast-sav');
    if (!sav) {
        sav = elem('div', 'toast-sav');
        document.body.appendChild(sav);
    }
    return sav;
}

export function toast(szoveg, tipus = 'info') {
    if (!szoveg) return;
    if (!TOAST_IDO[tipus]) tipus = 'info';
    const doboz = elem('div', `toast toast-${tipus}`);
    // a hibát a képernyőolvasó azonnal felolvassa, a többit amikor sorra kerül
    doboz.setAttribute('role', tipus === 'hiba' ? 'alert' : 'status');
    const jel = elem('span', 'toast-jel', TOAST_JEL[tipus]);
    jel.setAttribute('aria-hidden', 'true');
    const uzenet = elem('span', 'toast-szoveg', String(szoveg));
    const bezar = elem('button', 'toast-bezar', '×');
    bezar.type = 'button';
    bezar.setAttribute('aria-label', t('close', 'Bezárás'));
    doboz.append(jel, uzenet, bezar);

    let idozito;
    const eltuntet = () => {
        clearTimeout(idozito);
        doboz.classList.add('eltunik');
        setTimeout(() => doboz.remove(), 200);
    };
    bezar.addEventListener('click', eltuntet);
    toastSav().appendChild(doboz);
    idozito = setTimeout(eltuntet, TOAST_IDO[tipus]);
}

// ---------- Közös ablak ----------

// Egy ablak megnyitása: fókusz az első gombra (veszélyes műveletnél a Mégse-re), Tab nem megy ki belőle,
// Esc vagy a háttérre kattintás = Mégse. A visszatérési érték a lezaro() függvénynek átadott érték.
function ablak({ ikon, veszely, cim, szoveg, tartalom, gombok, alapFokusz }) {
    return new Promise((megold) => {
        const elozoFokusz = document.activeElement;
        const hatter = elem('div', 'sm-overlay app-ablak-hatter');
        const kartya = elem('div', 'sm-card app-ablak');
        kartya.setAttribute('role', 'alertdialog');
        kartya.setAttribute('aria-modal', 'true');
        const cimId = `app-ablak-cim-${Date.now()}`;
        kartya.setAttribute('aria-labelledby', cimId);

        const ikonElem = elem('div', `app-ablak-ikon${veszely ? ' veszely' : ''}`, ikon);
        ikonElem.setAttribute('aria-hidden', 'true');
        const cimElem = elem('h3', 'app-ablak-cim', cim);
        cimElem.id = cimId;
        kartya.append(ikonElem, cimElem);
        if (szoveg) kartya.appendChild(elem('p', 'app-ablak-szoveg', szoveg));
        if (tartalom) kartya.appendChild(tartalom);

        const gombsor = elem('div', 'app-ablak-gombok');
        let lezarva = false;
        const lezaro = (ertek) => {
            if (lezarva) return;
            lezarva = true;
            document.removeEventListener('keydown', billentyu, true);
            hatter.remove();
            if (elozoFokusz && typeof elozoFokusz.focus === 'function') elozoFokusz.focus();
            megold(ertek);
        };
        const gombElemek = gombok(lezaro).map(({ szoveg: gSzoveg, osztaly, kattintas }) => {
            const g = elem('button', `sm-btn ${osztaly}`, gSzoveg);
            g.type = 'button';
            g.addEventListener('click', kattintas);
            gombsor.appendChild(g);
            return g;
        });
        kartya.appendChild(gombsor);
        hatter.appendChild(kartya);

        hatter.addEventListener('click', (e) => { if (e.target === hatter) lezaro(gombok.megse); });

        function billentyu(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                lezaro(gombok.megse);
            } else if (e.key === 'Tab') {
                const fokuszalhato = [...kartya.querySelectorAll('button:not([disabled]), input')];
                if (!fokuszalhato.length) return;
                const elso = fokuszalhato[0];
                const utolso = fokuszalhato[fokuszalhato.length - 1];
                if (e.shiftKey && document.activeElement === elso) { e.preventDefault(); utolso.focus(); }
                else if (!e.shiftKey && document.activeElement === utolso) { e.preventDefault(); elso.focus(); }
            }
        }
        document.addEventListener('keydown', billentyu, true);
        document.body.appendChild(hatter);
        (alapFokusz?.(kartya) || gombElemek[0])?.focus();
    });
}

// ---------- Megerősítés ----------

// A rövid kérdés a cím; a hosszabb szöveg alá kerül egy általános „Biztos vagy benne?” cím alá
export function megerosites(szoveg, { gomb, veszely = false } = {}) {
    const rovid = String(szoveg).length <= 80;
    const gombok = (lezaro) => [
        { szoveg: t('cancel', 'Mégse'), osztaly: 'app-gomb-masodlagos', kattintas: () => lezaro(false) },
        { szoveg: gomb || t('ok', 'OK'), osztaly: veszely ? 'app-gomb-veszely' : 'app-gomb-fo', kattintas: () => lezaro(true) },
    ];
    gombok.megse = false;
    return ablak({
        ikon: veszely ? '!' : '?',
        veszely,
        cim: rovid ? szoveg : t('dlg_sure', 'Biztos vagy benne?'),
        szoveg: rovid ? '' : szoveg,
        gombok,
        // veszélyes műveletnél a Mégse kapja a fókuszt, hogy egy véletlen Enter ne töröljön
        alapFokusz: (kartya) => kartya.querySelector(veszely ? '.app-gomb-masodlagos' : '.app-gomb-fo'),
    });
}

// ---------- Begépelős megerősítés (fiók és csoport törlése) ----------

export function begepeloMegerosites({ cim, szoveg, szo, gomb }) {
    const mezo = elem('input', 'app-ablak-mezo');
    mezo.type = 'text';
    mezo.autocomplete = 'off';
    mezo.setAttribute('aria-label', szo);
    mezo.placeholder = szo;
    const egyezik = () => mezo.value.trim().toLocaleUpperCase() === String(szo).trim().toLocaleUpperCase();

    const gombok = (lezaro) => [
        { szoveg: t('cancel', 'Mégse'), osztaly: 'app-gomb-masodlagos', kattintas: () => lezaro(false) },
        { szoveg: gomb, osztaly: 'app-gomb-veszely', kattintas: () => { if (egyezik()) lezaro(true); } },
    ];
    gombok.megse = false;
    const promise = ablak({
        ikon: '!',
        veszely: true,
        cim,
        szoveg,
        tartalom: mezo,
        gombok,
        alapFokusz: () => mezo,
    });
    // a törlés gomb csak a pontos szó beírása után nyomható
    const torlesGomb = mezo.closest('.app-ablak')?.querySelector('.app-gomb-veszely');
    if (torlesGomb) {
        torlesGomb.disabled = true;
        mezo.addEventListener('input', () => { torlesGomb.disabled = !egyezik(); });
        mezo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && egyezik()) torlesGomb.click(); });
    }
    return promise;
}

// ---------- Goats Game: pontok egy ablakban ----------

const PONT_HATAR = 1000000;

export function pontBekeres({ cim, jatekosok }) {
    const lista = elem('div', 'app-pont-lista');
    const mezok = jatekosok.map((j) => {
        const sor = elem('div', 'app-pont-sor');
        const nev = elem('span', 'app-pont-nev', j.nev);
        const minusz = elem('button', 'app-pont-gomb', '−');
        const plusz = elem('button', 'app-pont-gomb', '+');
        minusz.type = plusz.type = 'button';
        minusz.setAttribute('aria-label', t('points_minus', '{name}: eggyel kevesebb', { name: j.nev }));
        plusz.setAttribute('aria-label', t('points_plus', '{name}: eggyel több', { name: j.nev }));
        const mezo = elem('input', 'app-pont-mezo');
        mezo.type = 'number';
        mezo.inputMode = 'numeric';
        mezo.step = '1';
        mezo.value = '0';
        mezo.setAttribute('aria-label', t('points_of', '{name} pontja', { name: j.nev }));
        const lep = (d) => { mezo.value = String((Math.round(Number(mezo.value)) || 0) + d); };
        minusz.addEventListener('click', () => lep(-1));
        plusz.addEventListener('click', () => lep(1));
        sor.append(nev, minusz, mezo, plusz);
        lista.appendChild(sor);
        return { user_id: j.user_id, mezo };
    });

    const gombok = (lezaro) => [
        { szoveg: t('cancel', 'Mégse'), osztaly: 'app-gomb-masodlagos', kattintas: () => lezaro(null) },
        {
            szoveg: t('save', 'Mentés'),
            osztaly: 'app-gomb-fo',
            kattintas: () => lezaro(mezok.map(({ user_id, mezo }) => {
                let pont = Math.round(Number(mezo.value));
                if (!Number.isFinite(pont)) pont = 0;
                return { user_id, pont: Math.max(-PONT_HATAR, Math.min(PONT_HATAR, pont)) };
            })),
        },
    ];
    gombok.megse = null;
    return ablak({
        ikon: '★',
        cim,
        szoveg: t('points_hint', 'Add meg a pontokat'),
        tartalom: lista,
        gombok,
        alapFokusz: () => mezok[0]?.mezo,
    });
}

window.goatsAblak = { toast, megerosites, begepeloMegerosites, pontBekeres };
