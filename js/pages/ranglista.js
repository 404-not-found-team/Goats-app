let aktivElemId = null;
let aktivItalAdat = null;
let aktualisMod = 'arany';
let kizartMarkakTomb = [];

async function inicializalas() {
    const groupCode = localStorage.getItem('goats_group_code');
    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;

    const { data: katalogus, error: katError } = await client
        .from('ital_katalogus')
        .select('*')
        .range(0, 999);

    if (katError) {
        console.error('Hiba a katalógus betöltésekor:', katError);
        return;
    }

    katalogus.forEach(ital => {
        addItalKartyaToUI(ital);
    });

    document.querySelectorAll('.forras-doboz').forEach(doboz => {
        const listaDiv = doboz.querySelector('.ital-lista');
        if (listaDiv) {
            const kezdodb = listaDiv.getElementsByClassName('ital-kartya').length;
            doboz.setAttribute('data-osszes', kezdodb);
        }
    });

    if (groupCode) {
        const { data: mentettAdatok, error: rangError } = await client
            .from('ital_ranglista')
            .select('*')
            .eq('group_code', groupCode);

        if (rangError) {
            console.error('Hiba a ranglista betöltésekor:', rangError);
        } else if (mentettAdatok) {
            mentettAdatok.forEach(item => {
                const kartyaElem = document.getElementById(item.id);

                if (kartyaElem) {
                    let celZona = null;

                    if (item.kategoria === 'forras') {
                        const eredetiKategoria = kartyaElem.dataset.kategoria;
                        celZona = getListaDivByKategoria(eredetiKategoria);
                    } else {
                        celZona = document.querySelector(`[data-kategoria="${item.kategoria}"] .tier-tartalom`) ||
                            document.querySelector(`[data-kategoria="${item.kategoria}"] .ranglista-dropzone`) ||
                            document.querySelector(`.ranglista-dropzone[data-kategoria="${item.kategoria}"]`) ||
                            document.querySelector(`[data-kategoria="${item.kategoria}"]`) ||
                            document.getElementById(`tier-${item.kategoria}`);
                    }

                    if (celZona) {
                        celZona.appendChild(kartyaElem);
                    }
                }
            });
        }
    }

    frissitsSzamlalokat();
}

async function kategoriatValaszt(kategoriaNev) {
    if (!aktivElemId) return;

    const groupCode = localStorage.getItem('goats_group_code');
    const kartyaElem = document.getElementById(aktivElemId);
    let celZona;

    if (kategoriaNev === 'forras') {
        const eredetiKategoria = kartyaElem.dataset.kategoria;
        celZona = getListaDivByKategoria(eredetiKategoria);
    } else {
        celZona = document.querySelector(`[data-kategoria="${kategoriaNev}"] .tier-tartalom`) ||
            document.querySelector(`[data-kategoria="${kategoriaNev}"] .ranglista-dropzone`) ||
            document.querySelector(`.ranglista-dropzone[data-kategoria="${kategoriaNev}"]`) ||
            document.querySelector(`[data-kategoria="${kategoriaNev}"]`) ||
            document.getElementById(`tier-${kategoriaNev}`);
    }

    if (kartyaElem && celZona) {
        celZona.appendChild(kartyaElem);

        if (groupCode) {
            const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
            const { error } = await client
                .from('ital_ranglista')
                .upsert({
                    id: aktivElemId,
                    kategoria: kategoriaNev,
                    group_code: groupCode
                });

            if (error) {
                console.error('Hiba a mentés során:', error);
            }
        }
    }

    frissitsSzamlalokat();
    modalBezár();
}

function modalBezár() {
    document.getElementById('modal-hatter').style.display = 'none';
    aktivElemId = null;
    aktivItalAdat = null;
}

function getListaDivByKategoria(kategoria) {
    const kat = kategoria ? kategoria.toLowerCase() : 'egyeb';
    switch (kat) {
        case 'vodka': return document.getElementById('vodkaLista');
        case 'rum': return document.getElementById('rumLista');
        case 'whiskey': return document.getElementById('whiskeyLista');
        case 'likor':
        case 'likőr': return document.getElementById('likorLista');
        case 'bitter': return document.getElementById('bitterLista');
        case 'sor':
        case 'sör': return document.getElementById('sorLista');
        case 'cider': return document.getElementById('ciderLista');
        case 'bor': return document.getElementById('borLista');
        case 'froccs':
        case 'fröccs': return document.getElementById('froccsLista');
        case 'energiaital': return document.getElementById('energiaitalLista');
        case 'koktel':
        case 'koktél': return document.getElementById('koktelLista');
        default: return document.getElementById('italLista');
    }
}

