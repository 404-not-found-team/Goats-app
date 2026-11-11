// A beállítások menü modaljai, modalonként külön sablonban (statikus HTML, felhasználói szöveg nincs
// benne: a neveket, adatokat a modulok textContent-tel írják be). A feliratok tr()-rel a kiválasztott
// nyelven kerülnek be (a nyelvi fájlból, ezért HTML-ként beilleszthetők). Az injectUserNavHTML() fűzi be őket.

// Kis vonalas ikonok (SVG) a gombokhoz: emoji helyett, a téma szövegszínét veszik fel
const IKON = {
  szem: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  szemKi: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.4 18.4 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
  masol: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  pipa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
};
export { IKON };

// Az al-ablakok fejléce: vissza nyíl a profil menübe, cím, bezárás
const visszaFejlec = (cim, bezarId) => `
      <div class="sm-header sm-fejlec-vissza">
        <button type="button" class="sm-vissza-btn" data-vissza-profil aria-label="${tr('back_to_menu', 'Vissza a menübe')}">‹</button>
        <h3>${cim}</h3>
        <button type="button" aria-label="${tr('close', 'Bezárás')}" id="${bezarId}" class="sm-close-btn">&times;</button>
      </div>`;

const BELEPES_MODAL = `
  <!-- BELÉPÉS / CSOPORT MODAL -->
  <div id="auth-modal" class="sm-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title" hidden>
    <div class="sm-card auth-kartya">
      <div class="sm-header sm-fejlec-sor">
        <h3 id="auth-title">${tr('login', 'Belépés')}</h3>
        <button type="button" aria-label="${tr('close', 'Bezárás')}" id="close-auth-btn" class="sm-close-btn">&times;</button>
      </div>

      <!-- 1. lépés: Google bejelentkezés (ha nincs session) -->
      <div id="auth-step-login">
        <p class="auth-leiras">
          ${tr('login_intro', 'Jelentkezz be Google-fiókkal, utána csatlakozhatsz egy csoporthoz vagy létrehozhatsz egy újat.')}
        </p>
        <button id="google-login-btn" class="gomb-uj-ital gomb-google">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" class="ikon-20">
          ${tr('login_google', 'Bejelentkezés Google-fiókkal')}
        </button>
        <p class="mt-15 szoveg-kicsi">
          ${tr('login_agreement_prefix', 'A bejelentkezéssel elfogadod a')}
          <a href="felhasznalasi-feltetelek.html" target="_blank" rel="noopener" class="link-akcent">${tr('the_terms_link', 'Felhasználási feltételeket')}</a>
          ${tr('login_agreement_middle', 'és az')}
          <a href="privacy.html" target="_blank" rel="noopener" class="link-akcent">${tr('the_privacy_link', 'Adatvédelmi tájékoztatót')}</a>${tr('login_agreement_suffix', ', és kijelented, hogy elmúltál 18 éves.')}
        </p>
      </div>

      <!-- 2. lépés: csoport (ha van session, de nincs csoport) -->
      <div id="auth-step-group" hidden>
        <p id="auth-user-line" class="auth-user-line"></p>

        <div id="sign-in-code-section" class="mb-20">
          <div class="floating-group mb-8">
            <input type="text" id="auth-group-code-input" class="floating-input" placeholder=" " autocomplete="off" />
            <label class="floating-label">${tr('existing_group_code', 'Meglévő csoportkód')}</label>
          </div>
          <button id="auth-submit-btn" class="gomb-uj-ital gomb-teljes">${tr('join_group_btn', 'Csatlakozás a csoporthoz')}</button>
        </div>

        <div class="elvalaszto-szoveg">${tr('or_create_new', 'vagy hozz létre egy újat:')}</div>

        <div id="create-group-section">
          <div class="floating-group mb-8">
            <input type="text" id="new-group-name-input" class="floating-input" placeholder=" " maxlength="40" autocomplete="off" />
            <label class="floating-label">${tr('new_group_name', 'Új csoport neve (pl. "Buli Csapat")')}</label>
          </div>
          <button id="create-group-btn" class="gomb-uj-ital gomb-siker">${tr('create_group_btn', 'Új csoport létrehozása')}</button>
        </div>
      </div>

      <div id="auth-status" class="status-blokk"></div>
    </div>
  </div>
`;

