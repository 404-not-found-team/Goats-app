if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker regisztrálva'));
}

const BUCKET_NEV = 'kepek';

// A képek csak kicsiben jelennek meg (FELADAT12): nincs nagyított nézet. A középső kép alatti
// műveleti sávban van a feltöltő neve (FELADAT9) és a ⋮ menü (Törlés a saját képnél, és egy
// előkészített, rejtett "Jelentés" hely a FELADAT5-höz).
// A képeket a helyi gyorsítótár (js/segedek/kep-gyorsitotar.js) adja blob URL-ként, a
// tömörítést a js/segedek/kep-tomorites.js végzi (az első feltöltéskor töltődik be).

let kepekLista = []; // { name, path, feltoltotteId } elemek
let currentIndex = 0;
let megjelenitesSorszam = 0; // gyors lapozásnál a régebbi, később befutó betöltést eldobjuk

const KORLAT_UZENET = 'A csoport elérte a képkorlátot, törölj régebbi képeket.';

// aktualisGroupCode(): lásd js/segedek/csoport-kod.js (közös, minden klasszikus oldalscript használja)

// A képek mappája a csoport azonosítója (groups.id), a kódcsere után sem változik
function aktualisGroupId() {
    return window.goatsAuth?.getState()?.group?.id || null;
}

function aktualisUserId() {
    return window.goatsAuth?.getState()?.user?.id || null;
}

function supabaseKliens() {
    return typeof _supabase !== 'undefined' ? _supabase : supabase;
}

// A korábbi, sessionStorage-os aláírtURL-gyorsítótár maradványa (FELADAT12 óta nem használjuk)
try { sessionStorage.removeItem('goats_kep_url'); } catch { /* nem kritikus */ }

async function betoltKepek() {
    const groupId = aktualisGroupId();
    const groupCode = aktualisGroupCode();

    if (!groupId) {
        kepekLista = [];
        frissitGaleria();
        return;
    }

    // A csoport mappái: a csoport azonosítója (és átmenetileg a régi, kód alapú mappa)
    const utak = [];
    for (const mappa of window.goatsKepek.csoportMappak(groupId, groupCode)) {
        try {
            utak.push(...await window.goatsKepek.mappaFajljai(mappa));
        } catch (error) {
            console.error('Hiba a képek listázásakor:', error);
        }
    }

    kepekLista = utak.map(u => ({ name: u.split('/').pop(), path: u, feltoltotteId: null }));

    // Feltöltő: a public.kepek táblából (FELADAT9). Ha egy képnek nincs sora (pl. a backfill előtti
    // állapot, vagy a beszúrás egyszer elakadt), egyszerűen nem jelenik meg feltöltő-felirat nála.
    if (kepekLista.length > 0) {
        try {
            const { data: kepSorok, error: kepSorHiba } = await supabaseKliens()
                .from('kepek')
                .select('utvonal, feltoltotte_id')
                .eq('group_id', groupId);
            if (kepSorHiba) {
                console.error('Hiba a feltöltők lekérésekor:', kepSorHiba);
            } else {
                const feltoltoTerkep = new Map((kepSorok || []).map(s => [s.utvonal, s.feltoltotte_id]));
                kepekLista.forEach(k => { k.feltoltotteId = feltoltoTerkep.get(k.path) || null; });
            }
        } catch (err) {
            console.error('Hiba a feltöltők lekérésekor:', err);
        }
    }

    if (currentIndex >= kepekLista.length) {
        currentIndex = Math.max(0, kepekLista.length - 1);
    }

    frissitGaleria();
}

// A feltöltő neve az azonosítója alapján (a csoporttagok listájából)
function feltoltoNev(userId) {
    if (!userId) return null;
    const tag = window.goatsAuth?.getState()?.members?.find(m => m.user_id === userId);
    return tag ? tag.display_name : 'Törölt tag';
}

// Törölheti-e a felhasználó a képet a felületen: a saját képét, és azt, aminek nem ismert a
// feltöltője (a FELADAT9 előtti képek). A tényleges jogosultságot a szerver (RLS) dönti el.
function torolhetoKep(kep) {
    return !!kep && (!kep.feltoltotteId || kep.feltoltotteId === aktualisUserId());
}

