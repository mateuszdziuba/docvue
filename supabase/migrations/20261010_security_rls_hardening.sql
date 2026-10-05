-- ============================================================================
-- 20261010_security_rls_hardening.sql
--
-- Zamyka krytyczne luki RLS: publiczne polityki `USING (true)` pozwalały
-- z kluczem anon na listowanie tokenów formularzy, forge'owanie submissions,
-- enumerację planów pielęgnacyjnych i odczyt schematów formularzy.
--
-- Aplikacja po tej zmianie czyta/zapisuje powyższe dane wyłącznie przez
-- server functions z klientem service-role po walidacji capability URL-a.
--
-- Uruchom w Supabase → SQL Editor (lub `supabase db push`). Idempotentna.
-- ============================================================================

-- 1. client_forms: usuń publiczny odczyt/zapis po tokenie
drop policy if exists "Anyone can view client_forms by token" on public.client_forms;
drop policy if exists "Anyone can update client_forms by token" on public.client_forms;

-- 2. submissions: usuń anonimowy INSERT (submissions tworzy wyłącznie serwer)
drop policy if exists "Anyone can submit with valid token" on public.submissions;

-- 3. forms: schematy formularzy nie są publiczne (tokenowy odczyt szedł przez RLS)
drop policy if exists "Anyone can view forms" on public.forms;

-- 4. treatments / treatment_forms: koniec publicznego listowania katalogu
drop policy if exists "Clients can view treatments" on public.treatments;
drop policy if exists "everyone can view treatment_forms" on public.treatment_forms;

-- 5. beauty_plans: publiczny link działa przez server function po UUID,
--    nie przez politykę RLS (wcześniej można było listować wszystkie plany)
drop policy if exists "Anyone can view a beauty plan if they have the ID" on public.beauty_plans;
drop policy if exists "Anyone can view beauty plan products if they have the plan ID" on public.beauty_plan_products;

-- 6. scraped_products_cache: tylko service role (server function scrapeProductFn)
drop policy if exists "Anyone can read scraped products cache" on public.scraped_products_cache;
drop policy if exists "Authenticated users can insert scraped products" on public.scraped_products_cache;
drop policy if exists "Authenticated users can update scraped products" on public.scraped_products_cache;

-- 7. Storage: visit-photos scope'owane po salonie (folder [1] = salon_id)
drop policy if exists "Salon owners can upload visit photos" on storage.objects;
drop policy if exists "Salon owners can view visit photos" on storage.objects;
drop policy if exists "Salon owners can update visit photos" on storage.objects;

drop policy if exists "visit_photos_owner_manage" on storage.objects;
create policy "visit_photos_owner_manage" on storage.objects
  for all
  using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (
      select id::text from public.salons where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (
      select id::text from public.salons where user_id = auth.uid()
    )
  );

-- 8. Limity rozmiaru i typów MIME dla bucketów prywatnych
update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('visit-photos', 'staff-avatars');

-- ============================================================================
-- KONIEC
-- ============================================================================
