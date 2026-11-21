// Ranglista: a tier-sorok, a forrásdobozok és az italkártyák felépítése, valamint a kinagyított ital ablaka.

import { K, alKulcs, billentyuvelKattinthato, ujElem } from './ranglista-seged.js';
import { allapot, osszetevokItalonkent } from './ranglista-allapot.js';
import { betoltNaplo } from './ranglista-naplo.js';

// A kártyán megjelenő név márka nélkül (pl. "Finlandia Mango" -> "Mango"); a márka külön, fölötte
// kis sorban látszik (megjelenitettMarka), így a "Kozel Premium" sem csak "Premium"-ként jelenik meg.
export function megjelenitettNev(nev) {
    return window.italKep.nevMarkaNelkul(nev);
}

// A kártyán a név fölötti kis, halvány sor: a márka (pl. "Finlandia"). Üres, ha az ital nem márkás, vagy
// ha a neve csak a márkából áll (pl. "Jägermeister"); ilyenkor a név két sorba is törhet (lásd feliratBeallit).
export function megjelenitettMarka(nev) {
    const teljes = String(nev || '');
    const rovid = window.italKep.nevMarkaNelkul(teljes);
    if (rovid === teljes) return '';
    return teljes.slice(0, teljes.length - rovid.length).replace(/[\s\-–:,.]+$/, '').trim();
}

// A kártya felirata: márkás italnál két külön sor (márka + név, mindkettő egysoros, a végén "…"),
// márka nélkül a név kapja mindkét sor helyét, és két sorba törhet (pl. "Krokodilos fogkrém").
// A felirat magassága mindkét esetben ugyanannyi, így a kártyák egy vonalban maradnak.
function feliratBeallit(felirat, nev) {
    const marka = megjelenitettMarka(nev);
    const nevElem = ujElem('span', marka ? 'ital-nev' : 'ital-nev ket-sor', megjelenitettNev(nev));
    if (marka) felirat.replaceChildren(ujElem('span', 'ital-marka', marka), nevElem);
    else felirat.replaceChildren(nevElem);
    felirat.title = nev || '';
}

/**
 * Segédfüggvény: Egy adott konténerben lévő kártyákat ábécésorrendbe rendezi a nevük alapján
 */
export function rendezKartyakatContainerben(container) {
    if (!container) return;
    const kartyak = Array.from(container.querySelectorAll(':scope > .ital-kartya'));

    kartyak.sort((a, b) => {
        const nevA = (a.dataset.nev || '').trim();
        const nevB = (b.dataset.nev || '').trim();
        return nevA.localeCompare(nevB, 'hu', { sensitivity: 'base' });
    });

    kartyak.forEach(kartya => container.appendChild(kartya));
}

// A tier-sor (S..D) kártyatárolója
export function tierKontener(kod) {
    return document.querySelector(`.ranglista-dropzone[data-tier="${kod}"]`);
}

// A kártya helye a forrásdobozban: az alkategória-csoportja, vagy a főkategória listája
export function forrasKontener(kartya) {
    const fo = kartya.dataset.kategoria;
    const al = kartya.dataset.alkategoria || '';
    return document.querySelector(`.ital-alcsoport-lista[data-alkulcs="${alKulcs(fo, al)}"]`)
        || document.querySelector(`.ital-lista[data-kategoria="${fo}"]`)
        || document.querySelector('.ital-lista[data-kategoria="egyeb"]');
}

export function modalBezár() {
    document.getElementById('modal-hatter').hidden = true;
    // a fókusz visszakerül arra az italra, amelyiket megnyitották (billentyűzettel így lehet folytatni)
    const kartya = allapot.aktivElemId && document.getElementById(allapot.aktivElemId);
    allapot.aktivElemId = null;
    allapot.aktivItalAdat = null;
    kartya?.focus();
}

// ---------- Felépítés ----------

const TIEREK = [
    { kod: 'S', cls: 'legeslegjobb' },
    { kod: 'A', cls: 'legjobb' },
    { kod: 'B', cls: 'elmegy' },
    { kod: 'C', cls: 'soha' },
    { kod: 'D', cls: 'megjobbansoha' }
];

