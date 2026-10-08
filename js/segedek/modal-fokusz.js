// Közös segédfüggvény: egy most megjelenített modal kapja a billentyűzet-fókuszt, hogy Tab/Esc
// ne a (már rejtett) korábbi elemen ragadjon be.
export function fokuszAllit(modalEl) {
  if (!modalEl) return;
  if (!modalEl.hasAttribute('tabindex')) modalEl.setAttribute('tabindex', '-1');
  modalEl.focus({ preventScroll: true });
}
