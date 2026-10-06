// Csoport képei a "kepek" bucketben (FELADAT3).
// A mappa neve a csoport azonosítója (groups.id), ami a kódcsere után sem változik.
// ATMENETI_REGI_MAPPA: a régi, csoportkód nevű mappa is olvasható marad, amíg a képeket
// át nem mozgattuk. Az átmozgatás után ki kell kapcsolni, majd a kódot törölni.
// Modul: a main.js importálja, és a window.goatsKepek-en keresztül a klasszikus
// galeria.js is eléri.
import { client } from '../supabase-client.js';

export const BUCKET = 'kepek';
export const ATMENETI_REGI_MAPPA = true; // TODO: átmozgatás után false, majd a kód törlése

const LISTA_LAPMERET = 100;

// Azok a mappák, amelyekben a csoport képei lehetnek
export function csoportMappak(groupId, groupCode) {
    const mappak = [groupId];
    if (ATMENETI_REGI_MAPPA && groupCode && groupCode !== groupId) mappak.push(groupCode);
    return mappak;
}

// Egy mappa fájljainak teljes útvonala, lapozva (a list alapból csak egy részt ad)
export async function mappaFajljai(mappa) {
    const osszes = [];
    for (let offset = 0; ; offset += LISTA_LAPMERET) {
        const { data, error } = await client
            .storage
            .from(BUCKET)
            .list(mappa, {
                limit: LISTA_LAPMERET,
                offset,
                sortBy: { column: 'name', order: 'asc' }
            });
        if (error) throw error;
        const fajlok = (data || []).filter(item => item.id !== null && item.name !== '.emptyFolderPlaceholder');
        osszes.push(...fajlok.map(f => `${mappa}/${f.name}`));
        if (!data || data.length < LISTA_LAPMERET) break;
    }
    return osszes;
}

// A csoport összes képének törlése. A hívónak a RPC (csoport törlése, utolsó tag kilépése,
// fiók törlése) ELŐTT kell futnia: utána a felhasználó már nem tag, és a storage-szabály
// nem engedné a törlést. Nem dob kivételt: a hibák listáját adja vissza, hogy a hívó
// jelezhesse, és a fő művelet (az adat törlése) mégis lefuthasson.
export async function torolCsoportKepei(groupId, groupCode) {
    const hibak = [];
    for (const mappa of csoportMappak(groupId, groupCode)) {
        let utak = [];
        try {
            utak = await mappaFajljai(mappa);
        } catch (err) {
            console.error('Képlistázási hiba a csoport törlésekor:', err);
            hibak.push(err.message || String(err));
            continue;
        }
        for (let i = 0; i < utak.length; i += LISTA_LAPMERET) {
            const { error } = await client.storage.from(BUCKET).remove(utak.slice(i, i + LISTA_LAPMERET));
            if (error) {
                console.error('Képtörlési hiba a csoport törlésekor:', error);
                hibak.push(error.message || String(error));
            }
        }
    }
    return hibak;
}

// A klasszikus galeria.js ezen keresztül éri el a közös értékeket és a listázást
window.goatsKepek = { BUCKET, ATMENETI_REGI_MAPPA, csoportMappak, mappaFajljai };
