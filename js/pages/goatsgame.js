let jatekosok = []; 
let jatekosNevek = []; 
let osszPontok = [];
let jatekosSzinek = []; 

window.onload = async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    await initGoatsGame();
};

function aktualisGroupCode() {
    return window.goatsAuth?.getState()?.group?.group_code || localStorage.getItem('goats_group_code');
}

function aktualisTagok() {
    const allapot = window.goatsAuth?.getState();
    return (allapot?.members || []).map(m => ({ user_id: m.user_id, display_name: m.display_name }));
}

async function initGoatsGame() {
    const tagLista = aktualisTagok();
    jatekosok = tagLista;
    jatekosNevek = tagLista.map(m => m.display_name);

    osszPontok = new Array(jatekosNevek.length).fill(0);
    jatekosSzinek = jatekosNevek.map(() => '#4CAF50');

    await betoltesSupabasebol();
    renderTabellaHeaders();
}

async function betoltesSupabasebol() {
    const groupCode = aktualisGroupCode();
    if (!groupCode || typeof _supabase === 'undefined') return;

    try {
        // 1. Játékosok színeinek lekérése
        const { data: szinData, error: szinErr } = await _supabase
            .from('goatgame_player_colors')
            .select('player_name, szin')
            .eq('group_code', groupCode);

        if (szinErr) console.error('Színek betöltési hiba:', szinErr);

        if (szinData && szinData.length > 0) {
            szinData.forEach(row => {
                const idx = jatekosNevek.indexOf(row.player_name);
                if (idx !== -1) {
                    jatekosSzinek[idx] = row.szin;
                }
            });
        }

        // 2. Felvett játékok lekérése (pontos táblanévvel)
        const { data: jatekokData, error: jatErr } = await _supabase
            .from('goatgame_jatekok')
            .select('*')
            .eq('group_code', groupCode)
            .order('created_at', { ascending: true });

        if (jatErr) console.error('Játékok betöltési hiba:', jatErr);

        // 3. Lejátszott meccsek (pontok) lekérése
        const { data: meccsData, error: meccsErr } = await _supabase
            .from('goatgame_meccsek')
            .select('*')
            .eq('group_code', groupCode)
            .order('created_at', { ascending: true });

        if (meccsErr) console.error('Meccsek betöltési hiba:', meccsErr);

        const jatekLista = document.getElementById('jatekLista');
        const kontener = document.getElementById('pontJatekOszlopok');
        if (jatekLista) jatekLista.innerHTML = '';
        if (kontener) kontener.innerHTML = '';

        const lejatszottMeccsekMap = {};
        if (meccsData && meccsData.length > 0) {
            meccsData.forEach(row => {
                if (!lejatszottMeccsekMap[row.id]) {
                    lejatszottMeccsekMap[row.id] = {
                        id: row.id,
                        jatekNev: row.jatek_nev,
                        szin: row.szin,
                        pontokMap: {}
                    };
                }
                lejatszottMeccsekMap[row.id].pontokMap[row.jatekos_nev] = row.pont;
            });
        }

        if (jatekokData && jatekokData.length > 0) {
            jatekokData.forEach(jatek => {
                const meccsObj = Object.values(lejatszottMeccsekMap).find(m => m.jatekNev === jatek.jatek_nev);
                
                if (meccsObj) {
                    const pontokTombja = jatekosNevek.map(nev => meccsObj.pontokMap[nev] ?? 0);
                    renderOszlop(meccsObj.jatekNev, meccsObj.szin, pontokTombja, null, null, meccsObj.id);
                    frissitOsszpontszamot(pontokTombja, 'hozzaadas');
                    renderJatekKartyaLetrehozas(jatek.jatek_nev, jatek.szin, jatek.id, true);
                } else {
                    renderJatekKartyaLetrehozas(jatek.jatek_nev, jatek.szin, jatek.id, false);
                }
            });
        }
    } catch (err) {
        console.error('Hiba a Supabase betöltés során:', err);
    }
}

async function mentJatekosSzinetSupabase(playerName, ujSzin) {
    const groupCode = aktualisGroupCode();
    if (!groupCode || typeof _supabase === 'undefined') return;

    const { error } = await _supabase
        .from('goatgame_player_colors')
        .upsert({
            group_code: groupCode,
            player_name: playerName,
            szin: ujSzin
        }, { onConflict: 'group_code,player_name' });

    if (error) console.error('Hiba a szín mentésekor:', error);
}

