// Italkategóriák egy helyen (public.ital_kategoriak): főkategóriák és alkategóriák, az alkategória-
// szabály és a zero felismerése. A Ranglista és az admin oldal is ezt használja.
// Klasszikus script (nem modul): window.italKategoriak-on keresztül érhető el.
(function () {
    // Kiszerelések (sörnél; az italok.kiszereles értékei). A "dobozos" az alap 0,5 literes doboz.
    const KISZERELESEK = [
        { kod: 'dobozos', nev: 'Dobozos (0,5 l)' },
        { kod: 'dobozos_330', nev: 'Dobozos (0,33 l)' },
        { kod: 'uveges', nev: 'Üveges' },
    ];
    const kiszerelesNev = (kod) => KISZERELESEK.find(k => k.kod === kod)?.nev || '';

    // Zero (cukormentes) automatikus felismerése a névből; az italok.zero oszlop felülírja
    const ZERO_MINTA = /\b(zero|sugar\s*free|sugarfree|cukormentes)\b/i;

    let kategoriak = [];   // az összes sor
    let foKategoriak = []; // szulo_id = null, sorrend szerint
    const alkategoriakSzulonkent = new Map(); // fő id -> alkategóriák (sorrend szerint)
    const azonositoSzerint = new Map();

    const rendez = (a, b) => (a.sorrend - b.sorrend) || a.nev.localeCompare(b.nev, 'hu');

    function beallit(sorok) {
        kategoriak = Array.isArray(sorok) ? sorok : [];
        azonositoSzerint.clear();
        alkategoriakSzulonkent.clear();
        kategoriak.forEach(k => azonositoSzerint.set(k.id, k));
        foKategoriak = kategoriak.filter(k => k.szulo_id === null).sort(rendez);
        foKategoriak.forEach(f => alkategoriakSzulonkent.set(f.id, []));
        kategoriak.filter(k => k.szulo_id !== null).sort(rendez).forEach(k => {
            if (alkategoriakSzulonkent.has(k.szulo_id)) alkategoriakSzulonkent.get(k.szulo_id).push(k);
        });
    }

    // A nyers sorok lekérése (beállítás nélkül), hogy más lekérdezésekkel párhuzamosan futhasson
    async function lekeres(client) {
        const { data, error } = await client
            .from('ital_kategoriak')
            .select('id, kod, nev, szulo_id, sorrend, szabaly_marka, szabaly_nev, ikon, recept, kiszereles, alkoholos, zero_szuro');
        if (error) throw error;
        return data || [];
    }

    async function betolt(client) {
        beallit(await lekeres(client));
        return kategoriak;
    }

    const kategoria = (id) => azonositoSzerint.get(id) || null;
    const alkategoriai = (foId) => alkategoriakSzulonkent.get(foId) || [];

    // Az ital alkategóriája: kézi beállítás (alkategoria_kezi) esetén az alkategoria_id (üresen: egyik sem),
    // különben az első illeszkedő szabály (márka egyezés vagy a név eleje)
    function szabalySzerint(ital) {
        const marka = String(ital.marka || '').toLowerCase();
        const nev = String(ital.nev || '').trim().toLowerCase();
        return alkategoriai(ital.kategoria_id).find(a =>
            (a.szabaly_marka && marka && a.szabaly_marka.toLowerCase() === marka) ||
            (a.szabaly_nev && nev.startsWith(a.szabaly_nev.trim().toLowerCase()))
        ) || null;
    }

    function alkategoria(ital) {
        if (ital.alkategoria_kezi) {
            const k = ital.alkategoria_id ? kategoria(ital.alkategoria_id) : null;
            return k && k.szulo_id === ital.kategoria_id ? k : null;
        }
        return szabalySzerint(ital);
    }

    const zeroAutomatikus = (ital) => ZERO_MINTA.test(String(ital.nev || ''));
    const zero = (ital) => (ital.zero === null || ital.zero === undefined) ? zeroAutomatikus(ital) : !!ital.zero;

    // Fájlnév-/kódbarát szlug (pl. "Red Bull" -> "red-bull")
    function szlug(szoveg) {
        return String(szoveg || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40);
    }

    window.italKategoriak = {
        betolt,
        lekeres,
        beallit,
        get osszes() { return kategoriak; },
        get fo() { return foKategoriak; },
        kategoria,
        alkategoriai,
        alkategoria,
        szabalySzerint,
        zero,
        zeroAutomatikus,
        szlug,
        KISZERELESEK,
        kiszerelesNev,
    };
})();
