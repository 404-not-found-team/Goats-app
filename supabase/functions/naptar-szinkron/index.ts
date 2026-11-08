// A naptáresemények szinkronizálása a csoportok közös Google-naptárába. Adatbázis-triggerek hívják (pg_net),
// ugyanazzal a titkos fejléccel ("x-push-titok"), mint a push-kuldes függvényt:
//   { "muvelet": "esemeny", "id": 12, "torolve": false, "group_code": "...", "google_esemeny_id": null }
//   { "muvelet": "tag", "user_id": "<uuid>" }
//   { "muvelet": "csoport", "group_id": "<uuid>" }    (kézi újraszinkron: a csoport összes jövőbeli eseménye)
// Működés:
// - Minden csoportnak egy saját Google-naptára van, a robotfiók (service account) tulajdonában
//   (groups.google_naptar_id). Akkor jön létre, amikor a csoportból az első tag bekapcsolja a szinkront;
//   ekkor a csoport mai és későbbi eseményei is felkerülnek.
// - "tag": egy felhasználó be- vagy kikapcsolta a szinkront (naptar_szinkron), vagy belépett egy csoportba,
//   esetleg kilépett belőle. A függvény újraszámolja, melyik csoportnaptárakhoz kell hozzáférnie
//   (a csoportjai, ha be van kapcsolva a szinkron), és ehhez igazítja a megosztásokat (naptar_megosztasok).
//   Új megosztásnál a Google e-mailt küld neki, abban egyszer hozzá kell adnia a naptárt.
// - "esemeny": új eseménynél felveszi a Google-naptárba (és visszaírja az esemenyek.google_esemeny_id-t),
//   módosításnál frissíti, törlésnél törli.
// - Az események egész naposak (az esemenyek.datum csak dátum).
// Titkos beállítás: GOOGLE_SERVICE_ACCOUNT (a robotfiók JSON-kulcsának teljes tartalma).
// Telepítés: supabase functions deploy naptar-szinkron --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
});

const API = 'https://www.googleapis.com/calendar/v3';
const IDOZONA = 'Europe/Budapest';

const valasz = (statusz: number, adat: Record<string, unknown>) =>
    new Response(JSON.stringify(adat), { status: statusz, headers: { 'Content-Type': 'application/json' } });

// ---------------------------------------------------------------------------
// Google-hozzáférés: a robotfiók kulcsával aláírt JWT-t a Google hozzáférési tokenre cseréli (kb. 1 óráig él)
// ---------------------------------------------------------------------------
type Kulcs = { client_email: string; private_key: string; token_uri?: string };
let tarolt: { token: string; lejar: number } | null = null;

