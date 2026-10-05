// Csoport- és profilkezelés. Minden módosítás szerveroldali RPC-n megy,
// a jogosultságot az adatbázis ellenőrzi (nem a kliens).
// Visszatérés: true siker esetén; hiba esetén alert + false.
import { client } from './supabase-client.js';
import { callRpc, refresh, getState } from './auth-service.js';

async function run(fn) {
  try {
    await fn();
    await refresh();
    return true;
  } catch (err) {
    alert('Hiba: ' + (err.message || err));
    return false;
  }
}

// 1. Saját becenév frissítése
export function updateMyDisplayName(newDisplayName) {
  const name = (newDisplayName || '').trim();
  if (name.length < 1 || name.length > 40) {
    alert('A név 1–40 karakter legyen.');
    return Promise.resolve(false);
  }
  const userId = getState().user?.id;
  if (!userId) return Promise.resolve(false);

  return run(async () => {
    // Csak a display_name oszlop írható (oszlopszintű jog), az RLS csak a saját sort engedi
    const { error } = await client.from('profiles').update({ display_name: name }).eq('id', userId);
    if (error) throw error;
  });
}

// 2. Tag eltávolítása (csoportadmin vagy superadmin)
export function removeMember(targetUserId, groupId) {
  return run(() => callRpc('remove_group_member', {
    target_user_id: targetUserId,
    group_id_input: groupId,
  }));
}

// 3. Admin jog átadása
export function transferOwnership(newAdminUserId, groupId) {
  return run(() => callRpc('transfer_group_ownership', {
    new_admin_user_id: newAdminUserId,
    group_id_input: groupId,
  }));
}

// 4. Csoport átnevezése (admin)
export function renameGroup(groupId, newName) {
  return run(() => callRpc('rename_group', {
    group_id_input: groupId,
    new_name: (newName || '').trim(),
  }));
}

// 5. Új csoportkód generálása (admin) – a régi kód azonnal érvénytelen
export async function regenerateGroupCode(groupId) {
  let code = null;
  const ok = await run(async () => {
    code = await callRpc('regenerate_group_code', { group_id_input: groupId });
  });
  return ok ? code : null;
}

// 6. Csoport törlése (admin vagy superadmin) – a megerősítést a hívó végzi
export function deleteCurrentGroup(groupId) {
  return run(() => callRpc('delete_group', { group_id_input: groupId }));
}

// 7. Elérhető oldalak ki/be kapcsolása (kizárólag superadmin)
export function updateEnabledPages(groupId, newPagesArray) {
  return run(() => callRpc('set_enabled_pages', {
    group_id_input: groupId,
    pages: newPagesArray,
  }));
}