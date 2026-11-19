// Ranglista: az oldal közös, változó állapota egy objektumban (a modulok ezen keresztül osztoznak rajta),
// valamint a hozzávalók gyorsítótára. Egy ES-modul exportált változóját más modul nem írhatja át, ezért objektum.

export function ujSajatSzuro() {
    return { kategoriak_ki: [], zero: {} };
}

export const allapot = {
    aktivElemId: null,
    aktivItalAdat: null,
    aktualisMod: 'arany',
    szerkesztettItalId: null, // az "Új ital" ablak szerkesztés módban: ennek az italnak az id-ja (null = új felvétel)
    csoportSzuro: null, // { v: 2, beallitva: true, kategoriak: [kod], alkategoriak_ki: [kulcs], zero: {fokod: ertek} }
    sajatSzuro: ujSajatSzuro(),
    csoportVazlat: null, // a csoport-panel szerkesztés alatti állapota (Mentésig nem érvényes)
    szinPaletta: [], // [{id, nev, kep_szin_1}] - public.szin_paletta, bármelyik italnál újrahasználható mentett színek
};

export const osszetevokItalonkent = new Map();
