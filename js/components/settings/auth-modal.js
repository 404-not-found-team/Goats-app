export function initAuthModal() {
  const get = id => document.getElementById(id);

  const title = get('title');
  const authModal = get('auth-modal');
  const toggleRequestBtn = get('toggle-request-code-btn');
  const requestCodeSection = get('request-code-section');
  const signinCodeSection = get('sign-in-code-section');
  const authSubmitBtn = get('auth-submit-btn');
  const authStatus = get('auth-status');
  const authGroupCodeInput = get('auth-group-code-input');
  const authEmailInput = get('auth-email-input');
  const acceptTosCheckbox = get('accept-tos-checkbox');
  const openTosModalBtn = get('open-tos-modal');
  const tosModal = get('tos-modal');
  const closeTosModalBtn = get('close-tos-modal');
  const acceptTosModalBtn = get('accept-tos-modal-btn');

  const setStatus = (msg, color) => {
    if (authStatus) {
      authStatus.textContent = msg;
      authStatus.style.color = color;
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  openTosModalBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (tosModal) tosModal.style.display = 'flex';
  });

  closeTosModalBtn?.addEventListener('click', () => {
    if (tosModal) tosModal.style.display = 'none';
  });

  acceptTosModalBtn?.addEventListener('click', () => {
    if (acceptTosCheckbox) acceptTosCheckbox.checked = true;
    if (tosModal) tosModal.style.display = 'none';
  });

  toggleRequestBtn?.addEventListener('click', () => {
    if (requestCodeSection) {
      requestCodeSection.classList.toggle('hidden');
      const isRequesting = !requestCodeSection.classList.contains('hidden');
      signinCodeSection.classList.toggle('hidden');

      if (isRequesting) {
        title.textContent='Kód igénylés'
        toggleRequestBtn.textContent = 'Már van kódod? Lépj be!';
        if (authSubmitBtn) authSubmitBtn.textContent = 'Kód Igénylése';
        if (authGroupCodeInput) authGroupCodeInput.value = '';
      } else {
        title.textContent='Belépés'
        toggleRequestBtn.textContent = 'Még nincs kódod? Igényelj egyet!';
        if (authSubmitBtn) authSubmitBtn.textContent = 'Belépés';
        if (authEmailInput) authEmailInput.value = '';
      }
      setStatus('', '');
    }
  });

  authSubmitBtn?.addEventListener('click', async () => {
    if (acceptTosCheckbox && !acceptTosCheckbox.checked) {
      return setStatus('A továbblépéshez el kell fogadnod a Használati Feltételeket!', '#ef4444');
    }

    const isRequesting = requestCodeSection && !requestCodeSection.classList.contains('hidden');
    const client = typeof _supabase !== 'undefined' ? _supabase : (window._supabase || window.supabase);

    if (!client) {
      return setStatus('Adatbázis kapcsolódási hiba!', '#ef4444');
    }

    // -------------------------------------------------------------
    // A) CSOPORTKÓD IGÉNYLÉSE (CASE-INSENSITIVE E-MAIL ELLENŐRZÉS)
    // -------------------------------------------------------------
    if (isRequesting) {
      // Normatizáljuk a beírt e-mailt: levágjuk a szóközöket és csupa kisbetűssé alakítjuk
      const rawEmail = authEmailInput?.value.trim() || '';
      const email = rawEmail.toLowerCase();

      if (!email || !isValidEmail(email)) {
        return setStatus('Kérjük, adj meg egy érvényes e-mail címet!', '#ef4444');
      }

      setStatus('Ellenőrzés az adatbázisban...', '#3b82f6');

      try {
        // 1. ELLENŐRZÉS: ilike használatával keresünk, így teljesen mindegy a kis/nagybetű az adatbázisban is
        const { data: meglevoKod, error: checkErr } = await client
          .from('groups_code')
          .select('*')
          .ilike('email', email)
          .eq('taken', true)
          .maybeSingle();

        let kikuldendoCode = '';
        let ujLefoglalas = false;
        let azonositoId = null;

        if (meglevoKod) {
          // Ha már létezik ehhez az e-mailhez kód (bármilyen kis/nagybetűs formában), újraküldjük!
          kikuldendoCode = meglevoKod.group_code;
          setStatus('Ehhez az e-mailhez már tartozik kód. Újraküldés...', '#3b82f6');
        } else {
          // 2. Ha MÉG NINCS: Megkeressük az első szabad csoportkódot (taken = false)
          const { data: szabadKod, error: fetchError } = await client
            .from('groups_code')
            .select('*')
            .eq('taken', false)
            .limit(1)
            .maybeSingle();

          if (fetchError || !szabadKod) {
            console.error('Lekérdezési hiba:', fetchError);
            return setStatus('Sajnos jelenleg nincs elérhető szabad csoportkód!', '#ef4444');
          }

          kikuldendoCode = szabadKod.group_code;
          azonositoId = szabadKod.id;
          ujLefoglalas = true;
          setStatus('Új kód lefoglalása és kiküldése...', '#3b82f6');
        }

        // 3. Kiküldjük az e-mailt EmailJS-sel
        let elkuldve = false;
        if (typeof emailjs !== 'undefined') {
          await emailjs.send("service_rz0ofi1", "template_38xjioq", {
            to_email: email,
            group_code: kikuldendoCode,
            verification_code: kikuldendoCode,
            action_name: ujLefoglalas ? 'Új Csoportkód Igénylése' : 'Meglévő Csoportkód Emlékeztető'
          });
          elkuldve = true;
        }

        if (!elkuldve) {
          return setStatus('Hiba történt az e-mail kiküldése során!', '#ef4444');
        }

        // 4. Ha teljesen új lefoglalás volt, átállítjuk taken = true-ra és elmentjük a kisbetűsített e-mailt!
        if (ujLefoglalas && azonositoId) {
          const { error: updateError } = await client
            .from('groups_code')
            .update({
              taken: true,
              email: email
            })
            .eq('id', azonositoId);

          if (updateError) {
            console.error('Hiba a kód lefoglalásakor:', updateError);
          }
        }

        const uzenet = ujLefoglalas
          ? `Az új csoportkódot elküldtük a(z) ${email} e-mail címre!`
          : `Ehhez az e-mailhez már létezik csoportkód! Elküldtük a(z) ${email} címre.`;

        setStatus(uzenet, '#10b981');
        alert(uzenet);

        // Visszaállítjuk a felületet belépési módra és beírjuk a kódot
        requestCodeSection.classList.add('hidden');
        if (toggleRequestBtn) toggleRequestBtn.textContent = 'Még nincs kódod? Igényelj egyet!';
        if (authSubmitBtn) authSubmitBtn.textContent = 'Belépés';
        if (authGroupCodeInput) authGroupCodeInput.value = kikuldendoCode;

      } catch (err) {
        console.error('Hiba az igénylés során:', err);
        setStatus('Hiba történt a kód igénylése közben!', '#ef4444');
      }

    }
    // -------------------------------------------------------------
    // B) BELÉPÉS MEGLÉVŐ CSOPORTKÓDDAL
    // -------------------------------------------------------------
    else {
      const groupCode = (authGroupCodeInput?.value || '').trim();

      if (!groupCode) {
        return setStatus('Kérjük, írd be a csoportkódot!', '#ef4444');
      }

      setStatus('Ellenőrzés...', '#3b82f6');

      try {
        const { data: codeDataArray, error: codeErr } = await client
          .from('groups_code')
          .select('*')
          .ilike('group_code', groupCode);

        if (codeErr || !codeDataArray || codeDataArray.length === 0) {
          return setStatus('Érvénytelen csoportkód!', '#ef4444');
        }

        const codeData = codeDataArray[0];

        localStorage.setItem('goats_group_code', codeData.group_code);
        if (codeData.email) {
          localStorage.setItem('goats_user_email', codeData.email);
        }

        const { data: groupDataArray } = await client
          .from('groups')
          .select('members, group_name')
          .ilike('group_code', codeData.group_code);

        if (groupDataArray && groupDataArray.length > 0) {
          const groupData = groupDataArray[0];
          if (groupData.members) {
            localStorage.setItem('goats_group_members', JSON.stringify(groupData.members));
          }
          if (groupData.group_name) {
            localStorage.setItem('goats_group_name', groupData.group_name);
          }
        }

        setStatus('Sikeres belépés!', '#10b981');
        setTimeout(() => location.reload(), 500);

      } catch (err) {
        console.error('Belépési hiba:', err);
        setStatus('Hiba történt a belépés során!', '#ef4444');
      }
    }
  });
}