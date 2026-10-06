let maiDatum = new Date();
let meglatogatottEv = maiDatum.getFullYear();
let meglatogatottHonap = maiDatum.getMonth(); // 0 - 11
let esemenyekListaja = [];
let aktivEsemeny = null;
let kivalasztottDatumString = '';

const honapNevek = [
    "Január", "Február", "Március", "Április", "Május", "Június",
    "Július", "Augusztus", "Szeptember", "Október", "November", "December"
];

document.addEventListener('DOMContentLoaded', () => {
    initNaptar();
});

function aktualisGroupCode() {
    return window.goatsAuth?.getState()?.group?.group_code || localStorage.getItem('goats_group_code');
}

async function initNaptar() {
    setupGombok();
    if (window.goatsAuth) await window.goatsAuth.ready;
    await betoltEsemenyek();
    kirajzolNaptar();
}

function setupGombok() {
    document.getElementById('elozo-honap-btn')?.addEventListener('click', () => {
        meglatogatottHonap--;
        if (meglatogatottHonap < 0) {
            meglatogatottHonap = 11;
            meglatogatottEv--;
        }
        kirajzolNaptar();
    });

    document.getElementById('kovetkezo-honap-btn')?.addEventListener('click', () => {
        meglatogatottHonap++;
        if (meglatogatottHonap > 11) {
            meglatogatottHonap = 0;
            meglatogatottEv++;
        }
        kirajzolNaptar();
    });

    // Új esemény gomb a főoldalon
    document.getElementById('uj-esemeny-gomb')?.addEventListener('click', () => {
        const modal = document.getElementById('esemeny-modal');
        if (modal) modal.hidden = false;
    });
    document.getElementById('close-esemeny-modal')?.addEventListener('click', () => {
        const modal = document.getElementById('esemeny-modal');
        if (modal) modal.hidden = true;
    });
    document.getElementById('ment-esemeny-btn')?.addEventListener('click', mentUjEsemeny);

    // Napi áttekintő modal bezárása
    document.getElementById('close-napi-esemenyek-modal')?.addEventListener('click', () => {
        document.getElementById('napi-esemenyek-modal').hidden = true;
    });

    // Új esemény hozzáadása a napi áttekintőből
    document.getElementById('napi-uj-esemeny-btn')?.addEventListener('click', () => {
        document.getElementById('napi-esemenyek-modal').hidden = true;
        const datumInput = document.getElementById('esemeny-datum-input');
        if (datumInput) datumInput.value = kivalasztottDatumString;
        document.getElementById('esemeny-modal').hidden = false;
    });

    // Szerkesztő modal gombjai
    document.getElementById('close-esemeny-reszletek-modal')?.addEventListener('click', () => {
        document.getElementById('esemeny-reszletek-modal').hidden = true;
    });

    document.getElementById('modosit-esemeny-btn')?.addEventListener('click', modositEsemeny);
    document.getElementById('torol-esemeny-btn')?.addEventListener('click', () => {
        if (aktivEsemeny && confirm(`Biztosan törlöd ezt az eseményt: "${aktivEsemeny.cim}"?`)) {
            torolEsemeny(aktivEsemeny.id);
            document.getElementById('esemeny-reszletek-modal').hidden = true;
        }
    });
}

async function betoltEsemenyek() {
    const groupCode = aktualisGroupCode();
    if (!groupCode) return;

    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const { data, error } = await client
        .from('esemenyek')
        .select('*')
        .eq('group_code', groupCode);

    if (error) {
        console.error('Hiba az események betöltésekor:', error);
        return;
    }

    esemenyekListaja = data || [];
}

function kirajzolNaptar() {
    const honapNevElem = document.getElementById('naptar-honap-nev');
    const racs = document.getElementById('naptar-rács');
    if (!racs || !honapNevElem) return;

    honapNevElem.textContent = `${meglatogatottEv} ${honapNevek[meglatogatottHonap]}`;
    racs.innerHTML = '';

    const elsoNap = new Date(meglatogatottEv, meglatogatottHonap, 1);
    const utolsoNap = new Date(meglatogatottEv, meglatogatottHonap + 1, 0);
    const napokSzama = utolsoNap.getDate();

    let elsoNapHetNapja = elsoNap.getDay() - 1;
    if (elsoNapHetNapja === -1) elsoNapHetNapja = 6;

    for (let i = 0; i < elsoNapHetNapja; i++) {
        const uresDiv = document.createElement('div');
        uresDiv.className = 'naptar-nap ures';
        racs.appendChild(uresDiv);
    }

    for (let nap = 1; nap <= napokSzama; nap++) {
        const napDiv = document.createElement('div');
        napDiv.className = 'naptar-nap';

        const napSzamSpan = document.createElement('span');
        napSzamSpan.className = 'nap-szam';
        napSzamSpan.textContent = nap;
        napDiv.appendChild(napSzamSpan);

        if (
            nap === maiDatum.getDate() &&
            meglatogatottHonap === maiDatum.getMonth() &&
            meglatogatottEv === maiDatum.getFullYear()
        ) {
            napDiv.classList.add('mai-nap');
        }

        const honapFormatted = String(meglatogatottHonap + 1).padStart(2, '0');
        const napFormatted = String(nap).padStart(2, '0');
        const dString = `${meglatogatottEv}-${honapFormatted}-${napFormatted}`;

        const napiEsemenyek = esemenyekListaja.filter(e => e.datum === dString);

        // Kirajzoljuk a badge-eket a cellában
        napiEsemenyek.forEach(es => {
            const esemeinyBadge = document.createElement('div');
            esemeinyBadge.className = 'naptar-esemeny';
            esemeinyBadge.textContent = es.cim;
            esemeinyBadge.title = es.cim;
            napDiv.appendChild(esemeinyBadge);
        });

        // KATTINTÁS A NAPRA -> NAPI ÁTTEKINTŐ MODAL MEGNYITÁSA
        napDiv.addEventListener('click', () => {
            nyisdNapiEsemenyeket(dString, napiEsemenyek);
        });

        racs.appendChild(napDiv);
    }
}

