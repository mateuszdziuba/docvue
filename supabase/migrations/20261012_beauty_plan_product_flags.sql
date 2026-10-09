-- ============================================================================
-- 20261012_beauty_plan_product_flags.sql
--
-- Beauty plan: flaga „dostępne w gabinecie” oraz kolejność produktów
-- (drag & drop w edytorze). Idempotentna.
-- ============================================================================

alter table public.beauty_plan_products
  add column if not exists available_in_salon boolean not null default false,
  add column if not exists position integer;

-- Backfill kolejności na podstawie created_at (per plan i pora dnia)
update public.beauty_plan_products p
set position = sub.rn
from (
  select
    id,
    row_number() over (partition by plan_id, time_of_day order by created_at) - 1 as rn
  from public.beauty_plan_products
) sub
where p.id = sub.id
  and p.position is null;

-- ============================================================================
-- KONIEC
-- ============================================================================
