# 🏆 ATG – All-Time Greats

Baráti társaságok appja: közös tartozások és egyenlítésük, ital ranglista, tervek, közös naptár (Google Naptár szinkronnal) és galéria – csoportonként, kóddal csatlakozva. Statikus PWA (HTML/CSS/vanilla JS, build nélkül), a háttér Supabase.

- **Élő oldal:** https://404-not-found-team.github.io/Goats-app/
- **Android (Play Áruház, zárt teszt):** `hu.goatsapp.app` – tesztelőknek: [tesztelok.html](https://404-not-found-team.github.io/Goats-app/oldalak/tesztelok.html)

## Dokumentáció
- [Áttekintés](dokumentacio/attekintes.md) – mi miért van, hol mit találsz
- [Útmutató](dokumentacio/utmutato.md) – gyakori feladatok (új téma, nyelv, oldal, kiadás…)
- [Részletek](dokumentacio/reszletek.md) – képek, admin kapcsolók, italkatalógus és szűrés, PWA, mappaszerkezet, jogi oldalak

## Funkciók
- **Csoportok:** Google-bejelentkezés, csatlakozás kóddal vagy új csoport; csoportadmin és superadmin szerepkör.
- **Főoldal:** galéria és havi naptár eseményekkel, push-értesítéssel.
- **Tartozások:** költségmegosztás, összevont nézet, kölcsönös egyenlítés (visszavonható).
- **Ranglista:** italok S–D szintekre sorolva, javaslás admin jóváhagyással, csoport- és saját szűrő.
- **Tervek, Képek, Goats Game, Beállítások** (profil, csoport, téma, nyelv: magyar/angol).
- **Admin oldal:** globális oldal- és funkciókapcsolók, italjavaslatok, kategóriák, jelentések.

## Mappaszerkezet
- `index.html` – kezdőlap és bejelentkezés (a gyökérben marad, erre mutat a manifest `start_url`-je)
- `oldalak/` – az app oldalai (`app.html`, `tartozasok.html`, `ranglista.html` …)
- `jogi/` – adatvédelmi és jogi oldalak (`index.html` = Jogi információk, `privacy.html`, `fiok-torles.html` …)
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
- A `nyelvek/hu.json` és `nyelvek/en.json` kulcsai legyenek szinkronban.
- Újdonság a tesztelőknek: `js/pages/tesztelok-ujdonsagok.js` (a lista elejére).

## Android (TWA)
Csomagnév `hu.goatsapp.app`, host `404-not-found-team.github.io`, start URL `/Goats-app/`; az `assetlinks.json` a `404-not-found-team.github.io` repóban van.
