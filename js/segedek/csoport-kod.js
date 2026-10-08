// Közös segédfüggvény a klasszikus (nem modul) oldalscripteknek.
// A csoportkód/taglista forrása az élő auth-állapot; localStorage csak akkor,
// ha az auth-service valamiért még nem futott le (sosem kéne előfordulnia).
function aktualisGroupCode() {
    return window.goatsAuth?.getState()?.group?.group_code || localStorage.getItem('goats_group_code');
}
