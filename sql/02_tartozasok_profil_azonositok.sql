-- LEFUTOTT (2026-10-06, a Supabase SQL szerkesztőben, kézzel). Csak nyilvántartás céljából van a repóban.
-- Idempotensen nem újrafuttatható (add column), ne futtasd újra.
begin;

alter table public.tartozasok
  add column hitelezo_id uuid references public.profiles(id) on delete set null,
  add column ados_id     uuid references public.profiles(id) on delete set null,
  add column felvette_id uuid references public.profiles(id) on delete set null default auth.uid(),
  add column felvetel_ideje timestamptz not null default now();

update public.tartozasok t
set hitelezo_id = (
  select min(p.id::text)::uuid from public.groups g
  join public.group_members gm on gm.group_id = g.id
  join public.profiles p on p.id = gm.user_id
  where g.group_code = t.group_code and p.display_name = t.kinek
  having count(*) = 1)
where hitelezo_id is null;

update public.tartozasok t
set ados_id = (
  select min(p.id::text)::uuid from public.groups g
  join public.group_members gm on gm.group_id = g.id
  join public.profiles p on p.id = gm.user_id
  where g.group_code = t.group_code and p.display_name = t.kitartozik
  having count(*) = 1)
where ados_id is null;

drop policy "group_members_only" on public.tartozasok;

create policy "tartozasok_olvas" on public.tartozasok
  for select to authenticated
  using (group_code in (select my_group_codes()));

create policy "tartozasok_torol" on public.tartozasok
  for delete to authenticated
  using (group_code in (select my_group_codes()));

create policy "tartozasok_felvesz" on public.tartozasok
  for insert to authenticated
  with check (
    group_code in (select my_group_codes())
    and felvette_id = auth.uid()
    and exists (select 1 from public.groups g join public.group_members gm on gm.group_id = g.id
                where g.group_code = tartozasok.group_code and gm.user_id = tartozasok.hitelezo_id)
    and exists (select 1 from public.groups g join public.group_members gm on gm.group_id = g.id
                where g.group_code = tartozasok.group_code and gm.user_id = tartozasok.ados_id)
  );

commit;
