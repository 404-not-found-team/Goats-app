// Ranglista (italok tier-listája) – adatréteg: minden Supabase-művelet itt van, a felülethez nem nyúl.
// Kijelentkezve is működik (publikus katalógus): ilyenkor nincs csoport, a csoportos lekérések üresek.
// Hiba esetén a hibaVan naplóz; a visszatérési érték mondja meg a hívónak, mi történt.
import { client } from '../../supabase-client.js';
import { hibaVan } from '../../supabase_hibakezeles.js';

const K = () => window.italKategoriak;

// az italok oszlopai, amiket a lista és a kártyák használnak
export const ITAL_MEZOK = 'id, marka, nev, kategoria_id, alkategoria_id, alkategoria_kezi, zero, alkohol_fok, kiszereles, recept_mod, jovahagyva, javasolta_id, kep_forma, kep_minta, kep_szin_1, kep_szin_2, kep_szin_3, kep_szin_1_id, kep_szin_2_id, kep_szin_3_id';

// Az oldal teljes adatcsomagja (minden lekérdezés párhuzamosan):
// { kategoriak, katalogus, osszetevok, ranglista, filterSettings, szinPaletta }; ha a kategóriák vagy a
// katalógus nem jött le, undefined
export async function ranglistaLekerese(groupCode, groupId) {
    const [kategoriak, katalogusRes, osszetevoRes, rangRes, szuroRes, szinPalettaRes] = await Promise.all([
        K().lekeres(client).catch(err => ({ hiba: err })),
        client.from('italok')
            .select(ITAL_MEZOK)
            .order('nev', { ascending: true })
            .range(0, 1999),
        client.from('ital_osszetevok')
            .select('ital_id, sorrend, nev, mennyiseg, egyseg')
            .order('sorrend', { ascending: true }),
        groupCode
            ? client.from('ital_ranglista').select('*').eq('group_code', groupCode)
            : Promise.resolve({ data: [], error: null }),
        groupId
            ? client.from('groups').select('filter_settings').eq('id', groupId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        client.from('szin_paletta').select('id, nev, kep_szin_1').order('nev', { ascending: true }),
    ]);

    if (hibaVan(kategoriak.hiba, 'a kategóriák betöltésekor')) return undefined;
    if (hibaVan(katalogusRes.error, 'a katalógus betöltésekor')) return undefined;

    hibaVan(osszetevoRes.error, 'a receptek betöltésekor');
    hibaVan(rangRes.error, 'a ranglista betöltésekor');
    hibaVan(szuroRes.error, 'a szűrő beállítások betöltésekor');
    hibaVan(szinPalettaRes.error, 'a színpaletta betöltésekor');

    return {
        kategoriak,
        katalogus: katalogusRes.data || [],
        osszetevok: osszetevoRes.data || [],
        ranglista: rangRes.data || [],
        filterSettings: szuroRes.data?.filter_settings ?? null,
        szinPaletta: szinPalettaRes.data || [],
    };
}

// Egy ital helyezése (tier) a csoport ranglistáján; true, ha sikerült
export async function helyezesMentese(italId, tier, groupCode) {
    const { error } = await client
        .from('ital_ranglista')
        .upsert({ id: italId, kategoria: tier, group_code: groupCode }, { onConflict: 'id,group_code' });
    return !hibaVan(error, 'a ranglista-helyezés mentésekor');
}

// A csoport szűrője. A groups tábla kliens felől csak olvasható (RLS), az írás RPC-n megy.
// Visszaadja a hibát (sikernél null), mert a felület kiírja az üzenetét.
export async function szuroMentese(groupId, beallitas) {
    try {
        await window.goatsAuth.callRpc('save_filter_settings', { group_id_input: groupId, settings: beallitas });
        return null;
    } catch (err) {
        hibaVan(err, 'a szűrő beállítások mentésekor');
        return err;
    }
}

// Meglévő ital módosítása; { data: a frissített sor, error }
export async function italModositasa(italId, valtozas) {
    const { data, error } = await client.from('italok').update(valtozas).eq('id', italId).select(ITAL_MEZOK).single();
    hibaVan(error, 'az ital módosításakor');
    return { data, error };
}

// Új ital (jóváhagyásig nem látszik a közös katalógusban); { data: az új sor, error }
export async function ujItalMentese(ital) {
    const { data, error } = await client.from('italok').insert([ital]).select(ITAL_MEZOK).single();
    hibaVan(error, 'az új ital mentésekor');
    return { data, error };
}

// Az ital receptjének cseréje: a régi hozzávalók törlése (nem blokkoló), majd az újak beszúrása.
// true, ha az új hozzávalók bekerültek (üres listánál is true).
export async function receptMentese(italId, hozzavalok, regiTorlese) {
    if (regiTorlese) {
        const { error: delError } = await client.from('ital_osszetevok').delete().eq('ital_id', italId);
        hibaVan(delError, 'a régi hozzávalók törlésekor');
    }
    if (hozzavalok.length === 0) return true;
    const { error } = await client.from('ital_osszetevok').insert(hozzavalok.map(h => ({ ...h, ital_id: italId })));
    return !hibaVan(error, 'a recept mentésekor');
}

// Egy ital helyezésváltozásai a csoportban (legfeljebb 20, a legújabb elöl); hibánál undefined
export async function naploLekerese(groupId, italId) {
    const { data, error } = await client
        .from('ital_ranglista_naplo')
        .select('regi_kategoria, uj_kategoria, user_id, created_at')
        .eq('group_id', groupId)
        .eq('ital_id', italId)
        .order('created_at', { ascending: false })
        .limit(20);
    if (hibaVan(error, 'a ranglista-napló betöltésekor')) return undefined;
    return data || [];
}