function renderTabellaHeaders() {
    const nevekContainer = document.getElementById('nevekOszlop');
    const osszContainer = document.getElementById('osszOszlop');

    if (nevekContainer) {
        nevekContainer.innerHTML = '<div class="fejlec">Név</div>';
        jatekosNevek.forEach((nev, index) => {
            const div = document.createElement('div');
            div.className = 'nev-sor';
            
            const nevSpan = document.createElement('span');
            nevSpan.textContent = nev;

            const szinPicker = document.createElement('input');
            szinPicker.type = 'color';
            szinPicker.className = 'nev-szin-picker';
            szinPicker.value = jatekosSzinek[index];

            szinPicker.addEventListener('change', (e) => {
                frissitJatekosSzinet(index, e.target.value);
            });

            div.append(nevSpan, szinPicker);
            div.style.backgroundColor = hexToRgba(jatekosSzinek[index], 0.75);
            nevekContainer.appendChild(div);
        });
    }

    if (osszContainer) {
        osszContainer.innerHTML = '<div class="fejlec">Összpont</div>';
        jatekosNevek.forEach((_, index) => {
            const div = document.createElement('div');
            div.className = 'pontOssz';
            div.textContent = osszPontok[index];
            div.style.backgroundColor = hexToRgba(jatekosSzinek[index], 0.75);
            osszContainer.appendChild(div);
        });
    }
}

function frissitJatekosSzinet(index, ujSzin) {
    jatekosSzinek[index] = ujSzin;
    const rgbaSzin = hexToRgba(ujSzin, 0.75);

    const nevekElemek = document.querySelectorAll('#nevekOszlop .nev-sor');
    if (nevekElemek[index]) nevekElemek[index].style.backgroundColor = rgbaSzin;

    const pontOsszElemek = document.querySelectorAll('#osszOszlop .pontOssz');
    if (pontOsszElemek[index]) pontOsszElemek[index].style.backgroundColor = rgbaSzin;

    mentJatekosSzinetSupabase(jatekosNevek[index], ujSzin);
}

function hexToRgba(hex, alpha = 0.75) {
    if (!hex) return `rgba(76, 175, 80, ${alpha})`;
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;

    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return `rgba(76, 175, 80, ${alpha})`;

    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function openUjJatekModal() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = false;
        document.getElementById('ujJatekNevInput').focus();
    }
}

function closeUjJatekModal() {
    const modal = document.getElementById('ujJatekModal');
    if (modal) {
        modal.hidden = true;
        document.getElementById('ujJatekNevInput').value = '';
    }
}

window.addEventListener('click', function (event) {
    const modal = document.getElementById('ujJatekModal');
    if (event.target === modal) {
        closeUjJatekModal();
    }
});

async function mentUjJatek() {
    const nevInput = document.getElementById('ujJatekNevInput');
    const szinInput = document.getElementById('ujJatekSzinInput');

    const jatekNev = nevInput.value.trim();
    const szin = szinInput.value;

    if (!jatekNev) {
        alert('Kérlek add meg a játék nevét!');
        return;
    }

    const jatekId = Date.now();
    const groupCode = aktualisGroupCode();

    if (groupCode && typeof _supabase !== 'undefined') {
        const { error } = await _supabase.from('goatgame_jatekok').insert({
            id: jatekId,
            group_code: groupCode,
            jatek_nev: jatekNev,
            szin: szin
        });

        if (error) {
            console.error('Hiba a játék mentésekor:', error);
            alert('Hiba történt a játék felvételekor: ' + error.message);
            return;
        }
    }

    renderJatekKartyaLetrehozas(jatekNev, szin, jatekId, false);
    closeUjJatekModal();
}

function renderJatekKartyaLetrehozas(jatekNev, szin, jatekId, lejatszottva) {
    const jatekLista = document.getElementById('jatekLista');
    if (!jatekLista) return;

    const jatekElem = document.createElement('div');
    jatekElem.className = 'jatek-elem';
    jatekElem.dataset.jatekId = jatekId;
    jatekElem.aktivOszlopok = [];

    const span = document.createElement('span');
    span.textContent = jatekNev.toUpperCase();

    const gombokKontener = document.createElement('div');
    gombokKontener.className = 'jatek-gombok';

    const pontGomb = document.createElement('button');
    pontGomb.className = 'teljesit-gomb';
    pontGomb.textContent = lejatszottva ? 'Kész ✓' : 'Kész';
    if (lejatszottva) pontGomb.disabled = true;

    pontGomb.addEventListener('click', function (e) {
        ujJatekHozzaadasa(jatekNev, szin, e.currentTarget, jatekElem);
    });

    const torlesGomb = document.createElement('span');
    torlesGomb.className = 'torles-gomb';
    torlesGomb.textContent = '🗑️';
    torlesGomb.addEventListener('click', async function () {
        if (confirm('Biztosan törölni szeretnéd ezt a játékot és a hozzá tartozó adatokat?')) {
            const groupCode = aktualisGroupCode();
            if (groupCode && typeof _supabase !== 'undefined') {
                await _supabase.from('goatgame_jatekok').delete().eq('id', jatekId);
            }

            [...jatekElem.aktivOszlopok].forEach(obj => {
                jatekTorlese(obj.oszlopElem, obj.pontok, pontGomb, jatekElem, obj.meccsId);
            });
            jatekElem.remove();
        }
    });

    gombokKontener.appendChild(pontGomb);
    gombokKontener.appendChild(torlesGomb);

    jatekElem.appendChild(span);
    jatekElem.appendChild(gombokKontener);

    jatekLista.appendChild(jatekElem);
}

