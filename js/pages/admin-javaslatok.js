// Admin oldal: jóváhagyásra váró italjavaslatok (korábban a beállítások ablakában volt).
// Csak superadminnak: az admin.js a jogosultság-ellenőrzés után tölti be. A listát és a döntést a
// list_pending_drinks / approve_drink / reject_drink RPC adja, amelyek a szerveren is ellenőrzik a szerepkört.
// A részletek (kategória, kiszerelés, alkoholfok, recept) a public.italok / ital_osszetevok táblából jönnek.
import { client } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const K = () => window.italKategoriak;

function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

function allapot(szoveg, tipus) {
    const elem = $('adminJavaslatokAllapot');
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

// A fül jelvénye az italjavaslatok és a Hány napja sablonjavaslatok együttes száma
const darabok = { ital: 0, sablon: 0 };
function darab(db, fajta = 'ital') {
    darabok[fajta] = db;
    db = darabok.ital + darabok.sablon;
    const jelveny = $('adminJavaslatokDb');
    jelveny.hidden = !db;
    jelveny.textContent = db ? String(db) : '';
}

// A javaslat részletei egy sorban: kategória · márka · kiszerelés · alkoholfok · recept
function reszletSzoveg(javaslat, ital, recept) {
    const fo = ital ? K().kategoria(ital.kategoria_id) : null;
    const reszek = [fo?.nev || javaslat.kategoria];
    reszek.push(javaslat.marka ? tr('brand_x', 'márka: {brand}', { brand: javaslat.marka }) : tr('no_brand', 'márka nélkül'));
    if (ital?.kiszereles) reszek.push(K().kiszerelesNev(ital.kiszereles));
    if (fo?.alkoholos && ital?.alkohol_fok !== null && ital?.alkohol_fok !== undefined) reszek.push(`${ital.alkohol_fok}%`);
    if (recept?.length) {
        const egyseg = (h) => h.egyseg || (ital?.recept_mod === 'arany' ? tr('part_unit', 'rész') : '');
        reszek.push(tr('recipe_x', 'recept: {list}', { list: recept.map(h => `${h.nev} ${h.mennyiseg ?? ''} ${egyseg(h)}`.replace(/\s+/g, ' ').trim()).join(', ') }));
    }
    return reszek.filter(Boolean).join(' · ');
}

function sor(javaslat, ital, recept) {
    const li = ujElem('li', 'admin-sor admin-javaslat');
    const szoveg = ujElem('div', 'admin-sor-szoveg');
    const datum = javaslat.created_at ? new Date(javaslat.created_at).toLocaleDateString(goatsNyelv.locale()) : '';
    szoveg.append(
        ujElem('span', 'admin-sor-nev', javaslat.nev || tr('unnamed', '(névtelen)')),
        ujElem('span', 'admin-sor-leiras', reszletSzoveg(javaslat, ital, recept)),
        ujElem('span', 'admin-sor-leiras', tr('suggested_by', 'javasolta: {name}', { name: javaslat.javasolta_nev || tr('unknown', 'ismeretlen') }) + (datum ? ` · ${datum}` : ''))
    );

    const gombok = ujElem('div', 'admin-sor-gombok');
    const jovahagy = ujElem('button', 'admin-gomb', tr('approve', 'Jóváhagy'));
    jovahagy.type = 'button';
    jovahagy.addEventListener('click', () => dontes('approve_drink', javaslat, tr('drink_approved', '{name}: jóváhagyva, bekerült a katalógusba.', { name: javaslat.nev }), gombok));
    const elutasit = ujElem('button', 'admin-gomb veszelyes', tr('reject', 'Elutasít'));
    elutasit.type = 'button';
    elutasit.addEventListener('click', () => {
        if (!confirm(tr('confirm_reject_drink', 'Biztosan elutasítod és törlöd ezt az italt: „{name}”? Ez nem vonható vissza.', { name: javaslat.nev }))) return;
        dontes('reject_drink', javaslat, tr('drink_rejected', '{name}: elutasítva, törölve.', { name: javaslat.nev }), gombok);
    });
    gombok.append(jovahagy, elutasit);

    li.append(szoveg, gombok);
    return li;
}

async function dontes(rpc, javaslat, siker, gombok) {
    gombok.querySelectorAll('button').forEach(g => { g.disabled = true; });
    const { error } = await client.rpc(rpc, { drink_id: javaslat.id });
    if (error) {
        console.error(`${rpc} hiba:`, error);
        allapot(error.message || tr('err_operation', 'Hiba a művelet során.'), 'hiba');
        gombok.querySelectorAll('button').forEach(g => { g.disabled = false; });
        return;
    }
    allapot(siker, 'ok');
    await betoltes();
}

async function betoltes() {
    const { data: javaslatok, error } = await client.rpc('list_pending_drinks');
    if (error) {
        console.error('A javaslatok betöltése nem sikerült:', error);
        allapot(error.message || tr('err_suggestions_load', 'A javaslatok betöltése nem sikerült.'), 'hiba');
        return;
    }
    const lista = javaslatok || [];
    darab(lista.length);
    if (lista.length === 0) {
        $('adminJavaslatok').replaceChildren(ujElem('li', 'admin-sor admin-ures', tr('no_pending_drinks', 'Nincs jóváhagyásra váró ital.')));
        return;
    }

    // Részletek az új táblákból (a superadmin a jóvá nem hagyottakat is látja)
    const azonositok = lista.map(j => j.id);
    const [italRes, receptRes] = await Promise.all([
        client.from('italok').select('id, kategoria_id, alkohol_fok, kiszereles, recept_mod').in('id', azonositok),
        client.from('ital_osszetevok').select('ital_id, sorrend, nev, mennyiseg, egyseg').in('ital_id', azonositok).order('sorrend'),
    ]);
    if (italRes.error) console.error('A javaslatok részletei nem tölthetők be:', italRes.error);
    const italok = new Map((italRes.data || []).map(i => [i.id, i]));
    const receptek = new Map();
    (receptRes.data || []).forEach(o => {
        if (!receptek.has(o.ital_id)) receptek.set(o.ital_id, []);
        receptek.get(o.ital_id).push(o);
    });

    $('adminJavaslatok').replaceChildren(...lista.map(j => sor(j, italok.get(j.id), receptek.get(j.id))));
}

// ---------- Hány napja sablonjavaslatok (list_pending_hn_templates / approve_hn_template / reject_hn_template) ----------

function sablonAllapot(szoveg, tipus) {
    const elem = $('adminHnSablonokAllapot');
    if (!elem) return;
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

// Fordítás-mezők (angol, német) egy sablonhoz; üresen hagyva a magyar név látszik
function forditasMezok(s) {
    const mezo = (ertek, cimke) => {
        const m = ujElem('input', 'admin-bemenet');
        m.type = 'text';
        m.maxLength = 40;
        m.value = ertek || '';
        m.placeholder = cimke;
        m.setAttribute('aria-label', cimke);
        return m;
    };
    return {
        en: mezo(s.nev_en, tr('hn_name_en', 'Angol név')),
        de: mezo(s.nev_de, tr('hn_name_de', 'Német név')),
    };
}

// Függő javaslat: a magyar név és a két fordítás szerkeszthető, aztán jóváhagyás vagy elutasítás
function sablonSor(s) {
    const li = ujElem('li', 'admin-sor admin-javaslat admin-hn-sor');
    const szoveg = ujElem('div', 'admin-sor-szoveg');
    const datum = s.letrehozva ? new Date(s.letrehozva).toLocaleDateString(goatsNyelv.locale()) : '';
    szoveg.append(
        ujElem('span', 'admin-sor-nev', s.nev),
        ujElem('span', 'admin-sor-leiras', tr('suggested_by', 'javasolta: {name}', { name: s.javasolta_nev || tr('unknown', 'ismeretlen') }) + (datum ? ` · ${datum}` : ''))
    );
    const hu = ujElem('input', 'admin-bemenet');
    hu.type = 'text';
    hu.maxLength = 40;
    hu.value = s.nev;
    hu.setAttribute('aria-label', tr('hn_name_hu', 'Magyar név'));
    hu.placeholder = tr('hn_name_hu', 'Magyar név');
    const { en, de } = forditasMezok(s);

    const jovahagy = ujElem('button', 'admin-gomb', tr('approve', 'Jóváhagy'));
    jovahagy.type = 'button';
    jovahagy.addEventListener('click', async () => {
        const ujNev = hu.value.trim();
        if (!ujNev) return sablonAllapot(tr('hn_err_name', 'Írd be, mit számoljon (legfeljebb 40 karakter).'), 'hiba');
        // ha a magyar nevet is javítottad, előbb az mentődik (superadmin update policy)
        if (ujNev !== s.nev) {
            const { error } = await client.from('hanynapja_sablonok').update({ nev: ujNev }).eq('id', s.id);
            if (error) {
                console.error('A sablon átnevezése nem sikerült:', error);
                return sablonAllapot(tr('err_save_msg', 'A mentés nem sikerült: {msg}', { msg: error.message }), 'hiba');
            }
        }
        sablonDontes('approve_hn_template', { template_id: s.id, nev_en: en.value, nev_de: de.value },
            tr('hn_template_approved', '{name}: jóváhagyva, mindenki választhatja.', { name: ujNev }), gombok);
    });
    const elutasit = ujElem('button', 'admin-gomb veszelyes', tr('reject', 'Elutasít'));
    elutasit.type = 'button';
    elutasit.addEventListener('click', () => {
        if (!confirm(tr('hn_confirm_reject_template', 'Biztosan elutasítod ezt a sablont: „{name}”? A javasló számlálója megmarad.', { name: s.nev }))) return;
        sablonDontes('reject_hn_template', { template_id: s.id }, tr('hn_template_rejected', '{name}: elutasítva.', { name: s.nev }), gombok);
    });
    const gombok = ujElem('div', 'admin-urlap-sor');
    gombok.append(hu, en, de, jovahagy, elutasit);
    li.append(szoveg, gombok);
    return li;
}

// Jóváhagyott sablon: a nevek (magyar, angol, német) utólag is javíthatók
function jovahagyottSor(s) {
    const li = ujElem('li', 'admin-sor admin-javaslat admin-hn-sor');
    const hu = ujElem('input', 'admin-bemenet');
    hu.type = 'text';
    hu.maxLength = 40;
    hu.value = s.nev;
    hu.setAttribute('aria-label', tr('hn_name_hu', 'Magyar név'));
    hu.placeholder = tr('hn_name_hu', 'Magyar név');
    const { en, de } = forditasMezok(s);
    const ment = ujElem('button', 'admin-gomb', tr('save', 'Mentés'));
    ment.type = 'button';
    ment.addEventListener('click', async () => {
        const nev = hu.value.trim();
        if (!nev) return sablonAllapot(tr('hn_err_name', 'Írd be, mit számoljon (legfeljebb 40 karakter).'), 'hiba');
        ment.disabled = true;
        const { error } = await client.from('hanynapja_sablonok')
            .update({ nev, nev_en: en.value.trim() || null, nev_de: de.value.trim() || null })
            .eq('id', s.id);
        ment.disabled = false;
        if (error) {
            console.error('A sablon mentése nem sikerült:', error);
            return sablonAllapot(error.code === '23505'
                ? tr('hn_err_template_exists', 'Már van ilyen nevű sablon.')
                : tr('err_save_msg', 'A mentés nem sikerült: {msg}', { msg: error.message }), 'hiba');
        }
        sablonAllapot(tr('saved_x', '{name}: mentve.', { name: nev }), 'ok');
    });
    const sor = ujElem('div', 'admin-urlap-sor');
    sor.append(hu, en, de, ment);
    li.append(sor);
    return li;
}

async function sablonDontes(rpc, parameterek, siker, gombok) {
    gombok.querySelectorAll('button').forEach(g => { g.disabled = true; });
    const { error } = await client.rpc(rpc, parameterek);
    if (error) {
        console.error(`${rpc} hiba:`, error);
        sablonAllapot(error.message || tr('err_operation', 'Hiba a művelet során.'), 'hiba');
        gombok.querySelectorAll('button').forEach(g => { g.disabled = false; });
        return;
    }
    sablonAllapot(siker, 'ok');
    await sablonBetoltes();
}

async function sablonBetoltes() {
    const doboz = $('adminHnSablonok');
    if (!doboz) return;
    const [fuggo, jovahagyott] = await Promise.all([
        client.rpc('list_pending_hn_templates'),
        client.from('hanynapja_sablonok').select('id, nev, nev_en, nev_de').eq('jovahagyva', true).order('nev'),
    ]);
    if (fuggo.error) {
        console.error('A sablonjavaslatok betöltése nem sikerült:', fuggo.error);
        sablonAllapot(fuggo.error.message || tr('err_suggestions_load', 'A javaslatok betöltése nem sikerült.'), 'hiba');
        return;
    }
    // a függő sorhoz a fordítás-mezők üresen indulnak (a lista RPC nem adja vissza őket)
    const lista = fuggo.data || [];
    darab(lista.length, 'sablon');
    doboz.replaceChildren(...(lista.length
        ? lista.map(sablonSor)
        : [ujElem('li', 'admin-sor admin-ures', tr('hn_no_pending_templates', 'Nincs jóváhagyásra váró sablon.'))]));

    const kesz = $('adminHnJovahagyott');
    if (kesz) {
        if (jovahagyott.error) console.error('A jóváhagyott sablonok betöltése nem sikerült:', jovahagyott.error);
        const sorok = jovahagyott.data || [];
        kesz.replaceChildren(...(sorok.length
            ? sorok.map(jovahagyottSor)
            : [ujElem('li', 'admin-sor admin-ures', tr('hn_no_templates', 'Még nincs jóváhagyott sablon.'))]));
    }
}

export async function indit() {
    sablonBetoltes();
    try {
        if (!K().fo.length) await K().betolt(client);
    } catch (err) {
        console.error('Az italkategóriák betöltése nem sikerült:', err);
    }
    await betoltes();
}