function uresAllapot(lathato) {
    const placeholder = document.getElementById('galeria-placeholder');
    if (!placeholder) return;
    placeholder.hidden = !lathato;
    if (lathato && !placeholder.hasChildNodes()) {
        const ikon = document.createElement('span');
        ikon.className = 'ures-ikon';
        ikon.textContent = '🖼️';
        const cim = document.createElement('p');
        cim.className = 'ures-cim';
        cim.textContent = 'Még nincsenek képek';
        const leiras = document.createElement('span');
        leiras.className = 'ures-leiras';
        leiras.textContent = 'Töltsd fel az első képet a gombbal!';
        placeholder.append(ikon, cim, leiras);
    }
}

function frissitGaleria() {
    if (!aktualisGroupId()) return;

    const vanKep = kepekLista.length > 0;
    document.querySelectorAll('.kepek .galeria-kep, .kepek .nyil').forEach(el => { el.hidden = !vanKep; });
    uresAllapot(!vanKep);
    menuBezar();

    const sav = document.getElementById('kepMuveletSav');
    if (sav) sav.hidden = !vanKep;
    if (!vanKep) return;

    const balIndex = (currentIndex - 1 + kepekLista.length) % kepekLista.length;
    const jobbIndex = (currentIndex + 1) % kepekLista.length;
    const aktualis = kepekLista[currentIndex];

    const felirat = document.getElementById('kepFeltoltoFelirat');
    if (felirat) {
        const nev = feltoltoNev(aktualis.feltoltotteId);
        felirat.hidden = !nev;
        felirat.textContent = nev ? `Feltöltötte: ${nev}` : '';
    }

    // ⋮ menü: csak a látható menüpontok számítanak; ha egy sincs, a gomb sem látszik
    const torlesPont = document.getElementById('kepTorlesMenupont');
    if (torlesPont) torlesPont.hidden = !torolhetoKep(aktualis);
    const menuGomb = document.getElementById('kepMenuGomb');
    const menu = document.getElementById('kepMenu');
    if (menuGomb && menu) {
        menuGomb.hidden = !menu.querySelector('[data-muvelet]:not([hidden])');
    }

    kepekMegjelenitese([
        ['kepBal', kepekLista[balIndex]],
        ['kepKozep', aktualis],
        ['kepJobb', kepekLista[jobbIndex]],
    ]);
}

// A három látható kép betöltése a helyi gyorsítótárból (hiányzónál egy aláírás + letöltés)
async function kepekMegjelenitese(parok) {
    const sorszam = ++megjelenitesSorszam;
    let urlek;
    try {
        urlek = await window.goatsKepGyorsitotar.kepUrlek(parok.map(([, kep]) => kep.path));
    } catch (err) {
        console.error('Hiba a képek betöltésekor:', err);
        return;
    }
    if (sorszam !== megjelenitesSorszam) return;
    parok.forEach(([id, kep]) => {
        const elem = document.getElementById(id);
        if (!elem) return;
        const url = urlek.get(kep.path);
        if (url) elem.src = url;
        else elem.removeAttribute('src');
    });
}

function eloKep() {
    if (kepekLista.length === 0) return;
    currentIndex = (currentIndex + 1) % kepekLista.length;
    frissitGaleria();
}

function kovKep() {
    if (kepekLista.length === 0) return;
    currentIndex = (currentIndex - 1 + kepekLista.length) % kepekLista.length;
    frissitGaleria();
}

function nyisdMegFajlValasztot() {
    const fajlInput = document.getElementById('kepFeltoltesInput');
    if (fajlInput) fajlInput.click();
}

// ---------- ⋮ menü ----------

function menuBezar() {
    const menu = document.getElementById('kepMenu');
    const gomb = document.getElementById('kepMenuGomb');
    if (menu) menu.hidden = true;
    if (gomb) gomb.setAttribute('aria-expanded', 'false');
}

