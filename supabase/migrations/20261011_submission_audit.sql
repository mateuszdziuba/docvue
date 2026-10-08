-- ============================================================================
-- 20261011_submission_audit.sql
--
-- Ślad audytowy podpisanych zgód (P1):
--   - metadane podpisania: signed_at, IP, user-agent, tryb (klient/salon),
--   - migawka treści: form_title + form_schema w chwili podpisu,
--   - integralność: content_sha256 (kanoniczny JSON) + migawka PDF w storage,
--   - prywatny bucket submission-documents (PDF zapisany przy podpisaniu).
--
-- Idempotentna. Uruchom w Supabase → SQL Editor (dev i prod).
-- ============================================================================

-- 1. Kolumny audytowe w submissions
alter table public.submissions
  add column if not exists signed_at timestamptz,
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists filled_by text,
  add column if not exists form_title text,
  add column if not exists form_schema jsonb,
  add column if not exists content_sha256 text,
  add column if not exists pdf_path text,
  add column if not exists pdf_sha256 text;

-- 2. Stare odpowiedzi: signed_at = created_at (bez hasha/PDF — dane archiwalne)
update public.submissions
set signed_at = created_at
where signed_at is null;

-- 3. Prywatny bucket na migawki PDF
insert into storage.buckets (id, name, public)
values ('submission-documents', 'submission-documents', false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 15728640, -- 15 MB
    allowed_mime_types = array['application/pdf']
where id = 'submission-documents';

-- 4. Storage: dostęp tylko dla właściciela salonu (folder [1] = salon_id).
--    Aplikacja czyta przez server function (service role + signed URL).
drop policy if exists "submission_documents_owner_manage" on storage.objects;
create policy "submission_documents_owner_manage" on storage.objects
  for all
  using (
    bucket_id = 'submission-documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.salons where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'submission-documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.salons where user_id = auth.uid()
    )
  );

-- ============================================================================
-- KONIEC
-- ============================================================================
