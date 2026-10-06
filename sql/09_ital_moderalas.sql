-- Italok moderálása ("A" változat): a jóváhagyatlan italt csak a javasolója látja,
-- a jóváhagyást és az elutasítást csak a superadmin végezheti, RPC-n keresztül.
--
-- ÁLLAPOT A FUTTATÁS ELŐTT (felmérve, 2026-10-06):
--   ital_katalogus.jovahagyva: true = 249, false = 4. A jelenlegi értékek MARADNAK,
--   ezt a fájl nem módosítja. A meglévő sorok javasolta_id-je null lesz.
--   Az ő jóváhagyásukat/elutasításukat a superadmin a list_pending_drinks() listából végzi.
--   Az oszlop alapértéke: jovahagyva = false (a 06-os fájl nem futott le).
--
-- Policy-k, amiket ez a fájl eldob: "Bárki olvashatja a katalógust" (SELECT),
-- "Bárki szúrhat be új italt" (INSERT, anon+authenticated). A 06-os fájl ezt
-- helyettesíti, a 06-ot nem kell futtatni.
--
-- VISSZAFORDÍTHATÓ? A sorokat nem módosítja, az oszlop és a policy-k visszaállíthatók.
-- A reject_drink() törölhet sorokat (csak jovahagyva = false sort), ezért az
-- az elutasítás VISSZAFORDÍTHATATLAN (a sor törlődik).
-- Idempotens (drop policy if exists / add column if not exists / create or replace).

begin;

alter table public.ital_katalogus
  add column if not exists javasolta_id uuid references public.profiles(id) on delete set null default auth.uid();

-- Régi policy-k eldobása
drop policy if exists "Bárki olvashatja a katalógust" on public.ital_katalogus;
drop policy if exists "Bárki szúrhat be új italt" on public.ital_katalogus;
drop policy if exists "Hitelesített felhasználó szúrhat be jóváhagyatlan italt" on public.ital_katalogus;
drop policy if exists "Ital olvasása moderáltan" on public.ital_katalogus;
drop policy if exists "Ital felvétele javaslóként" on public.ital_katalogus;
drop policy if exists "Saját javaslat módosítása jóváhagyásig" on public.ital_katalogus;

-- SELECT: jóváhagyott italt mindenki lát, a jóváhagyatlant csak a javasolója
create policy "Ital olvasása moderáltan" on public.ital_katalogus
  for select to anon, authenticated
  using (jovahagyva = true or javasolta_id = auth.uid());

-- INSERT: csak bejelentkezve, csak saját névvel, csak jóváhagyatlanul
create policy "Ital felvétele javaslóként" on public.ital_katalogus
  for insert to authenticated
  with check (jovahagyva = false and javasolta_id = auth.uid());

-- UPDATE: a javaslója csak a még jóváhagyatlan saját italát módosíthatja,
-- és nem állíthatja jóváhagyottra (with check)
create policy "Saját javaslat módosítása jóváhagyásig" on public.ital_katalogus
  for update to authenticated
  using (javasolta_id = auth.uid() and jovahagyva = false)
  with check (javasolta_id = auth.uid() and jovahagyva = false);

-- DELETE: nincs policy, törlés csak a reject_drink() függvényen át

-- Superadmin: jóváhagyatlan italok listája javasolóval (a főlista szabálya szigorú marad)
create or replace function public.list_pending_drinks()
returns table (id bigint, nev text, marka text, kategoria text, javasolta_id uuid, javasolta_nev text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'Ehhez nincs jogosultságod.'; end if;
  return query
    select k.id, k.nev, k.marka, k.kategoria, k.javasolta_id,
           coalesce(p.display_name, 'ismeretlen (régi ital)'), k.created_at
    from public.ital_katalogus k
    left join public.profiles p on p.id = k.javasolta_id
    where k.jovahagyva = false
    order by k.created_at nulls first, k.nev;
end $$;

create or replace function public.approve_drink(drink_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'Ehhez nincs jogosultságod.'; end if;
  update public.ital_katalogus set jovahagyva = true where id = drink_id and jovahagyva = false;
  if not found then raise exception 'Az ital nem található, vagy már jóvá van hagyva.'; end if;
end $$;

-- Elutasítás = törlés (csak jóváhagyatlan sort), a rá mutató ranglista-sorokat is törli.
-- A ranglista azonosítója "ital-<id>" formátumú (lásd ranglista.js).
create or replace function public.reject_drink(drink_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'Ehhez nincs jogosultságod.'; end if;
  delete from public.ital_ranglista where id = 'ital-' || drink_id::text;
  delete from public.ital_katalogus where id = drink_id and jovahagyva = false;
  if not found then raise exception 'Az ital nem található, vagy már jóvá van hagyva.'; end if;
end $$;

revoke execute on function public.list_pending_drinks() from public, anon;
revoke execute on function public.approve_drink(bigint) from public, anon;
revoke execute on function public.reject_drink(bigint) from public, anon;
grant execute on function public.list_pending_drinks() to authenticated;
grant execute on function public.approve_drink(bigint) to authenticated;
grant execute on function public.reject_drink(bigint) to authenticated;

commit;