async function ujJatekHozzaadasa(jatekNev, szin, gombElem, jatekElem) {
    if (jatekosNevek.length === 0) {
        alert('Nincsenek betöltve játékosok!');
        return;
    }

    let pontokTombja = [];

    for (let i = 0; i < jatekosNevek.length; i++) {
        let bekeres = prompt(`Hány pontot ért el ${jatekosNevek[i]} (${jatekNev})?`, "0");

        if (bekeres === null) {
            return;
        }

        let pont = Number(bekeres);
        if (isNaN(pont)) {
            pont = 0;
        }

        pontokTombja.push(pont);
    }

    const meccsId = Date.now();
    const groupCode = aktualisGroupCode();

    if (groupCode && typeof _supabase !== 'undefined') {
        const rowsToInsert = jatekosNevek.map((nev, index) => ({
            id: meccsId,
            group_code: groupCode,
            jatek_nev: jatekNev,
            szin: szin,
            jatekos_nev: nev,
            pont: pontokTombja[index]
        }));

        const { error } = await _supabase.from('goatgame_meccsek').insert(rowsToInsert);
        if (error) {
            console.error('Hiba a pontok mentésekor:', error);
            alert('Hiba történt a pontok mentése során: ' + error.message);
            return;
        }
    }

    renderOszlop(jatekNev, szin, pontokTombja, gombElem, jatekElem, meccsId);
    frissitOsszpontszamot(pontokTombja, 'hozzaadas');

    if (gombElem) {
        gombElem.disabled = true;
        gombElem.innerText = "Kész ✓";
    }
}

function renderOszlop(jatekNev, szin, pontokTombja, gombElem, jatekElem, meccsId) {
    const kontener = document.getElementById('pontJatekOszlopok');
    const ujOszlop = document.createElement('div');
    ujOszlop.className = 'tablazat szines-jatek-oszlop';
    ujOszlop.style.backgroundColor = hexToRgba(szin, 0.75);

    const fejlec = document.createElement('div');
    fejlec.className = 'fejlec';
    fejlec.title = jatekNev;

    const nevSpan = document.createElement('span');
    nevSpan.textContent = jatekNev;

    const torlesSpan = document.createElement('span');
    torlesSpan.className = 'torles-gomb';
    torlesSpan.title = 'Törlés';
    torlesSpan.textContent = '🗑️';

    fejlec.append(nevSpan, torlesSpan);
    ujOszlop.appendChild(fejlec);

    pontokTombja.forEach(p => {
        const sor = document.createElement('div');
        sor.textContent = String(p);
        ujOszlop.appendChild(sor);
    });

    if (jatekElem && jatekElem.aktivOszlopok) {
        jatekElem.aktivOszlopok.push({ oszlopElem: ujOszlop, pontok: pontokTombja, meccsId: meccsId });
    }

    const deleteBtn = ujOszlop.querySelector('.torles-gomb');
    deleteBtn.addEventListener('click', () => {
        jatekTorlese(ujOszlop, pontokTombja, gombElem, jatekElem, meccsId);
    });

    kontener.appendChild(ujOszlop);
}

async function jatekTorlese(oszlopElem, pontokTombja, gombElem, jatekElem, meccsId) {
    const groupCode = aktualisGroupCode();
    if (groupCode && typeof _supabase !== 'undefined' && meccsId) {
        await _supabase.from('goatgame_meccsek').delete().eq('id', meccsId);
    }

    oszlopElem.remove();
    frissitOsszpontszamot(pontokTombja, 'kivonas');

    if (jatekElem && jatekElem.aktivOszlopok) {
        jatekElem.aktivOszlopok = jatekElem.aktivOszlopok.filter(item => item.oszlopElem !== oszlopElem);
    }

    if (gombElem) {
        gombElem.disabled = false;
        gombElem.innerText = "Kész";
    }
}

function frissitOsszpontszamot(pontokTombja, muvelet) {
    const pontOsszElemek = document.querySelectorAll('.pontOssz');

    for (let i = 0; i < jatekosNevek.length; i++) {
        if (muvelet === 'hozzaadas') {
            osszPontok[i] += pontokTombja[i];
        } else if (muvelet === 'kivonas') {
            osszPontok[i] -= pontokTombja[i];
        }

        if (pontOsszElemek[i]) {
            pontOsszElemek[i].innerText = osszPontok[i];
        }
    }
}