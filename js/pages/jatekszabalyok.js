// Játékszabályok: saját csoport játékai + amit más csoportok publikusra állítottak.
// A láthatóságot teljesen az RLS dönti el (lásd jatek_szabalyok/jatek_lepesek/jatek_javaslatok
// policy-k) - a kliens csak megjeleníti, amit a szerver visszaad.
//
// Egy oldal, három nézet (body[data-nezet]): lista, jatek, szerk. A címsor hash része jelzi a nézetet
// (#jatek=<id>, #szerk=<id>, #uj, #jatszik=<id>), history.pushState-tel, így a telefon "vissza" gombja
// az oldalon belül lép vissza. Gépen (széles képernyőn) a lista és a kiválasztott játék egymás mellett látszik.
import { client } from '../supabase-client.js';
import { ready, getState, callRpc } from '../hitelesites.js';
import { betolt } from '../segedek/adat-gyorsitotar.js';

let jatekok = [];
let szuro = 'mind';
let keresett = '';
// a megnyitott játék lépései és javaslatai, játék-id szerint (újranyitáskor nem kérjük le újra)
const reszletek = new Map();
let aktivJatek = null;
let szerkesztettJatekId = null;
let jmIndex = 0;
let jmElozoFokusz = null;
// a szerkesztő melyik címsorral nyílt meg (hogy egy háttérben érkező friss lista ne írja felül a félkész szerkesztést)
let nyitottSzerk = null;
let betoltve = false;

const $ = (id) => document.getElementById(id);

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sajatJatekE(jatek) {
    return !!jatek && jatek.group_id === getState().group?.id;
}

// kereséshez: kisbetű, ékezet nélkül
function egyszerusit(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function lepesSzam(jatek) {
    return jatek.jatek_lepesek?.[0]?.count ?? null;
}

// ---------- Nézetek és címsor ----------

function hashOlvas() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'uj') return { nezet: 'szerk', id: null };
    const [kulcs, id] = h.split('=');
    if (kulcs === 'jatek' && id) return { nezet: 'jatek', id };
    if (kulcs === 'szerk' && id) return { nezet: 'szerk', id };
    if (kulcs === 'jatszik' && id) return { nezet: 'jatszik', id };
    return { nezet: 'lista', id: null };
}

function ugras(hash, csere = false) {
    const url = hash ? `#${hash}` : location.pathname + location.search;
    if (csere) history.replaceState({ app: true }, '', url);
    else history.pushState({ app: true }, '', url);
    nezetFrissitese();
}

// Vissza: ha az oldalon belül jöttünk ide, a böngésző előzményében lépünk vissza (mint a telefon gombja),
// különben (pl. közvetlen link) a listára
function vissza() {
    if (history.state?.app) history.back();
    else ugras('', true);
}

async function nezetFrissitese() {
    const { nezet, id } = hashOlvas();

    if (nezet !== 'jatszik' && !$('jsz-jatekmod').hidden) jatekModBezarasa();

    if (nezet === 'szerk') {
        if (nyitottSzerk === location.hash) return;
        if (id) {
            const jatek = jatekok.find(j => j.id === id);
            if (!betoltve) return; // a lista megérkezése után újra lefut
            if (!jatek || !sajatJatekE(jatek)) { ugras('', true); return; }
            await reszletekBetoltese(jatek);
            szerkesztoMegnyitasa(jatek);
        } else {
            szerkesztoMegnyitasa(null);
        }
        nyitottSzerk = location.hash;
        document.body.dataset.nezet = 'szerk';
        window.scrollTo(0, 0);
        return;
    }

    nyitottSzerk = null;
    document.body.dataset.nezet = nezet === 'lista' ? 'lista' : 'jatek';

    // gépen üres címsornál is az első játék látszik a lista mellett
    const jatek = id ? jatekok.find(j => j.id === id) : jatekok[0];
    if (id && !jatek) { if (betoltve) ugras('', true); return; }
    await jatekMutatasa(jatek || null);

    if (nezet === 'jatszik' && jatek) jatekModMegnyitasa();
    else if (nezet === 'jatek') window.scrollTo(0, 0);
    kirajzolasLista();
}

// ---------- Lista ----------

// Oldalbetöltéskor (elsoBetoltes) előbb az utoljára látott lista jelenik meg azonnal, a friss a háttérben
// érkezik (js/segedek/adat-gyorsitotar.js); módosítás utáni újratöltésnél csak a friss
async function betoltesJatekok(elsoBetoltes = false) {
    const lekero = async () => {
        // a lépések számával együtt (a lista kártyáin látszik)
        let { data, error } = await client
            .from('jatek_szabalyok')
            .select('*, jatek_lepesek(count)')
            .order('letrehozva', { ascending: false });
        if (error) {
            console.warn('A lépésszám nem kérhető le, nélküle töltöm be:', error);
            ({ data, error } = await client.from('jatek_szabalyok').select('*').order('letrehozva', { ascending: false }));
        }
        if (error) {
            console.error('Hiba a játékok betöltésekor:', error);
            return undefined;
        }
        return data || [];
    };
    await betolt('jatekszabalyok', lekero, (adat) => {
        jatekok = adat;
        betoltve = true;
        nezetFrissitese();
    }, { taroltElobb: elsoBetoltes });
}

