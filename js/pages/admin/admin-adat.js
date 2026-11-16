// Admin oldal – adatréteg: a négy admin-fül (kapcsolók, javaslatok, jelentések, kategóriák) összes
// Supabase-művelete. A felülethez nem nyúl. Hiba esetén a hibaVan naplóz; mivel az admin felület szinte
// mindenhol kiírja a hibaüzenetet vagy a hibakódot, a függvények egységesen { data, error }-t adnak vissza.
import { client } from '../../supabase-client.js';
import { hibaVan } from '../../adat/hibakezeles.js';

// Naplózás után a Supabase-válasz { data, error } része változatlanul
function eredmeny({ data, error }, muvelet) {
    hibaVan(error, muvelet);
    return { data, error };
}

// ---------- Globális kapcsolók (admin.js) ----------

// Mindig friss lekérdezés (nem a munkamenet-gyorsítótárból)
export async function kapcsolokLekerese() {
    return eredmeny(await client.from('app_kapcsolok').select('kulcs, ertek'), 'a kapcsolók betöltésekor');
}

export async function beallitasMentese(kulcs, ertek) {
    return eredmeny(await client.rpc('admin_beallitas_mentese', { kulcs_in: kulcs, ertek_in: ertek }), 'a beállítás mentésekor');
}

// ---------- Italjavaslatok és Hány napja-sablonok (admin-javaslatok.js) ----------

export async function italJavaslatokLekerese() {
    return eredmeny(await client.rpc('list_pending_drinks'), 'a javaslatok betöltésekor');
}

// A javasolt italok részletei az új táblákból (a superadmin a jóvá nem hagyottakat is látja):
// { italok, receptek } (hibánál üres tömbök)
export async function italJavaslatReszletei(azonositok) {
    const [italRes, receptRes] = await Promise.all([
        client.from('italok').select('id, kategoria_id, alkohol_fok, kiszereles, recept_mod').in('id', azonositok),
        client.from('ital_osszetevok').select('ital_id, sorrend, nev, mennyiseg, egyseg').in('ital_id', azonositok).order('sorrend'),
    ]);
    hibaVan(italRes.error, 'a javaslatok részleteinek betöltésekor');
    hibaVan(receptRes.error, 'a javaslatok receptjeinek betöltésekor');
    return { italok: italRes.data || [], receptek: receptRes.data || [] };
}

// Jóváhagyás vagy elutasítás (rpc: 'approve_drink' / 'reject_drink' stb.)
export async function italJavaslatDontes(rpc, italId) {
    return eredmeny(await client.rpc(rpc, { drink_id: italId }), `a(z) ${rpc} hívásakor`);
}

// { fuggo: { data, error }, jovahagyott: { data, error } }
export async function sablonokLekerese() {
    const [fuggo, jovahagyott] = await Promise.all([
        client.rpc('list_pending_hn_templates'),
        client.from('hanynapja_sablonok').select('id, nev, nev_en, nev_de').eq('jovahagyva', true).order('nev'),
    ]);
    return {
        fuggo: eredmeny(fuggo, 'a sablonjavaslatok betöltésekor'),
        jovahagyott: eredmeny(jovahagyott, 'a jóváhagyott sablonok betöltésekor'),
    };
}

export async function sablonAtnevezese(id, nev) {
    return eredmeny(await client.from('hanynapja_sablonok').update({ nev }).eq('id', id), 'a sablon átnevezésekor');
}

export async function sablonMentese(id, nev, nevEn, nevDe) {
    return eredmeny(await client.from('hanynapja_sablonok')
        .update({ nev, nev_en: nevEn, nev_de: nevDe })
        .eq('id', id), 'a sablon mentésekor');
}

// Sablon jóváhagyása vagy elutasítása (rpc: 'approve_hn_template' / 'reject_hn_template')
export async function sablonDontes(rpc, parameterek) {
    return eredmeny(await client.rpc(rpc, parameterek), `a(z) ${rpc} hívásakor`);
}

// ---------- Jelentések (admin-jelentesek.js) ----------

export async function jelentesekLekerese(csakNyitott) {
    return eredmeny(await client.rpc('admin_jelentesek', { csak_nyitott: csakNyitott }), 'a jelentések betöltésekor');
}

// Aláírt (10 percig érvényes) link egy képhez; ha nem sikerül, null
export async function alairtLink(bucket, utvonal) {
    const { data } = await client.storage.from(bucket).createSignedUrl(utvonal, 600);
    return data?.signedUrl || null;
}

// A data a törlendő képfájl útvonala (ha kepTorlese)
export async function jelentesLezarasa(jelentesId, kepTorlese) {
    return eredmeny(await client.rpc('admin_jelentes_lezarasa', { jelentes_id: jelentesId, kep_torlese: kepTorlese }), 'a jelentés lezárásakor');
}

export async function kepfajlTorlese(bucket, utvonal) {
    return eredmeny(await client.storage.from(bucket).remove([utvonal]), 'a képfájl törlésekor');
}

// ---------- Italkategóriák (admin-kategoriak.js) ----------

// A kategóriák a közös window.italKategoriak tárba töltődnek (js/segedek/ital-kategoriak.js)
export async function kategoriakBetoltese() {
    await window.italKategoriak.betolt(client);
}

export async function italokLekerese() {
    return eredmeny(await client
        .from('italok')
        .select('id, marka, nev, kategoria_id, alkategoria_id, alkategoria_kezi, zero, jovahagyva')
        .order('nev', { ascending: true })
        .range(0, 1999), 'az italok betöltésekor');
}

// Két alkategória sorrendjének cseréje; true, ha mindkettő sikerült
export async function sorrendCsere(a, b) {
    const [r1, r2] = await Promise.all([
        client.from('ital_kategoriak').update({ sorrend: b.sorrend }).eq('id', a.id),
        client.from('ital_kategoriak').update({ sorrend: a.sorrend }).eq('id', b.id),
    ]);
    return !(hibaVan(r1.error, 'a sorrend mentésekor') | hibaVan(r2.error, 'a sorrend mentésekor'));
}

export async function alkategoriaModositasa(id, valtozas) {
    return eredmeny(await client.from('ital_kategoriak').update(valtozas).eq('id', id), 'az alkategória mentésekor');
}

// A kézzel ide sorolt italok visszakerülnek a szabály szerinti besorolásra, utána törlődik az alkategória
export async function alkategoriaTorlese(id) {
    const vissza = eredmeny(await client
        .from('italok')
        .update({ alkategoria_kezi: false, alkategoria_id: null })
        .eq('alkategoria_id', id), 'az italok visszaállításakor');
    if (vissza.error) return vissza;
    return eredmeny(await client.from('ital_kategoriak').delete().eq('id', id), 'az alkategória törlésekor');
}

export async function alkategoriaLetrehozasa(sor) {
    return eredmeny(await client.from('ital_kategoriak').insert(sor), 'az alkategória létrehozásakor');
}

export async function italBesorolasMentese(id, valtozas) {
    return eredmeny(await client.from('italok').update(valtozas).eq('id', id), 'az ital besorolásának mentésekor');
}
