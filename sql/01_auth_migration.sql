-- =====================================================================
-- Goats App – hitelesítés + csoportkezelés migráció (Supabase / Postgres)
-- =====================================================================
-- Futtatás: Supabase Dashboard > SQL Editor. Előtte KÉSZÍTS BIZTONSÁGI MENTÉST
-- (Database > Backups), mert újradefiniálja a régi RPC függvényeket és
-- lecseréli a profiles/groups/group_members tábla policy-jait.
--
-- FELTÉTELEZÉSEK (ha eltér, szólj és igazítom):
--   * groups.id és group_members.group_id típusa: uuid
--   * groups.enabled_pages típusa: jsonb (tömb, pl. ["index","tartozasok"])
--   * a csoportok adatai a többi táblában `group_code` (text) oszlop alapján kötődnek
--   * a csoporttagság szerepe: 'admin' vagy 'member'
--   * egy felhasználó egyszerre egy csoport tagja
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Táblák és oszlopok
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  system_role text not null default 'user',
  tos_version text,
  tos_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists tos_version text;
alter table public.profiles add column if not exists tos_accepted_at timestamptz;
-- A te meglévő profiles táblád email oszlopa NOT NULL volt, ezt itt nem kényszerítjük rá
-- újonnan létrehozott táblán (hogy ne legyen kötelező, ha valaha email nélkül kéne beszúrni),
-- de a lenti INSERT-ek minden esetben kitöltik auth.users.email-ből.

alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len
  check (display_name is null or char_length(display_name) between 1 and 40) not valid;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  group_code text not null,
  group_name text not null,
  enabled_pages jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.groups add column if not exists created_by uuid references auth.users(id) on delete set null;
-- A ranglista oldal szűrő-beállításait tárolja (ital_ranglista kategória-szűrők); ha a tábla
-- oszlopa már más típussal létezik, ez az ALTER nem változtat rajta (csak a hiányzó esetet pótolja).
alter table public.groups add column if not exists filter_settings jsonb;
create unique index if not exists groups_group_code_lower_uidx on public.groups (lower(group_code));

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create unique index if not exists group_members_one_group_per_user on public.group_members (user_id);

-- Csatlakozási próbálkozások naplója (brute force ellen). Policy nélkül: kliens nem éri el.
create table if not exists public.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists join_attempts_user_time on public.join_attempts (user_id, created_at desc);
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Új felhasználó -> profil automatikusan
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ), 40)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Meglévő felhasználókhoz hiányzó profilok pótlása
insert into public.profiles (id, email, display_name)
select u.id, u.email, left(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)), 40)
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3) Segédfüggvények (az RLS policy-k használják)
-- ---------------------------------------------------------------------
create or replace function public.my_group_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select group_id from public.group_members where user_id = auth.uid()
$$;

create or replace function public.my_group_codes()
returns setof text language sql stable security definer set search_path = public as $$
  select g.group_code
  from public.groups g
  join public.group_members m on m.group_id = g.id
  where m.user_id = auth.uid()
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and system_role = 'superadmin')
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and group_role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------
-- 4) RLS: profiles / groups / group_members
--    Kliens csak OLVASHAT (és a saját display_name-jét írhatja).
--    Minden más módosítás az alábbi RPC függvényeken megy.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('profiles', 'groups', 'group_members')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_superadmin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy groups_select on public.groups
  for select to authenticated
  using (id in (select public.my_group_ids()) or public.is_superadmin());

create policy group_members_select on public.group_members
  for select to authenticated
  using (user_id = auth.uid() or group_id in (select public.my_group_ids()) or public.is_superadmin());

revoke all on public.profiles, public.groups, public.group_members from anon, authenticated;
grant select on public.profiles, public.groups, public.group_members to authenticated;
-- Oszlopszintű jog: a system_role-t kliens NEM írhatja (különben bárki superadmin lehetne)
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 5) A RÉGI, kódalapú belépés táblájának lezárása (kódok + e-mailek voltak benne!)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  if to_regclass('public.groups_code') is not null then
    execute 'alter table public.groups_code enable row level security';
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'groups_code' loop
      execute format('drop policy %I on public.groups_code', r.policyname);
    end loop;
    execute 'revoke all on public.groups_code from anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6) Csoport-adattáblák zárolása (minden tábla, ahol van group_code oszlop)
