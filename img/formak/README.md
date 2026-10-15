# Színezhető italformák

Egy formából (pl. magas doboz) bármennyi ital kijön: a színt az adatbázis adja
(`italok.kep_forma`, `kep_szin_1`, `kep_szin_2`, `kep_minta`), a kép csak az alakot és az árnyékolást.

## Fájlok formánként

| Fájl | Mi van rajta | Szín a kódban |
|---|---|---|
| `<forma>-szin.webp` | a teljes test, **világos szürkeárnyalatban** | `kep_szin_1` |
| `<forma>-sav.webp` | a sávok / csíkok, **világos szürkeárnyalatban** (opcionális) | `kep_szin_2` |
| `<forma>-reszletek.webp` | tető, perem, körvonal, csillogás – a valódi színükben | nem változik |

Mintákhoz: `img/mintak/<minta>.webp`, szintén világos szürkeárnyalatban (a 2. színt kapja, ha nincs, az 1.-t).

## Szabályok a rajzhoz

- 512×512 px, átlátszó háttér, a tárgy középen; a rétegek pontosan egymásra illeszkednek.
- A színezett rétegek alapja majdnem fehér (kb. `#F0F0F0`), az árnyék legfeljebb kb. `#909090`.
  Ami sötét, az minden színt besötétít.
- A színezett rétegeken csak kitöltés legyen; körvonal, fehér csillogás csak a `-reszletek` rétegen.
- A színes rész széle kicsit menjen be a körvonal alá, hogy ne maradjon rés.
- Márkaelem nem lehet rajta: logó, címke-elrendezés, álszöveg, jellegzetes (védett) palackforma.

## Új forma felvétele

1. A három fájl ide (`img/formak/`).
2. Egy sor a `js/segedek/ital-kep.js` `FORMAK` listájába (kód + megjelenő név).

Ha egy forma fájlja hiányzik, az app automatikusan a márkaképet vagy a kategória-ikont mutatja.
