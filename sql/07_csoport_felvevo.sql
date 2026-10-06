-- Felvevő rögzítése a tervek és esemenyek táblán (mint a tartozasok-nál).
-- Eddig a tervek/esemenyek sorokból nem derült ki, ki vette fel őket, és a beszúrás
-- csak a csoport-tagságot ellenőrizte.
-- Most: felvette_id = auth.uid() (alapértelmezés), és a beszúrásnál a WITH CHECK
-- kötelezően ezt is ellenőrzi. A többi művelet (olvasás, módosítás, törlés) továbbra
-- is a csoport-tagságon múlik.
-- Idempotens: a régi policy-kat név szerint eldobja, az újakat csak akkor hozza létre,
-- ha még nincsenek.
-- FIGYELEM: a group_members_only (ALL) policy kikerül; a permisszív policy-k OR-jával
-- a beszúrás így csak az új felvesz policy-n át lehetséges.

begin;

alter table public.tervek
  add column if not exists felvette_id uuid references public.profiles(id) on delete set null default auth.uid();
alter table public.esemenyek
  add column if not exists felvette_id uuid references public.profiles(id) on delete set null default auth.uid();

do $$
declare
  t text;
begin
  foreach t in array array['tervek', 'esemenyek'] loop
    execute format('drop policy if exists group_members_only on public.%I', t);
    execute format('drop policy if exists %I on public.%I', t || '_tag_olvas', t);
    execute format('drop policy if exists %I on public.%I', t || '_tag_modosit', t);
    execute format('drop policy if exists %I on public.%I', t || '_tag_torol', t);
    execute format('drop policy if exists %I on public.%I', t || '_felvesz', t);

    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using (group_code in (select public.my_group_codes()))', t || '_tag_olvas', t);

    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using (group_code in (select public.my_group_codes())) '
      'with check (group_code in (select public.my_group_codes()))', t || '_tag_modosit', t);

    execute format(
      'create policy %I on public.%I for delete to authenticated '
      'using (group_code in (select public.my_group_codes()))', t || '_tag_torol', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated '
      'with check (group_code in (select public.my_group_codes()) and felvette_id = auth.uid())',
      t || '_felvesz', t);
  end loop;
end $$;

commit;