function kartyaHTML(jatek) {
    const sajat = sajatJatekE(jatek);
    const n = lepesSzam(jatek);
    const meta = [];
    if (jatek.min_jatekosok) meta.push(`<span>👥 ${esc(jatek.min_jatekosok)}+</span>`);
    if (n !== null) meta.push(`<span>📜 ${tr('rules_n', '{n} szabály', { n })}</span>`);
    if (sajat && jatek.publikus) meta.push(`<span class="jsz-chip kicsi publikus">${tr('public', 'Publikus')}</span>`);
    if (!sajat) meta.push(`<span>${esc(jatek.csoport_nev || tr('other_group', 'másik csoport'))}</span>`);
    return `
        <span class="jsz-kartya-ikon" aria-hidden="true">🎲</span>
        <span class="jsz-kartya-szoveg">
            <span class="jsz-kartya-cim">${esc(jatek.cim)}</span>
            <span class="jsz-kartya-meta">${meta.join('')}</span>
        </span>
        <span class="jsz-kartya-nyil" aria-hidden="true">›</span>
    `;
}

function kirajzolasLista() {
    const lista = $('jatek-lista');
    $('jatek-ures-allapot').hidden = jatekok.length > 0;

    const k = egyszerusit(keresett);
    const lathato = jatekok.filter(j => {
        const sajat = sajatJatekE(j);
        if (szuro === 'sajat' && !sajat) return false;
        if (szuro === 'megosztott' && sajat) return false;
        return !k || egyszerusit(`${j.cim} ${j.leiras} ${j.csoport_nev}`).includes(k);
    });
    $('jsz-nincs-talalat').hidden = !(jatekok.length > 0 && lathato.length === 0);

    const kivalasztott = aktivJatek?.id;
    const csoportok = [
        [tr('own_group', 'Saját csoport'), lathato.filter(sajatJatekE)],
        [tr('from_other_groups', 'Más csoportoktól'), lathato.filter(j => !sajatJatekE(j))],
    ];
    lista.innerHTML = '';
    csoportok.forEach(([cim, elemek]) => {
        if (!elemek.length) return;
        const h = document.createElement('h2');
        h.className = 'jsz-szakaszcim';
        h.textContent = cim;
        lista.appendChild(h);
        elemek.forEach(jatek => {
            const kartya = document.createElement('a');
            kartya.className = 'jsz-kartya';
            kartya.href = `#jatek=${encodeURIComponent(jatek.id)}`;
            if (jatek.id === kivalasztott) kartya.setAttribute('aria-current', 'true');
            kartya.innerHTML = kartyaHTML(jatek);
            kartya.addEventListener('click', (e) => {
                e.preventDefault();
                // gépen a lista mellett cserélődik a játék: ilyenkor ne gyűljön az előzmény
                ugras(`jatek=${encodeURIComponent(jatek.id)}`, document.body.dataset.nezet === 'jatek');
            });
            lista.appendChild(kartya);
        });
    });
}

// ---------- Egy játék ----------

async function reszletekBetoltese(jatek, friss = false) {
    if (!friss && reszletek.has(jatek.id)) return reszletek.get(jatek.id);
    const [lepesekRes, javaslatokRes] = await Promise.all([
        client.from('jatek_lepesek').select('*').eq('jatek_id', jatek.id).order('sorrend', { ascending: true }),
        client.from('jatek_javaslatok').select('*').eq('jatek_id', jatek.id).order('letrehozva', { ascending: true }),
    ]);
    if (lepesekRes.error) console.error('Hiba a lépések betöltésekor:', lepesekRes.error);
    if (javaslatokRes.error) console.error('Hiba a javaslatok betöltésekor:', javaslatokRes.error);
    const adat = { lepesek: lepesekRes.data || [], javaslatok: javaslatokRes.data || [] };
    reszletek.set(jatek.id, adat);
    return adat;
}

async function jatekMutatasa(jatek) {
    const valtozott = aktivJatek?.id !== jatek?.id;
    aktivJatek = jatek;
    $('jsz-valassz').hidden = !!jatek || jatekok.length === 0;
    $('jsz-jatek-tartalom').hidden = !jatek;
    if (!jatek) return;
    if (valtozott) {
        menuBezarasa();
        kiegNyitas(false);
    }
    const { lepesek, javaslatok } = await reszletekBetoltese(jatek);
    if (aktivJatek?.id !== jatek.id) return; // közben másikat választottak
    kirajzolasJatek(jatek, lepesek, javaslatok);
}

