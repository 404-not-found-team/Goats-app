// Játékszabályok: saját csoport játékai + amit más csoportok publikusra állítottak.
// A láthatóságot teljesen az RLS dönti el (lásd jatek_szabalyok/jatek_lepesek/jatek_javaslatok
// policy-k) - a kliens csak megjeleníti, amit a szerver visszaad.
import { client } from '../supabase-client.js';
import { ready, getState, callRpc } from '../hitelesites.js';
import { betolt } from '../segedek/adat-gyorsitotar.js';

let jatekok = [];
let aktivJatek = null;
let aktivLepesek = [];
let aktivJavaslatok = [];
let aktivLepesIndex = 0;
let szerkesztettJatekId = null;

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sajatJatekE(jatek) {
    return !!jatek && jatek.group_id === getState().group?.id;
}

// ---------- Lista ----------

// Oldalbetöltéskor (elsoBetoltes) előbb az utoljára látott lista jelenik meg azonnal, a friss a háttérben
// érkezik (js/segedek/adat-gyorsitotar.js); módosítás utáni újratöltésnél csak a friss
async function betoltesJatekok(elsoBetoltes = false) {
    const lekero = async () => {
        const { data, error } = await client
            .from('jatek_szabalyok')
            .select('*')
            .order('letrehozva', { ascending: false });
        if (error) {
            console.error('Hiba a játékok betöltésekor:', error);
            return undefined;
        }
        return data || [];
    };
    await betolt('jatekszabalyok', lekero, (adat) => {
        jatekok = adat;
        kirajzolasLista();
    }, { taroltElobb: elsoBetoltes });
}

function kirajzolasLista() {
    const lista = document.getElementById('jatek-lista');
    const ures = document.getElementById('jatek-ures-allapot');
    lista.innerHTML = '';
    ures.hidden = jatekok.length > 0;

    jatekok.forEach(jatek => {
        const sajat = sajatJatekE(jatek);
        const kartya = document.createElement('div');
        kartya.className = 'jatek-kartya';
        kartya.innerHTML = `
            <div class="jatek-kartya-fejlec">
                <span class="jatek-kartya-ikon">🎲</span>
                <div class="jatek-kartya-fejlec-szoveg">
                    <span class="jatek-kartya-cim">${esc(jatek.cim)}</span>
                    <span class="jatek-kartya-csoport">${sajat ? tr('own_group', 'Saját csoport') : tr('shared_by', 'Megosztotta: {group}', { group: esc(jatek.csoport_nev || tr('other_group', 'másik csoport')) })}</span>
                </div>
                ${jatek.publikus ? `<span class="jatek-badge jatek-badge-publikus">${tr('public', 'Publikus')}</span>` : ''}
            </div>
            ${jatek.leiras ? `<p class="jatek-kartya-leiras">${esc(jatek.leiras)}</p>` : ''}
            ${jatek.min_jatekosok ? `<div class="jatek-kartya-meta"><span>👥 ${tr('min_players_n', 'min. {n} fő', { n: jatek.min_jatekosok })}</span></div>` : ''}
        `;
        kartya.addEventListener('click', () => megnyitasReszletek(jatek));
        lista.appendChild(kartya);
    });
}

// ---------- Részletek ----------

async function megnyitasReszletek(jatek) {
    aktivJatek = jatek;
    aktivLepesIndex = 0;

    const [lepesekRes, javaslatokRes] = await Promise.all([
        client.from('jatek_lepesek').select('*').eq('jatek_id', jatek.id).order('sorrend', { ascending: true }),
        client.from('jatek_javaslatok').select('*').eq('jatek_id', jatek.id).order('letrehozva', { ascending: true }),
    ]);

    if (lepesekRes.error) console.error('Hiba a lépések betöltésekor:', lepesekRes.error);
    if (javaslatokRes.error) console.error('Hiba a javaslatok betöltésekor:', javaslatokRes.error);

    aktivLepesek = lepesekRes.data || [];
    aktivJavaslatok = javaslatokRes.data || [];

    kirajzolasReszletek();
    document.getElementById('jatek-reszletek-modal').hidden = false;
}

