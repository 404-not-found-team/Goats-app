// Képek oldal (kepek.html): a csoport összes képe rácsban, feltöltéssel, törléssel és jelentéssel.
// A feltöltő neve és a dátum csak itt látszik; a főoldali galéria (js/pages/app/galeria.js) csak lapozható nézegető.
// Ez a vezérlő: az állapot (a képek listája) itt van, és ez köti össze az adatréteget (kepek-adat.js)
// a megjelenítéssel (kepek-megjelenites.js).
// - Feltöltés: négyzetes kivágás (js/pages/kepek/kepek-kivago.js), majd tömörítés (js/segedek/kep-tomorites.js);
//   mindkettő az első feltöltéskor töltődik be
// - Jelentés: a kep-jelentes Edge Function (public.jelentesek sor + másolat a privát "jelentett" bucketbe)
import { ready, getState, funkcioEngedelyezett } from '../../hitelesites.js';
import { torolKepGyorsitotarbol } from '../../segedek/kep-gyorsitotar.js';
import { funkcioGombTiltas, TILTVA_SZOVEG } from '../../segedek/funkcio-kapcsolo.js';
import { betolt, ir } from '../../segedek/adat-gyorsitotar.js';
import {
    kepekLekerese, kepTorlese, kepJelentese, kepKorlatLekerese, rlsHibaE, kepFeltoltese, kepSorRogzitese,
} from './kepek-adat.js';
import {
    racsKirajzolas, menukBezarasa, allapotMutat, allapotRejtesKesobb, feltoltesGombFoglalt,
    jelentesAblakNyitasa, jelentesAdatai, jelentesHibaMutatasa, jelentesKuldGomb, jelentesAblakZarasa,
} from './kepek-megjelenites.js';

const KORLAT_UZENET = tr('err_image_limit', 'A csoport elérte a képkorlátot, törölj régebbi képeket.');

let kepek = []; // { path, feltoltotteId, letrehozva }
let jelentendoUtvonal = null;

// amit a csempék menüpontjai hívnak (callbackek a megjelenítésnek)
const MUVELETEK = { torleskor: torolKep, jelenteskor: jelentesMegnyitas };

function aktualisCsoport() {
    return getState()?.group || null;
}

function kirajzolas() {
    racsKirajzolas(kepek, { tagok: getState()?.members || [], sajatId: getState()?.user?.id || null }, MUVELETEK);
}

// ---------- Listázás ----------

// Oldalbetöltéskor (elsoBetoltes) előbb az utoljára látott lista jelenik meg azonnal (a képek a helyi
// gyorsítótárból jönnek), a friss a háttérben érkezik (js/segedek/adat-gyorsitotar.js)
async function betoltKepek(elsoBetoltes = false) {
    const csoport = aktualisCsoport();
    if (!csoport) {
        kepek = [];
        kirajzolas();
        return;
    }

    await betolt('kepek', () => kepekLekerese(csoport), (adat) => {
        kepek = adat;
        kirajzolas();
    }, { taroltElobb: elsoBetoltes });
}

// ---------- Törlés ----------

async function torolKep(kep) {
    if (!confirm(tr('confirm_delete_picture', 'Biztosan törölni szeretnéd ezt a képet?'))) return;

    const hiba = await kepTorlese(kep.path);
    if (hiba) {
        alert(tr('err_delete_msg', 'Sikertelen törlés! Hiba: {msg}', { msg: hiba.message }));
        return;
    }

    await torolKepGyorsitotarbol(kep.path);
    kepek = kepek.filter(k => k.path !== kep.path);
    ir('kepek', kepek); // a következő betöltés se mutassa a törölt képet
    kirajzolas();
}

// ---------- Jelentés ----------

function jelentesMegnyitas(utvonal) {
    if (jelentesAblakNyitasa()) jelentendoUtvonal = utvonal;
}

async function jelentesKuldes(e) {
    e.preventDefault();
    const { ok, leiras } = jelentesAdatai();
    const csoport = aktualisCsoport();
    if (!ok) {
        jelentesHibaMutatasa(tr('err_report_reason', 'Válaszd ki a jelentés okát.'));
        return;
    }
    if (!csoport || !jelentendoUtvonal) return;

    jelentesKuldGomb(false);
    const hiba = await kepJelentese(csoport.id, jelentendoUtvonal, ok, leiras);
    jelentesKuldGomb(true);

    if (hiba) {
        // A beküldési szabály óránként legfeljebb 20 jelentést enged (a function "korlat" kóddal jelzi)
        jelentesHibaMutatasa(hiba.kod === 'korlat'
            ? tr('err_report_rate', 'Túl sok jelentést küldtél az elmúlt órában, próbáld újra később.')
            : tr('err_report_send', 'A jelentés beküldése nem sikerült, próbáld újra.'));
        return;
    }

    jelentesAblakZarasa();
    jelentendoUtvonal = null;
    allapotMutat(tr('report_thanks', 'Köszönjük, a jelentést megkaptuk.'), 'ok', null);
    allapotRejtesKesobb(4000);
}

// ---------- Feltöltés ----------