const PROFIL_MODAL = `
  <!-- PROFIL MENÜ: lenyíló menü a profilgomb alatt (gépen az oldalsáv profilkártyája, telefonon a jobb
       felső kör alatt; a helyét a profil-modal.js állítja be). Kívülre kattintva vagy Esc-re bezárul. -->
  <div id="profile-modal" class="sm-overlay profil-lenyilo" role="dialog" aria-modal="true" aria-labelledby="profile-display-name" hidden>
    <div class="google-profile-card">
      <div class="google-user-header">
        <div id="group-avatar-badge" class="google-avatar-circle large"></div>
        <div class="google-user-info">
          <h3 id="profile-display-name">${tr('no_name', 'Nincs név')}</h3>
          <span id="profile-group-name" class="profil-csoportnev"></span>
        </div>
      </div>

      <div class="profil-menu-lista">
        <button id="open-profile-details-btn" class="profil-menu-sor"><span>${tr('profile_details', 'Profil adatok')}</span><span class="arrow-icon">›</span></button>
        <button id="open-group-details-btn" class="profil-menu-sor"><span>${tr('group_details', 'Csoport adatok')}</span><span class="arrow-icon">›</span></button>
        <button id="open-join-group-btn" class="profil-menu-sor" hidden><span>${tr('join_or_new_group', 'Csatlakozás / új csoport')}</span><span class="arrow-icon">›</span></button>
        <button id="open-settings-btn" class="profil-menu-sor"><span>${tr('settings', 'Beállítások')}</span><span class="arrow-icon">›</span></button>
        <a href="jogi.html" class="profil-menu-sor"><span>${tr('legal_information', 'Jogi információk')}</span><span class="arrow-icon">›</span></a>
        <span class="profil-menu-elvalaszto" aria-hidden="true"></span>
        <button id="logout-btn" class="profil-menu-sor veszely"><span>${tr('logout', 'Kijelentkezés')}</span></button>
      </div>
      <p id="profile-status" class="sm-status sm-status-small"></p>
    </div>
  </div>
`;

const PROFIL_ADATOK_MODAL = `
  <!-- PROFIL ADATOK MODAL (a Beállítások stílusában: szürke szakaszcím, alatta doboz) -->
  <div id="profil-details-modal" class="sm-overlay beall-ablak" role="dialog" aria-modal="true" hidden>
    <div class="sm-card">${visszaFejlec(tr('profile_details', 'Profil adatok'), 'close-profil-details-btn')}
      <div class="sm-body">
        <p class="sm-label">${tr('email_address', 'E-mail cím')}</p>
        <p id="profile-display-email" class="beall-doboz beall-ertek halvany"></p>

        <label class="sm-label valaszto-kovetkezo" for="own-name-input">${tr('your_display_name', 'A te megjelenített neved')}</label>
        <div class="beall-doboz beall-mezo-sor">
          <input type="text" id="own-name-input" class="beall-input" maxlength="30" autocomplete="off" />
          <span id="own-name-status" class="beall-mezo-allapot" role="status" aria-live="polite"></span>
        </div>
        <p class="szoveg-kicsi beall-leiras">${tr('display_name_hint', 'Így látnak a csoportod tagjai. Gépelés után magától mentődik.')}</p>

        <p class="sm-label valaszto-kovetkezo">${tr('danger_zone', 'Veszélyes műveletek')}</p>
        <div class="beall-veszely">
          <button id="delete-account-btn" type="button" class="beall-veszely-gomb">${tr('delete_profile', 'Fiók törlése')}</button>
        </div>
        <p id="profile-details-status" class="sm-status sm-status-small"></p>
      </div>
    </div>
  </div>
`;

