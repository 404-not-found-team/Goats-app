let maiDatum = new Date();
let meglatogatottEv = maiDatum.getFullYear();
let meglatogatottHonap = maiDatum.getMonth(); // 0 - 11
let esemenyekListaja = [];

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

    const modal = document.getElementById('esemeny-modal');
    document.getElementById('uj-esemeny-gomb')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'flex';
    });
    document.getElementById('close-esemeny-modal')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('ment-esemeny-btn')?.addEventListener('click', mentUjEsemeny);
}

async function betoltEsemenyek() {
    const groupCode = localStorage.getItem('goats_group_code');
    if (!groupCode) return;

    const { data, error } = await supabase
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

    // Hétfői kezdés igazítása (0 = Hétfő, 6 = Vasárnap)
    let elsoNapHetNapja = elsoNap.getDay() - 1;
    if (elsoNapHetNapja === -1) elsoNapHetNapja = 6;

    // Üres mezők a hónap első napja előtt
    for (let i = 0; i < elsoNapHetNapja; i++) {
        const uresDiv = document.createElement('div');
        uresDiv.className = 'naptar-nap ures';
        racs.appendChild(uresDiv);
    }

    // A hónap napjai
    for (let nap = 1; nap <= napokSzama; nap++) {
        const napDiv = document.createElement('div');
        napDiv.className = 'naptar-nap';

        const napSzamSpan = document.createElement('span');
        napSzamSpan.className = 'nap-szam';
        napSzamSpan.textContent = nap;
        napDiv.appendChild(napSzamSpan);

        // Mai nap kiemelése
        if (
            nap === maiDatum.getDate() &&
            meglatogatottHonap === maiDatum.getMonth() &&
            meglatogatottEv === maiDatum.getFullYear()
        ) {
            napDiv.classList.add('mai-nap');
        }

        // Formázott dátum az események egyezéséhez (YYYY-MM-DD)
        const honapFormatted = String(meglatogatottHonap + 1).padStart(2, '0');
        const napFormatted = String(nap).padStart(2, '0');
        const dString = `${meglatogatottEv}-${honapFormatted}-${napFormatted}`;

        // Események keresése erre a napra
        const napiEsemenyek = esemenyekListaja.filter(e => e.datum === dString);
        napiEsemenyek.forEach(es => {
            const esemeinyBadge = document.createElement('div');
            esemeinyBadge.className = 'naptar-esemeny';
            esemeinyBadge.textContent = es.cim;
            esemeinyBadge.title = es.cim;

            // Törlés gomb rá
            esemeinyBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Törlöd ezt az eseményt: "${es.cim}"?`)) {
                    torolEsemeny(es.id);
                }
            });

            napDiv.appendChild(esemeinyBadge);
        });

        racs.appendChild(napDiv);
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

    const { data, error } = await supabase
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
    const { error } = await supabase
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