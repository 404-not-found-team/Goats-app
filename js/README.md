# `js/` – a logika

Build nincs, minden fájl úgy fut, ahogy itt van. Kétféle script van:

- **ES modul** (`<script type="module">`, `import`/`export`): a gyökérben lévő közös fájlok és az újabb oldalak.
- **Klasszikus script** (`window.valami` globálisokkal): a régebbi oldalscriptek és a `<head>`-ben szinkron futó segédek.
  Ezek a gyökér útvonalát a `document.currentScript.src`-ből számolják.

Hivatkozás oldalra/fájlra JS-ből: `ut('html/pages/ranglista.html')` a `segedek/utvonal.js`-ből (mindig a gyökérhez képest).

## A gyökérben – közös fájlok minden bejelentkezett oldalon

| Fájl | Mire való |
|---|---|
| `main.js` | Gyűjtőmodul: betölti az auth-ot, menüt, beállításokat, témát, kapcsolókat |
| `hitelesites.js` | Munkamenet, profil, csoport, tagok, kapcsolók állapota (`window.goatsAuth`), pillanatképpel |
| `supabase-client.js` | Az egyetlen közös Supabase kliens (`window._supabase`) |
| `supabase_hibakezeles.js` | Közös Supabase-hibakezelő (`window.goatsHiba.hibaVan`) |
| `admin-muveletek.js` | Csoport- és profilműveletek (RPC-hívások) |
| `nav-bar.js` | A menü: telefonon alsó sáv, gépen oldalsáv |
| `beallitasok-modal.js` | A beállítások ablak kerete |

## `pages/<oldal>/` – oldalanként egy mappa

Minden oldalnak saját mappája van (`app`, `tartozasok`, `ranglista`, `hanynapja`, `tervek`, `kepek`,
`goatsgame`, `jatekszabalyok`, `admin`, `bejelentkezes`, `tesztelok`). A nagyobbaknál a fájlok szerepe:

| Fájl | Szerepe |
|---|---|
| `<oldal>.js` | Vezérlő: mi történik egy gombnyomásra, összeköti a többit |
| `<oldal>-adat.js` | Adatréteg: **minden** Supabase-hívás itt, a felülethez nem nyúl |
| `<oldal>-megjelenites.js` | Megjelenítés: DOM építése és kirajzolása, az adatbázist nem ismeri |
| `<oldal>-seged.js` | Tiszta segédfüggvények (se DOM, se adatbázis) |

Néhány külön fájl:

| Fájl | Mire való |
|---|---|
| `app/naptar.js` | Főoldali naptár: Hónap/Lista nézet, kiválasztott nap eseményei, közelgő események kártya |
| `app/galeria.js` | Főoldali képsáv |
| `app/app-orzo.js` | Munkamenet nélkül visszaküld a kezdőlapra |
| `ranglista/ital-kep.js` | Italkép egy helyen: színezett forma (rétegek), márkakép, kategória-ikon. Itt van a `FORMAK`, `MINTAK` lista és a `KEP_VERZIO` (lásd `img/README.md`) |
| `tartozasok/tartozasok-egyenlites.js` | Lenyíló részletek, kölcsönös egyenlítés, visszavonás |
| `hanynapja/hanynapja-fooldal.js` | A főoldali Hány napja sáv |
| `kepek/kepek-kivago.js` | Négyzetes kivágás feltöltés előtt |
| `tesztelok/tesztelok-ujdonsagok.js` | **Az újdonságok listája** (a tesztelő és az Újdonságok oldal is ezt mutatja) |

## `segedek/` – általános segédek

| Fájl | Mire való |
|---|---|
| `nyelv.js` | Fordítások (`tr()`, `data-i18n`), szinkron a `<head>` elején |
| `tema.js` | Téma alkalmazása, alapértelmezett téma |
| `utvonal.js` | `ut()`: útvonal a gyökérhez képest |
| `html-esemenyek.js` | `data-katt` / `data-valtozas` / `data-bevitel` kezelése (inline `onclick` helyett) |
| `szin-osztaly.js` | Dinamikus szín CSS-osztályként (`--szin`), inline stílus nélkül |
| `oldalak.js` | Az app oldalainak listája (menü, admin kapcsolók) |
| `oldal-orzo.js`, `funkcio-kapcsolo.js` | Globálisan kikapcsolt oldal/funkció kivédése, gombok letiltása |
| `ital-kategoriak.js` | Italkategóriák és alkategóriák |
| `adat-gyorsitotar.js` | Utoljára látott adatok helyben, hogy az oldal azonnal kirajzolódjon |
| `kep-gyorsitotar.js` | Galériaképek helyi gyorsítótára (Cache Storage) |
| `kep-tomorites.js` | Képek kicsinyítése, tömörítése feltöltés előtt |
| `csoport-kepek.js`, `csoport-kod.js` | Csoport képei / csoportkód a klasszikus scripteknek |
| `modal-fokusz.js` | Megnyíló ablak kapja a fókuszt |
| `keslelteto.js` | Debounce |
| `sw-regisztracio.js` | Service worker regisztrálása |
| `gyors-atiranyitas.js` | Kezdőlap: bejelentkezve azonnal az appba |
| `regi-cim.js` | 404-oldal: régi címek továbbküldése |
| `teljesitmeny.js` | Betöltési mérés `?perf=1`-gyel |

## `settings/` – a beállítások ablak részei

`belepes-modal.js`, `profil-modal.js`, `csoport-adatok.js`, `tema-valaszto.js`, `nyelv-valaszto.js`,
`ertesitesek.js`, `ertesites-felajanlas.js`, `google-naptar.js`, `tos-ujraelfogadas.js`, és a HTML-sablonjuk:
`beallitasok-sablonok.js`.

## `kulso/` – külső könyvtárak

`supabase-js`, `heic2any` (HEIC-képek átalakítása), licencfájlokkal. Ezekbe nem írunk bele; frissítés:
`dokumentacio/utmutato.md`, „Külső könyvtár frissítése”.