--    Használat: select public._lock_group_table('public.tablanev');
-- ---------------------------------------------------------------------
create or replace function public._lock_group_table(tbl regclass)
returns void language plpgsql as $$
declare s text; n text; r record;
begin
  select nsp.nspname, c.relname into s, n
  from pg_class c join pg_namespace nsp on nsp.oid = c.relnamespace
  where c.oid = tbl;

  execute format('alter table %I.%I enable row level security', s, n);
  for r in select policyname from pg_policies where schemaname = s and tablename = n loop
    execute format('drop policy %I on %I.%I', r.policyname, s, n);
  end loop;
  execute format('revoke all on %I.%I from anon', s, n);
  execute format('grant select, insert, update, delete on %I.%I to authenticated', s, n);
  execute format(
    'create policy group_members_only on %I.%I for all to authenticated '
    'using (group_code in (select public.my_group_codes())) '
    'with check (group_code in (select public.my_group_codes()))', s, n);
end $$;
revoke execute on function public._lock_group_table(regclass) from public, anon, authenticated;

do $$
begin
  if to_regclass('public.esemenyek') is not null then
    perform public._lock_group_table('public.esemenyek');
  end if;

  -- Fejlesztői changelog: bejelentkezett felhasználók olvashatják, írni senki nem
  if to_regclass('public.dev_changelog') is not null then
    execute 'alter table public.dev_changelog enable row level security';
    execute 'drop policy if exists changelog_read on public.dev_changelog';
    execute 'create policy changelog_read on public.dev_changelog for select to authenticated using (true)';
    execute 'revoke all on public.dev_changelog from anon, authenticated';
    execute 'grant select on public.dev_changelog to authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7) Belső függvények
-- ---------------------------------------------------------------------
create or replace function public._new_group_code()
returns text language sql volatile set search_path = public as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
$$;

-- Csoport és MINDEN adatának törlése (minden tábla, ahol van group_code oszlop)
create or replace function public._purge_group(gid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare gcode text; r record;
begin
  select group_code into gcode from public.groups where id = gid;
  if gcode is null then return; end if;

  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'group_code'
      and t.table_type = 'BASE TABLE'
      and c.table_name <> 'groups'
  loop
    execute format('delete from public.%I where group_code = $1', r.table_name) using gcode;
  end loop;

  delete from public.groups where id = gid;  -- a group_members sorok cascade törlődnek
end $$;
revoke execute on function public._new_group_code() from public, anon, authenticated;
revoke execute on function public._purge_group(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 8) RPC függvények (a régiek, bármilyen szignatúrával, törlődnek)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'join_group_with_code', 'create_new_group', 'remove_group_member',
        'transfer_group_ownership', 'delete_group', 'rename_group',
        'regenerate_group_code', 'leave_group', 'list_group_members',
        'set_enabled_pages', 'accept_tos', 'delete_my_account', 'save_filter_settings'
      )
  loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

-- Csatlakozás kóddal. Hibás kódnál NEM kivételt dobunk, hanem {ok:false}-t adunk vissza,
-- különben a kivétel visszagörgetné a próbálkozás naplózását és a rate limit nem működne.
create function public.join_group_with_code(code_input text)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  code text := lower(trim(coalesce(code_input, '')));
  g public.groups;
  recent int;
begin
  if uid is null then raise exception 'Be kell jelentkezned.'; end if;
  if code = '' then raise exception 'Add meg a csoportkódot.'; end if;
  if exists (select 1 from public.group_members where user_id = uid) then
    raise exception 'Már tagja vagy egy csoportnak.';
  end if;

  delete from public.join_attempts where created_at < now() - interval '1 day';
  select count(*) into recent from public.join_attempts
   where user_id = uid and created_at > now() - interval '10 minutes';
  if recent >= 10 then
    raise exception 'Túl sok próbálkozás. Próbáld újra 10 perc múlva.';
  end if;
  insert into public.join_attempts (user_id) values (uid);

  select * into g from public.groups where lower(group_code) = code;
  if not found then
    return json_build_object('ok', false, 'error', 'Érvénytelen csoportkód.');
  end if;

  insert into public.group_members (group_id, user_id, group_role) values (g.id, uid, 'member');
  return json_build_object('ok', true, 'group_id', g.id, 'group_name', g.group_name);
end $$;

create function public.create_new_group(group_name_input text)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  gname text := trim(coalesce(group_name_input, ''));
  new_code text;
  gid uuid;
  tries int := 0;
