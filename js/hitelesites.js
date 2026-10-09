// Központi hitelesítési és csoport-állapot kezelő.
// Az igazság forrása a Supabase session + az adatbázis (az RLS véd).
// A localStorage itt csak GYORSÍTÓTÁR a régebbi oldalscriptek kompatibilitása miatt,
// SOHA nem jogosultság: a szerver minden kérésnél a JWT alapján dönt.
import { client } from './supabase-client.js';
import { jeloles } from './segedek/teljesitmeny.js';
import { uritKepGyorsitotar } from './segedek/kep-gyorsitotar.js';

export const TOS_VERSION = '2026-10';
const KEEP_KEYS = new Set(['goats_theme', 'goats_tos_pending']);
// Oldalváltáskor a friss állapot az oldalak között ebben él (sessionStorage), így nem kell
// minden betöltésnél újra lekérdezni. Csak megjelenítésre szolgál: a jogosultságot az RLS dönti el.
const SNAPSHOT_KULCS = 'goats_snapshot';
const SNAPSHOT_FRISS_MS = 60 * 1000;

const blank = () => ({
  session: null,
  user: null,
  profile: null,
  displayName: '',
  group: null,       // { id, group_code, group_name, enabled_pages }
  groupRole: null,   // 'admin' | 'member'
  members: [],       // [{ user_id, display_name, group_role }]
});

const state = blank();
const listeners = new Set();
let signingOut = false;

export const getState = () => state;
export const isLoggedIn = () => !!state.user;
export const hasGroup = () => !!state.group;
export const isGroupAdmin = () => state.groupRole === 'admin';
export const isSuperadmin = () => state.profile?.system_role === 'superadmin';
// Igaz, ha a felhasználó be van jelentkezve, és a nála rögzített (accept_tos-szal mentett)
// verzió nem egyezik a hatályos TOS_VERSION-nel (vagy még sosem fogadott el semmit).
export const isTosUjraelfogadasSzukseges = () =>
  !!state.user && state.profile?.tos_version !== TOS_VERSION;

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach(fn => {
    try { fn(state); } catch (e) { console.error(e); }
  });
}

function clearCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('goats_') && !KEEP_KEYS.has(k))
    .forEach(k => localStorage.removeItem(k));
  try { sessionStorage.removeItem(SNAPSHOT_KULCS); } catch { /* nem elérhető tárhely: nincs mit törölni */ }
}

// Pillanatkép mentése (csak a megjelenítéshez szükséges adat, a token nem kerül bele)
function saveSnapshot(userId) {
  try {
    sessionStorage.setItem(SNAPSHOT_KULCS, JSON.stringify({
      t: Date.now(),
      userId,
      displayName: state.displayName,
      profile: state.profile,
      group: state.group,
      groupRole: state.groupRole,
      members: state.members,
    }));
  } catch { /* privát módban nem menthető: a következő oldal majd lekérdez */ }
}

// Ha a pillanatkép friss, és ugyanannak a felhasználónak szól, visszatöltjük (hálózat nélkül)
function loadFreshSnapshot(userId) {
  try {
    const s = JSON.parse(sessionStorage.getItem(SNAPSHOT_KULCS) || 'null');
    if (!s || s.userId !== userId || Date.now() - s.t > SNAPSHOT_FRISS_MS) return false;
    Object.assign(state, {
      displayName: s.displayName,
      profile: s.profile,
      group: s.group,
      groupRole: s.groupRole,
      members: s.members,
    });
    return true;
  } catch {
    return false;
  }
}

function writeCache() {
  const put = (k, v) =>
    (v === null || v === undefined || v === '') ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  put('goats_group_code', state.group?.group_code);
  put('goats_group_name', state.group?.group_name);
  put('goats_group_role', state.groupRole);
  put('goats_user_role', state.profile?.system_role);
  put('goats_current_user', state.displayName);
  put('goats_group_members', state.group ? JSON.stringify(state.members.map(m => m.display_name)) : null);
}

async function applyPendingTos() {
  const version = localStorage.getItem('goats_tos_pending');
  if (!version) return;
  const { error } = await client.rpc('accept_tos', { version_input: version });
  if (!error) localStorage.removeItem('goats_tos_pending');
  else console.warn('ToS elfogadás mentése sikertelen:', error.message);
}

