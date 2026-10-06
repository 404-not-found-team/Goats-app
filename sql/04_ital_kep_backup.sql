-- Biztonsági mentés a régi ital_katalogus.kep_url értékekről, MIELŐTT a 05-ös nullázza őket.
-- A kép-URL-ek a privát "italok" bucketre mutatnak (törött linkek). A mentés nem módosít
-- meglévő sort, idempotens (csak akkor hoz létre táblát, ha nincs).
-- Futtatás: Supabase SQL Editor. Utána ellenőrizd a sorszámot a lenti SELECT-tel.

create table if not exists public.italok_kepek_backup (
  id bigint primary key,
  kep_url text,
  mentve_at timestamptz not null default now()
);

insert into public.italok_kepek_backup (id, kep_url)
select k.id, k.kep_url
from public.ital_katalogus k
where k.kep_url is not null
on conflict (id) do nothing;

-- Ellenőrzés: a két szám egyezzen (a mentett sorok és a kép-URL-es katalógussorok száma)
select
  (select count(*) from public.italok_kepek_backup) as mentett_sorok,
  (select count(*) from public.ital_katalogus where kep_url is not null) as kep_url_os_sorok;