function kirajzolasReszletek() {
    const jatek = aktivJatek;
    const sajat = sajatJatekE(jatek);

    document.getElementById('jatek-reszletek-cim').textContent = `🎲 ${jatek.cim}`;

    const leirasEl = document.getElementById('jatek-reszletek-leiras');
    leirasEl.textContent = jatek.leiras || '';
    leirasEl.hidden = !jatek.leiras;

    document.getElementById('jatek-reszletek-badge-sor').innerHTML = `
        ${jatek.publikus ? `<span class="jatek-badge jatek-badge-publikus">${tr('public', 'Publikus')}</span>` : `<span class="jatek-badge">${tr('group_only', 'Csak a csoportnak')}</span>`}
        <span class="jatek-badge jatek-badge-csoport">${sajat ? tr('own_group', 'Saját csoport') : tr('shared_by', 'Megosztotta: {group}', { group: esc(jatek.csoport_nev || tr('other_group', 'másik csoport')) })}</span>
    `;

    const infok = document.getElementById('jatek-reszletek-infok');
    infok.innerHTML = '';
    if (jatek.min_jatekosok) infok.insertAdjacentHTML('beforeend', `<span>👥 ${tr('min_players_n', 'min. {n} fő', { n: jatek.min_jatekosok })}</span>`);
    if (jatek.eszkozok) infok.insertAdjacentHTML('beforeend', `<span>🧰 ${esc(jatek.eszkozok)}</span>`);

    document.getElementById('jatek-sajat-muveletek').hidden = !sajat;

    const vanLepes = aktivLepesek.length > 0;
    document.getElementById('jatek-lepesek-ures').hidden = vanLepes;
    const szabalyokGomb = document.getElementById('jatek-szabalyok-mutat-gomb');
    szabalyokGomb.hidden = !vanLepes;
    if (vanLepes) szabalyokGomb.textContent = `📜 ${tr('view_rules_n', 'Szabályok megtekintése ({n})', { n: aktivLepesek.length })}`;

    const javaslatLista = document.getElementById('jatek-javaslatok-lista');
    javaslatLista.innerHTML = aktivJavaslatok.map(j => `
        <div class="jatek-javaslat ${j.elfogadva ? 'jatek-javaslat-elfogadva' : ''}">
            <div class="jatek-javaslat-fejlec">
                <strong>${esc(j.cim)}</strong>
                <span class="jatek-javaslat-csoport">${esc(j.csoport_nev || tr('unknown_group', 'ismeretlen csoport'))}</span>
            </div>
            <p>${esc(j.szoveg)}</p>
            ${j.elfogadva
            ? `<span class="jatek-badge jatek-badge-publikus">✓ ${tr('accepted', 'Elfogadva')}</span>`
            : (sajat ? `<button type="button" class="jatek-javaslat-elfogad-gomb" data-id="${j.id}">${tr('accept', 'Elfogadás')}</button>` : `<span class="jatek-badge">${tr('awaiting_decision', 'Döntésre vár')}</span>`)}
        </div>
    `).join('') || `<p class="jatek-ures-reszletek">${tr('no_proposals_yet', 'Még nincs beküldött javaslat.')}</p>`;

    javaslatLista.querySelectorAll('.jatek-javaslat-elfogad-gomb').forEach(btn => {
        btn.addEventListener('click', () => javaslatElfogadasa(btn.dataset.id));
    });

    document.getElementById('jatek-uj-javaslat-resz').hidden = sajat;
    document.getElementById('jatek-javaslat-cim-input').value = '';
    document.getElementById('jatek-javaslat-szoveg-input').value = '';
}

