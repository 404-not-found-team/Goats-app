export function injectUserNavHTML(state) {
  const isLogged = !!state?.user;

  const headerContainer = document.createElement('div');
  headerContainer.className = 'top-user-nav';

  if (!isLogged) {
    headerContainer.innerHTML = `
      <button id="open-auth-modal-btn" class="nav-auth-btn">Belépés</button>
    `;
  } else {
    headerContainer.innerHTML = `
      <button id="open-profile-modal-btn" class="nav-profile-btn" title="Profil">
        <div id="header-user-avatar" class="google-avatar-circle"></div>
      </button>
    `;
    const emoji = localStorage.getItem('goats_group_emoji');
    const sign = emoji || (state.group?.group_name || state.displayName || '🐐').charAt(0).toUpperCase();
    headerContainer.querySelector('#header-user-avatar').textContent = sign;
  }

  document.body.appendChild(headerContainer);

  document.body.insertAdjacentHTML('beforeend', `
    <!-- BELÉPÉS / CSOPORT MODAL -->
    <div id="auth-modal" class="sm-overlay" hidden>
      <div class="sm-card auth-kartya">
        <div class="sm-header sm-fejlec-sor">
          <h3 id="auth-title">Belépés</h3>
          <button id="close-auth-btn" class="sm-close-btn">&times;</button>
        </div>

        <!-- 1. lépés: Google bejelentkezés (ha nincs session) -->
        <div id="auth-step-login">
          <p class="auth-leiras">
            Jelentkezz be Google-fiókkal, utána csatlakozhatsz egy csoporthoz vagy létrehozhatsz egy újat.
          </p>
          <button id="google-login-btn" class="gomb-uj-ital gomb-google">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" class="ikon-20">
            Bejelentkezés Google-fiókkal
          </button>
          <div class="mt-15 szoveg-kicsi">
            <label class="kurzor-mutato">
              <input type="checkbox" id="accept-tos-checkbox">
              Elfogadom a <a href="#" id="open-tos-modal" class="link-akcent">Használati Feltételeket</a>
            </label>
          </div>
        </div>

        <!-- 2. lépés: csoport (ha van session, de nincs csoport) -->
        <div id="auth-step-group" hidden>
          <p id="auth-user-line" class="auth-user-line"></p>

          <div id="sign-in-code-section" class="mb-20">
            <div class="floating-group mb-8">
              <input type="text" id="auth-group-code-input" class="floating-input" placeholder=" " autocomplete="off" />
              <label class="floating-label">Meglévő csoportkód</label>
            </div>
            <button id="auth-submit-btn" class="gomb-uj-ital gomb-teljes">Csatlakozás a csoporthoz</button>
          </div>

          <div class="elvalaszto-szoveg">vagy hozz létre egy újat:</div>

          <div id="create-group-section">
            <div class="floating-group mb-8">
              <input type="text" id="new-group-name-input" class="floating-input" placeholder=" " maxlength="40" autocomplete="off" />
              <label class="floating-label">Új csoport neve (pl. "Buli Csapat")</label>
            </div>
            <button id="create-group-btn" class="gomb-uj-ital gomb-siker">➕ Új csoport létrehozása</button>
          </div>
        </div>

        <div id="auth-status" class="status-blokk"></div>
      </div>
    </div>

    <!-- PROFIL MODAL -->
    <div id="profile-modal" class="sm-overlay" hidden>
      <div class="google-profile-card">
        <button id="close-profile-btn" class="google-close-btn">&times;</button>
        <div class="google-user-header">
          <div id="group-avatar-badge" class="google-avatar-circle large"></div>
          <div class="google-user-info">
            <h3 id="profile-display-name">Nincs név</h3>
            <span class="google-plus-badge">V1.0.3</span>
          </div>
        </div>

        <p id="profile-display-email" class="profil-email"></p>

        <div class="google-menu-list">
          <button id="open-group-details-btn" class="google-menu-btn"><span> Csoport adatok</span><span class="arrow-icon">›</span></button>
          <button id="open-join-group-btn" class="google-menu-btn" hidden><span> Csatlakozás / új csoport</span><span class="arrow-icon">›</span></button>
          <button id="open-settings-btn" class="google-menu-btn"><span> Beállítások</span><span class="arrow-icon">›</span></button>
          <a href="gyermekvedelem.html" class="google-menu-btn"><span> Gyermekvédelmi normák</span><span class="arrow-icon">›</span></a>
          <button id="logout-btn" class="google-menu-btn danger"><span> Kijelentkezés</span></button>
          <button id="delete-account-btn" class="google-menu-btn danger-dark"><span> Fiók törlése</span></button>
        </div>
        <p id="profile-status" class="sm-status sm-status-small"></p>
      </div>
    </div>

    <!-- CSOPORT ADATOK MODAL -->
    <div id="group-details-modal" class="sm-overlay" hidden>
      <div class="sm-card">
        <div class="sm-header">
          <h3> Csoport adatok</h3>
          <button id="close-group-details-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <p id="group-no-group" class="csoport-nelkul" hidden>Még nem tartozol csoporthoz.</p>

          <!-- Saját megjelenített név: csoporton kívül is elérhető -->
          <div class="floating-group mb-8">
            <input type="text" id="own-name-input" class="floating-input" placeholder=" " maxlength="40" />
            <label class="floating-label">A te megjelenített neved</label>
          </div>
          <button id="save-own-name-btn" class="sm-btn sm-btn-save mb-6">Név mentése</button>
          <p id="own-name-status" class="sm-status sm-status-small mb-14"></p>

          <div id="group-content">
            <div class="floating-group">
              <input type="text" id="group-name-display" class="floating-input" placeholder=" " maxlength="40" readonly />
              <label class="floating-label">Csoport neve</label>
            </div>
            <button id="save-group-name-btn" class="sm-btn sm-btn-save mb-12" hidden>Név mentése</button>

            <div class="floating-group input-with-toggle">
              <input type="password" id="group-code-display" class="floating-input" placeholder=" " readonly />
              <label class="floating-label">Csoportkód (ezzel tudnak csatlakozni)</label>
              <button id="toggle-group-code-visibility" type="button" class="input-toggle-btn">👁️</button>
            </div>
            <button id="copy-group-code-btn" type="button" class="google-mini-edit-btn mb-14">📋 Kód másolása</button>

            <label class="sm-label">Tagok</label>
            <div id="group-members-list" class="mb-12"></div>

            <p id="group-details-status" class="sm-status sm-status-small"></p>

            <button id="regenerate-code-btn" class="google-menu-btn" hidden>Új csoportkód generálása</button>
            <button id="leave-group-btn" class="google-menu-btn danger">Kilépés a csoportból</button>
            <button id="delete-group-btn" class="google-menu-btn danger-dark" hidden>Csoport törlése</button>
          </div>
        </div>
      </div>
    </div>

    <!-- BEÁLLÍTÁSOK MODAL (TÉMA) -->
    <div id="settings-modal" class="sm-overlay" hidden>
      <div class="sm-card">
        <div class="sm-header">
          <h3> Beállítások</h3>
          <button id="close-settings-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <label class="sm-label">Téma kiválasztása:</label>
          <div id="custom-theme-dropdown" class="custom-dropdown">
            <div class="dropdown-selected"><span id="theme-dropdown-selected-text"> Sötét</span><span class="arrow">▼</span></div>
            <div id="theme-dropdown-options" class="dropdown-options"></div>
          </div>

          <!-- Superadmin: jóváhagyásra váró italok (a szerepkört az RPC ellenőrzi, nem a felület) -->
          <div id="drink-moderation" class="moderalas-blokk" hidden>
            <label class="sm-label">Jóváhagyásra váró italok</label>
            <div id="pending-drinks-list" class="moderalas-lista"></div>
            <p id="pending-drinks-status" class="sm-status sm-status-small"></p>
          </div>

          <!-- Superadmin: beérkezett jelentések (a szerepkört az RPC ellenőrzi, nem a felület) -->
          <div id="report-moderation" class="moderalas-blokk" hidden>
            <label class="sm-label">Jelentések</label>
            <div id="reports-list" class="moderalas-lista"></div>
            <p id="reports-status" class="sm-status sm-status-small"></p>
          </div>
        </div>
      </div>
    </div>

    <!-- JELENTÉS MODAL (kép, ital, csoporttag) -->
    <div id="jelentes-modal" class="sm-overlay" hidden>
      <div class="sm-card jelentes-kartya">
        <div class="sm-header">
          <h3>Jelentés</h3>
          <button id="jelentes-bezar" type="button" class="sm-close-btn" aria-label="Bezárás">&times;</button>
        </div>
        <div class="sm-body">
          <fieldset class="jelentes-okok">
            <legend class="sm-label">Mi a probléma?</legend>
            <label><input type="radio" name="jelentes-ok" value="gyermekbiztonsag"> Gyermekbiztonsági aggály (CSAE/CSAM)</label>
            <label><input type="radio" name="jelentes-ok" value="jogellenes"> Jogellenes vagy sértő tartalom</label>
            <label><input type="radio" name="jelentes-ok" value="zaklatas"> Zaklatás</label>
            <label><input type="radio" name="jelentes-ok" value="egyeb" checked> Egyéb</label>
          </fieldset>

          <label class="sm-label" for="jelentes-leiras">Leírás (opcionális)</label>
          <textarea id="jelentes-leiras" class="sm-input jelentes-leiras" maxlength="1000"></textarea>
          <p id="jelentes-szamlalo" class="jelentes-szamlalo">0 / 1000</p>

          <button id="jelentes-kuldes" type="button" class="sm-btn sm-btn-save">Jelentés elküldése</button>
          <button id="jelentes-megse" type="button" class="sm-btn sm-btn-logout">Mégse</button>
          <p id="jelentes-status" class="sm-status sm-status-small"></p>
        </div>
      </div>
    </div>

    <!-- HASZNÁLATI FELTÉTELEK MODAL -->
    <div id="tos-modal" class="sm-overlay tos-modal-overlay" hidden>
      <div class="sm-card tos-modal-card">
        <div class="sm-header">
          <h3 class="tos-modal-header"> Használati Feltételek</h3>
          <button id="close-tos-modal" class="sm-close-btn">&times;</button>
        </div>
        <div class="tos-modal-body">
          <h4>1. Felelősségkizárás</h4>
          <p>Az alkalmazást az üzemeltető adott állapotában (as-is), garanciavállalás nélkül biztosítja. Az alkalmazás fejlesztője semmilyen felelősséget nem vállal az adatvesztésből, a szolgáltatás esetleges kimaradásából vagy hibáiból eredő károkért.</p>

          <h4>2. Pénzügyi elszámolások</h4>
          <p>A Tartozások modul kizárólag a felhasználók közötti tájékoztató jellegű nyilvántartásra szolgál. Az alkalmazás nem végez pénzügyi tranzakciókat, és nem vállal felelősséget az elszámolási vitákért.</p>

          <h4>3. Feltöltött tartalmak</h4>
          <p>A feltöltött képekért, szövegekért és adatokért kizárólag a feltöltő személy vállalja a felelősséget. Jogszabályba ütköző tartalom feltöltése tilos.</p>

          <h4>4. Adatkezelés</h4>
          <p>A bejelentkezéshez a Google-fiókod nevét és e-mail címét, a csoportos működéshez a csoport adatait felhőalapú (Supabase) adatbázisban tároljuk. A fiókodat a Profil menüben bármikor véglegesen törölheted. Részletek: <a href="privacy.html" target="_blank" rel="noopener" class="link-akcent">Adatvédelmi nyilatkozat</a>.</p>
        </div>
        <button id="accept-tos-modal-btn" class="sm-btn sm-btn-save tos-modal-btn">Elfogadom</button>
      </div>
    </div>
  `);
}