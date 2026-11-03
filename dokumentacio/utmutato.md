# ATG – útmutató: mit hol kell átírni

Receptek a gyakori feladatokhoz. Mindegyiknél ott van, melyik fájlban mit kell módosítani, és mire figyelj.
A repó felépítését az [áttekintés](attekintes.md) írja le.

> **Minden feladat végén:** emeld a `sw.js` tetején a `CACHE_NEV` számát, és ha új fájlt hoztál létre,
> vedd fel az `ELOGYORSITOTT` listába. Lásd: [Kiadás, élesítés](#kiadás-élesítés).

## Tartalom

**Felület**
- [Új szöveg vagy fordítás](#új-szöveg-vagy-fordítás)
- [Új téma](#új-téma)
- [Alapértelmezett téma átírása](#alapértelmezett-téma-átírása)
- [Új nyelv](#új-nyelv)
- [Gomb a HTML-ben (kattintás)](#gomb-a-html-ben-kattintás)
- [Dinamikus szín JS-ből](#dinamikus-szín-js-ből)

**Oldalak és funkciók**
- [Új oldal](#új-oldal)
- [Új globálisan kapcsolható funkció](#új-globálisan-kapcsolható-funkció)
- [Új admin fül](#új-admin-fül)

**Italok**
- [Új italforma vagy minta](#új-italforma-vagy-minta)
- [Új italkategória-ikon](#új-italkategória-ikon)
- [Új főkategória angol neve](#új-főkategória-angol-neve)

**Szerver**
- [Új értesítéstípus](#új-értesítéstípus)
- [Adatbázis módosítása](#adatbázis-módosítása)
- [Edge Function módosítása](#edge-function-módosítása)

**Kiadás**
- [Kiadás, élesítés](#kiadás-élesítés)
- [Mikor kell új Android-build?](#mikor-kell-új-android-build)
- [Külső könyvtár frissítése](#külső-könyvtár-frissítése)
- [Ha új adatot gyűjtünk](#ha-új-adatot-gyűjtünk)
- [Felhasználási feltételek új verziója](#felhasználási-feltételek-új-verziója)

[Gyakori hibák](#gyakori-hibák)

---

## Új szöveg vagy fordítás

Minden szöveg kulcs alapján fordítódik. A kulcs angol, kisbetűs, aláhúzással (`delete_game_title`).

**1. A kulcs mindkét nyelvi fájlba:**

```json
// nyelvek/hu.json
"filter_saving": "Mentés…",
// nyelvek/en.json
"filter_saving": "Saving…",
```

Kulcsot, ami már létezik, ne írj felül más jelentéssel; ha kétséges, keress rá a fájlban.

**2. A szöveg helye szerint:**

| Hol van a szöveg | Így jelöld |
|---|---|
| HTML-ben, elem szövege | `<h2 data-i18n="tab_reports">Jelentések</h2>` |
| HTML attribútum (placeholder, title, aria-label, alt) | `<input placeholder="Pl. Royal" data-i18n-attr="placeholder:hide_brand_ph">`; több is: `"placeholder:a; aria-label:b"` |
| Dátum a HTML-ben | `<time datetime="2026-10-07" data-i18n-datum>2026. október 7.</time>` |
| JS-ből kiírt szöveg | `elem.textContent = tr('report_closed', 'A jelentés lezárva.');` |
| JS, változóval | `tr('n_people_selected', '{n} ember kiválasztva', { n: db })` – a `{n}` mindkét nyelvi fájlban is így szerepeljen |
| Dátum JS-ből | `new Date(x).toLocaleDateString(goatsNyelv.locale())` (ne `'hu-HU'`) |
| Oldal címe | `<title data-i18n="title_plans">ATG - Tervek</title>` |

**Szabályok:**
- A `tr()` második paramétere a magyar szöveg: ez jelenik meg, ha a kulcs hiányzik, ezért sosem lesz üres a felület.
- A fordításban csak ezek a HTML-elemek maradnak meg: `strong`, `b`, `em`, `i`, `br`, `a` (`http(s):` vagy `mailto:` linkkel), `span`.
- Felhasználói adatot (név, leírás) ne tegyél fordításba HTML-ként; azt `textContent`-tel vagy `esc()`-vel írd ki.
- A modulok szintjén kiértékelt szöveg (pl. egy konstans lista) a betöltéskori nyelven marad; nyelvváltáskor az oldal úgyis újratölt.

---

## Új téma

**1. Színek** – `css/base/valtozok.css`: másold le az egyik témablokkot, és add meg az új nevet:

```css
[data-theme="erdo"] {
    --bg-color: #10180f;
    --bg-gradient: linear-gradient(135deg, #1b2a17 0%, #0b100a 100%);
    --card-bg: rgba(26, 38, 24, 0.85);
    --inner-bg: #0e150d;
    --input-bg: #0e150d;
    --border-color: #2f4a2a;
    --text-primary: #e4f2df;
    --text-secondary: #94ad8d;
    --accent-color: #22c55e;
    --accent-hover: #16a34a;
    --accent-text: #86efac;
    --on-accent: #000000;
    --hiba-color: #f87171;
    --ok-color: #34d399;
    color-scheme: dark;            /* világos témánál: light */
    --install-card-bg: linear-gradient(135deg, rgba(34, 197, 94, 0.18) 0%, rgba(16, 24, 15, 0.95) 100%);
    --install-card-border: rgba(34, 197, 94, 0.4);
    --install-btn-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
    --install-btn-shadow-hover: 0 6px 16px rgba(34, 197, 94, 0.5);
}
```

Minden változót adj meg, különben az adott helyen a sötét téma színe marad. Figyelj a kontrasztra: a
`--text-secondary` a kártya háttérén legalább 4,5:1 legyen.

**2. A választóba** – `js/elemek/beallitasok/tema-valaszto.js`, a `temak` listába:

```js
{ id: 'erdo', name: tr('theme_forest', 'Erdő') },
```

**3. A név fordítása** – `theme_forest` a `hu.json`-ba és az `en.json`-ba.

A témakártya előnézete magától elkészül (a kártya megkapja a `data-theme="erdo"` attribútumot, és a saját színeit mutatja). Más fájlhoz nem kell nyúlni.

---

## Alapértelmezett téma átírása

Három helyen kell ugyanarra átírni:

| Fájl | Mit |
|---|---|
| `js/segedek/tema.js`, 1. sor | `localStorage.getItem('goats_theme') \|\| 'discord-purple'` |
| `js/elemek/beallitasok/tema-valaszto.js` | `const ALAP_TEMA = 'discord-purple';` |
| `css/base/valtozok.css` | a `:root, [data-theme="dark"]` blokk adja az első pillanat színeit, mielőtt a JS beállítja a témát; ha az alap nem sötét, érdemes a `:root`-ot az új alaptémához tenni |

---

## Új nyelv

Példa: német (`de`).

| # | Fájl | Mit |
|---|---|---|
| 1 | `nyelvek/de.json` | másold le az `en.json`-t, és fordítsd le az értékeket (a kulcsok maradnak). A hiányzó kulcsok magyarul jelennek meg. A `cat_…` kulcsok a főkategóriák nevei. |
| 2 | `js/segedek/nyelv.js` | `const NYELVEK = ['hu', 'en', 'de'];` és a `LOCALE` objektumba: `de: 'de-DE'` |
| 3 | `js/elemek/beallitasok/nyelv-valaszto.js` | a `NYELVEK` listába: `{ id: 'de', name: 'Deutsch' }` (a név a saját nyelvén) |
| 4 | `img/zaszlok/de.svg` | a zászló, 3:2 arányú SVG |
| 5 | `sw.js` | az `ELOGYORSITOTT` listába: `'nyelvek/de.json'`, `'img/zaszlok/de.svg'` |
| 6 | adatbázis | a `push_feliratkozasok.nyelv` oszlop ellenőrzése csak `hu`/`en`-t enged: bővíteni kell (`check (nyelv in ('hu','en','de'))`) – migrációval |
| 7 | `supabase/functions/push-kuldes/index.ts` | a `Nyelv` típus, az értesítések szövege és a `ny === 'en' ? 'en' : 'hu'` választás bővítése, utána újratelepítés |

A készülék nyelvét az app magától felismeri (`navigator.languages`): ha a lista első támogatott nyelve `de`,
az lesz; ha egyik sem támogatott, angol. A jogi oldalak szövege csak magyar, ezeket külön kell fordítani.

---

## Gomb a HTML-ben (kattintás)

`onclick="…"` nem használható (a CSP tiltja). Helyette:

```html
<button type="button" data-katt="nyisdSzuroModal">Szűrők</button>
<button type="button" data-katt="kategoriatValaszt" data-arg="S">S</button>   <!-- kategoriatValaszt('S') -->
<select data-valtozas="formaValtozott">…</select>                             <!-- change -->
<input data-bevitel="kepElonezetFrissit">                                      <!-- input -->
```

A függvénynek az oldal klasszikus (nem modul) scriptjében kell lennie globálisan (`function nev() {}`).
Az oldal `<head>`-jében kell a `<script src="js/segedek/html-esemenyek.js" defer></script>`.
Modulos kódban egyszerűbb a sima `elem.addEventListener('click', …)`.

---

## Dinamikus szín JS-ből

Inline stílus (`elem.style.color = …`) nem használható. Helyette:

```js
elem.classList.add(szinOsztaly('#e30613'));   // js/segedek/szin-osztaly.js
```

A függvény egy osztályt ad, ami a `--szin` CSS-változót állítja be; a CSS-ben `color: var(--szin)` vagy `background: var(--szin)`.

---

## Új oldal

Példa: `kviz.html`.

1. **HTML** – másolj le egy egyszerű oldalt (pl. `tervek.html`). A `<head>` maradjon ugyanaz: CSP meta, `nyelv.js` elsőként, supabase-js, `main.js`, az oldal scriptje, `html-esemenyek.js`. A `<body data-oldal="kviz">`, és benne `<ul id="navBar"></ul>`.
2. **Cím** – `<title data-i18n="title_quiz">ATG - Kvíz</title>`, a kulcs mindkét nyelvi fájlba.
3. **Stílus** – `css/pages/kviz.css`, a HTML-ben külön `<link>`-kel (a `main.css`-be nem kell).
4. **Script** – `js/pages/kviz.js`.
5. **Menü** – `js/segedek/oldalak.js`, az `OLDALAK` listába:
   ```js
   { kulcs: 'kviz', nev: tr('page_quiz', 'Kvíz'), emoji: '❓', fajl: 'kviz.html', kapcsolo: 'oldal_kviz' },
   ```
   `fo: true` = mobilon az alsó sávban, különben a „Több ☰” fiókban; `navban: false` = nem kerül a menübe.
6. **Globális kapcsoló** – az adatbázisban egy sor az `app_kapcsolok` táblába (`kulcs = 'oldal_kviz'`, `ertek = true`), különben az oldal kikapcsoltnak számít. Az admin oldal ezután magától listázza.
7. **Csoportonkénti engedély** – a csoport `groups.enabled_pages` listájában is benne kell legyen a `kviz` (a superadmin mindent lát). Az új csoportok alapértéke és a meglévő csoportok frissítése adatbázis-módosítás.
8. **`sw.js`** – az új HTML, CSS, JS az `ELOGYORSITOTT` listába; `CACHE_NEV` emelése.

---

## Új globálisan kapcsolható funkció

1. `js/segedek/oldalak.js`, `FUNKCIOK` lista:
   ```js
   { kulcs: 'funkcio_kviz_inditas', nev: tr('feat_quiz', 'Kvíz indítása'), leiras: tr('feat_quiz_desc', 'Új kvíz indítása a Kvíz oldalon.') },
   ```
2. Adatbázis: egy sor az `app_kapcsolok` táblába (`funkcio_kviz_inditas`, `true`).
3. **Szerveroldali kikényszerítés** (ez a lényeg): a megfelelő RLS-szabályba vagy RPC-be `funkcio_engedelyezve('funkcio_kviz_inditas')`.
4. A gomb letiltása a felületen: `funkcioGombTiltas(gomb, 'funkcio_kviz_inditas')` (`js/segedek/funkcio-kapcsolo.js`).

---

## Új admin fül

1. `admin.html`: egy új gomb a `.sm-tabs` sorba (`data-tab="tab-valami"`), és egy `<div id="tab-valami" class="sm-tab-content">` panel.
2. `js/pages/admin-valami.js` egy `export function indit()` függvénnyel (minta: `admin-jelentesek.js`).
3. `js/pages/admin.js`: a többi `import('./admin-….js')` mellé `import('./admin-valami.js').then(m => m.indit())`.
4. Az adatot **csak superadminnak** szabad adnia: RPC-ben `if not is_superadmin() then raise exception …`.
5. `admin.html#valami` címmel a fül magától megnyílik (pl. értesítésből).

---

## Új italforma vagy minta

Lépésenként a `img/formak/README.md` írja le (rétegek, rajzolási szabályok). Röviden:

1. Fájlok: `img/formak/<forma>-szin.webp`, `-sav.webp`, `-reszletek.webp`, (opcionális) `-logo.webp`.
2. `js/segedek/ital-kep.js`: egy sor a `FORMAK` listába (`['uj-forma', 'Megjelenő név – fő szín: …, 2. szín: …']`); logó-réteg esetén a kód a `LOGOS_FORMAK` listába.
3. Minta: `img/mintak/<forma>-<minta>.webp`, és a `MINTAK` listában a minta sorához a forma kódja.
4. Angol név: `form_<kod>` / `pattern_<kod>` kulcs az `en.json`-ba.

Márkaelem (logó, címke-elrendezés, jellegzetes palack) nem lehet a rajzon.

---

## Új italkategória-ikon

1. SVG az `img/ikonok/` mappába (egyszínű; a CSS maszkkal a téma színét kapja).
2. `js/segedek/ital-kep.js`, `KATEGORIA_IKON`: a kategória kódja → az ikon fájlneve kiterjesztés nélkül.

---

## Új főkategória angol neve

A főkategóriák neve az adatbázisból jön (`ital_kategoriak.nev`, magyarul). Angolul a kód alapján fordul:
`"cat_<kod>": "English name"` az **`en.json`-ba** (a `hu.json`-ba ne, mert felülírná az adatbázis nevét).
A megjelenítés a `window.italKategoriak.nevForditva(kategoria)` hívással megy (`js/segedek/ital-kategoriak.js`); a Ranglistán ez mindenhol így van, új helyen is ezt használd.

---

## Új értesítéstípus

Példa: új terv a csoportban.

1. **Adatbázis-trigger** a táblára, ugyanúgy, mint a meglévők (`push_tartozas_trigger`):
   ```sql
   create or replace function public.push_terv_trigger() returns trigger
   language plpgsql security definer set search_path = public as $$
   begin
       perform push_kuldes_inditasa('terv', (select jsonb_agg(id) from uj_sorok));
       return null;
   end $$;
   create trigger push_ertesites after insert on public.tervek
       referencing new table as uj_sorok for each statement execute function public.push_terv_trigger();
   ```
2. **`supabase/functions/push-kuldes/index.ts`**: egy új függvény (mint a `tartozasok()`), ami az azonosítók alapján kikeresi a címzetteket és megírja a szöveget mindkét nyelven, és egy új ág a `Deno.serve` végén (`adat.tipus === 'terv'`). Utána újratelepítés.
3. Az `url` a megnyitandó oldal (pl. `'tervek.html'`, vagy fülhöz `'admin.html#jelentesek'`).
4. Ha új adatot küld (pl. új címzetti kör), frissítsd az adatvédelmi tájékoztatót.

---

## Adatbázis módosítása

- Csak **migrációval**, és a csapattal egyeztetve: az élő adatbázison fut, minden felhasználót érint.
- Új oszlopnál a `profiles` és az `italok` táblán **oszlopszintű jogok** vannak: a szabály (policy) önmagában nem elég, kell `grant update (oszlop) on public.tabla to authenticated;` is.
- Egy tábla szabálya ne kérdezze le ugyanazt a táblát közvetlenül (végtelen ciklus, `42P17` hiba); ilyenkor `security definer` segédfüggvény kell (lásd `jelentes_korlat_alatt()`).
- Új `security definer` függvénynél: `set search_path = public`, és `revoke all … from public, anon`, majd `grant execute` csak annak, akinek kell.

---

## Edge Function módosítása

1. Írd át a `supabase/functions/<nev>/index.ts` fájlt a repóban.
2. Telepítés: `supabase functions deploy <nev>` (a `push-kuldes`-nél `--no-verify-jwt`, mert az adatbázis hívja titkos fejléccel).
3. Titkos értékek (pl. `VAPID_PRIVATE_KEY`): Supabase felület → Edge Functions → Secrets. Ezek sosem kerülnek a repóba.
4. Hiba esetén a Supabase felületén az Edge Functions naplóját nézd.

---

## Kiadás, élesítés

A `main` ág tartalma a GitHub Pagesen azonnal élesbe kerül (pár perc).

1. **`sw.js` → `CACHE_NEV`** emelése (`'goats-v53'` → `'goats-v54'`). Enélkül a telepített appok a régi fájlokat mutatják. A fájl első sorában lévő kommentben is van egy `goats-v…` példa: azt ne írd át, csak a `const CACHE_NEV` sort.
2. Új fájl → az **`ELOGYORSITOTT`** listába, hogy offline is meglegyen.
3. Munka külön ágon, a `main`-be pull requesttel.
4. Élesítés után egy telefonon nyisd meg az appot kétszer (az első megnyitás tölti le az új verziót), és nézd meg a változást.

---

## Mikor kell új Android-build?

A Play-es app egy keret a weboldal körül, így a kód, a szövegek, a stílusok változásához **nem** kell új build.
Új build csak akkor kell, ha a keret változik:

- az app neve, ikonja, színei (a `manifest.json` telepítéskori adatai),
- új Android-engedély (pl. értesítés, hely),
- a start URL vagy a domain.

Menete: PWABuilder → a weboldal címe (`https://404-not-found-team.github.io/Goats-app/`) → Android →
ugyanaz a csomagnév (`hu.goatsapp.app`), **eggyel nagyobb verziókód**, **a régi aláíró kulcs** (`signing.keystore`) →
az `.aab` fájl a Play Console-ba új kiadásként. Új kulccsal a Play nem fogadja el frissítésként.

---

## Külső könyvtár frissítése

1. Töltsd le az új verziót (pl. `npm pack @supabase/supabase-js@2.x.y`), és a használt fájlt tedd a `js/kulso/` mappába, verziószámmal a nevében (`supabase-js-2.x.y.js`).
2. Írd át minden HTML-ben a `<script src>`-t, és a `sw.js` `ELOGYORSITOTT` listáját.
3. Töröld a régi fájlt; a licencfájlt frissítsd.
4. Próbáld ki bejelentkezve az oldalakat, mielőtt a `main`-be kerül.

---

## Ha új adatot gyűjtünk

Ha egy funkció új személyes adatot tárol (pl. helyadat, új azonosító):

1. `privacy.html`: a kezelt adatok, a cél és a jogalap, a harmadik felek, a megőrzés, és a lap tetején a dátum.
2. Play Console → Ellenőrzés és fejlesztés → Szabályzat és programok → Alkalmazás tartalma → **Adatbiztonság**: ugyanezek alapján.

---

## Felhasználási feltételek új verziója

1. `felhasznalasi-feltetelek.html`: a szöveg, és a tetején a verzió és a dátum.
2. `js/hitelesites.js`: `TOS_VERSION` emelése ugyanarra a verzióra. Ettől minden felhasználó a következő megnyitáskor újra elfogadást kap.

---

## Gyakori hibák

| Tünet | Ok |
|---|---|
| A változás nem látszik a telefonon | nem emelted a `CACHE_NEV`-et, vagy csak egyszer nyitottad meg az appot |
| Egy gomb nem csinál semmit, a konzolban CSP-hiba | inline `onclick` vagy `<script>` maradt; használj `data-katt`-ot |
| Angolul is magyar szöveg | hiányzik a kulcs az `en.json`-ból, vagy az elemen nincs `data-i18n` / a JS nem `tr()`-rel írja |
| „permission denied for table …” mentéskor | az oszlopra nincs `grant update`, csak policy |
| „infinite recursion detected in policy” | a tábla szabálya ugyanazt a táblát kérdezi le; segédfüggvény kell |
| Új oldal nem jelenik meg a menüben | hiányzik az `app_kapcsolok` sor, vagy a csoport `enabled_pages`-éből |
| Az értesítés nem jön | az eszközön nincs bekapcsolva (Beállítások → Értesítések), vagy a `push-kuldes` naplójában hiba van |
| Fehér négyzet az értesítés ikonja helyén | a jelvénynek átlátszó hátterű, egyszínű képnek kell lennie (`img/ertesites-jelveny.png`) |