// Egy lépés szövegét (a tárolt sortördelt formátumot) értelmezi: a "-"-tal kezdődő sorok
// kimenetek (feltétel+következmény, "?" választja el őket), a többi a felvezető szöveg.
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
    if (kimenetek.length) {
        html += `<ul class="jatek-lepes-lista">${kimenetek.map(({ feltetel, kovetkezmeny }) => {
            const cimke = feltetel ? `<span class="jatek-kimenet-cimke">${esc(feltetel)}</span>` : '';
            return `<li>${cimke}${kovetkezmeny ? ` ${esc(kovetkezmeny)}` : ''}</li>`;
        }).join('')}</ul>`;
    }
    return html || `<p>${esc(szoveg)}</p>`;
}

// A szabály-szakaszok egyesével, léptetővel (nem egy hosszú, görgetendő lista) - a külön
// "Szabályok" modalban (#jatek-szabalyok-modal), csak amíg az nyitva van.
function kirajzolasLepeso() {
    if (aktivLepesek.length === 0) return;

    if (aktivLepesIndex > aktivLepesek.length - 1) aktivLepesIndex = aktivLepesek.length - 1;
    if (aktivLepesIndex < 0) aktivLepesIndex = 0;

    const lepes = aktivLepesek[aktivLepesIndex];
    document.getElementById('jatek-lepeso-szamlalo').textContent = `${aktivLepesIndex + 1} / ${aktivLepesek.length}`;
    document.getElementById('jatek-lepeso-kartya').innerHTML = `
        <div class="jatek-lepes-tartalom">
            ${lepes.cim ? `<h5>${esc(lepes.cim)}</h5>` : ''}
            ${lepesSzovegHTML(lepes.szoveg)}
        </div>
    `;

    const pontok = document.getElementById('jatek-lepeso-pontok');
    pontok.innerHTML = aktivLepesek.map((_, i) => `
        <button type="button" class="jatek-lepeso-pont${i === aktivLepesIndex ? ' aktiv' : ''}" data-i="${i}" aria-label="${tr('go_to_section', 'Ugrás a(z) {n}. szakaszra', { n: i + 1 })}"></button>
    `).join('');
    pontok.querySelectorAll('.jatek-lepeso-pont').forEach(p => {
        p.addEventListener('click', () => { aktivLepesIndex = Number(p.dataset.i); kirajzolasLepeso(); });
    });

    document.getElementById('jatek-lepeso-vissza').disabled = aktivLepesIndex === 0;
    document.getElementById('jatek-lepeso-elore').disabled = aktivLepesIndex === aktivLepesek.length - 1;
}

function szabalyokMegnyitasa() {
    document.getElementById('jatek-szabalyok-modal-cim').textContent = aktivJatek ? `📜 ${aktivJatek.cim}` : tr('rules', 'Szabályok');
    aktivLepesIndex = 0;
    kirajzolasLepeso();
    document.getElementById('jatek-reszletek-modal').hidden = true;
    document.getElementById('jatek-szabalyok-modal').hidden = false;
}

function szabalyokBezarasa() {
    document.getElementById('jatek-szabalyok-modal').hidden = true;
    document.getElementById('jatek-reszletek-modal').hidden = false;
}

function lepesoVissza() {
    if (aktivLepesIndex <= 0) return;
    aktivLepesIndex--;
    kirajzolasLepeso();
}

function lepesoElore() {
    if (aktivLepesIndex >= aktivLepesek.length - 1) return;
    aktivLepesIndex++;
    kirajzolasLepeso();
}

// ---------- Szerkesztő (új / saját játék módosítása) ----------

