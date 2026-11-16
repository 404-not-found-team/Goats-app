# `html/` – az app oldalai

A kezdőlap (`index.html`) és a `404.html` a repó gyökerében marad (a manifest `start_url`-je és a GitHub Pages ezt
várja), minden más oldal itt van. Az oldalak a gyökérhez képest két szinttel lejjebb vannak, ezért minden saját
fájlra `../../` előtaggal hivatkoznak (pl. `../../css/main.css`); JS-ből a `js/segedek/utvonal.js` `ut()` függvényével.

## `pages/` – a bejelentkezett app oldalai

| Oldal | Mi ez | Saját JS | Saját CSS |
|---|---|---|---|
| `app.html` | Főoldal: képsáv, Hány napja, naptár (Hónap/Lista), közelgő események | `js/pages/app/` | a `main.css` hozza (`bejelentkezes.css`, `fooldal.css`) |
| `tartozasok.html` | Tartozások: saját egyenleg, tagonkénti dobozok, egyenlítés | `js/pages/tartozasok/` | `css/pages/tartozasok.css` |
| `ranglista.html` | Italok tier-listája (S–D), szűrők, javaslás | `js/pages/ranglista/` | `css/pages/ranglista.css` |
| `hanynapja.html` | Hány napja számlálók és csoportos toplista | `js/pages/hanynapja/` | `css/pages/hanynapja.css` |
| `tervek.html` | Közös tervek | `js/pages/tervek/` | `css/pages/tervek.css` |
| `kepek.html` | A csoport összes képe, feltöltés, jelentés | `js/pages/kepek/` | `css/pages/kepek.css` |
| `goatsgame.html` | Goats Game pontozótábla | `js/pages/goatsgame/` | `css/pages/goatsgame.css` |
| `jatekszabalyok.html` | Játékszabályok és szerkesztőjük | `js/pages/jatekszabalyok/` | `css/pages/jatekszabalyok.css` |
| `admin.html` | Csak superadminnak: kapcsolók, javaslatok, jelentések, kategóriák | `js/pages/admin/` | `css/pages/admin.css` |
| `tesztelok.html` | Nyilvános: útmutató a Play Áruházas zárt teszthez + újdonságok | `js/pages/tesztelok/` | `css/pages/tesztelok.css` |
| `ujdonsagok.html` | Nyilvános változásnapló | `js/pages/tesztelok/ujdonsagok.js` | `css/pages/jogi.css` |

## `jogi/` – jogi oldalak (bejelentkezés nélkül is elérhetők)

| Oldal | Mi ez |
|---|---|
| `index.html` | Jogi információk – gyűjtőoldal |
| `privacy.html` | Adatvédelmi nyilatkozat (a Play Áruház is ezt linkeli) |
| `felhasznalasi-feltetelek.html` | Felhasználási feltételek (ÁSZF) |
| `impresszum.html` | Impresszum |
| `fiok-torles.html` | Fiók törlésének menete |

A gyökérben lévő `privacy.html` és `fiok-torles.html` csak továbbküldő a régi címekről.

## Minden oldalra érvényes

- **CSP:** a `<head>` elején `Content-Security-Policy` meta: nincs inline `<script>`, nincs `style="…"` attribútum.
  Kattintás a HTML-ben: `data-katt` / `data-valtozas` / `data-bevitel` (lásd `js/segedek/html-esemenyek.js`).
- **Szövegek:** `data-i18n="kulcs"` (szöveg) és `data-i18n-attr="aria-label:kulcs"` (attribútum). A kulcsok a
  `nyelvek/hu.json`, `en.json`, `de.json` fájlokban vannak, mindháromba fel kell venni.
- **Betöltési sorrend a `<head>`-ben:** `nyelv.js` (szinkron) → CSS → `main.js` (modul) → az oldal saját scriptjei.
  Részletesen: `dokumentacio/attekintes.md`, 5. pont.
- **Új oldal:** lépésenként a `dokumentacio/utmutato.md` „Új oldal” része. Ne felejtsd el a `sw.js`
  `ELOGYORSITOTT` listáját és a `js/segedek/oldalak.js`-t.
