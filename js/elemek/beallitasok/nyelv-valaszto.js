// Nyelvválasztó a beállításokban + a választás szinkronizálása a fiókkal (public.profiles.language).
// Maga a nyelvváltás a js/segedek/nyelv.js-ben van (window.goatsNyelv), ami minden oldalon fut.
// - "Automatikus": nincs kézi választás, a készülék (böngésző/telefon) nyelve dönt; a fiókban null.
// - Kézi választás (Magyar / English): helyben (localStorage) azonnal érvényes, és a fiókba is mentjük.
// - Ha ezen az eszközön automatikus a nyelv, de a fiókban van kézi választás (másik eszközről), az érvényes.
// - Ha itt kézzel választottak, és a fiókban más van, a helyi választás kerül a fiókba.

const NYELVEK = [
    { id: 'hu', name: 'Magyar' },
    { id: 'en', name: 'English' },
];
const AUTO = 'auto';

const nyelv = () => window.goatsNyelv;
const kliens = () => window._supabase || null;
const nyelvNeve = (kod) => NYELVEK.find(n => n.id === kod)?.name || kod;
const autoFelirat = () => tr('lang_auto', 'Automatikus ({lang})', { lang: nyelvNeve(nyelv()?.eszkozNyelve?.() || 'hu') });

// getSession: helyi munkamenet, nem hív hálózatot (a getUser minden hívásnál a szerverhez fordul)
async function felhasznaloId() {
    const c = kliens();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data?.session?.user?.id || null;
}

// kod = null: automatikus (nincs kézi választás a fiókban)
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
        // másik eszközön kézzel választott nyelv: ezen az eszközön is az legyen (újratölt, ha más)
        if (fiokNyelve && fiokNyelve !== nyelv().aktualis()) await nyelv().valt(fiokNyelve);
        return;
    }
    const helyi = nyelv()?.aktualis();
    if (helyi && fiokNyelve !== helyi) await mentesFiokba(helyi);
}

export function initLangPicker() {
    const get = id => document.getElementById(id);
    const langDropdown = get('custom-lang-dropdown');
    const langSelectedText = get('lang-dropdown-selected-text');
    const langOptionsContainer = get('lang-dropdown-options');

    const kivalasztott = () => (nyelv()?.automatikus() ? AUTO : (nyelv()?.aktualis() || 'hu'));

    function frissitValaszto() {
        const k = kivalasztott();
        if (langSelectedText) langSelectedText.textContent = k === AUTO ? autoFelirat() : nyelvNeve(k);
        langOptionsContainer?.querySelectorAll('.dropdown-option').forEach(o =>
            o.classList.toggle('selected', o.dataset.nyelv === k));
    }

    async function valaszt(id) {
        if (id === kivalasztott()) return;
        if (id === AUTO) {
            await mentesFiokba(null);
            nyelv()?.automatikusra(); // újratölt, ha a készülék nyelve más
            frissitValaszto();
            return;
        }
        // előbb a fiókba (a valt utána újratölti az oldalt, ha más a nyelv)
        await mentesFiokba(id);
        if (id === nyelv()?.aktualis()) {
            nyelv().valt(id, { ujratoltes: false }); // ugyanaz a nyelv, csak mostantól kézi választás
            frissitValaszto();
        } else {
            await nyelv()?.valt(id);
        }
    }

    if (langOptionsContainer) {
        const opciok = [{ id: AUTO, name: autoFelirat() }, ...NYELVEK];
        langOptionsContainer.replaceChildren(...opciok.map(n => {
            const opcio = document.createElement('div');
            opcio.className = 'dropdown-option';
            opcio.dataset.nyelv = n.id;
            opcio.textContent = n.name;
            opcio.addEventListener('click', (e) => {
                e.stopPropagation();
                langDropdown?.classList.remove('open');
                valaszt(n.id);
            });
            return opcio;
        }));
    }

    langDropdown?.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => langDropdown?.classList.remove('open'));

    // a beállítások ablak is tartalmazhat fordítandó szöveget, és a választónak a mostani nyelvet kell mutatnia
    nyelv()?.alkalmaz();
    frissitValaszto();
    nyelv()?.onValtozas(frissitValaszto);

    szinkronFiokkal();
}
