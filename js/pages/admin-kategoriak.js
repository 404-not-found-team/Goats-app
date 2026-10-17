// Admin oldal: italkategóriák (alkategóriák) és az italok besorolása. Csak superadminnak: az admin.js
// a jogosultság-ellenőrzés után tölti be; az írást a szerver is ellenőrzi (RLS: is_superadmin()).
// - Alkategória: public.ital_kategoriak, szulo_id = a főkategória; szabály: márka egyezik vagy a név eleje.
// - Italonkénti felülírás: italok.alkategoria_kezi + alkategoria_id (kézi; üresen: egyik sem),
//   energiaitalnál italok.zero (null: automatikus a név alapján).
import { client } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const K = () => window.italKategoriak;

let italok = [];
let foId = null;

function ujElem(tag, osztaly = '', szoveg = '') {
    const elem = document.createElement(tag);
    if (osztaly) elem.className = osztaly;
    if (szoveg) elem.textContent = szoveg;
    return elem;
}

function allapot(szoveg, tipus) {
    const elem = $('adminKategoriakAllapot');
    elem.textContent = szoveg;
    elem.className = `admin-allapot ${tipus ? `allapot-${tipus}` : ''}`;
}

function opcio(ertek, felirat, kivalasztva) {
    const o = document.createElement('option');
    o.value = ertek;
    o.textContent = felirat;
    o.selected = !!kivalasztva;
    return o;
}

async function adatokBetoltese() {
    await K().betolt(client);
    const { data, error } = await client
        .from('italok')
        .select('id, marka, nev, kategoria_id, alkategoria_id, alkategoria_kezi, zero, jovahagyva')
        .order('nev', { ascending: true })
        .range(0, 1999);
    if (error) throw error;
    italok = data || [];
}

// ---------- Főkategória-választó ----------

function foValaszto() {
    const select = $('adminFoKategoria');
    if (!foId || !K().kategoria(foId)) foId = K().fo.find(f => f.kod === 'energiaital')?.id || K().fo[0]?.id;
    select.replaceChildren(...K().fo.map(f => opcio(f.id, f.nev, f.id === foId)));
}

// ---------- Alkategóriák ----------

const szabalyLeiras = (a) => a.szabaly_marka ? `márka: ${a.szabaly_marka}`
    : a.szabaly_nev ? `név eleje: ${a.szabaly_nev}` : 'csak kézi besorolás';

function alkategoriaDarab(alId) {
    return italok.filter(i => i.kategoria_id === foId && K().alkategoria(i)?.id === alId).length;
}

function alkategoriaSor(a) {
    const li = ujElem('li', 'admin-sor admin-alkategoria');
    const szoveg = ujElem('div', 'admin-sor-szoveg');
    szoveg.append(
        ujElem('span', 'admin-sor-nev', a.nev),
        ujElem('span', 'admin-sor-leiras', `${szabalyLeiras(a)} · ${alkategoriaDarab(a.id)} ital`)
    );

    const gombok = ujElem('div', 'admin-sor-gombok');
    const szerkeszt = ujElem('button', 'admin-gomb masodlagos', 'Szerkesztés');
    szerkeszt.type = 'button';
    szerkeszt.addEventListener('click', () => li.replaceWith(alkategoriaSzerkeszto(a)));
    const torol = ujElem('button', 'admin-gomb veszelyes', 'Törlés');
    torol.type = 'button';
    torol.addEventListener('click', () => alkategoriaTorles(a));
    gombok.append(szerkeszt, torol);

    li.append(szoveg, gombok);
    return li;
}

function szabalyMezok(tipus, ertek) {
    const select = ujElem('select', 'admin-bemenet');
    select.setAttribute('aria-label', 'A szabály típusa');
    select.append(
        opcio('marka', 'Márka egyezik', tipus === 'marka'),
        opcio('nev', 'Név eleje', tipus === 'nev'),
        opcio('nincs', 'Nincs szabály (csak kézi)', tipus === 'nincs')
    );
    const input = ujElem('input', 'admin-bemenet');
    input.maxLength = 40;
    input.value = ertek || '';
    input.setAttribute('aria-label', 'A szabály értéke');
    const frissit = () => { input.hidden = select.value === 'nincs'; };
    select.addEventListener('change', frissit);
    frissit();
    return { select, input };
}

