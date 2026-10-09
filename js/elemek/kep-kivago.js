// Négyzetes kivágás feltöltés előtt (Képek oldal). A kép mindenhol négyzetben jelenik meg,
// ezért a feltöltő választja ki, melyik része maradjon: a keretben látható rész lesz a kép.
// A rajzolás <canvas>-ra történik (nincs inline stílus): húzás egérrel/ujjal, nagyítás
// csúszkával, egérgörgővel vagy két ujjal, billentyűzettel nyilak és +/−.
// Markup: a kepek.html #kivagoDialog eleme.

const ELONEZET_MAX_OLDAL = 1280; // a megjelenítéshez kicsinyített másolat (gyors újrarajzolás)
const MAX_NAGYITAS = 4;
const BILLENTYU_LEPES = 0.04;    // a keret méretének ennyi része egy nyílbillentyűre

const $ = (id) => document.getElementById(id);

/**
 * A kivágó ablak megnyitása egy beolvasott képhez.
 * @param {{forras, szelesseg, magassag}} kep a kepBetoltes() eredménye
 * @param {{sorszam?: string, tobbVanHatra?: boolean}} [opciok]
 * @returns {Promise<{kivagas: {x,y,w,h}, mindKozepre?: boolean} | null>} null = a kép kihagyva
 */
