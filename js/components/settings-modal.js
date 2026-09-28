import { injectUserNavHTML } from './settings/settings-templates.js';
import { initAuthModal } from './settings/auth-modal.js';
import { initProfileModal } from './settings/profile-modal.js';
import { initGroupDetails } from './settings/group-details.js';
import { initThemePicker } from './settings/theme-picker.js';
import { initVerifySystem } from './settings/verify-email.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. HTML Sablonok beszúrása
  injectUserNavHTML();

  // 2. Modulok inicializálása
  initAuthModal();
  initProfileModal();
  initGroupDetails();
  initThemePicker();
  initVerifySystem();

  const get = id => document.getElementById(id);

  // Modal bezárók felvétele
  const closeBtns = [
    { btn: 'close-auth-btn', modal: 'auth-modal' },
    { btn: 'close-profile-btn', modal: 'profile-modal' },
    { btn: 'close-group-details-btn', modal: 'group-details-modal' },
    { btn: 'close-settings-btn', modal: 'settings-modal' },
    { btn: 'close-dev-btn', modal: 'dev-modal' },
    { btn: 'close-email-btn', modal: 'email-modal' },
    { btn: 'close-verify-btn', modal: 'verify-code-modal' }
  ];

  closeBtns.forEach(item => {
    get(item.btn)?.addEventListener('click', () => get(item.modal).style.display = 'none');
  });

  // Fő gombok nyitása
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'open-auth-modal-btn') get('auth-modal').style.display = 'flex';
    if (e.target && (e.target.id === 'open-profile-modal-btn' || e.target.closest('#open-profile-modal-btn'))) {
      get('profile-modal').style.display = 'flex';
    }
  });
});

export async function betoltChangelog() {
  const kontener = document.getElementById('changelog-lista');
  if (!kontener) return;

  try {
    const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
    const { data: frissitesek, error } = await client
      .from('dev_changelog')
      .select('*')
      .order('datum', { ascending: false });

    if (error || !frissitesek) {
      kontener.innerHTML = '<p style="color: #ef4444; text-align: center;">Nem sikerült betölteni a frissítéseket.</p>';
      return;
    }

    kontener.innerHTML = frissitesek.map(item => {
      const datumObj = new Date(item.datum);
      const formatumDatum = datumObj.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return `
        <div class="changelog-kartya ${item.kategoria || 'uj'}">
          <div class="changelog-fejlec">
            <span class="changelog-verzio">${item.verzio}</span>
            <span class="changelog-datum">${formatumDatum}</span>
          </div>
          <h4 class="changelog-cim">${item.cim}</h4>
          <p class="changelog-leiras">${item.leiras}</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Changelog hiba:', err);
  }
}