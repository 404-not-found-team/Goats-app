# 🏆 ATG – All-Time Greats

Baráti társaságok appja: közös tartozások és egyenlítésük, ital ranglista, tervek, közös naptár (Google Naptár szinkronnal) és galéria – csoportonként, kóddal csatlakozva. Statikus PWA (HTML/CSS/vanilla JS, build nélkül), a háttér Supabase.

- **Élő oldal:** https://404-not-found-team.github.io/Goats-app/
- **Android (Play Áruház, zárt teszt):** `hu.goatsapp.app` – tesztelőknek: [tesztelok.html](https://404-not-found-team.github.io/Goats-app/html/pages/tesztelok.html)

## Dokumentáció
- [Áttekintés](dokumentacio/attekintes.md) – mi miért van, hol mit találsz
- [Útmutató](dokumentacio/utmutato.md) – gyakori feladatok (új téma, nyelv, oldal, kiadás…)
- [Részletek](dokumentacio/reszletek.md) – képek, admin kapcsolók, italkatalógus és szűrés, PWA, mappaszerkezet, jogi oldalak

## Funkciók
- **Csoportok:** Google-bejelentkezés, csatlakozás kóddal vagy új csoport; csoportadmin és superadmin szerepkör.
- **Főoldal:** képsáv, Hány napja számlálók, naptár (Hónap/Lista nézet) és közelgő események, push-értesítéssel.
- **Tartozások:** saját egyenleg legfelül, költségmegosztás, összevont nézet, kölcsönös egyenlítés (visszavonható).
- **Ranglista:** italok S–D szintekre sorolva, színezhető üveg-, doboz- és pohárformákkal; javaslás admin jóváhagyással, csoport- és saját szűrő.
- **Hány napja:** számold, hány napja nem csináltál valamit, rekorddal és csoportos toplistával.
- **Tervek, Képek, Goats Game, Beállítások** (profil, csoport, téma, nyelv: magyar/angol/német).
- **Admin oldal:** globális oldal- és funkciókapcsolók, italjavaslatok, kategóriák, jelentések.

## Mappaszerkezet

Minden fő mappában van egy `README.md` a fájlok leírásával: [`html/`](html/README.md), [`css/`](css/README.md),
[`js/`](js/README.md), [`img/`](img/README.md).

- `index.html` – kezdőlap és bejelentkezés (a gyökérben marad, erre mutat a manifest `start_url`-je)
- `html/pages/` – az app oldalai (`app.html`, `tartozasok.html`, `ranglista.html` …)
- `html/jogi/` – adatvédelmi és jogi oldalak (`index.html` = Jogi információk, `privacy.html`, `fiok-torles.html` …)
- `css/`, `js/`, `img/`, `nyelvek/` – megjelenés, logika, képek, fordítások
- `eszkozok/` – fejlesztői segédscriptek (pl. italképek kicsinyítése), az app nem tölti be őket
- `404.html` + `js/segedek/regi-cim.js` – a régi, mappa nélküli címeket az új helyükre küldi
- JS-ből oldalra/fájlra a `js/segedek/utvonal.js` `ut()` függvényével hivatkozunk

## Helyi indítás
Build nincs, de `file://`-ként nem működik (ES modulok, Supabase), helyi szerver kell:

```bash
python -m http.server 8099   # vagy: npx serve .
```

Majd: http://localhost:8099/index.html

## Kiadás
- Minden kiadásnál emeld a `sw.js` tetején a `CACHE_NEV` értékét (pl. `goats-v59` → `goats-v60`), különben a telepített appok a régi fájlokat kapják.
- A `nyelvek/hu.json`, `en.json` és `de.json` kulcsai legyenek szinkronban.
- Új vagy átrajzolt italkép: `python eszkozok/kepek_kicsinyitese.py`, és a `KEP_VERZIO` emelése a `js/pages/ranglista/ital-kep.js`-ben (lásd [`img/README.md`](img/README.md)).
- Újdonság a tesztelőknek: `js/pages/tesztelok/tesztelok-ujdonsagok.js` (a lista elejére).

## Android (TWA)
Csomagnév `hu.goatsapp.app`, host `404-not-found-team.github.io`, start URL `/Goats-app/`; az `assetlinks.json` a `404-not-found-team.github.io` repóban van.
