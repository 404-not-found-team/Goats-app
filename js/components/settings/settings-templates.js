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
    <div id="auth-modal" class="sm-overlay" style="display: none;">
      <div class="sm-card" style="max-width: 420px; text-align: center; padding: 25px;">
        <div class="sm-header" style="justify-content: space-between; display: flex; align-items: center; margin-bottom: 15px;">
          <h3 id="auth-title">Belépés</h3>
          <button id="close-auth-btn" class="sm-close-btn">&times;</button>
        </div>

        <!-- 1. lépés: Google bejelentkezés (ha nincs session) -->
        <div id="auth-step-login">
          <p style="font-size: 0.9rem; color: var(--text-secondary, #aaa); margin-bottom: 15px;">
            Jelentkezz be Google-fiókkal, utána csatlakozhatsz egy csoporthoz vagy létrehozhatsz egy újat.
          </p>
          <button id="google-login-btn" class="gomb-uj-ital" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: #ffffff; color: #333; font-weight: bold; padding: 12px; border-radius: 8px; border: none; cursor: pointer;">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style="width:20px; height:20px;">
            Bejelentkezés Google-fiókkal
          </button>
          <div style="margin-top: 15px; font-size: 0.85rem;">
            <label style="cursor: pointer;">
              <input type="checkbox" id="accept-tos-checkbox">
              Elfogadom a <a href="#" id="open-tos-modal" style="color: #3b82f6; text-decoration: underline;">Használati Feltételeket</a>
            </label>
          </div>
        </div>

        <!-- 2. lépés: csoport (ha van session, de nincs csoport) -->
        <div id="auth-step-group" style="display: none;">
          <p id="auth-user-line" style="font-size: 0.85rem; color: var(--text-secondary, #aaa); margin-bottom: 15px;"></p>

          <div id="sign-in-code-section" style="margin-bottom: 20px;">
            <div class="floating-group" style="margin-bottom: 8px;">
              <input type="text" id="auth-group-code-input" class="floating-input" placeholder=" " autocomplete="off" />
              <label class="floating-label">Meglévő csoportkód</label>
            </div>
            <button id="auth-submit-btn" class="gomb-uj-ital" style="width: 100%; padding: 10px;">Csatlakozás a csoporthoz</button>
          </div>

          <div style="margin: 15px 0; color: #aaa; font-size: 0.85rem;">vagy hozz létre egy újat:</div>

          <div id="create-group-section">
            <div class="floating-group" style="margin-bottom: 8px;">
              <input type="text" id="new-group-name-input" class="floating-input" placeholder=" " maxlength="40" autocomplete="off" />
              <label class="floating-label">Új csoport neve (pl. "Buli Csapat")</label>
            </div>
            <button id="create-group-btn" class="gomb-uj-ital" style="width: 100%; padding: 10px; background: #10b981; border: none; color: white; border-radius: 6px; cursor: pointer;">➕ Új csoport létrehozása</button>
          </div>
        </div>

        <div id="auth-status" style="margin-top: 12px; font-size: 0.9rem; font-weight: bold;"></div>
      </div>
    </div>

    <!-- PROFIL MODAL -->
    <div id="profile-modal" class="sm-overlay">
      <div class="google-profile-card">
        <button id="close-profile-btn" class="google-close-btn">&times;</button>
        <div class="google-user-header">
          <div id="group-avatar-badge" class="google-avatar-circle large"></div>
          <div class="google-user-info">
            <h3 id="profile-display-name">Nincs név</h3>
            <span class="google-plus-badge">V1.0.3</span>
          </div>
        </div>

        <p id="profile-display-email" style="font-size: 0.85rem; color: var(--text-secondary, #aaa); margin: 4px 0 12px;"></p>

        <div class="floating-group" style="margin-bottom: 8px;">
          <input type="text" id="profile-name-input" class="floating-input" placeholder=" " maxlength="40" />
          <label class="floating-label">Megjelenített neved</label>
        </div>
        <button id="save-profile-name-btn" class="sm-btn sm-btn-save" style="margin-bottom: 12px;">Név mentése</button>

        <div class="google-menu-list">
          <button id="open-group-details-btn" class="google-menu-btn"><span> Csoport adatok</span><span class="arrow-icon">›</span></button>
          <button id="open-join-group-btn" class="google-menu-btn" style="display: none;"><span> Csatlakozás / új csoport</span><span class="arrow-icon">›</span></button>
          <button id="open-settings-btn" class="google-menu-btn"><span> Beállítások</span><span class="arrow-icon">›</span></button>
          <button id="open-dev-btn" class="google-menu-btn"><span> Frissítések &amp; Dev Log</span><span class="arrow-icon">›</span></button>
          <button id="logout-btn" class="google-menu-btn danger"><span> Kijelentkezés</span></button>
          <button id="delete-account-btn" class="google-menu-btn danger-dark"><span> Fiók törlése</span></button>
        </div>
        <p id="profile-status" class="sm-status sm-status-small"></p>
      </div>
    </div>

    <!-- CSOPORT ADATOK MODAL -->
    <div id="group-details-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3> Csoport adatok</h3>
          <button id="close-group-details-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <p id="group-no-group" style="display: none; text-align: center; color: var(--text-secondary, #aaa);">Még nem tartozol csoporthoz.</p>

          <div id="group-content">
            <div class="floating-group">
              <input type="text" id="group-name-display" class="floating-input" placeholder=" " maxlength="40" readonly />
              <label class="floating-label">Csoport neve</label>
            </div>
            <button id="save-group-name-btn" class="sm-btn sm-btn-save" style="display: none; margin-bottom: 12px;">Név mentése</button>

            <div class="floating-group input-with-toggle">
              <input type="password" id="group-code-display" class="floating-input" placeholder=" " readonly />
              <label class="floating-label">Csoportkód (ezzel tudnak csatlakozni)</label>
              <button id="toggle-group-code-visibility" type="button" class="input-toggle-btn">👁️</button>
            </div>
            <button id="copy-group-code-btn" type="button" class="google-mini-edit-btn" style="margin-bottom: 14px;">📋 Kód másolása</button>

            <label class="sm-label">Tagok</label>
            <div id="group-members-list" style="margin-bottom: 12px;"></div>

            <p id="group-details-status" class="sm-status sm-status-small"></p>

            <button id="regenerate-code-btn" class="google-menu-btn" style="display: none;">Új csoportkód generálása</button>
            <button id="leave-group-btn" class="google-menu-btn danger">Kilépés a csoportból</button>
            <button id="delete-group-btn" class="google-menu-btn danger-dark" style="display: none;">Csoport törlése</button>
          </div>
        </div>
      </div>
    </div>

    <!-- BEÁLLÍTÁSOK MODAL (TÉMA) -->
    <div id="settings-modal" class="sm-overlay">
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
        </div>
      </div>
    </div>

    <!-- DEV LOG MODAL -->
    <div id="dev-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3> Frissítések &amp; Dev Log</h3>
          <button id="close-dev-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <div id="changelog-lista" class="changelog-lista">
            <p class="changelog-empty">Frissítések betöltése...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- HASZNÁLATI FELTÉTELEK MODAL -->
    <div id="tos-modal" class="sm-overlay tos-modal-overlay">
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
          <p>A bejelentkezéshez a Google-fiókod nevét és e-mail címét, a csoportos működéshez a csoport adatait felhőalapú (Supabase) adatbázisban tároljuk. A fiókodat a Profil menüben bármikor véglegesen törölheted.</p>
        </div>
        <button id="accept-tos-modal-btn" class="sm-btn sm-btn-save tos-modal-btn">Elfogadom</button>
      </div>
    </div>
  `);
}