const CSOPORT_ADATOK_MODAL = `
  <!-- CSOPORT ADATOK MODAL (a Beállítások stílusában) -->
  <div id="group-details-modal" class="sm-overlay beall-ablak" role="dialog" aria-modal="true" hidden>
    <div class="sm-card">${visszaFejlec(tr('group_details', 'Csoport adatok'), 'close-group-details-btn')}
      <div class="sm-body">
        <p id="group-no-group" class="csoport-nelkul" hidden>${tr('no_group_yet', 'Még nem tartozol csoporthoz.')}</p>

        <div id="group-content">
          <label class="sm-label" for="group-name-display">${tr('group_name', 'Csoport neve')}</label>
          <div class="beall-doboz beall-mezo-sor">
            <input type="text" id="group-name-display" class="beall-input" maxlength="40" readonly />
            <span id="group-name-status" class="beall-mezo-allapot" role="status" aria-live="polite"></span>
          </div>

          <label class="sm-label valaszto-kovetkezo" for="group-code-display">${tr('group_code_label', 'Csoportkód (ezzel tudnak csatlakozni)')}</label>
          <div class="beall-doboz beall-mezo-sor">
            <input type="password" id="group-code-display" class="beall-input beall-kod" readonly />
            <button id="toggle-group-code-visibility" type="button" class="beall-ikon-gomb" aria-label="${tr('show_code', 'Kód mutatása')}">${IKON.szem}</button>
            <button id="copy-group-code-btn" type="button" class="beall-ikon-gomb" aria-label="${tr('copy_code', 'Kód másolása')}">${IKON.masol}</button>
          </div>

          <p id="tagok-cim" class="sm-label valaszto-kovetkezo">${tr('members', 'Tagok')}</p>
          <div id="group-members-list" class="beall-doboz beall-tagok"></div>
          <div class="beall-linkek">
            <button id="indit-eltavolitas-btn" type="button" class="beall-link" hidden>${tr('remove_members', 'Tagok eltávolítása')}</button>
            <button id="indit-atadas-btn" type="button" class="beall-link" hidden>${tr('transfer_admin', 'Admin jog átadása')}</button>
          </div>
          <p id="muveletek-sugo" class="szoveg-kicsi beall-leiras" hidden></p>
          <div class="beall-gombsor">
            <button id="muveletek-megse-btn" type="button" class="sm-btn" hidden>${tr('cancel', 'Mégse')}</button>
            <button id="muveletek-vegrehajt-btn" type="button" class="sm-btn sm-btn-save" hidden>${tr('execute', 'Végrehajtás')}</button>
          </div>

          <!-- Veszélyes műveletek: a Kilépés mindenkinek látszik, a többi csak adminnak -->
          <div id="csoport-muveletek-blokk">
            <p class="sm-label valaszto-kovetkezo">${tr('danger_zone', 'Veszélyes műveletek')}</p>
            <div class="beall-veszely">
              <button id="regenerate-code-btn" type="button" class="beall-veszely-gomb" hidden>${tr('regenerate_code', 'Új csoportkód generálása')}</button>
              <button id="leave-group-btn" type="button" class="beall-veszely-gomb">${tr('leave_group', 'Kilépés a csoportból')}</button>
              <button id="delete-group-btn" type="button" class="beall-veszely-gomb" hidden>${tr('delete_group', 'Csoport törlése')}</button>
            </div>
            <p id="group-details-status" class="sm-status sm-status-small"></p>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

const TOS_UJRAELFOGADAS_MODAL = `
  <!-- FELTÉTELEK ÚJRAELFOGADÁSA: csak akkor jelenik meg, ha a TOS_VERSION változott azóta,
       hogy a felhasználó utoljára elfogadta. Szándékosan nincs bezáró (X) gombja. -->
  <div id="tos-ujraelfogadas-modal" class="sm-overlay" role="dialog" aria-modal="true" hidden>
    <div class="sm-card">
      <div class="sm-header">
        <h3> ${tr('tos_updated_title', 'Frissültek a feltételeink')}</h3>
      </div>
      <div class="sm-body">
        <p>
          ${tr('tos_updated_text', 'A Felhasználási feltételeket azóta frissítettük, hogy utoljára elfogadtad. A továbbhasználathoz el kell fogadnod az új verziót.')}
        </p>
        <p>
          <a href="felhasznalasi-feltetelek.html" target="_blank" rel="noopener" class="link-akcent">${tr('open_full_text', 'A teljes szöveg megnyitása')}</a>
        </p>
        <button id="ujraelfogad-btn" type="button" class="sm-btn sm-btn-save">${tr('i_accept', 'Elfogadom')}</button>
        <p id="ujraelfogadas-status" class="sm-status sm-status-small"></p>
      </div>
    </div>
  </div>
