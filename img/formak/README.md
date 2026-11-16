# Színezhető italformák

Egy formából (pl. magas doboz) bármennyi ital kijön: a színt az adatbázis adja
(`italok.kep_forma`, `kep_szin_1`, `kep_szin_2`, `kep_minta`), a kép csak az alakot és az árnyékolást.

Ez a mappa az **eredeti, 512×512-es** rajzokat tartalmazza; a ranglista listái a belőlük generált
`img/formak-kicsi/` példányokat mutatják. Hogy miért és hogyan: [`img/README.md`](../README.md).

## Fájlok formánként

| Fájl | Mi van rajta | Szín a kódban |
|---|---|---|
| `<forma>-szin.webp` | a teljes test, **világos szürkeárnyalatban** | `kep_szin_1` |
| `<forma>-sav.webp` | a sávok / csíkok, **világos szürkeárnyalatban** (opcionális) | `kep_szin_2` |
| `<forma>-reszletek.webp` | tető, perem, körvonal, csillogás – a valódi színükben | nem változik |
| `<forma>-logo.webp` | csak az app logója, a doboz elején (opcionális) | nem változik |

## Minták

- Fájl: `img/mintak/<forma>-<minta>.webp` (pl. `finlandia-korok.webp`), szintén világos szürkeárnyalatban,
  pontosan az adott formára illesztve – ezért formánként külön fájl kell.
- Saját színe van (`kep_szin_3`, az űrlapon „Minta színe”); ha nincs megadva, a 2., végül az 1. színt kapja.
- Felvétel: a fájl az `img/mintak/` mappába + a `js/pages/ranglista/ital-kep.js` `MINTAK` listájában a minta
  sorához hozzáadni a forma kódját. Az űrlapon csak az adott formához rajzolt minták jelennek meg.
- Ha nincs második szín, a sávok is a fő színt kapják, így a doboz egyszínű (pl. New Gen: fehér + színes minta).

## Szabályok a rajzhoz

- 512×512 px, átlátszó háttér, a tárgy középen; a rétegek pontosan egymásra illeszkednek.
- A színezett rétegek alapja majdnem fehér (kb. `#F0F0F0`), az árnyék legfeljebb kb. `#909090`.
  Ami sötét, az minden színt besötétít.
- A színezett rétegeken csak kitöltés legyen; körvonal, fehér csillogás csak a `-reszletek` rétegen.
- A színes rész széle kicsit menjen be a körvonal alá, hogy ne maradjon rés.
- Márkaelem nem lehet rajta: logó, címke-elrendezés, álszöveg, jellegzetes (védett) palackforma.

## Új forma felvétele

1. A fájlok ide (`img/formak/`).
2. Egy sor a `js/pages/ranglista/ital-kep.js` `FORMAK` listájába (kód + megjelenő név), a név fordítása
   `form_<kod>` kulccsal a `nyelvek/hu.json`, `en.json`, `de.json` fájlba.
3. Ha van logó-rétege is, a forma kódja a `LOGOS_FORMAK` listába.
4. `python eszkozok/kepek_kicsinyitese.py` a gyökérből, és a `KEP_VERZIO` emelése az `ital-kep.js`-ben.

Közös üveg: ha két forma ugyanazt a palackot használja (pl. `jim` és `jack` → `whiskey`), a `KOZOS_UVEG` listában
kell megadni; ilyenkor a `-sav` és `-logo` réteg a közös palacké, csak a `-szin` és `-reszletek` saját.
Minta a szín mögött (pl. Finlandia körök): `MINTA_A_SZIN_MOGOTT`; minta nem színezett része (`-fix.webp`): `MINTA_FIX`.

Ha egy forma fájlja hiányzik, az app automatikusan a márkaképet vagy a kategória-ikont mutatja.
