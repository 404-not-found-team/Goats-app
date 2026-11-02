let aktualisNyelv = 'hu';

async function nyelvetValt(nyelvKod) {
    try {
        let valasz = await fetch(`locales/nyelvek/${nyelvKod}.json`);
        if (!valasz.ok) throw new Error("Nem sikerült betölteni a fordítási fájlt.");
        
        let forditások = await valasz.json();

        let elemek = document.querySelectorAll('[data-i18n]');
        elemek.forEach(elem => {
            let kulcs = elem.getAttribute('data-i18n');
            if (forditások[kulcs]) {
                elem.textContent = fordítások[kulcs];
            }
        });

        aktualisNyelv = nyelvKod;

        const { data: { user } } = await window.supabaseClient.auth.getUser();
        const currentUserId = user ? user.id : null;
        
        if (window.supabaseClient && currentUserId) {
            const { error } = await window.supabaseClient
                .from('users')
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
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        const currentUserId = user ? user.id : null;

        if (currentUserId) {
            const { data, error } = await window.supabaseClient
                .from('users')
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