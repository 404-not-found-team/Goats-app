-- A ital_katalogus.kep_url nullázása (a privát bucketre mutató, törött linkek).
-- ELŐFELTÉTEL: a 04-es mentés lefutott, és a két szám egyezett.
-- VISSZAFORDÍTHATÓ a italok_kepek_backup táblából (lásd lent), de csak ha a mentés megvan.
-- Ezt a fájlt csak akkor futtasd, ha döntöttél róla.

do $$
declare
  mentett bigint;
  kep_os bigint;
begin
  select count(*) into mentett from public.italok_kepek_backup;
  select count(*) into kep_os from public.ital_katalogus where kep_url is not null;
  if mentett < kep_os then
    raise exception 'A mentés hiányos (% mentett, % kép-URL-es sor). A nullázás megszakítva.', mentett, kep_os;
  end if;
end $$;

update public.ital_katalogus k
set kep_url = null
where k.kep_url is not null
  and exists (select 1 from public.italok_kepek_backup b where b.id = k.id);

-- Visszaállítás (csak ha kell):
--   update public.ital_katalogus k set kep_url = b.kep_url
--   from public.italok_kepek_backup b where b.id = k.id;
