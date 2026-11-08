// A beállítások menü modaljai, modalonként külön sablonban (statikus HTML, felhasználói szöveg nincs
// benne: a neveket, adatokat a modulok textContent-tel írják be). A feliratok tr()-rel a kiválasztott
// nyelven kerülnek be (a nyelvi fájlból, ezért HTML-ként beilleszthetők). Az injectUserNavHTML() fűzi be őket.

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
          <button id="create-group-btn" class="gomb-uj-ital gomb-siker">➕ ${tr('create_group_btn', 'Új csoport létrehozása')}</button>
        </div>
      </div>

      <div id="auth-status" class="status-blokk"></div>
    </div>
  </div>
`;

const PROFIL_MODAL = `
  <!-- PROFIL MODAL -->
  <div id="profile-modal" class="sm-overlay" role="dialog" aria-modal="true" hidden>
    <div class="google-profile-card">
      <button type="button" aria-label="${tr('close', 'Bezárás')}" id="close-profile-btn" class="google-close-btn">&times;</button>
      <div class="google-user-header">
        <div id="group-avatar-badge" class="google-avatar-circle large"></div>
        <div class="google-user-info">
          <h3 id="profile-display-name">${tr('no_name', 'Nincs név')}</h3>
        </div>
      </div>


      <div class="google-menu-list">
        <button id="open-profile-details-btn" class="google-menu-btn"><span> ${tr('profile_details', 'Profil adatok')}</span><span class="arrow-icon">›</span></button>
        <button id="open-group-details-btn" class="google-menu-btn"><span> ${tr('group_details', 'Csoport adatok')}</span><span class="arrow-icon">›</span></button>
        <button id="open-join-group-btn" class="google-menu-btn" hidden><span> ${tr('join_or_new_group', 'Csatlakozás / új csoport')}</span><span class="arrow-icon">›</span></button>
        <button id="open-settings-btn" class="google-menu-btn"><span> ${tr('settings', 'Beállítások')}</span><span class="arrow-icon">›</span></button>
        <a href="jogi.html" rel="noopener" class="google-menu-btn"><span> ${tr('legal_information', 'Jogi információk')}</span><span class="arrow-icon">›</span></a>
        <button id="logout-btn" class="google-menu-btn danger"><span> ${tr('logout', 'Kijelentkezés')}</span></button>
      </div>
      <p id="profile-status" class="sm-status sm-status-small"></p>
    </div>
  </div>
`;

const PROFIL_ADATOK_MODAL = `
  <!-- PROFIL ADATOK MODAL -->
  <div id="profil-details-modal" class="sm-overlay" role="dialog" aria-modal="true" hidden>
    <div class="sm-card">
      <div class="sm-header">
        <h3> ${tr('profile_details', 'Profil adatok')}</h3>
        <button type="button" aria-label="${tr('close', 'Bezárás')}" id="close-profil-details-btn" class="sm-close-btn">&times;</button>
      </div>
      <div class="sm-body">
        <div class="floating-group mb-8">
          <input type="text" id="profile-display-email" class="floating-input" placeholder=" " readonly tabindex="-1" />
          <label class="floating-label">${tr('email_address', 'E-mail cím')}</label>
        </div>

        <div class="floating-group mb-8">
          <input type="text" id="own-name-input" class="floating-input" placeholder=" " maxlength="30" autocomplete="off" />
          <label class="floating-label">${tr('your_display_name', 'A te megjelenített neved')}</label>
        </div>
        <p id="own-name-status" class="sm-status sm-status-small mb-14"></p>

        <div class="mt-12">
          <button id="toggle-profil-muveletek-btn" type="button" class="google-menu-btn" aria-expanded="false">
            <span>⚙️ ${tr('actions', 'Műveletek')}</span><span id="profil-muveletek-nyil" class="arrow-icon">›</span>
          </button>
          <div id="profil-muveletek-tartalom" class="google-menu-list mt-10" hidden>
            <button id="delete-account-btn" class="google-menu-btn danger-dark"><span> ${tr('delete_profile', 'Fiók törlése')}</span></button>
          </div>
        </div>
        <p id="profile-details-status" class="sm-status sm-status-small"></p>
      </div>
    </div>
  </div>