function kirajzolasJatek(jatek, lepesek, javaslatok) {
    const sajat = sajatJatekE(jatek);
    $('jsz-jatek-cim').textContent = jatek.cim;

    const chipek = [];
    if (jatek.min_jatekosok) chipek.push(`<span class="jsz-chip">👥 ${tr('min_players_n', 'min. {n} fő', { n: esc(jatek.min_jatekosok) })}</span>`);
    chipek.push(jatek.publikus
        ? `<span class="jsz-chip publikus">${tr('public', 'Publikus')}</span>`
        : `<span class="jsz-chip">${tr('group_only', 'Csak a csoportnak')}</span>`);
    chipek.push(`<span class="jsz-chip">${sajat ? tr('own_group', 'Saját csoport') : esc(jatek.csoport_nev || tr('other_group', 'másik csoport'))}</span>`);
    $('jsz-jatek-chipek').innerHTML = chipek.join('');

    $('jsz-jatek-leiras').textContent = jatek.leiras || '';
    $('jsz-jatek-leiras').hidden = !jatek.leiras;
    const kell = $('jsz-kell');
    kell.hidden = !jatek.eszkozok;
    kell.innerHTML = jatek.eszkozok ? `<span aria-hidden="true">🧰</span><span><b>${tr('needed', 'Kell hozzá:')}</b> ${esc(jatek.eszkozok)}</span>` : '';

    $('jsz-menu-tarolo').hidden = !sajat;
    const vanLepes = lepesek.length > 0;
    $('jsz-inditas').hidden = !vanLepes;
    $('jsz-inditas-gep').hidden = !vanLepes;
    $('jatek-lepesek-ures').hidden = vanLepes;
    $('jsz-szabalyok-cim').textContent = `${tr('rules', 'Szabályok')} · ${lepesek.length}`;
    $('jsz-lepesek').innerHTML = lepesek.map((lepes, i) => `
        <li class="jsz-lepes">
            <span class="jsz-szam" aria-hidden="true">${i + 1}</span>
            <div class="jsz-lepes-tartalom">
                ${lepes.cim ? `<h4>${esc(lepes.cim)}</h4>` : ''}
                ${lepesSzovegHTML(lepes.szoveg)}
            </div>
        </li>
    `).join('');

    // Kiegészítések: más csoportok javaslatai; a saját játéknál elfogadhatók, másénál újat lehet küldeni
    const fuggo = javaslatok.filter(j => !j.elfogadva).length;
    const szam = $('jsz-kieg-szam');
    szam.hidden = fuggo === 0;
    szam.textContent = tr('n_new', '{n} új', { n: fuggo });

    const lista = $('jatek-javaslatok-lista');
    lista.innerHTML = javaslatok.map(j => `
        <div class="jsz-javaslat">
            <div class="jsz-javaslat-fej">
                <strong>${esc(j.cim)}</strong>
                <span>${esc(j.csoport_nev || tr('unknown_group', 'ismeretlen csoport'))}</span>
            </div>
            <p>${esc(j.szoveg)}</p>
            ${j.elfogadva
            ? `<span class="jsz-chip kicsi publikus">✓ ${tr('accepted', 'Elfogadva')}</span>`
            : (sajat ? `<button type="button" class="jsz-fo-gomb kicsi" data-id="${esc(j.id)}">${tr('accept', 'Elfogadás')}</button>` : `<span class="jsz-chip kicsi">${tr('awaiting_decision', 'Döntésre vár')}</span>`)}
        </div>
    `).join('') || `<p class="jsz-ures">${tr('no_proposals_yet', 'Még nincs beküldött javaslat.')}</p>`;
    lista.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', () => javaslatElfogadasa(btn.dataset.id));
    });

    $('jatek-uj-javaslat-resz').hidden = sajat;
}

function kiegNyitas(nyitva) {
    $('jsz-kieg-gomb').setAttribute('aria-expanded', String(nyitva));
    $('jsz-kieg-tartalom').hidden = !nyitva;
}

// ⋯ menü (Szerkesztés / Törlés)
function menuNyitas() {
    $('jsz-menu').hidden = false;
    $('jsz-menu-gomb').setAttribute('aria-expanded', 'true');
    $('jatek-szerkesztes-gomb').focus();
}

function menuBezarasa(fokuszVissza = false) {
    if ($('jsz-menu').hidden) return;
    $('jsz-menu').hidden = true;
    $('jsz-menu-gomb').setAttribute('aria-expanded', 'false');
    if (fokuszVissza) $('jsz-menu-gomb').focus();
}

