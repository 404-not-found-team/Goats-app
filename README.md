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
- [Átuttekintés](#-áttekintés)
- [Főbb oldalak és funkciók](#-főbb-oldalak-és-funkciók)
- [Technológiai stack](#-technológiai-stack)
- [PWA támogatás](#-pwa-támogatás)
- [Helyi indítás](#-helyi-indítás)

---

## 📖 Átuttekintés
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
