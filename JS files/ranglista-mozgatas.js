const Vodkak = [
    "Absolut.png", "Absolut Citron.png", "Absolut Mango.png", "Absolut Passionfruit.png", "Absolut Pears.png",
    "Absolut Raspberry.png", "Absolut Tabasco.png", "Absolut Vanilia.png", "Absolut Watermelon.png",
    "Beluga Noble.png", "Belvedere.png", "Ciroc.png", "Ciroc Green Apple.png", "Ciroc Mango.png",
    "Euphoria Cannabis.png", "Euphoria Cocaine.png", "Finlandia.png", "Finlandia Cranberry.png", "Finlandia Cucumber & Mint.png",
    "Finlandia Grapefruit.png", "Finlandia Coconut.png", "Finlandia Lime.png", "Finlandia Redberry.png",
    "Finlandia Wildberry & Rose.png", "Grey Goose.png"
];

const Whiskeyk = [
    "Ballantines.png", "Ballantines Sunshine.png", "Chivas Regal.png",
    "Jameson.png", "Jameson Black Barrel.png", "Jameson Tripple Tripple.png", "Jim Beam.png",
    "Jim Beam Apple.png", "Jim Beam Black Cherry.png", "Jim Beam Honey.png", "Jim Beam Peach.png", "Jim Beam Pineapple.png", "Jack Daniels.png",
    "Jack Daniels Apple.png", "Jack Daniels Blackberry.png", "Jack Daniels Fire.png", "Jack Daniels Tennessee Honey.png",
    "Johnnie Walker Black.png", "Johnnie Walker Red.png", "Southern Comfort.png"
];

const Likorok = [
    "Tatratea Coconut 22.png", "Tatratea Citrus 32.png", "Tatratea Original Light 35.png", "Tatratea Hibiscus & Red 37.png", "Tatratea Peach 42.png",
    "Tatratea Flower 47.png", "Tatratea Original 52.png", "Tatratea Homoktövis Csipkebogyó 57.png", "Tatratea Forest Fruit 62.png", "Tatratea Apple & Pear 67.png",
    "Tatratea Betyáros 72.png"
];

const Bitterek = [
    "Jägermeister.png", "Jägermeister Orange.png"
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