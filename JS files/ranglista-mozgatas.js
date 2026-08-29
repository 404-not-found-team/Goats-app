const Vodkak = [
    "ab-citrom.png", "ab-mango.png", "ab-passionfruit.png", "ab-pear.png",
    "ab-raspbery.png", "ab-tabasco.png", "ab-vanilia.png", "ab-watermelon.png",
    "beluga.png", "belveder.png", "cr-apple.png", "cr-mango.png", "cr.png",
    "euphoria-ca.png", "euphoria-co.png", "fl-cranberry.png", "fl-cucumber.png",
    "fl-grapefruit.png", "fl-kókusz.png", "fl-lime.png", "fl-redberry.png",
    "fl-wildberry.png", "grey-goose.png"
];

const Whiskeyk = [
    "ballantines.png", "ballantines-sunshine.png", "chivas.png", "jack-daniels.png",
    "jameson.png", "jameson-black-barrel.png", "jameson-tripple-tripple.png",
    "jb-apple.png", "jb-cherry.png", "jb-honey.png", "jb-peach.png", "jb-pineapple.png",
    "jd-apple.png", "jd-blackberry.png", "jd-fire.png", "jd-tennessee-honey.png",
    "jim-beam.png", "jw-black.png", "jw-red.png", "southern-comfort.png"
];

const Likorok = [
    "tatra-22.png", "tatra-32.png", "tatra-35.png", "tatra-37.png", "tatra-42.png",
    "tatra-47.png", "tatra-52.png", "tatra-57.png", "tatra-62.png", "tatra-67.png",
    "tatra-72.png"
];

const Bitterek = [
    "jager.png", "jager-narancs.png"
];

const Italok = [];

let aktivElemId = null;

async function inicializalas() {
    const vodkaListaDiv = document.getElementById('vodkaLista');
    const whiskeyListaDiv = document.getElementById('whiskeyLista');
    const likorListaDiv = document.getElementById('likorLista');
    const bitterListaDiv = document.getElementById('bitterLista');
    const italListaDiv = document.getElementById('italLista');

    const kepeketGeneral = (lista, mappa, szuloDiv, prefix) => {
        lista.forEach((fajlNev, index) => {
            // Létrehozunk egy kis kártyát a képnek és a szövegnek
            const kartya = document.createElement('div');
            kartya.className = 'ital-kartya';
            kartya.id = `${prefix}-${index}`; // Az ID most a kártyára kerül

            const img = document.createElement('img');
            img.src = `Images/Ranglista/${mappa ? mappa + '/' : ''}${fajlNev}`;
            img.alt = fajlNev;

            // Szöveg kiszedése (pl. "jack-daniels.png" -> "jack-daniels")
            const nevCsak = fajlNev.substring(0, fajlNev.lastIndexOf('.'));
            const felirat = document.createElement('span');
            felirat.className = 'ital-nev';
            felirat.textContent = nevCsak;

            kartya.appendChild(img);
            kartya.appendChild(felirat);

            // Kattintásra megnyitja a modalt
            kartya.addEventListener('click', () => {
                aktivElemId = kartya.id;
                document.getElementById('modal-kep').src = img.src;
                document.getElementById('modal-nev').textContent = nevCsak;
                document.getElementById('modal-hatter').style.display = 'flex';
            });

            szuloDiv.appendChild(kartya);
        });
    };

    kepeketGeneral(Vodkak, 'Vodka', vodkaListaDiv, 'vodka');
    kepeketGeneral(Whiskeyk, 'Whiskey', whiskeyListaDiv, 'whiskey');
    kepeketGeneral(Likorok, 'Likor', likorListaDiv, 'likor');
    kepeketGeneral(Bitterek, 'Bitter', bitterListaDiv, 'bitter');
    kepeketGeneral(Italok, '', italListaDiv, 'egyeb');

    // Mentett adatok betöltése Supabase-ből
    const { data, error } = await _supabase.from('ital_ranglista').select('*');
    
    if (error) {
        console.error('Hiba az adatok betöltésekor:', error);
        return;
    }

    if (data) {
        data.forEach(item => {
            const kartyaElem = document.getElementById(item.id);
            if (kartyaElem) {
                let celZona;
                if (item.kategoria === 'forras') {
                    const prefix = item.id.split('-')[0];
                    if (prefix === 'vodka') celZona = vodkaListaDiv;
                    else if (prefix === 'whiskey') celZona = whiskeyListaDiv;
                    else if (prefix === 'likor') celZona = likorListaDiv;
                    else if (prefix === 'bitter') celZona = bitterListaDiv;
                    else celZona = italListaDiv;
                } else {
                    celZona = document.querySelector(`.ranglista-dropzone[data-kategoria="${item.kategoria}"]`);
                }

                if (celZona) {
                    celZona.appendChild(kartyaElem);
                }
            }
        });
    }
}

async function kategoriatValaszt(kategoriaNev) {
    if (!aktivElemId) return;

    const kartyaElem = document.getElementById(aktivElemId);
    let celZona;

    if (kategoriaNev === 'forras') {
        const prefix = aktivElemId.split('-')[0];
        if (prefix === 'vodka') celZona = document.getElementById('vodkaLista');
        else if (prefix === 'whiskey') celZona = document.getElementById('whiskeyLista');
        else if (prefix === 'likor') celZona = document.getElementById('likorLista');
        else if (prefix === 'bitter') celZona = document.getElementById('bitterLista');
        else celZona = document.getElementById('italLista');
    } else {
        celZona = document.querySelector(`.ranglista-dropzone[data-kategoria="${kategoriaNev}"]`);
    }

    if (kartyaElem && celZona) {
        celZona.appendChild(kartyaElem);

        const { error } = await _supabase
            .from('ital_ranglista')
            .upsert({ id: aktivElemId, kategoria: kategoriaNev });

        if (error) {
            console.error('Hiba a mentés során:', error);
        }
    }

    modalBezár();
}

function modalBezár() {
    document.getElementById('modal-hatter').style.display = 'none';
    aktivElemId = null;
}

window.addEventListener('DOMContentLoaded', inicializalas);