// Egy lépés szövegét (a tárolt sortördelt formátumot) értelmezi: a "-"-tal kezdődő sorok
// elágazások (feltétel+következmény, "?" választja el őket), a többi a felvezető szöveg.
// Ugyanezt a formátumot építi vissza a szerkesztő (lásd lepesSzovegEpit).
function lepesSzovegFelbont(szoveg) {
    const sorok = String(szoveg || '').split('\n').map(s => s.trim()).filter(Boolean);
    const bekezdes = [];
    const kimenetek = [];
    sorok.forEach(sor => {
        if (!sor.startsWith('-')) { bekezdes.push(sor); return; }
        const tartalom = sor.slice(1).trim();
        const i = tartalom.indexOf('?');
        kimenetek.push(i === -1
            ? { feltetel: '', kovetkezmeny: tartalom }
            : { feltetel: tartalom.slice(0, i + 1), kovetkezmeny: tartalom.slice(i + 1).trim() });
    });
    return { bekezdes: bekezdes.join('\n'), kimenetek };
}

// A szerkesztő mezőiből (felvezető szöveg + feltétel/következmény párok) visszaépíti a tárolt
// sortördelt szöveget - ugyanazt a formátumot, amit a lepesSzovegFelbont vár.
function lepesSzovegEpit(bekezdes, kimenetek) {
    const sorok = String(bekezdes || '').split('\n').map(s => s.trim()).filter(Boolean);
    kimenetek.forEach(({ feltetel, kovetkezmeny }) => {
        const f = (feltetel || '').trim();
        const k = (kovetkezmeny || '').trim();
        if (f || k) sorok.push(`-${[f, k].filter(Boolean).join(' ')}`);
    });
    return sorok.join('\n');
}

function lepesSzovegHTML(szoveg) {
    const { bekezdes, kimenetek } = lepesSzovegFelbont(szoveg);
    let html = '';
    if (bekezdes) html += `<p>${esc(bekezdes).replace(/\n/g, '<br>')}</p>`;
    html += kimenetek.map(({ feltetel, kovetkezmeny }) =>
        `<p class="jsz-elagazas">${feltetel ? `<b>${esc(feltetel)}</b> ` : ''}${esc(kovetkezmeny)}</p>`).join('');
    return html || `<p>${esc(szoveg)}</p>`;
}

// ---------- Játék mód ----------

function aktivLepesek() {
    return (aktivJatek && reszletek.get(aktivJatek.id)?.lepesek) || [];
}

function jatekModMegnyitasa() {
    if (!aktivLepesek().length) return;
    if ($('jsz-jatekmod').hidden) {
        jmElozoFokusz = document.activeElement;
        jmIndex = 0;
    }
    $('jm-jatek').textContent = aktivJatek.cim;
    $('jsz-jatekmod').hidden = false;
    document.body.classList.add('jatekmod-nyitva');
    kirajzolasJatekMod();
    $('jm-bezar').focus();
}

function jatekModBezarasa() {
    $('jsz-jatekmod').hidden = true;
    document.body.classList.remove('jatekmod-nyitva');
    (jmElozoFokusz && document.contains(jmElozoFokusz) ? jmElozoFokusz : $('jsz-inditas'))?.focus?.();
    jmElozoFokusz = null;
}

function kirajzolasJatekMod() {
    const lepesek = aktivLepesek();
    jmIndex = Math.max(0, Math.min(jmIndex, lepesek.length - 1));
    const lepes = lepesek[jmIndex];
    $('jm-szamlalo').textContent = `${jmIndex + 1} / ${lepesek.length}`;
    $('jm-halad').style.width = `${((jmIndex + 1) / lepesek.length) * 100}%`;
    $('jm-lap').innerHTML = `
        <div class="jm-sorszam">${tr('rule_n', '{n}. szabály', { n: jmIndex + 1 })}</div>
        ${lepes.cim ? `<h2 class="jm-cim">${esc(lepes.cim)}</h2>` : ''}
        <div class="jm-szoveg">${lepesSzovegHTML(lepes.szoveg)}</div>
    `;
    $('jm-pontok').innerHTML = lepesek.map((_, i) => `<i${i === jmIndex ? ' class="aktiv"' : ''}></i>`).join('');
    const elso = jmIndex === 0;
    const utolso = jmIndex === lepesek.length - 1;
    $('jm-elozo').disabled = elso;
    $('jm-elozo-nyil').disabled = elso;
    $('jm-kov-nyil').disabled = utolso;
    $('jm-kov').textContent = utolso ? tr('finish_btn', 'Kész ✓') : tr('next_btn', 'Következő ›');
}

function jmLep(irany) {
    const lepesek = aktivLepesek();
    const uj = jmIndex + irany;
    if (uj >= lepesek.length) { vissza(); return; } // az utolsó után a "Kész" kilép
    if (uj < 0) return;
    jmIndex = uj;
    kirajzolasJatekMod();
}

// oldalra húzás (telefonon): legalább 50 px vízszintesen, és inkább vízszintes, mint függőleges
function huzasBekotese(elem) {
    let x0 = null, y0 = null;
    elem.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
    elem.addEventListener('pointerup', (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) jmLep(dx < 0 ? 1 : -1);
    });
    elem.addEventListener('pointercancel', () => { x0 = null; });
}

