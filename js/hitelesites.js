// Központi hitelesítési és csoport-állapot kezelő.
// Az igazság forrása a Supabase session + az adatbázis (az RLS véd).
// A localStorage itt csak GYORSÍTÓTÁR a régebbi oldalscriptek kompatibilitása miatt,
// SOHA nem jogosultság: a szerver minden kérésnél a JWT alapján dönt.
import { client } from './supabase-client.js';
import { jeloles } from './segedek/teljesitmeny.js';
import { uritKepGyorsitotar } from './segedek/kep-gyorsitotar.js';
import { oldalKulcsbol } from './segedek/oldalak.js';

export const TOS_VERSION = '2026-10';
const KEEP_KEYS = new Set(['goats_theme', 'goats_tos_pending']);
// Az utoljára ismert állapot (localStorage, az app bezárása után is megmarad): oldalbetöltéskor
// ebből azonnal kirajzolható a felület, a friss állapot a háttérben érkezik (onChange).
// Csak megjelenítésre szolgál: a jogosultságot az RLS dönti el. Kijelentkezéskor törlődik.
const SNAPSHOT_KULCS = 'goats_snapshot';
// Ennél frissebb pillanatképnél (pl. gyors oldalváltás) csak a globális kapcsolókat kérjük le újra
const SNAPSHOT_FRISS_MS = 60 * 1000;

const blank = () => ({
  session: null,
  user: null,
  profile: null,
  displayName: '',
  group: null,       // { id, group_code, group_name, enabled_pages }
  groupRole: null,   // 'admin' | 'member'
  members: [],       // [{ user_id, display_name, group_role }]
  beallitasok: {},   // globális kapcsolók (public.app_kapcsolok): { kulcs: boolean }, FELADAT15
  allapotHiba: false, // igaz, ha a profil/csoport lekérdezése hibázott: a group=null ekkor NEM jelenti biztosan, hogy nincs csoportja
});

const state = blank();
const listeners = new Set();
let signingOut = false;

export const getState = () => state;
export const isLoggedIn = () => !!state.user;
export const hasGroup = () => !!state.group;
export const isGroupAdmin = () => state.groupRole === 'admin';
export const isSuperadmin = () => state.profile?.system_role === 'superadmin';

// Globális kapcsolók (FELADAT15). A superadminra egyik sem vonatkozik. Ismeretlen vagy be nem
// töltött kulcsnál engedélyezett (a tényleges tiltást úgyis a szerver kényszeríti ki).
const kapcsoloErtek = (kulcs) => state.beallitasok?.[kulcs] !== false;

// Oldal: a page-kulcs ('kepek') vagy a kapcsoló kulcsa ('oldal_kepek'); a nem kapcsolható oldal mindig igaz
export function oldalEngedelyezett(kulcs) {
  if (isSuperadmin()) return true;
  const kapcsolo = String(kulcs).startsWith('oldal_') ? kulcs : oldalKulcsbol(kulcs)?.kapcsolo;
  return !kapcsolo || kapcsoloErtek(kapcsolo);
}

// Funkció: 'funkcio_kepfeltoltes' vagy röviden 'kepfeltoltes'
export function funkcioEngedelyezett(kulcs) {
  if (isSuperadmin()) return true;
  return kapcsoloErtek(String(kulcs).startsWith('funkcio_') ? kulcs : `funkcio_${kulcs}`);
}
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
  // A korábbi, sessionStorage-os pillanatkép maradványa
  try { sessionStorage.removeItem(SNAPSHOT_KULCS); } catch { /* nem elérhető tárhely: nincs mit törölni */ }
}

// Pillanatkép mentése (csak a megjelenítéshez szükséges adat, a token nem kerül bele)
function saveSnapshot(userId) {
  try {
    localStorage.setItem(SNAPSHOT_KULCS, JSON.stringify({
      t: Date.now(),
      userId,
      displayName: state.displayName,
      profile: state.profile,
      group: state.group,
      groupRole: state.groupRole,
      members: state.members,
      beallitasok: state.beallitasok,
    }));
  } catch { /* privát módban nem menthető: a következő oldal majd lekérdez */ }
}

