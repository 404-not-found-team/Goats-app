// Képek oldal (kepek.html): a csoport összes képe rácsban, feltöltéssel, törléssel és jelentéssel.
// A képek csak kicsiben jelennek meg, nagyítás nincs (FELADAT12). A feltöltő neve és a dátum
// csak itt látszik; a főoldali galéria (js/elemek/galeria.js) csak lapozható nézegető.
// - Feltöltés: négyzetes kivágás (js/elemek/kep-kivago.js), majd tömörítés (js/segedek/kep-tomorites.js);
//   mindkettő az első feltöltéskor töltődik be
// - Megjelenítés: js/segedek/kep-gyorsitotar.js (eszközönként egyszer letöltve, blob URL)
// - Jelentés: public.jelentesek (cel_tipus = 'kep', cel_azonosito = a kép útvonala)
import { client } from '../supabase-client.js';
import { ready, getState } from '../hitelesites.js';
import { BUCKET, csoportMappak, mappaFajljai } from '../segedek/csoport-kepek.js';
import { kepUrlek, torolKepGyorsitotarbol } from '../segedek/kep-gyorsitotar.js';

const KORLAT_UZENET = 'A csoport elérte a képkorlátot, törölj régebbi képeket.';
const BETOLTES_KOTEG_MS = 50; // a láthatóvá vált csempéket ennyi ideig gyűjtjük egy aláírás-kötegbe

let kepek = []; // { path, feltoltotteId, letrehozva }
let jelentendoUtvonal = null;

const $ = (id) => document.getElementById(id);

function aktualisCsoport() {
    return getState()?.group || null;
}

function aktualisUserId() {
    return getState()?.user?.id || null;
}

function feltoltoNev(userId) {
    if (!userId) return null;
    const tag = getState()?.members?.find(m => m.user_id === userId);
    return tag ? tag.display_name : 'Törölt tag';
}

// A saját képét, és az ismeretlen feltöltőjűt (a FELADAT9 előtti képek) törölheti a felületen.
// A tényleges jogosultságot a szerver (RLS) dönti el.
function torolhetoKep(kep) {
    return !kep.feltoltotteId || kep.feltoltotteId === aktualisUserId();
}

