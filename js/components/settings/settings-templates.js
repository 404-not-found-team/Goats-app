export function injectUserNavHTML() {
  const code = localStorage.getItem('goats_group_code');
  const savedEmoji = localStorage.getItem('goats_group_emoji');
  const isLogged = !!code;

  const headerContainer = document.createElement('div');
  headerContainer.className = 'top-user-nav';

  if (!isLogged) {
    headerContainer.innerHTML = `
      <button id="open-auth-modal-btn" class="nav-auth-btn">SIGN IN</button>
    `;
  } else {
    const kezdoJel = savedEmoji || (code ? code.charAt(0).toUpperCase() : '🐐');
    headerContainer.innerHTML = `
      <button id="open-profile-modal-btn" class="nav-profile-btn" title="Profil">
        <div id="header-user-avatar" class="google-avatar-circle">${kezdoJel}</div>
      </button>
    `;
  }

  document.body.appendChild(headerContainer);

  document.body.insertAdjacentHTML('beforeend', `
    <!-- SIGN IN MODAL -->
    <div id="auth-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3>Sign In / Belépés 🔑</h3>
          <button id="close-auth-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <label class="sm-label">Kód beírása (Csoport kód):</label>
          <input type="password" id="auth-group-code-input" class="sm-input"/>
          <button id="toggle-request-code-btn" type="button" class="google-mini-edit-btn request-code-btn">
            📩 Még nincs kódod? Igényelj egyet!
          </button>
          <div id="request-code-section" class="request-code-box hidden">
            <label class="sm-label">E-mail cím a kód igényléséhez:</label>
            <input type="email" id="auth-email-input" class="sm-input sm-input-flush" placeholder="peldas.pisti@gmail.com" />
          </div>
        </div>
        <div class="auth-footer">
          <div id="tos-wrapper" class="tos-wrapper">
            <label class="tos-label">
              <input type="checkbox" id="accept-tos-checkbox" class="tos-checkbox" />
              <span class="tos-text">
                Elfogadom a <a href="#" id="open-tos-modal" class="tos-link">Használati Feltételeket</a>.
              </span>
            </label>
          </div>
          <p id="auth-status" class="sm-status"></p>
          <button id="auth-submit-btn" class="sm-btn sm-btn-save sm-btn-lg">Belépés / Igénylés</button>
        </div>
      </div>
    </div>

    <!-- GOOGLE PROFIL MODAL -->
    <div id="profile-modal" class="sm-overlay">
      <div class="google-profile-card">
        <button id="close-profile-btn" class="google-close-btn">&times;</button>
        <div class="google-user-header">
          <div id="group-avatar-badge" class="google-avatar-circle large">🐐</div>
          <div class="google-user-info">
            <h4 id="profile-display-name">Nincs kiválasztva név</h4>
            <div class="google-email-row">
              <span id="profile-display-email">email@goats.app</span>
            </div>
            <span class="google-plus-badge">V1.0.3</span>
          </div>
        </div>
        <div class="google-menu-list">
          <button id="open-group-details-btn" class="google-menu-btn"><span>👥 Csoport Adatok</span><span class="arrow-icon">›</span></button>
          <button id="open-settings-btn" class="google-menu-btn"><span>⚙️ Beállítások</span><span class="arrow-icon">›</span></button>
          <button id="open-dev-btn" class="google-menu-btn"><span>🚀 Frissítések & Dev Log</span><span class="arrow-icon">›</span></button>
          <button id="logout-btn" class="google-menu-btn danger"><span>🚪 Kijelentkezés</span></button>
        </div>
        <p id="profile-status" class="sm-status sm-status-small"></p>
      </div>
    </div>

    <!-- CSOPORT ADATOK MODAL -->
    <div id="group-details-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3>👥 Csoport Adatok</h3>
          <button id="close-group-details-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <label class="sm-label">Csoport neve:</label>
          <input type="text" id="group-name-display" class="sm-input" placeholder="GOATS Csoport" />
          <label class="sm-label">Csoport e-mail címe:</label>
          <div class="info-row">
            <span id="group-email-display" class="info-row-value">email@goats.app</span>
            <button id="open-edit-email-btn" class="google-mini-edit-btn mini-btn-accent">✏️ Módosít</button>
          </div>
          <label class="sm-label">Csoport kódja (Group Code):</label>
          <div class="input-with-toggle">
            <input type="password" id="group-code-display" class="sm-input" readonly />
            <button id="toggle-group-code-visibility" type="button" class="input-toggle-btn">👁️</button>
          </div>
          <label class="sm-label">Én vagyok a csoportból:</label>
          <div id="custom-user-dropdown" class="custom-dropdown">
            <div class="dropdown-selected"><span id="user-dropdown-selected-text">Válaszd ki, ki vagy...</span><span class="arrow">▼</span></div>
            <div id="user-dropdown-options" class="dropdown-options"></div>
          </div>
          <label class="sm-label">Válassz csoport ikont:</label>
          <div id="emoji-picker-container" class="emoji-picker"></div>
          <label class="sm-label">Tagok (vesszővel elválasztva):</label>
          <input type="text" id="group-members-input" class="sm-input sm-input-spaced" placeholder="Peti, Géza, Vivi" />
          <button id="delete-group-btn" class="google-menu-btn danger-dark">🗑️ Csoport törlése</button>
        </div>
      </div>
    </div>

    <!-- E-MAIL MÓDOSÍTÁS MODAL -->
    <div id="email-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3>✏️ E-mail Cím Módosítása</h3>
          <button id="close-email-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <div style="background-color: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; line-height: 1.4; color: #d4d4d8;">
            ✉️ <strong>Jelenlegi e-mail cím:</strong><br>
            <span id="current-email-display-label" style="color: #5850ec; font-weight: 600;">betöltés...</span><br><br>
            ℹ️ <em>A biztonsági megerősítő kód a jelenlegi e-mail címedre fog megérkezni az új cím jóváhagyásához.</em>
          </div>

          <label class="sm-label">Adj meg egy új e-mail címet:</label>
          <input type="email" id="new-email-input" class="sm-input" placeholder="ujemail@gmail.com" />
          <button id="request-email-change-btn" class="sm-btn sm-btn-save">Megerősítő Kód Küldése 📩</button>
        </div>
      </div>
    </div>

    <!-- BIZTONSÁGI KÓD ELLENŐRZŐ MODAL -->
    <div id="verify-code-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3>🔒 Biztonsági Ellenőrzés</h3>
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
          <h3>⚙️ Beállítások</h3>
          <button id="close-settings-btn" class="sm-close-btn">&times;</button>
        </div>
        <div class="sm-body">
          <label class="sm-label">Téma kiválasztása:</label>
          <div id="custom-theme-dropdown" class="custom-dropdown">
            <div class="dropdown-selected"><span id="theme-dropdown-selected-text">🌙 Dark (Alapértelmezett)</span><span class="arrow">▼</span></div>
            <div id="theme-dropdown-options" class="dropdown-options"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- DEV LOG MODAL -->
    <div id="dev-modal" class="sm-overlay">
      <div class="sm-card">
        <div class="sm-header">
          <h3>🚀 Frissítések & Dev Log</h3>
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
          <h3 class="tos-modal-header">📜 Használati Feltételek</h3>
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