function frissitsSzamlalokat() {
    const kikapcsoltKategoriak = Array.from(document.querySelectorAll('.szuro-pill:not(.aktiv)'))
                                     .map(pill => pill.dataset.id.toLowerCase());

    const forrasDobozok = document.querySelectorAll('.forras-doboz');

    forrasDobozok.forEach(doboz => {
        const listaDiv = doboz.querySelector('.ital-lista');
        const szamlalo = doboz.querySelector('.ital-szamlalo');

        if (listaDiv) {
            const lathatoKartyak = Array.from(listaDiv.getElementsByClassName('ital-kartya'))
                                       .filter(k => k.style.display !== 'none');
            
            const jelenlegiDb = lathatoKartyak.length;
            const osszesDb = doboz.getAttribute('data-osszes') || listaDiv.getElementsByClassName('ital-kartya').length;

            if (szamlalo) {
                szamlalo.textContent = `${jelenlegiDb} / ${osszesDb}`;
            }

            const katId = listaDiv.id.replace('Lista', '').toLowerCase();
            const veglegesKatId = katId === 'ital' ? 'egyeb' : katId;

            if (kikapcsoltKategoriak.includes(veglegesKatId) || jelenlegiDb === 0) {
                doboz.style.display = 'none';
            } else {
                doboz.style.display = 'block';
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const kategoriak = [
        { kod: 'S', cls: 'legeslegjobb' },
        { kod: 'A', cls: 'legjobb' },
        { kod: 'B', cls: 'elmegy' },
        { kod: 'C', cls: 'soha' },
        { kod: 'D', cls: 'megjobbansoha' }
    ];

    const italKategoriak = [
        { nev: 'Vodkák', id: 'vodka' },
        { nev: 'Rumok', id: 'rum' },
        { nev: 'Whiskeyk', id: 'whiskey' },
        { nev: 'Likőrök', id: 'likor' },
        { nev: 'Bitterek', id: 'bitter' },
        { nev: 'Ciderek', id: 'cider' },
        { nev: 'Sörök', id: 'sor' },
        { nev: 'Borok', id: 'bor' },
        { nev: 'Fröccsök', id: 'froccs' },
        { nev: 'Energiaitalok', id: 'energiaital' },
        { nev: 'Koktélok', id: 'koktel' },
        { nev: 'Egyéb', id: 'egyeb' }
    ];

    const katKontener = document.getElementById('kategoriak-kontener');
    if (katKontener) {
        katKontener.innerHTML = kategoriak.map(k => `
            <div class="kategoria-kontener">
                <h3 class="cimke ${k.cls} dark">${k.kod}</h3>
                <div class="ranglista-dropzone" data-kategoria="${k.kod}"></div>
            </div>
        `).join('');
    }

    const forrasKontener = document.getElementById('forras-dobozok-kontener');
    if (forrasKontener) {
        forrasKontener.innerHTML = italKategoriak.map(k => `
            <div class="forras-doboz csukva">
                <div class="forras-fejlec" onclick="toggleForrasDoboz(this)">
                    <h3>${k.nev} <span class="nyil-ikon">▼</span></h3>
                    <span class="ital-szamlalo" id="szamlalo-${k.id}">0 / 0</span>
                </div>
                <div class="ital-lista" id="${k.id === 'egyeb' ? 'italLista' : k.id + 'Lista'}"></div>
            </div>
        `).join('');
    }

    epitSzuroUI(italKategoriak);
});

/* ==========================================================================
   RANGLISTA SZŰRŐK LOGIKÁJA
   ========================================================================== */

function nyisdSzuroModal() {
    document.getElementById('szuro-modal').style.display = 'flex';
}

function zardSzuroModal() {
    document.getElementById('szuro-modal').style.display = 'none';
}

function epitSzuroUI(italKategoriak) {
    const kontener = document.getElementById('kategoria-szuro-list');
    if (!kontener) return;

    kontener.innerHTML = italKategoriak.map(k => `
        <div class="szuro-pill aktiv" data-id="${k.id}" onclick="toggleKategoriaPill(this)">
            ${k.nev}
        </div>
    `).join('');

    betoltSzuroBeallitasokat();
}

function toggleKategoriaPill(elem) {
    elem.classList.toggle('aktiv');
    frissitsSzureseketEsMents();
}

function kezeldTagEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        hozzaadKizartTag();
    }
}

function hozzaadKizartTag() {
    const input = document.getElementById('kizart-kulcsszo-input');
    if (!input) return;

    const ertek = input.value.trim().toLowerCase();
    if (ertek && !kizartMarkakTomb.includes(ertek)) {
        kizartMarkakTomb.push(ertek);
        input.value = '';
        renderKizartTagem();
        frissitsSzureseketEsMents();
    }
}

function torolKizartTag(szoveg) {
    kizartMarkakTomb = kizartMarkakTomb.filter(t => t !== szoveg);
    renderKizartTagem();
    frissitsSzureseketEsMents();
}

function renderKizartTagem() {
    const kontener = document.getElementById('kizart-tagek-kontener');
    if (!kontener) return;

    kontener.innerHTML = kizartMarkakTomb.map(tag => `
        <span class="kizart-tag" onclick="torolKizartTag('${tag}')">
            ${tag} <span class="torles-x">✕</span>
        </span>
    `).join('');
}

async function frissitsSzureseketEsMents() {
    const kikapcsoltKategoriak = Array.from(document.querySelectorAll('.szuro-pill:not(.aktiv)'))
                                     .map(pill => pill.dataset.id.toLowerCase());

    document.querySelectorAll('.ital-kartya').forEach(kartya => {
        const nev = kartya.querySelector('.ital-nev')?.textContent.toLowerCase() || '';
        const kategoria = kartya.dataset.kategoria?.toLowerCase() || '';

        const kategoriaKizarva = kikapcsoltKategoriak.includes(kategoria);
        const nevKizarva = kizartMarkakTomb.some(szoveg => nev.includes(szoveg));

        if (kategoriaKizarva || nevKizarva) {
            kartya.style.display = 'none';
        } else {
            kartya.style.display = 'inline-flex';
        }
    });

    frissitsSzamlalokat();

    const groupCode = localStorage.getItem('goats_group_code');
    if (groupCode) {
        const szuroAdat = {
            kikapcsolt_kategoriak: kikapcsoltKategoriak,
            kizart_szoveg_tomb: kizartMarkakTomb
        };

        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        await client.from('groups').upsert({
            group_code: groupCode,
            filter_settings: szuroAdat,
            updated_at: new Date()
        }, { onConflict: 'group_code' });
    }
}

async function betoltSzuroBeallitasokat() {
    const groupCode = localStorage.getItem('goats_group_code');
    if (!groupCode) return;

    try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        const { data, error } = await client
            .from('groups')
            .select('filter_settings')
            .eq('group_code', groupCode)
            .maybeSingle();

        if (error || !data || !data.filter_settings) return;

        const filterSettings = data.filter_settings;
        const kikapcsoltKategoriak = filterSettings.kikapcsolt_kategoriak || [];
        kizartMarkakTomb = filterSettings.kizart_szoveg_tomb || [];

        renderKizartTagem();

        document.querySelectorAll('.szuro-pill').forEach(pill => {
            const id = pill.dataset.id.toLowerCase();
            if (kikapcsoltKategoriak.includes(id)) {
                pill.classList.remove('aktiv');
            } else {
                pill.classList.add('aktiv');
            }
        });

        frissitsSzureseketEsMents();
    } catch (err) {
        console.error('Hiba a szűrő beállítások betöltésekor:', err);
    }
}

