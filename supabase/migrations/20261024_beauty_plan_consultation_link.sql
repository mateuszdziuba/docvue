-- ============================================================================
-- 20261024_beauty_plan_consultation_link.sql
--
-- Plan pielęgnacyjny może wskazywać konsultację, z której pochodzą zalecenia.
-- Dzięki temu strona planu może pokazać wszystkie etapy terapii i przypisane
-- zabiegi bez duplikowania danych w JSONB planu.
-- ============================================================================

alter table public.beauty_plans
  add column if not exists consultation_id uuid
  references public.client_consultations(id) on delete set null;

create index if not exists beauty_plans_consultation_idx
  on public.beauty_plans (consultation_id);

-- ============================================================================
-- KONIEC
-- ============================================================================
