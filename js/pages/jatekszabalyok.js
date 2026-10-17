// Játékszabályok: saját csoport játékai + amit más csoportok publikusra állítottak.
// A láthatóságot teljesen az RLS dönti el (lásd jatek_szabalyok/jatek_lepesek/jatek_javaslatok
// policy-k) - a kliens csak megjeleníti, amit a szerver visszaad.
import { client } from '../supabase-client.js';
import { ready, getState, callRpc } from '../hitelesites.js';

let jatekok = [];
let aktivJatek = null;
let aktivLepesek = [];
let aktivJavaslatok = [];
let aktivLepesIndex = 0;
let lepesoLathato = false; // a "Szabályok megtekintése" gombra kattintva válik true-vá, játékonként resetelve
let szerkesztettJatekId = null;

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sajatJatekE(jatek) {
    return !!jatek && jatek.group_id === getState().group?.id;
}

// ---------- Lista ----------

async function betoltesJatekok() {
    const { data, error } = await client
        .from('jatek_szabalyok')
        .select('*')
        .order('letrehozva', { ascending: false });

    if (error) {
        console.error('Hiba a játékok betöltésekor:', error);
        return;
    }

    jatekok = data || [];
    kirajzolasLista();
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
                    <span class="jatek-kartya-csoport">${sajat ? 'Saját csoport' : `Megosztotta: ${esc(jatek.csoport_nev || 'másik csoport')}`}</span>
                </div>
                ${jatek.publikus ? '<span class="jatek-badge jatek-badge-publikus">Publikus</span>' : ''}
            </div>
            ${jatek.leiras ? `<p class="jatek-kartya-leiras">${esc(jatek.leiras)}</p>` : ''}
            ${jatek.min_jatekosok ? `<div class="jatek-kartya-meta"><span>👥 min. ${jatek.min_jatekosok} fő</span></div>` : ''}
        `;
        kartya.addEventListener('click', () => megnyitasReszletek(jatek));
        lista.appendChild(kartya);
    });
}

// ---------- Részletek ----------

async function megnyitasReszletek(jatek) {
    aktivJatek = jatek;
    aktivLepesIndex = 0;
    lepesoLathato = false;

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
        ${jatek.publikus ? '<span class="jatek-badge jatek-badge-publikus">Publikus</span>' : '<span class="jatek-badge">Csak a csoportnak</span>'}
        <span class="jatek-badge jatek-badge-csoport">${sajat ? 'Saját csoport' : `Megosztotta: ${esc(jatek.csoport_nev || 'másik csoport')}`}</span>
    `;

    const infok = document.getElementById('jatek-reszletek-infok');
    infok.innerHTML = '';
    if (jatek.min_jatekosok) infok.insertAdjacentHTML('beforeend', `<span>👥 min. ${jatek.min_jatekosok} fő</span>`);
    if (jatek.eszkozok) infok.insertAdjacentHTML('beforeend', `<span>🧰 ${esc(jatek.eszkozok)}</span>`);

    document.getElementById('jatek-sajat-muveletek').hidden = !sajat;
    kirajzolasLepeso();

    const javaslatLista = document.getElementById('jatek-javaslatok-lista');
    javaslatLista.innerHTML = aktivJavaslatok.map(j => `
        <div class="jatek-javaslat ${j.elfogadva ? 'jatek-javaslat-elfogadva' : ''}">
            <div class="jatek-javaslat-fejlec">
                <strong>${esc(j.cim)}</strong>
                <span class="jatek-javaslat-csoport">${esc(j.csoport_nev || 'ismeretlen csoport')}</span>
            </div>
            <p>${esc(j.szoveg)}</p>
            ${j.elfogadva
            ? '<span class="jatek-badge jatek-badge-publikus">✓ Elfogadva</span>'
            : (sajat ? `<button type="button" class="jatek-javaslat-elfogad-gomb" data-id="${j.id}">Elfogadás</button>` : '<span class="jatek-badge">Döntésre vár</span>')}
        </div>
    `).join('') || '<p class="jatek-ures-reszletek">Még nincs beküldött javaslat.</p>';

    javaslatLista.querySelectorAll('.jatek-javaslat-elfogad-gomb').forEach(btn => {
        btn.addEventListener('click', () => javaslatElfogadasa(btn.dataset.id));
    });

    document.getElementById('jatek-uj-javaslat-resz').hidden = sajat;
    document.getElementById('jatek-javaslat-cim-input').value = '';
    document.getElementById('jatek-javaslat-szoveg-input').value = '';
}

