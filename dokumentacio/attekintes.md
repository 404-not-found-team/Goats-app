# ATG – a repó áttekintése

Ez a leírás annak szól, aki most csatlakozik a munkához. Elmondja, mi ez az app, miből áll, és melyik fájl mit csinál.
Ha valamit **csinálni** szeretnél (új téma, új nyelv, új oldal stb.), azt lépésről lépésre az
[útmutató](utmutato.md) írja le. A részletes működési szabályok (jogosultságok, kapcsolók, képkezelés) a
[README](../README.md)-ben vannak.

## Tartalom

1. [Mi ez az app?](#1-mi-ez-az-app)
2. [Gyors kereső: mit hol találsz?](#2-gyors-kereső-mit-hol-találsz)
3. [Hogyan épül fel?](#3-hogyan-épül-fel)
4. [Mappák és fájlok](#4-mappák-és-fájlok)
5. [Hogyan tölt be egy oldal?](#5-hogyan-tölt-be-egy-oldal)
6. [Adatbázis (Supabase)](#6-adatbázis-supabase)
7. [Fő rendszerek röviden](#7-fő-rendszerek-röviden)
8. [Szabályok, amiket mindenki betart](#8-szabályok-amiket-mindenki-betart)
9. [Szótár: magyar nevek a kódban](#9-szótár-magyar-nevek-a-kódban)
10. [Az első napod](#10-az-első-napod)

---

## 1. Mi ez az app?

**ATG – All-Time Greats**: baráti társaságoknak szóló app. Egy csoport tagjai közösen vezetik:

- **Tartozások**: ki kinek mennyivel tartozik, közös költség elosztása, kölcsönös egyenlítés.
- **Ranglista**: italok S–D kategóriákba sorolva (tier list), csoportonkénti szűrővel.
- **Tervek** és **naptár** (események).
- **Képek**: közös galéria feltöltéssel és jelentéssel.
- **Goats Game**: pontozótábla a csoport játékaihoz.
- **Admin oldal** a csapatnak (superadmin): kapcsolók, italjavaslatok, kategóriák, színek, jelentések.

Kétnyelvű (magyar és angol), öt témával, push-értesítésekkel.

**Hol fut:**

| Mi | Hol |
|---|---|
| Weboldal (PWA) | GitHub Pages: `https://404-not-found-team.github.io/Goats-app/` – a `main` ág tartalma élesben |
| Adatbázis, bejelentkezés, fájlok, szerverfüggvények | Supabase, projekt: `bvositlxbeqztnhdembx` (EU, Írország) |
| Android-app | Google Play, csomagnév `hu.goatsapp.app` – a weboldalt mutató keret (TWA), PWABuilderrel készül |
| iPhone | nincs App Store-os app; Safariból a kezdőképernyőre tett PWA |

Nincs build lépés, nincs keretrendszer, nincs npm a weboldalhoz: sima HTML, CSS és JavaScript fájlok, ahogy a repóban vannak.

---

## 2. Gyors kereső: mit hol találsz?

| Ha ezt keresed… | …itt van |
|---|---|
| Színek, témák | `css/base/valtozok.css` (színek), `js/elemek/beallitasok/tema-valaszto.js` (választó), `js/segedek/tema.js` (alapértelmezett téma) |
| Szövegek, fordítások | `nyelvek/hu.json`, `nyelvek/en.json`; a motor: `js/segedek/nyelv.js` |
| Nyelvválasztó | `js/elemek/beallitasok/nyelv-valaszto.js`, zászlók: `img/zaszlok/` |
| Menü (alsó sáv / fiók) | `js/elemek/nav-bar.js`, az oldalak listája: `js/segedek/oldalak.js` |
| Beállítások ablak, profil, csoport adatok | `js/elemek/beallitasok/` (a HTML-jük: `beallitasok-sablonok.js`) |
| Bejelentkezés, munkamenet, csoport-állapot | `js/hitelesites.js` (`window.goatsAuth`) |
| Supabase kliens | `js/supabase-client.js`, a könyvtár: `js/kulso/supabase-js-2.117.2.js`; hívásminták: [útmutató](utmutato.md#supabase-hívás-sablonok) |
| Tartozások | `tartozasok.html`, `js/pages/tartozasok.js`, egyenlítés: `js/elemek/tartozasok-egyenlitese.js` |
| Ranglista, italok, italképek | `ranglista.html`, `js/pages/ranglista.js`, képek: `js/segedek/ital-kep.js`, `img/formak/`, `img/mintak/` |
| Italkategóriák | `js/segedek/ital-kategoriak.js` (adat: `ital_kategoriak` tábla) |
| Galéria, képfeltöltés | `kepek.html`, `js/pages/kepek.js`, tömörítés: `js/segedek/kep-tomorites.js`, kivágás: `js/elemek/kep-kivago.js` |
| Képjelentés | kliens: `js/pages/kepek.js`; szerver: `supabase/functions/kep-jelentes/`; admin: `js/pages/admin-jelentesek.js` |
| Push-értesítések | kapcsoló: `js/elemek/beallitasok/ertesitesek.js`; felajánlás: `js/elemek/ertesites-felajanlas.js`; megjelenítés: `sw.js` vége; küldés: `supabase/functions/push-kuldes/` |
| Offline működés, gyorsítótár | `sw.js` (`CACHE_NEV`, `ELOGYORSITOTT`) |
| Admin oldal | `admin.html`, `js/pages/admin*.js`, `css/pages/admin.css` |
| Globális kapcsolók (oldal/funkció ki-be) | `js/segedek/oldalak.js` (lista), `js/segedek/oldal-orzo.js`, `js/segedek/funkcio-kapcsolo.js` |
| Jogi oldalak | `jogi.html`, `privacy.html`, `felhasznalasi-feltetelek.html`, `fiok-torles.html` |
| App neve, ikonja (telepítéskor) | `manifest.json`, `img/icon-*.png` |
| Biztonsági szabályok (CSP) | minden HTML `<head>`-jében a `Content-Security-Policy` meta |
| Gombok kattintás-kezelése a HTML-ben | `data-katt` / `data-valtozas` / `data-bevitel` → `js/segedek/html-esemenyek.js` |
| Dinamikus szín (pl. ital színe) | `js/segedek/szin-osztaly.js` (CSS-osztályt gyárt, nem inline stílust) |

---

## 3. Hogyan épül fel?

```
 Böngésző / telefon
 ┌──────────────────────────────────────────────┐
 │  HTML oldalak (index, app, ranglista …)        │
 │   ├─ css/   – megjelenés, témák                │
 │   ├─ js/    – logika                           │
 │   ├─ nyelvek/*.json – szövegek                 │
 │   └─ sw.js  – offline gyorsítótár, push        │
 └──────────────┬───────────────────────────────┘
                │  supabase-js (REST, Auth, Storage, Functions)
 ┌──────────────▼───────────────────────────────┐
 │  Supabase                                     │
 │   ├─ Postgres + RLS (minden jogosultság itt)  │
 │   ├─ Auth (Google-bejelentkezés)              │
 │   ├─ Storage (kepek, jelentett bucket)        │
 │   └─ Edge Functions (kep-jelentes, push-kuldes)│
 └───────────────────────────────────────────────┘
```

A legfontosabb elv: **a jogosultságot mindig az adatbázis dönti el** (RLS-szabályok és RPC-függvények).
A kliens csak elrejti, amit a felhasználó úgysem csinálhat, de ha valaki megkerüli a felületet, a szerver
akkor is elutasítja.

---

## 4. Mappák és fájlok

### Gyökér

| Fájl | Mire való |
|---|---|
| `index.html` | Kijelentkezett kezdőlap (bemutató + Google-bejelentkezés). Bejelentkezve azonnal az `app.html`-re visz. |
| `app.html` | Bejelentkezett főoldal: galéria-nézegető és naptár. |
| `tartozasok.html`, `ranglista.html`, `tervek.html`, `kepek.html`, `goatsgame.html` | Az app oldalai. |
| `jatekszabalyok.html` | Játékszabályok (jelenleg kivéve a menüből, a kód megvan). |
| `admin.html` | Csak superadminoknak. |
| `jogi.html`, `privacy.html`, `felhasznalasi-feltetelek.html`, `fiok-torles.html` | Jogi oldalak (a Play is ezeket linkeli). |
| `manifest.json` | PWA-adatok: név, ikonok, start URL. |
| `sw.js` | Service worker: előgyorsítótár, offline működés, push-értesítések megjelenítése. |
| `README.md` | Részletes működési leírás (jogosultságok, kapcsolók, képek, TWA). |
| `dokumentacio/` | Ez a leírás és az [útmutató](utmutato.md). |

### `css/`

| Mappa / fájl | Mire való |
|---|---|
| `main.css` | Gyűjtőfájl: `@import`-tal behúzza a többit. Minden oldal ezt tölti be. |
| `base/valtozok.css` | **A témák színei** CSS-változóként (`--bg-color`, `--accent-color` …) és a betűméret-skála. |
| `base/visszaallitas.css` | Böngésző-alapstílusok nullázása. |
| `base/segedosztalyok.css` | Apró újrahasznosítható osztályok (`.status-hiba`, `.szoveg-kicsi` …). |
| `elemek/` | Komponensek: navbar, modalok, lenyíló menü, lebegő címke, italszínezés, tartozás-egyenlítés, választókártyák (téma/nyelv/értesítés). |
| `pages/` | Oldalankénti stílus (`bejelentkezes.css` = index, `fooldal.css` = app, a többi a nevéről). |
| `kulso/fontawesome-6.5.1/` | Font Awesome ikonkészlet (csak a „solid”), saját tárhelyen. |

### `js/`

| Mappa / fájl | Mire való |
|---|---|
| `main.js` | A bejelentkezett oldalak közös modulja: auth, menü, beállítások, téma, kapcsolók betöltése. |
| `hitelesites.js` | Munkamenet, profil, csoport, tagok, globális kapcsolók állapota (`window.goatsAuth`). Pillanatképet tart, hogy az oldal azonnal kirajzolódjon. |
| `supabase-client.js` | Egyetlen közös Supabase kliens (`window._supabase`). |
| `admin-muveletek.js` | Csoport- és profilműveletek RPC-hívásai. |
| `elemek/` | Újrahasználható felületi részek: menü, galéria, naptár, képkivágó, tartozás-egyenlítés, értesítés-felajánlás, beállítások ablak. |
| `elemek/beallitasok/` | A beállítások al-ablakai: belépés, profil, csoport adatok, téma, nyelv, értesítések, ÁSZF-újraelfogadás, és a HTML-sablonjuk. |
| `pages/` | Oldalanként egy belépési script (az oldal nevével), plusz az admin fülei (`admin-*.js`). |
| `segedek/` | Általános segédek: nyelv, téma, italkép, italkategóriák, képtömörítés, gyorsítótárak, kapcsolók, oldallista, eseménykötés. |
| `kulso/` | Külső könyvtárak saját tárhelyen: supabase-js, heic2any (HEIC-képek átalakítása). Ezekbe nem írunk bele. |

### Egyéb

| Mappa | Mire való |
|---|---|
| `nyelvek/` | `hu.json`, `en.json`: kulcs → szöveg. |
| `img/formak/`, `img/mintak/` | Színezhető italformák rétegei és mintái (lásd `img/formak/README.md`). |
| `img/ikonok/` | Italkategória-ikonok (SVG, a téma színét veszik fel). |
| `img/koktelok/` | Koktélképek a nevük alapján. |
| `img/zaszlok/` | Zászlók a nyelvválasztóhoz. |
| `img/icon-*.png`, `img/ertesites-jelveny.png` | App-ikonok; az értesítés egyszínű jelvénye a státuszsorba. |
| `supabase/functions/` | Edge Functionök forrása (`kep-jelentes`, `push-kuldes`). A Supabase-be külön kell telepíteni őket. |

---

## 5. Hogyan tölt be egy oldal?

Minden HTML `<head>`-jében ugyanez a sorrend, és ennek oka van:

1. **CSP meta**: mit tölthet be az oldal (lásd [8. pont](#8-szabályok-amiket-mindenki-betart)).
2. **`js/segedek/nyelv.js`**: elsőként, szinkron. Azonnal beállítja a nyelvet, és elérhetővé teszi a `tr()` függvényt, amit minden más script használ.
3. **`js/kulso/supabase-js-…js`**: a Supabase könyvtár.
4. **`js/main.js`** (modul): auth, menü, beállítások.
5. Az **oldal saját scriptje** (`js/pages/<oldal>.js`).
6. **`js/segedek/html-esemenyek.js`** (defer): bekötni a `data-katt` és társai gombokat.

A `<body data-oldal="…">` jelzi, melyik oldal ez. Ebből tudja a menü kiemelni, és az oldal-őrző kitiltani, ha ki van kapcsolva.

Gyorsaság: a `hitelesites.js` a legutóbbi állapotot (bejelentkezés, csoport, kapcsolók) pillanatképként
tárolja, így az oldal hálózatra várás nélkül rajzolódik ki, a friss adat a háttérben jön. A `sw.js` a
fájlokat a gyorsítótárból adja, és a háttérben frissíti („stale-while-revalidate”).

---

## 6. Adatbázis (Supabase)

A sémát nem tároljuk a repóban (nincs `sql/` mappa). A változtatások migrációként mennek a Supabase-be.
A fontosabb táblák:

| Tábla | Mit tárol |
|---|---|
| `profiles` | Felhasználó: név, e-mail, `system_role` (`superadmin` vagy üres), `language`, ÁSZF-verzió. |
| `groups`, `group_members` | Csoportok (név, kód, `enabled_pages`, szűrő) és tagságok (admin/tag). |
| `tartozasok`, `tartozas_egyenlitesek` | Tartozások és az egyenlítések. |
| `tervek`, `esemenyek` | Tervek és naptáresemények. |
| `italok`, `ital_kategoriak`, `ital_osszetevok`, `ital_ranglista`, `ital_ranglista_naplo`, `szin_paletta` | Italkatalógus, kategóriák, receptek, a csoportok rangsorai, ki mit hova tett, mentett színek. |
| `kepek`, `jelentesek` | Galériaképek adatai; jelentések. A fájlok a `kepek` és a privát `jelentett` bucketben vannak. |
| `goatgame_*` | Goats Game: játékok, meccsek, pontok, színek. |
| `jatek_szabalyok`, `jatek_lepesek`, `jatek_javaslatok` | Játékszabályok. |
| `app_kapcsolok`, `app_beallitasok` | Globális kapcsolók (oldalak/funkciók ki-be), számértékű beállítások. |
| `push_feliratkozasok` | Eszközönkénti push-feliratkozások (csak RPC-n írható). |
| `naplo` | Műveleti napló (csak superadmin látja). |

Fontos függvények: `is_superadmin()`, `my_group_ids()`, `funkcio_engedelyezve(kulcs)`, és a felületről hívott
RPC-k (pl. `approve_drink`, `admin_jelentesek`, `push_feliratkozas_mentese`).

**Edge Functionök:**

| Függvény | Ki hívja | Mit csinál |
|---|---|---|
| `kep-jelentes` | a kliens (bejelentkezve) | elmenti a jelentést, és a képről másolatot tesz a privát `jelentett` bucketbe |
| `push-kuldes` | adatbázis-triggerek (`pg_net`), titkos fejléccel | kiküldi a push-értesítéseket a címzettek nyelvén |

---

## 7. Fő rendszerek röviden

**Nyelvek.** A HTML alapból magyar. A fordítandó elem `data-i18n="kulcs"` attribútumot kap, a JS-ből kiírt szöveg
`tr('kulcs', 'magyar alapszöveg', { helyőrzők })`. Amíg a felhasználó nem választ, a készülék nyelve dönt (`navigator.languages`);
a választás a fiókba is mentődik. Nyelvváltáskor az oldal újratölt.

**Témák.** A téma a `<html data-theme="…">` attribútum; minden szín CSS-változó a `valtozok.css`-ben. Alapértelmezett: `discord-purple` (Mélylila).

**Jogosultság.** Három szint: csoporttag, csoportadmin, superadmin (a csapat). Minden ellenőrzés az adatbázisban (RLS). A globális kapcsolókkal oldalak és funkciók kapcsolhatók ki mindenkinek (a superadminra nem vonatkoznak).

**Italképek.** Egy ital képe sorrendben: színezett forma (rétegek + az ital színei) → saját kép → koktélkép → kategória-ikon. Márkás képeket jogi okból nem tárolunk.

**Képek.** A `kepek` bucket privát, aláírt linkkel jelenik meg; feltöltés előtt négyzetes kivágás és tömörítés (max 150 KB). Jelentéskor másolat megy a `jelentett` bucketbe.

**Értesítések.** A felhasználó eszközönként kapcsolja be; az adatbázis-trigger új tartozásnál (az adósnak), új jelentésnél és jóváhagyásra váró italnál (a superadminoknak) meghívja a `push-kuldes` függvényt.

**Offline.** A `sw.js` előre letölti az `ELOGYORSITOTT` listában szereplő fájlokat. Minden kiadásnál emelni kell a `CACHE_NEV` számát, különben a telepített appok a régi fájlokat mutatják.

---

## 8. Szabályok, amiket mindenki betart

- **Nincs inline stílus** (`style="…"` sem a HTML-ben, sem JS-ből), és **nincs `!important`**. Minden stílus `.css` fájlban; dinamikus színhez a `szin-osztaly.js`.
- **Nincs inline script és inline eseménykezelő** (`onclick="…"`). A CSP le is tiltja. Helyette `data-katt="fuggvenyNev"` vagy `addEventListener`.
- **Felhasználói adat** (név, leírás) a DOM-ba `textContent`-tel kerül; ha HTML-sablonba kell, `esc()`-vel.
- **Külső könyvtár** csak a `js/kulso/` vagy `css/kulso/` mappába, saját tárhelyről; CDN-ről semmi.
- **Magyar nevek**: fájlok, mappák, változók, függvények magyarul (ékezet nélkül a fájlneveknél). A régi angol nevek (pl. `supabase-client.js`, `main.js`, `goatsgame`) maradnak.
- **Minden új szöveg** mindkét nyelvi fájlba (`hu.json`, `en.json`).
- **Adatbázis-változás** csak migrációval, és a csapattal egyeztetve; `sql/` mappát nem teszünk a repóba.
- **Kiadás előtt** `sw.js` → `CACHE_NEV` emelése (lásd [útmutató](utmutato.md#kiadás-élesítés)).

---

## 9. Szótár: magyar nevek a kódban

| Szó | Jelentés |
|---|---|
| `elemek` | komponensek |
| `segedek` | segédfüggvények |
| `kulso` | külső (harmadik féltől származó) |
| `oldal`, `oldalak` | page(s) |
| `allapot` | state / státuszüzenet |
| `kapcsolo` | switch, kapcsoló |
| `funkcio` | feature |
| `beallitas` | setting |
| `csoport`, `tag` | group, member |
| `tartozas`, `ados`, `hitelezo` | debt, debtor, creditor |
| `egyenlites` | settlement |
| `ital`, `forma`, `minta`, `szin` | drink, shape, pattern, color |
| `kep`, `feltoltes`, `jelentes` | picture, upload, report |
| `ertesites`, `feliratkozas` | notification, subscription |
| `nyelv`, `forditas` | language, translation |
| `tema` | theme |
| `gyorsitotar` | cache |
| `ujElem`, `kartya`, `racs`, `gomb` | createElement-segéd, card, grid, button |
| `betolt`, `mentes`, `torol`, `valt` | load, save, delete, switch |

---

## 10. Az első napod

1. Olvasd el ezt, és fusd át a [README](../README.md) fejezeteit.
2. Indítsd el helyben: a repó gyökerében `python -m http.server 8099`, majd `http://localhost:8099/index.html`.
   `file://`-ként nem működik. Az adatok az élő Supabase-ből jönnek, tehát amit helyben csinálsz, az élesben történik.
3. Nézd meg egy egyszerű oldal útját elejétől végéig: `tervek.html` → `js/pages/tervek.js`.
4. Bármi új dolognál előbb nézd meg az [útmutatót](utmutato.md): ott van lépésenként, hogy mit hol kell átírni.