begin
  if uid is null then raise exception 'Be kell jelentkezned.'; end if;
  if char_length(gname) < 2 or char_length(gname) > 40 then
    raise exception 'A csoport neve 2–40 karakter legyen.';
  end if;
  if exists (select 1 from public.group_members where user_id = uid) then
    raise exception 'Már tagja vagy egy csoportnak.';
  end if;

  loop
    new_code := public._new_group_code();
    exit when not exists (select 1 from public.groups where lower(group_code) = lower(new_code));
    tries := tries + 1;
    if tries > 10 then raise exception 'Nem sikerült kódot generálni, próbáld újra.'; end if;
  end loop;

  insert into public.groups (group_name, group_code, created_by)
  values (gname, new_code, uid) returning id into gid;
  insert into public.group_members (group_id, user_id, group_role) values (gid, uid, 'admin');

  return json_build_object('id', gid, 'join_code', new_code, 'group_name', gname);
end $$;

create function public.list_group_members()
returns table (user_id uuid, display_name text, group_role text)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.display_name, 'Névtelen'), m.group_role
  from public.group_members m
  left join public.profiles p on p.id = m.user_id
  where m.group_id in (select group_id from public.group_members where user_id = auth.uid())
  order by (m.group_role = 'admin') desc, p.display_name
$$;

