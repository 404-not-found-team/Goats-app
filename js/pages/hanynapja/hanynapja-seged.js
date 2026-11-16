// Hány napja – közös segédfüggvények (nincs bennük se adatbázis, se DOM):
// a vezérlő (hanynapja.js) és a megjelenítés (hanynapja-megjelenites.js) is ezeket használja.

// a sablonválasztó "+ Új javaslat..." opciójának értéke
export const UJ_JAVASLAT = '__uj';

// A sablon neve a választott nyelven (ha nincs fordítás, a magyar)
export function sablonNev(x) {
    const ny = window.goatsNyelv?.aktualis?.();
    return (ny === 'en' ? x.nev_en : ny === 'de' ? x.nev_de : null) || x.nev;
}

// Egy számláló megjelenített neve: sablonosnál a sablon (lefordított) neve, különben a beírt szöveg
export function szamlaloNev(h, sablonok) {
    const x = h.sablon_id ? sablonok.find(s => s.id === h.sablon_id) : null;
    return x ? sablonNev(x) : h.mit;
}

// A mai nap helyi idő szerint, ÉÉÉÉ-HH-NN formában (a "date" oszlop és a dátummező is ezt várja)
export function maiDatum() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Hány nap telt el az "utoljara" dátum óta, helyi idő szerint
export function napokOta(datum) {
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    const akkor = new Date(`${datum}T00:00:00`);
    return Math.max(0, Math.round((ma - akkor) / 86400000));
}

// Két ÉÉÉÉ-HH-NN dátum között eltelt napok (b - a)
export function napokKozott(a, b) {
    return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

// Összehasonlító kulcs a nevekhez (kis- és nagybetűtől, szélső szóközöktől függetlenül)
export const kulcs = (mit) => String(mit || '').trim().toLocaleLowerCase();
