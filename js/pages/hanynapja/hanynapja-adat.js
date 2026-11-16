// Hány napja – adatréteg: minden Supabase-művelet itt van, a felülethez nem nyúl.
// Hiba esetén a hibaVan naplóz; a visszatérési érték mondja meg a hívónak, mi történt:
// - lekérések: a sorok tömbje (számlálóknál hibánál undefined)
// - ahol a hívónak a hibakód is kell (23505 = már létezik): maga a hiba (sikernél null)
// - a többi módosítás: true, ha sikerült
import { client } from '../../supabase-client.js';
import { hibaVan } from '../../supabase_hibakezeles.js';

const SABLON_MEZOK = 'id, nev, nev_en, nev_de, jovahagyva, javasolta_id';

export async function szamlalokLekerese(groupId) {
    const { data, error } = await client.from('hanynapja')
        .select('id, user_id, mit, utoljara, rekord, lathato_csoportnak, sablon_id')
        .eq('group_id', groupId)
        .order('letrehozva', { ascending: false })
        .limit(50);
    if (hibaVan(error, 'a számlálók betöltésekor')) return;
    return data || [];
}

// a jóváhagyott sablonok + a saját függő javaslataid (az RLS csak ezeket adja vissza)
export async function sablonokLekerese() {
    const { data, error } = await client.from('hanynapja_sablonok')
        .select(SABLON_MEZOK)
        .order('nev');
    hibaVan(error, 'a sablonok betöltésekor');
    return data || [];
}

// Új sablonjavaslat; az új sor is kell a hívónak, ezért az adatot és a hibát is visszaadja
export async function sablonJavaslasa(nev) {
    const { data, error } = await client.from('hanynapja_sablonok')
        .insert({ nev })
        .select(SABLON_MEZOK)
        .single();
    hibaVan(error, 'a javaslat beküldésekor');
    return { data, error };
}

// adatok: { mit, sablon_id, utoljara, group_id, lathato_csoportnak }
export async function szamlaloFelvetele(adatok) {
    const { error } = await client.from('hanynapja').insert(adatok);
    hibaVan(error, 'a számláló felvételekor');
    return error;
}

export async function szamlaloUjrakezdese(id, datum, rekord) {
    const { error } = await client.from('hanynapja')
        .update({ utoljara: datum, rekord })
        .eq('id', id);
    return !hibaVan(error, 'az újrakezdéskor');
}

export async function szamlaloTorlese(id) {
    const { error } = await client.from('hanynapja').delete().eq('id', id);
    return !hibaVan(error, 'a számláló törlésekor');
}

// A főoldali csempékhez: csak a saját számlálóid (legfeljebb 12), a sablon nevével együtt
export async function sajatSzamlalokLekerese(groupId, userId) {
    const { data, error } = await client.from('hanynapja')
        .select('id, mit, utoljara, sablon:hanynapja_sablonok(nev, nev_en, nev_de)')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .order('letrehozva', { ascending: false })
        .limit(12);
    if (hibaVan(error, 'a főoldali számlálók betöltésekor')) return;
    return data || [];
}