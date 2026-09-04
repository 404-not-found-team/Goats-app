const Vodkak = [
    "Absolut.png", "Absolut Citron.png", "Absolut Mango.png", "Absolut Passionfruit.png", "Absolut Pears.png",
    "Absolut Raspberry.png", "Absolut Tabasco.png", "Absolut Vanilia.png", "Absolut Watermelon.png",
    "Beluga Noble.png", "Belvedere.png", "Ciroc.png", "Ciroc Green Apple.png", "Ciroc Mango.png",
    "Euphoria Cannabis.png", "Euphoria Cocaine.png", "Finlandia.png", "Finlandia Cranberry.png", "Finlandia Cucumber & Mint.png",
    "Finlandia Grapefruit.png", "Finlandia Coconut.png", "Finlandia Lime.png", "Finlandia Redberry.png",
    "Finlandia Wildberry & Rose.png", "Grey Goose.png", "Royal.png", "Royal Szilva.png", "Royal Sárgabarack.png", "Royal Mogyoró.png",
    "Royal Meggy.png", "Royal Mangó-Maracuja.png", "Royal Málna.png", "Royal Kávé.png", "Royal Kaktusz.png", "Royal Feketeribizli.png", "Royal Citrom.png",
    "Royal Bitter.png", "Royal Alma.png",
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
    "Jägermeister.png", "Jägermeister Orange.png", "Jägermeister Scharf.png", "Jägermeister Manifest.png", "Jägermeister Cold Brew Coffee.png"
];

const Sorok = ["Coors.png", "Kőbányai.png", "Guinness.png", "Miller.png", "Miller Lime.png", "Dreher Gold.png", "Dreher Meggy.png", "Dreher Citrus.png", "Dreher Bak.png",
    "Dreher Hideg Komlós.png", "Dreher Session Ipa.png", "Soproni Lager.png", "Soproni Ipa.png", "Soproni Démon.png", "Soproni Apa.png", "Soproni Citrus.png", "Soproni Meggy.png", "Heineken.png",
    "Desperados.png", "1664 Blanc.png", "1664 Rosé.png", "Arany Ászok.png", "Arany Fácán.png", "Borsodi Ipa.png", "Borsodi Világos.png", "Budweiser Budvar.png", "Gösser Premium.png", "Kozel.png", "Löwenbrau.png",
    "Pécsi Sör.png", "Peroni.png", "Staropramen.png", "Steffl.png", "Stella Artois.png",];

const Ciderek = ["Somersby Blueberry.png", "Somersby Mango & Lime.png", "Somersby Orange Spritz.png", "Somersby Pear.png", "Somersby Raspberry & Lime.png", "Somersby Sour Cherry.png",
    "Somersby Watermelon.png", "Strongbow Gold Apple.png",];

const Borok = ["Figula Rosé száraz.png","Hugo Spritz Málna.png","Hugo Spritz mangó & őszibarack.png"];

const Froccsok = ["Bakteranyós.png", "Borcsi Fröccs.png", "Háziúr.png", "Házmester.png", "Hosszúlépés.png", "Kisfröccs.png", "Nagyfröccs.png", "Permet.png", "Sport.png", "Vice-házmester.png"];

const Italok = [];

let aktivElemId = null;

