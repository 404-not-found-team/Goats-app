// Push-értesítések kiküldése. Adatbázis-triggerek hívják (pg_net), nem a kliens:
//   { "tipus": "tartozas" | "jelentes" | "ital" | "esemeny", "idk": [<a beszúrt sorok azonosítói>] }
// - Hitelesítés: az "x-push-titok" fejléc; a push_titok_ellenorzes() RPC veti össze a Vaultban tárolt
//   titokkal (csak a service role hívhatja). Ezért a függvény JWT-ellenőrzés nélkül fut (verify_jwt: false).
// - A részleteket (összeg, név, nyelv) a service role-lal maga kérdezi le az azonosítók alapján,
//   a hívó által küldött szövegben nem bízik.
// - Címzettek: tartozásnál az adós (ha nem ő maga vette fel); jelentésnél és jóváhagyásra váró italnál
//   a superadminok (profiles.system_role = 'superadmin'); új naptáreseménynél a csoport tagjai, kivéve
//   aki felvette (esemenyek.felvette_id).
// - Nyelv: profiles.language, ha üres, a feliratkozáskor rögzített eszköznyelv, végül magyar.
// - A lejárt (404/410) feliratkozásokat törli.
// Titkos beállítások: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...).
// Telepítés: supabase functions deploy push-kuldes --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type Nyelv = 'hu' | 'en';
type Uzenet = { cim: string; szoveg: string; url: string; tag: string };

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
});

webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:the.offical.404.not.found.team@gmail.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const valasz = (statusz: number, adat: Record<string, unknown>) =>
    new Response(JSON.stringify(adat), { status: statusz, headers: { 'Content-Type': 'application/json' } });

// Magyar -nak/-nek rag (ugyanaz a szabály, mint a js/pages/tartozasok.js getNakNek-je)
const nakNek = (nev: string) => nev + (/[aáoóuú]/i.test(nev) ? 'nak' : 'nek');

const osszeg = (ertek: number, nyelv: Nyelv) =>
    `${new Intl.NumberFormat(nyelv === 'hu' ? 'hu-HU' : 'en-GB', { maximumFractionDigits: 0 }).format(ertek)} Ft`;

// A közös költség leírásának végén lévő "(10 000 Ft / 4 fő)" záradék itt felesleges
const alapMiert = (miert: string) => String(miert || '').replace(/\s*\([^)]*\)\s*$/, '');

const JELENTES_OK: Record<string, Record<Nyelv, string>> = {
    gyermekbiztonsag: { hu: 'gyermekbiztonság', en: 'child safety' },
    jogellenes: { hu: 'jogellenes tartalom', en: 'illegal content' },
    zaklatas: { hu: 'zaklatás', en: 'harassment' },
    egyeb: { hu: 'egyéb', en: 'other' },
};

async function nevek(idk: string[]): Promise<Map<string, string>> {
    if (idk.length === 0) return new Map();
    const { data } = await admin.from('profiles').select('id, display_name').in('id', idk);
    return new Map((data || []).map(p => [p.id, p.display_name || '?']));
}

async function superadminok(): Promise<string[]> {
    const { data } = await admin.from('profiles').select('id').eq('system_role', 'superadmin');
    return (data || []).map(p => p.id);
}

// Címzettenként egy üzenet-készítő függvény (nyelv -> üzenet)
type Kuldendo = { userId: string; uzenet: (nyelv: Nyelv) => Uzenet };

async function tartozasok(idk: number[]): Promise<Kuldendo[]> {
    const { data, error } = await admin.from('tartozasok')
        .select('id, miert, mennyiert, hitelezo_id, ados_id, felvette_id').in('id', idk);
    if (error) throw error;
    const sorok = (data || []).filter(t => t.ados_id && t.ados_id !== t.felvette_id);
    const nevTar = await nevek([...new Set(sorok.map(t => t.hitelezo_id).filter(Boolean))]);
    return sorok.map(t => {
        const hitelezo = nevTar.get(t.hitelezo_id) || '?';
        const miert = alapMiert(t.miert);
        return {
            userId: t.ados_id,
            uzenet: (ny) => ({
                cim: ny === 'hu' ? 'Új tartozás' : 'New debt',
                szoveg: ny === 'hu'
                    ? `Tartozol ${nakNek(hitelezo)} ${osszeg(Number(t.mennyiert) || 0, ny)}-tal: ${miert}`
                    : `You owe ${hitelezo} ${osszeg(Number(t.mennyiert) || 0, ny)}: ${miert}`,
                url: 'tartozasok.html',
                tag: `tartozas-${t.id}`,
            }),
        };
    });
}

