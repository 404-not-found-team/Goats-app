// Italkép-feloldás egy helyen. Sorrend:
//   1) a felhasználó saját képe (kep_url),
//   2) márkakép: img/brands/<marka>.webp (ha a márkához van fájl),
//   3) kategória-ikon: img/icons/<ikon>.svg (CSS maszkkal, így a téma színét veszi fel).
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

    function markaNevbol(nev) {
        const kisbetus = String(nev || '').toLowerCase();
        const talalat = MARKA_MINTAK.find(([minta]) => kisbetus.startsWith(minta.toLowerCase()));
        return talalat ? talalat[1] : null;
    }

    function ikonFajl(kategoria) {
        return KATEGORIA_IKON[String(kategoria || '').toLowerCase()] || 'egyeb';
    }

    function kepJeloltek(ital) {
        const jeloltek = [];
        if (ital.kep_url) jeloltek.push(ital.kep_url);
        const marka = ital.marka || markaNevbol(ital.nev);
        if (marka) jeloltek.push(`img/brands/${marka}.webp`);
        return jeloltek;
    }

    function ikonElem(ital) {
        const s = document.createElement('span');
        s.className = 'ital-ikon';
        s.setAttribute('role', 'img');
        s.setAttribute('aria-label', ital.nev || '');
        s.classList.add('ikon-' + ikonFajl(ital.kategoria));
        return s;
    }

    // Kártyába való elem: kép, vagy ikon, ha nincs használható kép
    function elemLetrehoz(ital) {
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
            else img.replaceWith(ikonElem(ital));
        };
        img.src = jeloltek[0];
        return img;
    }

    // Egyetlen URL a nagy nézethez (modal). Ikonnál az SVG fájl útvonala.
    function elsoUrl(ital) {
        const jeloltek = kepJeloltek(ital);
        return jeloltek[0] || `img/icons/${ikonFajl(ital.kategoria)}.svg`;
    }

    window.italKep = { elemLetrehoz, elsoUrl, markaNevbol, ikonFajl };
})();