`;

const BEALLITASOK_MODAL = `
  <!-- BEÁLLÍTÁSOK MODAL (TÉMA) -->
  <div id="settings-modal" class="sm-overlay beall-ablak" role="dialog" aria-modal="true" hidden>
    <div class="sm-card">${visszaFejlec(tr('settings', 'Beállítások'), 'close-settings-btn')}
      <div class="sm-body">
        <p id="tema-cimke" class="sm-label">${tr('choose_theme', 'Téma kiválasztása:')}</p>
        <div id="tema-kartyak" class="valaszto-racs" role="radiogroup" aria-labelledby="tema-cimke"></div>

        <p id="nyelv-cimke" class="sm-label valaszto-kovetkezo">${tr('choose_language', 'Nyelv kiválasztása:')}</p>
        <div id="nyelv-kartyak" class="valaszto-racs" role="radiogroup" aria-labelledby="nyelv-cimke"></div>

        <div id="ertesites-szakasz" hidden>
          <p id="ertesites-cimke" class="sm-label valaszto-kovetkezo">${tr('notifications', 'Értesítések:')}</p>
          <button id="ertesites-kapcsolo" type="button" class="ertesites-kapcsolo" role="switch" aria-checked="false" aria-labelledby="ertesites-cimke">
            <span class="ertesites-kapcsolo-sav" aria-hidden="true"><span class="ertesites-kapcsolo-gomb"></span></span>
            <span class="ertesites-kapcsolo-szoveg">${tr('push_off', 'Kikapcsolva')}</span>
          </button>
          <p class="szoveg-kicsi ertesites-leiras">${tr('push_desc', 'Értesítést kapsz, ha valaki tartozást ír fel neked, vagy új eseményt vesz fel a naptárba. Eszközönként külön kell bekapcsolni.')}</p>
          <p id="ertesites-allapot" class="sm-status sm-status-small" role="status" aria-live="polite"></p>
        </div>

        <div id="gnaptar-szakasz" hidden>
          <p id="gnaptar-cimke" class="sm-label valaszto-kovetkezo">${tr('gcal_title', 'Google Naptár:')}</p>
          <button id="gnaptar-kapcsolo" type="button" class="ertesites-kapcsolo" role="switch" aria-checked="false" aria-labelledby="gnaptar-cimke">
            <span class="ertesites-kapcsolo-sav" aria-hidden="true"><span class="ertesites-kapcsolo-gomb"></span></span>
            <span class="ertesites-kapcsolo-szoveg">${tr('push_off', 'Kikapcsolva')}</span>
          </button>
          <p class="szoveg-kicsi ertesites-leiras">${tr('gcal_desc', 'A csoport eseményei megjelennek a Google Naptáradban, egy külön „ATG” naptárban. Ehhez a naptárt megosztjuk az e-mail címeddel.')}</p>
          <p id="gnaptar-allapot" class="sm-status sm-status-small" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  </div>
`;

// A beillesztés sorrendje (a DOM-ban egymás után)
const MODALOK = [
  BELEPES_MODAL,
  PROFIL_MODAL,
  PROFIL_ADATOK_MODAL,
  CSOPORT_ADATOK_MODAL,
  TOS_UJRAELFOGADAS_MODAL,
  BEALLITASOK_MODAL,
];

export function injectUserNavHTML(state) {
  const isLogged = !!state?.user;

  const headerContainer = document.createElement('div');
  headerContainer.className = 'top-user-nav';

  if (!isLogged) {
    headerContainer.innerHTML = `
      <button id="open-auth-modal-btn" class="nav-auth-btn">${tr('login', 'Belépés')}</button>
    `;
  } else {
    headerContainer.innerHTML = `
      <button id="open-profile-modal-btn" class="nav-profile-btn" title="${tr('profile', 'Profil')}">
        <div id="header-user-avatar" class="google-avatar-circle"></div>
        <span class="profil-szoveg">
          <span id="header-user-name" class="profil-nev"></span>
          <span id="header-group-name" class="profil-csoport"></span>
        </span>
      </button>
    `;
    const emoji = localStorage.getItem('goats_group_emoji');
    const sign = emoji || (state.group?.group_name || state.displayName || '🐐').charAt(0).toUpperCase();
    headerContainer.querySelector('#header-user-avatar').textContent = sign;
    // a nevek felhasználói adatok: textContent-tel, nem HTML-ként
    headerContainer.querySelector('#header-user-name').textContent = state.displayName || '';
    headerContainer.querySelector('#header-group-name').textContent = state.group?.group_name || '';
  }

  // Asztali nézetben a profil a navbar fölé kerül (a .jobb-kontenet oldalsávba, a menü fölé);
  // ahol nincs oldalsáv (pl. a belépési oldal), ott a régi helyén marad, a jobb felső sarokban
  const oldalsav = document.querySelector('.jobb-kontenet');
  if (oldalsav) {
    headerContainer.classList.add('sav-profil');
    oldalsav.prepend(headerContainer);
  } else {
    document.body.appendChild(headerContainer);
  }

  document.body.insertAdjacentHTML('beforeend', MODALOK.join('\n'));
}
