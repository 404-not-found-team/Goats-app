// Ital ranglista (ranglista.html).
// Adatok: public.italok (katalógus), public.ital_kategoriak (fő- és alkategóriák, lásd
// js/segedek/ital-kategoriak.js), public.ital_osszetevok (koktél/fröccs recept),
// public.ital_ranglista (a csoport besorolásai).
// Szűrés két szinten:
//  - Csoport beállítás (groups.filter_settings, mentett): mely fő- és alkategóriák, és energiaitalnál
//    a zero/nem zero látszik. Amíg nincs beállítva, egyetlen ital sem látszik, és az oldal felkínálja.
//  - Saját nézet: ezen belül tovább szűkít (kategóriák, zero, név szerinti elrejtés), de nem mentjük.

let aktivElemId = null;
let aktivItalAdat = null;
let aktualisMod = 'arany';
let szerkesztettItalId = null; // az "Új ital" ablak szerkesztés módban: ennek az italnak az id-ja (null = új felvétel)

const ZERO_ERTEKEK = ['mind', 'zero', 'nem_zero'];
const ZERO_FELIRAT = { mind: 'Mind', zero: 'Cukormentes', nem_zero: 'Cukros' };

let csoportSzuro = null; // { v: 2, beallitva: true, kategoriak: [kod], alkategoriak_ki: [kulcs], zero: {fokod: ertek} }
let sajatSzuro = ujSajatSzuro();
const osszetevokItalonkent = new Map(); // ital id -> [{nev, mennyiseg, egyseg}]

function ujSajatSzuro() {
    return { kategoriak_ki: [], alkategoriak_ki: [], zero: {}, kizart: [] };
}

// A kártyán/modalban megjelenő név: alapból márka nélkül (pl. "Finlandia Mango" -> "Mango"), de néhány
// italnál ez félreérthető (pl. "Kozel Premium" -> csak "Premium" látszana) - ilyenkor az ital saját
// teljes_nev_mutatasa jelzőjével (superadmin kapcsolja az ital szerkesztésénél) a teljes név látszik.
function megjelenitettNev(nev, teljesNevMutatva) {
    return teljesNevMutatva ? (nev || '') : window.italKep.nevMarkaNelkul(nev);
}

const kliens = () => (typeof _supabase !== 'undefined' ? _supabase : supabase);
const K = () => window.italKategoriak;

// Az alkategória-szűrő kulcsa: az alkategória kódja, vagy "<fokód>:egyeb" az alkategória nélküliekre
const alKulcs = (foKod, alKod) => alKod || `${foKod}:egyeb`;

// ---------- Betöltés ----------

async function inicializalas() {
    if (window.goatsAuth) await window.goatsAuth.ready;
    // Globálisan kikapcsolt italjavaslat (FELADAT15): a gomb letiltva, a szerver is elutasítaná
    window.goatsKapcsolok?.funkcioGombTiltas(document.getElementById('uj-ital-gomb'), 'funkcio_italjavaslat');
    const groupCode = aktualisGroupCode();
    const client = kliens();

    try {
        await K().betolt(client);
    } catch (err) {
        console.error('Hiba a kategóriák betöltésekor:', err);
        return;
    }
    epitForrasDobozok();
    epitKategoriaValaszto();
    epitKiszerelesValaszto();
    epitFormaValaszto();

    const [katalogusRes, osszetevoRes] = await Promise.all([
        client.from('italok')
            .select('id, marka, nev, kategoria_id, alkategoria_id, alkategoria_kezi, zero, alkohol_fok, kiszereles, recept_mod, jovahagyva, javasolta_id, kep_forma, kep_minta, kep_szin_1, kep_szin_2, teljes_nev_mutatasa')
            .order('nev', { ascending: true })
            .range(0, 1999),
        client.from('ital_osszetevok')
            .select('ital_id, sorrend, nev, mennyiseg, egyseg')
            .order('sorrend', { ascending: true }),
    ]);

    if (katalogusRes.error) {
        console.error('Hiba a katalógus betöltésekor:', katalogusRes.error);
        return;
    }
    if (osszetevoRes.error) console.error('Hiba a receptek betöltésekor:', osszetevoRes.error);
    (osszetevoRes.data || []).forEach(o => {
        if (!osszetevokItalonkent.has(o.ital_id)) osszetevokItalonkent.set(o.ital_id, []);
        osszetevokItalonkent.get(o.ital_id).push(o);
    });

    katalogusRes.data.forEach(ital => addItalKartyaToUI(ital, false));
    document.querySelectorAll('.ital-lista, .ital-alcsoport-lista').forEach(rendezKartyakatContainerben);

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
                if (!kartyaElem) return;
                const celZona = item.kategoria === 'forras' ? forrasKontener(kartyaElem) : tierKontener(item.kategoria);
                if (celZona) {
                    celZona.appendChild(kartyaElem);
                    rendezKartyakatContainerben(celZona);
                }
            });
        }
    }

    await betoltCsoportSzuro();
}

/**
 * Segédfüggvény: Egy adott konténerben lévő kártyákat ábécésorrendbe rendezi a nevük alapján
 */
function rendezKartyakatContainerben(container) {
    if (!container) return;
    const kartyak = Array.from(container.querySelectorAll(':scope > .ital-kartya'));

    kartyak.sort((a, b) => {
        const nevA = (a.dataset.nev || '').trim();
        const nevB = (b.dataset.nev || '').trim();
        return nevA.localeCompare(nevB, 'hu', { sensitivity: 'base' });
    });

    kartyak.forEach(kartya => container.appendChild(kartya));
}

// A tier-sor (S..D) kártyatárolója
function tierKontener(kod) {
    return document.querySelector(`.ranglista-dropzone[data-tier="${kod}"]`);
}

// A kártya helye a forrásdobozban: az alkategória-csoportja, vagy a főkategória listája
function forrasKontener(kartya) {
    const fo = kartya.dataset.kategoria;
    const al = kartya.dataset.alkategoria || '';
    return document.querySelector(`.ital-alcsoport-lista[data-alkulcs="${alKulcs(fo, al)}"]`)
        || document.querySelector(`.ital-lista[data-kategoria="${fo}"]`)
        || document.querySelector('.ital-lista[data-kategoria="egyeb"]');
}

