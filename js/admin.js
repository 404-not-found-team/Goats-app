// 1. Saját becenév frissítése (profil beállításoknál)
export async function updateMyDisplayName(newDisplayName) {
  const client = window.supabaseClient || window._supabase || window.supabase;
  const { data: { user } } = await client.auth.getUser();

  const { error } = await client
    .from('profiles')
    .update({ display_name: newDisplayName.trim() })
    .eq('id', user.id);

  if (error) alert("Hiba a név frissítésekor: " + error.message);
  else alert("Becenév frissítve!");
}

// 2. Tag törlése a csoportból (Csoportadmin vagy Superadmin)
export async function removeMember(targetUserId, groupId) {
  const client = window.supabaseClient || window._supabase || window.supabase;
  const { error } = await client.rpc('remove_group_member', {
    target_user_id: targetUserId,
    group_id_input: groupId
  });

  if (error) alert("Hiba a tag eltávolításakor: " + error.message);
  else alert("Tag eltávolítva!");
}

// 3. Csoport átruházása másnak (Csoportadmin)
export async function transferOwnership(newAdminUserId, groupId) {
  const client = window.supabaseClient || window._supabase || window.supabase;
  const { error } = await client.rpc('transfer_group_ownership', {
    new_admin_user_id: newAdminUserId,
    group_id_input: groupId
  });

  if (error) alert("Hiba az átruházáskor: " + error.message);
  else alert("A csoportadmin jog sikeresen átruházva!");
}

// 4. Csoport törlése (Csoportadmin vagy Superadmin)
export async function deleteCurrentGroup(groupId) {
  if (!confirm("Biztosan törölni szeretnéd a csoportot? Ez a művelet nem visszavonható!")) return;

  const client = window.supabaseClient || window._supabase || window.supabase;
  const { error } = await client.rpc('delete_group', {
    group_id_input: groupId
  });

  if (error) alert("Hiba a csoport törlésekor: " + error.message);
  else {
    alert("Csoport törölve!");
    location.reload();
  }
}

// 5. Tesztoldalak ki/be kapcsolása (Kizárólag Superadmin / Fejlesztő)
export async function updateEnabledPages(groupId, newPagesArray) {
  const client = window.supabaseClient || window._supabase || window.supabase;
  const { error } = await client
    .from('groups')
    .update({ enabled_pages: newPagesArray })
    .eq('id', groupId);

  if (error) alert("Hiba az oldalak frissítésekor: " + error.message);
  else alert("Engedélyezett oldalak frissítve!");
}