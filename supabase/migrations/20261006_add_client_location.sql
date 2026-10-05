-- ============================================================================
-- 20261006_add_client_location.sql
-- Dodaje pole "location" (miejscowość) do klientów + indeks do wyszukiwania.
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.clients
  add column if not exists location text;

create index if not exists clients_salon_location_idx
  on public.clients (salon_id, location);

-- ============================================================================
-- KONIEC
-- ============================================================================
