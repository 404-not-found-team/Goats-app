// Italkép-feloldás egy helyen. Sorrend:
//   0) színezett forma (italok.kep_forma + kep_szin_1/2/3 + kep_minta): rétegekből
//      összerakott kép, a színt a kód adja (lásd img/formak/README.md, css/elemek/ital-szinezes.css),
//   1) a felhasználó saját képe (kep_url),
//   2) koktélnál: img/koktelok/<ital-neve-szlugositve>.webp (ha van ilyen fájl),
//   3) kategória-ikon: img/ikonok/<ikon>.svg (CSS maszkkal, így a téma színét veszi fel).
// Márkás rajzokat jogi okból nem tárolunk: márkás italnál is a színezett forma (vagy az ikon) jelenik meg.
// A képek betöltési hibáját onerror kezeli, így a hiányzó fájl nem töri el a kártyát.
// Klasszikus script (nem modul): window.italKep-en keresztül érhető el.
// A képek útvonala az app gyökeréhez viszonyított (img/...), ezt a script saját helyéből számoljuk
// (js/pages/ranglista/ -> három szinttel feljebb), mert az oldal almappában van (lásd js/segedek/utvonal.js).
// A MARKA_MINTAK listát a sql/03_ital_marka.sql-ből kell szinkronban tartani.
(function () {
    const GYOKER = new URL('../../../', document.currentScript.src);
    const abszolut = (ut) => new URL(ut, GYOKER).href;

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
            if (szlug) jeloltek.push(abszolut(`img/koktelok/${szlug}.webp`));
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
        ['uveg', 'Üveg (330 ml, sör / cider) – fő szín: címke, 2. szín: üveg'],
        ['vodka', 'Vodkás üveg – fő szín: címke, 2. szín: üveg'],
        ['royal', 'Vodkás üveg szalaggal (pl. Royal) – fő szín: kupak és szalag, 2. szín: üveg'],
        ['finlandia', 'Magas vodkás üveg (pl. Finlandia) – fő szín: kupak és címke, 2. szín: üveg'],
        ['absolut', 'Kerek vállú vodkás üveg (pl. Absolut) – fő szín: címke, 2. szín: üveg'],
        ['ciroc', 'Magas, egyenes vodkás üveg (pl. Cîroc) – fő szín: alsó csík, 2. szín: üveg'],
        ['belvedere', 'Magas, karcsú vodkás üveg (pl. Belvedere) – fő szín: nyakcímke, 2. szín: üveg'],
        ['beluga', 'Vodkás üveg fémsávval (pl. Beluga) – fő szín: sáv és nyakcímke, 2. szín: üveg'],
        ['euphoria', 'Hengeres palack (pl. Euphoria) – fő szín: palack, 2. szín: kupak'],
        ['whiskey', 'Whiskys üveg, kerek – fő szín: címke, 2. szín: ital'],
        ['jim', 'Whiskys üveg, nagy címkével (pl. Jim Beam) – fő szín: címke, 2. szín: ital'],
        ['jack', 'Whiskys üveg, címke és nyak (pl. Jack Daniel’s) – fő szín: címke és nyak, 2. szín: ital'],
        ['jameson', 'Whiskys üveg, lejtős vállú (pl. Jameson) – fő szín: címke, 2. szín: üveg'],
        ['johnnie-walker', 'Szögletes whiskys üveg ferde címkével (pl. Johnnie Walker) – fő szín: címke és kupak, 2. szín: ital'],
        ['ballantines', 'Széles whiskys üveg (pl. Ballantine’s) – fő szín: címke és kupak, 2. szín: ital'],
        ['jager', 'Likőrös üveg – fő szín: címke, 2. szín: üveg'],
        ['tea-likor', 'Kerek likőrös üveg (pl. teás likőr) – fő szín: üveg, 2. szín: kupak'],
        ['bacardi', 'Átlátszó rumos üveg (pl. Bacardi) – fő szín: címke, 2. szín: ital'],
        ['havana', 'Rumos üveg arany kupakkal (pl. Havana Club) – fő szín: címke, 2. szín: ital'],
        ['malibu', 'Fehér likőrös üveg (pl. Malibu) – fő szín: üveg, 2. szín: kupak'],
        ['bor', 'Boros üveg (0,75 l) – fő szín: címke, 2. szín: üveg'],
        ['froccs', 'Fröccsös pohár – fő szín: ital, 2. szín: üveg'],
        ['koktel-feles', 'Feles pohár (shot) – fő szín: ital'],
        ['koktel-rovid', 'Rövid pohár – fő szín: ital, 2. szín: karika'],
        ['koktel-magas', 'Magas pohár – fő szín: ital, 2. szín: szívószál'],
    ].map(([kod, nev]) => [kod, tr(`form_${kod}`, nev)]);
    // Formák, amelyeknek van saját logó-rétege (<forma>-logo.webp): az app logója a doboz elején,
    // a színezéstől függetlenül, mindig ugyanolyan. Új forma logóval: fájl be + a kódja ide.
    // Formák, amelyek egy másik forma üvegét (és logóját) használják, csak a címkéjük (-szin) és a
    // kupakjuk (-reszletek) saját: pl. a jim és a jack ugyanaz a whiskys üveg, más címkével.
    const KOZOS_UVEG = { jim: 'whiskey', jack: 'whiskey' };
    const uvegForma = (forma) => KOZOS_UVEG[forma] || forma;
    const LOGOS_FORMAK = new Set(['nagy-doboz', 'kozep-doboz', 'uveg', 'vodka', 'whiskey', 'jager', 'royal', 'finlandia', 'absolut', 'jim', 'jack', 'jameson', 'johnnie-walker', 'ballantines', 'ciroc', 'bacardi', 'havana', 'malibu',
        'tea-likor', 'bor', 'froccs', 'koktel-feles', 'koktel-rovid', 'koktel-magas', 'belvedere', 'beluga', 'euphoria']);

    // Minták: [kód, név, formák]. A minta formához kötött, mert egy dobozra rajzolt minta más formára
    // nem illik; a fájl: img/mintak/<forma>-<minta>.webp. Az űrlapon csak az adott formához tartozók jelennek meg.
    // Új minta: fájl(ok) be az img/mintak/ mappába + egy sor ide (vagy egy forma hozzáadása a listához).
    const MINTAK = [
        ['felezett', 'Felezett (jobb fele)', ['nagy-doboz', 'kozep-doboz']],
        ['atlos', 'Átlós (alsó-jobb rész)', ['nagy-doboz', 'kozep-doboz']],
        ['also-fele', 'Alsó fele (vízszintes felezés)', ['nagy-doboz', 'kozep-doboz']],
        ['iv', 'Ív (minta színe)', ['nagy-doboz']],
        ['haromszog', 'Háromszög jel', ['nagy-doboz']],
        ['gyumolcs', 'Gyümölcs', ['nagy-doboz']],
        ['racs', 'Háromszög-rács (felül)', ['nagy-doboz']],
        ['szalag', 'Szalag (minta színe)', ['nagy-doboz']],
        ['hegy', 'Hegy havas csúcsokkal', ['nagy-doboz']],
        ['keret', 'Keret a logó körül', ['nagy-doboz']],
        ['csikok', 'Csíkok felül és alul', ['nagy-doboz']],
        ['villam', 'Villám', ['koktel-feles']],
        ['kacsa', 'Gumikacsa', ['koktel-feles']],
        ['kaktusz', 'Kaktusz', ['koktel-rovid']],
        ['mogyoro', 'Mogyoró', ['koktel-rovid']],
        ['krokodil', 'Krokodil', ['koktel-magas']],
        ['korok', 'Két kör (íz színe)', ['finlandia']],
        ['almak', 'Almák a címkén (íz színe)', ['jim']],
    ].map(([kod, nev, formak]) => [kod, tr(`pattern_${kod}`, nev), formak]);
    // Formák, amelyeknél a minta a fő színű rész (címke, színes alj) MÖGÖTT van: a minta előbb kerül
    // a dobozba, így a címke eltakarja az alsó részét (pl. a körök kikandikálnak a címke mögül).
    // Minták, amelyeknek van egy nem színezett része is (<forma>-<minta>-fix.webp, pl. a háromszög jel
    // fehér közepe): ez a színezett minta fölé kerül, mindig a rajzolt színében.
    const MINTA_FIX = new Set(['haromszog', 'hegy', 'kacsa', 'kaktusz', 'mogyoro', 'krokodil']);
    const MINTA_A_SZIN_MOGOTT = new Set(['finlandia']);
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

    function formaOsztaly(forma) {
        const nev = 'forma-' + forma;
        if (!ismertOsztalyok.has(nev)) {
            ismertOsztalyok.add(nev);
            const sl = stiluslap();
            sl.insertRule(`.${nev} {
                --kep-szin: url("${abszolut(`img/formak/${forma}-szin.webp`)}");
                --kep-sav: url("${abszolut(`img/formak/${uvegForma(forma)}-sav.webp`)}");
                --kep-reszletek: url("${abszolut(`img/formak/${forma}-reszletek.webp`)}");
                --kep-logo: url("${abszolut(`img/formak/${uvegForma(forma)}-logo.webp`)}");
            }`, sl.cssRules.length);
        }
        return nev;
    }

    function mintaOsztaly(forma, minta) {
        const nev = `minta-${forma}-${minta}`;
        if (!ismertOsztalyok.has(nev)) {
            ismertOsztalyok.add(nev);
            const sl = stiluslap();
            const fix = MINTA_FIX.has(minta)
                ? ` --kep-minta-fix: url("${abszolut(`img/mintak/${forma}-${minta}-fix.webp`)}");` : '';
            sl.insertRule(`.${nev} { --kep-minta: url("${abszolut(`img/mintak/${forma}-${minta}.webp`)}");${fix} }`, sl.cssRules.length);
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
        const szinReteg = reteg('reteg-szin', ital.kep_szin_1);
        doboz.appendChild(reteg('reteg-sav', szin2 || ital.kep_szin_1));
        doboz.appendChild(szinReteg);
        if (SZLUG.test(String(ital.kep_minta || '')) && vanMinta(ital.kep_forma, ital.kep_minta)) {
            const minta = reteg('reteg-minta ' + mintaOsztaly(ital.kep_forma, ital.kep_minta),
                szin3 || szin2 || ital.kep_szin_1);
            // a szín-réteg elé szúrva a minta mögötte lesz, különben fölötte
            if (MINTA_A_SZIN_MOGOTT.has(ital.kep_forma)) doboz.insertBefore(minta, szinReteg);
            else doboz.appendChild(minta);
            // a minta nem színezett része (pl. fehér háromszög) közvetlenül a minta fölé
            if (MINTA_FIX.has(ital.kep_minta)) {
                minta.after(reteg('reteg-minta-fix ' + mintaOsztaly(ital.kep_forma, ital.kep_minta)));
            }
        }
        doboz.appendChild(reteg('reteg-reszletek'));
        if (LOGOS_FORMAK.has(ital.kep_forma)) doboz.appendChild(reteg('reteg-logo'));
        return doboz;
    }

    // Kártyába való elem: színezett forma, kép, vagy ikon, ha nincs használható kép
    function elemLetrehoz(ital) {
        if (vanSzinezettForma(ital)) {
            const elem = szinezettElem(ital);
            // Ha a forma fájlja még nincs feltöltve, a régi lánc (márkakép, ikon) veszi át a helyét.
            const proba = new Image();
            proba.onerror = () => {
                const tartalek = kepesElem(ital);
                if (elem.id) tartalek.id = elem.id;
                elem.replaceWith(tartalek);
            };
            proba.src = abszolut(`img/formak/${uvegForma(ital.kep_forma)}-sav.webp`);
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

    window.italKep = {
        elemLetrehoz, markaNevbol, nevMarkaNelkul, ikonFajl,
        FORMAK, mintakFormahoz,
    };
})();
