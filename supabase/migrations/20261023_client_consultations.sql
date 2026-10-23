-- ============================================================================
-- 20261023_client_consultations.sql
--
-- Holistyczna konsultacja klienta — dokument wewnętrzny gabinetu.
-- Zawiera odpowiedzi z formularza (JSONB), status, autora oraz dane mapy twarzy
-- (zdjęcie w prywatnym bucketcie + wektorowe adnotacje/rysunki).
--
-- Dostęp: właściciel salonu + aktywni pracownicy gabinetu. Klient nie ma dostępu.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Funkcja pomocnicza: właściciel LUB aktywny pracownik salonu
-- ---------------------------------------------------------------------------
create or replace function public.can_access_salon(target_salon uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.salons s
    where s.id = target_salon
      and s.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_members sm
    where sm.salon_id = target_salon
      and sm.user_id = auth.uid()
      and sm.is_active = true
  );
$$;

revoke all on function public.can_access_salon(uuid) from public;
grant execute on function public.can_access_salon(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tabela konsultacji
-- ---------------------------------------------------------------------------
create table if not exists public.client_consultations (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  updated_by uuid references auth.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  consultation_date date not null default current_date,
  schema_version integer not null default 1,
  data jsonb not null default '{}'::jsonb,
  face_photo_path text,
  face_photo_consent_at timestamptz,
  face_photo_consent_by uuid references auth.users(id) on delete set null,
  face_analysis jsonb,
  face_annotation_count integer not null default 0,
  completed_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_consultations_client_idx
  on public.client_consultations (client_id, consultation_date desc, created_at desc);

create index if not exists client_consultations_salon_status_idx
  on public.client_consultations (salon_id, status);

create or replace function public.set_client_consultations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_client_consultations_updated_at on public.client_consultations;
create trigger update_client_consultations_updated_at
  before update on public.client_consultations
  for each row execute function public.set_client_consultations_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
alter table public.client_consultations enable row level security;

drop policy if exists "consultations_salon_read" on public.client_consultations;
create policy "consultations_salon_read"
  on public.client_consultations for select
  using (public.can_access_salon(salon_id));

drop policy if exists "consultations_salon_insert" on public.client_consultations;
create policy "consultations_salon_insert"
  on public.client_consultations for insert
  with check (
    public.can_access_salon(salon_id)
    and exists (
      select 1 from public.clients c
      where c.id = client_consultations.client_id
        and c.salon_id = client_consultations.salon_id
    )
  );

drop policy if exists "consultations_salon_update" on public.client_consultations;
create policy "consultations_salon_update"
  on public.client_consultations for update
  using (public.can_access_salon(salon_id))
  with check (public.can_access_salon(salon_id));

drop policy if exists "consultations_salon_delete" on public.client_consultations;
create policy "consultations_salon_delete"
  on public.client_consultations for delete
  using (
    public.can_access_salon(salon_id)
    and (
      -- szkic może usunąć każdy pracownik; zakończoną tylko właściciel
      status = 'draft'
      or exists (
        select 1 from public.salons s
        where s.id = client_consultations.salon_id and s.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Prywatny bucket na zdjęcia twarzy
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'consultation-photos',
  'consultation-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "consultation_photos_salon_read" on storage.objects;
create policy "consultation_photos_salon_read"
  on storage.objects for select
  using (
    bucket_id = 'consultation-photos'
    and public.can_access_salon(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "consultation_photos_salon_insert" on storage.objects;
create policy "consultation_photos_salon_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'consultation-photos'
    and public.can_access_salon(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "consultation_photos_salon_update" on storage.objects;
create policy "consultation_photos_salon_update"
  on storage.objects for update
  using (
    bucket_id = 'consultation-photos'
    and public.can_access_salon(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'consultation-photos'
    and public.can_access_salon(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "consultation_photos_salon_delete" on storage.objects;
create policy "consultation_photos_salon_delete"
  on storage.objects for delete
  using (
    bucket_id = 'consultation-photos'
    and public.can_access_salon(((storage.foldername(name))[1])::uuid)
  );

-- ============================================================================
-- KONIEC
-- ============================================================================
