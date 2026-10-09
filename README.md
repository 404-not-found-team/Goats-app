# 🐐 Goats App

<p align="center">
  <b>Supabase-alapú közösségi PWA baráti társaságoknak: közös tartozások/kiadások elszámolása és egyenlítése, italranglista, tervek, galéria, naptár — csoportonként, kóddal csatlakozva.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Aktív_Fejlesztés alatt-orange" alt="Status">
  <img src="https://img.shields.io/badge/Tech-HTML5_%2F_CSS3_%2F_JS-blue" alt="Tech Stack">
  <img src="https://img.shields.io/badge/Database-Supabase-green" alt="Supabase">
</p>

---

## 📌 Tartalomjegyzék
- [Áttekintés](#-áttekintés)
- [Csoportok és szerepkörök](#-csoportok-és-szerepkörök)
- [Főbb oldalak és funkciók](#-főbb-oldalak-és-funkciók)
- [Technológiai stack](#️-technológiai-stack)
- [Képek](#️-képek)
- [PWA támogatás](#-pwa-támogatás)
- [Mappa- és fájlszerkezet](#-mappa--és-fájlszerkezet)
- [Helyi indítás](#-helyi-indítás)
- [TWA (Android csomag)](#-twa-android-csomag)
- [Jogi oldalak](#️-jogi-oldalak)

---

## 📖 Áttekintés
A **Goats App** egy reszponzív webes alkalmazás baráti csoportok számára: közös kiadások nyilvántartása és egyenlítése, italok rangsorolása, közös tervek, galéria és naptár egy helyen. Minden adat egy **csoporthoz** (belépőkóddal csatlakozó baráti kör) van kötve, a tárolást és a jogosultságokat a **Supabase** (Postgres + Auth + Storage, row-level security-vel) biztosítja.

---

## 👥 Csoportok és szerepkörök
- Bejelentkezés után a felhasználó vagy **csatlakozik** egy meglévő csoporthoz egy kóddal, vagy **létrehoz** egy újat.
- Egy felhasználó egyszerre egy csoport tagja. A csoportnak van egy **admin**ja (tagok eltávolítása, admin jog átadása, kód újragenerálása, csoport átnevezése/törlése), a többiek **tagok**.
- Minden funkció (tartozások, tervek, ranglista, galéria, naptár) csoportonként elkülönül — más csoport adatait senki nem látja.
- A csapat (**superadmin**) jogosultsággal rendelkező fiókok hozzáférnek a műveleti naplóhoz és a beérkezett jelentésekhez.

---

## 📄 Főbb oldalak és funkciók

1. **Bejelentkezés (`index.html`, kijelentkezett nézet)**
   - Google OAuth bejelentkezés, a feltételek/adatvédelem elfogadásának rögzítésével.
   - Csoporthoz csatlakozás kóddal vagy új csoport létrehozása.
   - PWA telepítő kártya, funkció-bemutató, jogi lábléc.

2. **Főoldal (`app.html`, bejelentkezett nézet)**
   - **Galéria:** lapozható, csak kis képeket mutató nézegető (nagyítás nincs), „Összes kép →” linkkel a Képek oldalra.
   - **Naptár:** saját (nem külső/Google) havi naptár, események létrehozásával, szerkesztésével, törlésével és napi áttekintő nézettel.

3. **Tartozások (`tartozasok.html`)**
   - Közös költség felvétele (ki kinek, mennyiért, miért), egyenlő vagy egyedi összegű elosztással több tag között.
   - **Összevont nézet** hitelezőnként: egy sor/pár, lenyitható az egyedi tételekre.
   - **Kölcsönös egyenlítés:** ha két tag kölcsönösen tartozik egymásnak, a közös rész beszámítható (FIFO, akár részlegesen is) anélkül, hogy az eredeti tételek törlődnének — az egyenlítés visszavonható, előzményekkel.
   - Egy tartozás törlése (= kifizetve) bármikor, bárki által a csoportból.

4. **Képek (`kepek.html`)** – csoportonként ki-be kapcsolható oldal (`enabled_pages`: `kepek`)
   - A csoport összes képe rácsban (legújabb elöl), a feltöltő nevével és dátumával.
   - Feltöltés (tömörítéssel), ⋮ menü: **Törlés** a saját (vagy ismeretlen feltöltőjű) képnél, **Jelentés** bármelyik képnél (a `public.jelentesek` táblába, `cel_tipus = 'kep'`, óránként legfeljebb 20).
   - Részletek: [Képek](#️-képek).

5. **Tervek / Ötletek (`tervek.html`)**
   - Közös bakancslista: hozzáadás, pipálás, törlés, ki vette fel.

6. **Ranglista (`ranglista.html`)**
   - Italok besorolása kategóriás tier-listába (kategóriánként saját szekció).
   - Új ital javaslata (admin jóváhagyással kerül be a katalógusba), saját kép vagy márka-kép/kategória-ikon megjelenítéssel.
   - Szűrés, keresés, koktél-összetevők megadása.

7. **Goats Game (`goatsgame.html`)**
   - Önálló mini-játék a csoporttagoknak.

8. **Beállítások / Profil** (a fejlécben elérhető menü, minden oldalon)
   - Saját adatok: megjelenített név (automatikus mentéssel), e-mail (csak megjelenítve), fiók törlése.
   - Csoport adatok: tagok listája, admin jog átadása, tag eltávolítása, csoportnév átnevezése, kód újragenerálása, csoport törlése vagy kilépés.
   - Ital-moderáció (admin): beküldött italjavaslatok jóváhagyása/elutasítása.
   - Téma váltás (sötét, világos és további színsémák).

---

## 🛠️ Technológiai stack

* **Frontend:**
  - HTML5 / CSS3 (reszponzív, CSP-vel védett — nincs inline stílus)
  - Vanilla JavaScript (ES6+ modulok a keretrendszerhez, klasszikus scriptek az egyes oldalaknál)
* **Backend & adatbázis:**
  - Supabase: Postgres adatbázis row-level security policy-kkal, `SECURITY DEFINER` RPC-k az összetettebb/jogosultság-érzékeny műveletekhez, Supabase Storage a galéria képeihez, Supabase Auth (Google OAuth) a bejelentkezéshez.
  - Műveleti napló (`naplo` tábla): ki, mikor, mit módosított — csak a csapat (superadmin) látja.
* **PWA (Progressive Web App):**
  - Service Worker (`sw.js`) és `manifest.json` a telepíthetőséghez és az offline/gyors induláshoz.

---

## 🖼️ Képek
A galéria képei a privát `kepek` Supabase Storage bucketben vannak, csoportonként a csoport azonosítójával elnevezett mappában (`<group_id>/<uuid>.webp`).

**Méret és formátum**
- Feltöltés előtt a böngésző kicsinyíti és tömöríti a képet (`js/segedek/kep-tomorites.js`, az első feltöltéskor töltődik be): a rövidebb oldal legfeljebb 360 px (a galéria 180 px-es kijelzett méretének 2×-ese), a hosszabb legfeljebb 720 px.
- Kimenet: WebP 0,65-ös minőséggel (ha a böngésző nem tud WebP-t kódolni, JPEG 0,6). Ha 100 KB fölött van, a minőség 0,05-ös lépésekben 0,4-ig csökken, utána a méret 10%-onként (legalább 480 px-ig). 150 KB fölött a feltöltés elmarad.
- A bemenet legfeljebb 15 MB, csak kép; animált GIF nem tölthető fel. A HEIC-et a böngésző (vagy tartalékként a heic2any) alakítja át.
- A vászonra rajzolás miatt a kimenetben nincs EXIF/GPS metaadat; a tájolást (EXIF-forgatás) a betöltés érvényesíti.
- A fájl soha nem módosul: mindig új (uuid) útvonalra kerül, `upsert` nélkül, `cacheControl: 31536000`-zel.
- Szerveroldalon a bucket is korlátoz: `file_size_limit = 153600` (150 KB), `allowed_mime_types = {image/webp,image/jpeg}`. A korábban feltöltött, nagyobb képek megmaradnak.

**Csoportonkénti korlát**
- Egy csoport mappájában legfeljebb 300 kép lehet. A számot a `public.app_beallitasok` tábla adja, újratelepítés nélkül módosítható (Supabase SQL editor):
  ```sql
  update public.app_beallitasok set ertek = 500 where kulcs = 'kep_korlat_csoportonkent';
  ```
- A korlátot a `storage.objects` táblán egy RESTRICTIVE INSERT policy (`kepek_csoport_korlat`) ellenőrzi a `kep_mappa_korlat_alatt()` függvénnyel; a kliens a `kep_korlat_csoportonkent()` RPC-vel kérdezi le, és elérésekor ezt írja ki: „A csoport elérte a képkorlátot, törölj régebbi képeket.”

**Oldalak**
- `kepek.html` + `js/pages/kepek.js`: a teljes rács, feltöltés, törlés, jelentés; a csempék képe csak akkor töltődik be, amikor a görgetésben láthatóvá válik (IntersectionObserver, kötegelt aláírással).
- `app.html` + `js/elemek/galeria.js`: csak lapozás. Az „Összes kép →” link akkor látszik, ha a csoportnál a `kepek` oldal engedélyezett.
- A Képek oldal ki-be kapcsolása a `groups.enabled_pages` tömbben (`kepek` kulcs); új csoportnál alapból be van kapcsolva.

**Helyi gyorsítótár** (`js/segedek/kep-gyorsitotar.js`)
- A privát bucket miatt aláírt URL kell, ami minden aláíráskor új, így a böngésző HTTP-cache-e nem segít. Ezért a letöltött képet a Cache Storage `goats-kepek-v1` tárolója őrzi az útvonal alapján, és a következő megnyitáskor onnan, blob URL-ként jelenik meg: egy képet eszközönként csak egyszer töltünk le.
- Csak a látható képeket töltjük be (a főoldalon a középsőt és a két szomszédját, a Képek oldalon a láthatóvá vált csempéket); a hiányzókra egy kötegelt `createSignedUrls` hívás megy (2 perces lejárattal).
- Legfeljebb 150 kép / 20 MB, a legrégebben használt törlődik (index: `localStorage` `goats_kep_cache_index`). Kijelentkezéskor az egész törlődik.
- A service worker a Storage-kéréseket nem cache-eli, és a `goats-kepek-*` tárolót verzióváltáskor sem törli.

---

## 📲 PWA támogatás
Az alkalmazás telepíthető asztali és mobil böngészőkből is ("Telepítés" / "Hozzáadás a kezdőképernyőhöz").
- A `sw.js` előgyorsítótárazza az alkalmazás vázát (a bejelentkezési és a legfontosabb belépési fájlokat), hogy az első/ismételt betöltés gyors legyen, és navigációnál 2 másodperces hálózati időkorlát után a gyorsítótárra vált.
- A saját domain és a CDN-es (jsDelivr, cdnjs) statikus fájlok "stale-while-revalidate" stratégiával töltődnek: azonnal a gyorsítótárból, a háttérben frissülve.
- A Supabase API- és Storage-kéréseket a service worker sosem gyorsítótárazza (ezek mindig frissek/felhasználó-specifikusak kell legyenek). A galériaképeket külön, a [Képek](#️-képek) szakaszban leírt helyi gyorsítótár tárolja.
- **Verziózás:** lásd a [Mappa- és fájlszerkezet](#-mappa--és-fájlszerkezet) szakasz alján.

---

## 📂 Mappa- és fájlszerkezet

A FELADAT13-as átszervezés óta a mappa- és fájlnevek (ahol lehetett) magyarok, ékezet és szóköz nélkül, kisbetűvel, kötőjellel elválasztva — a GitHub Pages és az URL-ek kis-/nagybetű-érzékenysége miatt. A `css/`, `js/`, `css/base/`, `css/pages/`, `js/pages/`, `main.*`, `navbar.css`, `modals.css` és `supabase-client.js` nevek szándékosan maradtak (már eleve egyértelműek vagy általánosan ismert technikai kifejezések).

```
css/
  base/            # alap: szinek/betumeret (valtozok.css), reset (visszaallitas.css), segedosztalyok.css
  elemek/          # ujrafelhasznalhato komponensek (navbar.css, modals.css, lenyilo-menu.css, lebego-cimke.css, moderacio.css, tartozasok-egyenlitese.css)
  pages/           # oldal-specifikus stilusok (bejelentkezes.css = index.html, fooldal.css = app.html, tartozasok/ranglista/tervek/kepek/jogi.css, goatsgame.css)
  main.css         # a fenti @import-ok gyujtofajlja
js/
  hitelesites.js       # kozponti auth/session/csoport-allapot (window.goatsAuth)
  supabase-client.js   # Supabase kliens singleton
  admin-muveletek.js   # csoport/profil admin RPC wrapperek
  main.js              # modul-aggregator a bejelentkezett oldalakhoz
  elemek/              # ujrafelhasznalhato UI-komponensek (naptar, nav-bar, galeria, beallitasok-modal, tartozasok-egyenlitese.js)
    beallitasok/        # a beallitasok-modal al-nezetei (belepes-modal, profil-modal, csoport-adatok, tema-valaszto, ital-moderacio, beallitasok-sablonok, tos-ujraelfogadas)
  pages/               # egy-egy HTML oldalhoz tartozo belepesi script (bejelentkezes-oldal.js, app-orzo.js, tartozasok.js, tervek.js, kepek.js, ranglista.js, goatsgame.js)
  segedek/             # altalanos segedfuggvenyek (ital-kep, modal-fokusz, szin-osztaly, csoport-kepek, csoport-kod, kep-tomorites, kep-gyorsitotar, keslelteto, teljesitmeny, tema)
img/
  icon-*.png           # PWA ikonok (a manifest.json hivatkozza)
  ikonok/              # ital-kategoria SVG ikonok (CSS maszkkal szinezve)
  markak/              # ital-marka kepek (.webp) + szerkesztoi forras (.xcf) es nevkonvencio README
```

**Service worker verziózása:** a `sw.js` tetején lévő `CACHE_NEV` (pl. `'goats-v11'`) minden olyan kiadásnál emelendő, ami bármelyik előgyorsítótárazott (`ELOGYORSITOTT`) fájl útvonalát vagy tartalmát megváltoztatja — enélkül a már telepített/PWA-ként futó appok a régi, lecserélt fájlokat kapnák a gyorsítótárból. Az `activate` esemény a korábbi cache-neveket automatikusan törli.

---

## 💻 Helyi indítás
Az app build nélküli, statikus HTML/CSS/JS, de **nem nyitható meg közvetlenül `file://`-ként** — a Supabase-hívások és az ES modulok miatt egy helyi HTTP szerver kell:

```bash
python -m http.server 8099
# vagy: npx serve .
```

Utána nyisd meg a `http://localhost:8099/index.html` címet. Bejelentkezéshez és adatlekérdezéshez élő internet-kapcsolat és a projektbe beállított Supabase-kulcsok kellenek (`js/supabase-client.js`).

---

## 📱 TWA (Android csomag)

- **Csomagnév:** `hu.goatsapp.app`
- **Host:** `404-not-found-team.github.io`, **start URL:** `/Goats-app/` (a `manifest.json` `start_url` és `scope` értéke ezzel egyezik)
- **Digital Asset Links:** az `assetlinks.json` a `404-not-found-team.github.io` repóban
- **Adatvédelmi oldal:** `https://404-not-found-team.github.io/Goats-app/privacy.html`, fiók-törlés: `https://404-not-found-team.github.io/Goats-app/fiok-torles.html`

---

## ⚖️ Jogi oldalak

- **Hub:** `jogi.html` — innen érhető el mindegyik jogi dokumentum, és ez a link van a Profil menüben ("Jogi információk").
- **Adatvédelmi tájékoztató:** `privacy.html`.
- **Felhasználási feltételek:** `felhasznalasi-feltetelek.html` — a verziószáma (`hitelesites.js` `TOS_VERSION`) egyezzen a lap tetején feltüntetett verzióval.
- **Fiók törlése:** `fiok-torles.html`.
- A bejelentkezési képernyőn (checkbox nélkül) egy mondat linkel a feltételekre és az adatvédelmi tájékoztatóra; az elfogadás tényleges rögzítése az `accept_tos` RPC-vel történik, a `TOS_VERSION`-nel.
- **Verzióemelés menete:** ha a felhasználási feltételek szövege lényegesen változik, emeld a `TOS_VERSION` értékét (`js/hitelesites.js`), és a `felhasznalasi-feltetelek.html` tetején lévő verziószámot/dátumot is ennek megfelelően. Ez új elfogadást kényszerít ki a következő bejelentkezéskor.
- Mindhárom statikus oldal lábléce a másik kettőre és a hub-ra mutat.
