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
- **Digital Asset Links:** az `assetlinks.json` a `404-not-found-team.github.io` repóban él (a domain gyökerén kell kiszolgálni: `https://404-not-found-team.github.io/.well-known/assetlinks.json`), nem ebben a repóban.
- **Hátralévő lépések a Play-beadásig:**
  - képernyőképek a manifestbe és a Play-oldalra,
  - adatbiztonsági (Data safety) űrlap,
  - tartalom-besorolás,
  - tesztfiók a Play-ellenőrzőnek,
  - a Google OAuth jóváhagyási állapotának ellenőrzése.
- **Adatvédelmi oldal:** `https://404-not-found-team.github.io/Goats-app/privacy.html`, fiók-törlés: `https://404-not-found-team.github.io/Goats-app/fiok-torles.html`
- **Gyermekvédelmi normák:** `https://404-not-found-team.github.io/Goats-app/gyermekvedelem.html`

---

## 🚩 Jelentés kezelése

Ez belső folyamat, nem jogi tanács. A jogilag nem tisztázott pontok listáját a szakasz végén találod.

1. **Hol látszik, hogyan állítható „folyamatban"-ra:** a Profil → Beállítások ablak alján a superadminnak megjelenik a „Jelentések" blokk. A lista a beállítások megnyitásakor töltődik, a csoportnév helyett csak a csoport azonosítója látszik. Az állapot „Folyamatban" vagy „Lezárva" gombbal változtatható (`set_report_status` RPC).

2. **Gyermekbiztonsági (CSAE/CSAM) jelentés esetén:**
   - Az anyagot **ne töltsd le, ne másold, ne küldd tovább**. Csak a jelentés azonosítóit és adatait jegyezd fel.
   - Zárold a jelentést („Zárolás" gomb).
   - Miután a csapat a hatóságnak továbbította (rendőrség, illetve a hivatalos bejelentő csatornák), jelöld „Hatóságnak továbbítva"-nak.
   - A pontos teendőket jogásszal kell egyeztetni. Ez a leírás nem jogi tanács.

3. **A tartalom eltávolítása:**
   - a kép törlése a Supabase Storage felületén (`kepek` bucket). A jelentés „célazonosító" mezője a kép elérési útja (`csoport_azonosito/fajlnev.jpg`),
   - a fiók törlése a Supabase Auth felületén (a „célazonosító" a felhasználó azonosítója),
   - a jelentés zárolása vagy lezárása.

4. **Évente egyszer:** a `cleanup_old_reports()` függvény futtatása (kézzel, az SQL Editorban), és ellenőrzés, hogy a zárolt jelentések indokoltak-e még. Automatikus ütemezés nincs.

5. **Megőrzés:** a jelentések legfeljebb 1 évig maradnak meg. A zárolt és a hatóságnak továbbított jelentéseket a tisztítás nem törli. A csoport törlésekor a jelentés megmarad, a csoport azonosítója üres lesz. A jelentő fiók törlésekor a jelentő azonosítója üres lesz.

**Jogilag nem tisztázott pontok (jogásznak átnézendő):**
- a megőrzési idő és a hatósági továbbítás viszonya,
- a bizonyíték megőrzése csoporttörlésnél: ha a csoport törlésekor a képek törlődnek a tárolóból, a zárolt jelentéshez tartozó bizonyíték elveszik. Ezt a csoport törlése előtt kézzel kell kezelni,
- az üzemeltető kötelezettségei: mikor és hová kell jelenteni,
- az adatvédelmi tájékoztató jogalapjai.

---