function ujLepesSorHozzaadasa(cim = '', szoveg = '') {
    const kontener = document.getElementById('jatek-lepesek-szerkeszto');
    const { bekezdes, kimenetek } = lepesSzovegFelbont(szoveg);

    const sor = document.createElement('div');
    sor.className = 'jatek-lepes-szerkeszto-sor';
    sor.innerHTML = `
        <div class="jatek-lepes-szerkeszto-fejlec">
            <input type="text" class="floating-input jatek-lepes-cim-input" maxlength="80" placeholder="${tr('section_title_optional', 'Szakasz címe (opcionális)')}">
            <div class="jatek-lepes-szerkeszto-gombok">
                <button type="button" class="jatek-lepes-mozgat-gomb" data-irany="fel" aria-label="${tr('section_up', 'Szakasz feljebb')}">▲</button>
                <button type="button" class="jatek-lepes-mozgat-gomb" data-irany="le" aria-label="${tr('section_down', 'Szakasz lejjebb')}">▼</button>
                <button type="button" class="jatek-lepes-torles-gomb" aria-label="${tr('section_delete', 'Szakasz törlése')}">🗑️</button>
            </div>
        </div>
        <textarea class="floating-input jatek-lepes-szoveg-input" maxlength="2000" rows="2" placeholder="${tr('section_text_ph', 'Szöveg / felvezető kérdés')}"></textarea>
        <div class="jatek-lepes-kimenetek">
            <div class="jatek-lepes-kimenetek-lista"></div>
            <button type="button" class="jatek-kimenet-uj-gomb">+ ${tr('add_outcome', 'Kimenet hozzáadása')}</button>
        </div>
    `;
    sor.querySelector('.jatek-lepes-cim-input').value = cim;
    sor.querySelector('.jatek-lepes-szoveg-input').value = bekezdes;

    const kimenetLista = sor.querySelector('.jatek-lepes-kimenetek-lista');
    kimenetek.forEach(k => kimenetSorHozzaadasa(kimenetLista, k.feltetel, k.kovetkezmeny));

    sor.querySelector('.jatek-kimenet-uj-gomb').addEventListener('click', () => kimenetSorHozzaadasa(kimenetLista));
    sor.querySelector('.jatek-lepes-torles-gomb').addEventListener('click', () => sor.remove());
    sor.querySelectorAll('.jatek-lepes-mozgat-gomb').forEach(btn => {
        btn.addEventListener('click', () => lepesMozgatasa(sor, btn.dataset.irany));
    });
    kontener.appendChild(sor);
}

// Egy kimenet (feltétel + következmény) szerkesztő-sora, pl. "Helyes?" / "Szuper."
function kimenetSorHozzaadasa(lista, feltetel = '', kovetkezmeny = '') {
    const sor = document.createElement('div');
    sor.className = 'jatek-kimenet-szerkeszto-sor';
    sor.innerHTML = `
        <input type="text" class="jatek-kimenet-feltetel-input" maxlength="80" placeholder="${tr('condition_ph', 'Feltétel (pl. Helyes?)')}">
        <input type="text" class="jatek-kimenet-kovetkezmeny-input" maxlength="300" placeholder="${tr('consequence_ph', 'Következmény (pl. Szuper.)')}">
        <button type="button" class="jatek-kimenet-torles-gomb" aria-label="${tr('outcome_delete', 'Kimenet törlése')}">✕</button>
    `;
    sor.querySelector('.jatek-kimenet-feltetel-input').value = feltetel;
    sor.querySelector('.jatek-kimenet-kovetkezmeny-input').value = kovetkezmeny;
    sor.querySelector('.jatek-kimenet-torles-gomb').addEventListener('click', () => sor.remove());
    lista.appendChild(sor);
}

// Egy szakasz-sor feljebb/lejjebb mozgatása a testvérei között (a mentés a DOM-sorrendet olvassa)
function lepesMozgatasa(sor, irany) {
    if (irany === 'fel' && sor.previousElementSibling) {
        sor.parentElement.insertBefore(sor, sor.previousElementSibling);
    } else if (irany === 'le' && sor.nextElementSibling) {
        sor.parentElement.insertBefore(sor.nextElementSibling, sor);
    }
}

function szerkesztoUrlapUrites() {
    document.getElementById('jatek-cim-input').value = '';
    document.getElementById('jatek-leiras-input').value = '';
    document.getElementById('jatek-min-jatekosok-input').value = '';
    document.getElementById('jatek-eszkozok-input').value = '';
    document.getElementById('jatek-publikus-input').checked = false;
    document.getElementById('jatek-lepesek-szerkeszto').innerHTML = '';
    document.getElementById('jatek-szerkeszto-allapot').textContent = '';
}