// ---------- Szerkesztő ----------

function szerkesztoMegnyitasa(jatek) {
    szerkesztettJatekId = jatek?.id || null;
    // külön elemben, hogy a nyelvváltás (data-i18n) ne írja vissza az oldal címére
    $('jsz-cim-szerk').textContent = jatek
        ? tr('edit_game_x', '{name} – szerkesztés', { name: jatek.cim })
        : tr('new_game', 'Új játék');
    $('jatek-cim-input').value = jatek?.cim || '';
    $('jatek-leiras-input').value = jatek?.leiras || '';
    $('jatek-min-jatekosok-input').value = jatek?.min_jatekosok || '';
    $('jatek-eszkozok-input').value = jatek?.eszkozok || '';
    document.querySelector(`input[name="jsz-lathato"][value="${jatek?.publikus ? 'mindenki' : 'csoport'}"]`).checked = true;
    $('jatek-szerkeszto-allapot').textContent = '';

    const kontener = $('jatek-lepesek-szerkeszto');
    kontener.innerHTML = '';
    const lepesek = jatek ? (reszletek.get(jatek.id)?.lepesek || []) : [];
    (lepesek.length ? lepesek : [{}]).forEach(l => szabalySorHozzaadasa(l.cim || '', l.szoveg || '', false));
    // új játéknál az egyetlen üres szabály nyitva, szerkesztésnél mind csukva (egy sorban a cím)
    if (!lepesek.length) szabalyNyitas(kontener.firstElementChild, true, false);
    szamozas();
    $('jatek-cim-input').focus({ preventScroll: true });
}

function szabalySorHozzaadasa(cim = '', szoveg = '', nyitva = true) {
    const kontener = $('jatek-lepesek-szerkeszto');
    const { bekezdes, kimenetek } = lepesSzovegFelbont(szoveg);
    const sor = document.createElement('li');
    sor.className = 'jsz-szk';
    sor.innerHTML = `
        <div class="jsz-szk-fej">
            <button type="button" class="jsz-fogo" aria-label="${tr('drag_rule', 'Áthelyezés (húzd, vagy a fel/le nyíllal)')}">⋮⋮</button>
            <span class="jsz-szam" aria-hidden="true"></span>
            <button type="button" class="jsz-szk-cim" aria-expanded="false"></button>
            <button type="button" class="jsz-szk-torles" aria-label="${tr('rule_delete', 'Szabály törlése')}">🗑️</button>
        </div>
        <div class="jsz-szk-test" hidden>
            <input type="text" class="jsz-mezo jatek-lepes-cim-input" maxlength="80" placeholder="${tr('rule_title_ph', 'Szabály címe (pl. Ász – vízesés)')}" aria-label="${tr('rule_title', 'Szabály címe')}">
            <textarea class="jsz-mezo jatek-lepes-szoveg-input" maxlength="2000" rows="3" placeholder="${tr('rule_text_ph', 'Mi a szabály?')}" aria-label="${tr('rule_text', 'Szabály szövege')}"></textarea>
            <div class="jsz-elagazasok"></div>
            <button type="button" class="jsz-link jsz-uj-elagazas">+ ${tr('add_branch', 'Elágazás (Ha… → akkor…)')}</button>
        </div>
    `;
    sor.querySelector('.jatek-lepes-cim-input').value = cim;
    sor.querySelector('.jatek-lepes-szoveg-input').value = bekezdes;
    const elagazasok = sor.querySelector('.jsz-elagazasok');
    kimenetek.forEach(k => elagazasHozzaadasa(elagazasok, k.feltetel, k.kovetkezmeny));

    sor.querySelector('.jsz-uj-elagazas').addEventListener('click', () => elagazasHozzaadasa(elagazasok, '', '', true));
    sor.querySelector('.jsz-szk-cim').addEventListener('click', () => szabalyNyitas(sor, sor.querySelector('.jsz-szk-test').hidden));
    sor.querySelector('.jsz-szk-torles').addEventListener('click', () => {
        const kovetkezo = sor.nextElementSibling || sor.previousElementSibling;
        sor.remove();
        szamozas();
        (kovetkezo?.querySelector('.jsz-szk-cim') || $('jatek-uj-lepes-gomb')).focus();
    });
    sor.querySelector('.jatek-lepes-cim-input').addEventListener('input', () => cimFrissites(sor));
    sor.querySelector('.jatek-lepes-szoveg-input').addEventListener('input', () => cimFrissites(sor));
    fogoBekotese(sor);
    kontener.appendChild(sor);
    cimFrissites(sor);
    if (nyitva) {
        szamozas();
        szabalyNyitas(sor, true);
    }
}