create function public.accept_tos(version_input text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Be kell jelentkezned.'; end if;
  insert into public.profiles (id, tos_version, tos_accepted_at)
  values (auth.uid(), left(coalesce(version_input, ''), 32), now())
  on conflict (id) do update
    set tos_version = excluded.tos_version, tos_accepted_at = excluded.tos_accepted_at;
end $$;

-- Ranglista oldal szűrő-beállításai (melyik kategóriák/italok vannak kikapcsolva).
-- A groups tábla a kliens felől csak olvasható (lásd 4. pont), ezért ez külön RPC;
-- bármelyik csoporttag módosíthatja (nem csak admin), mert ez csak egy nézeti beállítás.
create function public.save_filter_settings(group_id_input uuid, settings jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Be kell jelentkezned.'; end if;
  if not exists (
    select 1 from public.group_members where group_id = group_id_input and user_id = auth.uid()
  ) then
    raise exception 'Ehhez nincs jogosultságod.';
  end if;
  update public.groups set filter_settings = settings where id = group_id_input;
end $$;

create function public.rename_group(group_id_input uuid, new_name text)
returns void language plpgsql security definer set search_path = public as $$
declare n text := trim(coalesce(new_name, ''));
begin
  if auth.uid() is null then raise exception 'Be kell jelentkezned.'; end if;
  if not (public.is_group_admin(group_id_input) or public.is_superadmin()) then
    raise exception 'Ehhez nincs jogosultságod.';
  end if;
  if char_length(n) < 2 or char_length(n) > 40 then
    raise exception 'A csoport neve 2–40 karakter legyen.';
  end if;
  update public.groups set group_name = n where id = group_id_input;
end $$;

-- Új csoportkód: a régi azonnal érvénytelen. Az adatok group_code-ra épülnek, ezért a
-- kódcserével az összes `group_code` oszlopot is átírjuk (egy tranzakcióban).
create function public.regenerate_group_code(group_id_input uuid)
returns text language plpgsql security definer set search_path = public as $$
declare old_code text; new_code text; r record; tries int := 0;
begin
  if auth.uid() is null then raise exception 'Be kell jelentkezned.'; end if;
  if not (public.is_group_admin(group_id_input) or public.is_superadmin()) then
    raise exception 'Ehhez nincs jogosultságod.';
  end if;
  select group_code into old_code from public.groups where id = group_id_input;
  if old_code is null then raise exception 'A csoport nem található.'; end if;

  loop
    new_code := public._new_group_code();
    exit when not exists (select 1 from public.groups where lower(group_code) = lower(new_code));
    tries := tries + 1;
    if tries > 10 then raise exception 'Nem sikerült kódot generálni, próbáld újra.'; end if;
  end loop;

  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'group_code'
      and t.table_type = 'BASE TABLE' and c.table_name <> 'groups'
  loop
    execute format('update public.%I set group_code = $1 where group_code = $2', r.table_name)
      using new_code, old_code;
  end loop;

  update public.groups set group_code = new_code where id = group_id_input;
  return new_code;
end $$;

create function public.remove_group_member(target_user_id uuid, group_id_input uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Be kell jelentkezned.'; end if;
  if not (public.is_group_admin(group_id_input) or public.is_superadmin()) then
    raise exception 'Ehhez nincs jogosultságod.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Magadat a „Kilépés a csoportból” gombbal tudod eltávolítani.';
  end if;
  delete from public.group_members where group_id = group_id_input and user_id = target_user_id;
  if not found then raise exception 'A tag nem található a csoportban.'; end if;
end $$;

create function public.transfer_group_ownership(new_admin_user_id uuid, group_id_input uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Be kell jelentkezned.'; end if;
  if not (public.is_group_admin(group_id_input) or public.is_superadmin()) then
    raise exception 'Ehhez nincs jogosultságod.';
  end if;
  if not exists (select 1 from public.group_members where group_id = group_id_input and user_id = new_admin_user_id) then
    raise exception 'Az új admin nem tagja a csoportnak.';
  end if;
  update public.group_members set group_role = 'member' where group_id = group_id_input and group_role = 'admin';
  update public.group_members set group_role = 'admin' where group_id = group_id_input and user_id = new_admin_user_id;
end $$;

create function public.leave_group()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; myrole text; others int;
begin
  if uid is null then raise exception 'Be kell jelentkezned.'; end if;
  select group_id, group_role into gid, myrole from public.group_members where user_id = uid;
  if gid is null then raise exception 'Nem vagy csoportban.'; end if;

  select count(*) into others from public.group_members where group_id = gid and user_id <> uid;
  if others = 0 then
    perform public._purge_group(gid);   -- az utolsó tag kilépésekor a csoport adatai is törlődnek
  elsif myrole = 'admin' then
    raise exception 'Előbb add át az admin jogot egy másik tagnak, vagy töröld a csoportot.';
  else
    delete from public.group_members where group_id = gid and user_id = uid;
  end if;
end $$;

create function public.delete_group(group_id_input uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Be kell jelentkezned.'; end if;
  if not (public.is_group_admin(group_id_input) or public.is_superadmin()) then
    raise exception 'Ehhez nincs jogosultságod.';
  end if;
  perform public._purge_group(group_id_input);
end $$;

create function public.set_enabled_pages(group_id_input uuid, pages text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'Ehhez nincs jogosultságod.'; end if;
  -- az enabled_pages oszlop jsonb, a text[] paramétert explicit jsonb tömbbé kell alakítani
  update public.groups set enabled_pages = to_jsonb(pages) where id = group_id_input;
end $$;

create function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); gid uuid; myrole text; others int;
begin
  if uid is null then raise exception 'Be kell jelentkezned.'; end if;

  select group_id, group_role into gid, myrole from public.group_members where user_id = uid;
  if gid is not null then
    select count(*) into others from public.group_members where group_id = gid and user_id <> uid;
    if others = 0 then
      perform public._purge_group(gid);
    elsif myrole = 'admin' then
      raise exception 'Előbb add át a csoport adminisztrációját valakinek, vagy töröld a csoportot.';
    end if;
  end if;

  delete from auth.users where id = uid;  -- profiles és group_members cascade törlődik
end $$;

-- ---------------------------------------------------------------------
-- 9) Jogosultságok: csak bejelentkezett felhasználó hívhatja
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'join_group_with_code', 'create_new_group', 'remove_group_member',
        'transfer_group_ownership', 'delete_group', 'rename_group',
        'regenerate_group_code', 'leave_group', 'list_group_members',
        'set_enabled_pages', 'accept_tos', 'delete_my_account', 'save_filter_settings',
        'my_group_ids', 'my_group_codes', 'is_superadmin', 'is_group_admin'
      )
  loop
    execute 'revoke all on function ' || r.sig || ' from public, anon';
    execute 'grant execute on function ' || r.sig || ' to authenticated';
  end loop;
end $$;

commit;

-- ---------------------------------------------------------------------
-- Kézi lépések a futtatás UTÁN (SQL Editorban, a UUID-kat cseréld le):
--
-- Superadmin kijelölése:
--   update public.profiles set system_role = 'superadmin' where id = '<A-TE-USER-UUID>';
--
-- Régi csoportok (amiknek még nincs admin tagjuk): az első belépő tag legyen admin:
--   update public.group_members set group_role = 'admin'
--   where user_id = '<UUID>' and group_id = (select id from public.groups where lower(group_code) = 'duckies');
--
-- Többi, group_code oszlopot használó tábla zárolása (táblánként):
--   select public._lock_group_table('public.tartozasok');
--   select public._lock_group_table('public.tervek');
--   ...
-- Ha egy tábla kijelentkezve is olvasható kell legyen (pl. publikus ranglista),
-- arra NE futtasd, hanem külön policy kell hozzá.
--
-- A régi groups_code tábla törlése, ha már nincs rá szükség (e-mail címeket tartalmaz):
--   drop table public.groups_code;
-- ---------------------------------------------------------------------
