// Képek – adatréteg: Storage (a képfájlok), a public.kepek tábla (feltöltő, időpont) és a kep-jelentes
// Edge Function. A felülethez nem nyúl; hiba esetén a hibaVan naplóz, a visszatérési érték mondja meg,
// mi történt (a felület a hibaüzenetet is kiírja, ezért a módosítások magát a hibát adják vissza).
import { client } from '../../supabase-client.js';
import { hibaVan } from '../../adat/hibakezeles.js';
import { BUCKET, csoportMappak, mappaFajljai } from '../../segedek/csoport-kepek.js';

// A csoport összes képe, a legújabb elöl: [{ path, feltoltotteId, letrehozva }]; hibánál undefined
export async function kepekLekerese(csoport) {
    // A csoport mappái párhuzamosan
    let hiba = false;
    const mappak = await Promise.all(csoportMappak(csoport.id, csoport.group_code).map(mappa =>
        mappaFajljai(mappa).catch(err => {
            console.error('Hiba a képek listázásakor:', err);
            hiba = true;
            return [];
        })
    ));
    if (hiba) return undefined;
    const utak = mappak.flat();

    // Feltöltő és időpont a public.kepek táblából (FELADAT9); ha egy képnek nincs sora, ezek üresek
    const adatok = new Map();
    if (utak.length > 0) {
        const { data, error } = await client
            .from('kepek')
            .select('utvonal, feltoltotte_id, letrehozva')
            .eq('group_id', csoport.id);
        hibaVan(error, 'a képadatok lekérésekor');
        (data || []).forEach(s => adatok.set(s.utvonal, s));
    }

    // A legújabb elöl (a listázás feltöltési sorrendben adja)
    return utak.reverse().map(path => ({
        path,
        feltoltotteId: adatok.get(path)?.feltoltotte_id || null,
        letrehozva: adatok.get(path)?.letrehozva || null,
    }));
}

// A kép törlése a Storage-ból; a kepek tábla sora utána (nem blokkoló: az árva sor nem okoz hibát).
// Visszaadja a Storage-törlés hibáját (sikernél null).
export async function kepTorlese(path) {
    const { error } = await client.storage.from(BUCKET).remove([path]);
    if (hibaVan(error, 'a kép törlésekor')) return error;

    const { error: sorHiba } = await client.from('kepek').delete().eq('utvonal', path);
    hibaVan(sorHiba, 'a képsor törlésekor');
    return null;
}

// Jelentés a kep-jelentes Edge Functionnel: a felhasználó nevében rögzíti a jelentést, és a képről
// másolatot készít a privát "jelentett" bucketbe (supabase/functions/kep-jelentes).
// Sikernél null; hibánál { kod } (pl. 'korlat': óránként legfeljebb 20 jelentés).
export async function kepJelentese(groupId, utvonal, ok, leiras) {
    const { error } = await client.functions.invoke('kep-jelentes', {
        body: { group_id: groupId, utvonal, ok, leiras: leiras || null },
    });
    if (!error) return null;

    let kod = null;
    try { kod = (await error.context?.json?.())?.hiba || null; } catch { /* nem JSON válasz */ }
    console.error('Hiba a jelentés beküldésekor:', error, kod);
    return { kod };
}

// A csoportonkénti képkorlát a szervertől (minden feltöltésnél frissen); hiba esetén null
export async function kepKorlatLekerese() {
    try {
        const { data, error } = await client.rpc('kep_korlat_csoportonkent');
        if (!error && Number.isFinite(data)) return data;
    } catch { /* a szerver úgyis ellenőrzi */ }
    return null;
}

// RLS-elutasítás (a képkorlát így jelez)
export function rlsHibaE(error) {
    const uzenet = String(error?.message || '').toLowerCase();
    return String(error?.statusCode) === '403' || error?.code === '42501'
        || uzenet.includes('row-level security') || uzenet.includes('policy');
}

// A tömörített kép feltöltése; visszaadja a hibát (sikernél null)
export async function kepFeltoltese(eleresiUt, blob) {
    const { error } = await client.storage.from(BUCKET).upload(eleresiUt, blob, {
        cacheControl: '31536000', // a fájl soha nem módosul, mindig új útvonalra töltünk fel
        contentType: blob.type,
        upsert: false
    });
    hibaVan(error, 'a kép feltöltésekor');
    return error;
}

// A sor rögzítése a kepek táblában (FELADAT9); két sikertelen próba után a fájlt töröljük,
// hogy ne maradjon a táblában nem szereplő kép. true, ha a sor bekerült.
export async function kepSorRogzitese(groupId, eleresiUt, meret) {
    const sor = { group_id: groupId, utvonal: eleresiUt, meret };
    let sorHiba = (await client.from('kepek').insert(sor)).error;
    if (sorHiba) {
        console.warn('A kepek sor beszúrása nem sikerült, újrapróbálás:', sorHiba);
        sorHiba = (await client.from('kepek').insert(sor)).error;
    }
    if (hibaVan(sorHiba, 'a képsor második beszúrásakor')) {
        const { error: takaritasHiba } = await client.storage.from(BUCKET).remove([eleresiUt]);
        hibaVan(takaritasHiba, 'a gazdátlan fájl törlésekor');
        return false;
    }
    return true;
}
