-- ============================================================================
-- 20261014_product_catalog_unique_fix.sql
--
-- Naprawa: częściowy indeks unikalny (WHERE url IS NOT NULL) nie pasował do
-- ON CONFLICT w PostgREST („no unique or exclusion constraint matching the
-- ON CONFLICT specification”). Pełny indeks unikalny (salon_id, url) działa
-- tak samo — w Postgresie NULL-e nie kolidują, więc produkty „ręczne" są OK.
--
-- Idempotentna.
-- ============================================================================

drop index if exists public.products_salon_url_unique;

create unique index if not exists products_salon_url_unique
  on public.products (salon_id, url);

-- ============================================================================
-- KONIEC
-- ============================================================================