// Egyszerre egy szabály van nyitva; a csukott sorban a címe (vagy a szöveg eleje) látszik
function szabalyNyitas(sor, nyitva, fokusz = true) {
    if (!sor) return;
    if (nyitva) {
        sor.parentElement.querySelectorAll('.jsz-szk').forEach(m => { if (m !== sor) szabalyNyitas(m, false); });
    }
    sor.classList.toggle('nyitva', nyitva);
    sor.querySelector('.jsz-szk-test').hidden = !nyitva;
    sor.querySelector('.jsz-szk-cim').setAttribute('aria-expanded', String(nyitva));
    if (nyitva && fokusz) sor.querySelector('.jatek-lepes-cim-input').focus();
}

function cimFrissites(sor) {
    const cim = sor.querySelector('.jatek-lepes-cim-input').value.trim();
    const szoveg = sor.querySelector('.jatek-lepes-szoveg-input').value.trim().split('\n')[0];
    const gomb = sor.querySelector('.jsz-szk-cim');
    gomb.textContent = cim || szoveg || tr('untitled_rule', 'Új szabály');
    gomb.classList.toggle('halvany', !cim);
}

function szamozas() {
    $('jatek-lepesek-szerkeszto').querySelectorAll('.jsz-szk').forEach((sor, i) => {
        sor.querySelector('.jsz-szam').textContent = i + 1;
    });
}

// Egy elágazás sora: "Ha nem iszik?" → "Dupla adag a következő körben."
function elagazasHozzaadasa(lista, feltetel = '', kovetkezmeny = '', fokusz = false) {
    const sor = document.createElement('div');
    sor.className = 'jsz-elagazas-sor';
    sor.innerHTML = `
        <input type="text" class="jsz-mezo jatek-kimenet-feltetel-input" maxlength="80" placeholder="${tr('condition_ph', 'Ha… (pl. Ha nem iszik?)')}" aria-label="${tr('condition', 'Feltétel')}">
        <span class="jsz-elagazas-nyil" aria-hidden="true">→</span>
        <input type="text" class="jsz-mezo jatek-kimenet-kovetkezmeny-input" maxlength="300" placeholder="${tr('consequence_ph', 'akkor… (pl. Dupla adag)')}" aria-label="${tr('consequence', 'Következmény')}">
        <button type="button" class="jsz-elagazas-torles" aria-label="${tr('branch_delete', 'Elágazás törlése')}">✕</button>
    `;
    sor.querySelector('.jatek-kimenet-feltetel-input').value = feltetel;
    sor.querySelector('.jatek-kimenet-kovetkezmeny-input').value = kovetkezmeny;
    sor.querySelector('.jsz-elagazas-torles').addEventListener('click', () => sor.remove());
    lista.appendChild(sor);
    if (fokusz) sor.querySelector('input').focus();
}

// Áthelyezés a ⋮⋮ fogóval: egérrel/ujjal húzva, vagy fókuszban a fel/le nyíllal
function fogoBekotese(sor) {
    const fogo = sor.querySelector('.jsz-fogo');
    const kontener = () => sor.parentElement;
    fogo.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' && sor.previousElementSibling) {
            kontener().insertBefore(sor, sor.previousElementSibling);
        } else if (e.key === 'ArrowDown' && sor.nextElementSibling) {
            kontener().insertBefore(sor.nextElementSibling, sor);
        } else return;
        e.preventDefault();
        szamozas();
        fogo.focus();
    });
    // a mozgatás az ablakra figyel (nem pointer capture-rel), mert a sor DOM-beli áthelyezése elengedné a capture-t
    fogo.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        sor.classList.add('huzott');
        const mozog = (ev) => {
            const tobbi = [...kontener().children].filter(m => m !== sor);
            const ala = tobbi.find(m => {
                const r = m.getBoundingClientRect();
                return ev.clientY < r.top + r.height / 2;
            });
            if (ala) { if (ala !== sor.nextElementSibling) kontener().insertBefore(sor, ala); }
            else if (sor !== kontener().lastElementChild) kontener().appendChild(sor);
        };
        const vege = () => {
            sor.classList.remove('huzott');
            window.removeEventListener('pointermove', mozog);
            window.removeEventListener('pointerup', vege);
            window.removeEventListener('pointercancel', vege);
            szamozas();
        };
        window.addEventListener('pointermove', mozog);
        window.addEventListener('pointerup', vege);
        window.addEventListener('pointercancel', vege);
    });
}

function leptetes(irany) {
    const mezo = $('jatek-min-jatekosok-input');
    const ertek = parseInt(mezo.value, 10) || (irany > 0 ? 1 : 2);
    mezo.value = Math.max(1, Math.min(99, ertek + irany));
}

