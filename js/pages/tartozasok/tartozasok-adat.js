// Tartozások – adatréteg: minden Supabase-művelet itt van, a felülethez nem nyúl (a tartozasok.js és az
// egyenlítés-modul, a tartozasok-egyenlites.js is innen hív). Hiba esetén a hibaVan naplóz; a
// visszatérési érték mondja meg a hívónak, mi történt (ahol a felület kiírja az üzenetet, ott magát a hibát).
import { client } from '../../supabase-client.js';
import { hibaVan } from '../../supabase_hibakezeles.js';

// Az összesítés (ki kinek mennyivel tartozik, RPC) és a régi, azonosító nélküli tételek:
// { osszesites, legacy }; ha az összesítés nem jött le, undefined
export async function tartozasokLekerese(groupCode) {
    const [osszesitesRes, legacyRes] = await Promise.all([
        client.rpc('tartozas_osszesites', { p_group: null }),
        client
            .from('tartozasok')
            .select('*')
            .eq('group_code', groupCode)
            .or('ados_id.is.null,hitelezo_id.is.null')
            .order('id', { ascending: false }),
    ]);
    if (hibaVan(osszesitesRes.error, 'az összesítés betöltésekor')) return undefined;
    hibaVan(legacyRes.error, 'a régi tartozások betöltésekor');
    return { osszesites: osszesitesRes.data || [], legacy: legacyRes.data || [] };
}

// Egyetlen insert: vagy minden sor bekerül, vagy egy sem (nincs részleges mentés).
// Visszaadja a hibát (sikernél null), mert a felület a hibakód alapján ír üzenetet.
export async function tartozasokMentese(sorok) {
    const { error } = await client.from('tartozasok').insert(sorok);
    hibaVan(error, 'a tartozás mentésekor');
    return error;
}

// true, ha sikerült
export async function tartozasTorlese(id, groupCode) {
    const { error } = await client
        .from('tartozasok')
        .delete()
        .eq('id', id)
        .eq('group_code', groupCode);
    return !hibaVan(error, 'a tartozás törlésekor');
}

// Egy adós–hitelező pár tételei és az egyenlítési előzményeik: { tetelek, elozmenyek }; hibánál undefined
export async function reszletekLekerese(adosId, hitelezoId) {
    const [reszletekRes, elozmenyekRes] = await Promise.all([
        client.rpc('tartozas_reszletek', { p_a: adosId, p_b: hitelezoId }),
        client
            .from('tartozas_egyenlitesek')
            .select('*')
            .or(`and(fel_a.eq.${adosId},fel_b.eq.${hitelezoId}),and(fel_a.eq.${hitelezoId},fel_b.eq.${adosId})`)
            .order('letrehozva', { ascending: false }),
    ]);
    if (hibaVan(reszletekRes.error || elozmenyekRes.error, 'a tartozás-részletek betöltésekor')) return undefined;
    return { tetelek: reszletekRes.data || [], elozmenyek: elozmenyekRes.data || [] };
}

// Kölcsönös tartozások beszámítása (RPC); visszaadja a hibát (sikernél null)
export async function tartozasokEgyenlitese(aId, bId) {
    const { error } = await client.rpc('tartozasok_egyenlitese', { p_a: aId, p_b: bId });
    hibaVan(error, 'az egyenlítéskor');
    return error;
}

// Egy egyenlítés visszavonása (RPC); visszaadja a hibát (sikernél null)
export async function egyenlitesVisszavonasa(egyenlitesId) {
    const { error } = await client.rpc('tartozas_egyenlites_visszavonasa', { p_egyenlites: egyenlitesId });
    hibaVan(error, 'az egyenlítés visszavonásakor');
    return error;
}