export async function refresh() {
  const { data, error: sessionErr } = await client.auth.getSession();
  if (sessionErr) console.error('Session hiba:', sessionErr);
  const session = data?.session;

  if (!session?.user) {
    Object.assign(state, blank());
    clearCache();
    emit();
    return state;
  }

  await applyPendingTos();

  const [profileRes, memberRes] = await Promise.all([
    client.from('profiles')
      .select('id, display_name, system_role, tos_version')
      .eq('id', session.user.id)
      .maybeSingle(),
    client.from('group_members')
      .select('group_role, groups(id, group_code, group_name, enabled_pages)')
      .eq('user_id', session.user.id)
      .maybeSingle(),
  ]);

  if (profileRes.error || memberRes.error) {
    // Hálózati/szerver hiba: a user ismert, de a csoportállapotot nem írjuk felül
    console.error('Állapot lekérési hiba:', profileRes.error || memberRes.error);
    state.session = session;
    state.user = session.user;
    emit();
    return state;
  }

  const profile = profileRes.data ?? null;
  const membership = memberRes.data ?? null;

  state.session = session;
  state.user = session.user;
  state.profile = profile;
  state.displayName =
    profile?.display_name ||
    session.user.user_metadata?.full_name ||
    session.user.email?.split('@')[0] ||
    '';
  state.group = membership?.groups ?? null;
  state.groupRole = membership?.group_role ?? null;
  state.members = [];

  if (state.group) {
    const { data: members, error } = await client.rpc('list_group_members');
    if (error) console.error('Tagok lekérési hiba:', error);
    state.members = members ?? [];
  }

  writeCache();
  saveSnapshot(session.user.id);
  emit();
  return state;
}

// ---------- Belépés / kilépés ----------

export async function signInWithGoogle() {
  // A ToS elfogadást a visszairányítás után rögzítjük (accept_tos RPC)
  localStorage.setItem('goats_tos_pending', TOS_VERSION);
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  signingOut = true;
  try {
    await client.auth.signOut();
  } finally {
    Object.assign(state, blank());
    clearCache();
    await uritKepGyorsitotar(); // a galériaképek helyi tára (FELADAT12)
    emit();
    signingOut = false;
  }
}

// ---------- Csoport műveletek (mind szerveroldali RPC, RLS-sel védve) ----------

export async function callRpc(name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export async function joinGroup(code) {
  const data = await callRpc('join_group_with_code', { code_input: code });
  if (!data?.ok) throw new Error(data?.error || 'Érvénytelen csoportkód.');
  await refresh();
  return data;
}

export async function createGroup(name) {
  const data = await callRpc('create_new_group', { group_name_input: name });
  await refresh();
  return data; // { id, join_code, group_name }
}

export async function leaveGroup() {
  await callRpc('leave_group');
  await refresh();
}

export async function deleteMyAccount() {
  await callRpc('delete_my_account');
  await signOut();
}

// ---------- Inicializálás ----------

// Oldalbetöltéskor: friss pillanatkép esetén nem várunk a hálózatra (a nav azonnal kirajzolódik),
// egyébként teljes frissítés. A ToS-elfogadás függőben lévő állapotát mindig a teljes frissítés kezeli.
async function indit() {
  jeloles('auth-start');
  const { data } = await client.auth.getSession();
  const user = data?.session?.user;
  if (user && !localStorage.getItem('goats_tos_pending') && loadFreshSnapshot(user.id)) {
    state.session = data.session;
    state.user = user;
    jeloles('auth-pillanatkep');
    return state;
  }
  const allapot = await refresh();
  jeloles('auth-kesz');
  return allapot;
}

export const ready = indit().catch(err => {
  console.error('Auth init hiba:', err);
  return state;
});

client.auth.onAuthStateChange((event) => {
  // Fontos: itt ne hívjunk Supabase metódust (deadlock-veszély), csak állapotot kezelünk.
  if (event === 'SIGNED_OUT' && !signingOut) {
    const hadUser = !!state.user;
    Object.assign(state, blank());
    clearCache();
    const urites = uritKepGyorsitotar(); // a galériaképek helyi tára (FELADAT12); nem Supabase-hívás
    emit();
    if (hadUser) urites.finally(() => setTimeout(() => location.reload(), 0)); // másik fülön kijelentkeztek
  }
});

// Nem-modul oldalscriptek (pl. index.js) számára
window.goatsAuth = {
  ready, refresh, getState, onChange, signOut, joinGroup, createGroup, leaveGroup, callRpc,
};