function szerkesztoLepesekOsszegyujtese() {
    return Array.from(document.querySelectorAll('#jatek-lepesek-szerkeszto .jsz-szk')).map(sor => {
        const kimenetek = Array.from(sor.querySelectorAll('.jsz-elagazas-sor')).map(ks => ({
            feltetel: ks.querySelector('.jatek-kimenet-feltetel-input').value.trim(),
            kovetkezmeny: ks.querySelector('.jatek-kimenet-kovetkezmeny-input').value.trim(),
        })).filter(k => k.feltetel || k.kovetkezmeny);
        return {
            cim: sor.querySelector('.jatek-lepes-cim-input').value.trim() || null,
            szoveg: lepesSzovegEpit(sor.querySelector('.jatek-lepes-szoveg-input').value, kimenetek),
        };
    }).filter(l => l.szoveg.length > 0).map((l, idx) => ({ sorrend: idx, ...l }));
}

let mentesFolyamatban = false;

async function jatekMentese() {
    if (mentesFolyamatban) return;
    const allapot = $('jatek-szerkeszto-allapot');
    const cim = $('jatek-cim-input').value.trim();
    if (cim.length < 2 || cim.length > 80) {
        allapot.textContent = tr('err_game_name_2_80', 'A játék neve 2–80 karakter legyen.');
        $('jatek-cim-input').focus();
        return;
    }

    const leiras = $('jatek-leiras-input').value.trim() || null;
    const minJatekosokRaw = $('jatek-min-jatekosok-input').value;
    const minJatekosok = minJatekosokRaw ? Math.max(1, Math.min(99, parseInt(minJatekosokRaw, 10) || 1)) : null;
    const eszkozok = $('jatek-eszkozok-input').value.trim() || null;
    const publikus = $('jatek-publikus-input').checked;
    const lepesek = szerkesztoLepesekOsszegyujtese();

    if (lepesek.length === 0) {
        allapot.textContent = tr('err_need_rule', 'Írj be legalább egy szabályt.');
        return;
    }

    const sajatGroup = getState().group;
    if (!sajatGroup) {
        allapot.textContent = tr('err_no_group_game', 'Nincs csoportod, így nem menthetsz játékot.');
        return;
    }

    allapot.textContent = tr('saving', 'Mentés...');
    mentesFolyamatban = true;
    try {
        // Egyetlen adatbázis-hívás (jatek_mentese): a játék és a lépései egy tranzakcióban mentődnek,
        // így hiba esetén nem maradhat lépések nélküli játék
        const { data: jatekId, error } = await client.rpc('jatek_mentese', {
            p_jatek_id: szerkesztettJatekId || null,
            p_cim: cim,
            p_leiras: leiras,
            p_min_jatekosok: minJatekosok,
            p_eszkozok: eszkozok,
            p_publikus: publikus,
            p_group_id: sajatGroup.id,
            p_csoport_nev: sajatGroup.group_name,
            p_lepesek: lepesek,
        });
        if (error) throw error;

        reszletek.delete(jatekId);
        await betoltesJatekok();
        // Meglévő játéknál a játékról jöttünk: vissza oda (így nem marad duplán az előzményben);
        // új játéknál a szerkesztő helyére a játék kerül, a "vissza" pedig a listára visz
        if (szerkesztettJatekId && history.state?.app) history.back();
        else ugras(`jatek=${encodeURIComponent(jatekId)}`, true);
    } catch (err) {
        console.error('Hiba a játék mentésekor:', err);
        allapot.textContent = tr('err_saving', 'Hiba történt a mentéskor!');
    } finally {
        mentesFolyamatban = false;
    }
}

async function jatekTorlese() {
    const jatek = aktivJatek;
    menuBezarasa();
    if (!confirm(tr('confirm_delete_game_x', 'Biztosan törlöd a "{name}" játékot? Ez nem vonható vissza.', { name: jatek.cim }))) return;

    const { error } = await client.from('jatek_szabalyok').delete().eq('id', jatek.id);
    if (error) {
        console.error('Hiba a törléskor:', error);
        alert(tr('err_deleting', 'Hiba történt a törlés során!'));
        return;
    }
    reszletek.delete(jatek.id);
    aktivJatek = null;
    await betoltesJatekok();
    ugras('', true);
}

// ---------- Javaslatok (más csoport kiegészítése) ----------

async function javaslatKuldese() {
    const jatek = aktivJatek;
    const cim = $('jatek-javaslat-cim-input').value.trim();
    const szoveg = $('jatek-javaslat-szoveg-input').value.trim();

    if (cim.length < 2 || cim.length > 80) { alert(tr('err_proposal_title', 'A javaslat címe 2–80 karakter legyen.')); return; }
    if (szoveg.length === 0) { alert(tr('err_proposal_text', 'Írd le a javaslatot.')); return; }

    const sajatGroup = getState().group;
    if (!sajatGroup) { alert(tr('err_no_group_proposal', 'Nincs csoportod, így nem küldhetsz javaslatot.')); return; }

    const { error } = await client.from('jatek_javaslatok').insert([{
        jatek_id: jatek.id,
        group_id: sajatGroup.id,
        csoport_nev: sajatGroup.group_name,
        cim, szoveg,
    }]);

    if (error) {
        console.error('Hiba a javaslat küldésekor:', error);
        alert(tr('err_proposal_send', 'Hiba történt a javaslat küldésekor.'));
        return;
    }

    $('jatek-javaslat-cim-input').value = '';
    $('jatek-javaslat-szoveg-input').value = '';
    await reszletFrissites(jatek);
}