async function kategoriatValaszt(tier) {
    if (!aktivElemId) return;

    const groupCode = aktualisGroupCode();
    const kartyaElem = document.getElementById(aktivElemId);
    const celZona = tier === 'forras' ? forrasKontener(kartyaElem) : tierKontener(tier);

    if (kartyaElem && celZona) {
        celZona.appendChild(kartyaElem);
        rendezKartyakatContainerben(celZona);

        if (groupCode) {
            const { error } = await kliens()
                .from('ital_ranglista')
                .upsert({
                    id: aktivElemId,
                    kategoria: tier,
                    group_code: groupCode
                }, { onConflict: 'id,group_code' });

            if (error) {
                console.error('Hiba a mentés során:', error);
            }
        }
    }

    alkalmazSzurot();
    modalBezár();
}

function modalBezár() {
    document.getElementById('modal-hatter').hidden = true;
    aktivElemId = null;
    aktivItalAdat = null;
}

// ---------- Felépítés ----------

const TIEREK = [
    { kod: 'S', cls: 'legeslegjobb' },
    { kod: 'A', cls: 'legjobb' },
    { kod: 'B', cls: 'elmegy' },
    { kod: 'C', cls: 'soha' },
    { kod: 'D', cls: 'megjobbansoha' }
];

function epitTierek() {
    const katKontener = document.getElementById('kategoriak-kontener');
    if (!katKontener) return;
    katKontener.replaceChildren(...TIEREK.map(k => {
        const doboz = ujElem('div', 'kategoria-kontener');
        const cimke = ujElem('h3', `cimke ${k.cls} dark`, k.kod);
        const dropzone = ujElem('div', 'ranglista-dropzone');
        dropzone.dataset.tier = k.kod;
        doboz.append(cimke, dropzone);
        return doboz;
    }));
}

// Főkategóriánként egy lenyitható doboz; ha vannak alkategóriái, azokon belül alcsoportok
// (alkategóriánként egy; az alkategória nélküli italok simán a lista szintjén maradnak, nincs
// külön "Egyéb" csoport)
function epitForrasDobozok() {
    const forrasKontenerElem = document.getElementById('forras-dobozok-kontener');
    if (!forrasKontenerElem) return;
    forrasKontenerElem.replaceChildren(...K().fo.map(fo => {
        const doboz = ujElem('div', 'forras-doboz csukva');
        doboz.dataset.kategoria = fo.kod;
        const fejlec = ujElem('div', 'forras-fejlec');
        fejlec.addEventListener('click', () => doboz.classList.toggle('csukva'));
        const cim = ujElem('h3');
        cim.append(document.createTextNode(`${fo.nev} `));
        cim.appendChild(ujElem('span', 'nyil-ikon', '▼'));
        const szamlalo = ujElem('span', 'ital-szamlalo', '0 / 0');
        fejlec.append(cim, szamlalo);

        const lista = ujElem('div', 'ital-lista');
        lista.dataset.kategoria = fo.kod;
        const alok = K().alkategoriai(fo.id);
        if (alok.length > 0) {
            lista.classList.add('van-alcsoport');
            alok.forEach(a => {
                const csoport = ujElem('div', 'ital-alcsoport');
                csoport.dataset.alkulcs = a.kod;
                const alcim = ujElem('h4', 'ital-alcsoport-cim', a.nev);
                const allista = ujElem('div', 'ital-alcsoport-lista');
                allista.dataset.alkulcs = a.kod;
                csoport.append(alcim, allista);
                lista.appendChild(csoport);
            });
        }
        doboz.append(fejlec, lista);
        return doboz;
    }));
}

// Az új ital űrlap kiszerelés-legördülője (sörnél; az első, a 0,5 l-es doboz az alap)
function epitKiszerelesValaszto() {
    const select = document.getElementById('uj-ital-kiszereles');
    if (!select) return;
    select.replaceChildren(...K().KISZERELESEK.map(k => {
        const opt = document.createElement('option');
        opt.value = k.kod;
        opt.textContent = k.nev;
        return opt;
    }));
}

// ---------- Színezett kép az űrlapon (italok.kep_forma, kep_minta, kep_szin_1, kep_szin_2) ----------

function epitFormaValaszto() {
    const opcio = (ertek, szoveg) => {
        const opt = document.createElement('option');
        opt.value = ertek;
        opt.textContent = szoveg;
        return opt;
    };
    const forma = document.getElementById('uj-ital-forma');
    if (forma) {
        forma.replaceChildren(opcio('', 'Nincs (márkakép / ikon)'),
            ...window.italKep.FORMAK.map(([kod, nev]) => opcio(kod, nev)));
    }
    const minta = document.getElementById('uj-ital-minta');
    if (minta) {
        minta.replaceChildren(opcio('', 'Nincs'),
            ...window.italKep.MINTAK.map(([kod, nev]) => opcio(kod, nev)));
    }
}

// Az űrlap képmezőinek értéke mentéshez; forma nélkül minden mező üres
function kepAdatokUrlapbol() {
    const forma = document.getElementById('uj-ital-forma')?.value || '';
    if (!forma) return { kep_forma: null, kep_minta: null, kep_szin_1: null, kep_szin_2: null };
    const vanSzin2 = document.getElementById('uj-ital-van-szin-2')?.checked;
    return {
        kep_forma: forma,
        kep_minta: document.getElementById('uj-ital-minta')?.value || null,
        kep_szin_1: document.getElementById('uj-ital-szin-1')?.value || null,
        kep_szin_2: vanSzin2 ? (document.getElementById('uj-ital-szin-2')?.value || null) : null,
    };
}

// Az űrlap képmezőinek kitöltése (szerkesztéskor az ital adataival, új italnál alaphelyzetbe)
function kepMezokBeallit(ital = {}) {
    document.getElementById('uj-ital-forma').value = ital.kep_forma || '';
    document.getElementById('uj-ital-minta').value = ital.kep_minta || '';
    document.getElementById('uj-ital-szin-1').value = ital.kep_szin_1 || '#e30613';
    document.getElementById('uj-ital-van-szin-2').checked = !!ital.kep_szin_2;
    document.getElementById('uj-ital-szin-2').value = ital.kep_szin_2 || '#111111';
    kepElonezetFrissit();
}

