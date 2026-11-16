// GoatsGame – adatréteg: minden Supabase-művelet itt van, a felülethez nem nyúl.
// Táblák: goatgame_jatekok (csoport játékai), goatgame_meccsek (lejátszott meccsek, a játékhoz kötve),
// goatgame_pontok (meccsenként és játékosonként egy pont), goatgame_szinek (játékosszínek csoportonként).
// Hiba esetén a hibaVan naplóz; mivel a felület a hibaüzenetet (error.message) is kiírja,
// a módosítások magát a hibát adják vissza (sikernél null), ahol új adat is jön, ott { data, error }-t.
import { client } from '../../supabase-client.js';
import { hibaVan } from '../../adat/hibakezeles.js';

// A teljes tábla: játékosszínek + játékok a meccseikkel és pontjaikkal.
// A nyers lekérdezési eredményt adja vissza (ezt tárolja a gyorsítótár is); hibánál undefined.
export async function tabellaLekerese(groupId) {
    const [szinRes, jatekRes] = await Promise.all([
        client.from('goatgame_szinek').select('user_id, szin').eq('group_id', groupId),
        client.from('goatgame_jatekok')
            .select('id, nev, szin, created_at, goatgame_meccsek(id, created_at, goatgame_pontok(user_id, pont))')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true }),
    ]);

    hibaVan(szinRes.error, 'a színek betöltésekor');
    if (hibaVan(jatekRes.error, 'a játékok betöltésekor')) return;
    return { szinek: szinRes.data || [], jatekok: jatekRes.data || [] };
}

export async function jatekosSzinMentese(groupId, userId, szin) {
    const { error } = await client
        .from('goatgame_szinek')
        .upsert({ group_id: groupId, user_id: userId, szin }, { onConflict: 'group_id,user_id' });
    hibaVan(error, 'a szín mentésekor');
    return error;
}

// Az új játék sora is kell a hívónak (az id-ja), ezért az adatot és a hibát is visszaadja
export async function jatekFelvetele(groupId, nev, szin) {
    const { data, error } = await client
        .from('goatgame_jatekok')
        .insert({ group_id: groupId, nev, szin })
        .select('id, nev, szin')
        .single();
    hibaVan(error, 'a játék mentésekor');
    return { data, error };
}

// A meccs és a pontok egy tranzakcióban mentődnek (RPC), így nem maradhat félig mentett meccs.
// pontok: [{ user_id, pont }]; a data az új meccs azonosítója.
export async function meccsMentese(jatekId, pontok) {
    const { data, error } = await client.rpc('goatgame_meccs_mentese', { p_jatek_id: jatekId, p_pontok: pontok });
    hibaVan(error, 'a pontok mentésekor');
    return { data, error };
}

export async function meccsTorlese(meccsId) {
    const { error } = await client.from('goatgame_meccsek').delete().eq('id', meccsId);
    hibaVan(error, 'a meccs törlésekor');
    return error;
}

// A meccsek és a pontok az adatbázisban kaszkádoltan törlődnek a játékkal együtt
export async function jatekTorlese(jatekId) {
    const { error } = await client.from('goatgame_jatekok').delete().eq('id', jatekId);
    hibaVan(error, 'a játék törlésekor');
    return error;
}
