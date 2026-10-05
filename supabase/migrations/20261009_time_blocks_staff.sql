-- ============================================================================
-- 20261009_time_blocks_staff.sql
-- Blokady czasu mogą dotyczyć całego salonu (staff_id = NULL) albo jednego
-- pracownika (staff_id wskazuje osobę).
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.time_blocks
  add column if not exists staff_id uuid references public.staff_members(id) on delete cascade;

create index if not exists time_blocks_salon_staff_idx
  on public.time_blocks (salon_id, staff_id);

-- ============================================================================
-- KONIEC
-- ============================================================================