function kepElonezetFrissit() {
    const adatok = kepAdatokUrlapbol();
    const resz = document.getElementById('kep-szinezes-resz');
    if (resz) resz.hidden = !adatok.kep_forma;
    const szin2 = document.getElementById('uj-ital-szin-2');
    if (szin2) szin2.disabled = !document.getElementById('uj-ital-van-szin-2')?.checked;

    const elonezet = document.getElementById('kep-elonezet');
    if (!elonezet) return;
    if (!adatok.kep_forma) {
        elonezet.replaceChildren();
        return;
    }
    const nev = document.getElementById('uj-ital-nev')?.value || '';
    elonezet.replaceChildren(window.italKep.elemLetrehoz({ nev, ...adatok }));
}

// Az új ital űrlap kategória-legördülője (a főkategóriák a táblából)
function epitKategoriaValaszto() {
    const select = document.getElementById('uj-ital-kategoria');
    if (!select) return;
    select.replaceChildren(...K().fo.map(fo => {
        const opt = document.createElement('option');
        opt.value = String(fo.id);
        opt.textContent = fo.nev;
        return opt;
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    epitTierek();

    // A kiválasztott ital ablaka bezárul a háttérre (az ablakon kívülre) kattintva és Esc-re is
    const hatter = document.getElementById('modal-hatter');
    hatter?.addEventListener('click', (e) => {
        if (e.target === hatter) modalBezár();
    });

    // Szűrő ablak: fülek, gombok, bezárás (háttér, Esc)
    const szuroModal = document.getElementById('szuro-modal');
    szuroModal?.addEventListener('click', (e) => {
        if (e.target === szuroModal) zardSzuroModal();
    });
    document.querySelectorAll('#szuro-modal .szuro-bezar').forEach(g => g.addEventListener('click', zardSzuroModal));
    document.getElementById('szuro-ful-sajat')?.addEventListener('click', () => szuroFul('sajat'));
    document.getElementById('szuro-ful-csoport')?.addEventListener('click', () => szuroFul('csoport'));
    document.getElementById('kizart-hozzaad-gomb')?.addEventListener('click', hozzaadKizartTag);
    document.getElementById('kizart-kulcsszo-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); hozzaadKizartTag(); }
    });
    document.getElementById('sajat-szuro-alaphelyzet')?.addEventListener('click', () => {
        sajatSzuro = ujSajatSzuro();
        renderSajatSzuro();
        alkalmazSzurot();
    });
    document.getElementById('csoport-szuro-mentes')?.addEventListener('click', mentCsoportSzuro);
    document.getElementById('csoport-szuro-beallitas-gomb')?.addEventListener('click', () => nyisdSzuroModal('csoport'));

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (hatter && !hatter.hidden) modalBezár();
        else if (szuroModal && !szuroModal.hidden) zardSzuroModal();
    });
});

/* ==========================================================================
   RANGLISTA SZŰRŐK LOGIKÁJA
   ========================================================================== */

// A régi (v1) beállítás: { kikapcsolt_kategoriak: [kod], kizart_szoveg_tomb: [] } -> az összes, kivéve a kikapcsoltakat
function szuroAtalakitas(regi) {
    if (!regi || typeof regi !== 'object') return null;
    if (regi.v === 2) return regi.beallitva ? regi : null;
    if (Array.isArray(regi.kikapcsolt_kategoriak)) {
        const ki = regi.kikapcsolt_kategoriak.map(k => String(k).toLowerCase());
        return { v: 2, beallitva: true, kategoriak: K().fo.map(f => f.kod).filter(k => !ki.includes(k)), alkategoriak_ki: [], zero: {} };
    }
    return null;
}

async function betoltCsoportSzuro() {
    const groupId = window.goatsAuth?.getState()?.group?.id;
    if (!groupId) {
        // Csoport nélkül (vendégként): minden látszik, csoport-beállítás nincs
        csoportSzuro = { v: 2, beallitva: true, kategoriak: K().fo.map(f => f.kod), alkategoriak_ki: [], zero: {} };
        document.getElementById('szuro-ful-csoport').hidden = true;
        alkalmazSzurot();
        return;
    }

    const { data, error } = await kliens()
        .from('groups')
        .select('filter_settings')
        .eq('id', groupId)
        .maybeSingle();
    if (error) console.error('Hiba a szűrő beállítások betöltésekor:', error);

    csoportSzuro = szuroAtalakitas(data?.filter_settings);
    alkalmazSzurot();

    // Még nincs beállítva: felkínáljuk (ha a tag módosíthatja)
    if (!csoportSzuro && csoportSzuroModosithato()) nyisdSzuroModal('csoport');
}

// A csoport szűrőjét alapból bármelyik tag módosíthatja; a csoportszuro_csak_admin kapcsolóval csak
// a csoport adminja (a superadmin mindig). A tényleges ellenőrzést a save_filter_settings RPC végzi.
function csoportSzuroModosithato() {
    const auth = window.goatsAuth;
    const allapot = auth?.getState();
    if (!allapot?.group) return false;
    if (auth.isSuperadmin?.()) return true;
    const csakAdmin = allapot.beallitasok?.csoportszuro_csak_admin === true;
    return !csakAdmin || allapot.groupRole === 'admin';
}

function nyisdSzuroModal(ful = 'sajat') {
    renderSajatSzuro();
    renderCsoportSzuro();
    szuroFul(!csoportSzuro ? 'csoport' : ful);
    document.getElementById('szuro-modal').hidden = false;
}

function zardSzuroModal() {
    document.getElementById('szuro-modal').hidden = true;
    csoportVazlat = null; // a nem mentett csoport-módosítás elvész
    const allapot = document.getElementById('csoport-szuro-allapot');
    if (allapot) allapot.textContent = '';
}

function szuroFul(nev) {
    ['sajat', 'csoport'].forEach(f => {
        const ful = document.getElementById(`szuro-ful-${f}`);
        const panel = document.getElementById(`szuro-panel-${f}`);
        const aktiv = f === nev;
        ful?.classList.toggle('aktiv', aktiv);
        ful?.setAttribute('aria-selected', String(aktiv));
        if (panel) panel.hidden = !aktiv;
    });
}

