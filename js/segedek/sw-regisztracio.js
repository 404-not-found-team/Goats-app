// A service worker regisztrálása (korábban inline <script> volt az oldalban; a CSP script-src 'self' azt tiltja)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.error('Service Worker hiba:', err));
    });
}