async function jelentesek(idk: string[]): Promise<Kuldendo[]> {
    const { data, error } = await admin.from('jelentesek').select('id, ok, cel_tipus').in('id', idk);
    if (error) throw error;
    const cimzettek = await superadminok();
    return (data || []).flatMap(j => cimzettek.map(userId => ({
        userId,
        uzenet: (ny: Nyelv) => ({
            cim: ny === 'hu' ? 'Új jelentés' : 'New report',
            szoveg: ny === 'hu'
                ? `Egy felhasználó jelentett egy ${j.cel_tipus === 'kep' ? 'képet' : 'tartalmat'} (${JELENTES_OK[j.ok]?.hu || j.ok}).`
                : `A user reported ${j.cel_tipus === 'kep' ? 'a picture' : 'some content'} (${JELENTES_OK[j.ok]?.en || j.ok}).`,
            url: 'admin.html#jelentesek',
            tag: `jelentes-${j.id}`,
        }),
    })));
}

async function italok(idk: number[]): Promise<Kuldendo[]> {
    const { data, error } = await admin.from('italok').select('id, nev, jovahagyva, javasolta_id').in('id', idk);
    if (error) throw error;
    const varakozok = (data || []).filter(i => !i.jovahagyva);
    if (varakozok.length === 0) return [];
    const cimzettek = await superadminok();
    return varakozok.flatMap(i => cimzettek.filter(id => id !== i.javasolta_id).map(userId => ({
        userId,
        uzenet: (ny: Nyelv) => ({
            cim: ny === 'hu' ? 'Jóváhagyásra váró ital' : 'Drink awaiting approval',
            szoveg: ny === 'hu' ? `Új italjavaslat: ${i.nev}` : `New drink suggestion: ${i.nev}`,
            url: 'admin.html#javaslatok',
            tag: `ital-${i.id}`,
        }),
    })));
}

