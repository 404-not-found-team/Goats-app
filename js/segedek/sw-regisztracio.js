// A service worker regisztrálása (korábban inline <script> volt az oldalban; a CSP script-src 'self' azt tiltja)
// Az sw.js az app gyökerében van (a hatóköre így az egész app); a címét e script helyéből számoljuk
// (js/segedek/ -> ../../), mert az oldalak almappákban is lehetnek.
if ('serviceWorker' in navigator) {
    const swCim = new URL('../../sw.js', document.currentScript.src);
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(swCim)
            .catch(err => console.error('Service Worker hiba:', err));
    });
}
