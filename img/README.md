# `img/` – képek

Minden kép, amit az app a saját tárhelyéről tölt be. A galéria képei **nem** itt vannak, hanem a Supabase
`kepek` bucketben (lásd `dokumentacio/reszletek.md`, Képek).

## Mappák

| Mappa | Mi van benne | Ki használja |
|---|---|---|
| `formak/` | A színezhető italformák rétegei, **eredeti méretben** (512×512). Ezeket rajzoljuk és szerkesztjük. Leírás: [`formak/README.md`](formak/README.md) | a ranglista nagy nézete (`#modal-kep`) |
| `formak-kicsi/` | Ugyanezek **256×256-ban**, a `formak/`-ból generálva. Kézzel ne szerkeszd. | a ranglista listái, az űrlap előnézete |
| `mintak/` | A minták (pl. körök, almák, háromszög jel) formánként, eredeti méretben | nagy nézet |
| `mintak-kicsi/` | A minták 256×256-ban, generálva | a listák |
| `ikonok/` | Italkategória-ikonok (SVG). CSS-maszkkal a téma színét veszik fel. | ital, aminek nincs formája |
| `zaszlok/` | Zászlók a nyelvválasztóhoz (SVG) | beállítások, kezdőlap |
| `koktelok/` | Régi koktélképek a koktél neve alapján (tartalék, ha egy koktélnak nincs formája) | ranglista |

## Fájlok a gyökérben

| Fájl | Mire való |
|---|---|
| `icon-192.png`, `icon-512.png`, `icon-*-maskable.png` | App-ikonok (a `manifest.json` hivatkozza; a maskable a kerek/ovális Android-ikonhoz) |
| `favicon-192.png` | Böngészőfül ikonja |
| `ertesites-jelveny.png` | Push-értesítés egyszínű jelvénye a státuszsorban |
| `og-kep.jpg` | Előnézeti kép, ha valaki linket küld az appról |
| `logo_lekerekített.png` | Az app logója (lekerekített); a kód nem hivatkozik rá, de kell, ne töröld |

## Italképek: miért van két méret?

A ranglistán egy ital kb. 90 pixel magas, és egy ital 4–6 egymásra tett rétegből áll. Ha minden réteg 512×512-es
lenne, a telefonnak italonként 4–6 nagy képet kellene kicsomagolnia és színezve egymásra rajzolnia, ezért volt lassú.
A listák ezért a negyedakkora `-kicsi` példányokat kapják (az összes kép ~980 KB helyett ~215 KB), a nagy nézet
pedig az élesebb eredetit.

Melyik méret jön: a `js/pages/ranglista/ital-kep.js` `kepUt()` függvénye dönti el (a `#modal-kep` az eredetit kapja).

## Ha átrajzolsz vagy új képet adsz hozzá

1. A kép az `formak/` vagy `mintak/` mappába (szabályok: [`formak/README.md`](formak/README.md)).
2. A projekt gyökeréből futtasd: `python eszkozok/kepek_kicsinyitese.py` (Pillow kell: `pip install pillow`).
   Ez újragenerálja a `formak-kicsi/` és `mintak-kicsi/` mappát, és törli onnan, ami az eredetik közül már nincs meg.
3. Emeld eggyel a `KEP_VERZIO` értékét a `js/pages/ranglista/ital-kep.js` elején.
4. Commitnál a kicsi mappákat is add hozzá.

**Miért kell a 3. lépés?** A service worker az italképeket külön, tartós tárban őrzi (`goats-kepek-italok-v1`),
és nem kéri le őket újra, a `CACHE_NEV` emelésekor sem. Csak akkor tölti le újra, ha a kép címe változik: a
`KEP_VERZIO` a címek végén van (`?v=1`), így az emelés után mindenki az új képet kapja.
