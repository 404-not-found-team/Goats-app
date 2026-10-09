// Kép jelentése + a kép másolata a privát "jelentett" bucketbe.
//
// 1. A jelentést a BEJELENTKEZETT FELHASZNÁLÓ nevében szúrja be (az ő JWT-jével), így a
//    public.jelentesek szabályai érvényesek: csak csoporttag jelenthet, óránként legfeljebb 20-at.
// 2. Utána a service role-lal szerveroldalon lemásolja a képet: kepek/<útvonal> ->
//    jelentett/<jelentés-azonosító>.<kiterjesztés>. A "jelentett" bucketre nincs storage-policy,
//    így a csoporttagok nem látják és nem törölhetik; a másolat akkor is megmarad, ha az eredetit
//    később törlik. A másolatot az üzemeltetők törlik kézzel, a jelentés lezárása után.
// 3. A másolat helyét beírja a jelentés masolat_utvonal oszlopába.
// Ha a másolás nem sikerül, a jelentés ettől még megmarad (a hiba a function naplójába kerül).
import { createClient } from 'npm:@supabase/supabase-js@2';

const FORRAS_BUCKET = 'kepek';
const CEL_BUCKET = 'jelentett';
const OKOK = ['gyermekbiztonsag', 'jogellenes', 'zaklatas', 'egyeb'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function valasz(statusz: number, adat: Record<string, unknown>) {
    return new Response(JSON.stringify(adat), {
        status: statusz,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });
}

// A kép útvonala: <group_id>/<fájlnév>, és csak a megadott csoport mappájából lehet
function ervenyesUtvonal(utvonal: unknown, groupId: string): utvonal is string {
    if (typeof utvonal !== 'string' || utvonal.length > 300) return false;
    const reszek = utvonal.split('/');
    return reszek.length === 2 && reszek[0] === groupId && /^[\w.-]+$/.test(reszek[1]) && !reszek[1].startsWith('.');
}

async function masolas(admin: ReturnType<typeof createClient>, forras: string, cel: string) {
    // Szerveroldali másolás bucketek között; ha a Storage ezt nem támogatná, letöltés + feltöltés
    const { error } = await admin.storage.from(FORRAS_BUCKET).copy(forras, cel, { destinationBucket: CEL_BUCKET });
    if (!error) return null;
    console.warn('copy nem sikerült, letöltés + feltöltés:', error.message);
    const { data: fajl, error: letoltHiba } = await admin.storage.from(FORRAS_BUCKET).download(forras);
    if (letoltHiba || !fajl) return letoltHiba ?? new Error('üres letöltés');
    const { error: feltoltHiba } = await admin.storage.from(CEL_BUCKET).upload(cel, fajl, {
        contentType: fajl.type || 'application/octet-stream',
        upsert: false,
    });
    return feltoltHiba;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return valasz(405, { hiba: 'metodus' });

    const auth = req.headers.get('Authorization');
    if (!auth) return valasz(401, { hiba: 'bejelentkezes' });

    let adat: Record<string, unknown>;
    try {
        adat = await req.json();
    } catch {
        return valasz(400, { hiba: 'ervenytelen' });
    }

    const groupId = typeof adat.group_id === 'string' && UUID.test(adat.group_id) ? adat.group_id : null;
    const ok = typeof adat.ok === 'string' && OKOK.includes(adat.ok) ? adat.ok : null;
    const leiras = typeof adat.leiras === 'string' && adat.leiras.trim() ? adat.leiras.trim().slice(0, 1000) : null;
    if (!groupId || !ok || !ervenyesUtvonal(adat.utvonal, groupId)) return valasz(400, { hiba: 'ervenytelen' });
    const utvonal = adat.utvonal as string;

    const url = Deno.env.get('SUPABASE_URL')!;
    const felhasznalo = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false },
    });

    // 1. A jelentés a felhasználó nevében (RLS: csoporttagság + óránkénti korlát)
    const { data: jelentes, error: jelentesHiba } = await felhasznalo
        .from('jelentesek')
        .insert({ group_id: groupId, cel_tipus: 'kep', cel_azonosito: utvonal, ok, leiras })
        .select('id')
        .single();
    if (jelentesHiba || !jelentes) {
        console.warn('A jelentés beszúrása elutasítva:', jelentesHiba?.code, jelentesHiba?.message);
        const rls = jelentesHiba?.code === '42501';
        return valasz(rls ? 403 : 400, { hiba: rls ? 'korlat' : 'beszuras' });
    }

    // 2-3. Másolat a service role-lal, és a helye a jelentés sorába
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const kiterjesztes = (utvonal.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const cel = `${jelentes.id}.${kiterjesztes}`;
    const masolasHiba = await masolas(admin, utvonal, cel);
    if (masolasHiba) {
        console.error('A jelentett kép másolása nem sikerült:', jelentes.id, utvonal, masolasHiba.message);
        return valasz(200, { ok: true, masolat: false });
    }

    const { error: frissitesHiba } = await admin
        .from('jelentesek')
        .update({ masolat_utvonal: `${CEL_BUCKET}/${cel}` })
        .eq('id', jelentes.id);
    if (frissitesHiba) console.error('A masolat_utvonal mentése nem sikerült:', jelentes.id, frissitesHiba.message);

    return valasz(200, { ok: true, masolat: true });
});
