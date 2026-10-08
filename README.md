# 🐐 Goats App

<p align="center">
  <b>Egy multifunkciós, Supabase-alapú webes közösségi alkalmazás baráti körök számára (galéria, ranglisták, tervező és közös költségek/tartozások kezelése).</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Aktív_Fejlesztés alatt-orange" alt="Status">
  <img src="https://img.shields.io/badge/Tech-HTML5_%2F_CSS3_%2F_JS-blue" alt="Tech Stack">
  <img src="https://img.shields.io/badge/Database-Supabase-green" alt="Supabase">
</p>

---

## 📌 Tartalomjegyzék
- [Áttekintés](#-áttekintés)
- [Főbb oldalak és funkciók](#-főbb-oldalak-és-funkciók)
- [Technológiai stack](#-technológiai-stack)
- [PWA támogatás](#-pwa-támogatás)
- [Helyi indítás](#-helyi-indítás)

---

## 📖 Áttekintés
A **Goats App** egy személyre szabott, reszponzív webes alkalmazás, amely segít a baráti események, közös emlékek, programok és kiadások egy helyen történő menedzselésében. Az adatok szinkronizációját és tárolását a **Supabase** biztosítja valós időben.

---

## 📄 Főbb oldalak és funkciók

Az alkalmazás az alábbi modulokból áll:

1. **Kezdőlap (`index.html`)**
   - **Képgaléria:** Interaktív képnézegető lapozó funkcióval és direkt képfeltöltési lehetőséggel (Supabase Storage integráció).
   - **Videólejátszó:** Beágyazott média lejátszás.
   - **Google Naptár:** Közös események és programok áttekintése naptár nézetben.

2. **Tartozások (`tartozasok.html`)**
   - Közös költségek és kölcsönös tartozások nyilvántartása.
   - Rögzítés opciók: miért, mennyiért, kinek a részéről és ki tartozik kivel szemben.
   - Dinamikus kártyás nézet személyekre bontva.

3. **Tervek / Ötletek (`tervek.html`)**
   - Közös bakancslista és ötletdoboz a jövőbeli programokhoz.
   - Elemek hozzáadása és kezelése Supabase háttérrel.

4. **Ranglista (`ranglista.html`)**
   - Interaktív tier-list (S, A, B, C, D kategóriákkal) italok (vodkák, whiskeyk, likőrök, bitterek, sörök, ciderek, borok, fröccsök) besorolására.
   - Valós idejű számlálók és kategória szűrési/mozgatási logika modal felülettel.

5. **Goats Game (`goatsgame.html`)**
   - Játékos statisztikák és ponttáblázat az érintett tagok számára.

---

## 🛠️ Technológiai stack

* **Frontend:** 
  - HTML5 / CSS3 (Reszponzív dizájn, FontAwesome ikonok)
  - Vanilla JavaScript (ES6+)
* **Backend & Adatbázis:** 
  - Supabase (Database & Storage API)
* **PWA (Progressive Web App):** 
  - Service Worker (`sw.js`) és `manifest.json` támogatás a mobilalkalmazás-szerű élményért.

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
  segedek/             # altalanos segedfuggvenyek (ital-kep, modal-fokusz, szin-osztaly, csoport-kepek, keslelteto, teljesitmeny, tema)
img/
  icon-*.png           # PWA ikonok (a manifest.json hivatkozza)
  ikonok/              # ital-kategoria SVG ikonok (CSS maszkkal szinezve)
  markak/               # ital-marka kepek (.webp) + szerkesztoi forras (.xcf) es nevkonvencio README
```

**Service worker verziózása:** a `sw.js` tetején lévő `CACHE_NEV` (pl. `'goats-v11'`) minden olyan kiadásnál emelendő, ami bármelyik előgyorsítótárazott (`ELOGYORSITOTT`) fájl útvonalát vagy tartalmát megváltoztatja — enélkül a már telepített/PWA-ként futó appok a régi, lecserélt fájlokat kapnák a gyorsítótárból. Az `activate` esemény a korábbi cache-neveket automatikusan törli.

---
