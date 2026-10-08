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
   - **Galéria:** lapozható képnézegető, feltöltéssel és törléssel (Supabase Storage), a feltöltő nevének megjelenítésével.
   - **Naptár:** saját (nem külső/Google) havi naptár, események létrehozásával, szerkesztésével, törlésével és napi áttekintő nézettel.

3. **Tartozások (`tartozasok.html`)**
   - Közös költség felvétele (ki kinek, mennyiért, miért), egyenlő vagy egyedi összegű elosztással több tag között.
   - **Összevont nézet** hitelezőnként: egy sor/pár, lenyitható az egyedi tételekre.
   - **Kölcsönös egyenlítés:** ha két tag kölcsönösen tartozik egymásnak, a közös rész beszámítható (FIFO, akár részlegesen is) anélkül, hogy az eredeti tételek törlődnének — az egyenlítés visszavonható, előzményekkel.
   - Egy tartozás törlése (= kifizetve) bármikor, bárki által a csoportból.

4. **Tervek / Ötletek (`tervek.html`)**
   - Közös bakancslista: hozzáadás, pipálás, törlés, ki vette fel.

5. **Ranglista (`ranglista.html`)**
   - Italok besorolása kategóriás tier-listába (kategóriánként saját szekció).
   - Új ital javaslata (admin jóváhagyással kerül be a katalógusba), saját kép vagy márka-kép/kategória-ikon megjelenítéssel.
   - Szűrés, keresés, koktél-összetevők megadása.

6. **Goats Game (`goatsgame.html`)**
   - Önálló mini-játék a csoporttagoknak.

7. **Beállítások / Profil** (a fejlécben elérhető menü, minden oldalon)
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

## 📲 PWA támogatás
Az alkalmazás telepíthető asztali és mobil böngészőkből is ("Telepítés" / "Hozzáadás a kezdőképernyőhöz").
- A `sw.js` előgyorsítótárazza az alkalmazás vázát (a bejelentkezési és a legfontosabb belépési fájlokat), hogy az első/ismételt betöltés gyors legyen, és navigációnál 2 másodperces hálózati időkorlát után a gyorsítótárra vált.
- A saját domain és a CDN-es (jsDelivr, cdnjs) statikus fájlok "stale-while-revalidate" stratégiával töltődnek: azonnal a gyorsítótárból, a háttérben frissülve.
- A Supabase API- és Storage-kéréseket a service worker sosem gyorsítótárazza (ezek mindig frissek/felhasználó-specifikusak kell legyenek).
- **Verziózás:** lásd a [Mappa- és fájlszerkezet](#-mappa--és-fájlszerkezet) szakasz alján.

---

## 📂 Mappa- és fájlszerkezet

A FELADAT13-as átszervezés óta a mappa- és fájlnevek (ahol lehetett) magyarok, ékezet és szóköz nélkül, kisbetűvel, kötőjellel elválasztva — a GitHub Pages és az URL-ek kis-/nagybetű-érzékenysége miatt. A `css/`, `js/`, `css/base/`, `css/pages/`, `js/pages/`, `main.*`, `navbar.css`, `modals.css` és `supabase-client.js` nevek szándékosan maradtak (már eleve egyértelműek vagy általánosan ismert technikai kifejezések).

```
css/
  base/            # alap: szinek/betumeret (valtozok.css), reset (visszaallitas.css), segedosztalyok.css
  elemek/          # ujrafelhasznalhato komponensek (navbar.css, modals.css, lenyilo-menu.css, lebego-cimke.css, moderacio.css, tartozasok-egyenlitese.css)
  pages/           # oldal-specifikus stilusok (bejelentkezes.css = index.html, fooldal.css = app.html, tartozasok/ranglista/tervek/jogi.css, goatsgame.css)
  main.css         # a fenti @import-ok gyujtofajlja
js/
  hitelesites.js       # kozponti auth/session/csoport-allapot (window.goatsAuth)
  supabase-client.js   # Supabase kliens singleton
  admin-muveletek.js   # csoport/profil admin RPC wrapperek
  main.js              # modul-aggregator a bejelentkezett oldalakhoz
  elemek/              # ujrafelhasznalhato UI-komponensek (naptar, nav-bar, galeria, beallitasok-modal, tartozasok-egyenlitese.js)
    beallitasok/        # a beallitasok-modal al-nezetei (belepes-modal, profil-modal, csoport-adatok, tema-valaszto, ital-moderacio, beallitasok-sablonok, tos-ujraelfogadas)
  pages/               # egy-egy HTML oldalhoz tartozo belepesi script (bejelentkezes-oldal.js, app-orzo.js, tartozasok.js, tervek.js, ranglista.js, goatsgame.js)
  segedek/             # altalanos segedfuggvenyek (ital-kep, modal-fokusz, szin-osztaly, csoport-kepek, csoport-kod, keslelteto, teljesitmeny, tema)
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
