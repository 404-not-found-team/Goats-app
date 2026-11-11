// A tesztelőoldal "Újdonságok" listája. Új kiadásnál a LISTA ELEJÉRE írj egy új bejegyzést
// (a legfrissebb kerül felülre, és az kapja az "Új" jelet). A dátum ÉÉÉÉ-HH-NN formátumú,
// a szövegek magyarul (hu), angolul (en) és németül (de) kellenek. Csak sima szöveg, HTML nélkül.
// Ugyanezt a listát mutatja a nyilvános Újdonságok oldal is (ujdonsagok.html, js/pages/ujdonsagok.js).
export const UJDONSAGOK = [
    {
        datum: '2026-11-11',
        hu: [
            'Új Hány napja oldal: számold, hány napja nem csináltál valamit, rekorddal és csoportos toplistával',
            'Értesítés, ha egy számlálód mérföldkőhöz ér (1, 2 és 4 hét, 2 és 3 hónap)',
            'Saját számlálót is javasolhatsz, jóváhagyás után mindenki választhatja',
            'Német nyelv',
            'Telefonon húzással váltasz a Kezdőlap, a Tartozások és a Ranglista között',
            'A főoldali képek maguktól váltanak',
            'Megújult Játékszabályok oldal (Játékok menü), új szabályszerkesztővel',
            'Új profilmenü, a fiók beállításai a Beállításokba kerültek',
            'Új Újdonságok és Impresszum oldal, a jogi oldalak három nyelven',
        ],
        en: [
            'New Days since page: count how many days it has been since you last did something, with a record and a group leaderboard',
            'Notification when one of your counters reaches a milestone (1, 2 and 4 weeks, 2 and 3 months)',
            'You can suggest your own counter; once approved, everyone can pick it',
            'German language',
            'On phones, swipe to switch between Home, Debts and Tier list',
            'The pictures on the home page change automatically',
            'Refreshed Game rules page (Games menu) with a new rule editor',
            'New profile menu, account settings moved to Settings',
            'New What\'s new and Imprint pages, legal pages in three languages',
        ],
        de: [
            'Neue Seite „Tage seit“: zähle, wie viele Tage du etwas nicht mehr getan hast, mit Rekord und Bestenliste der Gruppe',
            'Benachrichtigung, wenn einer deiner Zähler einen Meilenstein erreicht (1, 2 und 4 Wochen, 2 und 3 Monate)',
            'Du kannst eigene Zähler vorschlagen; nach der Freigabe kann jeder sie wählen',
            'Deutsche Sprache',
            'Auf dem Handy wechselst du per Wischen zwischen Start, Schulden und Rangliste',
            'Die Bilder auf der Startseite wechseln automatisch',
            'Überarbeitete Spielregeln-Seite (Menü Spiele) mit neuem Regeleditor',
            'Neues Profilmenü, die Kontoeinstellungen sind in die Einstellungen gewandert',
            'Neue Seiten „Neuigkeiten“ und „Impressum“, rechtliche Seiten in drei Sprachen',
        ],
    },
    {
        datum: '2026-11-09',
        hu: [
            'Ranglista: kétsoros nevek, a márka a név fölött',
            'Ranglista szűrő kategória-csempékkel',
            'Szebb előnézet, ha linket küldesz az appról',
        ],
        en: [
            'Tier list: two-line names with the brand above the name',
            'Tier list filter with category tiles',
            'Nicer preview when you send a link to the app',
        ],
        de: [
            'Rangliste: zweizeilige Namen, die Marke über dem Namen',
            'Ranglistenfilter mit Kategorie-Kacheln',
            'Schönere Vorschau, wenn du einen Link zur App schickst',
        ],
    },
    {
        datum: '2026-11-08',
        hu: [
            'Értesítést kapsz, ha valaki új eseményt vesz fel a csoport naptárába',
            'Megújult főoldal: kiemelt képsáv és a közelgő események listája (gépen)',
            'Egységes fejlécek és gombok minden oldalon, megújult Képek oldal',
            'Kerek ATG ikon a böngészőfülön',
        ],
        en: [
            'You get a notification when someone adds a new event to the group calendar',
            'Refreshed home page: featured picture strip and upcoming events (on desktop)',
            'Consistent headers and buttons on every page, refreshed Pictures page',
            'Round ATG icon on the browser tab',
        ],
        de: [
            'Du wirst benachrichtigt, wenn jemand einen neuen Termin im Gruppenkalender anlegt',
            'Überarbeitete Startseite: hervorgehobene Bildleiste und anstehende Termine (am Computer)',
            'Einheitliche Kopfzeilen und Schaltflächen auf allen Seiten, überarbeitete Bilder-Seite',
            'Rundes ATG-Symbol im Browser-Tab',
        ],
    },
    {
        datum: '2026-11-05',
        hu: [
            'Új, oldalsó menü gépen, a profil és a csoport jobb oldalt',
            'Javított admin oldal telefonon',
        ],
        en: [
            'New side menu on desktop, profile and group on the right',
            'Fixed admin page on phones',
        ],
        de: [
            'Neues Seitenmenü am Computer, Profil und Gruppe rechts',
            'Admin-Seite auf dem Handy repariert',
        ],
    },
    {
        datum: '2026-11-03',
        hu: [
            'Push-értesítések a tartozásokról, első indításkor felkínálva',
            'Angol nyelv: automatikusan a telefon nyelvét követi',
            'Kártyás téma- és nyelvválasztó a Beállításokban',
            'Képek jelentése a galériában',
        ],
        en: [
            'Push notifications for debts, offered on first launch',
            'English language: follows your phone language automatically',
            'Theme and language picker cards in Settings',
            'Report pictures in the gallery',
        ],
        de: [
            'Push-Benachrichtigungen zu Schulden, beim ersten Start angeboten',
            'Englische Sprache: folgt automatisch der Sprache deines Telefons',
            'Theme- und Sprachauswahl als Karten in den Einstellungen',
            'Bilder in der Galerie melden',
        ],
    },
    {
        datum: '2026-10-26',
        hu: [
            'Ranglista-napló: az ital ablakában látszik, ki és mikor tette a helyére, és az előzmények is',
            'Új italformák: sörös és cideres üveg, nagy doboz, vodkás, whiskys és likőrös üveg, fröccsös, boros és rumos pohár',
        ],
        en: [
            'Tier list history: the drink’s window shows who placed it and when, plus its earlier moves',
            'New drink shapes: beer and cider bottles, large can, vodka, whisky and liqueur bottles, spritzer, wine and rum glasses',
        ],
        de: [
            'Ranglisten-Verlauf: Im Getränkefenster siehst du, wer es wann platziert hat, und die bisherigen Änderungen',
            'Neue Getränkeformen: Bier- und Ciderflasche, große Dose, Wodka-, Whisky- und Likörflasche, Schorle-, Wein- und Rumglas',
        ],
    },
    {
        datum: '2026-10-25',
        hu: [
            'Új név: ATG – All-Time Greats',
            'Mintás italképek, saját mintaszínnel',
        ],
        en: [
            'New name: ATG – All-Time Greats',
            'Patterned drink pictures with their own pattern colour',
        ],
        de: [
            'Neuer Name: ATG – All-Time Greats',
            'Gemusterte Getränkebilder mit eigener Musterfarbe',
        ],
    },
    {
        datum: '2026-10-20',
        hu: [
            'Mentett színek az italképekhez (közös színpaletta)',
        ],
        en: [
            'Saved colours for drink pictures (shared colour palette)',
        ],
        de: [
            'Gespeicherte Farben für Getränkebilder (gemeinsame Farbpalette)',
        ],
    },
    {
        datum: '2026-10-19',
        hu: [
            'Az oldalak azonnal megnyílnak az utoljára látott adatokkal, a friss adat a háttérben érkezik',
            'A Tabella pontjai a felhőben mentődnek, mindenkinek saját színnel',
            'Teljes képernyős mód Android 15-től',
        ],
        en: [
            'Pages open instantly with the data you last saw; fresh data arrives in the background',
            'Scoreboard points are saved in the cloud, with a colour for everyone',
            'Full-screen mode from Android 15',
        ],
        de: [
            'Seiten öffnen sofort mit den zuletzt gesehenen Daten, die neuen kommen im Hintergrund',
            'Tabellenpunkte werden in der Cloud gespeichert, mit eigener Farbe für jeden',
            'Vollbildmodus ab Android 15',
        ],
    },
    {
        datum: '2026-10-17',
        hu: [
            'Játékszabályok: lépésről lépésre lapozható léptető a hosszú görgetés helyett',
        ],
        en: [
            'Game rules: a step-by-step viewer instead of long scrolling',
        ],
        de: [
            'Spielregeln: Schritt-für-Schritt-Ansicht statt langem Scrollen',
        ],
    },
    {
        datum: '2026-10-14',
        hu: [
            'Új Játékszabályok oldal, a szabályokat más csoportokkal is megoszthatjátok',
            '0,33 literes doboz kiszerelés az italoknál',
        ],
        en: [
            'New Game rules page; you can share rules with other groups',
            '0.33 litre can size for drinks',
        ],
        de: [
            'Neue Spielregeln-Seite; Regeln lassen sich mit anderen Gruppen teilen',
            '0,33-Liter-Dose als Größe bei Getränken',
        ],
    },
    {
        datum: '2026-10-13',
        hu: [
            'Ranglista: új italkatalógus kategóriákkal és alkategóriákkal, kétszintű szűrővel',
            'Cukormentes jelvény az italokon',
        ],
        en: [
            'Tier list: new drink catalogue with categories and subcategories and a two-level filter',
            'Sugar-free badge on drinks',
        ],
        de: [
            'Rangliste: neuer Getränkekatalog mit Kategorien und Unterkategorien und zweistufigem Filter',
            'Zuckerfrei-Abzeichen bei Getränken',
        ],
    },
    {
        datum: '2026-10-09',
        hu: [
            'Új Képek oldal: a csoport összes képe egy helyen, feltöltéssel, törléssel és jelentéssel',
            'Feltöltéskor négyzetes kivágás és tömörítés, a képek gyorsabban töltődnek',
        ],
        en: [
            'New Pictures page: all of the group’s pictures in one place, with upload, delete and report',
            'Square cropping and compression on upload; pictures load faster',
        ],
        de: [
            'Neue Bilder-Seite: alle Bilder der Gruppe an einem Ort, mit Hochladen, Löschen und Melden',
            'Quadratischer Zuschnitt und Komprimierung beim Hochladen; Bilder laden schneller',
        ],
    },
    {
        datum: '2026-10-08',
        hu: [
            'Tartozások: összevont nézet hitelezőnként, kölcsönös egyenlítés és visszavonás',
            'Látszik, ki vette fel a tételeket és ki töltötte fel a képeket',
            'Saját megjelenített név',
        ],
        en: [
            'Debts: combined view per creditor, mutual settlement and undo',
            'You can see who added items and who uploaded pictures',
            'Your own display name',
        ],
        de: [
            'Schulden: zusammengefasste Ansicht pro Gläubiger, gegenseitiger Ausgleich und Rückgängig',
            'Sichtbar, wer Einträge erfasst und wer Bilder hochgeladen hat',
            'Eigener Anzeigename',
        ],
    },
    {
        datum: '2026-10-07',
        hu: [
            'Jogi oldalak: Jogi információk és Felhasználási feltételek',
            'Átalakított Profil adatok és Csoport adatok ablak',
        ],
        en: [
            'Legal pages: Legal information and Terms of use',
            'Redesigned Profile details and Group details windows',
        ],
        de: [
            'Rechtliche Seiten: Rechtliche Informationen und Nutzungsbedingungen',
            'Überarbeitete Fenster für Profil- und Gruppendaten',
        ],
    },
    {
        datum: '2026-10-06',
        hu: [
            'Közös költség elosztása: egyenlő vagy egyedi összegekkel',
            'Jobban olvasható, kontrasztosabb témák',
            'Gyorsabb oldalváltás',
        ],
        en: [
            'Splitting shared costs: equal or custom amounts',
            'More readable, higher-contrast themes',
            'Faster page switching',
        ],
        de: [
            'Gemeinsame Kosten aufteilen: gleiche oder individuelle Beträge',
            'Besser lesbare Themes mit mehr Kontrast',
            'Schnellerer Seitenwechsel',
        ],
    },
    {
        datum: '2026-10-05',
        hu: [
            'Bejelentkezés Google-fiókkal',
            'Adatvédelmi és fióktörlési oldal',
            'Tabella: játékok felvétele, szebb telefonos nézet',
        ],
        en: [
            'Sign in with Google',
            'Privacy and account deletion pages',
            'Scoreboard: adding games, nicer phone layout',
        ],
        de: [
            'Anmeldung mit Google',
            'Datenschutz- und Kontolöschungsseite',
            'Tabelle: Spiele hinzufügen, schönere Handyansicht',
        ],
    },
    {
        datum: '2026-09-28',
        hu: [
            'Saját naptár a főoldalon',
            'Ranglista: szűrés, alkoholfok a kártyákon, koktél, energiaital és rum kategória',
            'Új telefonos menü alul',
        ],
        en: [
            'Our own calendar on the home page',
            'Tier list: filters, alcohol content on the cards, cocktail, energy drink and rum categories',
            'New bottom menu on phones',
        ],
        de: [
            'Eigener Kalender auf der Startseite',
            'Rangliste: Filter, Alkoholgehalt auf den Karten, Kategorien Cocktail, Energydrink und Rum',
            'Neues Menü unten auf dem Handy',
        ],
    },
    {
        datum: '2026-09-17',
        hu: [
            'Több csoport kezelése',
            'Saját italok felvétele',
            'Színtémák',
        ],
        en: [
            'Support for multiple groups',
            'Adding your own drinks',
            'Colour themes',
        ],
        de: [
            'Mehrere Gruppen',
            'Eigene Getränke hinzufügen',
            'Farbthemes',
        ],
    },
    {
        datum: '2026-09-09',
        hu: [
            'Tabella: a játékok pontjainak nyilvántartása',
        ],
        en: [
            'Scoreboard: keeping track of game points',
        ],
        de: [
            'Tabelle: Punkte der Spiele festhalten',
        ],
    },
    {
        datum: '2026-08-29',
        hu: [
            'Az első változat: főoldal, tartozások, tervek, ital-ranglista és képfeltöltés, telefonra szabva',
        ],
        en: [
            'The first version: home page, debts, plans, drink tier list and picture upload, made for phones',
        ],
        de: [
            'Die erste Version: Startseite, Schulden, Pläne, Getränke-Rangliste und Bilder-Upload, fürs Handy gemacht',
        ],
    },
];