function toggleForrasDoboz(fejlecElem) {
    const doboz = fejlecElem.closest('.forras-doboz');
    if (doboz) {
        doboz.classList.toggle('csukva');
    }
}

function nyisdUjItalModal() {
    document.getElementById('uj-ital-modal').style.display = 'flex';
    kategoriaValtozasCheck();
}

function zardUjItalModal() {
    document.getElementById('uj-ital-modal').style.display = 'none';
    document.getElementById('uj-ital-nev').value = '';
    document.getElementById('uj-ital-szazalek').value = '';
    document.getElementById('hozzavalok-lista').innerHTML = '';
}

function isKevertItal(kat) {
    if (!kat) return false;
    const k = kat.toLowerCase();
    return k === 'koktel' || k === 'koktél' || k === 'froccs' || k === 'fröccs';
}

function kategoriaValtozasCheck() {
    const kat = document.getElementById('uj-ital-kategoria').value;
    const resz = document.getElementById('koktel-összeallitas-resz');
    const alkoholGroup = document.getElementById('alkoholfok-group');

    if (alkoholGroup) {
        const elrejtAlkohol = (kat === 'energiaital' || kat === 'koktel' || kat === 'froccs');
        alkoholGroup.style.display = elrejtAlkohol ? 'none' : 'block';
    }

    if (resz) {
        const kevert = isKevertItal(kat);
        resz.style.display = kevert ? 'block' : 'none';
        if (kevert && document.getElementById('hozzavalok-lista').children.length === 0) {
            if (kat === 'froccs') {
                ujHozzavaloSor('1', 'dl', 'Bor');
                ujHozzavaloSor('1', 'dl', 'Szóda');
            } else {
                ujHozzavaloSor();
            }
        }
    }
}

