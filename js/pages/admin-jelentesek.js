// Admin oldal: beérkezett jelentések (képjelentések) elbírálása. Csak superadminnak: az admin.js a
// jogosultság-ellenőrzés után tölti be; az admin_jelentesek / admin_jelentes_lezarasa RPC a szerveren is ellenőriz.
// - A jelentett képet a privát "jelentett" bucketben lévő másolatból mutatja (a kep-jelentes Edge Function
//   készíti), így akkor is látszik, ha az eredetit közben törölték; ha nincs másolat, az eredetiből.
// - "Lezárás": nincs teendő. "Kép törlése és lezárás": az eredeti kép törlődik a csoport galériájából
//   (kepek sor + tárhely-fájl), és az ugyanerre a képre vonatkozó többi nyitott jelentés is lezárul.
import { client } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const MASOLAT_BUCKET = 'jelentett';
const KEP_BUCKET = 'kepek';

const okNev = (ok) => ({
    gyermekbiztonsag: tr('child_safety', 'Gyermekbiztonság'),
    jogellenes: tr('illegal_content', 'Jogellenes tartalom'),
    zaklatas: tr('harassment', 'Zaklatás, bántó tartalom'),
    egyeb: tr('other', 'Egyéb'),
}[ok] || ok);

const statuszNev = (s) => ({
    uj: tr('report_status_new', 'Új'),
    folyamatban: tr('report_status_progress', 'Folyamatban'),
    lezarva: tr('report_status_closed', 'Lezárva'),
}[s] || s);

let csakNyitott = true;

function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

function allapot(szoveg, tipus) {
    const elem = $('adminJelentesekAllapot');
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

function darab(db) {
    const jelveny = $('adminJelentesekDb');
    jelveny.hidden = !db;
    jelveny.textContent = db ? String(db) : '';
}

// A kép aláírt linkje: a másolatból ("jelentett/<id>.<kit>"), ha nincs, az eredetiből
async function kepLink(j) {
    if (j.masolat_utvonal?.startsWith(`${MASOLAT_BUCKET}/`)) {
        const { data } = await client.storage.from(MASOLAT_BUCKET)
            .createSignedUrl(j.masolat_utvonal.slice(MASOLAT_BUCKET.length + 1), 600);
        if (data?.signedUrl) return data.signedUrl;
    }
    if (j.cel_tipus === 'kep' && j.eredeti_megvan && j.cel_azonosito) {
        const { data } = await client.storage.from(KEP_BUCKET).createSignedUrl(j.cel_azonosito, 600);
        if (data?.signedUrl) return data.signedUrl;
    }
    return null;
}

function sor(j) {
    const li = ujElem('li', 'admin-sor admin-jelentes');

    const kepHely = ujElem('div', 'admin-jelentes-kep');
    kepHely.textContent = '…';
    kepLink(j).then(url => {
        if (!url) { kepHely.textContent = tr('report_no_image', 'nincs kép'); return; }
        const img = ujElem('img');
        img.src = url;
        img.alt = tr('reported_picture', 'Jelentett kép');
        img.loading = 'lazy';
        // koppintásra teljes méretben, új lapon
        const link = ujElem('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.setAttribute('aria-label', tr('open_full_size', 'Megnyitás teljes méretben'));
        link.append(img);
        kepHely.replaceChildren(link);
    });

    const szoveg = ujElem('div', 'admin-sor-szoveg');
    const datum = j.letrehozva ? new Date(j.letrehozva).toLocaleString(goatsNyelv.locale(), { dateStyle: 'medium', timeStyle: 'short' }) : '';
    szoveg.append(
        ujElem('span', 'admin-sor-nev', `${okNev(j.ok)} · ${statuszNev(j.statusz)}`),
        ujElem('span', 'admin-sor-leiras', tr('report_meta', 'Csoport: {group} · jelentette: {who} · {date}', {
            group: j.csoport_nev || '–', who: j.jelento_nev || tr('unknown', 'ismeretlen'), date: datum,
        })),
        ujElem('span', 'admin-sor-leiras', j.eredeti_megvan
            ? tr('report_uploader', 'Feltöltötte: {name}', { name: j.feltolto_nev || tr('unknown', 'ismeretlen') })
            : tr('report_original_gone', 'Az eredeti kép már nincs a galériában.')),
    );
    if (j.leiras) szoveg.append(ujElem('span', 'admin-jelentes-leiras', `„${j.leiras}”`));

    const gombok = ujElem('div', 'admin-sor-gombok');
    if (j.statusz !== 'lezarva') {
        const lezar = ujElem('button', 'admin-gomb masodlagos', tr('report_close', 'Lezárás'));
        lezar.type = 'button';
        lezar.addEventListener('click', () => lezaras(j, false, gombok));
        gombok.append(lezar);
        if (j.cel_tipus === 'kep' && j.eredeti_megvan) {
            const torol = ujElem('button', 'admin-gomb veszelyes', tr('report_delete_close', 'Kép törlése és lezárás'));
            torol.type = 'button';
            torol.addEventListener('click', () => {
                if (!confirm(tr('confirm_report_delete', 'Biztosan törlöd ezt a képet a csoport galériájából? A jelentett másolat megmarad.'))) return;
                lezaras(j, true, gombok);
            });
            gombok.append(torol);
        }
    }

    li.append(kepHely, szoveg, gombok);
    return li;
}

async function lezaras(j, kepTorlese, gombok) {
    gombok.querySelectorAll('button').forEach(g => { g.disabled = true; });
    const { data: utvonal, error } = await client.rpc('admin_jelentes_lezarasa', { jelentes_id: j.id, kep_torlese: kepTorlese });
    if (error) {
        console.error('admin_jelentes_lezarasa hiba:', error);
        allapot(error.message || tr('err_operation', 'Hiba a művelet során.'), 'hiba');
        gombok.querySelectorAll('button').forEach(g => { g.disabled = false; });
        return;
    }
    if (kepTorlese && utvonal) {
        const { error: tarHiba } = await client.storage.from(KEP_BUCKET).remove([utvonal]);
        if (tarHiba) {
            console.error('A képfájl törlése nem sikerült:', tarHiba);
            allapot(tr('err_report_file_delete', 'A jelentés lezárva, de a képfájl törlése nem sikerült: {msg}', { msg: tarHiba.message }), 'hiba');
            await betoltes();
            return;
        }
    }
    allapot(kepTorlese ? tr('report_closed_deleted', 'A kép törölve, a jelentés lezárva.') : tr('report_closed', 'A jelentés lezárva.'), 'ok');
    await betoltes();
}

async function betoltes() {
    const { data, error } = await client.rpc('admin_jelentesek', { csak_nyitott: csakNyitott });
    if (error) {
        console.error('A jelentések betöltése nem sikerült:', error);
        allapot(error.message || tr('err_reports_load', 'A jelentések betöltése nem sikerült.'), 'hiba');
        return;
    }
    const lista = data || [];
    if (csakNyitott) darab(lista.length);
    $('adminJelentesek').replaceChildren(...(lista.length
        ? lista.map(sor)
        : [ujElem('li', 'admin-sor admin-ures', csakNyitott ? tr('no_open_reports', 'Nincs nyitott jelentés.') : tr('no_reports', 'Még nem érkezett jelentés.'))]));
}

export function indit() {
    const szuro = $('adminJelentesekSzuro');
    szuro?.addEventListener('change', () => {
        csakNyitott = szuro.value === 'nyitott';
        betoltes();
    });
    betoltes();
}
