// Az alkalmazás oldalai egy helyen (FELADAT15): a nav-bar és az admin oldal is ezt használja.
// - kulcs: az oldal azonosítója (a globális kapcsolók és a nav-bar használja)
// - kapcsolo: a globális kapcsoló kulcsa a public.app_kapcsolok táblában (null = nem kapcsolható)
// - fo: mobilon az alsó sávban mindig látszik (a többi a "Több ☰" fiókba kerül)
// - publikus: csoport nélkül (kijelentkezve) is látszik
// - navban: false esetén az oldal létezik és kapcsolható (admin be/ki állíthatja), de a nav-bar
//   nem listázza külön fülként - a Képeknél a főoldali galéria "Összes kép" linkje már odavisz
// - menu: az azonos menu-kulcsú oldalak a nav-barban egyetlen menüpontként jelennek meg (MENUK),
//   az oldalak fejlécében pedig fülként lehet váltani közöttük (#oldal-fulek, lásd nav-bar.js)
export const OLDALAK = [
    { kulcs: 'index', nev: tr('page_home', 'Kezdőlap'), emoji: '🏠', fajl: 'app.html', kapcsolo: null, fo: true, publikus: true },
    { kulcs: 'tartozasok', nev: tr('page_debts', 'Tartozások'), emoji: '💸', fajl: 'tartozasok.html', kapcsolo: 'oldal_tartozasok', fo: true },
    { kulcs: 'ranglista', nev: tr('page_tierlist', 'Ranglista'), emoji: '🍹', fajl: 'ranglista.html', kapcsolo: 'oldal_ranglista', fo: true, publikus: true },
    { kulcs: 'kepek', nev: tr('page_pictures', 'Képek'), emoji: '🖼️', fajl: 'kepek.html', kapcsolo: 'oldal_kepek', navban: false },
    { kulcs: 'tervek', nev: tr('page_plans', 'Tervek'), emoji: '📋', fajl: 'tervek.html', kapcsolo: 'oldal_tervek' },
    { kulcs: 'goatsgame', nev: tr('page_goatsgame', 'Tabella'), emoji: '🎮', fajl: 'goatsgame.html', kapcsolo: 'oldal_goatsgame', menu: 'jatekok' },
    { kulcs: 'jatekszabalyok', nev: tr('page_rules', 'Szabályok'), emoji: '📜', fajl: 'jatekszabalyok.html', kapcsolo: 'oldal_jatekszabalyok', menu: 'jatekok' },
];

// Összevont menüpontok: a tagjaik közül az első látható oldalra visznek
export const MENUK = {
    jatekok: { kulcs: 'jatekok', nev: tr('page_games', 'Játékok'), emoji: '🎲' },
};

// Csak superadminnak, a csoporttól és a kapcsolóktól függetlenül
export const ADMIN_OLDAL = { kulcs: 'admin', nev: 'Admin', emoji: '⚙️', fajl: 'admin.html' };

// Globálisan kapcsolható funkciók (a szerver a public.funkcio_engedelyezve()-vel kényszeríti ki)
export const FUNKCIOK = [
    { kulcs: 'funkcio_kepfeltoltes', nev: tr('feat_upload', 'Képfeltöltés'), leiras: tr('feat_upload_desc', 'Képek feltöltése a Képek oldalon.') },
    { kulcs: 'funkcio_italjavaslat', nev: tr('feat_drink_suggest', 'Italjavaslat'), leiras: tr('feat_drink_suggest_desc', 'Új ital javaslása a Ranglista oldalon.') },
    { kulcs: 'funkcio_uj_csoport', nev: tr('feat_new_group', 'Új csoport létrehozása'), leiras: tr('feat_new_group_desc', 'Új csoport létrehozása a beállításoknál.') },
    { kulcs: 'funkcio_tartozas_felvetel', nev: tr('feat_add_debt', 'Tartozás felvétele'), leiras: tr('feat_add_debt_desc', 'Új tartozás felvétele a Tartozások oldalon.') },
    { kulcs: 'funkcio_google_naptar', nev: tr('feat_gcal', 'Google Naptár szinkron'), leiras: tr('feat_gcal_desc', 'A csoport eseményei a tagok Google Naptárában (bekapcsolás a Beállításokban).') },
    { kulcs: 'funkcio_csoportcsatlakozas', nev: tr('feat_join_group', 'Csoportcsatlakozás'), leiras: tr('feat_join_group_desc', 'Csatlakozás meglévő csoporthoz csoportkóddal.') },
];

export const oldalKulcsbol = (kulcs) => OLDALAK.find(o => o.kulcs === kulcs) || null;
