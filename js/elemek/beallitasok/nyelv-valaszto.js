// Nyelvválasztó a beállításokban + a választás szinkronizálása a fiókkal (public.profiles.language).
// Maga a nyelvváltás a js/segedek/nyelv.js-ben van (window.goatsNyelv), ami minden oldalon fut.
// - A helyi választás (localStorage) azonnal érvényes; az adatbázis csak a háttérben szinkronizál.
// - Ha ezen az eszközön még nem választottak nyelvet, a fiókban mentett nyelv érvényes (másik eszközről).
// - Ha itt már választottak, és a fiókban más van, a helyi választás kerül a fiókba.

const NYELVEK = [
    { id: 'hu', name: 'Magyar' },
    { id: 'en', name: 'English' },
];

const nyelv = () => window.goatsNyelv;
const kliens = () => window._supabase || null;

function helyiValasztasVan() {
    try { return !!localStorage.getItem('goats_lang'); } catch { return false; }
}

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
    const fiokNyelve = data?.language;
    const helyi = nyelv()?.aktualis();
    if (!fiokNyelve || !helyi || fiokNyelve === helyi) return;
    if (helyiValasztasVan()) {
        await mentesFiokba(helyi);
    } else if (NYELVEK.some(n => n.id === fiokNyelve)) {
        await nyelv()?.valt(fiokNyelve);
    }
}

export function initLangPicker() {
    const get = id => document.getElementById(id);
    const langDropdown = get('custom-lang-dropdown');
    const langSelectedText = get('lang-dropdown-selected-text');
    const langOptionsContainer = get('lang-dropdown-options');

    function frissitValaszto() {
        const aktualis = nyelv()?.aktualis() || 'hu';
        const talalt = NYELVEK.find(n => n.id === aktualis);
        if (langSelectedText && talalt) langSelectedText.textContent = talalt.name;
        langOptionsContainer?.querySelectorAll('.dropdown-option').forEach(o =>
            o.classList.toggle('selected', o.dataset.nyelv === aktualis));
    }

    if (langOptionsContainer) {
        langOptionsContainer.replaceChildren(...NYELVEK.map(n => {
            const opcio = document.createElement('div');
            opcio.className = 'dropdown-option';
            opcio.dataset.nyelv = n.id;
            opcio.textContent = n.name;
            opcio.addEventListener('click', async (e) => {
                e.stopPropagation();
                langDropdown?.classList.remove('open');
                await nyelv()?.valt(n.id);
                frissitValaszto();
                mentesFiokba(n.id);
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
