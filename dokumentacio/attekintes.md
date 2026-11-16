# ATG – a repó áttekintése

Ez a leírás annak szól, aki most csatlakozik a munkához. Elmondja, mi ez az app, miből áll, és melyik fájl mit csinál.
Ha valamit **csinálni** szeretnél (új téma, új nyelv, új oldal stb.), azt lépésről lépésre az
[útmutató](utmutato.md) írja le. A részletes működési szabályok (jogosultságok, kapcsolók, képkezelés) a
[részletes leírásban](reszletek.md) vannak.

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
| Színek, témák | `css/base/valtozok.css` (színek), `js/settings/tema-valaszto.js` (választó), `js/segedek/tema.js` (alapértelmezett téma) |
| Szövegek, fordítások | `nyelvek/hu.json`, `nyelvek/en.json`, `nyelvek/de.json`; a motor: `js/segedek/nyelv.js` |
| Nyelvválasztó | `js/settings/nyelv-valaszto.js`, zászlók: `img/zaszlok/` |
| Menü (alsó sáv / fiók) | `js/nav-bar.js`, az oldalak listája: `js/segedek/oldalak.js` |
| Beállítások ablak, profil, csoport adatok | `js/settings/` (a HTML-jük: `beallitasok-sablonok.js`) |
| Bejelentkezés, munkamenet, csoport-állapot | `js/hitelesites.js` (`window.goatsAuth`) |
| Supabase kliens | `js/supabase-client.js`, a könyvtár: `js/kulso/supabase-js-2.117.2.js`; hívásminták: [útmutató](utmutato.md#supabase-hívás-sablonok) |
| Tartozások | `tartozasok.html`, `js/pages/tartozasok/tartozasok.js`, egyenlítés: `js/pages/tartozasok/tartozasok-egyenlites.js` |
| Ranglista, italok, italképek | `ranglista.html`, `js/pages/ranglista/ranglista.js`, képek: `js/pages/ranglista/ital-kep.js`, `img/formak/`, `img/mintak/` |
| Italkategóriák | `js/segedek/ital-kategoriak.js` (adat: `ital_kategoriak` tábla) |
| Galéria, képfeltöltés | `kepek.html`, `js/pages/kepek/kepek.js`, tömörítés: `js/segedek/kep-tomorites.js`, kivágás: `js/pages/kepek/kepek-kivago.js` |
| Képjelentés | kliens: `js/pages/kepek/kepek.js`; szerver: `supabase/functions/kep-jelentes/`; admin: `js/pages/admin/admin-jelentesek.js` |
| Push-értesítések | kapcsoló: `js/settings/ertesitesek.js`; felajánlás: `js/settings/ertesites-felajanlas.js`; megjelenítés: `sw.js` vége; küldés: `supabase/functions/push-kuldes/` |
| Google Naptár szinkron | kapcsoló: `js/settings/google-naptar.js`; szerver: `supabase/functions/naptar-szinkron/` |
| Offline működés, gyorsítótár | `sw.js` (`CACHE_NEV`, `ELOGYORSITOTT`) |
| Admin oldal | `admin.html`, `js/pages/admin/`, `css/pages/admin.css` |
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
 │   └─ Edge Functions (kep-jelentes, push-kuldes,│
 │      naptar-szinkron)                         │
 └───────────────────────────────────────────────┘
```

A legfontosabb elv: **a jogosultságot mindig az adatbázis dönti el** (RLS-szabályok és RPC-függvények).
A kliens csak elrejti, amit a felhasználó úgysem csinálhat, de ha valaki megkerüli a felületet, a szerver
akkor is elutasítja.

---

## 4. Mappák és fájlok

Minden fő mappában van egy `README.md`, ami fájlonként leírja, mi mire való. Itt csak a nagy kép:

| Mappa / fájl | Mire való | Részletek |
|---|---|---|
| `index.html` | Kijelentkezett kezdőlap (bemutató + Google-bejelentkezés). Bejelentkezve azonnal az appba visz. A gyökérben marad, erre mutat a manifest `start_url`-je. | |
| `404.html` | A régi, mappa nélküli címeket az új helyükre küldi (`js/segedek/regi-cim.js`) | |
| `html/pages/` | Az app oldalai (`app.html`, `tartozasok.html`, `ranglista.html`, `hanynapja.html` …) | [`html/README.md`](../html/README.md) |
| `html/jogi/` | Jogi oldalak (adatvédelem, ÁSZF, impresszum, fiók törlése) | [`html/README.md`](../html/README.md) |
| `css/` | Megjelenés: témák színei, közös elemek, oldalanként egy fájl | [`css/README.md`](../css/README.md) |
| `js/` | Logika: közös fájlok a gyökérben, `pages/<oldal>/` oldalanként, `segedek/`, `settings/`, `kulso/` | [`js/README.md`](../js/README.md) |
| `img/` | Képek: italformák és -minták (eredeti és kicsinyített), ikonok, zászlók, app-ikonok | [`img/README.md`](../img/README.md) |
| `nyelvek/` | `hu.json`, `en.json`, `de.json`: kulcs → szöveg. Mindhárom kulcsai legyenek szinkronban. | |
| `eszkozok/` | Fejlesztői segédscriptek (pl. `kepek_kicsinyitese.py`), az app nem tölti be őket | [`img/README.md`](../img/README.md) |
| `supabase/functions/` | Edge Functionök forrása (`kep-jelentes`, `push-kuldes`, `naptar-szinkron`). A Supabase-be külön kell telepíteni őket. | |
| `manifest.json` | PWA-adatok: név, ikonok, start URL | |
| `sw.js` | Service worker: előgyorsítótár, offline működés, italképek tartós tára, push-értesítések | [részletek](reszletek.md#-pwa-támogatás) |
| `dokumentacio/` | Ez a leírás, az [útmutató](utmutato.md) és a [részletes leírás](reszletek.md) | |

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
| `italok`, `ital_kategoriak`, `ital_osszetevok`, `ital_ranglista`, `ital_ranglista_naplo`, `szin_paletta` | Italkatalógus, kategóriák, receptek, a csoportok rangsorai, ki mit hova tett; a `szin_paletta` (régi mentett színek) már csak olvasásra kell, amíg italok hivatkoznak rá. |
| `kepek`, `jelentesek` | Galériaképek adatai; jelentések. A fájlok a `kepek` és a privát `jelentett` bucketben vannak. |
| `goatgame_*` | Goats Game: játékok, meccsek, pontok, színek. |
| `jatek_szabalyok`, `jatek_lepesek`, `jatek_javaslatok` | Játékszabályok. |
| `app_kapcsolok`, `app_beallitasok` | Globális kapcsolók (html/pages/funkciók ki-be), számértékű beállítások. |
| `push_feliratkozasok` | Eszközönkénti push-feliratkozások (csak RPC-n írható). |
| `naptar_szinkron`, `naptar_megosztasok` | Ki kapcsolta be a Google Naptár szinkront (saját sor), és kivel van megosztva melyik csoportnaptár (csak a szerver). |
| `naplo` | Műveleti napló (csak superadmin látja). |

Fontos függvények: `is_superadmin()`, `my_group_ids()`, `funkcio_engedelyezve(kulcs)`, és a felületről hívott
RPC-k (pl. `approve_drink`, `admin_jelentesek`, `push_feliratkozas_mentese`).

**Edge Functionök:**

| Függvény | Ki hívja | Mit csinál |
|---|---|---|
| `kep-jelentes` | a kliens (bejelentkezve) | elmenti a jelentést, és a képről másolatot tesz a privát `jelentett` bucketbe |
| `push-kuldes` | adatbázis-triggerek (`pg_net`), titkos fejléccel | kiküldi a push-értesítéseket a címzettek nyelvén |
| `naptar-szinkron` | adatbázis-triggerek (`pg_net`), titkos fejléccel | a csoportok Google-naptárát kezeli egy Google-robotfiókkal (`GOOGLE_SERVICE_ACCOUNT` titok): naptár létrehozása, megosztás, események felvétele/módosítása/törlése |

---

## 7. Fő rendszerek röviden

**Nyelvek.** A HTML alapból magyar. A fordítandó elem `data-i18n="kulcs"` attribútumot kap, a JS-ből kiírt szöveg
`tr('kulcs', 'magyar alapszöveg', { helyőrzők })`. Amíg a felhasználó nem választ, a készülék nyelve dönt (`navigator.languages`);
a választás a fiókba is mentődik. Nyelvváltáskor az oldal újratölt.

**Témák.** A téma a `<html data-theme="…">` attribútum; minden szín CSS-változó a `valtozok.css`-ben. Alapértelmezett: `discord-purple` (Mélylila).

**Jogosultság.** Három szint: csoporttag, csoportadmin, superadmin (a csapat). Minden ellenőrzés az adatbázisban (RLS). A globális kapcsolókkal oldalak és funkciók kapcsolhatók ki mindenkinek (a superadminra nem vonatkoznak).

**Italképek.** Egy ital képe sorrendben: színezett forma (rétegek + az ital színei) → saját kép → koktélkép → kategória-ikon. Márkás képeket jogi okból nem tárolunk.

**Képek.** A `kepek` bucket privát, aláírt linkkel jelenik meg; feltöltés előtt négyzetes kivágás és tömörítés (max 150 KB). Jelentéskor másolat megy a `jelentett` bucketbe.

**Értesítések.** A felhasználó eszközönként kapcsolja be; az adatbázis-trigger új tartozásnál (az adósnak), új naptáreseménynél (a csoport többi tagjának), új jelentésnél és jóváhagyásra váró italnál (a superadminoknak) meghívja a `push-kuldes` függvényt.

**Google Naptár.** Aki a beállításokban bekapcsolja, annak a csoport Google-naptárát (a robotfiók tulajdona, `groups.google_naptar_id`) megosztjuk a Google-fiókja e-mail címével; a Google e-mailjében egyszer hozzá kell adnia. Az első bekapcsoláskor jön létre a csoport naptára, a mai és későbbi eseményekkel. Utána az esemény felvétele, módosítása és törlése triggerrel kerül át (`esemenyek.google_esemeny_id`). A robotfiók a csapat Google Cloud szervezetének „My First Project” projektjében van.

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

1. Olvasd el ezt, és fusd át a [részletes leírás](reszletek.md) fejezeteit.
2. Indítsd el helyben: a repó gyökerében `python -m http.server 8099`, majd `http://localhost:8099/index.html`.
   `file://`-ként nem működik. Az adatok az élő Supabase-ből jönnek, tehát amit helyben csinálsz, az élesben történik.
3. Nézd meg egy egyszerű oldal útját elejétől végéig: `tervek.html` → `js/pages/tervek/tervek.js`.
4. Bármi új dolognál előbb nézd meg az [útmutatót](utmutato.md): ott van lépésenként, hogy mit hol kell átírni.
