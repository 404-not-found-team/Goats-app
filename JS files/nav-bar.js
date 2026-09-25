document.addEventListener('DOMContentLoaded', async () => {
    const htmlNevek = ["index", "tartozasok", "tervek", "ranglista", "goatsgame"];
    const oldalNevek = ["Kezdőlap", "Tartozások", "Tervek", "Ranglista", "Goats Game"];
    const oldalEmojik = ["🏠", "💸", "📋", "🏆", "🎮"];

    const publicPages = ["index", "ranglista"];

    const groupCode = localStorage.getItem('goats_group_code');
    const isLogged = !!groupCode;
    const navBar = document.getElementById("navBar");

    if (!navBar) return;

    let allowedPages = publicPages;

    if (isLogged) {
        const cachedPages = localStorage.getItem('goats_group_pages');
        if (cachedPages) {
            allowedPages = JSON.parse(cachedPages);
        } else {
            const { data } = await _supabase
                .from('groups')
                .select('enabled_pages')
                .eq('group_code', groupCode)
                .maybeSingle();

            if (data && data.enabled_pages) {
                allowedPages = data.enabled_pages;
                localStorage.setItem('goats_group_pages', JSON.stringify(allowedPages));
            } else {
                allowedPages = htmlNevek; 
            }
        }
    }

    const aktualisUtvonal = window.location.pathname.split('/').pop() || "index.html";
    navBar.innerHTML = '';

    for (let i = 0; i < htmlNevek.length; i++) {
        const pageKey = htmlNevek[i];
        const celFajl = `${pageKey}.html`;

        if (!allowedPages.includes(pageKey)) {
            continue;
        }

        const oldal = document.createElement('li');
        const link = document.createElement('a');
        const teljesNev = document.createElement('span');
        const emojiNev = document.createElement('span');

        if (aktualisUtvonal === celFajl) {
            oldal.className = "active";
        }

        teljesNev.textContent = `${oldalNevek[i]}`;
        teljesNev.className = "teljes-szoveg";
        link.appendChild(teljesNev);

        emojiNev.textContent = `${oldalEmojik[i]}`;
        emojiNev.className = "rovid-szoveg";
        link.appendChild(emojiNev);

        link.href = celFajl;
        oldal.appendChild(link);

        navBar.appendChild(oldal);
    }
});