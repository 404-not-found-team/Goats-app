-- VÉGLEGES (a galeria.js már aláírt URL-eket használ, createSignedUrls).
-- Futtatási sorrend:
--   a) a POLICY-blokk (lent, "2) csoportra szűkített") lefuthat elsőként: a publikus
--      bucketet nem töri meg, a belépett tagoknak feltöltés/törlés jogot ad;
--   b) a kód éles telepítése (signed URL, tömörített WebP/JPEG feltöltés);
--   c) csak ezután az "1) bucket privátra" sor: a régi, publikus URL-ek megszűnnek.
--      A fájlok helye (csoport/fájlnév) nem változik, nincs adatmozgatás.
--
-- Miért: a csoportfotók nyilvános URL-en érhetők el. A szabály a mappanévből (= group_code)
-- dönt: csak az adott csoport tagjai olvashatják, tölthetik fel és törölhetik a képeit.
--
-- A "kepek" bucket neve a galeria.js BUCKET_NEV konstansa.
--
-- 1) bucket privátra (csak a c) lépés, a kód deploy után!)
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