function alkategoriaSzerkeszto(a) {
    const li = ujElem('li', 'admin-sor admin-alkategoria szerkesztes');
    const nev = ujElem('input', 'admin-bemenet');
    nev.value = a.nev;
    nev.maxLength = 40;
    nev.setAttribute('aria-label', 'Az alkategória neve');
    const tipus = a.szabaly_marka ? 'marka' : a.szabaly_nev ? 'nev' : 'nincs';
    const { select, input } = szabalyMezok(tipus, a.szabaly_marka || a.szabaly_nev);
    const sorrend = ujElem('input', 'admin-bemenet admin-szam');
    sorrend.type = 'number';
    sorrend.value = String(a.sorrend);
    sorrend.setAttribute('aria-label', 'Sorrend');

    const ment = ujElem('button', 'admin-gomb', 'Mentés');
    ment.type = 'button';
    ment.addEventListener('click', () => alkategoriaMentes(a, { nev: nev.value, tipus: select.value, ertek: input.value, sorrend: sorrend.value }));
    const megse = ujElem('button', 'admin-gomb masodlagos', 'Mégse');
    megse.type = 'button';
    megse.addEventListener('click', kirajzolas);

    const sor = ujElem('div', 'admin-urlap-sor');
    sor.append(nev, select, input, sorrend, ment, megse);
    li.appendChild(sor);
    return li;
}

function szabalyOszlopok(tipus, ertek) {
    const e = String(ertek || '').trim();
    if (tipus === 'marka') return { szabaly_marka: K().szlug(e) || null, szabaly_nev: null };
    if (tipus === 'nev') return { szabaly_marka: null, szabaly_nev: e || null };
    return { szabaly_marka: null, szabaly_nev: null };
}

async function alkategoriaMentes(a, { nev, tipus, ertek, sorrend }) {
    const tisztaNev = String(nev || '').trim();
    if (!tisztaNev) return allapot('Add meg az alkategória nevét.', 'hiba');
    if (tipus !== 'nincs' && !String(ertek || '').trim()) return allapot('Add meg a szabály értékét.', 'hiba');
    const { error } = await client
        .from('ital_kategoriak')
        .update({ nev: tisztaNev, sorrend: Number(sorrend) || 0, ...szabalyOszlopok(tipus, ertek) })
        .eq('id', a.id);
    if (error) {
        console.error('Az alkategória mentése nem sikerült:', error);
        return allapot(`A mentés nem sikerült: ${error.message}`, 'hiba');
    }
    allapot(`${tisztaNev}: elmentve.`, 'ok');
    await ujratoltes();
}

async function alkategoriaTorles(a) {
    if (!confirm(`Biztosan törlöd a(z) „${a.nev}” alkategóriát? Az italai alkategória nélkül maradnak.`)) return;
    // A kézzel ide sorolt italok visszakerülnek a szabály szerinti besorolásra
    const { error: italHiba } = await client
        .from('italok')
        .update({ alkategoria_kezi: false, alkategoria_id: null })
        .eq('alkategoria_id', a.id);
    if (italHiba) {
        console.error('Az italok visszaállítása nem sikerült:', italHiba);
        return allapot(`A törlés nem sikerült: ${italHiba.message}`, 'hiba');
    }
    const { error } = await client.from('ital_kategoriak').delete().eq('id', a.id);
    if (error) {
        console.error('Az alkategória törlése nem sikerült:', error);
        return allapot(`A törlés nem sikerült: ${error.message}`, 'hiba');
    }
    allapot(`${a.nev}: törölve.`, 'ok');
    await ujratoltes();
}

async function ujAlkategoria(e) {
    e.preventDefault();
    const fo = K().kategoria(foId);
    const nev = $('adminUjAlNev').value.trim();
    const tipus = $('adminUjAlSzabaly').value;
    const ertek = $('adminUjAlErtek').value;
    if (!fo || !nev) return allapot('Add meg az alkategória nevét.', 'hiba');
    if (tipus !== 'nincs' && !ertek.trim()) return allapot('Add meg a szabály értékét.', 'hiba');
    const kod = `${fo.kod}-${K().szlug(nev)}`.slice(0, 40);
    const sorrend = Math.max(0, ...K().alkategoriai(fo.id).map(a => a.sorrend)) + 1;
    const { error } = await client
        .from('ital_kategoriak')
        .insert({ kod, nev, szulo_id: fo.id, sorrend, ...szabalyOszlopok(tipus, ertek) });
    if (error) {
        console.error('Az alkategória létrehozása nem sikerült:', error);
        return allapot(error.code === '23505'
            ? 'Ilyen nevű alkategória már van ebben a főkategóriában.'
            : `A létrehozás nem sikerült: ${error.message}`, 'hiba');
    }
    $('adminUjAlkategoria').reset();
    $('adminUjAlErtek').hidden = false;
    allapot(`${nev}: létrehozva.`, 'ok');
    await ujratoltes();
}

// ---------- Italok besorolása ----------

