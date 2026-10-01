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

async function initNaptar() {
    setupGombok();
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
        if (modal) modal.style.display = 'flex';
    });
    document.getElementById('close-esemeny-modal')?.addEventListener('click', () => {
        const modal = document.getElementById('esemeny-modal');
        if (modal) modal.style.display = 'none';
    });
    document.getElementById('ment-esemeny-btn')?.addEventListener('click', mentUjEsemeny);

    // Napi áttekintő modal bezárása
    document.getElementById('close-napi-esemenyek-modal')?.addEventListener('click', () => {
        document.getElementById('napi-esemenyek-modal').style.display = 'none';
    });

    // Új esemény hozzáadása a napi áttekintőből
    document.getElementById('napi-uj-esemeny-btn')?.addEventListener('click', () => {
        document.getElementById('napi-esemenyek-modal').style.display = 'none';
        const datumInput = document.getElementById('esemeny-datum-input');
        if (datumInput) datumInput.value = kivalasztottDatumString;
        document.getElementById('esemeny-modal').style.display = 'flex';
    });

    // Szerkesztő modal gombjai
    document.getElementById('close-esemeny-reszletek-modal')?.addEventListener('click', () => {
        document.getElementById('esemeny-reszletek-modal').style.display = 'none';
    });

    document.getElementById('modosit-esemeny-btn')?.addEventListener('click', modositEsemeny);
    document.getElementById('torol-esemeny-btn')?.addEventListener('click', () => {
        if (aktivEsemeny && confirm(`Biztosan törlöd ezt az eseményt: "${aktivEsemeny.cim}"?`)) {
            torolEsemeny(aktivEsemeny.id);
            document.getElementById('esemeny-reszletek-modal').style.display = 'none';
        }
    });
}

async function betoltEsemenyek() {
    const groupCode = localStorage.getItem('goats_group_code');
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
            listaDiv.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Nincsenek események ezen a napon.</p>';
        } else {
            napiEsemenyek.forEach(es => {
                const elem = document.createElement('div');
                elem.style.cssText = `
                    background: var(--inner-bg);
                    border: 1px solid var(--border-color);
                    padding: 10px 14px;
                    border-radius: 8px;
                    color: var(--text-primary);
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                `;
                elem.innerHTML = '';

                const cimSpan = document.createElement('span');
                cimSpan.textContent = es.cim;

                const szerkesztesSpan = document.createElement('span');
                szerkesztesSpan.style.cssText = 'font-size: 12px; color: var(--accent-color);';
                szerkesztesSpan.textContent = 'Szerkesztés ✏️';

                elem.appendChild(cimSpan);
                elem.appendChild(szerkesztesSpan);

                // Kattintásra megnyílik a módosítás/törlés modal
                elem.addEventListener('click', () => {
                    modal.style.display = 'none';
                    nyisdEsemenySzerkesztest(es);
                });

                listaDiv.appendChild(elem);
            });
        }
    }

    if (modal) modal.style.display = 'flex';
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
        modal.style.display = 'flex';
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

        document.getElementById('esemeny-reszletek-modal').style.display = 'none';
        kirajzolNaptar();
    } catch (err) {
        console.error('Kivétel történt:', err);
        alert('Váratlan hiba történt a módosítás során!');
    }
}

async function mentUjEsemeny() {
    const groupCode = localStorage.getItem('goats_group_code');
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
    document.getElementById('esemeny-modal').style.display = 'none';

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