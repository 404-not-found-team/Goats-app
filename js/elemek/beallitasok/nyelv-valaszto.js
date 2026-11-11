// Nyelvválasztó a beállításokban (zászlós kártyák) + a választás szinkronizálása a fiókkal (public.profiles.language).
// Maga a nyelvváltás a js/segedek/nyelv.js-ben van (window.goatsNyelv), ami minden oldalon fut.
// - Amíg senki nem választott, a nyelvet a készülék (böngésző/telefon) beállítása adja magától, és az a
//   kártya látszik kiválasztottnak; a fiókban ilyenkor nincs nyelv (null).
// - Kártyára kattintva kézi választás lesz: helyben (localStorage) azonnal érvényes, és a fiókba is mentjük.
// - Ha ezen az eszközön még nem választottak, de a fiókban van választás (másik eszközről), az érvényes.
// - Ha itt kézzel választottak, és a fiókban más van, a helyi választás kerül a fiókba.

const NYELVEK = [
    { id: 'hu', name: 'Magyar' },
    { id: 'en', name: 'English' },
    { id: 'de', name: 'Deutsch' },
];

const nyelv = () => window.goatsNyelv;
const kliens = () => window._supabase || null;

// getSession: helyi munkamenet, nem hív hálózatot (a getUser minden hívásnál a szerverhez fordul)
async function felhasznaloId() {
    const c = kliens();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data?.session?.user?.id || null;
}

async function mentesFiokba(kod) {
    const userId = await felhasznaloId();
    if (!userId) return;
    const { error } = await kliens().from('profiles').update({ language: kod }).eq('id', userId);
    if (error) console.error('Hiba a nyelv fiókba mentésekor:', error.message);
}

async function szinkronFiokkal() {
    const userId = await felhasznaloId();
    if (!userId) return;
    const { data, error } = await kliens().from('profiles').select('language').eq('id', userId).maybeSingle();
    if (error) {
        console.error('Hiba a fiók nyelvének lekérdezésekor:', error.message);
        return;
    }
    const fiokNyelve = NYELVEK.some(n => n.id === data?.language) ? data.language : null;
    if (nyelv()?.automatikus()) {
        // másik eszközön választott nyelv: ezen az eszközön is az legyen (újratölt, ha más)
        if (fiokNyelve && fiokNyelve !== nyelv().aktualis()) await nyelv().valt(fiokNyelve);
        return;
    }
    const helyi = nyelv()?.aktualis();
    if (helyi && fiokNyelve !== helyi) await mentesFiokba(helyi);
}

function nyelvKartya(n) {
    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'valaszto-kartya nyelv-kartya';
    gomb.setAttribute('role', 'radio');
    gomb.dataset.nyelv = n.id;

    const zaszlo = document.createElement('img');
    zaszlo.className = 'nyelv-zaszlo';
    zaszlo.src = `img/zaszlok/${n.id}.svg`;
    zaszlo.alt = '';
    zaszlo.width = 54;
    zaszlo.height = 36;

    const nev = document.createElement('span');
    nev.className = 'valaszto-nev';
    nev.textContent = n.name;
    nev.lang = n.id;

    gomb.append(zaszlo, nev);
    return gomb;
}

export function initLangPicker() {
    const racs = document.getElementById('nyelv-kartyak');

    function jelol() {
        const aktualis = nyelv()?.aktualis() || 'hu';
        racs?.querySelectorAll('.nyelv-kartya').forEach(k =>
            k.setAttribute('aria-checked', String(k.dataset.nyelv === aktualis)));
    }

    async function valaszt(id) {
        // előbb a fiókba (a valt utána újratölti az oldalt, ha más a nyelv)
        await mentesFiokba(id);
        if (id === nyelv()?.aktualis()) {
            nyelv().valt(id, { ujratoltes: false }); // ugyanaz a nyelv, de mostantól kézi választás
            jelol();
        } else {
            await nyelv()?.valt(id);
        }
    }

    if (racs) {
        racs.replaceChildren(...NYELVEK.map(n => {
            const kartya = nyelvKartya(n);
            kartya.addEventListener('click', () => valaszt(n.id));
            return kartya;
        }));
    }

    // a beállítások ablak is tartalmazhat fordítandó szöveget, és a választónak a mostani nyelvet kell mutatnia
    nyelv()?.alkalmaz();
    jelol();
    nyelv()?.onValtozas(jelol);

    szinkronFiokkal();
}
