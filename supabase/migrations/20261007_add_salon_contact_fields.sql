-- ============================================================================
-- 20261007_add_salon_contact_fields.sql
-- Dodaje dane kontaktowe gabinetu wykorzystywane w formularzach (np. RODO).
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.salons
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists social_media text;

-- Publiczny widok danych kontaktowych gabinetu (bez pin_code i user_id).
-- Używany przez publiczne formularze (np. RODO) do automatycznego
-- uzupełniania znaczników. Widok działa z uprawnieniami właściciela,
-- dzięki czemu anonimowy klient nie potrzebuje polityki RLS na `salons`.
create or replace view public.salon_public as
select
  id,
  name,
  address,
  phone,
  email,
  website,
  social_media
from public.salons;

grant select on public.salon_public to anon, authenticated;

-- ============================================================================
-- KONIEC
-- ============================================================================