// Egy kapcsoló-pirula (aktív = látszik)
function pirula(felirat, aktiv, valtas, extraOsztaly = '') {
    const gomb = ujElem('button', `szuro-pill ${extraOsztaly}`.trim(), felirat);
    gomb.type = 'button';
    gomb.classList.toggle('aktiv', aktiv);
    gomb.setAttribute('aria-pressed', String(aktiv));
    gomb.addEventListener('click', valtas);
    return gomb;
}

// Zero-választó (Mind / Csak zero / Nem zero)
function zeroValaszto(ertek, valtas) {
    const sor = ujElem('div', 'szuro-zero');
    sor.setAttribute('role', 'radiogroup');
    sor.setAttribute('aria-label', 'Zero energiaitalok');
    ZERO_ERTEKEK.forEach(z => {
        const gomb = ujElem('button', 'szuro-zero-gomb', ZERO_FELIRAT[z]);
        gomb.type = 'button';
        gomb.setAttribute('role', 'radio');
        gomb.setAttribute('aria-checked', String(z === ertek));
        gomb.classList.toggle('aktiv', z === ertek);
        gomb.addEventListener('click', () => valtas(z));
        sor.appendChild(gomb);
    });
    return sor;
}

// A kategória-lista (fő pirula + alkategória pirulák + zero) egy szűrőhöz.
// beallitas: { foLathato(fo), foValt(fo), alLathato(kulcs), alValt(kulcs), zero(fo), zeroValt(fo, z), csakEzek }
function kategoriaLista(kontener, beallitas) {
    const sorok = K().fo.filter(fo => !beallitas.csakEzek || beallitas.csakEzek(fo)).map(fo => {
        const sor = ujElem('div', 'szuro-kategoria-sor');
        const foAktiv = beallitas.foLathato(fo);
        sor.appendChild(pirula(fo.nev, foAktiv, () => beallitas.foValt(fo)));

        if (foAktiv) {
            // Alkategóriák és zero: egy felcímkézett panelben a főkategória alatt
            const reszletek = ujElem('div', 'szuro-reszletek');
            const alok = K().alkategoriai(fo.id);
            if (alok.length > 0) {
                const alsor = ujElem('div', 'szuro-alkategoriak');
                alok.forEach(a => {
                    alsor.appendChild(pirula(a.nev, beallitas.alLathato(a.kod), () => beallitas.alValt(a.kod), 'kicsi'));
                });
                reszletek.appendChild(reszletSor('Alkategória', alsor));
            }
            if (fo.zero_szuro) {
                reszletek.appendChild(reszletSor('Cukor', zeroValaszto(beallitas.zero(fo), (z) => beallitas.zeroValt(fo, z))));
            }
            if (reszletek.children.length) sor.appendChild(reszletek);
        }
        // Alkategóriás / zero-választós sor teljes szélességű, a többi pirula egymás mellett tördelődik
        sor.classList.toggle('teljes', sor.children.length > 1);
        return sor;
    });
    kontener.replaceChildren(...sorok);
}

// A részletek-panel egy sora: címke + vezérlő
function reszletSor(cimke, vezerlo) {
    const sor = ujElem('div', 'szuro-reszlet-sor');
    sor.append(ujElem('span', 'szuro-reszlet-cimke', cimke), vezerlo);
    return sor;
}

const valt = (tomb, ertek) => (tomb.includes(ertek) ? tomb.filter(t => t !== ertek) : [...tomb, ertek]);

// --- Saját nézet (nem mentett) ---

function renderSajatSzuro() {
    const kontener = document.getElementById('sajat-szuro-kategoriak');
    if (!kontener) return;
    const cs = csoportSzuro || { kategoriak: [], alkategoriak_ki: [], zero: {} };
    if (!csoportSzuro) {
        kontener.replaceChildren(ujElem('p', 'szuro-leiras', 'Előbb a csoport beállításban válaszd ki, mely italok jelenjenek meg.'));
    } else {
        kategoriaLista(kontener, {
            csakEzek: (fo) => cs.kategoriak.includes(fo.kod),
            foLathato: (fo) => !sajatSzuro.kategoriak_ki.includes(fo.kod),
            foValt: (fo) => { sajatSzuro.kategoriak_ki = valt(sajatSzuro.kategoriak_ki, fo.kod); renderSajatSzuro(); alkalmazSzurot(); },
            alLathato: (kulcs) => !cs.alkategoriak_ki.includes(kulcs) && !sajatSzuro.alkategoriak_ki.includes(kulcs),
            alValt: (kulcs) => {
                if (cs.alkategoriak_ki.includes(kulcs)) return; // a csoport elrejtette: itt nem kapcsolható be
                sajatSzuro.alkategoriak_ki = valt(sajatSzuro.alkategoriak_ki, kulcs); renderSajatSzuro(); alkalmazSzurot();
            },
            zero: (fo) => sajatSzuro.zero[fo.kod] || cs.zero?.[fo.kod] || 'mind',
            zeroValt: (fo, z) => { sajatSzuro.zero[fo.kod] = z; renderSajatSzuro(); alkalmazSzurot(); },
        });
    }

    renderKizartTagek();
}

function hozzaadKizartTag() {
    const input = document.getElementById('kizart-kulcsszo-input');
    if (!input) return;
    const ertek = input.value.trim().toLowerCase();
    if (ertek && !sajatSzuro.kizart.includes(ertek)) {
        sajatSzuro.kizart.push(ertek);
        input.value = '';
        renderKizartTagek();
        alkalmazSzurot();
    }
}

function renderKizartTagek() {
    const kontener = document.getElementById('kizart-tagek-kontener');
    if (!kontener) return;
    kontener.replaceChildren(...sajatSzuro.kizart.map(tag => {
        const gomb = ujElem('button', 'kizart-tag', `${tag} `);
        gomb.type = 'button';
        gomb.setAttribute('aria-label', `${tag} elrejtésének törlése`);
        gomb.appendChild(ujElem('span', 'torles-x', '✕'));
        gomb.addEventListener('click', () => {
            sajatSzuro.kizart = sajatSzuro.kizart.filter(t => t !== tag);
            renderKizartTagek();
            alkalmazSzurot();
        });
        return gomb;
    }));
}

// --- Csoport beállítás (mentett) ---

let csoportVazlat = null; // a csoport-panel szerkesztés alatti állapota (Mentésig nem érvényes)