function ujJatekModalMegnyitasa() {
    szerkesztettJatekId = null;
    szerkesztoUrlapUrites();
    document.getElementById('jatek-szerkeszto-cim').textContent = tr('new_game', 'Új játék');
    ujLepesSorHozzaadasa();
    document.getElementById('jatek-szerkeszto-modal').hidden = false;
}

function szerkesztesModalMegnyitasa() {
    const jatek = aktivJatek;
    szerkesztettJatekId = jatek.id;
    szerkesztoUrlapUrites();
    document.getElementById('jatek-szerkeszto-cim').textContent = tr('edit_game_title', 'Játék szerkesztése');
    document.getElementById('jatek-cim-input').value = jatek.cim || '';
    document.getElementById('jatek-leiras-input').value = jatek.leiras || '';
    document.getElementById('jatek-min-jatekosok-input').value = jatek.min_jatekosok || '';
    document.getElementById('jatek-eszkozok-input').value = jatek.eszkozok || '';
    document.getElementById('jatek-publikus-input').checked = !!jatek.publikus;

    (aktivLepesek.length ? aktivLepesek : [{}]).forEach(lepes => {
        ujLepesSorHozzaadasa(lepes.cim || '', lepes.szoveg || '');
    });

    document.getElementById('jatek-reszletek-modal').hidden = true;
    document.getElementById('jatek-szerkeszto-modal').hidden = false;
}

function szerkesztoLepesekOsszegyujtese() {
    return Array.from(document.querySelectorAll('.jatek-lepes-szerkeszto-sor')).map((sor, idx) => {
        const kimenetek = Array.from(sor.querySelectorAll('.jatek-kimenet-szerkeszto-sor')).map(ks => ({
            feltetel: ks.querySelector('.jatek-kimenet-feltetel-input').value.trim(),
            kovetkezmeny: ks.querySelector('.jatek-kimenet-kovetkezmeny-input').value.trim(),
        })).filter(k => k.feltetel || k.kovetkezmeny);
        return {
            sorrend: idx,
            cim: sor.querySelector('.jatek-lepes-cim-input').value.trim() || null,
            szoveg: lepesSzovegEpit(sor.querySelector('.jatek-lepes-szoveg-input').value, kimenetek),
        };
    }).filter(l => l.szoveg.length > 0);
}

async function jatekMentese() {
    const allapot = document.getElementById('jatek-szerkeszto-allapot');
    const cim = document.getElementById('jatek-cim-input').value.trim();
    if (cim.length < 2 || cim.length > 80) {
        allapot.textContent = tr('err_game_name_2_80', 'A játék neve 2–80 karakter legyen.');
        return;
    }

    const leiras = document.getElementById('jatek-leiras-input').value.trim() || null;
    const minJatekosokRaw = document.getElementById('jatek-min-jatekosok-input').value;
    const minJatekosok = minJatekosokRaw ? parseInt(minJatekosokRaw, 10) : null;
    const eszkozok = document.getElementById('jatek-eszkozok-input').value.trim() || null;
    const publikus = document.getElementById('jatek-publikus-input').checked;
    const lepesek = szerkesztoLepesekOsszegyujtese();

    if (lepesek.length === 0) {
        allapot.textContent = tr('err_need_section', 'Adj hozzá legalább egy szabály-szakaszt.');
        return;
    }

    const sajatGroup = getState().group;
    if (!sajatGroup) {
        allapot.textContent = tr('err_no_group_game', 'Nincs csoportod, így nem menthetsz játékot.');
        return;
    }

    allapot.textContent = tr('saving', 'Mentés...');

    try {
        let jatekId = szerkesztettJatekId;

        if (jatekId) {
            const { error } = await client.from('jatek_szabalyok').update({
                cim, leiras, min_jatekosok: minJatekosok, eszkozok, publikus,
            }).eq('id', jatekId);
            if (error) throw error;

            const { error: delError } = await client.from('jatek_lepesek').delete().eq('jatek_id', jatekId);
            if (delError) throw delError;
        } else {
            const { data, error } = await client.from('jatek_szabalyok').insert([{
                cim, leiras, min_jatekosok: minJatekosok, eszkozok, publikus,
                group_id: sajatGroup.id,
                csoport_nev: sajatGroup.group_name,
            }]).select().single();
            if (error) throw error;
            jatekId = data.id;
        }

        const { error: insError } = await client.from('jatek_lepesek').insert(
            lepesek.map(l => ({ ...l, jatek_id: jatekId }))
        );
        if (insError) throw insError;

        document.getElementById('jatek-szerkeszto-modal').hidden = true;
        await betoltesJatekok();
        const frissJatek = jatekok.find(j => j.id === jatekId);
        if (frissJatek) await megnyitasReszletek(frissJatek);
    } catch (err) {
        console.error('Hiba a játék mentésekor:', err);
        allapot.textContent = tr('err_saving', 'Hiba történt a mentéskor!');
    }
}

