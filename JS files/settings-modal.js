document.addEventListener('DOMContentLoaded', () => {
  injectSettingsUI();

  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const groupCodeInput = document.getElementById('group-code-input');
  const groupMembersInput = document.getElementById('group-members-input');
  const membersGroupWrapper = document.getElementById('members-group-wrapper');
  const loginNotice = document.getElementById('login-notice');
  const settingsStatus = document.getElementById('settings-status');

  // Megnyitáskor az aktuális bejelentkezési állapothoz igazítjuk a felületet
  settingsBtn.addEventListener('click', () => {
    updateModalState();
    settingsModal.style.display = 'flex';
  });

  closeModalBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  // Állapotellenőrzés: Be van-e jelentkezve?
  function updateModalState() {
    const savedCode = localStorage.getItem('goats_group_code') || '';
    const members = JSON.parse(localStorage.getItem('goats_group_members') || '[]');

    groupCodeInput.value = savedCode;
    groupMembersInput.value = members.join(', ');

    if (savedCode) {
      // BE VAN JELENTKEZVE: Szerkeszthetők a tagok, látszik a Kijelentkezés gomb
      membersGroupWrapper.style.display = 'block';
      groupMembersInput.disabled = false;
      loginNotice.style.display = 'none';
      logoutBtn.style.display = 'block';
      groupCodeInput.disabled = true; // Csoportváltáshoz előbb ki kell jelentkeznie
      saveSettingsBtn.innerText = 'Mentés';
    } else {
      // NINCS BEJELENTKEZVE: Tagok mező rejtve/tiltva, csak belépni lehet
      membersGroupWrapper.style.display = 'none';
      groupMembersInput.disabled = true;
      loginNotice.style.display = 'block';
      logoutBtn.style.display = 'none';
      groupCodeInput.disabled = false;
      saveSettingsBtn.innerText = 'Belépés';
    }
  }

  // Kijelentkezés logikája
  logoutBtn.addEventListener('click', () => {
    if (confirm('Biztosan ki szeretnél jelentkezni a csoportból?')) {
      localStorage.removeItem('goats_group_code');
      localStorage.removeItem('goats_group_members');

      settingsStatus.innerText = ' Kijelentkezés...';
      settingsStatus.style.color = '#ef4444';

      setTimeout(() => {
        location.reload();
      }, 500);
    }
  });

  // Belépés vagy Mentés logikája
  saveSettingsBtn.addEventListener('click', async () => {
    const rawCode = groupCodeInput.value.trim();
    const currentCode = localStorage.getItem('goats_group_code');

    if (!rawCode) {
      settingsStatus.innerText = '⚠️ Adj meg egy csoportkódot!';
      settingsStatus.style.color = '#ef4444';
      return;
    }

    const groupCode = rawCode.toLowerCase();
    settingsStatus.innerText = 'Feldolgozás...';
    settingsStatus.style.color = '#a1a1aa';

    try {
      // 1. HA MÉG NINCS BEJELENTKEZVE: BELÉPÉS / CSOPORT ADATOK LEKÉRÉSE
      if (!currentCode) {
        const { data, error } = await _supabase
          .from('groups')
          .select('*')
          .eq('group_code', groupCode)
          .maybeSingle();

        if (error) throw error;

        // Csoportkód elmentése
        localStorage.setItem('goats_group_code', groupCode);

        if (data && data.members) {
          // Ha már létezett a csoport a Supabase-ben, betöltjük a tagjait
          localStorage.setItem('goats_group_members', JSON.stringify(data.members));
        } else {
          // Új csoport esetén üres tömbbel indítunk
          localStorage.setItem('goats_group_members', JSON.stringify([]));
        }

        settingsStatus.innerText = ' Sikeres belépés!';
        settingsStatus.style.color = '#22c55e';

        setTimeout(() => {
          location.reload();
        }, 800);

      } else {
        // 2. HA MÁR BE VAN JELENTKEZVE: TAGOK MÓDOSÍTÁSA ÉS MENTÉSE
        const rawMembers = groupMembersInput.value.trim();
        const membersArray = rawMembers
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);

        const { error } = await _supabase
          .from('groups')
          .upsert({
            group_code: groupCode,
            members: membersArray,
            updated_at: new Date()
          }, { onConflict: 'group_code' });

        if (error) throw error;

        localStorage.setItem('goats_group_members', JSON.stringify(membersArray));

        settingsStatus.innerText = ' Sikeresen elmentve!';
        settingsStatus.style.color = '#22c55e';

        setTimeout(() => {
          settingsModal.style.display = 'none';
          location.reload();
        }, 1000);
      }

    } catch (err) {
      console.error('Hiba a művelet során:', err);
      settingsStatus.innerText = '❌ Hiba történt!';
      settingsStatus.style.color = '#ef4444';
    }
  });
});