export function kivagasValasztas(kep, opciok = {}) {
    const dialog = $('kivagoDialog');
    const vaszon = $('kivagoVaszon');
    const csuszka = $('kivagoNagyitas');
    const ctx = vaszon.getContext('2d');
    const { szelesseg: w, magassag: h } = kep;

    // Kicsinyített előnézeti másolat: ezt rajzoljuk újra húzás közben
    const arany = Math.min(1, ELONEZET_MAX_OLDAL / Math.min(w, h));
    const elonezet = document.createElement('canvas');
    elonezet.width = Math.max(1, Math.round(w * arany));
    elonezet.height = Math.max(1, Math.round(h * arany));
    elonezet.getContext('2d').drawImage(kep.forras, 0, 0, elonezet.width, elonezet.height);

    // Állapot forráspixelben: a keret középpontja és a nagyítás (1 = a rövidebb oldal kitölti a keretet)
    let nagyitas = 1;
    let cx = w / 2;
    let cy = h / 2;
    const keretMeret = () => Math.min(w, h) / nagyitas;

    function korlatoz() {
        const m = keretMeret();
        cx = Math.min(Math.max(cx, m / 2), w - m / 2);
        cy = Math.min(Math.max(cy, m / 2), h - m / 2);
    }

    function rajzol() {
        korlatoz();
        const m = keretMeret();
        const V = vaszon.width;
        ctx.clearRect(0, 0, V, V);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(elonezet, (cx - m / 2) * arany, (cy - m / 2) * arany, m * arany, m * arany, 0, 0, V, V);
        // Harmados segédvonalak
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const t of [1 / 3, 2 / 3]) {
            ctx.moveTo(V * t, 0); ctx.lineTo(V * t, V);
            ctx.moveTo(0, V * t); ctx.lineTo(V, V * t);
        }
        ctx.stroke();
        csuszka.value = String(nagyitas);
    }

    function nagyitasBeallit(uj) {
        nagyitas = Math.min(MAX_NAGYITAS, Math.max(1, uj));
        rajzol();
    }

    // CSS-pixelnyi elmozdulás -> forráspixel (a keret a vászon teljes szélessége)
    const forrasPixel = (cssPx) => cssPx * keretMeret() / (vaszon.clientWidth || vaszon.width);

    // Húzás és két ujjas nagyítás (Pointer Events)
    const mutatok = new Map();
    let csipesTav = null;
    const tav = () => {
        const [a, b] = [...mutatok.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };

    function lenyomas(e) {
        vaszon.setPointerCapture(e.pointerId);
        mutatok.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (mutatok.size === 2) csipesTav = tav();
    }

    function mozgas(e) {
        const elozo = mutatok.get(e.pointerId);
        if (!elozo) return;
        if (mutatok.size === 1) {
            cx -= forrasPixel(e.clientX - elozo.x);
            cy -= forrasPixel(e.clientY - elozo.y);
        }
        mutatok.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (mutatok.size === 2 && csipesTav) {
            const uj = tav();
            nagyitasBeallit(nagyitas * uj / csipesTav);
            csipesTav = uj;
            return;
        }
        rajzol();
    }

    function felengedes(e) {
        mutatok.delete(e.pointerId);
        if (mutatok.size < 2) csipesTav = null;
    }

    function gorgetes(e) {
        e.preventDefault();
        nagyitasBeallit(nagyitas * Math.exp(-e.deltaY * 0.0015));
    }

    function billentyu(e) {
        const lepes = keretMeret() * BILLENTYU_LEPES;
        const muveletek = {
            ArrowLeft: () => { cx -= lepes; }, ArrowRight: () => { cx += lepes; },
            ArrowUp: () => { cy -= lepes; }, ArrowDown: () => { cy += lepes; },
            '+': () => { nagyitas = Math.min(MAX_NAGYITAS, nagyitas * 1.1); },
            '=': () => { nagyitas = Math.min(MAX_NAGYITAS, nagyitas * 1.1); },
            '-': () => { nagyitas = Math.max(1, nagyitas / 1.1); },
        };
        if (!muveletek[e.key]) return;
        e.preventDefault();
        muveletek[e.key]();
        rajzol();
    }

    const csuszkaValtozas = () => nagyitasBeallit(Number(csuszka.value));
    const kozepre = () => { nagyitas = 1; cx = w / 2; cy = h / 2; rajzol(); };

    const kivagas = () => {
        korlatoz();
        const m = keretMeret();
        const meret = Math.max(1, Math.round(m));
        return {
            x: Math.min(w - meret, Math.max(0, Math.round(cx - m / 2))),
            y: Math.min(h - meret, Math.max(0, Math.round(cy - m / 2))),
            w: meret,
            h: meret,
        };
    };

    $('kivagoSorszam').textContent = opciok.sorszam || '';
    $('kivagoMindKozepre').hidden = !opciok.tobbVanHatra;
    csuszka.max = String(MAX_NAGYITAS);

    return new Promise((resolve) => {
        const esemenyek = [
            [vaszon, 'pointerdown', lenyomas], [vaszon, 'pointermove', mozgas],
            [vaszon, 'pointerup', felengedes], [vaszon, 'pointercancel', felengedes],
            [vaszon, 'wheel', gorgetes, { passive: false }], [vaszon, 'keydown', billentyu],
            [csuszka, 'input', csuszkaValtozas],
            [$('kivagoKozepre'), 'click', kozepre],
            [$('kivagoKesz'), 'click', () => vege({ kivagas: kivagas() })],
            [$('kivagoKihagy'), 'click', () => vege(null)],
            [$('kivagoMindKozepre'), 'click', () => { kozepre(); vege({ kivagas: kivagas(), mindKozepre: true }); }],
            [dialog, 'cancel', (e) => { e.preventDefault(); vege(null); }], // Esc = kihagyás
        ];

        function vege(eredmeny) {
            esemenyek.forEach(([elem, nev, fv, opc]) => elem.removeEventListener(nev, fv, opc));
            mutatok.clear();
            dialog.close();
            resolve(eredmeny);
        }

        esemenyek.forEach(([elem, nev, fv, opc]) => elem.addEventListener(nev, fv, opc));
        rajzol();
        dialog.showModal();
        vaszon.focus();
    });
}

// A kép közepéből kivágott legnagyobb négyzet (a "többit középre" választásnál)
export function kozepsoNegyzet(kep) {
    const m = Math.min(kep.szelesseg, kep.magassag);
    return {
        x: Math.round((kep.szelesseg - m) / 2),
        y: Math.round((kep.magassag - m) / 2),
        w: m,
        h: m,
    };
}