async function jatekTorlese() {
    const jatek = aktivJatek;
    if (!confirm(tr('confirm_delete_game_x', 'Biztosan törlöd a "{name}" játékot? Ez nem vonható vissza.', { name: jatek.cim }))) return;

    const { error } = await client.from('jatek_szabalyok').delete().eq('id', jatek.id);
    if (error) {
        console.error('Hiba a törléskor:', error);
        alert(tr('err_deleting', 'Hiba történt a törlés során!'));
        return;
    }

    document.getElementById('jatek-reszletek-modal').hidden = true;
    aktivJatek = null;
    await betoltesJatekok();
}

// ---------- Javaslatok (más csoport kiegészítése) ----------

async function javaslatKuldese() {
    const jatek = aktivJatek;
    const cim = document.getElementById('jatek-javaslat-cim-input').value.trim();
    const szoveg = document.getElementById('jatek-javaslat-szoveg-input').value.trim();

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

    await megnyitasReszletek(jatek);
}

async function javaslatElfogadasa(javaslatId) {
    try {
        await callRpc('jatek_javaslat_elfogadasa', { p_javaslat: javaslatId });
        await megnyitasReszletek(aktivJatek);
    } catch (err) {
        console.error('Hiba a javaslat elfogadásakor:', err);
        alert(tr('err_accept', 'Hiba történt az elfogadás során: {msg}', { msg: err.message || err }));
    }
}

// ---------- Indítás ----------

function esemenyekBekotese() {
    document.getElementById('uj-jatek-gomb').addEventListener('click', ujJatekModalMegnyitasa);
    document.getElementById('jatek-uj-lepes-gomb').addEventListener('click', () => ujLepesSorHozzaadasa());
    document.getElementById('jatek-mentes-gomb').addEventListener('click', jatekMentese);
    document.getElementById('jatek-szerkeszto-bezar').addEventListener('click', () => {
        document.getElementById('jatek-szerkeszto-modal').hidden = true;
    });

    document.getElementById('jatek-reszletek-bezar').addEventListener('click', () => {
        document.getElementById('jatek-reszletek-modal').hidden = true;
    });
    document.getElementById('jatek-szerkesztes-gomb').addEventListener('click', szerkesztesModalMegnyitasa);
    document.getElementById('jatek-torles-gomb').addEventListener('click', jatekTorlese);
    document.getElementById('jatek-javaslat-kuldes-gomb').addEventListener('click', javaslatKuldese);

    document.getElementById('jatek-szabalyok-mutat-gomb').addEventListener('click', szabalyokMegnyitasa);
    document.getElementById('jatek-szabalyok-bezar').addEventListener('click', szabalyokBezarasa);
    document.getElementById('jatek-lepeso-vissza').addEventListener('click', lepesoVissza);
    document.getElementById('jatek-lepeso-elore').addEventListener('click', lepesoElore);
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('jatek-szabalyok-modal').hidden) return;
        if (e.key === 'ArrowLeft') lepesoVissza();
        else if (e.key === 'ArrowRight') lepesoElore();
        else if (e.key === 'Escape') szabalyokBezarasa();
    });
}

window.onload = async function () {
    await ready;
    esemenyekBekotese();
    await betoltesJatekok(true);
};