function menuValtas() {
    const menu = document.getElementById('kepMenu');
    const gomb = document.getElementById('kepMenuGomb');
    if (!menu || !gomb) return;
    const nyit = menu.hidden;
    menu.hidden = !nyit;
    gomb.setAttribute('aria-expanded', String(nyit));
    if (nyit) menu.querySelector('[data-muvelet]:not([hidden])')?.focus();
}

// ---------- Törlés ----------

async function torolAktualisKep() {
    menuBezar();
    if (!aktualisGroupId() || kepekLista.length === 0) return;

    const torlendoKep = kepekLista[currentIndex];
    if (!torlendoKep || !torlendoKep.path) {
        alert('Nem található a törlendő kép!');
        return;
    }

    if (!confirm('Biztosan törölni szeretnéd ezt a képet?')) return;

    const eleresiUt = torlendoKep.path;
    const client = supabaseKliens();

    const { error } = await client.storage.from(BUCKET_NEV).remove([eleresiUt]);
    if (error) {
        console.error('Hiba a törléskor:', error);
        alert(`Sikertelen törlés! Hiba: ${error.message}`);
        return;
    }

    // A hozzá tartozó sor törlése a kepek táblából is (FELADAT9). Nem blokkoló: ha ez nem
    // sikerül, a fájl már törölve van, a sor legfeljebb árván marad (a következő betoltKepek()
    // úgyis csak a ténylegesen létező fájlokat listázza, az árva sor nem okoz hibát).
    const { error: sorTorlesHiba } = await client.from('kepek').delete().eq('utvonal', eleresiUt);
    if (sorTorlesHiba) console.error('A kepek tábla sorának törlése nem sikerült:', sorTorlesHiba);

    await window.goatsKepGyorsitotar.torolKepGyorsitotarbol(eleresiUt);
    await betoltKepek();
}

// ---------- Feltöltés ----------

// Az állapotsor (előnézet + szöveg) a galéria tetején
let elonezetUrl = null;