function renderCsoportSzuro() {
    const kontener = document.getElementById('csoport-szuro-kategoriak');
    if (!kontener) return;
    const modosithato = csoportSzuroModosithato();
    csoportVazlat = csoportVazlat || JSON.parse(JSON.stringify(csoportSzuro || { v: 2, beallitva: true, kategoriak: [], alkategoriak_ki: [], zero: {} }));
    const v = csoportVazlat;
    const ujra = () => renderCsoportSzuro();
    kategoriaLista(kontener, {
        foLathato: (fo) => v.kategoriak.includes(fo.kod),
        foValt: (fo) => { if (!modosithato) return; v.kategoriak = valt(v.kategoriak, fo.kod); ujra(); },
        alLathato: (kulcs) => !v.alkategoriak_ki.includes(kulcs),
        alValt: (kulcs) => { if (!modosithato) return; v.alkategoriak_ki = valt(v.alkategoriak_ki, kulcs); ujra(); },
        zero: (fo) => v.zero?.[fo.kod] || 'mind',
        zeroValt: (fo, z) => { if (!modosithato) return; v.zero = { ...(v.zero || {}), [fo.kod]: z }; ujra(); },
    });
    kontener.classList.toggle('csak-olvashato', !modosithato);
    const mentes = document.getElementById('csoport-szuro-mentes');
    if (mentes) mentes.disabled = !modosithato;
    const allapot = document.getElementById('csoport-szuro-allapot');
    if (allapot && !modosithato) {
        allapot.className = 'szuro-allapot';
        allapot.textContent = 'A csoport szűrőjét csak a csoport adminja módosíthatja.';
    }
}

async function mentCsoportSzuro() {
    const groupId = window.goatsAuth?.getState()?.group?.id;
    const allapot = document.getElementById('csoport-szuro-allapot');
    const gomb = document.getElementById('csoport-szuro-mentes');
    if (!groupId || !csoportVazlat) return;

    const beallitas = { ...csoportVazlat, v: 2, beallitva: true };
    gomb.disabled = true;
    allapot.className = 'szuro-allapot';
    allapot.textContent = 'Mentés…';
    try {
        // A groups tábla kliens felől csak olvasható (RLS), az írás RPC-n megy.
        await window.goatsAuth.callRpc('save_filter_settings', { group_id_input: groupId, settings: beallitas });
    } catch (err) {
        console.error('Hiba a szűrő beállítások mentésekor:', err);
        allapot.className = 'szuro-allapot hiba';
        allapot.textContent = err.message || 'A mentés nem sikerült, próbáld újra.';
        gomb.disabled = false;
        return;
    }
    gomb.disabled = false;
    csoportSzuro = beallitas;
    csoportVazlat = null;
    allapot.className = 'szuro-allapot ok';
    allapot.textContent = 'Elmentve, a csoport minden tagjánál ez érvényes.';
    renderSajatSzuro();
    alkalmazSzurot();
    setTimeout(zardSzuroModal, 900);
}

// --- A szűrés alkalmazása ---

function kartyaLathato(kartya) {
    if (!csoportSzuro) return false;
    const fo = kartya.dataset.kategoria;
    if (!csoportSzuro.kategoriak.includes(fo) || sajatSzuro.kategoriak_ki.includes(fo)) return false;

    if (kartya.dataset.vanAlcsoport === '1') {
        const kulcs = alKulcs(fo, kartya.dataset.alkategoria);
        if (csoportSzuro.alkategoriak_ki.includes(kulcs) || sajatSzuro.alkategoriak_ki.includes(kulcs)) return false;
    }

    if (kartya.dataset.zeroSzuro === '1') {
        const zero = sajatSzuro.zero[fo] || csoportSzuro.zero?.[fo] || 'mind';
        const zeroE = kartya.dataset.zero === '1';
        if ((zero === 'zero' && !zeroE) || (zero === 'nem_zero' && zeroE)) return false;
    }

    const nev = (kartya.dataset.nev || '').toLowerCase();
    return !sajatSzuro.kizart.some(szoveg => nev.includes(szoveg));
}

function alkalmazSzurot() {
    document.querySelectorAll('.ital-kartya').forEach(kartya => {
        kartya.hidden = !kartyaLathato(kartya);
    });
    document.getElementById('csoport-szuro-hianyzik').hidden = !!csoportSzuro;
    frissitsSzamlalokat();
}

// Darabszámok és az üres dobozok/alcsoportok elrejtése.
// A nevező a kategória TELJES darabszáma (a mar rangsorolt, tier-dobozokba athelyezett kartyakkal
// egyutt), nem csak a meg a forras-dobozban levoke - igy a szam tenyleg a rangsorolasi haladast
// mutatja, nem csak azt, hogy a szurés hany darabot rejt el a (ranggal mar csokkent) poolbol.
function frissitsSzamlalokat() {
    document.querySelectorAll('.forras-doboz').forEach(doboz => {
        const lista = doboz.querySelector('.ital-lista');
        if (!lista) return;
        const kategoria = lista.dataset.kategoria;
        const kartyak = Array.from(lista.getElementsByClassName('ital-kartya'));
        const lathato = kartyak.filter(k => !k.hidden).length;
        const osszesen = kategoria
            ? document.querySelectorAll(`.ital-kartya[data-kategoria="${kategoria}"]`).length
            : kartyak.length;
        const szamlalo = doboz.querySelector('.ital-szamlalo');
        if (szamlalo) szamlalo.textContent = `${lathato} / ${osszesen}`;
        doboz.hidden = lathato === 0;
        lista.querySelectorAll('.ital-alcsoport').forEach(cs => {
            cs.hidden = !cs.querySelector('.ital-kartya:not([hidden])');
        });
    });
}

function nyisdUjItalModal() {
    if (window.goatsKapcsolok && !window.goatsKapcsolok.funkcioEngedelyezett('funkcio_italjavaslat')) {
        alert(window.goatsKapcsolok.TILTVA_SZOVEG);
        return;
    }
    document.getElementById('uj-ital-modal').hidden = false;
    kategoriaValtozasCheck();
    kepMezokBeallit();
    frissitsTeljesNevGroup();
}