`;

const CSOPORT_ADATOK_MODAL = `
  <!-- CSOPORT ADATOK MODAL -->
  <div id="group-details-modal" class="sm-overlay" role="dialog" aria-modal="true" hidden>
    <div class="sm-card">
      <div class="sm-header">
        <h3> ${tr('group_details', 'Csoport adatok')}</h3>
        <button type="button" aria-label="${tr('close', 'Bezárás')}" id="close-group-details-btn" class="sm-close-btn">&times;</button>
      </div>
      <div class="sm-body">
        <p id="group-no-group" class="csoport-nelkul" hidden>${tr('no_group_yet', 'Még nem tartozol csoporthoz.')}</p>

        <div id="group-content">
          <div class="floating-group">
            <input type="text" id="group-name-display" class="floating-input" placeholder=" " maxlength="40" readonly />
            <label class="floating-label">${tr('group_name', 'Csoport neve')}</label>
          </div>
          <p id="group-name-status" class="sm-status sm-status-small mb-12"></p>

          <div class="floating-group input-with-toggle">
            <input type="password" id="group-code-display" class="floating-input" placeholder=" " readonly />
            <label class="floating-label">${tr('group_code_label', 'Csoportkód (ezzel tudnak csatlakozni)')}</label>
            <button id="toggle-group-code-visibility" type="button" class="input-toggle-btn">👁️</button>
          </div>
          <button id="copy-group-code-btn" type="button" class="sm-btn google-menu-btn mb-14"> ${tr('copy_code', 'Kód másolása')}</button>

          <div class="mb-10">
            <button id="toggle-tagok-btn" type="button" class="google-menu-btn" aria-expanded="false">
              <span>👥 ${tr('members', 'Tagok')}</span><span id="tagok-nyil" class="arrow-icon">›</span>
            </button>
            <div id="tagok-tartalom" class="mt-10" hidden>
              <div id="group-members-list" class="mb-12"></div>
              <div class="google-menu-list">
                <button id="indit-eltavolitas-btn" type="button" class="google-menu-btn danger" hidden>${tr('remove_members', 'Tagok eltávolítása')}</button>
                <button id="indit-atadas-btn" type="button" class="google-menu-btn" hidden>${tr('transfer_admin', 'Admin jog átadása')}</button>
                <p id="muveletek-sugo" class="szoveg-kicsi" hidden></p>
                <button id="muveletek-vegrehajt-btn" type="button" class="google-menu-btn" hidden>${tr('execute', 'Végrehajtás')}</button>
                <button id="muveletek-megse-btn" type="button" class="google-menu-btn" hidden>${tr('cancel', 'Mégse')}</button>
              </div>
            </div>
          </div>

          <!-- Műveletek: a Kilépés mindenkinek látszik, a többi csak adminnak -->
          <div id="csoport-muveletek-blokk" class="mt-10" hidden>
            <button id="toggle-muveletek-btn" type="button" class="google-menu-btn" aria-expanded="false">
              <span>⚙️ ${tr('actions', 'Műveletek')}</span><span id="muveletek-nyil" class="arrow-icon">›</span>
            </button>
            <div id="csoport-muveletek-tartalom" class="google-menu-list mt-10" hidden>
              <button id="regenerate-code-btn" type="button" class="google-menu-btn" hidden>${tr('regenerate_code', 'Új csoportkód generálása')}</button>
              <button id="delete-group-btn" type="button" class="google-menu-btn danger" hidden>${tr('delete_group', 'Csoport törlése')}</button>
              <p id="group-details-status" class="sm-status sm-status-small"></p>
              <button id="leave-group-btn" type="button" class="google-menu-btn danger">${tr('leave_group', 'Kilépés a csoportból')}</button>
            </div>
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
  <div id="settings-modal" class="sm-overlay" role="dialog" aria-modal="true" hidden>
    <div class="sm-card">
      <div class="sm-header">
        <h3> ${tr('settings', 'Beállítások')}</h3>
        <button type="button" aria-label="${tr('close', 'Bezárás')}" id="close-settings-btn" class="sm-close-btn">&times;</button>
      </div>
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
