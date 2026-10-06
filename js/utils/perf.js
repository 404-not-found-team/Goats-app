// Betöltési mérés: a ?perf=1 kapcsoló mögött a konzolba írja a jelöléseket és a Supabase-hívásokat.
// Kapcsoló nélkül nem csinál semmit (a performance.mark olcsó, de nem terheljük vele a normál betöltést).
const aktiv = new URLSearchParams(location.search).has('perf');

export function jeloles(nev) {
  if (aktiv) performance.mark(nev);
}

function kiir() {
  const jelolesek = performance.getEntriesByType('mark').map(m => ({ jeles: m.name, ms: Math.round(m.startTime) }));
  const supabase = performance.getEntriesByType('resource')
    .filter(e => e.name.includes('.supabase.co/'))
    .map(e => ({ hivas: e.name.split('.supabase.co')[1].split('?')[0], kezdes_ms: Math.round(e.startTime), hossz_ms: Math.round(e.duration) }))
    .sort((a, b) => a.kezdes_ms - b.kezdes_ms);
  const nav = performance.getEntriesByType('navigation')[0];
  console.log('[perf] oldal:', location.pathname, 'DOMContentLoaded:', Math.round(nav?.domContentLoadedEventEnd ?? 0), 'ms');
  console.table(jelolesek);
  console.table(supabase);
}

if (aktiv) window.addEventListener('load', () => setTimeout(kiir, 0));
