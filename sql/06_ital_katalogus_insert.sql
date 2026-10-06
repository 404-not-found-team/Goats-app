-- Az ital_katalogus beszúrás szabályának szigorítása.
-- Eddig bárki (anon is) új italt szúrhatott be, jóváhagyás nélkül.
-- Most: csak bejelentkezett felhasználó, és a sor csak jóváhagyatlanul (jovahagyva = false)
-- szúrható be. A jóváhagyást később (admin) kell majd állítani.
-- Idempotens: a régi és az új policy nevét is eldobja, mielőtt létrehozza az újat.

drop policy if exists "Bárki szúrhat be új italt" on public.ital_katalogus;
drop policy if exists "Hitelesített felhasználó szúrhat be jóváhagyatlan italt" on public.ital_katalogus;

create policy "Hitelesített felhasználó szúrhat be jóváhagyatlan italt"
  on public.ital_katalogus
  for insert
  to authenticated
  with check (jovahagyva = false);
