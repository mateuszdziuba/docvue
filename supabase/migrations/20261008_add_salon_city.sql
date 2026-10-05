-- ============================================================================
-- 20261008_add_salon_city.sql
-- Miasto gabinetu — używane m.in. w stopce podpisu na dokumencie/PDF
-- oraz jako znacznik [MIASTO] w formularzach.
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.salons
  add column if not exists city text;

-- Widok publiczny: dokładamy miasto na końcu listy kolumn.
create or replace view public.salon_public as
select
  id,
  name,
  address,
  phone,
  email,
  website,
  social_media,
  city
from public.salons;

grant select on public.salon_public to anon, authenticated;

-- ============================================================================
-- KONIEC
-- ============================================================================
