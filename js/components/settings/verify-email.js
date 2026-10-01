let generaltBiztonsagiKod = null;
let aktivMuvelet = null;
let ideiglenesUjEmail = '';

export function initVerifySystem() {
  const get = id => document.getElementById(id);
  const emailModal = get('email-modal');
  const groupDetailsModal = get('group-details-modal');
  const verifyCodeModal = get('verify-code-modal');

  const setStatus = (elem, msg, color) => {
    if (elem) {
      elem.innerText = msg;
      elem.style.color = color;
    }
  };

  // E-mail formátum ellenőrzése
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const kuldjBiztonsagiKodot = async (celEmail, muveletNev) => {
    generaltBiztonsagiKod = Math.floor(100000 + Math.random() * 900000).toString();
    const groupCode = localStorage.getItem('goats_group_code') || '';

    console.log(`[EmailJS] Kód kiküldése ide: ${celEmail}, Kód: ${generaltBiztonsagiKod}`);

    let elkuldve = false;
    try {
      if (typeof emailjs !== 'undefined') {
        await emailjs.send("service_rz0ofi1", "template_38xjioq", {
          to_email: celEmail,
          group_code: groupCode,
          verification_code: generaltBiztonsagiKod,
          action_name: muveletNev
        });
        elkuldve = true;
      }
    } catch (err) {
      console.warn("EmailJS hiba:", err);
    }

    if (get('verify-code-input')) get('verify-code-input').value = '';
    
    const infoText = get('verify-code-info');
    if (infoText) {
      if (aktivMuvelet === 'email_modositas') {
        infoText.innerHTML = `Megerősítő kód elküldve a meglévő e-mail címedre: <strong style="color: var(--accent-color, #10b981);">${celEmail}</strong>.<br><br>Az új cím: <strong>${ideiglenesUjEmail}</strong>`;
      } else {
        infoText.innerHTML = `Megerősítő kód elküldve ide: <strong style="color: var(--accent-color, #10b981);">${celEmail}</strong>`;
      }
    }

    if (elkuldve) {
      setStatus(get('verify-code-status'), '📩 A kód sikeresen kiküldve!', '#10b981');
    } else {
      setStatus(get('verify-code-status'), '⚠️ Az e-mail küldés nem működik, a kód nem fog megérkezni.', '#eab308');
    }

    if (verifyCodeModal) verifyCodeModal.style.display = 'flex';
  };

  get('open-edit-email-btn')?.addEventListener('click', () => {
    const jelenlegiEmail = localStorage.getItem('goats_user_email') || '';
    if (get('current-email-display-label')) {
      get('current-email-display-label').textContent = jelenlegiEmail || 'Nincs beállítva';
    }

    if (groupDetailsModal) groupDetailsModal.style.display = 'none';
    if (get('new-email-input')) get('new-email-input').value = '';
    if (emailModal) emailModal.style.display = 'flex';
  });

  get('request-email-change-btn')?.addEventListener('click', () => {
    ideiglenesUjEmail = get('new-email-input')?.value.trim() || '';

    if (!ideiglenesUjEmail || !isValidEmail(ideiglenesUjEmail)) {
      return alert('⚠️ Kérjük, adj meg egy érvényes e-mail címet (pl. nev@domain.com)!');
    }

    const jelenlegiEmail = localStorage.getItem('goats_user_email');
    if (!jelenlegiEmail || !isValidEmail(jelenlegiEmail)) {
      return alert('⚠️ A csoporthoz jelenleg nincs érvényes e-mail cím regisztrálva a megerősítéshez!');
    }

    if (ideiglenesUjEmail === jelenlegiEmail) {
      return alert('⚠️ Az új e-mail cím megegyezik a jelenlegi címeddel!');
    }

    aktivMuvelet = 'email_modositas';
    if (emailModal) emailModal.style.display = 'none';

    kuldjBiztonsagiKodot(jelenlegiEmail, 'E-mail cím módosítása');
  });

  get('delete-group-btn')?.addEventListener('click', () => {
    const jelenlegiEmail = localStorage.getItem('goats_user_email');
    if (!jelenlegiEmail || !isValidEmail(jelenlegiEmail)) {
      return alert('⚠️ Nincs érvényes e-mail cím megadva a csoporthoz!');
    }

    if (!confirm('⚠️ BIZTOSAN TÖRÖLNI SZERETNÉD A CSOPORTOT?\n\nEz a művelet nem vonható vissza, és a csoport adatai végleg törlődnek!')) {
      return;
    }

    aktivMuvelet = 'csoport_torles';
    if (groupDetailsModal) groupDetailsModal.style.display = 'none';

    kuldjBiztonsagiKodot(jelenlegiEmail, 'Csoport törlése');
  });

  get('verify-code-btn')?.addEventListener('click', async () => {
    const beirtKod = get('verify-code-input')?.value.trim() || '';

    if (beirtKod !== generaltBiztonsagiKod) {
      return setStatus(get('verify-code-status'), '❌ Hibás biztonsági kód!', '#ef4444');
    }

    const client = typeof _supabase !== 'undefined' ? _supabase : (window._supabase || window.supabase);
    const code = localStorage.getItem('goats_group_code');

    // -------------------------------------------------------------
    // 1) E-MAIL MÓDOSÍTÁS BEFEJEZÉSE
    // -------------------------------------------------------------
    if (aktivMuvelet === 'email_modositas') {
      const { error } = await client
        .from('groups_code')
        .update({ email: ideiglenesUjEmail })
        .ilike('group_code', code);

      if (error) {
        console.error('Hiba az e-mail mentésekor Supabase-ben:', error);
        return alert('Hiba történt az e-mail cím frissítésekor!');
      }

      localStorage.setItem('goats_user_email', ideiglenesUjEmail);
      if (get('profile-display-email')) get('profile-display-email').textContent = ideiglenesUjEmail;
      if (get('group-email-display')) get('group-email-display').textContent = ideiglenesUjEmail;

      if (verifyCodeModal) verifyCodeModal.style.display = 'none';
      alert('✅ Az e-mail cím sikeresen módosítva és elmentve!');
    }
    
    // -------------------------------------------------------------
    // 2) CSOPORT TÖRLESE ÉS KÓD VISSZAÁLLÍTÁSA SZABADRA
    // -------------------------------------------------------------
    else if (aktivMuvelet === 'csoport_torles') {
      try {
        // A) Töröljük a csoport adatait a groups táblából
        const { error: groupDeleteErr } = await client
          .from('groups')
          .delete()
          .ilike('group_code', code);

        if (groupDeleteErr) {
          console.error('Hiba a csoport törlésekor:', groupDeleteErr);
        }

        // B) Visszaállítjuk a kód állapotát a groups_code táblában (taken = false, email = null)
        const { error: codeResetErr } = await client
          .from('groups_code')
          .update({
            taken: false,
            email: null
          })
          .ilike('group_code', code);

        if (codeResetErr) {
          console.error('Hiba a csoportkód visszaállításakor:', codeResetErr);
        }

        // C) Munkamenet törlése és oldal újratöltése
        localStorage.clear();
        alert('✅ A csoport sikeresen törölve!');
        location.reload();

      } catch (err) {
        console.error('Csoport törlése sikertelen:', err);
        alert('Hiba történt a törlés során!');
      }
    }
  });
}