export function epitTierek() {
    const katKontener = document.getElementById('kategoriak-kontener');
    if (!katKontener) return;
    katKontener.replaceChildren(...TIEREK.map(k => {
        const doboz = ujElem('div', 'kategoria-kontener');
        const cimke = ujElem('h3', `cimke ${k.cls} dark`, k.kod);
        const dropzone = ujElem('div', 'ranglista-dropzone');
        dropzone.dataset.tier = k.kod;
        dropzone.dataset.uresFelirat = tr('tier_drop_here', 'Húzd ide az italt'); // csak az új kinézet mutatja (CSS)
        doboz.append(cimke, dropzone);
        return doboz;
    }));
}

// Főkategóriánként egy lenyitható doboz; ha vannak alkategóriái, azokon belül alcsoportok
// (alkategóriánként egy; az alkategória nélküli italok a lista alján egy "Egyéb" csoportba kerülnek)
export function epitForrasDobozok() {
    const forrasKontenerElem = document.getElementById('forras-dobozok-kontener');
    if (!forrasKontenerElem) return;
    forrasKontenerElem.replaceChildren(...K().fo.map(fo => {
        const doboz = ujElem('div', 'forras-doboz csukva');
        doboz.dataset.kategoria = fo.kod;
        const fejlec = ujElem('div', 'forras-fejlec');
        fejlec.setAttribute('aria-expanded', 'false');
        billentyuvelKattinthato(fejlec, () => {
            const csukva = doboz.classList.toggle('csukva');
            fejlec.setAttribute('aria-expanded', String(!csukva));
        });
        const cim = ujElem('h3');
        cim.append(document.createTextNode(`${K().nevForditva(fo)} `));
        cim.appendChild(ujElem('span', 'nyil-ikon', '▼'));
        const szamlalo = ujElem('span', 'ital-szamlalo', '0 / 0');
        fejlec.append(cim, szamlalo);

        const lista = ujElem('div', 'ital-lista');
        lista.dataset.kategoria = fo.kod;
        const alok = K().alkategoriai(fo.id);
        if (alok.length > 0) {
            lista.classList.add('van-alcsoport');
            alok.forEach(a => {
                const csoport = ujElem('div', 'ital-alcsoport');
                csoport.dataset.alkulcs = a.kod;
                const alcim = ujElem('h4', 'ital-alcsoport-cim', K().nevForditva(a));
                const allista = ujElem('div', 'ital-alcsoport-lista');
                allista.dataset.alkulcs = a.kod;
                csoport.append(alcim, allista);
                lista.appendChild(csoport);
            });
            // Az alkategória nélküli italok a lista alján egy "Egyéb" alcsoportba kerülnek, ugyanolyan
            // csíkkal, mint a többi; üresen (vagy ha a szűrő mindet elrejti) a csík sem látszik
            const egyebCsoport = ujElem('div', 'ital-alcsoport');
            const egyebCim = ujElem('h4', 'ital-alcsoport-cim', tr('other', 'Egyéb'));
            const egyeb = ujElem('div', 'ital-alcsoport-lista');
            egyeb.dataset.alkulcs = alKulcs(fo.kod, '');
            egyebCsoport.append(egyebCim, egyeb);
            lista.appendChild(egyebCsoport);
        }
        doboz.append(fejlec, lista);
        return doboz;
    }));
}

// Egy ital megjelenítendő színei. Régebben az italok mentett színekre (public.szin_paletta) is
// hivatkozhattak (kep_szin_N_id); amíg ilyen hivatkozás van, annak a jelenlegi értéke számít,
// különben az italon tárolt szín. Az űrlap új mentéskor már csak a színt tárolja, hivatkozást nem.
export function effektivSzinek(ital) {
    const feloldas = (hex, id) => {
        const sz = id != null && allapot.szinPaletta.find(s => s.id === id);
        return sz ? sz.kep_szin_1 : hex;
    };
    return {
        kep_szin_1: feloldas(ital.kep_szin_1, ital.kep_szin_1_id),
        kep_szin_2: feloldas(ital.kep_szin_2, ital.kep_szin_2_id),
        kep_szin_3: feloldas(ital.kep_szin_3, ital.kep_szin_3_id),
    };
}

// Kisebb kiszerelés (0,33 l-es doboz): a képe valamivel kisebb az alap 0,5 l-esnél
const kisebbKiszereles = (ital) => ital.kiszereles === 'dobozos_330';