function valtsMódot(uMod) {
    if (aktualisMod === uMod) return;
    aktualisMod = uMod;

    const btnArany = document.getElementById('mode-arany-btn');
    const btnPontos = document.getElementById('mode-pontos-btn');

    if (btnArany) btnArany.classList.toggle('active', uMod === 'arany');
    if (btnPontos) btnPontos.classList.toggle('active', uMod === 'pontos');

    frissitsMindenSorSemat();
}

function ujHozzavaloSor(m = '', e = 'dl', n = '') {
    const kontener = document.getElementById('hozzavalok-lista');
    if (!kontener) return;

    const sorDiv = document.createElement('div');
    sorDiv.className = 'hozzavalo-sor';

    sorDiv.innerHTML = keszitSorHTML(m, e, n);
    kontener.appendChild(sorDiv);

    frissitsTorlesGombokat();
}

function keszitSorHTML(m, e, n) {
    if (aktualisMod === 'arany') {
        return `
            <input type="text" class="sm-input hozzavalo-mennyiseg" style="flex: 1;" placeholder="Mennyiség" value="${m}" />
            <input type="text" class="sm-input hozzavalo-nev" style="flex: 2;" placeholder="Hozzávaló neve" value="${n}" />
            <button type="button" class="hozzavalo-torles-btn" onclick="torolSor(this)">🗑️</button>
        `;
    } else {
        const egysegek = ['dl', 'ml', 'cl', 'db', 'öntet'];
        const opciok = egysegek.map(opt => `<option value="${opt}" ${opt === e ? 'selected' : ''}>${opt}</option>`).join('');

        return `
            <input type="text" class="sm-input hozzavalo-nev" style="flex: 2;" placeholder="Hozzávaló neve" value="${n}" />
            <input type="number" class="sm-input hozzavalo-mennyiseg" style="flex: 1;" placeholder="Mennyiség" value="${m}" />
            <select class="sm-input hozzavalo-egyseg" style="flex: 1;">
                ${opciok}
            </select>
            <button type="button" class="hozzavalo-torles-btn" onclick="torolSor(this)">🗑️</button>
        `;
    }
}

function frissitsMindenSorSemat() {
    const sorok = document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor');
    sorok.forEach(sor => {
        const m = sor.querySelector('.hozzavalo-mennyiseg')?.value || '';
        const e = sor.querySelector('.hozzavalo-egyseg')?.value || 'dl';
        const n = sor.querySelector('.hozzavalo-nev')?.value || '';

        sor.innerHTML = keszitSorHTML(m, e, n);
    });

    frissitsTorlesGombokat();
}

function torolSor(gomb) {
    const kontener = document.getElementById('hozzavalok-lista');
    if (kontener.children.length > 1) {
        gomb.parentElement.remove();
        frissitsTorlesGombokat();
    }
}

function frissitsTorlesGombokat() {
    const sorok = document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor');
    const letiltva = sorok.length < 2;

    sorok.forEach(sor => {
        const btn = sor.querySelector('.hozzavalo-torles-btn');
        if (btn) btn.disabled = letiltva;
    });
}

async function mentUjItal() {
    const nev = document.getElementById('uj-ital-nev').value.trim();
    const kategoria = document.getElementById('uj-ital-kategoria').value;
    const szazalek = document.getElementById('uj-ital-szazalek').value.trim();

    if (!nev) {
        alert('Kérlek add meg az ital nevét!');
        return;
    }

    let hozzavalokTomb = [];
    if (isKevertItal(kategoria)) {
        const sorok = document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor');
        sorok.forEach(sor => {
            const m = sor.querySelector('.hozzavalo-mennyiseg')?.value.trim() || '';
            const e = sor.querySelector('.hozzavalo-egyseg')?.value || (aktualisMod === 'arany' ? 'rész' : 'dl');
            const n = sor.querySelector('.hozzavalo-nev')?.value.trim() || '';
            if (n) {
                hozzavalokTomb.push({ mennyiseg: m, egyseg: e, nev: n });
            }
        });
    }

    const mentesiAlkohol = (kategoria === 'energiaital' || kategoria === 'koktel' || kategoria === 'froccs')
        ? 0
        : (szazalek ? parseFloat(szazalek) : null);

    const ujItalAdat = {
        nev: nev,
        kategoria: kategoria,
        alkohol_fok: mentesiAlkohol,
        kep_url: 'https://bvositlxbeqztnhdembx.supabase.co/storage/v1/object/public/italok/feltoltesAlatt.png',
        osszetevok: isKevertItal(kategoria) ? JSON.stringify({ mod: aktualisMod, elemek: hozzavalokTomb }) : null
    };

    try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;

        const { data, error } = await client
            .from('ital_katalogus')
            .insert([ujItalAdat])
            .select();

        if (error) {
            console.error('❌ Supabase hiba:', error);
            alert(`Hiba történt a mentéskor: ${error.message}`);
            return;
        }

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send("service_rz0ofi1", "template_74yde49", {
                    ital_nev: nev,
                    kategoria: kategoria,
                    szazalek: szazalek || 'Nincs megadva'
                });
            }
        } catch (emailErr) {
            console.warn('Email küldési hiba:', emailErr);
        }

        const beszurtItal = data && data[0] ? data[0] : ujItalAdat;
        addItalKartyaToUI(beszurtItal);

        zardUjItalModal();
    } catch (err) {
        console.error('Hiba:', err);
    }
}