function ujElem(tag, osztaly, szoveg) {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

// ---------- Listázás ----------

async function betoltKepek() {
    const csoport = aktualisCsoport();
    if (!csoport) {
        kepek = [];
        racsKirajzolas();
        return;
    }

    const utak = [];
    for (const mappa of csoportMappak(csoport.id, csoport.group_code)) {
        try {
            utak.push(...await mappaFajljai(mappa));
        } catch (err) {
            console.error('Hiba a képek listázásakor:', err);
        }
    }

    // Feltöltő és időpont a public.kepek táblából (FELADAT9); ha egy képnek nincs sora, ezek üresek
    const adatok = new Map();
    if (utak.length > 0) {
        const { data, error } = await client
            .from('kepek')
            .select('utvonal, feltoltotte_id, letrehozva')
            .eq('group_id', csoport.id);
        if (error) console.error('Hiba a képadatok lekérésekor:', error);
        (data || []).forEach(s => adatok.set(s.utvonal, s));
    }

    // A legújabb elöl (a listázás feltöltési sorrendben adja)
    kepek = utak.reverse().map(path => ({
        path,
        feltoltotteId: adatok.get(path)?.feltoltotte_id || null,
        letrehozva: adatok.get(path)?.letrehozva || null,
    }));
    racsKirajzolas();
}

// ---------- Rács ----------

// Lusta betöltés: a láthatóvá váló csempék képeit kötegben kérjük le a helyi gyorsítótártól
const varakozo = new Map(); // útvonal -> img elem
let kotegIdozito = null;

const megfigyelo = 'IntersectionObserver' in window
    ? new IntersectionObserver((bejegyzesek) => {
        bejegyzesek.forEach(b => {
            if (!b.isIntersecting) return;
            megfigyelo.unobserve(b.target);
            varakozo.set(b.target.dataset.utvonal, b.target);
        });
        if (varakozo.size > 0) {
            clearTimeout(kotegIdozito);
            kotegIdozito = setTimeout(kotegBetoltes, BETOLTES_KOTEG_MS);
        }
    }, { rootMargin: '200px' })
    : null;

async function kotegBetoltes() {
    const koteg = new Map(varakozo);
    varakozo.clear();
    try {
        const urlek = await kepUrlek([...koteg.keys()]);
        koteg.forEach((img, utvonal) => {
            const url = urlek.get(utvonal);
            if (url) img.src = url;
            else img.closest('.kepek-csempe')?.classList.add('betoltesi-hiba');
        });
    } catch (err) {
        console.error('Hiba a képek betöltésekor:', err);
    }
}

function csempe(kep) {
    const li = ujElem('li', 'kepek-csempe');

    const img = ujElem('img', 'kepek-csempe-kep');
    img.alt = 'Csoportkép';
    img.width = 200;
    img.height = 200;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.dataset.utvonal = kep.path;
    li.appendChild(img);

    const info = ujElem('div', 'kepek-csempe-info');
    const szoveg = ujElem('div', 'kepek-csempe-szoveg');
    const nev = feltoltoNev(kep.feltoltotteId);
    // Mobilon csak a név látszik (az előtag a CSS-ben rejtett, a képernyőolvasó felolvassa)
    const feltolto = ujElem('span', 'kepek-feltolto');
    feltolto.append(ujElem('span', 'kepek-feltolto-elotag', 'Feltöltötte: '), nev || 'ismeretlen');
    feltolto.title = nev ? `Feltöltötte: ${nev}` : 'A feltöltő nem ismert';
    szoveg.appendChild(feltolto);
    if (kep.letrehozva) {
        const datum = new Date(kep.letrehozva);
        const ido = ujElem('time', 'kepek-datum', datum.toLocaleDateString('hu-HU'));
        ido.dateTime = kep.letrehozva;
        szoveg.appendChild(ido);
    }
    info.appendChild(szoveg);

    // ⋮ menü: Jelentés mindig, Törlés a saját képnél
    const menu = ujElem('div', 'kepek-menu');
    const gomb = ujElem('button', 'kepek-menu-gomb');
    gomb.type = 'button';
    gomb.title = 'Műveletek';
    gomb.setAttribute('aria-label', 'Kép műveletei');
    gomb.setAttribute('aria-haspopup', 'menu');
    gomb.setAttribute('aria-expanded', 'false');
    const ikon = ujElem('i', 'fa-solid fa-ellipsis-vertical');
    ikon.setAttribute('aria-hidden', 'true');
    gomb.appendChild(ikon);

    const lista = ujElem('div', 'kepek-menu-lista');
    lista.setAttribute('role', 'menu');
    lista.hidden = true;

    const jelentes = ujElem('button', 'kepek-menupont', 'Jelentés');
    jelentes.type = 'button';
    jelentes.setAttribute('role', 'menuitem');
    jelentes.addEventListener('click', () => { menukBezarasa(); jelentesMegnyitas(kep.path); });
    lista.appendChild(jelentes);

    if (torolhetoKep(kep)) {
        const torles = ujElem('button', 'kepek-menupont veszelyes', 'Törlés');
        torles.type = 'button';
        torles.setAttribute('role', 'menuitem');
        torles.addEventListener('click', () => { menukBezarasa(); torolKep(kep); });
        lista.appendChild(torles);
    }

    gomb.addEventListener('click', (e) => {
        e.stopPropagation();
        const nyit = lista.hidden;
        menukBezarasa();
        lista.hidden = !nyit;
        gomb.setAttribute('aria-expanded', String(nyit));
        if (nyit) lista.querySelector('button')?.focus();
    });

    menu.append(gomb, lista);
    info.appendChild(menu);
    li.appendChild(info);

    if (megfigyelo) megfigyelo.observe(img);
    else varakozo.set(kep.path, img);
    return li;
}

function racsKirajzolas() {
    const racs = $('kepekRacs');
    if (!racs) return;
    if (megfigyelo) megfigyelo.disconnect();
    varakozo.clear();
    racs.replaceChildren(...kepek.map(csempe));
    if (!megfigyelo && varakozo.size > 0) kotegBetoltes();

    $('kepekUres').hidden = kepek.length > 0;
    $('kepekSzamlalo').textContent = kepek.length > 0 ? `${kepek.length} kép` : '';
}

function menukBezarasa() {
    document.querySelectorAll('.kepek-menu-lista').forEach(l => { l.hidden = true; });
    document.querySelectorAll('.kepek-menu-gomb').forEach(g => g.setAttribute('aria-expanded', 'false'));
}

// ---------- Törlés ----------

async function torolKep(kep) {
    if (!confirm('Biztosan törölni szeretnéd ezt a képet?')) return;

    const { error } = await client.storage.from(BUCKET).remove([kep.path]);
    if (error) {
        console.error('Hiba a törléskor:', error);
        alert(`Sikertelen törlés! Hiba: ${error.message}`);
        return;
    }

    // A kepek tábla sora (FELADAT9). Nem blokkoló: az árva sor nem okoz hibát.
    const { error: sorHiba } = await client.from('kepek').delete().eq('utvonal', kep.path);
    if (sorHiba) console.error('A kepek tábla sorának törlése nem sikerült:', sorHiba);

    await torolKepGyorsitotarbol(kep.path);
    kepek = kepek.filter(k => k.path !== kep.path);
    racsKirajzolas();
}

// ---------- Jelentés ----------

function jelentesMegnyitas(utvonal) {
    const dialog = $('jelentesDialog');
    if (!dialog) return;
    jelentendoUtvonal = utvonal;
    $('jelentesUrlap').reset();
    $('jelentesHiba').hidden = true;
    $('jelentesKuld').disabled = false;
    dialog.showModal();
}

async function jelentesKuldes(e) {
    e.preventDefault();
    const urlap = $('jelentesUrlap');
    const ok = urlap.elements.ok.value;
    const leiras = urlap.elements.leiras.value.trim();
    const hiba = $('jelentesHiba');
    const csoport = aktualisCsoport();
    if (!ok) {
        hiba.textContent = 'Válaszd ki a jelentés okát.';
        hiba.hidden = false;
        return;
    }
    if (!csoport || !jelentendoUtvonal) return;

    $('jelentesKuld').disabled = true;
    const { error } = await client.from('jelentesek').insert({
        group_id: csoport.id,
        cel_tipus: 'kep',
        cel_azonosito: jelentendoUtvonal,
        ok,
        leiras: leiras || null,
    });
    $('jelentesKuld').disabled = false;

    if (error) {
        console.error('Hiba a jelentés beküldésekor:', error);
        // A beküldési policy óránként legfeljebb 20 jelentést enged (RLS-hibaként jelez)
        hiba.textContent = rlsHibaE(error)
            ? 'Túl sok jelentést küldtél az elmúlt órában, próbáld újra később.'
            : 'A jelentés beküldése nem sikerült, próbáld újra.';
        hiba.hidden = false;
        return;
    }

    $('jelentesDialog').close();
    jelentendoUtvonal = null;
    allapotMutat('Köszönjük, a jelentést megkaptuk.', 'ok', null);
    allapotRejtesKesobb(4000);
}

// ---------- Feltöltés ----------

let elonezetUrl = null;
let allapotRejtesIdozito = null;

function allapotMutat(szoveg, tipus, elonezetBlob) {
    const doboz = $('kepFeltoltesAllapot');
    const elonezet = $('kepFeltoltesElonezet');
    doboz.hidden = false;
    doboz.classList.remove('allapot-hiba', 'allapot-ok');
    if (tipus) doboz.classList.add(`allapot-${tipus}`);
    $('kepFeltoltesSzoveg').textContent = szoveg;
    if (elonezetBlob !== undefined) {
        if (elonezetUrl) { URL.revokeObjectURL(elonezetUrl); elonezetUrl = null; }
        if (elonezetBlob) {
            elonezetUrl = URL.createObjectURL(elonezetBlob);
            elonezet.src = elonezetUrl;
            elonezet.hidden = false;
        } else {
            elonezet.removeAttribute('src');
            elonezet.hidden = true;
        }
    }
}

function allapotRejtesKesobb(ms) {
    clearTimeout(allapotRejtesIdozito);
    allapotRejtesIdozito = setTimeout(() => {
        allapotMutat('', null, null);
        $('kepFeltoltesAllapot').hidden = true;
    }, ms);
}

// A csoportonkénti képkorlát a szervertől, minden feltöltésnél frissen; hiba esetén null
async function lekerKepKorlat() {
    try {
        const { data, error } = await client.rpc('kep_korlat_csoportonkent');
        if (!error && Number.isFinite(data)) return data;
    } catch { /* a szerver úgyis ellenőrzi */ }
    return null;
}

// RLS-elutasítás (a képkorlát és a jelentés-korlát is így jelez)
function rlsHibaE(error) {
    const uzenet = String(error?.message || '').toLowerCase();
    return String(error?.statusCode) === '403' || error?.code === '42501'
        || uzenet.includes('row-level security') || uzenet.includes('policy');
}

async function feltoltKepek(event) {
    const csoport = aktualisCsoport();
    const fajlok = Array.from(event.target.files || []);
    event.target.value = '';
    if (fajlok.length === 0) return;
    if (!csoport) {
        alert('Előbb lépj be egy csoportba a beállításoknál!');
        return;
    }

    const gomb = $('kepFeltoltesGomb');
    gomb.disabled = true;
    gomb.setAttribute('aria-busy', 'true');
    clearTimeout(allapotRejtesIdozito);

    let sikeres = 0;
    let kihagyott = 0;
    let utolsoHiba = null;

    try {
        allapotMutat('Tömörítő betöltése…', null, null);
        const [{ kepBetoltes, kepTomoritesKivagassal, forrasFelszabaditas, KepHiba }, { kivagasValasztas, kozepsoNegyzet }] =
            await Promise.all([import('../segedek/kep-tomorites.js'), import('../elemek/kep-kivago.js')]);
        const korlat = await lekerKepKorlat();
        let mindKozepre = false; // "A többit középre": a további képeknél nincs kivágó ablak

        for (const [i, fajl] of fajlok.entries()) {
            const elotag = fajlok.length > 1 ? `(${i + 1}/${fajlok.length}) ` : '';
            try {
                if (korlat !== null && kepek.length + sikeres >= korlat) throw new KepHiba(KORLAT_UZENET);

                allapotMutat(`${elotag}Beolvasás…`, null, null);
                const kep = await kepBetoltes(fajl);
                let tomoritett;
                try {
                    // A feltöltő választja ki a négyzetes kivágást (a kép mindenhol négyzetben jelenik meg)
                    let kivagas = kozepsoNegyzet(kep);
                    if (!mindKozepre) {
                        allapotMutat(`${elotag}Igazítsd a képet…`, null, null);
                        const valasz = await kivagasValasztas(kep, {
                            sorszam: fajlok.length > 1 ? `${i + 1}. kép a ${fajlok.length}-ból` : '',
                            tobbVanHatra: i < fajlok.length - 1,
                        });
                        if (!valasz) {
                            kihagyott++;
                            continue; // a finally felszabadítja a képet
                        }
                        kivagas = valasz.kivagas;
                        mindKozepre = !!valasz.mindKozepre;
                    }
                    allapotMutat(`${elotag}Tömörítés…`, null, null);
                    tomoritett = await kepTomoritesKivagassal(kep, kivagas);
                } finally {
                    forrasFelszabaditas(kep.forras);
                }
                const { blob, kiterjesztes } = tomoritett;
                allapotMutat(`${elotag}Feltöltés… (${Math.round(blob.size / 1024)} KB)`, null, blob);

                const eleresiUt = `${csoport.id}/${crypto.randomUUID()}.${kiterjesztes}`;
                const { error } = await client.storage.from(BUCKET).upload(eleresiUt, blob, {
                    cacheControl: '31536000', // a fájl soha nem módosul, mindig új útvonalra töltünk fel
                    contentType: blob.type,
                    upsert: false
                });
                if (error) {
                    console.error('Feltöltési hiba (Supabase Storage):', error);
                    if (rlsHibaE(error)) {
                        const frissKorlat = await lekerKepKorlat();
                        if (frissKorlat !== null && kepek.length + sikeres >= frissKorlat) throw new KepHiba(KORLAT_UZENET);
                    }
                    throw new KepHiba(`A feltöltés nem sikerült: ${error.message}`);
                }

                // A sor rögzítése a kepek táblában (FELADAT9); két sikertelen próba után a fájlt
                // töröljük, hogy ne maradjon a táblában nem szereplő kép.
                const sor = { group_id: csoport.id, utvonal: eleresiUt, meret: blob.size };
                let sorHiba = (await client.from('kepek').insert(sor)).error;
                if (sorHiba) {
                    console.warn('A kepek sor beszúrása nem sikerült, újrapróbálás:', sorHiba);
                    sorHiba = (await client.from('kepek').insert(sor)).error;
                }
                if (sorHiba) {
                    console.error('A kepek sor beszúrása másodszorra sem sikerült, a fájl törlése:', sorHiba);
                    const { error: takaritasHiba } = await client.storage.from(BUCKET).remove([eleresiUt]);
                    if (takaritasHiba) console.error('A gazdátlanul maradt fájl törlése is sikertelen:', takaritasHiba, eleresiUt);
                    throw new KepHiba('A feltöltés nem fejeződött be rendesen, kérlek próbáld újra.');
                }
                sikeres++;
            } catch (err) {
                console.error('Feltöltési hiba:', err, { tipus: fajl.type, nev: fajl.name, meret: fajl.size });
                const uzenet = err instanceof KepHiba ? err.message : 'Váratlan hiba történt a kép feldolgozásakor.';
                utolsoHiba = `${fajl.name}: ${uzenet}`;
                allapotMutat(utolsoHiba, 'hiba', null);
                if (uzenet === KORLAT_UZENET) break;
            }
        }
    } catch (err) {
        console.error('A tömörítő nem tölthető be:', err);
        utolsoHiba = 'A képfeltöltés most nem érhető el, próbáld újra később.';
    } finally {
        gomb.disabled = false;
        gomb.removeAttribute('aria-busy');
    }

    if (utolsoHiba) {
        allapotMutat(`${sikeres > 0 ? `${sikeres} kép feltöltve. ` : ''}${utolsoHiba}`, 'hiba', null);
        allapotRejtesKesobb(10000);
    } else if (sikeres === 0) {
        allapotMutat('Nem töltöttél fel képet.', null, null);
        allapotRejtesKesobb(3000);
    } else {
        const kihagyva = kihagyott > 0 ? ` (${kihagyott} kihagyva)` : '';
        allapotMutat(sikeres > 1 ? `${sikeres} kép feltöltve.${kihagyva}` : `Kép feltöltve.${kihagyva}`, 'ok', null);
        allapotRejtesKesobb(3000);
    }

    if (sikeres > 0) await betoltKepek();
}

// ---------- Indítás ----------

await ready;
betoltKepek();

$('kepFeltoltesGomb').addEventListener('click', () => $('kepFeltoltesInput').click());
$('kepFeltoltesInput').addEventListener('change', feltoltKepek);
$('jelentesUrlap').addEventListener('submit', jelentesKuldes);
$('jelentesMegse').addEventListener('click', () => $('jelentesDialog').close());
document.addEventListener('click', (e) => {
    if (!e.target.closest('.kepek-menu')) menukBezarasa();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menukBezarasa();
});