// Alkoholfok-jelvény szövege: előtag + kiemelt érték, textContent-tel (nincs innerHTML)
function badgeSzoveg(elem, elotag, ertek) {
    elem.replaceChildren();
    if (elotag) elem.appendChild(document.createTextNode(elotag));
    const kiemelt = document.createElement('span');
    kiemelt.textContent = ertek;
    elem.appendChild(kiemelt);
}

export function addItalKartyaToUI(ital, rendez = true) {
    const fo = K().kategoria(ital.kategoria_id) || K().fo.find(f => f.kod === 'egyeb') || K().fo[0];
    if (!fo) return;
    const al = K().alkategoria(ital);
    // Az ital-kep.js a kategória kódját és ikonját várja; a színeket a paletta jelenlegi állása szerint oldjuk fel
    const kepAdat = { ...ital, ...effektivSzinek(ital), kategoria: fo.kod, ikon: fo.ikon };

    const kartya = document.createElement('div');
    kartya.className = 'ital-kartya';
    kartya.id = `ital-${ital.id}`;
    kartya.dataset.kategoria = fo.kod;
    kartya.dataset.alkategoria = al ? al.kod : '';
    kartya.dataset.vanAlcsoport = K().alkategoriai(fo.id).length > 0 ? '1' : '0';
    kartya.dataset.zeroSzuro = fo.zero_szuro ? '1' : '0';
    kartya.dataset.zero = K().zero(ital) ? '1' : '0';
    // A 0,33 l-es doboz valamivel kisebb képet kap, mint az alap 0,5 l-es (css: .kisebb-kiszereles)
    kartya.classList.toggle('kisebb-kiszereles', kisebbKiszereles(ital));
    // Teljes név (márkával) a rendezéshez és a név szerinti elrejtéshez; a felirat márka nélküli
    kartya.dataset.nev = ital.nev || '';

    const kep = window.italKep.elemLetrehoz(kepAdat);

    const felirat = document.createElement('span');
    felirat.className = 'ital-felirat';
    feliratBeallit(felirat, ital.nev);

    kartya.appendChild(kep);
    kartya.appendChild(felirat);

    // A saját, még jóváhagyatlan italon jelvény (mást a szerver nem is ad vissza jóváhagyatlanul)
    const sajatJavaslat = !ital.jovahagyva && !!ital.javasolta_id
        && ital.javasolta_id === window.goatsAuth?.getState()?.user?.id;
    if (sajatJavaslat) {
        kartya.classList.add('sajat-javaslat');
        kartya.appendChild(ujElem('span', 'jovahagyasra-var', tr('pending_approval', 'Jóváhagyásra vár')));
    }

    kartya.setAttribute('aria-label', ital.nev || '');
    billentyuvelKattinthato(kartya, () => italReszletek(kartya, ital, fo, kepAdat));

    const cel = forrasKontener(kartya);
    if (!cel) return;
    cel.appendChild(kartya);
    if (rendez) rendezKartyakatContainerben(cel);
}

