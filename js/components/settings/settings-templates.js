export function injectUserNavHTML() {
  const code = localStorage.getItem('goats_group_code');
  const savedEmoji = localStorage.getItem('goats_group_emoji');
  const isLogged = !!code;

  const headerContainer = document.createElement('div');
  headerContainer.className = 'top-user-nav';

  if (!isLogged) {
    headerContainer.innerHTML = `
      <button id="open-auth-modal-btn" class="nav-auth-btn">Belépés</button>
    `;
  } else {
    const kezdoJel = code.charAt(0).toUpperCase();
    headerContainer.innerHTML = `
      <button id="open-profile-modal-btn" class="nav-profile-btn" title="Profil">
        <div id="header-user-avatar" class="google-avatar-circle">${kezdoJel}</div>
      </button>
    `;
  }

  document.body.appendChild(headerContainer);

  document.body.insertAdjacentHTML('beforeend', `
    <!-- SIGN IN MODAL -->
    <div id="auth-modal" class="sm-overlay" style="display: none;">
    <div class="sm-card" style="max-width: 420px; text-align: center; padding: 25px;">
      <div class="sm-header" style="justify-content: space-between; display: flex; align-items: center; margin-bottom: 15px;">
        <h3 id="title">Belépés & Csoportkezelés</h3>
        <button id="close-auth-btn" class="sm-close-btn">&times;</button>
      </div>

      <!-- 1. Google Bejelentkezés -->
      <div style="margin-bottom: 15px;">
        <button id="google-login-btn" class="gomb-uj-ital" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: #ffffff; color: #333; font-weight: bold; padding: 12px; border-radius: 8px; border: none; cursor: pointer;">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style="width:20px; height:20px;">
          Bejelentkezés Google-fiókkal
        </button>
      </div>

      <div style="margin: 15px 0; color: #aaa; font-size: 0.85rem;">--- HA MÁR BE VAGY LÉPVE ---</div>

      <!-- 2. Csatlakozás meglévő csoporthoz -->
      <div id="sign-in-code-section" style="margin-bottom: 20px;">
        <div class="floating-group" style="margin-bottom: 8px;">
          <input type="text" id="auth-group-code-input" class="floating-input" placeholder=" " />
          <label class="floating-label">Meglévő csoportkód</label>
        </div>
        <button id="auth-submit-btn" class="gomb-uj-ital" style="width: 100%; padding: 10px;">Csatlakozás Csoporthoz</button>
      </div>

      <div style="margin: 15px 0; color: #aaa; font-size: 0.85rem;">vagy hozz létre egy újat:</div>

      <!-- 3. Új csoport létrehozása -->
      <div id="create-group-section">
        <div class="floating-group" style="margin-bottom: 8px;">
          <input type="text" id="new-group-name-input" class="floating-input" placeholder=" " />
          <label class="floating-label">Új csoport neve (pl. "Buli Csapat")</label>
        </div>
        <button id="create-group-btn" class="gomb-uj-ital" style="width: 100%; padding: 10px; background: #10b981; border: none; color: white; border-radius: 6px; cursor: pointer;">➕ Új Csoport Létrehozása</button>
      </div>

      <div style="margin-top: 15px; font-size: 0.85rem;">
        <label style="cursor: pointer;">
          <input type="checkbox" id="accept-tos-checkbox">
          Elfogadom a <a href="#" id="open-tos-modal" style="color: #3b82f6; text-decoration: underline;">Használati Feltételeket</a>
        </label>
      </div>

      <div id="auth-status" style="margin-top: 12px; font-size: 0.9rem; font-weight: bold;"></div>
    </div>
  </div>


    <!--GOOGLE PROFIL MODAL-- >
    <div id="profile-modal" class="sm-overlay">
      <div class="google-profile-card">
        <button id="close-profile-btn" class="google-close-btn">&times;</button>
        <div class="google-user-header">
          <div id="group-avatar-badge" class="google-avatar-circle large"></div>
          <div class="google-user-info">
            <h3 id="profile-display-name">Nincs kiválasztva név</h3>
            <span class="google-plus-badge">V1.0.3</span>
          </div>
        </div>
        <div class="google-menu-list">
          <button id="open-group-details-btn" class="google-menu-btn"><span> Csoport Adatok</span><span class="arrow-icon">›</span></button>
          <button id="open-settings-btn" class="google-menu-btn"><span> Beállítások</span><span class="arrow-icon">›</span></button>
          <button id="open-dev-btn" class="google-menu-btn"><span> Frissítések & Dev Log</span><span class="arrow-icon">›</span></button>
          <button id="logout-btn" class="google-menu-btn danger"><span> Kijelentkezés</span></button>
        </div>
        <p id="profile-status" class="sm-status sm-status-small"></p>
      </div>
    </div>

    <!--CSOPORT ADATOK MODAL-->
    <div id="group-details-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3> Csoport Adatok</h3>
          <button id="close-group-details-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
            <div class="floating-group">
                <input type="text" id="group-name-display" class="floating-input" placeholder=" " />
                <label class="floating-label">Csoport neve:</label>
            </div>
            <div class="floating-group floating-info-row">
              <span id="group-email-display" class="floating-info-value">email@goats.app</span>
              <label class="floating-label active">Csoport e-mail címe:</label>
              <button id="open-edit-email-btn" type="button" class="google-mini-edit-btn mini-btn-accent">✏️ Módosít</button>
             </div>

            <div class="floating-group input-with-toggle">
              <input type="password" id="group-code-display" class="floating-input" placeholder=" " readonly />
              <label class="floating-label">Csoport kódja</label>
              <button id="toggle-group-code-visibility" type="button" class="input-toggle-btn">👁️</button>
            </div>

            <div class="floating-group floating-dropdown-group">
              <div id="custom-user-dropdown" class="custom-dropdown">
                <div class="dropdown-selected">
                  <span id="user-dropdown-selected-text">Válaszd ki, ki vagy...</span>
                  <span class="arrow">▼</span>
                </div>
                <div id="user-dropdown-options" class="dropdown-options"></div>
              </div>
              <label class="floating-label active">Én vagyok a csoportból:</label>
            </div>

            <div class="floating-group">
              <input type="text" id="group-members-input" class="floating-input" placeholder=" " />
              <label class="floating-label">Tagok (vesszővel elválasztva)</label>
            </div>
          
          <button id="delete-group-btn" class="google-menu-btn danger-dark">Csoport törlése</button>
        </div>
      </div>
    </div>

    <!--E-MAIL MÓDOSÍTÁS MODAL-->
  <div id="email-modal" class="sm-overlay">
    <div class="sm-card">
      <div class="sm-header">
        <h3> E-mail Cím Módosítása</h3>
        <button id="close-email-btn" class="sm-close-btn">&times;</button>
      </div>
      <div class="sm-body">
        <div style="background-color: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; line-height: 1.4; color: #d4d4d8;">
          <strong>Jelenlegi e-mail cím:</strong><br>
            <span id="current-email-display-label" style="color: #5850ec; font-weight: 600;">betöltés...</span><br><br>
              <em>A biztonsági megerősítő kód a jelenlegi e-mail címedre fog megérkezni az új cím jóváhagyásához.</em>
            </div>

              <label class="sm-label">Adj meg egy új e-mail címet:</label>
              <input type="email" id="new-email-input" class="sm-input" placeholder="ujemail@gmail.com" />
              <button id="request-email-change-btn" class="sm-btn sm-btn-save">Megerősítő Kód Küldése </button>
            </div>
        </div>
      </div>

      <!-- BIZTONSÁGI KÓD ELLENŐRZŐ MODAL -->
      <div id="verify-code-modal" class="sm-overlay">
        <div class="sm-card">
          <div class="sm-header">
            <h3> Biztonsági Ellenőrzés</h3>
            <button id="close-verify-btn" class="sm-close-btn">&times;</button>
          </div>
          <div class="sm-body">
            <p id="verify-code-info" style="font-size: 13px; color: #d4d4d8; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 12px; text-align: center;"></p>
            <p id="verify-code-status" class="sm-status sm-status-verify"></p>

            <label class="sm-label">Írd be az e-mailben kapott 6-jegyű kódot:</label>
            <input type="text" id="verify-code-input" class="sm-input sm-input-code" placeholder="123456" maxlength="6" />
            <button id="verify-code-btn" class="sm-btn sm-btn-save">Művelet Megerősítése</button>
          </div>
        </div>
      </div>

      <!-- SETTINGS MODAL (TÉMA) -->
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
            <h3> Frissítések & Dev Log</h3>
            <button id="close-dev-btn" class="sm-close-btn">&times;</button>
          </div>
          <div class="sm-body">
            <div id="changelog-lista" class="changelog-lista">
              <p class="changelog-empty">Frissítések betöltése...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- EGYEDI HASZNÁLATI FELTÉTELEK MODAL -->
      <div id="tos-modal" class="sm-overlay tos-modal-overlay">
        <div class="sm-card tos-modal-card">
          <div class="sm-header">
            <h3 class="tos-modal-header"> Használati Feltételek</h3>
            <button id="close-tos-modal" class="sm-close-btn">&times;</button>
          </div>
          <div class="tos-modal-body">
            <h4>1. Felelősségkizárás</h4>
            <p>Az alkalmazást az üzemeltető adott állapotában (as-is), garanciavállalás nélkül biztosítja. Az alkalmazás fejlesztője semmilyen felelősséget nem vállal az adatvesztésből, a szolgáltatás esetleges kimagadásából vagy hibáiból eredő károkért.</p>

            <h4>2. Pénzügyi elszámolások</h4>
            <p>A Tartozások modul kizárólag a felhasználók közötti tájékoztató jellegű nyilvántartásra szolgál. Az alkalmazás nem végez pénzügyi tranzakciókat, és nem vállal felelősséget az elszámolási vitákért.</p>

            <h4>3. Feltöltött tartalmak</h4>
            <p>A feltöltött képekért, szövegekért és adatokért kizárólag a feltöltő személy vállalja a felelősséget. Jogszabályba ütköző tartalom feltöltése tilos.</p>

            <h4>4. Adatkezelés</h4>
            <p>Az alkalmazás a csoportos működéshez szükséges adatokat felhőalapú (Supabase) adatbázisban tárolja.</p>
          </div>
          <button id="accept-tos-modal-btn" class="sm-btn sm-btn-save tos-modal-btn">Elfogadom</button>
        </div>
      </div>
      `);
}