function injectSettingsUI() {
  const styleTag = `
    <style>
      #settings-btn {
        position: fixed;
        top: 15px;
        right: 15px;
        z-index: 9999;
        background: #1e1e24;
        color: #fff;
        border: 1px solid #333;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      }

      @media (max-width: 600px) {
        #settings-btn {
          top: auto;
          bottom: 15px;
          right: 15px;
        }
      }
    </style>
  `;

  const html = `
    <!-- Jobb felső (mobilon jobb alsó) gomb -->
    <button id="settings-btn">⚙️</button>

    <!-- Modal felugró ablak -->
    <div id="settings-modal" style="
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      justify-content: center; align-items: center; z-index: 10000;
      backdrop-filter: blur(4px); font-family: sans-serif;
    ">
      <div style="
        background: #18181b; color: #fff; padding: 24px; border-radius: 16px;
        width: 90%; max-width: 380px; border: 1px solid #27272a;
      ">
        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 15px;">
          <h3 style="margin:0;">Beállítások</h3>
          <button id="close-modal-btn" style="background:none; border:none; color:#aaa; font-size:24px; cursor:pointer;">&times;</button>
        </div>
        
        <label style="font-size:12px; color:#aaa;">Csoport kódja:</label>
        <input type="text" id="group-code-input" style="
          width: 100%; padding: 10px; margin: 5px 0 15px 0; border-radius: 8px;
          border: 1px solid #3f3f46; background: #09090b; color: #fff; box-sizing: border-box;
        " />

        <!-- Értesítés kijelentkezett állapotban -->
        <p id="login-notice" style="font-size: 12px; color: #eab308; margin-bottom: 15px; margin-top: -5px;">
          🔒 A tagok szerkesztéséhez először lépj be a csoport kódjával!
        </p>

        <!-- Tagok megadása mező (Csak bejelentkezve jelenik meg) -->
        <div id="members-group-wrapper" style="display: none;">
          <label style="font-size:12px; color:#aaa;">Tagok (vesszővel elválasztva):</label>
          <input type="text" id="group-members-input" placeholder="Peti, Géza, Vivi" style="
            width: 100%; padding: 10px; margin: 5px 0 15px 0; border-radius: 8px;
            border: 1px solid #3f3f46; background: #09090b; color: #fff; box-sizing: border-box;
          " />
        </div>

        <button id="save-settings-btn" style="
          width: 100%; padding: 12px; background: #22c55e; color: #000;
          font-weight: bold; border: none; border-radius: 8px; cursor: pointer;
        ">Belépés</button>

        <button id="logout-btn" style="
            display: none; margin-top: 10px; width: 100%; padding: 12px 16px; background: #ef4444; color: #fff;
            font-weight: bold; border: none; border-radius: 8px; cursor: pointer;
          " title="Kijelentkezés ebből a csoportból">Kijelentkezés</button>
          
        <p id="settings-status" style="font-size: 13px; text-align: center; margin-top: 10px; margin-bottom: 0;"></p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', styleTag + html);
}