// A naptár dátuma ("ÉÉÉÉ-HH-NN") olvasható formában, pl. "nov. 14., péntek" / "Fri, 14 Nov"
const datumSzoveg = (datum: string, nyelv: Nyelv) => {
    const d = new Date(`${datum}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return datum;
    return new Intl.DateTimeFormat(nyelv === 'hu' ? 'hu-HU' : 'en-GB', {
        month: 'short', day: 'numeric', weekday: 'long', timeZone: 'UTC',
    }).format(d);
};

async function esemenyek(idk: string[]): Promise<Kuldendo[]> {
    const { data, error } = await admin.from('esemenyek')
        .select('id, cim, datum, group_code, felvette_id').in('id', idk);
    if (error) throw error;
    const sorok = data || [];
    if (sorok.length === 0) return [];

    // csoportkód -> a csoport tagjai
    const kodok = [...new Set(sorok.map(e => e.group_code).filter(Boolean))];
    const { data: csoportok, error: csHiba } = await admin.from('groups').select('id, group_code').in('group_code', kodok);
    if (csHiba) throw csHiba;
    const csoportIdk = (csoportok || []).map(g => g.id);
    const { data: tagsagok, error: tHiba } = csoportIdk.length
        ? await admin.from('group_members').select('group_id, user_id').in('group_id', csoportIdk)
        : { data: [], error: null };
    if (tHiba) throw tHiba;
    const kodSzerintiTagok = new Map<string, string[]>();
    for (const g of csoportok || []) {
        kodSzerintiTagok.set(g.group_code, (tagsagok || []).filter(t => t.group_id === g.id).map(t => t.user_id));
    }

    const nevTar = await nevek([...new Set(sorok.map(e => e.felvette_id).filter(Boolean))]);
    return sorok.flatMap(e => {
        const ki = e.felvette_id ? nevTar.get(e.felvette_id) : null;
        return (kodSzerintiTagok.get(e.group_code) || []).filter(id => id !== e.felvette_id).map(userId => ({
            userId,
            uzenet: (ny: Nyelv) => ({
                cim: ny === 'hu' ? 'Új esemény' : 'New event',
                szoveg: ny === 'hu'
                    ? `${ki ? `${ki} felvette: ` : ''}${e.cim} – ${datumSzoveg(e.datum, ny)}`
                    : `${ki ? `${ki} added: ` : ''}${e.cim} – ${datumSzoveg(e.datum, ny)}`,
                url: 'app.html',
                tag: `esemeny-${e.id}`,
            }),
        }));
    });
}

async function kuldes(lista: Kuldendo[]) {
    const userIdk = [...new Set(lista.map(k => k.userId))];
    if (userIdk.length === 0) return { kuldve: 0, torolve: 0 };
    const [{ data: feliratkozasok }, { data: profilok }] = await Promise.all([
        admin.from('push_feliratkozasok').select('id, user_id, endpoint, p256dh, auth, nyelv').in('user_id', userIdk),
        admin.from('profiles').select('id, language').in('id', userIdk),
    ]);
    const fiokNyelv = new Map((profilok || []).map(p => [p.id, p.language]));
    let kuldve = 0;
    const lejart: number[] = [];
    const sikeres: number[] = [];

    await Promise.all(lista.flatMap(k => (feliratkozasok || []).filter(f => f.user_id === k.userId).map(async f => {
        const ny: Nyelv = (fiokNyelv.get(f.user_id) || f.nyelv) === 'en' ? 'en' : 'hu';
        try {
            await webpush.sendNotification(
                { endpoint: f.endpoint, keys: { p256dh: f.p256dh, auth: f.auth } },
                JSON.stringify(k.uzenet(ny)),
                { TTL: 60 * 60 * 24 },
            );
            kuldve++;
            sikeres.push(f.id);
        } catch (err) {
            const kod = (err as { statusCode?: number }).statusCode;
            if (kod === 404 || kod === 410) lejart.push(f.id);
            else console.error('Push-küldési hiba:', kod, (err as Error).message);
        }
    })));

    if (lejart.length) await admin.from('push_feliratkozasok').delete().in('id', lejart);
    if (sikeres.length) {
        await admin.from('push_feliratkozasok').update({ utoljara_hasznalva: new Date().toISOString() }).in('id', [...new Set(sikeres)]);
    }
    return { kuldve, torolve: lejart.length };
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return valasz(405, { hiba: 'csak POST' });

    const titok = req.headers.get('x-push-titok') || '';
    const { data: ervenyes, error: titokHiba } = await admin.rpc('push_titok_ellenorzes', { titok_in: titok });
    if (titokHiba || ervenyes !== true) return valasz(401, { hiba: 'jogosulatlan' });

    let adat: { tipus?: string; idk?: unknown[] };
    try { adat = await req.json(); } catch { return valasz(400, { hiba: 'hibás JSON' }); }
    const idk = Array.isArray(adat.idk) ? adat.idk.slice(0, 500) : [];
    if (idk.length === 0) return valasz(200, { kuldve: 0 });

    try {
        let lista: Kuldendo[];
        if (adat.tipus === 'tartozas') lista = await tartozasok(idk.map(Number).filter(Number.isFinite));
        else if (adat.tipus === 'jelentes') lista = await jelentesek(idk.map(String));
        else if (adat.tipus === 'ital') lista = await italok(idk.map(Number).filter(Number.isFinite));
        else if (adat.tipus === 'esemeny') lista = await esemenyek(idk.map(String).filter(Boolean));
        else return valasz(400, { hiba: 'ismeretlen típus' });
        return valasz(200, await kuldes(lista));
    } catch (err) {
        console.error('push-kuldes hiba:', err);
        return valasz(500, { hiba: 'belső hiba' });
    }
});
