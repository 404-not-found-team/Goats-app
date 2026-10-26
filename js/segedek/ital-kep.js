// Italkép-feloldás egy helyen. Sorrend:
//   0) színezett forma (italok.kep_forma + kep_szin_1/2/3 + kep_minta): rétegekből
//      összerakott kép, a színt a kód adja (lásd img/formak/README.md, css/elemek/ital-szinezes.css),
//   1) a felhasználó saját képe (kep_url),
//   2) koktélnál: img/koktelok/<ital-neve-szlugositve>.webp (ha van ilyen fájl),
//   3) márkakép: img/markak/<marka>.webp (ha a márkához van fájl),
//   4) kategória-ikon: img/ikonok/<ikon>.svg (CSS maszkkal, így a téma színét veszi fel).
// A képek betöltési hibáját onerror kezeli, így a hiányzó fájl nem töri el a kártyát.
// Klasszikus script (nem modul): window.italKep-en keresztül érhető el.
// A MARKA_MINTAK listát a sql/03_ital_marka.sql-ből kell szinkronban tartani.
(function () {
    const MARKA_MINTAK = [
    ['Hell ', 'hell'],
    ['Monster Energy', 'monster-energy'],
    ['Absolut', 'absolut'],
    ['Tatratea', 'tatratea'],
    ['Royal', 'royal'],
    ['Finlandia', 'finlandia'],
    ['Red Bull', 'red-bull'],
    ['Somersby', 'somersby'],
    ['Burn ', 'burn'],
    ['Adrenalin', 'adrenalin'],
    ['Dreher', 'dreher'],
    ['Soproni', 'soproni'],
    ['Jim Beam', 'jim-beam'],
    ['Jack Daniels', 'jack-daniels'],
    ['Jägermeister', 'jagermeister'],
    ['Bomba ', 'bomba'],
    ['Guarana No Sleep', 'guarana-no-sleep'],
    ['Jameson', 'jameson'],
    ['Cîroc', 'ciroc'],
    ['1664', '1664'],
    ['Borsodi', 'borsodi'],
    ['Miller', 'miller'],
    ['Ballantines', 'ballantines'],
    ['Johnnie Walker', 'johnnie-walker'],
    ['Euphoria', 'euphoria'],
    ['Hugo Spritz', 'hugo-spritz'],
    ['Bacardi', 'bacardi'],
    ['Havana Club', 'havana-club'],
    ['Chivas Regal', 'chivas-regal'],
    ['Southern Comfort', 'southern-comfort'],
    ['Beluga', 'beluga'],
    ['Belvedere', 'belvedere'],
    ['Grey Goose', 'grey-goose'],
    ['Strongbow', 'strongbow'],
    ['Arany Ászok', 'arany-aszok'],
    ['Arany Fácán', 'arany-facan'],
    ['Budweiser', 'budweiser-budvar'],
    ['Coors', 'coors'],
    ['Desperados', 'desperados'],
    ['Gösser', 'gosser'],
    ['Guinness', 'guinness'],
    ['Heineken', 'heineken'],
    ['Kőbányai', 'kobanyai'],
    ['Kozel', 'kozel'],
    ['Löwenbräu', 'lowenbrau'],
    ['Pécsi Sör', 'pecsi-sor'],
    ['Peroni', 'peroni'],
    ['Staropramen', 'staropramen'],
    ['Steffl', 'steffl'],
    ['Stella', 'stella-artois'],
    ['Figula', 'figula'],
    ['Nyakas', 'nyakas'],
    ];

    const KATEGORIA_IKON = {
        sor: 'sor', cider: 'sor',
        bor: 'bor', froccs: 'bor',
        palinka: 'palinka',
        vodka: 'vodka',
        whiskey: 'whisky', whisky: 'whisky',
        rum: 'rum',
        likor: 'likor', bitter: 'likor',
        energiaital: 'energiaital',
        udito: 'udito',
        koktel: 'egyeb', egyeb: 'egyeb'
    };

    // Normál esetben a márka-kép fájlneve megegyezik a márka-szluggal (pl. 'red-bull' -> red-bull.webp).
    // Ahol a feltöltött fájl ettől eltér, itt felülírható.
    const MARKA_KEP_FAJL = {
        'monster-energy': 'monster',
    };

    // Egy márkán belüli változatok (pl. kiadások), külön képpel. A kulcs a márka-szlug, az érték egy
    // [névrészlet, fájlnév kiterjesztés nélkül] lista - az ital nevében (kisbetűsen) elsőként egyező nyer.
    const MARKA_VALTOZATOK = {
        'monster-energy': [
            ['ultra', 'monster_ultra'],
            ['rehab', 'monster_rehab'],
            ['juiced', 'monster_juiced'],
        ],
        'hell': [
            ['ice coffee', 'hell_ice_coffe'],
            ['New Gen', 'hell_new_gen'],
            ['500 ml', 'hell_500'],
        ],
        'red-bull': [
            ['edition', 'red-bull_edition'],
        ],
    };

    function markaKepFajl(marka) {
        return MARKA_KEP_FAJL[marka] || marka;
    }

    function markaValtozatFajl(marka, nev) {
        const valtozatok = MARKA_VALTOZATOK[marka];
        if (!valtozatok) return null;
        const kisbetus = String(nev || '').toLowerCase();
        // kis- és nagybetűtől függetlenül (a listában pl. 'New Gen' is szerepelhet)
        const talalat = valtozatok.find(([reszlet]) => kisbetus.includes(String(reszlet).toLowerCase()));
        return talalat ? talalat[1] : null;
    }

    function markaNevbol(nev) {
        const kisbetus = String(nev || '').toLowerCase();
        const talalat = MARKA_MINTAK.find(([minta]) => kisbetus.startsWith(minta.toLowerCase()));
        return talalat ? talalat[1] : null;
    }

    // Listanézethez: a név a márka-előtag nélkül (pl. "Finlandia Mango" -> "Mango").
    // Ha a név csak a márkából áll, marad a teljes név.
    function nevMarkaNelkul(nev) {
        const teljes = String(nev || '');
        const kisbetus = teljes.toLowerCase();
        const talalat = MARKA_MINTAK.find(([minta]) => kisbetus.startsWith(minta.toLowerCase()));
        if (!talalat) return teljes;
        const maradek = teljes.slice(talalat[0].length).replace(/^[\s\-–:,.]+/, '').trim();
        return maradek || teljes;
    }

    // Az ital ikonja: a kategóriatábla ikon mezője (ital.ikon), ha van; különben a kategória kódja alapján
    function ikonNev(ital) {
        return /^[a-z0-9-]{1,30}$/.test(String(ital.ikon || '')) ? ital.ikon : ikonFajl(ital.kategoria);
    }

    function ikonFajl(kategoria) {
        return KATEGORIA_IKON[String(kategoria || '').toLowerCase()] || 'egyeb';
    }

    // Fájlnév-barát szlug: ékezetek levágva, kisbetű, kötőjelekkel (pl. "Hugó Spéci" -> "hugo-speci")
    function nevSzlug(nev) {
        return String(nev || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function kepJeloltek(ital) {
        const jeloltek = [];
        if (ital.kep_url) jeloltek.push(ital.kep_url);
        if (String(ital.kategoria || '').toLowerCase() === 'koktel') {
            const szlug = nevSzlug(ital.nev);
            if (szlug) jeloltek.push(`img/koktelok/${szlug}.webp`);
        }
        const marka = ital.marka || markaNevbol(ital.nev);
        if (marka) {
            const valtozatFajl = markaValtozatFajl(marka, ital.nev);
            if (valtozatFajl) jeloltek.push(`img/markak/${valtozatFajl}.webp`);
            jeloltek.push(`img/markak/${markaKepFajl(marka)}.webp`);
        }
        // Sörnél márka-kép híján: két generikus kép a kiszerelés szerint (nem kell minden sörnek saját fotó)
        if (String(ital.kategoria || '').toLowerCase() === 'sor' && ital.kiszereles) {
            const fajl = ital.kiszereles === 'uveges' ? 'sor-uveges' : 'sor-doboz';
            jeloltek.push(`img/markak/${fajl}.webp`);
        }
        return jeloltek;
    }

    function ikonElem(ital) {
        const s = document.createElement('span');
        s.className = 'ital-ikon';
        s.setAttribute('role', 'img');
        s.setAttribute('aria-label', ital.nev || '');
        s.classList.add('ikon-' + ikonNev(ital));
        return s;
    }

    // ---------- Színezett formák ----------
    // A megrajzolt formák és minták (fájlok: img/formak/<forma>-szin|-sav|-reszletek.webp,
    // img/mintak/<forma>-<minta>.webp). Új forma: fájlok be a mappába + egy sor ide.
    const FORMAK = [
        ['nagy-doboz', 'Nagy doboz (500 ml)'],
        ['kozep-doboz', 'Közepes doboz (330 ml)'],
        ['karcsu-doboz', 'Kis doboz (250 ml)'],
        ['uveg', 'Üveg (330 ml) – fő szín: címke, 2. szín: üveg'],
        ['whiskey', 'Whiskey'],
        ['jager', 'Jager'],
    ];
    // Formák, amelyeknek van saját logó-rétege (<forma>-logo.webp): az app logója a doboz elején,
    // a színezéstől függetlenül, mindig ugyanolyan. Új forma logóval: fájl be + a kódja ide.
    const LOGOS_FORMAK = new Set(['karcsu-doboz', 'nagy-doboz', 'kozep-doboz', 'uveg']);

    // Minták: [kód, név, formák]. A minta formához kötött, mert egy dobozra rajzolt minta más formára
    // nem illik; a fájl: img/mintak/<forma>-<minta>.webp. Az űrlapon csak az adott formához tartozók jelennek meg.
    // Új minta: fájl(ok) be az img/mintak/ mappába + egy sor ide (vagy egy forma hozzáadása a listához).
    const MINTAK = [
        ['ecset', 'Ecsetvonások', ['karcsu-doboz']],
        ['dekor', 'Díszítés', ['karcsu-doboz']],
        ['felezett', 'Felezett (jobb fele)', ['karcsu-doboz', 'nagy-doboz', 'kozep-doboz']],
        ['atlos', 'Átlós (alsó-jobb rész)', ['karcsu-doboz', 'nagy-doboz', 'kozep-doboz']],
    ];
    const mintakFormahoz = (forma) => MINTAK.filter(([, , formak]) => formak.includes(forma));
    const vanMinta = (forma, minta) => MINTAK.some(([kod, , formak]) => kod === minta && formak.includes(forma));

    const SZLUG = /^[a-z0-9-]{1,30}$/;
    const HEX = /^#[0-9a-fA-F]{6}$/;

    // A képek URL-jei CSS-változóként, osztályonként egyszer generált szabállyal (nincs inline stílus,
    // a CSP style-src-attr 'none' sem blokkolja) - ugyanúgy, mint a szin-osztaly.js
    const ismertOsztalyok = new Set();
    let lap = null;
    function stiluslap() {
        if (lap) return lap;
        if ('adoptedStyleSheets' in Document.prototype && typeof CSSStyleSheet === 'function') {
            lap = new CSSStyleSheet();
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, lap];
        } else {
            lap = document.styleSheets[0];
        }
        return lap;
    }
    const abszolut = (ut) => new URL(ut, document.baseURI).href;

    function formaOsztaly(forma) {
        const nev = 'forma-' + forma;
        if (!ismertOsztalyok.has(nev)) {
            ismertOsztalyok.add(nev);
            const sl = stiluslap();
            sl.insertRule(`.${nev} {
                --kep-szin: url("${abszolut(`img/formak/${forma}-szin.webp`)}");
                --kep-sav: url("${abszolut(`img/formak/${forma}-sav.webp`)}");
                --kep-reszletek: url("${abszolut(`img/formak/${forma}-reszletek.webp`)}");
                --kep-logo: url("${abszolut(`img/formak/${forma}-logo.webp`)}");
            }`, sl.cssRules.length);
        }
        return nev;
    }

    function mintaOsztaly(forma, minta) {
        const nev = `minta-${forma}-${minta}`;
        if (!ismertOsztalyok.has(nev)) {
            ismertOsztalyok.add(nev);
            const sl = stiluslap();
            sl.insertRule(`.${nev} { --kep-minta: url("${abszolut(`img/mintak/${forma}-${minta}.webp`)}"); }`, sl.cssRules.length);
        }
        return nev;
    }

    function vanSzinezettForma(ital) {
        return SZLUG.test(String(ital.kep_forma || '')) && HEX.test(String(ital.kep_szin_1 || ''));
    }

    function reteg(osztaly, szin) {
        const s = document.createElement('span');
        s.className = 'ital-reteg ' + osztaly;
        if (szin && window.szinOsztaly) s.classList.add(window.szinOsztaly(szin));
        return s;
    }

    // Rétegek: alapszín, sáv (2. szín), minta (3. szín; ha nincs, a 2., végül az 1.), fix részletek, app logó
    function szinezettElem(ital) {
        const doboz = document.createElement('span');
        doboz.className = 'ital-szinezett ' + formaOsztaly(ital.kep_forma);
        doboz.setAttribute('role', 'img');
        doboz.setAttribute('aria-label', ital.nev || '');

        const szin2 = HEX.test(String(ital.kep_szin_2 || '')) ? ital.kep_szin_2 : null;
        const szin3 = HEX.test(String(ital.kep_szin_3 || '')) ? ital.kep_szin_3 : null;
        // A sáv-réteg a teljes testet lefedi, a szín-réteg erre kerül középre (így nincs varrat a határon).
        // Második szín híján a sáv is a fő színt kapja, így a doboz egyszínű (pl. New Gen: fehér + minta).
        doboz.appendChild(reteg('reteg-sav', szin2 || ital.kep_szin_1));
        doboz.appendChild(reteg('reteg-szin', ital.kep_szin_1));
        if (SZLUG.test(String(ital.kep_minta || '')) && vanMinta(ital.kep_forma, ital.kep_minta)) {
            doboz.appendChild(reteg('reteg-minta ' + mintaOsztaly(ital.kep_forma, ital.kep_minta),
                szin3 || szin2 || ital.kep_szin_1));
        }
        doboz.appendChild(reteg('reteg-reszletek'));
        if (LOGOS_FORMAK.has(ital.kep_forma)) doboz.appendChild(reteg('reteg-logo'));
        return doboz;
    }

    // Kártyába való elem: színezett forma, kép, vagy ikon, ha nincs használható kép
    function elemLetrehoz(ital) {
        if (vanSzinezettForma(ital)) {
            const elem = szinezettElem(ital);
            // Ha a forma fájlja még nincs feltöltve, a régi lánc (márkakép, ikon) veszi át a helyét
            const proba = new Image();
            proba.onerror = () => {
                const tartalek = kepesElem(ital);
                if (elem.id) tartalek.id = elem.id;
                elem.replaceWith(tartalek);
            };
            proba.src = `img/formak/${ital.kep_forma}-szin.webp`;
            return elem;
        }
        return kepesElem(ital);
    }

    function kepesElem(ital) {
        const jeloltek = kepJeloltek(ital);
        if (jeloltek.length === 0) return ikonElem(ital);

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = ital.nev || '';
        let i = 0;
        img.onerror = () => {
            i++;
            if (i < jeloltek.length) img.src = jeloltek[i];
            else {
                // az ikon átveszi a kép azonosítóját (pl. #modal-kep), hogy a CSS és a hívó is megtalálja
                const ikon = ikonElem(ital);
                if (img.id) ikon.id = img.id;
                img.replaceWith(ikon);
            }
        };
        img.src = jeloltek[0];
        return img;
    }

    // Egyetlen URL a nagy nézethez (modal). Ikonnál az SVG fájl útvonala.
    function elsoUrl(ital) {
        const jeloltek = kepJeloltek(ital);
        return jeloltek[0] || `img/ikonok/${ikonNev(ital)}.svg`;
    }

    // Az összes jelölt URL a nagy nézethez, a végén a kategória-ikonnal (onerror-láncoláshoz)
    function osszesUrl(ital) {
        return [...kepJeloltek(ital), `img/ikonok/${ikonNev(ital)}.svg`];
    }

    window.italKep = {
        elemLetrehoz, elsoUrl, osszesUrl, markaNevbol, nevMarkaNelkul, ikonFajl, nevSzlug,
        FORMAK, MINTAK, mintakFormahoz,
    };
})();