async function feltoltKepek(event) {
    const csoport = aktualisCsoport();
    const fajlok = Array.from(event.target.files || []);
    event.target.value = '';
    if (fajlok.length === 0) return;
    if (!csoport) {
        alert(tr('err_join_group_settings', 'Előbb lépj be egy csoportba a beállításoknál!'));
        return;
    }

    // Globálisan kikapcsolt képfeltöltés (FELADAT15); a szerver is elutasítaná
    if (!funkcioEngedelyezett('funkcio_kepfeltoltes')) {
        allapotMutat(TILTVA_SZOVEG, 'hiba', null);
        allapotRejtesKesobb(5000);
        return;
    }

    feltoltesGombFoglalt(true);

    let sikeres = 0;
    let kihagyott = 0;
    let utolsoHiba = null;

    try {
        allapotMutat(tr('loading_compressor', 'Tömörítő betöltése…'), null, null);
        const [{ kepBetoltes, kepTomoritesKivagassal, forrasFelszabaditas, KepHiba }, { kivagasValasztas, kozepsoNegyzet }] =
            await Promise.all([import('../../segedek/kep-tomorites.js'), import('./kepek-kivago.js')]);
        const korlat = await kepKorlatLekerese();
        let mindKozepre = false; // "A többit középre": a további képeknél nincs kivágó ablak

        for (const [i, fajl] of fajlok.entries()) {
            const elotag = fajlok.length > 1 ? `(${i + 1}/${fajlok.length}) ` : '';
            try {
                if (korlat !== null && kepek.length + sikeres >= korlat) throw new KepHiba(KORLAT_UZENET);

                allapotMutat(elotag + tr('reading', 'Beolvasás…'), null, null);
                const kep = await kepBetoltes(fajl);
                let tomoritett;
                try {
                    // A feltöltő választja ki a négyzetes kivágást (a kép mindenhol négyzetben jelenik meg)
                    let kivagas = kozepsoNegyzet(kep);
                    if (!mindKozepre) {
                        allapotMutat(elotag + tr('align_picture', 'Igazítsd a képet…'), null, null);
                        const valasz = await kivagasValasztas(kep, {
                            sorszam: fajlok.length > 1 ? tr('picture_n_of', '{i}. kép a {n}-ból', { i: i + 1, n: fajlok.length }) : '',
                            tobbVanHatra: i < fajlok.length - 1,
                        });
                        if (!valasz) {
                            kihagyott++;
                            continue; // a finally felszabadítja a képet
                        }
                        kivagas = valasz.kivagas;
                        mindKozepre = !!valasz.mindKozepre;
                    }
                    allapotMutat(elotag + tr('compressing', 'Tömörítés…'), null, null);
                    tomoritett = await kepTomoritesKivagassal(kep, kivagas);
                } finally {
                    forrasFelszabaditas(kep.forras);
                }
                const { blob, kiterjesztes } = tomoritett;
                allapotMutat(elotag + tr('uploading_kb', 'Feltöltés… ({kb} KB)', { kb: Math.round(blob.size / 1024) }), null, blob);

                const eleresiUt = `${csoport.id}/${crypto.randomUUID()}.${kiterjesztes}`;
                const hiba = await kepFeltoltese(eleresiUt, blob);
                if (hiba) {
                    if (rlsHibaE(hiba)) {
                        const frissKorlat = await kepKorlatLekerese();
                        if (frissKorlat !== null && kepek.length + sikeres >= frissKorlat) throw new KepHiba(KORLAT_UZENET);
                    }
                    throw new KepHiba(tr('err_upload_msg', 'A feltöltés nem sikerült: {msg}', { msg: hiba.message }));
                }

                if (!await kepSorRogzitese(csoport.id, eleresiUt, blob.size)) {
                    throw new KepHiba(tr('err_upload_incomplete', 'A feltöltés nem fejeződött be rendesen, kérlek próbáld újra.'));
                }
                sikeres++;
            } catch (err) {
                console.error('Feltöltési hiba:', err, { tipus: fajl.type, nev: fajl.name, meret: fajl.size });
                const uzenet = err instanceof KepHiba ? err.message : tr('err_image_process', 'Váratlan hiba történt a kép feldolgozásakor.');
                utolsoHiba = `${fajl.name}: ${uzenet}`;
                allapotMutat(utolsoHiba, 'hiba', null);
                if (uzenet === KORLAT_UZENET) break;
            }
        }
    } catch (err) {
        console.error('A tömörítő nem tölthető be:', err);
        utolsoHiba = tr('err_upload_unavailable', 'A képfeltöltés most nem érhető el, próbáld újra később.');
    } finally {
        feltoltesGombFoglalt(false); // visszaengedélyezés (ha a funkció be van kapcsolva)
    }

    if (utolsoHiba) {
        allapotMutat((sikeres > 0 ? tr('n_uploaded', '{n} kép feltöltve.', { n: sikeres }) + ' ' : '') + utolsoHiba, 'hiba', null);
        allapotRejtesKesobb(10000);
    } else if (sikeres === 0) {
        allapotMutat(tr('none_uploaded', 'Nem töltöttél fel képet.'), null, null);
        allapotRejtesKesobb(3000);
    } else {
        const kihagyva = kihagyott > 0 ? ' ' + tr('n_skipped', '({n} kihagyva)', { n: kihagyott }) : '';
        allapotMutat((sikeres > 1 ? tr('n_uploaded', '{n} kép feltöltve.', { n: sikeres }) : tr('one_uploaded', 'Kép feltöltve.')) + kihagyva, 'ok', null);
        allapotRejtesKesobb(3000);
    }

    if (sikeres > 0) await betoltKepek();
}

// ---------- Indítás ----------

const $ = (id) => document.getElementById(id);

await ready;
funkcioGombTiltas($('kepFeltoltesGomb'), 'funkcio_kepfeltoltes');
betoltKepek(true);

$('kepFeltoltesGomb').addEventListener('click', () => $('kepFeltoltesInput').click());
$('kepFeltoltesInput').addEventListener('change', feltoltKepek);
$('jelentesUrlap').addEventListener('submit', jelentesKuldes);
$('jelentesMegse').addEventListener('click', jelentesAblakZarasa);
document.addEventListener('click', (e) => {
    if (!e.target.closest('.kepek-menu')) menukBezarasa();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menukBezarasa();
});