// A "-"-tal kezdődő sorokat (pl. kimenetek: "-Tévedtél: iszol.") valódi listává alakítja,
// az ez előtti sima sorokat (a felvezető kérdés/leírás) bekezdésként hagyja.
function lepesSzovegHTML(szoveg) {
    const sorok = String(szoveg || '').split('\n').map(s => s.trim()).filter(Boolean);
    const bekezdes = [];
    const lista = [];
    sorok.forEach(sor => {
        if (sor.startsWith('-')) lista.push(sor.slice(1).trim());
        else bekezdes.push(sor);
    });

    let html = '';
    if (bekezdes.length) html += `<p>${bekezdes.map(esc).join('<br>')}</p>`;
    if (lista.length) html += `<ul class="jatek-lepes-lista">${lista.map(kimenetHTML).join('')}</ul>`;
    return html || `<p>${esc(szoveg)}</p>`;
}

// Egy kimenet-sor: ha van benne kérdőjel, a kérdés-rész ("Helyes?") kiemelt címkeként jelenik meg,
// a többi (a következmény, pl. "Szuper.") sima szövegként - ha nincs "?", az egész sima marad.
function kimenetHTML(sor) {
    const i = sor.indexOf('?');
    if (i === -1) return `<li>${esc(sor)}</li>`;
    const cimke = sor.slice(0, i + 1);
    const tobbi = sor.slice(i + 1).trim();
    return `<li><span class="jatek-kimenet-cimke">${esc(cimke)}</span>${tobbi ? ` ${esc(tobbi)}` : ''}</li>`;
}

