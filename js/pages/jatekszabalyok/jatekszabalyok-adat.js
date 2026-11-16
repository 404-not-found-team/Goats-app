// Játékszabályok – adatréteg: minden Supabase-művelet itt van, a felülethez nem nyúl.
// Táblák: jatek_szabalyok (a játékok), jatek_lepesek (a szabályok lépései), jatek_javaslatok (más csoportok
// kiegészítései). Hiba esetén a hibaVan naplóz; a visszatérési érték mondja meg a hívónak, mi történt.
import { client } from '../../supabase-client.js';
import { callRpc } from '../../hitelesites.js';
import { hibaVan } from '../../supabase_hibakezeles.js';

// Az összes látható játék, a lépések számával együtt (a lista kártyáin látszik); hibánál undefined
export async function jatekokLekerese() {
    let { data, error } = await client
        .from('jatek_szabalyok')
        .select('*, jatek_lepesek(count)')
        .order('letrehozva', { ascending: false });
    if (error) {
        console.warn('A lépésszám nem kérhető le, nélküle töltöm be:', error);
        ({ data, error } = await client.from('jatek_szabalyok').select('*').order('letrehozva', { ascending: false }));
    }
    if (hibaVan(error, 'a játékok betöltésekor')) return undefined;
    return data || [];
}

// Egy játék lépései és javaslatai: { lepesek, javaslatok } (hibánál üres tömbök)
export async function reszletekLekerese(jatekId) {
    const [lepesekRes, javaslatokRes] = await Promise.all([
        client.from('jatek_lepesek').select('*').eq('jatek_id', jatekId).order('sorrend', { ascending: true }),
        client.from('jatek_javaslatok').select('*').eq('jatek_id', jatekId).order('letrehozva', { ascending: true }),
    ]);
    hibaVan(lepesekRes.error, 'a lépések betöltésekor');
    hibaVan(javaslatokRes.error, 'a javaslatok betöltésekor');
    return { lepesek: lepesekRes.data || [], javaslatok: javaslatokRes.data || [] };
}

// Egyetlen adatbázis-hívás (jatek_mentese): a játék és a lépései egy tranzakcióban mentődnek, így hiba
// esetén nem maradhat lépések nélküli játék. A data a játék azonosítója (új játéknál az új).
export async function jatekMentese(p) {
    const { data, error } = await client.rpc('jatek_mentese', {
        p_jatek_id: p.jatekId || null,
        p_cim: p.cim,
        p_leiras: p.leiras,
        p_min_jatekosok: p.minJatekosok,
        p_eszkozok: p.eszkozok,
        p_publikus: p.publikus,
        p_group_id: p.groupId,
        p_csoport_nev: p.csoportNev,
        p_lepesek: p.lepesek,
    });
    hibaVan(error, 'a játék mentésekor');
    return { data, error };
}

// A lépések és a javaslatok az adatbázisban a játékkal együtt törlődnek. true, ha sikerült.
export async function jatekTorlese(jatekId) {
    const { error } = await client.from('jatek_szabalyok').delete().eq('id', jatekId);
    return !hibaVan(error, 'a játék törlésekor');
}

// Javaslat egy másik csoport játékához. true, ha sikerült.
export async function javaslatKuldese(jatekId, groupId, csoportNev, cim, szoveg) {
    const { error } = await client.from('jatek_javaslatok').insert([{
        jatek_id: jatekId,
        group_id: groupId,
        csoport_nev: csoportNev,
        cim, szoveg,
    }]);
    return !hibaVan(error, 'a javaslat küldésekor');
}

// A javaslat beépítése a játékba (RPC). Visszaadja a hibát (sikernél null), mert a felület kiírja az üzenetét.
export async function javaslatElfogadasa(javaslatId) {
    try {
        await callRpc('jatek_javaslat_elfogadasa', { p_javaslat: javaslatId });
        return null;
    } catch (err) {
        hibaVan(err, 'a javaslat elfogadásakor');
        return err;
    }
}