async function inicializalas() {
    const vodkaListaDiv = document.getElementById('vodkaLista');
    const whiskeyListaDiv = document.getElementById('whiskeyLista');
    const likorListaDiv = document.getElementById('likorLista');
    const bitterListaDiv = document.getElementById('bitterLista');
    const sorListaDiv = document.getElementById('sorLista');
    const ciderListaDiv = document.getElementById('ciderLista');
    const borListaDiv = document.getElementById('borLista');
    const froccsListaDiv = document.getElementById('froccsLista');
    const italListaDiv = document.getElementById('italLista');

    const kepeketGeneral = (lista, mappa, szuloDiv, prefix) => {
        if (!szuloDiv) return;
        lista.forEach((fajlNev, index) => {
            const kartya = document.createElement('div');
            kartya.className = 'ital-kartya';
            kartya.id = `${prefix}-${index}`;

            const img = document.createElement('img');
            img.src = `Images/Ranglista/${mappa ? mappa + '/' : ''}${fajlNev}`;
            img.alt = fajlNev;

            const nevCsak = fajlNev.substring(0, fajlNev.lastIndexOf('.'));
            const felirat = document.createElement('span');
            felirat.className = 'ital-nev';
            felirat.textContent = nevCsak;

            kartya.appendChild(img);
            kartya.appendChild(felirat);

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
    kepeketGeneral(Sorok, 'Sor', sorListaDiv, 'sor');
    kepeketGeneral(Ciderek, 'Cider', ciderListaDiv, 'cider');
    kepeketGeneral(Borok, 'Bor', borListaDiv, 'bor');
    kepeketGeneral(Froccsok, 'Froccs', froccsListaDiv, 'froccs');
    kepeketGeneral(Italok, '', italListaDiv, 'egyeb');

    // Mentett adatok betöltése Supabase-ből
    const { data, error } = await _supabase.from('ital_ranglista').select('*');

    if (error) {
        console.error('Hiba az adatok betöltésekor:', error);
        frissitsSzamlalokat();
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
                    else if (prefix === 'sor') celZona = sorListaDiv;
                    else if (prefix === 'bor') celZona = borListaDiv;
                    else if (prefix === 'froccs') celZona = froccsListaDiv;
                    else if (prefix === 'cider') celZona = ciderListaDiv;
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

    // Számlálók frissítése betöltés után
    frissitsSzamlalokat();
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
        else if (prefix === 'sor') celZona = document.getElementById('sorLista');
        else if (prefix === 'bor') celZona = document.getElementById('borLista');
        else if (prefix === 'froccs') celZona = document.getElementById('froccsLista');
        else if (prefix === 'cider') celZona = document.getElementById('ciderLista');
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

    // Számlálók frissítése áthelyezés után
    frissitsSzamlalokat();
    modalBezár();
}

function modalBezár() {
    document.getElementById('modal-hatter').style.display = 'none';
    aktivElemId = null;
}

function frissitsSzamlalokat() {
    const kategóriak = [
        { lista: Vodkak.length, elem: document.getElementById('vodkaLista'), szamlalo: document.getElementById('szamlalo-vodka') },
        { lista: Whiskeyk.length, elem: document.getElementById('whiskeyLista'), szamlalo: document.getElementById('szamlalo-whiskey') },
        { lista: Likorok.length, elem: document.getElementById('likorLista'), szamlalo: document.getElementById('szamlalo-likor') },
        { lista: Bitterek.length, elem: document.getElementById('bitterLista'), szamlalo: document.getElementById('szamlalo-bitter') },
        { lista: Sorok.length, elem: document.getElementById('sorLista'), szamlalo: document.getElementById('szamlalo-sor') },
        { lista: Ciderek.length, elem: document.getElementById('ciderLista'), szamlalo: document.getElementById('szamlalo-cider') },
        { lista: Borok.length, elem: document.getElementById('borLista'), szamlalo: document.getElementById('szamlalo-bor') },
        { lista: Froccsok.length, elem: document.getElementById('froccsLista'), szamlalo: document.getElementById('szamlalo-froccs') },
        { lista: Italok.length, elem: document.getElementById('italLista'), szamlalo: document.getElementById('szamlalo-egyeb') }
    ];

    kategóriak.forEach(kat => {
        if (kat.szamlalo && kat.elem) {
            const jelenlegiDb = kat.elem.getElementsByClassName('ital-kartya').length;
            kat.szamlalo.textContent = `${jelenlegiDb} / ${kat.lista}`;

            const doboz = kat.elem.closest('.forras-doboz');

            if (doboz) {
                if (jelenlegiDb === 0) {
                    kat.elem.style.display = 'none';
                    doboz.style.display = 'none';
                } else {
                    kat.elem.style.display = 'flex';
                }
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', inicializalas);