// A kiválasztott ital ablaka: kép, név, alkoholfok, recept, besorolás gombok
function italReszletek(kartya, ital, fo, kepAdat) {
    allapot.aktivElemId = kartya.id;
    allapot.aktivItalAdat = ital;

    // Ugyanaz az elem, mint a kártyán: kép (tartalék-sorrenddel), vagy kép híján a színezett kategória-ikon
    const kep = window.italKep.elemLetrehoz(kepAdat);
    kep.id = 'modal-kep';
    const kepHely = document.getElementById('modal-kep-hely');
    kepHely.replaceChildren(kep);
    kepHely.classList.toggle('kisebb-kiszereles', kisebbKiszereles(ital));

    document.getElementById('modal-nev').textContent = ital.nev;

    const badge = document.getElementById('modal-alkohol-badge');
    if (badge) {
        if (fo.recept) {
            badge.className = 'alkohol-badge valtozo';
            badgeSzoveg(badge, tr('abv_prefix', 'Alkoholfok: '), tr('variable', 'Változó'));
            badge.hidden = false;
        } else if (!fo.alkoholos) {
            badge.className = 'alkohol-badge mentes';
            badgeSzoveg(badge, '', tr('alcohol_free', 'Alkoholmentes'));
            badge.hidden = false;
        } else if (ital.alkohol_fok !== null && ital.alkohol_fok !== undefined) {
            badge.className = 'alkohol-badge';
            badgeSzoveg(badge, tr('abv_prefix', 'Alkoholfok: '), `${ital.alkohol_fok}%`);
            badge.hidden = false;
        } else {
            badge.hidden = true;
        }
    }

    // Zero energiaital: "Cukormentes" jelvény az alkohol-jelvény mellett (italok.zero, üresen a névből)
    const cukor = document.getElementById('modal-cukor-badge');
    if (cukor) cukor.hidden = !(fo.zero_szuro && K().zero(ital));

    const doboz = document.getElementById('modal-koktel-hozzavalok-doboz');
    const kontener = document.getElementById('modal-koktel-hozzavalok-lista');
    const recept = fo.recept ? (osszetevokItalonkent.get(ital.id) || []) : [];
    kontener.replaceChildren(...recept.map((item, index) => {
        const sor = ujElem('div', 'koktel-sor' + (index < recept.length - 1 ? ' koktel-sor-elvalaszto' : ''));
        const egyseg = item.egyseg || (ital.recept_mod === 'arany' ? tr('part_unit', 'rész') : '');
        sor.append(
            ujElem('span', 'koktel-nev', item.nev),
            ujElem('span', 'koktel-mennyiseg', `${item.mennyiseg ?? ''} ${egyseg}`.trim())
        );
        return sor;
    }));
    if (doboz) doboz.hidden = recept.length === 0;

    betoltNaplo(ital);

    const szerkesztesGomb = document.getElementById('modal-szerkesztes-gomb');
    if (szerkesztesGomb) szerkesztesGomb.hidden = !window.goatsAuth?.isSuperadmin?.();

    document.getElementById('modal-hatter').hidden = false;
    // billentyűzettel a fókusz az ablakba kerül (a bezárás gombra), Esc vagy ✕ után vissza a kártyára
    document.getElementById('modal-bezar-gomb')?.focus();
}

// A kártya adatainak frissítése a meglévő DOM-elemen, helyben - nem mozgatja ki a már rangsorolt
// italt a tier-dobozból, csak a még a forrás-dobozban lévőket teszi át az (esetleg módosult) kategóriájukba.
export function frissitsItalKartyaDOM(italId, ital) {
    const kartya = document.getElementById(`ital-${italId}`);
    if (!kartya) return;

    const fo = K().kategoria(ital.kategoria_id) || K().fo.find(f => f.kod === 'egyeb') || K().fo[0];
    const al = K().alkategoria(ital);
    const kepAdat = { ...ital, ...effektivSzinek(ital), kategoria: fo.kod, ikon: fo.ikon };

    kartya.dataset.kategoria = fo.kod;
    kartya.dataset.alkategoria = al ? al.kod : '';
    kartya.dataset.vanAlcsoport = K().alkategoriai(fo.id).length > 0 ? '1' : '0';
    kartya.dataset.zeroSzuro = fo.zero_szuro ? '1' : '0';
    kartya.dataset.zero = K().zero(ital) ? '1' : '0';
    kartya.classList.toggle('kisebb-kiszereles', kisebbKiszereles(ital));
    kartya.dataset.nev = ital.nev || '';

    const regiKep = kartya.querySelector('img, .ital-ikon, .ital-szinezett');
    const ujKep = window.italKep.elemLetrehoz(kepAdat);
    if (regiKep) regiKep.replaceWith(ujKep); else kartya.insertBefore(ujKep, kartya.firstChild);

    const felirat = kartya.querySelector('.ital-felirat');
    if (felirat) feliratBeallit(felirat, ital.nev);

    // Ha még nincs rangsorolva (a forrás-dobozban van), a kategóriaváltozás miatt a megfelelő helyre kerül
    if (!kartya.closest('.ranglista-dropzone')) {
        const ujCel = forrasKontener(kartya);
        if (ujCel && ujCel !== kartya.parentElement) ujCel.appendChild(kartya);
        if (kartya.parentElement) rendezKartyakatContainerben(kartya.parentElement);
    }

    allapot.aktivItalAdat = ital;
}