// Ha van pillanatkép ugyanannak a felhasználónak, visszatöltjük (hálózat nélkül).
// Visszaadja a pillanatkép korát (ms), vagy null-t, ha nincs használható pillanatkép.
function loadSnapshot(userId) {
  try {
    const s = JSON.parse(localStorage.getItem(SNAPSHOT_KULCS) || 'null');
    if (!s || s.userId !== userId) return null;
    Object.assign(state, {
      displayName: s.displayName,
      profile: s.profile,
      group: s.group,
      groupRole: s.groupRole,
      members: s.members,
      beallitasok: s.beallitasok || {},
    });
    return Math.max(0, Date.now() - (s.t || 0));
  } catch {
    return null;
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

// Globális kapcsolók (FELADAT15). Minden oldalbetöltéskor frissen kérjük le (pillanatképből sem
// vesszük át), így az admin oldalon végzett változás a következő oldalbetöltéskor már érvényes.
// Hiba esetén null: a korábbi (vagy üres = minden engedélyezett) állapot marad, a szerver úgyis dönt.
async function kapcsolokBetoltese() {
  const { data, error } = await client.from('app_kapcsolok').select('kulcs, ertek');
  if (error) {
    console.warn('A globális kapcsolók nem tölthetők be:', error.message);
    return null;
  }
  return Object.fromEntries((data || []).map(k => [k.kulcs, k.ertek]));
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

  // A taglista (list_group_members a hívó saját csoportját adja) a csoport lekérdezésével párhuzamosan
  // fut, nem utána: első belépéskor ez egy teljes hálózati kört spórol meg
  const [profileRes, memberRes, kapcsoloRes, tagokRes] = await Promise.all([
    client.from('profiles')
      .select('id, display_name, system_role, tos_version')
      .eq('id', session.user.id)
      .maybeSingle(),
    client.from('group_members')
      .select('group_role, groups(id, group_code, group_name, enabled_pages)')
      .eq('user_id', session.user.id)
      .maybeSingle(),
    kapcsolokBetoltese(),
    client.rpc('list_group_members'),
  ]);
  if (kapcsoloRes) state.beallitasok = kapcsoloRes;

  if (profileRes.error || memberRes.error) {
    // Hálózati/szerver hiba: a user ismert, de a csoportállapotot nem írjuk felül.
    // allapotHiba=true jelzi, hogy a jelenlegi group=null emiatt NEM megbízható "nincs csoportja"
    // jelentés (lásd beallitasok-modal.js: a csatlakozás-felajánlás ezt ellenőrzi).
    console.error('Állapot lekérési hiba:', profileRes.error || memberRes.error);
    state.session = session;
    state.user = session.user;
    state.allapotHiba = true;
    emit();
    return state;
  }

  state.allapotHiba = false;

  const profile = profileRes.data ?? null;
  const membership = memberRes.data ?? null;
  const group = membership?.groups ?? null;

  let tagok = [];
  if (group) {
    if (tagokRes.error) console.error('Tagok lekérési hiba:', tagokRes.error);
    tagok = tagokRes.data ?? [];
  }

  state.session = session;
  state.user = session.user;
  state.profile = profile;
  state.displayName =
    profile?.display_name ||
    session.user.user_metadata?.full_name ||
    session.user.email?.split('@')[0] ||
    '';
  state.group = group;
  state.groupRole = membership?.group_role ?? null;
  state.members = tagok;

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

// Oldalbetöltéskor: ha van pillanatkép, nem várunk a hálózatra (a felület azonnal kirajzolódik),
// a friss állapotot a háttérben kérjük le, és változás esetén onChange-dzsel jelezzük.
// Pillanatkép nélkül (első belépés) és függőben lévő ToS-elfogadásnál teljes frissítés.
async function indit() {
  jeloles('auth-start');
  const { data } = await client.auth.getSession();
  const user = data?.session?.user;
  const kor = user && !localStorage.getItem('goats_tos_pending') ? loadSnapshot(user.id) : null;
  if (kor !== null) {
    state.session = data.session;
    state.user = user;
    jeloles('auth-pillanatkep');
    hatterFrissites(kor < SNAPSHOT_FRISS_MS);
    return state;
  }
  const allapot = await refresh();
  jeloles('auth-kesz');
  return allapot;
}

// Friss pillanatképnél (gyors oldalváltás) csak a globális kapcsolók, egyébként a teljes állapot.
// A kapcsolókat így is minden oldalbetöltéskor lekérjük: az admin változása azonnal érvényes.
async function hatterFrissites(csakKapcsolok) {
  try {
    if (!csakKapcsolok) {
      await refresh(); // a végén emit
      return;
    }
    const kapcsolok = await kapcsolokBetoltese();
    if (kapcsolok && JSON.stringify(kapcsolok) !== JSON.stringify(state.beallitasok)) {
      state.beallitasok = kapcsolok;
      saveSnapshot(state.user?.id);
      emit();
    }
  } catch (err) {
    console.error('Háttérfrissítési hiba:', err);
  }
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
  isSuperadmin, oldalEngedelyezett, funkcioEngedelyezett,
};