// Az alkalmazás oldalai egy helyen (FELADAT15): a nav-bar és az admin oldal is ezt használja.
// - kulcs: a groups.enabled_pages-ben használt név (csoportonkénti engedélyezés)
// - kapcsolo: a globális kapcsoló kulcsa a public.app_kapcsolok táblában (null = nem kapcsolható)
// - fo: mobilon az alsó sávban mindig látszik (a többi a "Több ☰" fiókba kerül)
// - publikus: csoport nélkül (kijelentkezve) is látszik
export const OLDALAK = [
    { kulcs: 'index', nev: 'Kezdőlap', emoji: '🏠', fajl: 'app.html', kapcsolo: null, fo: true, publikus: true },
    { kulcs: 'tartozasok', nev: 'Tartozások', emoji: '💸', fajl: 'tartozasok.html', kapcsolo: 'oldal_tartozasok', fo: true },
    { kulcs: 'ranglista', nev: 'Ranglista', emoji: '🍹', fajl: 'ranglista.html', kapcsolo: 'oldal_ranglista', fo: true, publikus: true },
    { kulcs: 'kepek', nev: 'Képek', emoji: '🖼️', fajl: 'kepek.html', kapcsolo: 'oldal_kepek' },
    { kulcs: 'tervek', nev: 'Tervek', emoji: '📋', fajl: 'tervek.html', kapcsolo: 'oldal_tervek' },
    { kulcs: 'goatsgame', nev: 'Goats Game', emoji: '🎮', fajl: 'goatsgame.html', kapcsolo: 'oldal_goatsgame' },
];

// Csak superadminnak, a csoporttól és a kapcsolóktól függetlenül
export const ADMIN_OLDAL = { kulcs: 'admin', nev: 'Admin', emoji: '⚙️', fajl: 'admin.html' };

// Globálisan kapcsolható funkciók (a szerver a public.funkcio_engedelyezve()-vel kényszeríti ki)
export const FUNKCIOK = [
    { kulcs: 'funkcio_kepfeltoltes', nev: 'Képfeltöltés', leiras: 'Képek feltöltése a Képek oldalon.' },
    { kulcs: 'funkcio_italjavaslat', nev: 'Italjavaslat', leiras: 'Új ital javaslása a Ranglista oldalon.' },
    { kulcs: 'funkcio_uj_csoport', nev: 'Új csoport létrehozása', leiras: 'Új csoport létrehozása a beállításoknál.' },
    { kulcs: 'funkcio_tartozas_felvetel', nev: 'Tartozás felvétele', leiras: 'Új tartozás felvétele a Tartozások oldalon.' },
    { kulcs: 'funkcio_csoportcsatlakozas', nev: 'Csoportcsatlakozás', leiras: 'Csatlakozás meglévő csoporthoz csoportkóddal.' },
];

export const oldalKulcsbol = (kulcs) => OLDALAK.find(o => o.kulcs === kulcs) || null;