function zardUjItalModal() {
    document.getElementById('uj-ital-modal').hidden = true;
    document.getElementById('uj-ital-nev').value = '';
    document.getElementById('uj-ital-szazalek').value = '';
    document.getElementById('uj-ital-kiszereles').selectedIndex = 0;
    document.getElementById('uj-ital-teljes-nev').checked = false;
    document.getElementById('hozzavalok-lista').replaceChildren();
    szerkesztettItalId = null;
    document.getElementById('uj-ital-modal-cim').textContent = 'Új ital / koktél felvétele';
    document.getElementById('uj-ital-mentes-gomb').textContent = 'Hozzáadás';
}

// A "Teljes név mutatása" kapcsoló csak superadminnak látszik az űrlapon
function frissitsTeljesNevGroup() {
    const sor = document.getElementById('teljes-nev-group');
    if (sor) sor.hidden = !window.goatsAuth?.isSuperadmin?.();
}

// A kiválasztott főkategória az új ital űrlapon
function valasztottFoKategoria() {
    return K().kategoria(Number(document.getElementById('uj-ital-kategoria')?.value)) || null;
}

function kategoriaValtozasCheck() {
    const fo = valasztottFoKategoria();
    const resz = document.getElementById('koktel-összeallitas-resz');
    const alkoholGroup = document.getElementById('alkoholfok-group');
    const kiszerelesGroup = document.getElementById('kiszereles-group');

    if (alkoholGroup) alkoholGroup.hidden = !fo?.alkoholos;
    if (kiszerelesGroup) kiszerelesGroup.hidden = !fo?.kiszereles;

    if (resz) {
        const kevert = !!fo?.recept;
        resz.hidden = !kevert;
        if (kevert && document.getElementById('hozzavalok-lista').children.length === 0) {
            if (fo.kod === 'froccs') {
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

    sorDiv.replaceChildren(...keszitSorElemek(m, e, n));
    kontener.appendChild(sorDiv);

    frissitsTorlesGombokat();
}

// Hozzávaló-sor elemei DOM-építéssel: a felhasználó által írt szöveg (m, n) value-ként
// kerül be, nem HTML-ként (XSS-védelem).
function keszitInput(osztaly, stilus, placeholder, ertek, tipus = 'text') {
    const input = document.createElement('input');
    input.type = tipus;
    input.className = `sm-input ${osztaly}`;
    input.classList.add(stilus === '2' ? 'nyujt-2' : 'nyujt');
    input.placeholder = placeholder;
    input.value = ertek;
    return input;
}

function keszitTorlesGomb() {
    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'hozzavalo-torles-btn';
    gomb.textContent = '🗑️';
    gomb.addEventListener('click', () => torolSor(gomb));
    return gomb;
}

function keszitSorElemek(m, e, n) {
    if (aktualisMod === 'arany') {
        return [
            keszitInput('hozzavalo-mennyiseg', '1', 'Mennyiség', m),
            keszitInput('hozzavalo-nev', '2', 'Hozzávaló neve', n),
            keszitTorlesGomb()
        ];
    }

    const egysegek = ['dl', 'ml', 'cl', 'db', 'öntet'];
    const select = document.createElement('select');
    select.className = 'sm-input hozzavalo-egyseg';
    select.classList.add('nyujt');
    egysegek.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        option.selected = opt === e;
        select.appendChild(option);
    });

    return [
        keszitInput('hozzavalo-nev', '2', 'Hozzávaló neve', n),
        keszitInput('hozzavalo-mennyiseg', '1', 'Mennyiség', m, 'number'),
        select,
        keszitTorlesGomb()
    ];
}

function frissitsMindenSorSemat() {
    const sorok = document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor');
    sorok.forEach(sor => {
        const m = sor.querySelector('.hozzavalo-mennyiseg')?.value || '';
        const e = sor.querySelector('.hozzavalo-egyseg')?.value || 'dl';
        const n = sor.querySelector('.hozzavalo-nev')?.value || '';

        sor.replaceChildren(...keszitSorElemek(m, e, n));
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
    const fo = valasztottFoKategoria();
    const szazalek = document.getElementById('uj-ital-szazalek').value.trim();

    if (!nev) {
        alert('Kérlek add meg az ital nevét!');
        return;
    }
    if (!fo) {
        alert('Válassz kategóriát!');
        return;
    }

    const hozzavalok = [];
    if (fo.recept) {
        document.querySelectorAll('#hozzavalok-lista .hozzavalo-sor').forEach((sor, i) => {
            const m = (sor.querySelector('.hozzavalo-mennyiseg')?.value || '').trim().replace(',', '.');
            const e = sor.querySelector('.hozzavalo-egyseg')?.value || (aktualisMod === 'arany' ? 'rész' : 'dl');
            const n = (sor.querySelector('.hozzavalo-nev')?.value || '').trim();
            if (n) hozzavalok.push({ sorrend: i + 1, nev: n.slice(0, 60), mennyiseg: /^\d+(\.\d+)?$/.test(m) ? Number(m) : null, egyseg: e });
        });
    }

    const client = kliens();
    const KIVALASZTANDO = 'id, marka, nev, kategoria_id, alkategoria_id, alkategoria_kezi, zero, alkohol_fok, kiszereles, recept_mod, jovahagyva, javasolta_id, kep_forma, kep_minta, kep_szin_1, kep_szin_2, teljes_nev_mutatasa';
    const teljesNevMutatva = document.getElementById('uj-ital-teljes-nev')?.checked || false;

    if (szerkesztettItalId) {
        const italId = szerkesztettItalId;
        const valtozas = {
            nev,
            marka: window.italKep ? window.italKep.markaNevbol(nev) : null,
            kategoria_id: fo.id,
            alkohol_fok: fo.alkoholos ? (szazalek ? parseFloat(szazalek) : null) : 0,
            kiszereles: fo.kiszereles ? (document.getElementById('uj-ital-kiszereles')?.value || null) : null,
            recept_mod: fo.recept ? aktualisMod : null,
            teljes_nev_mutatasa: teljesNevMutatva,
            ...kepAdatokUrlapbol(),
        };

        const { data, error } = await client.from('italok').update(valtozas).eq('id', italId).select(KIVALASZTANDO).single();
        if (error) {
            console.error('Supabase hiba:', error);
            alert(`Hiba történt a mentéskor: ${error.message}`);
            return;
        }

        const { error: delError } = await client.from('ital_osszetevok').delete().eq('ital_id', italId);
        if (delError) console.error('A régi hozzávalók törlése nem sikerült:', delError);

        if (hozzavalok.length > 0) {
            const { error: receptHiba } = await client.from('ital_osszetevok').insert(hozzavalok.map(h => ({ ...h, ital_id: italId })));
            if (receptHiba) {
                console.error('A recept mentése nem sikerült:', receptHiba);
                alert('Az ital elmentve, de a hozzávalók mentése nem sikerült.');
            } else {
                osszetevokItalonkent.set(italId, hozzavalok);
            }
        } else {
            osszetevokItalonkent.delete(italId);
        }

        frissitsItalKartyaDOM(italId, data);
        alkalmazSzurot();
        zardUjItalModal();
        return;
    }

    // A kép nélküli új ital: a kép a márkából vagy a kategória-ikonból jön (ital-kep.js),
    // a jóváhagyásig pedig nem látszik a közös katalógusban.
    const ujItalAdat = {
        nev,
        marka: window.italKep ? window.italKep.markaNevbol(nev) : null,
        kategoria_id: fo.id,
        alkohol_fok: fo.alkoholos ? (szazalek ? parseFloat(szazalek) : null) : 0,
        kiszereles: fo.kiszereles ? (document.getElementById('uj-ital-kiszereles')?.value || null) : null,
        recept_mod: fo.recept ? aktualisMod : null,
        teljes_nev_mutatasa: teljesNevMutatva,
        ...kepAdatokUrlapbol(),
        jovahagyva: false,
        javasolta_id: window.goatsAuth?.getState()?.user?.id || null,
    };

    const { data, error } = await client
        .from('italok')
        .insert([ujItalAdat])
        .select(KIVALASZTANDO)
        .single();

    if (error) {
        console.error('Supabase hiba:', error);
        alert(`Hiba történt a mentéskor: ${error.message}`);
        return;
    }

    if (hozzavalok.length > 0) {
        const { error: receptHiba } = await client
            .from('ital_osszetevok')
            .insert(hozzavalok.map(h => ({ ...h, ital_id: data.id })));
        if (receptHiba) {
            console.error('A recept mentése nem sikerült:', receptHiba);
            alert('Az ital elmentve, de a hozzávalók mentése nem sikerült.');
        } else {
            osszetevokItalonkent.set(data.id, hozzavalok);
        }
    }

    addItalKartyaToUI(data);
    alkalmazSzurot();
    zardUjItalModal();
}

// Kisebb kiszerelés (0,33 l-es doboz): a képe valamivel kisebb az alap 0,5 l-esnél
const kisebbKiszereles = (ital) => ital.kiszereles === 'dobozos_330';

// Új elem szöveggel és osztállyal, textContent-tel (nincs innerHTML)
function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

// Alkoholfok-jelvény szövege: előtag + kiemelt érték, textContent-tel (nincs innerHTML)
function badgeSzoveg(elem, elotag, ertek) {
    elem.replaceChildren();
    if (elotag) elem.appendChild(document.createTextNode(elotag));
    const kiemelt = document.createElement('span');
    kiemelt.textContent = ertek;
    elem.appendChild(kiemelt);
}

function addItalKartyaToUI(ital, rendez = true) {
    const fo = K().kategoria(ital.kategoria_id) || K().fo.find(f => f.kod === 'egyeb') || K().fo[0];
    if (!fo) return;
    const al = K().alkategoria(ital);
    // Az ital-kep.js a kategória kódját és ikonját várja
    const kepAdat = { ...ital, kategoria: fo.kod, ikon: fo.ikon };

    const kartya = document.createElement('div');
    kartya.className = 'ital-kartya';
    kartya.id = `ital-${ital.id}`;
    kartya.dataset.kategoria = fo.kod;
    kartya.dataset.alkategoria = al ? al.kod : '';
    kartya.dataset.vanAlcsoport = K().alkategoriai(fo.id).length > 0 ? '1' : '0';
    kartya.dataset.zeroSzuro = fo.zero_szuro ? '1' : '0';
    kartya.dataset.zero = K().zero(ital) ? '1' : '0';
    // A 0,33 l-es doboz valamivel kisebb képet kap, mint az alap 0,5 l-es (css: .kisebb-kiszereles)
    kartya.classList.toggle('kisebb-kiszereles', kisebbKiszereles(ital));
    // Teljes név (márkával) a rendezéshez és a név szerinti elrejtéshez; a felirat márka nélküli
    kartya.dataset.nev = ital.nev || '';

    const kep = window.italKep.elemLetrehoz(kepAdat);

    const felirat = document.createElement('span');
    felirat.className = 'ital-nev';
    felirat.textContent = megjelenitettNev(ital.nev, ital.teljes_nev_mutatasa);
    felirat.title = ital.nev || '';

    kartya.appendChild(kep);
    kartya.appendChild(felirat);

    // A saját, még jóváhagyatlan italon jelvény (mást a szerver nem is ad vissza jóváhagyatlanul)
    const sajatJavaslat = !ital.jovahagyva && !!ital.javasolta_id
        && ital.javasolta_id === window.goatsAuth?.getState()?.user?.id;
    if (sajatJavaslat) {
        kartya.classList.add('sajat-javaslat');
        kartya.appendChild(ujElem('span', 'jovahagyasra-var', 'Jóváhagyásra vár'));
    }

    kartya.addEventListener('click', () => italReszletek(kartya, ital, fo, kepAdat));

    const cel = forrasKontener(kartya);
    if (!cel) return;
    cel.appendChild(kartya);
    if (rendez) rendezKartyakatContainerben(cel);
}

// A kiválasztott ital ablaka: kép, név, alkoholfok, recept, besorolás gombok
function italReszletek(kartya, ital, fo, kepAdat) {
    aktivElemId = kartya.id;
    aktivItalAdat = ital;

    // Ugyanaz az elem, mint a kártyán: kép (tartalék-sorrenddel), vagy kép híján a színezett kategória-ikon
    const kep = window.italKep.elemLetrehoz(kepAdat);
    kep.id = 'modal-kep';
    const kepHely = document.getElementById('modal-kep-hely');
    kepHely.replaceChildren(kep);
    kepHely.classList.toggle('kisebb-kiszereles', kisebbKiszereles(ital));

    document.getElementById('modal-nev').textContent = ital.nev;

    const badge = document.getElementById('modal-alkohol-badge');
    if (badge) {
        if (fo.recept) {
            badge.className = 'alkohol-badge valtozo';
            badgeSzoveg(badge, 'Alkoholfok: ', 'Változó');
            badge.hidden = false;
        } else if (!fo.alkoholos) {
            badge.className = 'alkohol-badge mentes';
            badgeSzoveg(badge, '', 'Alkoholmentes');
            badge.hidden = false;
        } else if (ital.alkohol_fok !== null && ital.alkohol_fok !== undefined) {
            badge.className = 'alkohol-badge';
            badgeSzoveg(badge, 'Alkoholfok: ', `${ital.alkohol_fok}%`);
            badge.hidden = false;
        } else {
            badge.hidden = true;
        }
    }

    // Zero energiaital: "Cukormentes" jelvény az alkohol-jelvény mellett (italok.zero, üresen a névből)
    const cukor = document.getElementById('modal-cukor-badge');
    if (cukor) cukor.hidden = !(fo.zero_szuro && K().zero(ital));

    const doboz = document.getElementById('modal-koktel-hozzavalok-doboz');
    const kontener = document.getElementById('modal-koktel-hozzavalok-lista');
    const recept = fo.recept ? (osszetevokItalonkent.get(ital.id) || []) : [];
    kontener.replaceChildren(...recept.map((item, index) => {
        const sor = ujElem('div', 'koktel-sor' + (index < recept.length - 1 ? ' koktel-sor-elvalaszto' : ''));
        const egyseg = item.egyseg || (ital.recept_mod === 'arany' ? 'rész' : '');
        sor.append(
            ujElem('span', 'koktel-nev', item.nev),
            ujElem('span', 'koktel-mennyiseg', `${item.mennyiseg ?? ''} ${egyseg}`.trim())
        );
        return sor;
    }));
    if (doboz) doboz.hidden = recept.length === 0;

    const szerkesztesGomb = document.getElementById('modal-szerkesztes-gomb');
    if (szerkesztesGomb) szerkesztesGomb.hidden = !window.goatsAuth?.isSuperadmin?.();

    document.getElementById('modal-hatter').hidden = false;
}

// ---------- Szerkesztés (superadmin): a kinagyított ital adatainak módosítása ----------

function nyisdSzerkesztesModal() {
    if (!aktivItalAdat || !window.goatsAuth?.isSuperadmin?.()) return;
    const ital = aktivItalAdat;
    szerkesztettItalId = ital.id;
    modalBezár();

    document.getElementById('uj-ital-modal-cim').textContent = 'Ital szerkesztése';
    document.getElementById('uj-ital-mentes-gomb').textContent = 'Mentés';

    document.getElementById('uj-ital-nev').value = ital.nev || '';
    document.getElementById('uj-ital-kategoria').value = String(ital.kategoria_id);
    document.getElementById('uj-ital-szazalek').value = ital.alkohol_fok ?? '';
    document.getElementById('uj-ital-kiszereles').value = ital.kiszereles || 'dobozos';
    document.getElementById('uj-ital-teljes-nev').checked = !!ital.teljes_nev_mutatasa;
    frissitsTeljesNevGroup();
    kepMezokBeallit(ital);

    const mod = ital.recept_mod === 'pontos' ? 'pontos' : 'arany';
    aktualisMod = mod;
    document.getElementById('mode-arany-btn')?.classList.toggle('active', mod === 'arany');
    document.getElementById('mode-pontos-btn')?.classList.toggle('active', mod === 'pontos');

    const hozzavalokLista = document.getElementById('hozzavalok-lista');
    hozzavalokLista.replaceChildren();
    const recept = osszetevokItalonkent.get(ital.id) || [];
    recept.forEach(r => ujHozzavaloSor(r.mennyiseg ?? '', r.egyseg || 'dl', r.nev || ''));

    // Beállítja a láthatóságokat (alkoholfok/kiszerelés/recept-rész), és ha recept-es kategória,
    // de nincs mentett hozzávaló, indít egy üres sorral
    kategoriaValtozasCheck();

    document.getElementById('uj-ital-modal').hidden = false;
}

// A kártya adatainak frissítése a meglévő DOM-elemen, helyben - nem mozgatja ki a már rangsorolt
// italt a tier-dobozból, csak a még a forrás-dobozban lévőket teszi át az (esetleg módosult) kategóriájukba.
function frissitsItalKartyaDOM(italId, ital) {
    const kartya = document.getElementById(`ital-${italId}`);
    if (!kartya) return;

    const fo = K().kategoria(ital.kategoria_id) || K().fo.find(f => f.kod === 'egyeb') || K().fo[0];
    const al = K().alkategoria(ital);
    const kepAdat = { ...ital, kategoria: fo.kod, ikon: fo.ikon };

    kartya.dataset.kategoria = fo.kod;
    kartya.dataset.alkategoria = al ? al.kod : '';
    kartya.dataset.vanAlcsoport = K().alkategoriai(fo.id).length > 0 ? '1' : '0';
    kartya.dataset.zeroSzuro = fo.zero_szuro ? '1' : '0';
    kartya.dataset.zero = K().zero(ital) ? '1' : '0';
    kartya.classList.toggle('kisebb-kiszereles', kisebbKiszereles(ital));
    kartya.dataset.nev = ital.nev || '';

    const regiKep = kartya.querySelector('img, .ital-ikon, .ital-szinezett');
    const ujKep = window.italKep.elemLetrehoz(kepAdat);
    if (regiKep) regiKep.replaceWith(ujKep); else kartya.insertBefore(ujKep, kartya.firstChild);

    const felirat = kartya.querySelector('.ital-nev');
    if (felirat) {
        felirat.textContent = megjelenitettNev(ital.nev, ital.teljes_nev_mutatasa);
        felirat.title = ital.nev || '';
    }

    // Ha még nincs rangsorolva (a forrás-dobozban van), a kategóriaváltozás miatt a megfelelő helyre kerül
    if (!kartya.closest('.ranglista-dropzone')) {
        const ujCel = forrasKontener(kartya);
        if (ujCel && ujCel !== kartya.parentElement) ujCel.appendChild(kartya);
        if (kartya.parentElement) rendezKartyakatContainerben(kartya.parentElement);
    }

    aktivItalAdat = ital;
}

window.addEventListener('DOMContentLoaded', inicializalas);
