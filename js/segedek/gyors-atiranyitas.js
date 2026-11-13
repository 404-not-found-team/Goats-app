// A kezdőlap (index.html) legelső, szinkron scriptje: ha a supabase-js munkamenet-tokenje
// ("sb-<projekt>-auth-token") megvan a localStorage-ban, a felhasználó szinte biztosan be van
// jelentkezve, ezért még a kirajzolás ELŐTT az oldalak/app.html-re irányítunk (a bejelentkező oldal így
// nem villan fel). Ha a token hiányzik, a js/pages/bejelentkezes-oldal.js teljes ellenőrzése dönt.
// Klasszikus, nem halasztott script: a <head>-ben, minden más előtt kell betölteni.
(function () {
    try {
        if (Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))) {
            location.replace(new URL('../../oldalak/app.html', document.currentScript.src));
        }
    } catch { /* nem elérhető tárhely: a teljes ellenőrzés dönt */ }
})();
