export function initLangPicker() {
    const get = id => document.getElementById(id);
    const langDropdown = get('custom-lang-dropdown');
    const langSelectedText = get('lang-dropdown-selected-text');
    const langOptionsContainer = get('lang-dropdown-options');

    const langs = [
        { id: 'hu', name: 'Magyar' },
        { id: 'en', name: 'English' }
    ];

    const currentLang = localStorage.getItem('goats_lang') || 'hu';
    const foundLang = langs.find(t => t.id === currentLang);
    if (langSelectedText && foundLang) langSelectedText.textContent = foundLang.name;

    if (langOptionsContainer) {
        langOptionsContainer.innerHTML = '';
        langs.forEach(t => {
            const optionDiv = document.createElement('div');
            optionDiv.className = `dropdown-option ${t.id === currentLang ? 'selected' : ''}`;
            optionDiv.textContent = t.name;

            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                document.documentElement.setAttribute('data-lang', t.id);
                localStorage.setItem('goats_lang', t.id);
                langSelectedText.textContent = t.name;
                langOptionsContainer.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
                optionDiv.classList.add('selected');
                langDropdown.classList.remove('open');
                nyelvetValt(t.id)
            });

            langOptionsContainer.appendChild(optionDiv);
        });
    }

    langDropdown?.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => langDropdown?.classList.remove('open'));
}

let aktualisNyelv = 'hu';

async function nyelvetValt(nyelvKod) {
    try {
        let valasz = await fetch(`nyelvek/${nyelvKod}.json`);
        if (!valasz.ok) throw new Error("Nem sikerült betölteni a fordítási fájlt.");

        let forditasok = await valasz.json();

        let elemek = document.querySelectorAll('[data-i18n]');
        elemek.forEach(elem => {
            let kulcs = elem.getAttribute('data-i18n');
            if (forditasok[kulcs]) {
                elem.textContent = forditasok[kulcs];
            }
        });

        aktualisNyelv = nyelvKod;

        const { data: { user } } = await window._supabase.auth.getUser();
        const currentUserId = user ? user.id : null;

        if (window.supabaseClient && currentUserId) {
            const { error } = await window.supabaseClient
                .from('profiles')
                .update({ language: nyelvKod })
                .eq('id', currentUserId);

            if (error) {
                console.error("Hiba a nyelv Supabase-be mentésekor:", error.message);
            }
        }

    } catch (hiba) {
        console.error("Hiba a nyelvváltás során:", hiba);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    if (window.supabaseClient) {
        const { data: { user } } = await window._supabase.auth.getUser();
        const currentUserId = user ? user.id : null;

        if (currentUserId) {
            const { data, error } = await window.supabaseClient
                .from('profiles')
                .select('language')
                .eq('id', currentUserId)
                .single();

            if (!error && data && data.language) {
                nyelvetValt(data.language);
                return;
            }
        }
    }

    nyelvetValt('hu');
});