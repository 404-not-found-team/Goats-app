// Nyelvkezelés minden oldalon (klasszikus script, defer-rel a <head>-ben, Supabase nélkül).
// - Betöltéskor AZONNAL alkalmazza a kiválasztott nyelvet (localStorage: goats_lang) a helyben eltárolt
//   fordításból, hálózatra várás nélkül; utána a háttérben frissíti a nyelvi fájlt (nyelvek/<kod>.json).
// - A [data-i18n="kulcs"] elemek szövegét cseréli. Ha a fordításban HTML van (pl. <strong>, <i>, <a>),
//   csak engedélyezett elemeket és attribútumokat enged át (nincs nyers innerHTML).
// - window.goatsNyelv: { aktualis(), valt(kod), t(kulcs, alap), onValtozas(fn) }
(function () {
    const NYELVEK = ['hu', 'en'];
    const ALAP = 'hu';
    const TAROLO_NYELV = 'goats_lang';
    const TAROLO_FORDITAS = (kod) => `goats_forditas_${kod}`;

    const olvas = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const ir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* privát mód, tele tár: nem kritikus */ } };

    let aktualis = NYELVEK.includes(olvas(TAROLO_NYELV)) ? olvas(TAROLO_NYELV) : ALAP;
    let forditasok = null;
    const figyelok = [];

    function tarolt(kod) {
        try { return JSON.parse(olvas(TAROLO_FORDITAS(kod)) || 'null'); } catch { return null; }
    }

    // ---------- Biztonságos HTML: csak néhány formázó elem és attribútum ----------
    const ENGEDETT_ELEMEK = new Set(['STRONG', 'B', 'EM', 'I', 'BR', 'A', 'SPAN']);
    function tisztit(forras, cel) {
        forras.childNodes.forEach(csomo => {
            if (csomo.nodeType === Node.TEXT_NODE) {
                cel.appendChild(document.createTextNode(csomo.textContent));
            } else if (csomo.nodeType === Node.ELEMENT_NODE && ENGEDETT_ELEMEK.has(csomo.tagName)) {
                const uj = document.createElement(csomo.tagName.toLowerCase());
                const osztaly = csomo.getAttribute('class');
                if (osztaly && /^[\w\s-]+$/.test(osztaly)) uj.className = osztaly;
                if (csomo.tagName === 'A') {
                    const href = csomo.getAttribute('href') || '';
                    if (/^(https?:|mailto:)/i.test(href)) uj.setAttribute('href', href);
                    if (csomo.getAttribute('target') === '_blank') {
                        uj.setAttribute('target', '_blank');
                        uj.setAttribute('rel', 'noopener');
                    }
                }
                tisztit(csomo, uj);
                cel.appendChild(uj);
            } else if (csomo.nodeType === Node.ELEMENT_NODE) {
                tisztit(csomo, cel); // nem engedett elem: csak a szövege marad meg
            }
        });
    }

    function beir(elem, szoveg) {
        if (elem.tagName === 'TITLE' || !szoveg.includes('<')) {
            elem.textContent = szoveg;
            return;
        }
        const doc = new DOMParser().parseFromString(`<body>${szoveg}</body>`, 'text/html');
        const darab = document.createDocumentFragment();
        tisztit(doc.body, darab);
        elem.replaceChildren(darab);
    }

    function alkalmaz(gyoker = document) {
        document.documentElement.lang = aktualis;
        if (!forditasok) return;
        gyoker.querySelectorAll('[data-i18n]').forEach(elem => {
            const szoveg = forditasok[elem.getAttribute('data-i18n')];
            if (typeof szoveg === 'string') beir(elem, szoveg);
        });
    }

    async function betolt(kod) {
        const valasz = await fetch(`nyelvek/${kod}.json`, { cache: 'no-cache' });
        if (!valasz.ok) throw new Error(`Nem sikerült betölteni: nyelvek/${kod}.json`);
        const szoveg = await valasz.text();
        const adat = JSON.parse(szoveg);
        if (szoveg !== olvas(TAROLO_FORDITAS(kod))) ir(TAROLO_FORDITAS(kod), szoveg);
        return adat;
    }

    async function valt(kod, { mentes = true } = {}) {
        if (!NYELVEK.includes(kod)) return;
        const elozo = aktualis;
        aktualis = kod;
        if (mentes) ir(TAROLO_NYELV, kod);
        forditasok = tarolt(kod) || forditasok;
        alkalmaz();
        try {
            const friss = await betolt(kod);
            if (aktualis !== kod) return; // közben másik nyelvet választottak
            forditasok = friss;
            alkalmaz();
        } catch (hiba) {
            console.error('Hiba a nyelvi fájl betöltésekor:', hiba);
        }
        if (elozo !== kod) figyelok.forEach(fn => { try { fn(kod); } catch (e) { console.error(e); } });
    }

    window.goatsNyelv = {
        aktualis: () => aktualis,
        valt,
        // JS-ből kirakott szövegekhez: a fordítás, vagy ha nincs, az alapszöveg
        t: (kulcs, alap = '') => (forditasok && typeof forditasok[kulcs] === 'string' ? forditasok[kulcs] : alap),
        onValtozas: (fn) => figyelok.push(fn),
        alkalmaz,
    };

    // Indulás: a magyar a HTML alapnyelve, ezért magyarnál nincs mit cserélni (és nincs mire várni).
    // Más nyelvnél a helyben tárolt fordítás azonnal, a friss fájl a háttérben.
    document.documentElement.lang = aktualis;
    if (aktualis !== ALAP) {
        forditasok = tarolt(aktualis);
        const indul = () => valt(aktualis, { mentes: false });
        if (document.readyState === 'loading') {
            if (forditasok) alkalmaz(); // ami már betöltődött a DOM-ból
            document.addEventListener('DOMContentLoaded', indul, { once: true });
        } else {
            indul();
        }
    }
})();
