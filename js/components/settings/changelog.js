import { client } from '../../supabase-client.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export async function betoltChangelog() {
  const kontener = document.getElementById('changelog-lista');
  if (!kontener) return;

  try {
    const { data: frissitesek, error } = await client
      .from('dev_changelog')
      .select('*')
      .order('datum', { ascending: false });

    if (error || !frissitesek) {
      kontener.innerHTML = '<p style="color: #ef4444; text-align: center;">Nem sikerült betölteni a frissítéseket.</p>';
      return;
    }

    kontener.innerHTML = frissitesek.map(item => {
      const formatumDatum = new Date(item.datum).toLocaleDateString('hu-HU', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      const kategoria = String(item.kategoria || 'uj').replace(/[^a-z0-9_-]/gi, '');

      return `
        <div class="changelog-kartya ${kategoria}">
          <div class="changelog-fejlec">
            <span class="changelog-verzio">${esc(item.verzio)}</span>
            <span class="changelog-datum">${esc(formatumDatum)}</span>
          </div>
          <h4 class="changelog-cim">${esc(item.cim)}</h4>
          <p class="changelog-leiras">${esc(item.leiras)}</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Changelog hiba:', err);
  }
}