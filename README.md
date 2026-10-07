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
- **Felhasználási feltételek:** `felhasznalasi-feltetelek.html` — a verziószáma (`auth-service.js` `TOS_VERSION`) egyezzen a lap tetején feltüntetett verzióval.
- **Fiók törlése:** `fiok-torles.html`.
- A bejelentkezési képernyőn (checkbox nélkül) egy mondat linkel a feltételekre és az adatvédelmi tájékoztatóra; az elfogadás tényleges rögzítése az `accept_tos` RPC-vel történik, a `TOS_VERSION`-nel.
- **Verzióemelés menete:** ha a felhasználási feltételek szövege lényegesen változik, emeld a `TOS_VERSION` értékét (`js/auth-service.js`), és a `felhasznalasi-feltetelek.html` tetején lévő verziószámot/dátumot is ennek megfelelően. Ez új elfogadást kényszerít ki a következő bejelentkezéskor.
- Mindhárom statikus oldal lábléce a másik kettőre és a hub-ra mutat.

---
