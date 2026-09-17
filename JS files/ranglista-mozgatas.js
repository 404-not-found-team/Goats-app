let aktivElemId = null;

async function inicializalas() {
    const groupCode = localStorage.getItem('goats_group_code');

    // 1. Katalógus betöltése a Supabase ital_katalogus táblájából
    const { data: katalogus, error: katError } = await _supabase
        .from('ital_katalogus')
        .select('*')
        .eq('jovahagyva', true);

    if (katError) {
        console.error('Hiba a katalógus betöltésekor:', katError);
        return;
    }

    // 2. Kártyák legyártása a forrás kategória dobozokba
    katalogus.forEach(ital => {
        const celListaDiv = getListaDivByKategoria(ital.kategoria);
        if (!celListaDiv) return;

        const kartya = document.createElement('div');
        kartya.className = 'ital-kartya';
        kartya.id = `ital-${ital.id}`;
        kartya.dataset.kategoria = ital.kategoria;

        const img = document.createElement('img');
        img.src = ital.kep_url;
        img.alt = ital.nev;

        const felirat = document.createElement('span');
        felirat.className = 'ital-nev';
        felirat.textContent = ital.nev;

        kartya.appendChild(img);
        kartya.appendChild(felirat);

        kartya.addEventListener('click', () => {
            aktivElemId = kartya.id;
            document.getElementById('modal-kep').src = img.src;
            document.getElementById('modal-nev').textContent = ital.nev;
            document.getElementById('modal-hatter').style.display = 'flex';
        });

        celListaDiv.appendChild(kartya);
    });

    // Kezdő darabszámok mentése a számlálókhoz
    document.querySelectorAll('.forras-doboz').forEach(doboz => {
        const listaDiv = doboz.querySelector('.ital-lista');
        if (listaDiv) {
            const kezdodb = listaDiv.getElementsByClassName('ital-kartya').length;
            doboz.setAttribute('data-osszes', kezdodb);
        }
    });

    // 3. MENTETT ADATOK BETÖLTÉSE (Csak miután az összes kártya bekerült a DOM-ba!)
    if (groupCode) {
        const { data: mentettAdatok, error: rangError } = await _supabase
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
                        // Keresés több lehetséges HTML struktúrára felkészülve:
                        // 1. .ranglista-dropzone[data-kategoria="A"]
                        // 2. [data-kategoria="A"] .tier-tartalom / .dropzone
                        // 3. #tier-A
                        celZona = document.querySelector(`[data-kategoria="${item.kategoria}"] .tier-tartalom`) ||
                                  document.querySelector(`[data-kategoria="${item.kategoria}"] .ranglista-dropzone`) ||
                                  document.querySelector(`.ranglista-dropzone[data-kategoria="${item.kategoria}"]`) ||
                                  document.querySelector(`[data-kategoria="${item.kategoria}"]`) ||
                                  document.getElementById(`tier-${item.kategoria}`);
                    }

                    if (celZona) {
                        celZona.appendChild(kartyaElem);
                    } else {
                        console.warn(`Nem található célzóna a(z) ${item.kategoria} kategóriához!`);
                    }
                } else {
                    console.warn(`Nem található kártya a DOM-ban ezzel az ID-val: ${item.id}`);
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
            const { error } = await _supabase
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
}

function getListaDivByKategoria(kategoria) {
    const kat = kategoria ? kategoria.toLowerCase() : 'egyeb';
    switch (kat) {
        case 'vodka': return document.getElementById('vodkaLista');
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
        default: return document.getElementById('italLista');
    }
}

function frissitsSzamlalokat() {
    const forrasDobozok = document.querySelectorAll('.forras-doboz');

    forrasDobozok.forEach(doboz => {
        const listaDiv = doboz.querySelector('.ital-lista');
        const szamlalo = doboz.querySelector('.forras-fejlec span') || doboz.querySelector('.szamlalo');

        if (listaDiv) {
            const jelenlegiDb = listaDiv.getElementsByClassName('ital-kartya').length;
            const osszesDb = doboz.getAttribute('data-osszes') || jelenlegiDb;

            if (szamlalo) {
                szamlalo.textContent = `${jelenlegiDb} / ${osszesDb}`;
            }

            if (parseInt(jelenlegiDb) === 0) {
                doboz.style.display = 'none';
            } else {
                doboz.style.display = 'block';
                listaDiv.style.display = 'flex';
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', inicializalas);