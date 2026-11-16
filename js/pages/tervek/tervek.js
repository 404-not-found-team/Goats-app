import { betolt } from "../../segedek/adat-gyorsitotar.js";
import { tervekLekerese, tervHozzaadasa, tervTorlese, tervAllapotMentese } from './tervek-adat.js';
import { listaKirajzolasa } from './tervek-megjelenites.js';

window.addEventListener('load', async function () {
    document.getElementById('hozzaadTervBtn').addEventListener('click', add);
    if (window.goatsAuth) await window.goatsAuth.ready;
    loadTervek(true);
});

// aktualisGroupCode(): lásd js/segedek/csoport-kod.js (közös, minden klasszikus oldalscript használja)

// Oldalbetöltéskor (elsoBetoltes) előbb az utoljára látott lista jelenik meg azonnal, a friss a háttérben
// érkezik (js/segedek/adat-gyorsitotar.js); módosítás utáni újratöltésnél csak a friss
async function loadTervek(elsoBetoltes = false) {
    const lekero = () => tervekLekerese(aktualisGroupCode());
    const megjelenito = (data) => listaKirajzolasa(data, { torleskor: deleteTerv, pipalaskor: pipaMentese });
    await betolt('tervek', lekero, megjelenito, { taroltElobb: elsoBetoltes });
};

async function add() {
    const inputField = document.getElementById('tervInput');
    const szoveg = inputField.value.trim();

    if (szoveg === '') return;
    if (!await tervHozzaadasa(aktualisGroupCode(), szoveg)) return;

    inputField.value = '';
    loadTervek();
}

// Terv törlése Supabase-ből
async function deleteTerv(id) {
    if (!await tervTorlese(id, aktualisGroupCode())) {
        alert(tr('err_deleting', 'Hiba történt a törlés során!'));
        return;
    }
    loadTervek();
}

async function pipaMentese(id, kesz) {
    if (!await tervAllapotMentese(id, aktualisGroupCode(), kesz)) {
        return false;
    }
    loadTervek();
    return true;
}