// A szabály-szakaszok egyesével, léptetővel (nem egy hosszú, görgetendő lista)
function kirajzolasLepeso() {
    const kontener = document.getElementById('jatek-lepeso');
    const ures = document.getElementById('jatek-lepesek-ures');
    const gomb = document.getElementById('jatek-szabalyok-mutat-gomb');

    if (aktivLepesek.length === 0) {
        kontener.hidden = true;
        gomb.hidden = true;
        ures.hidden = false;
        return;
    }
    ures.hidden = true;

    if (!lepesoLathato) {
        kontener.hidden = true;
        gomb.hidden = false;
        gomb.textContent = `📜 Szabályok megtekintése (${aktivLepesek.length})`;
        return;
    }
    gomb.hidden = true;
    kontener.hidden = false;

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
        <button type="button" class="jatek-lepeso-pont${i === aktivLepesIndex ? ' aktiv' : ''}" data-i="${i}" aria-label="Ugrás a(z) ${i + 1}. szakaszra"></button>
    `).join('');
    pontok.querySelectorAll('.jatek-lepeso-pont').forEach(p => {
        p.addEventListener('click', () => { aktivLepesIndex = Number(p.dataset.i); kirajzolasLepeso(); });
    });

    document.getElementById('jatek-lepeso-vissza').disabled = aktivLepesIndex === 0;
    document.getElementById('jatek-lepeso-elore').disabled = aktivLepesIndex === aktivLepesek.length - 1;
}

function szabalyokMegnyitasa() {
    lepesoLathato = true;
    kirajzolasLepeso();
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
    const sor = document.createElement('div');
    sor.className = 'jatek-lepes-szerkeszto-sor';
    sor.innerHTML = `
        <input type="text" class="floating-input jatek-lepes-cim-input" maxlength="80" placeholder="Szakasz címe (opcionális)">
        <textarea class="floating-input jatek-lepes-szoveg-input" maxlength="2000" rows="2" placeholder="Szöveg"></textarea>
        <button type="button" class="jatek-lepes-torles-gomb" aria-label="Szakasz törlése">🗑️</button>
    `;
    sor.querySelector('.jatek-lepes-cim-input').value = cim;
    sor.querySelector('.jatek-lepes-szoveg-input').value = szoveg;
    sor.querySelector('.jatek-lepes-torles-gomb').addEventListener('click', () => sor.remove());
    kontener.appendChild(sor);
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
    document.getElementById('jatek-szerkeszto-cim').textContent = 'Új játék';
    ujLepesSorHozzaadasa();
    document.getElementById('jatek-szerkeszto-modal').hidden = false;
}

function szerkesztesModalMegnyitasa() {
    const jatek = aktivJatek;
    szerkesztettJatekId = jatek.id;
    szerkesztoUrlapUrites();
    document.getElementById('jatek-szerkeszto-cim').textContent = 'Játék szerkesztése';
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
    return Array.from(document.querySelectorAll('.jatek-lepes-szerkeszto-sor')).map((sor, idx) => ({
        sorrend: idx,
        cim: sor.querySelector('.jatek-lepes-cim-input').value.trim() || null,
        szoveg: sor.querySelector('.jatek-lepes-szoveg-input').value.trim(),
    })).filter(l => l.szoveg.length > 0);
}

async function jatekMentese() {
    const allapot = document.getElementById('jatek-szerkeszto-allapot');
    const cim = document.getElementById('jatek-cim-input').value.trim();
    if (cim.length < 2 || cim.length > 80) {
        allapot.textContent = 'A játék neve 2–80 karakter legyen.';
        return;
    }

    const leiras = document.getElementById('jatek-leiras-input').value.trim() || null;
    const minJatekosokRaw = document.getElementById('jatek-min-jatekosok-input').value;
    const minJatekosok = minJatekosokRaw ? parseInt(minJatekosokRaw, 10) : null;
    const eszkozok = document.getElementById('jatek-eszkozok-input').value.trim() || null;
    const publikus = document.getElementById('jatek-publikus-input').checked;
    const lepesek = szerkesztoLepesekOsszegyujtese();

    if (lepesek.length === 0) {
        allapot.textContent = 'Adj hozzá legalább egy szabály-szakaszt.';
        return;
    }

    const sajatGroup = getState().group;
    if (!sajatGroup) {
        allapot.textContent = 'Nincs csoportod, így nem menthetsz játékot.';
        return;
    }

    allapot.textContent = 'Mentés...';

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
        allapot.textContent = 'Hiba történt a mentés során.';
    }
}

async function jatekTorlese() {
    const jatek = aktivJatek;
    if (!confirm(`Biztosan törlöd a "${jatek.cim}" játékot? Ez nem vonható vissza.`)) return;

    const { error } = await client.from('jatek_szabalyok').delete().eq('id', jatek.id);
    if (error) {
        console.error('Hiba a törléskor:', error);
        alert('Hiba történt a törlés során.');
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

    if (cim.length < 2 || cim.length > 80) { alert('A javaslat címe 2–80 karakter legyen.'); return; }
    if (szoveg.length === 0) { alert('Írd le a javaslatot.'); return; }

    const sajatGroup = getState().group;
    if (!sajatGroup) { alert('Nincs csoportod, így nem küldhetsz javaslatot.'); return; }

    const { error } = await client.from('jatek_javaslatok').insert([{
        jatek_id: jatek.id,
        group_id: sajatGroup.id,
        csoport_nev: sajatGroup.group_name,
        cim, szoveg,
    }]);

    if (error) {
        console.error('Hiba a javaslat küldésekor:', error);
        alert('Hiba történt a javaslat küldésekor.');
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
        alert('Hiba történt az elfogadás során: ' + (err.message || err));
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
    document.getElementById('jatek-lepeso-vissza').addEventListener('click', lepesoVissza);
    document.getElementById('jatek-lepeso-elore').addEventListener('click', lepesoElore);
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('jatek-reszletek-modal').hidden) return;
        if (e.key === 'ArrowLeft') lepesoVissza();
        else if (e.key === 'ArrowRight') lepesoElore();
    });
}

window.onload = async function () {
    await ready;
    esemenyekBekotese();
    await betoltesJatekok();
};