function italSor(ital) {
    const fo = K().kategoria(ital.kategoria_id);
    const alok = K().alkategoriai(ital.kategoria_id);
    const li = ujElem('li', 'admin-sor admin-ital');
    li.dataset.nev = (ital.nev || '').toLowerCase();

    const szoveg = ujElem('div', 'admin-sor-szoveg');
    szoveg.append(
        ujElem('span', 'admin-sor-nev', ital.nev),
        ujElem('span', 'admin-sor-leiras', [ital.marka ? `márka: ${ital.marka}` : 'márka nélkül', ital.jovahagyva ? '' : 'jóváhagyásra vár'].filter(Boolean).join(' · '))
    );
    const vezerlok = ujElem('div', 'admin-sor-gombok');

    if (alok.length > 0) {
        const szabaly = K().szabalySzerint(ital);
        const select = ujElem('select', 'admin-bemenet');
        select.setAttribute('aria-label', `${ital.nev}: alkategória`);
        select.append(opcio('auto', szabaly ? `Szabály szerint (${szabaly.nev})` : 'Szabály szerint (nincs egyezés)', !ital.alkategoria_kezi));
        alok.forEach(a => select.append(opcio(String(a.id), a.nev, ital.alkategoria_kezi && ital.alkategoria_id === a.id)));
        select.append(opcio('nincs', 'Nincs alkategória', ital.alkategoria_kezi && !ital.alkategoria_id));
        select.addEventListener('change', () => {
            const v = select.value;
            italMentes(ital, v === 'auto'
                ? { alkategoria_kezi: false, alkategoria_id: null }
                : { alkategoria_kezi: true, alkategoria_id: v === 'nincs' ? null : Number(v) });
        });
        vezerlok.appendChild(select);
    }

    if (fo?.zero_szuro) {
        const auto = K().zeroAutomatikus(ital);
        const select = ujElem('select', 'admin-bemenet');
        select.setAttribute('aria-label', `${ital.nev}: zero`);
        select.append(
            opcio('auto', `Automatikus (${auto ? 'zero' : 'nem zero'})`, ital.zero === null),
            opcio('igen', 'Zero', ital.zero === true),
            opcio('nem', 'Nem zero', ital.zero === false)
        );
        select.addEventListener('change', () => {
            italMentes(ital, { zero: select.value === 'auto' ? null : select.value === 'igen' });
        });
        vezerlok.appendChild(select);
    }

    li.append(szoveg, vezerlok);
    return li;
}

async function italMentes(ital, valtozas) {
    const { error } = await client.from('italok').update(valtozas).eq('id', ital.id);
    if (error) {
        console.error('Az ital besorolásának mentése nem sikerült:', error);
        allapot(`${ital.nev}: a mentés nem sikerült (${error.message}).`, 'hiba');
        kirajzolas(); // visszaáll a korábbi értékre
        return;
    }
    Object.assign(ital, valtozas);
    allapot(`${ital.nev}: elmentve.`, 'ok');
    kirajzolas();
}

function italLista() {
    const kereses = $('adminItalKereso').value.trim().toLowerCase();
    const lista = italok
        .filter(i => i.kategoria_id === foId)
        .filter(i => !kereses || (i.nev || '').toLowerCase().includes(kereses));
    const fo = K().kategoria(foId);
    const vanMit = K().alkategoriai(foId).length > 0 || fo?.zero_szuro;
    if (!vanMit) {
        $('adminItalok').replaceChildren(ujElem('li', 'admin-sor admin-ures', 'Ebben a főkategóriában még nincs alkategória: előbb hozz létre egyet.'));
        return;
    }
    $('adminItalok').replaceChildren(...(lista.length ? lista.map(italSor) : [ujElem('li', 'admin-sor admin-ures', 'Nincs találat.')]));
}

// ---------- Kirajzolás ----------

function kirajzolas() {
    foValaszto();
    const alok = K().alkategoriai(foId);
    $('adminAlkategoriak').replaceChildren(...(alok.length
        ? alok.map(alkategoriaSor)
        : [ujElem('li', 'admin-sor admin-ures', 'Nincs még alkategória.')]));
    italLista();
}

async function ujratoltes() {
    try {
        await adatokBetoltese();
    } catch (err) {
        console.error('Az italkategóriák betöltése nem sikerült:', err);
        allapot('Az italkategóriák betöltése nem sikerült.', 'hiba');
        return;
    }
    kirajzolas();
}

export async function indit() {
    $('adminFoKategoria').addEventListener('change', (e) => { foId = Number(e.target.value); kirajzolas(); });
    $('adminUjAlkategoria').addEventListener('submit', ujAlkategoria);
    $('adminUjAlSzabaly').addEventListener('change', () => { $('adminUjAlErtek').hidden = $('adminUjAlSzabaly').value === 'nincs'; });
    $('adminItalKereso').addEventListener('input', italLista);
    await ujratoltes();
}