function allapotMutat(szoveg, tipus, elonezetBlob) {
    const doboz = document.getElementById('kepFeltoltesAllapot');
    const szovegElem = document.getElementById('kepFeltoltesSzoveg');
    const elonezet = document.getElementById('kepFeltoltesElonezet');
    if (!doboz || !szovegElem) return;
    doboz.hidden = false;
    doboz.classList.remove('allapot-hiba', 'allapot-ok');
    if (tipus) doboz.classList.add(`allapot-${tipus}`);
    szovegElem.textContent = szoveg;
    if (elonezet && elonezetBlob !== undefined) {
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

let allapotRejtesIdozito = null;
function allapotRejtesKesobb(ms) {
    clearTimeout(allapotRejtesIdozito);
    allapotRejtesIdozito = setTimeout(() => {
        allapotMutat('', null, null);
        const doboz = document.getElementById('kepFeltoltesAllapot');
        if (doboz) doboz.hidden = true;
    }, ms);
}

// A csoportonkénti képkorlát a szervertől (kep_korlat_csoportonkent RPC), minden feltöltésnél
// frissen (a szerveren újratelepítés nélkül módosítható); hiba esetén null (a szerver úgyis ellenőrzi)
async function lekerKepKorlat() {
    try {
        const { data, error } = await supabaseKliens().rpc('kep_korlat_csoportonkent');
        if (!error && Number.isFinite(data)) return data;
    } catch { /* a szerver úgyis ellenőrzi */ }
    return null;
}

// A Storage RLS-elutasítása (a korlát-policy is így jelez)
function rlsHibaE(error) {
    const uzenet = String(error?.message || '').toLowerCase();
    return String(error?.statusCode) === '403' || uzenet.includes('row-level security') || uzenet.includes('policy');
}

function egyediUtvonal(groupId, kiterjesztes) {
    return `${groupId}/${crypto.randomUUID()}.${kiterjesztes}`;
}

async function feltoltKepek(event) {
    const groupId = aktualisGroupId();
    const fajlok = Array.from(event.target.files || []);
    event.target.value = '';
    if (fajlok.length === 0) return;

    if (!groupId) {
        alert('Előbb lépj be egy csoportba a beállításoknál!');
        return;
    }

    const gomb = document.getElementById('kepFeltoltesGomb');
    if (gomb) {
        gomb.classList.add('feltoltes-folyamatban');
        gomb.setAttribute('aria-busy', 'true');
    }
    clearTimeout(allapotRejtesIdozito);

    const client = supabaseKliens();
    let sikeres = 0;
    let utolsoHiba = null;

    try {
        allapotMutat('Tömörítő betöltése…', null, null);
        const { kepTomorites, KepHiba } = await import('../segedek/kep-tomorites.js');
        const korlat = await lekerKepKorlat();

        for (const [i, fajl] of fajlok.entries()) {
            const elotag = fajlok.length > 1 ? `(${i + 1}/${fajlok.length}) ` : '';
            try {
                if (korlat !== null && kepekLista.length + sikeres >= korlat) {
                    throw new KepHiba(KORLAT_UZENET);
                }

                allapotMutat(`${elotag}Tömörítés…`, null, null);
                const { blob, kiterjesztes } = await kepTomorites(fajl);
                allapotMutat(`${elotag}Feltöltés… (${Math.round(blob.size / 1024)} KB)`, null, blob);

                const eleresiUt = egyediUtvonal(groupId, kiterjesztes);
                const { error } = await client.storage.from(BUCKET_NEV).upload(eleresiUt, blob, {
                    cacheControl: '31536000', // a fájl soha nem módosul, mindig új útvonalra töltünk fel
                    contentType: blob.type,
                    upsert: false
                });

                if (error) {
                    console.error('Feltöltési hiba (Supabase Storage):', error);
                    if (rlsHibaE(error)) {
                        // A korlát elérését a szerver RLS-hibával jelzi; a friss korláttal ellenőrizzük
                        const frissKorlat = await lekerKepKorlat();
                        if (frissKorlat !== null && kepekLista.length + sikeres >= frissKorlat) {
                            throw new KepHiba(KORLAT_UZENET);
                        }
                    }
                    throw new KepHiba(`A feltöltés nem sikerült: ${error.message}`);
                }

                // A Storage-feltöltés után a sor rögzítése a kepek táblában (FELADAT9). Ha ez egyszer
                // nem sikerül, egyet újrapróbáljuk; ha másodszor is elakad, a fájlt inkább töröljük a
                // Storage-ból, hogy ne maradjon "gazdátlan" (a táblában nem szereplő) kép.
                const sor = { group_id: groupId, utvonal: eleresiUt, meret: blob.size };
                let sorHiba = (await client.from('kepek').insert(sor)).error;
                if (sorHiba) {
                    console.warn('A kepek sor beszúrása nem sikerült, újrapróbálás:', sorHiba);
                    sorHiba = (await client.from('kepek').insert(sor)).error;
                }
                if (sorHiba) {
                    console.error('A kepek sor beszúrása másodszorra sem sikerült, a fájl törlése:', sorHiba);
                    const { error: takaritasHiba } = await client.storage.from(BUCKET_NEV).remove([eleresiUt]);
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
        if (gomb) {
            gomb.classList.remove('feltoltes-folyamatban');
            gomb.removeAttribute('aria-busy');
        }
    }

    if (utolsoHiba) {
        const elotag = sikeres > 0 ? `${sikeres} kép feltöltve. ` : '';
        allapotMutat(`${elotag}${utolsoHiba}`, 'hiba', null);
        allapotRejtesKesobb(10000);
    } else {
        allapotMutat(sikeres > 1 ? `${sikeres} kép feltöltve.` : 'Kép feltöltve.', 'ok', null);
        allapotRejtesKesobb(3000);
    }

    if (sikeres > 0) {
        await betoltKepek();
        currentIndex = Math.max(0, kepekLista.length - 1);
        frissitGaleria();
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    if (window.goatsAuth) await window.goatsAuth.ready;
    betoltKepek();

    document.getElementById('kepFeltoltesInput')?.addEventListener('change', feltoltKepek);
    document.getElementById('kepMenuGomb')?.addEventListener('click', (e) => {
        e.stopPropagation();
        menuValtas();
    });
    document.getElementById('kepTorlesMenupont')?.addEventListener('click', torolAktualisKep);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#kepMenu')) menuBezar();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') menuBezar();
    });
});