const b64url = (bajtok: Uint8Array) =>
    btoa(String.fromCharCode(...bajtok)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlSzoveg = (s: string) => b64url(new TextEncoder().encode(s));

async function googleToken(): Promise<string> {
    if (tarolt && tarolt.lejar > Date.now() + 60_000) return tarolt.token;
    const nyers = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!nyers) throw new Error('Hiányzik a GOOGLE_SERVICE_ACCOUNT titok');
    const kulcs = JSON.parse(nyers) as Kulcs;
    const tokenUri = kulcs.token_uri || 'https://oauth2.googleapis.com/token';

    const most = Math.floor(Date.now() / 1000);
    const fej = b64urlSzoveg(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const tartalom = b64urlSzoveg(JSON.stringify({
        iss: kulcs.client_email,
        scope: 'https://www.googleapis.com/auth/calendar',
        aud: tokenUri,
        iat: most,
        exp: most + 3600,
    }));
    const pem = kulcs.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
    const privat = await crypto.subtle.importKey(
        'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
    );
    const alairas = new Uint8Array(await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5', privat, new TextEncoder().encode(`${fej}.${tartalom}`),
    ));

    const valaszG = await fetch(tokenUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${fej}.${tartalom}.${b64url(alairas)}`,
        }),
    });
    const adat = await valaszG.json();
    if (!valaszG.ok) throw new Error(`Google token hiba: ${valaszG.status} ${JSON.stringify(adat)}`);
    tarolt = { token: adat.access_token, lejar: Date.now() + (adat.expires_in || 3600) * 1000 };
    return tarolt.token;
}

class GoogleHiba extends Error {
    constructor(public statusz: number, uzenet: string) { super(uzenet); }
}

async function google(utvonal: string, metodus = 'GET', torzs?: unknown) {
    const token = await googleToken();
    const v = await fetch(`${API}${utvonal}`, {
        method: metodus,
        headers: { Authorization: `Bearer ${token}`, ...(torzs ? { 'Content-Type': 'application/json' } : {}) },
        body: torzs ? JSON.stringify(torzs) : undefined,
    });
    if (v.status === 204) return null;
    const szoveg = await v.text();
    if (!v.ok) throw new GoogleHiba(v.status, `Google ${metodus} ${utvonal}: ${v.status} ${szoveg.slice(0, 300)}`);
    return szoveg ? JSON.parse(szoveg) : null;
}

// ---------------------------------------------------------------------------
// Csoportnaptár
// ---------------------------------------------------------------------------
type Csoport = { id: string; group_code: string; group_name: string | null; google_naptar_id: string | null };

async function csoportNaptar(cs: Csoport): Promise<string> {
    if (cs.google_naptar_id) return cs.google_naptar_id;
    const naptar = await google('/calendars', 'POST', {
        summary: `ATG – ${cs.group_name || cs.group_code}`,
        description: 'Az ATG – All-Time Greats app csoportnaptára. Az eseményeket az appban lehet szerkeszteni.',
        timeZone: IDOZONA,
    });
    // Ha közben egy párhuzamos hívás már létrehozta, azt használjuk, és az újat töröljük
    const { data: frissitett } = await admin.from('groups')
        .update({ google_naptar_id: naptar.id }).eq('id', cs.id).is('google_naptar_id', null)
        .select('google_naptar_id');
    if (!frissitett || frissitett.length === 0) {
        await google(`/calendars/${encodeURIComponent(naptar.id)}`, 'DELETE').catch(() => {});
        const { data } = await admin.from('groups').select('google_naptar_id').eq('id', cs.id).single();
        return data!.google_naptar_id;
    }
    cs.google_naptar_id = naptar.id;
    await jovobeliEsemenyekFeltoltese(cs);
    return naptar.id;
}

// A csoport mai és későbbi eseményei közül azok, amelyek még nincsenek fent
async function jovobeliEsemenyekFeltoltese(cs: Csoport) {
    const ma = new Intl.DateTimeFormat('sv-SE', { timeZone: IDOZONA }).format(new Date());
    const { data } = await admin.from('esemenyek')
        .select('id, cim, datum, felvette_id, google_esemeny_id')
        .eq('group_code', cs.group_code).gte('datum', ma).is('google_esemeny_id', null);
    for (const e of data || []) await esemenyFelvetele(cs, e);
}

// ---------------------------------------------------------------------------
// Események
// ---------------------------------------------------------------------------
type Esemeny = { id: number; cim: string; datum: string; felvette_id: string | null; google_esemeny_id: string | null };

const kovetkezoNap = (datum: string) => {
    const d = new Date(`${datum}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
};

async function esemenyTorzs(e: Esemeny) {
    let leiras = 'Az ATG appból.';
    if (e.felvette_id) {
        const { data } = await admin.from('profiles').select('display_name').eq('id', e.felvette_id).maybeSingle();
        if (data?.display_name) leiras = `Felvette: ${data.display_name} (ATG app)`;
    }
    return {
        summary: e.cim,
        description: leiras,
        start: { date: e.datum },
        end: { date: kovetkezoNap(e.datum) },   // egész napos esemény: a vége a következő nap (kizárólagos)
        transparency: 'transparent',            // ne foglalja el a naptárat ("szabad" marad)
    };
}

async function esemenyFelvetele(cs: Csoport, e: Esemeny) {
    const uj = await google(`/calendars/${encodeURIComponent(cs.google_naptar_id!)}/events`, 'POST', await esemenyTorzs(e));
    await admin.from('esemenyek').update({ google_esemeny_id: uj.id }).eq('id', e.id);
}

async function esemenyMuvelet(adat: { id?: number; torolve?: boolean; group_code?: string; google_esemeny_id?: string | null }) {
    if (!adat.group_code) return { kihagyva: 'nincs csoportkód' };
    const { data: cs } = await admin.from('groups')
        .select('id, group_code, group_name, google_naptar_id').eq('group_code', adat.group_code).maybeSingle();
    if (!cs?.google_naptar_id) return { kihagyva: 'a csoportnak nincs Google-naptára' };
    const naptar = encodeURIComponent(cs.google_naptar_id);

    if (adat.torolve) {
        if (!adat.google_esemeny_id) return { kihagyva: 'nem volt fent' };
        try {
            await google(`/calendars/${naptar}/events/${encodeURIComponent(adat.google_esemeny_id)}`, 'DELETE');
        } catch (err) {
            if (!(err instanceof GoogleHiba && (err.statusz === 404 || err.statusz === 410))) throw err;
        }
        return { torolve: true };
    }

    const { data: e } = await admin.from('esemenyek')
        .select('id, cim, datum, felvette_id, google_esemeny_id').eq('id', adat.id).maybeSingle();
    if (!e) return { kihagyva: 'az esemény már nincs meg' };
    if (!e.google_esemeny_id) {
        await esemenyFelvetele(cs, e);
        return { felveve: true };
    }
    try {
        await google(`/calendars/${naptar}/events/${encodeURIComponent(e.google_esemeny_id)}`, 'PATCH', await esemenyTorzs(e));
        return { modositva: true };
    } catch (err) {
        // ha a Google-ben közben eltűnt, újra felvesszük
        if (err instanceof GoogleHiba && (err.statusz === 404 || err.statusz === 410)) {
            await esemenyFelvetele(cs, e);
            return { ujrafelveve: true };
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Megosztások: egy felhasználó hozzáférése a csoportnaptárakhoz
// ---------------------------------------------------------------------------
async function tagMuvelet(userId?: string) {
    if (!userId) return { kihagyva: 'nincs felhasználó' };

    const [{ data: szinkron }, { data: tagsagok }, { data: meglevok }] = await Promise.all([
        admin.from('naptar_szinkron').select('user_id').eq('user_id', userId).maybeSingle(),
        admin.from('group_members').select('group_id').eq('user_id', userId),
        admin.from('naptar_megosztasok').select('group_id, acl_id').eq('user_id', userId),
    ]);
    const kellene = new Set(szinkron ? (tagsagok || []).map(t => t.group_id) : []);
    const megvan = new Map((meglevok || []).map(m => [m.group_id, m.acl_id]));
    const eredmeny = { megosztva: 0, visszavonva: 0 };

    // visszavonás: kikapcsolta, vagy már nem tagja a csoportnak
    for (const [groupId, aclId] of megvan) {
        if (kellene.has(groupId)) continue;
        const { data: cs } = await admin.from('groups').select('google_naptar_id').eq('id', groupId).maybeSingle();
        if (cs?.google_naptar_id) {
            try {
                await google(`/calendars/${encodeURIComponent(cs.google_naptar_id)}/acl/${encodeURIComponent(aclId)}`, 'DELETE');
            } catch (err) {
                if (!(err instanceof GoogleHiba && (err.statusz === 404 || err.statusz === 410))) throw err;
            }
        }
        await admin.from('naptar_megosztasok').delete().eq('group_id', groupId).eq('user_id', userId);
        eredmeny.visszavonva++;
    }

    // új megosztás: bekapcsolta, és még nincs megosztva vele
    const ujak = [...kellene].filter(id => !megvan.has(id));
    if (ujak.length) {
        const { data: felhasznalo, error } = await admin.auth.admin.getUserById(userId);
        const email = felhasznalo?.user?.email;
        if (error || !email) throw new Error(`Nincs e-mail cím a felhasználóhoz: ${userId}`);
        for (const groupId of ujak) {
            const { data: cs } = await admin.from('groups')
                .select('id, group_code, group_name, google_naptar_id').eq('id', groupId).maybeSingle();
            if (!cs) continue;
            const naptarId = await csoportNaptar(cs);
            const szabaly = await google(`/calendars/${encodeURIComponent(naptarId)}/acl?sendNotifications=true`, 'POST', {
                role: 'reader',
                scope: { type: 'user', value: email },
            });
            await admin.from('naptar_megosztasok').upsert({ group_id: groupId, user_id: userId, acl_id: szabaly.id });
            eredmeny.megosztva++;
        }
    }
    return eredmeny;
}

async function csoportMuvelet(groupId?: string) {
    if (!groupId) return { kihagyva: 'nincs csoport' };
    const { data: cs } = await admin.from('groups')
        .select('id, group_code, group_name, google_naptar_id').eq('id', groupId).maybeSingle();
    if (!cs?.google_naptar_id) return { kihagyva: 'a csoportnak nincs Google-naptára' };
    await jovobeliEsemenyekFeltoltese(cs);
    return { kesz: true };
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return valasz(405, { hiba: 'csak POST' });

    const titok = req.headers.get('x-push-titok') || '';
    const { data: ervenyes, error: titokHiba } = await admin.rpc('push_titok_ellenorzes', { titok_in: titok });
    if (titokHiba || ervenyes !== true) return valasz(401, { hiba: 'jogosulatlan' });

    let adat: Record<string, unknown>;
    try { adat = await req.json(); } catch { return valasz(400, { hiba: 'hibás JSON' }); }

    try {
        if (adat.muvelet === 'esemeny') return valasz(200, await esemenyMuvelet(adat as never));
        if (adat.muvelet === 'tag') return valasz(200, await tagMuvelet(adat.user_id as string));
        if (adat.muvelet === 'csoport') return valasz(200, await csoportMuvelet(adat.group_id as string));
        return valasz(400, { hiba: 'ismeretlen művelet' });
    } catch (err) {
        console.error('naptar-szinkron hiba:', (err as Error).message);
        return valasz(500, { hiba: 'belső hiba' });
    }
});
