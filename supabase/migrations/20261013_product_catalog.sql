-- ============================================================================
-- 20261013_product_catalog.sql
--
-- Baza kosmetyków (katalog per salon):
--   - produkty dodawane raz (URL → scrape albo ręcznie z własnym zdjęciem),
--   - wybierane do planów pielęgnacyjnych bez wklejania linków,
--   - odświeżanie danych z URL, backfill z istniejących planów.
--
-- Idempotentna. Uruchom w Supabase → SQL Editor (dev i prod).
-- ============================================================================

-- 1. Tabela katalogu
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null,
  url text,
  image_url text,
  price numeric,
  usage_description text,
  available_in_salon boolean not null default false,
  source text not null default 'url' check (source in ('url', 'custom')),
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unikalny URL w obrębie salonu (koniec duplikatów przy ponownym wklejeniu)
create unique index if not exists products_salon_url_unique
  on public.products (salon_id, url)
  where url is not null;

create index if not exists products_salon_name_idx
  on public.products (salon_id, lower(name));

-- 2. RLS: odczyt i zapis dla właściciela oraz aktywnego pracownika salonu
alter table public.products enable row level security;

drop policy if exists "Salon members can view products" on public.products;
create policy "Salon members can view products"
  on public.products for select
  using (
    salon_id in (select id from public.salons where user_id = auth.uid())
    or public.is_salon_staff(salon_id)
  );

drop policy if exists "Salon members can insert products" on public.products;
create policy "Salon members can insert products"
  on public.products for insert
  with check (
    salon_id in (select id from public.salons where user_id = auth.uid())
    or public.is_salon_staff(salon_id)
  );

drop policy if exists "Salon members can update products" on public.products;
create policy "Salon members can update products"
  on public.products for update
  using (
    salon_id in (select id from public.salons where user_id = auth.uid())
    or public.is_salon_staff(salon_id)
  );

drop policy if exists "Salon owners can delete products" on public.products;
create policy "Salon owners can delete products"
  on public.products for delete
  using (salon_id in (select id from public.salons where user_id = auth.uid()));

-- 3. Powiązanie produktu planu z katalogiem (snapshot pól w planie zostaje)
alter table public.beauty_plan_products
  add column if not exists catalog_product_id uuid references public.products(id) on delete set null;

-- 4. Publiczny bucket na zdjęcia produktów (działają na stronie planu i w mailach)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_salon_write" on storage.objects;
create policy "product_images_salon_write"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (
      (storage.foldername(name))[1] in (
        select id::text from public.salons where user_id = auth.uid()
      )
      or (storage.foldername(name))[1] in (
        select salon_id::text from public.staff_members
        where user_id = auth.uid() and is_active = true
      )
    )
  );

drop policy if exists "product_images_salon_update" on storage.objects;
create policy "product_images_salon_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (
      (storage.foldername(name))[1] in (
        select id::text from public.salons where user_id = auth.uid()
      )
      or (storage.foldername(name))[1] in (
        select salon_id::text from public.staff_members
        where user_id = auth.uid() and is_active = true
      )
    )
  );

-- 5. Backfill: istniejące produkty z planów → katalog (distinct po URL lub nazwie)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'beauty_plan_products'
      and column_name = 'available_in_salon'
  ) then
    execute $sql$
      insert into public.products
        (salon_id, name, url, image_url, price, usage_description, available_in_salon, source, last_refreshed_at)
      select distinct on (bp.salon_id, coalesce(nullif(trim(pp.url), ''), lower(trim(pp.name))))
        bp.salon_id,
        trim(pp.name),
        nullif(trim(pp.url), ''),
        pp.image_url,
        pp.price,
        pp.usage_description,
        pp.available_in_salon,
        case when nullif(trim(pp.url), '') is null then 'custom' else 'url' end,
        pp.updated_at
      from public.beauty_plan_products pp
      join public.beauty_plans bp on bp.id = pp.plan_id
      where trim(pp.name) <> ''
        and not exists (
          select 1 from public.products p
          where p.salon_id = bp.salon_id
            and (
              (nullif(trim(pp.url), '') is not null and p.url = nullif(trim(pp.url), ''))
              or (nullif(trim(pp.url), '') is null and p.url is null and lower(p.name) = lower(trim(pp.name)))
            )
        )
      order by bp.salon_id,
        coalesce(nullif(trim(pp.url), ''), lower(trim(pp.name))),
        pp.updated_at desc
    $sql$;
  else
    execute $sql$
      insert into public.products
        (salon_id, name, url, image_url, price, usage_description, source, last_refreshed_at)
      select distinct on (bp.salon_id, coalesce(nullif(trim(pp.url), ''), lower(trim(pp.name))))
        bp.salon_id,
        trim(pp.name),
        nullif(trim(pp.url), ''),
        pp.image_url,
        pp.price,
        pp.usage_description,
        case when nullif(trim(pp.url), '') is null then 'custom' else 'url' end,
        pp.updated_at
      from public.beauty_plan_products pp
      join public.beauty_plans bp on bp.id = pp.plan_id
      where trim(pp.name) <> ''
        and not exists (
          select 1 from public.products p
          where p.salon_id = bp.salon_id
            and (
              (nullif(trim(pp.url), '') is not null and p.url = nullif(trim(pp.url), ''))
              or (nullif(trim(pp.url), '') is null and p.url is null and lower(p.name) = lower(trim(pp.name)))
            )
        )
      order by bp.salon_id,
        coalesce(nullif(trim(pp.url), ''), lower(trim(pp.name))),
        pp.updated_at desc
    $sql$;
  end if;
end $$;

-- 6. Powiąż istniejące produkty planów z katalogiem (po URL lub nazwie)
update public.beauty_plan_products pp
set catalog_product_id = p.id
from public.beauty_plans bp, public.products p
where pp.plan_id = bp.id
  and pp.catalog_product_id is null
  and p.salon_id = bp.salon_id
  and (
    (nullif(trim(pp.url), '') is not null and p.url = nullif(trim(pp.url), ''))
    or (
      nullif(trim(pp.url), '') is null
      and p.url is null
      and lower(p.name) = lower(trim(pp.name))
    )
  );

-- ============================================================================
-- KONIEC
-- ============================================================================