// Napi áttekintő modal feltöltése és megnyitása
function nyisdNapiEsemenyeket(dString, napiEsemenyek) {
    kivalasztottDatumString = dString;
    const modal = document.getElementById('napi-esemenyek-modal');
    const cimElem = document.getElementById('napi-modal-cím');
    const listaDiv = document.getElementById('napi-esemenyek-lista');

    if (cimElem) cimElem.textContent = `${dString} eseményei`;
    if (listaDiv) {
        listaDiv.innerHTML = '';

        if (napiEsemenyek.length === 0) {
            const uzenet = document.createElement('p');
            uzenet.className = 'ures-uzenet';
            uzenet.textContent = 'Nincsenek események ezen a napon.';
            listaDiv.replaceChildren(uzenet);
        } else {
            napiEsemenyek.forEach(es => {
                const elem = document.createElement('div');
                elem.className = 'naptar-esemeny-sor';

                const cimSpan = document.createElement('span');
                cimSpan.textContent = es.cim;

                const szerkesztesSpan = document.createElement('span');
                szerkesztesSpan.className = 'szerkesztes-jel';
                szerkesztesSpan.textContent = 'Szerkesztés ✏️';

                elem.appendChild(cimSpan);
                elem.appendChild(szerkesztesSpan);

                // Kattintásra megnyílik a módosítás/törlés modal
                elem.addEventListener('click', () => {
                    modal.hidden = true;
                    nyisdEsemenySzerkesztest(es);
                });

                listaDiv.appendChild(elem);
            });
        }
    }

    if (modal) modal.hidden = false;
}

// Szerkesztő modal megnyitása
function nyisdEsemenySzerkesztest(esemeiny) {
    aktivEsemeny = esemeiny;
    const modal = document.getElementById('esemeny-reszletek-modal');
    const cimInput = document.getElementById('szerkeszt-esemeny-cim');
    const datumInput = document.getElementById('szerkeszt-esemeny-datum');

    if (modal && cimInput && datumInput) {
        cimInput.value = esemeiny.cim;
        datumInput.value = esemeiny.datum;
        modal.hidden = false;
    }
}

async function modositEsemeny() {
    if (!aktivEsemeny) return;

    const cimInput = document.getElementById('szerkeszt-esemeny-cim');
    const datumInput = document.getElementById('szerkeszt-esemeny-datum');

    const ujCim = cimInput ? cimInput.value.trim() : '';
    const ujDatum = datumInput ? datumInput.value : '';

    if (!ujCim || !ujDatum) {
        return alert('Adj meg címet és dátumot!');
    }

    try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;

        const { data, error } = await client
            .from('esemenyek')
            .update({ cim: ujCim, datum: ujDatum })
            .eq('id', aktivEsemeny.id)
            .select();

        if (error) {
            console.error('❌ Supabase frissítési hiba:', error);
            alert(`Hiba a módosításkor: ${error.message}`);
            return;
        }

        const index = esemenyekListaja.findIndex(e => e.id === aktivEsemeny.id);
        if (index !== -1) {
            esemenyekListaja[index].cim = ujCim;
            esemenyekListaja[index].datum = ujDatum;
        }

        document.getElementById('esemeny-reszletek-modal').hidden = true;
        kirajzolNaptar();
    } catch (err) {
        console.error('Kivétel történt:', err);
        alert('Váratlan hiba történt a módosítás során!');
    }
}

async function mentUjEsemeny() {
    const groupCode = aktualisGroupCode();
    const cimInput = document.getElementById('esemeny-cim-input');
    const datumInput = document.getElementById('esemeny-datum-input');

    if (!groupCode) return alert('Lépj be egy csoportba!');
    if (!cimInput.value.trim() || !datumInput.value) {
        return alert('Adj meg címet és dátumot!');
    }

    const újEsemeny = {
        group_code: groupCode,
        cim: cimInput.value.trim(),
        datum: datumInput.value
    };

    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const { data, error } = await client
        .from('esemenyek')
        .insert([újEsemeny])
        .select();

    if (error) {
        console.error('Hiba a mentésnél:', error);
        alert('Hiba történt a mentéskor!');
        return;
    }

    if (data) esemenyekListaja.push(data[0]);

    cimInput.value = '';
    datumInput.value = '';
    document.getElementById('esemeny-modal').hidden = true;

    kirajzolNaptar();
}

async function torolEsemeny(id) {
    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const { error } = await client
        .from('esemenyek')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Hiba a törlésnél!');
        return;
    }

    esemenyekListaja = esemenyekListaja.filter(e => e.id !== id);
    kirajzolNaptar();
}