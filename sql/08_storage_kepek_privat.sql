-- JAVASLAT (nem futtatandó addig, amíg a galéria kód nem használ signed URL-t):
-- a "kepek" bucket csoportfotóinak privátra állítása, csoportra szűkített storage-szabályokkal.
--
-- Miért: a csoportfotók nyilvános URL-en érhetők el, bárki, aki ismeri az útvonalat,
-- megnézheti őket bejelentkezés nélkül. A fájlnév tartalmazza a csoportkódot, így
-- a szabály a mappanévből (= group_code) dönt.
--
-- Sorrend (fontos!):
--   1) a galeria.js átállítása: getPublicUrl helyett createSignedUrl (lejárat, pl. 1 óra),
--      és a feltöltés közben a csoport-mappa (group_code) ellenőrzése a kliensben is;
--   2) ez a fájl (policy-k) és a bucket privátra állítása;
--   3) csak ezután a régi, nyilvános URL-ek megszűnnek - ezt előtte tesztelni kell.
--
-- Megjegyzés: a storage-szabályok a storage.objects táblán vannak, nem a public sémában.
-- A "kepek" bucket neve a galeria.js BUCKET_NEV konstansa.

-- 1) bucket privátra (csak a 2) lépés után futtasd!)
-- update storage.buckets set public = false where id = 'kepek';

-- 2) csoportra szűkített olvasás/feltöltés/törlés: a mappanév (első szint) a group_code
drop policy if exists "kepek_tag_olvas" on storage.objects;
create policy "kepek_tag_olvas" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kepek'
    and (storage.foldername(name))[1] in (select public.my_group_codes())
  );

drop policy if exists "kepek_tag_felolt" on storage.objects;
create policy "kepek_tag_felolt" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kepek'
    and (storage.foldername(name))[1] in (select public.my_group_codes())
  );

drop policy if exists "kepek_tag_torol" on storage.objects;
create policy "kepek_tag_torol" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kepek'
    and (storage.foldername(name))[1] in (select public.my_group_codes())
  );
