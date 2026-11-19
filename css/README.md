# `css/` – a megjelenés

Minden oldal a `main.css`-t tölti be. Ez `@import`-tal behúzza az alapokat, a közös elemeket, és a kezdőlap/főoldal
stílusát (`pages/bejelentkezes.css`, `pages/fooldal.css`). A többi oldal ezen felül a saját `pages/` fájlját tölti be.

## Mappák

| Mappa | Mi van benne |
|---|---|
| `base/` | `valtozok.css` (**a témák színei** CSS-változóként, betűméret-skála), `visszaallitas.css` (reset), `segedosztalyok.css` (apró, újrahasználható osztályok) |
| `elemek/` | Közös komponensek több oldalon: `navbar.css`, `modals.css`, `oldal-fejlec.css`, `lenyilo-menu.css`, `lebego-cimke.css`, `valaszto-kartyak.css` (téma/nyelv kártyák), `ital-szinezes.css` (italok rétegei), `tartozasok-egyenlitese.css`, `telepites.css`, `ablakok.css` (toast és megerősítő ablakok) |
| `pages/` | Oldalanként egy fájl, az oldal nevével (`ranglista.css` = `ranglista.html`). Kivétel: `bejelentkezes.css` = kezdőlap **és** a főoldal (`app.html`) naptára, közelgő eseményei; `fooldal.css` = főoldal; `jogi.css` = jogi oldalak és Újdonságok |
| `kulso/fontawesome-6.5.1/` | Font Awesome ikonok (csak a „solid”), saját tárhelyen |

## Szabályok

- **Színt csak változóval:** `var(--accent-color)`, `var(--text-secondary)` stb. a `base/valtozok.css`-ből, így minden téma működik.
- **Nincs inline stílus** (a CSP tiltja). Ha JS-ből kell szín, a `js/segedek/szin-osztaly.js` ad rá osztályt.
- **Töréspontok:** `max-width: 600px` = telefon, `max-width: 1000px` = telefon és tablet, `min-width: 1001px` = gép.
- **Betűméret:** a skála változói (`--fs-xs` … `--fs-xxl`), ne px.
- **`[hidden]`:** a `base/visszaallitas.css` mindig elrejti; ha valaminek rejtve is helyet kell foglalnia, osztállyal
  és `visibility: hidden`-nel oldd meg (lásd a naptár `.nezet-rejtett` osztályát).
- Új téma: `dokumentacio/utmutato.md`, „Új téma”.
