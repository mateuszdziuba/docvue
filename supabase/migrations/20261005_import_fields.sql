-- ============================================================================
-- 20261005_import_fields.sql
-- Rozszerzenie schematu pod import Booksy (klienci + zabiegi) oraz dostęp
-- pracowników do danych gabinetu.
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ZABIEGI — brakujące kolumny z eksportu
-- ----------------------------------------------------------------------------
alter table public.treatments
  add column if not exists category text,
  add column if not exists external_code text,
  add column if not exists price_max numeric(10,2),
  add column if not exists online_booking boolean not null default false,
  add column if not exists single_service_only boolean not null default false;

create index if not exists treatments_salon_category_idx
  on public.treatments (salon_id, category);

-- Klucz idempotencji importu (wiele NULL-i dozwolone w unikalnym indeksie)
create unique index if not exists treatments_salon_external_code_key
  on public.treatments (salon_id, external_code);

-- ----------------------------------------------------------------------------
-- 2. KLIENCI — brakujące kolumny z eksportu
-- ----------------------------------------------------------------------------
alter table public.clients
  add column if not exists external_code text,
  add column if not exists gender text,
  add column if not exists referral_source text,
  add column if not exists consent_notifications_sms boolean not null default true,
  add column if not exists consent_notifications_email boolean not null default true,
  add column if not exists consent_marketing_sms boolean not null default true,
  add column if not exists consent_marketing_email boolean not null default true,
  add column if not exists discount_services smallint not null default 0,
  add column if not exists discount_products smallint not null default 0,
  add column if not exists important_info text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists last_visit_at timestamptz,
  add column if not exists last_visit_staff_id uuid references public.staff_members(id) on delete set null,
  add column if not exists referred_by text,
  add column if not exists next_visit_at timestamptz;

create index if not exists clients_salon_phone_idx
  on public.clients (salon_id, phone);
create index if not exists clients_salon_last_visit_idx
  on public.clients (salon_id, last_visit_at);

create unique index if not exists clients_salon_external_code_key
  on public.clients (salon_id, external_code);

-- ----------------------------------------------------------------------------
-- 3. FORMS — usunięcie driftu: kod używa is_public, brak w migracjach
-- ----------------------------------------------------------------------------
alter table public.forms
  add column if not exists is_public boolean not null default false;

-- ----------------------------------------------------------------------------
-- 4. DOSTĘP PRACOWNIKÓW (RLS)
-- Bez tego zalogowany pracownik widzi puste listy, bo polityki są owner-only.
-- Funkcja SECURITY DEFINER przerywa rekurencję polityk salons <-> staff_members.
-- ----------------------------------------------------------------------------
create or replace function public.is_salon_staff(target_salon uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.salon_id = target_salon
      and sm.user_id = auth.uid()
      and sm.is_active = true
  );
$$;

revoke all on function public.is_salon_staff(uuid) from public;
grant execute on function public.is_salon_staff(uuid) to authenticated;

-- salons: pracownik widzi swój salon
drop policy if exists "Staff can view own salon" on public.salons;
create policy "Staff can view own salon"
  on public.salons for select
  using (public.is_salon_staff(id));

-- clients: pracownik widzi i dodaje klientów swojego gabinetu
drop policy if exists "Staff can view salon clients" on public.clients;
create policy "Staff can view salon clients"
  on public.clients for select
  using (public.is_salon_staff(salon_id));

drop policy if exists "Staff can insert salon clients" on public.clients;
create policy "Staff can insert salon clients"
  on public.clients for insert
  with check (public.is_salon_staff(salon_id));

-- treatments
drop policy if exists "Staff can view salon treatments" on public.treatments;
create policy "Staff can view salon treatments"
  on public.treatments for select
  using (public.is_salon_staff(salon_id));

-- appointments: odczyt, tworzenie, edycja przez pracownika
drop policy if exists "Staff can view salon appointments" on public.appointments;
create policy "Staff can view salon appointments"
  on public.appointments for select
  using (public.is_salon_staff(salon_id));

drop policy if exists "Staff can insert salon appointments" on public.appointments;
create policy "Staff can insert salon appointments"
  on public.appointments for insert
  with check (public.is_salon_staff(salon_id));

drop policy if exists "Staff can update salon appointments" on public.appointments;
create policy "Staff can update salon appointments"
  on public.appointments for update
  using (public.is_salon_staff(salon_id));

-- time_blocks: podgląd blokad
drop policy if exists "Staff can view salon time blocks" on public.time_blocks;
create policy "Staff can view salon time blocks"
  on public.time_blocks for select
  using (public.is_salon_staff(salon_id));

-- submissions: podgląd wypełnionych formularzy
drop policy if exists "Staff can view salon submissions" on public.submissions;
create policy "Staff can view salon submissions"
  on public.submissions for select
  using (public.is_salon_staff(salon_id));

-- client_forms: podgląd przypisań formularzy
drop policy if exists "Staff can view salon client forms" on public.client_forms;
create policy "Staff can view salon client forms"
  on public.client_forms for select
  using (public.is_salon_staff(salon_id));

-- staff_members: pracownik widzi listę kadry swojego gabinetu (kalendarz!)
drop policy if exists "Staff can view salon staff" on public.staff_members;
create policy "Staff can view salon staff"
  on public.staff_members for select
  using (public.is_salon_staff(salon_id));

-- beauty_plans / produkty: pełny dostęp dla pracowników gabinetu
drop policy if exists "Staff can manage salon beauty plans" on public.beauty_plans;
create policy "Staff can manage salon beauty plans"
  on public.beauty_plans for all
  using (public.is_salon_staff(salon_id))
  with check (public.is_salon_staff(salon_id));

drop policy if exists "Staff can manage salon beauty plan products" on public.beauty_plan_products;
create policy "Staff can manage salon beauty plan products"
  on public.beauty_plan_products for all
  using (
    exists (
      select 1 from public.beauty_plans bp
      where bp.id = beauty_plan_products.plan_id
        and public.is_salon_staff(bp.salon_id)
    )
  )
  with check (
    exists (
      select 1 from public.beauty_plans bp
      where bp.id = beauty_plan_products.plan_id
        and public.is_salon_staff(bp.salon_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5. WERYFIKACJA (opcjonalnie — odkomentuj, aby sprawdzić)
-- ----------------------------------------------------------------------------
-- select column_name, data_type
-- from information_schema.columns
-- where table_name in ('clients','treatments')
-- order by table_name, ordinal_position;

-- ============================================================================
-- KONIEC
-- ============================================================================
