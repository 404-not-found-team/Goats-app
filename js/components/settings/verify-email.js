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

  const kuldjBiztonsagiKodot = async (celEmail, muveletNev) => {
    generaltBiztonsagiKod = Math.floor(100000 + Math.random() * 900000).toString();
    const groupCode = localStorage.getItem('goats_group_code') || '';

    console.log(`[EmailJS] Kód kiküldése: ${celEmail}, Kód: ${generaltBiztonsagiKod}`);

    try {
      if (typeof emailjs !== 'undefined') {
        await emailjs.send("service_default", "template_verification", {
          to_email: celEmail,
          group_code: groupCode,
          verification_code: generaltBiztonsagiKod,
          action_name: muveletNev
        });
      }
    } catch (err) {
      console.warn("EmailJS hiba:", err);
    }

    get('verify-code-input').value = '';
    setStatus(get('verify-code-status'), `Kódot elküldtük ide: ${celEmail}`, 'var(--text-secondary)');
    verifyCodeModal.style.display = 'flex';
  };

  get('request-email-change-btn')?.addEventListener('click', () => {
    ideiglenesUjEmail = get('new-email-input').value.trim();
    if (!ideiglenesUjEmail) return alert('Adj meg egy érvényes új e-mail címet!');

    const jelenlegiEmail = localStorage.getItem('goats_user_email') || ideiglenesUjEmail;
    aktivMuvelet = 'email_modositas';
    emailModal.style.display = 'none';

    kuldjBiztonsagiKodot(jelenlegiEmail, 'E-mail cím módosítása');
  });

  get('delete-group-btn')?.addEventListener('click', () => {
    const jelenlegiEmail = localStorage.getItem('goats_user_email');
    if (!jelenlegiEmail) return alert('Nincs megadva e-mail cím a csoporthoz!');

    aktivMuvelet = 'csoport_torles';
    groupDetailsModal.style.display = 'none';

    kuldjBiztonsagiKodot(jelenlegiEmail, 'Csoport törlése');
  });

  get('verify-code-btn')?.addEventListener('click', async () => {
    const beirtKod = get('verify-code-input').value.trim();

    if (beirtKod !== generaltBiztonsagiKod) {
      return setStatus(get('verify-code-status'), '❌ Hibás biztonsági kód!', '#ef4444');
    }

    if (aktivMuvelet === 'email_modositas') {
      localStorage.setItem('goats_user_email', ideiglenesUjEmail);
      if (get('profile-display-email')) get('profile-display-email').textContent = ideiglenesUjEmail;
      if (get('group-email-display')) get('group-email-display').textContent = ideiglenesUjEmail;
      verifyCodeModal.style.display = 'none';
      alert(' Az e-mail cím módosítva!');
    } else if (aktivMuvelet === 'csoport_torles') {
      const code = localStorage.getItem('goats_group_code');
      try {
        const client = typeof _supabase !== 'undefined' ? _supabase : supabase;
        await client.from('groups').delete().eq('group_code', code);
        localStorage.clear();
        alert(' A csoport törölve.');
        location.reload();
      } catch (err) {
        alert('Hiba történt a törlés során!');
      }
    }
  });
}