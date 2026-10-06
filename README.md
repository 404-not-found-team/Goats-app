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
- **Host:** `z0lcs.github.io`, **start URL:** `/Goats-app/` (a `manifest.json` `start_url` és `scope` értéke ezzel egyezik)
- **Digital Asset Links:** az `assetlinks.json` a `z0lcs.github.io` repóban él (a domain gyökerén kell kiszolgálni), nem ebben a repóban.
- **Hátralévő lépések a Play-beadásig:**
  - képernyőképek a manifestbe és a Play-oldalra,
  - adatbiztonsági (Data safety) űrlap,
  - tartalom-besorolás,
  - tesztfiók a Play-ellenőrzőnek,
  - a Google OAuth jóváhagyási állapotának ellenőrzése.
- **Adatvédelmi oldal:** `https://z0lcs.github.io/Goats-app/privacy.html`, fiók-törlés: `https://z0lcs.github.io/Goats-app/fiok-torles.html`
- **Gyermekvédelmi normák:** `https://z0lcs.github.io/Goats-app/gyermekvedelem.html`

---

## 🚩 Jelentés kezelése

- **Hol látszik:** a Profil → Beállítások ablak alján a superadminnak megjelenik a „Jelentések" blokk. A lista a beállítások megnyitásakor töltődik, a csoportnév helyett csak a csoport azonosítója látszik.
- **Állapot:** „Folyamatban" vagy „Lezárva" gombbal változtatható (`set_report_status` RPC).
- **Kép törlése (kézzel):** a jelentés „célazonosító" mezője a kép elérési útja (`csoport_azonosito/fajlnev.jpg`). A Supabase Storage felületén a `kepek` bucketben ezt a fájlt kell törölni, mert a storage-szabály csak a csoport tagjainak engedi a törlést.
- **Fiók törlése (kézzel):** a jelentés „célazonosító" mezője a felhasználó azonosítója. A fiókot a Supabase Auth felületén, vagy a csoport admin/superadmin műveletekkel kell eltávolítani.
- **Hatóságok:** a hatóságoknak szóló jelentést a csapat teszi meg kézzel. Az alkalmazás ezt nem automatizálja.
- **Megőrzés:** a jelentések addig maradnak meg, amíg a csapat törölni nem dönti. A csoport törlésekor a jelentés megmarad (a csoport azonosítója üres lesz), a jelentő fiók törlésekor a jelentő azonosítója üres lesz.

---
