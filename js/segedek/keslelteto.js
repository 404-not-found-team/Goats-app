// Egyszerű debounce: csak a legutóbbi hívást futtatja le, a megadott várakozás után.
// A visszaadott függvényen van egy .flush() (azonnal lefuttatja a várakozó hívást, pl. blur-ra)
// és egy .cancel() (elveti a várakozó hívást).
export function debounce(fn, ms) {
  let idozito = null;
  let utolsoArgs = null;

  function futtat() {
    idozito = null;
    const args = utolsoArgs;
    utolsoArgs = null;
    if (args) fn(...args);
  }

  function debounced(...args) {
    utolsoArgs = args;
    clearTimeout(idozito);
    idozito = setTimeout(futtat, ms);
  }

  debounced.flush = () => {
    if (idozito) { clearTimeout(idozito); futtat(); }
  };
  debounced.cancel = () => {
    clearTimeout(idozito);
    idozito = null;
    utolsoArgs = null;
  };

  return debounced;
}