function addItalKartyaToUI(ital) {
    const celListaDiv = getListaDivByKategoria(ital.kategoria);
    if (!celListaDiv) return;

    const kartya = document.createElement('div');
    kartya.className = 'ital-kartya';
    kartya.id = `ital-${ital.id}`;
    kartya.dataset.kategoria = ital.kategoria;

    const img = document.createElement('img');
    img.src = ital.kep_url || ital.kep || 'https://bvositlxbeqztnhdembx.supabase.co/storage/v1/object/public/italok/feltoltesAlatt.png';
    img.alt = ital.nev;

    const felirat = document.createElement('span');
    felirat.className = 'ital-nev';
    felirat.textContent = ital.nev;

    kartya.appendChild(img);
    kartya.appendChild(felirat);

    kartya.addEventListener('click', () => {
        aktivElemId = kartya.id;
        aktivItalAdat = ital;

        document.getElementById('modal-kep').src = img.src;

        const nevElem = document.getElementById('modal-nev');
        nevElem.textContent = ital.nev;

        const doboz = document.getElementById('modal-koktel-hozzavalok-doboz');
        const kontener = document.getElementById('modal-koktel-hozzavalok-lista');

        const badge = document.getElementById('modal-alkohol-badge');
        const kat = ital.kategoria ? ital.kategoria.toLowerCase() : '';

        if (badge) {
            if (kat === 'energiaital') {
                badge.className = 'alkohol-badge mentes';
                badge.innerHTML = '<span>Alkoholmentes</span>';
                badge.style.display = 'inline-flex';
            } else if (kat === 'froccs' || kat === 'fröccs' || kat === 'koktel' || kat === 'koktél') {
                badge.className = 'alkohol-badge valtozo';
                badge.innerHTML = 'Alkoholfok: <span>Változó</span>';
                badge.style.display = 'inline-flex';
            } else if (ital.alkohol_fok !== null && ital.alkohol_fok !== undefined) {
                badge.className = 'alkohol-badge';
                badge.innerHTML = `Alkoholfok: <span>${ital.alkohol_fok}%</span>`;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        if (isKevertItal(ital.kategoria) && ital.osszetevok) {
            kontener.innerHTML = '';
            try {
                const adat = typeof ital.osszetevok === 'string' ? JSON.parse(ital.osszetevok) : ital.osszetevok;
                const list = Array.isArray(adat) ? adat : (adat?.elemek || []);

                if (Array.isArray(list) && list.length > 0) {
                    list.forEach((item, index) => {
                        const p = document.createElement('div');
                        const borderStyle = index < list.length - 1 ? 'border-bottom: 1px solid var(--border-color);' : '';
                        p.style.cssText = `display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9rem; ${borderStyle}`;
                        p.innerHTML = `<span style="font-weight: 600; color: var(--text-primary);">${item.nev}</span> <span style="color: var(--text-secondary);">${item.mennyiseg} ${item.egyseg || ''}</span>`;
                        kontener.appendChild(p);
                    });
                    if (doboz) doboz.style.display = 'block';
                } else {
                    if (doboz) doboz.style.display = 'none';
                }
            } catch (e) {
                console.error('Hiba a hozzávalók feldolgozásakor:', e);
                kontener.textContent = ital.osszetevok;
                if (doboz) doboz.style.display = 'block';
            }
        } else {
            if (doboz) doboz.style.display = 'none';
        }

        document.getElementById('modal-hatter').style.display = 'flex';
    });

    celListaDiv.appendChild(kartya);
    frissitsSzamlalokat();
}

window.addEventListener('DOMContentLoaded', inicializalas);