async function javaslatElfogadasa(javaslatId) {
    try {
        await callRpc('jatek_javaslat_elfogadasa', { p_javaslat: javaslatId });
        await reszletFrissites(aktivJatek);
        await betoltesJatekok();
    } catch (err) {
        console.error('Hiba a javaslat elfogadásakor:', err);
        alert(tr('err_accept', 'Hiba történt az elfogadás során: {msg}', { msg: err.message || err }));
    }
}

async function reszletFrissites(jatek) {
    const { lepesek, javaslatok } = await reszletekBetoltese(jatek, true);
    if (aktivJatek?.id === jatek.id) kirajzolasJatek(jatek, lepesek, javaslatok);
}

// ---------- Indítás ----------

function esemenyekBekotese() {
    $('uj-jatek-gomb').addEventListener('click', () => ugras('uj'));
    $('jsz-vissza').addEventListener('click', vissza);

    $('jsz-kereso').addEventListener('input', (e) => { keresett = e.target.value; kirajzolasLista(); });
    document.querySelectorAll('.jsz-szegm-gomb').forEach(gomb => {
        gomb.addEventListener('click', () => {
            szuro = gomb.dataset.szuro;
            document.querySelectorAll('.jsz-szegm-gomb').forEach(g => g.setAttribute('aria-pressed', String(g === gomb)));
            kirajzolasLista();
        });
    });

    const indit = () => ugras(`jatszik=${encodeURIComponent(aktivJatek.id)}`);
    $('jsz-inditas').addEventListener('click', indit);
    $('jsz-inditas-gep').addEventListener('click', indit);
    $('jsz-kieg-gomb').addEventListener('click', () => kiegNyitas($('jsz-kieg-tartalom').hidden));
    $('jsz-menu-gomb').addEventListener('click', (e) => {
        e.stopPropagation();
        if ($('jsz-menu').hidden) menuNyitas(); else menuBezarasa(true);
    });
    document.addEventListener('click', (e) => { if (!$('jsz-menu-tarolo').contains(e.target)) menuBezarasa(); });
    $('jatek-szerkesztes-gomb').addEventListener('click', () => {
        menuBezarasa();
        ugras(`szerk=${encodeURIComponent(aktivJatek.id)}`);
    });
    $('jatek-torles-gomb').addEventListener('click', jatekTorlese);
    $('jatek-javaslat-kuldes-gomb').addEventListener('click', javaslatKuldese);

    $('szerk-megse-gomb').addEventListener('click', vissza);
    $('szerk-mentes-gomb').addEventListener('click', jatekMentese);
    $('szerk-mentes-also').addEventListener('click', jatekMentese);
    $('jatek-uj-lepes-gomb').addEventListener('click', () => szabalySorHozzaadasa());
    document.querySelectorAll('.jsz-lepteto-gomb').forEach(g => g.addEventListener('click', () => leptetes(Number(g.dataset.lep))));

    $('jm-bezar').addEventListener('click', vissza);
    $('jm-elozo').addEventListener('click', () => jmLep(-1));
    $('jm-elozo-nyil').addEventListener('click', () => jmLep(-1));
    $('jm-kov').addEventListener('click', () => jmLep(1));
    $('jm-kov-nyil').addEventListener('click', () => jmLep(1));
    huzasBekotese($('jm-lap').parentElement);

    document.addEventListener('keydown', (e) => {
        if (!$('jsz-jatekmod').hidden) {
            if (e.key === 'ArrowLeft') jmLep(-1);
            else if (e.key === 'ArrowRight') jmLep(1);
            else if (e.key === 'Escape') vissza();
            else if (e.key === 'Tab') {
                // a fókusz a játék módban marad
                const fokuszalhato = [...$('jsz-jatekmod').querySelectorAll('button:not([disabled])')].filter(b => b.offsetParent);
                const elso = fokuszalhato[0], utolso = fokuszalhato[fokuszalhato.length - 1];
                if (e.shiftKey && document.activeElement === elso) { e.preventDefault(); utolso.focus(); }
                else if (!e.shiftKey && document.activeElement === utolso) { e.preventDefault(); elso.focus(); }
            }
            return;
        }
        if (e.key === 'Escape' && !$('jsz-menu').hidden) menuBezarasa(true);
    });

    window.addEventListener('popstate', nezetFrissitese);
}

window.onload = async function () {
    await ready;
    esemenyekBekotese();
    nezetFrissitese();
    await betoltesJatekok(true);
};
