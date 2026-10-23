import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  consultationSummaryFromRow,
  createEmptyConsultationData,
  faceAnalysisSchema,
  MAX_CONSULTATION_DATA_BYTES,
  MAX_FACE_ANALYSIS_BYTES,
  normalizeConsultationData,
  normalizeFaceAnalysis,
} from '@/lib/consultation'
import type {
  ClientConsultation,
  ConsultationClient,
  ConsultationSummary,
} from '@/types/consultation'
import { createAdminClient } from '../../lib/supabase/admin'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

type Supabase = ReturnType<typeof getSupabaseServerClient>

const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const CONSULTATION_COLUMNS =
  'id, salon_id, client_id, created_by, created_by_name, updated_by, status, consultation_date, schema_version, data, face_photo_path, face_photo_consent_at, face_photo_consent_by, face_analysis, face_annotation_count, completed_at, revision, created_at, updated_at'

async function getCallerName(
  supabase: Supabase,
  salonId: string,
  userId: string,
  isOwner: boolean,
) {
  if (!isOwner) {
    const { data } = await supabase
      .from('staff_members')
      .select('name')
      .eq('user_id', userId)
      .eq('salon_id', salonId)
      .maybeSingle()
    return (data?.name as string | undefined) ?? 'Pracownik gabinetu'
  }

  const { data } = await supabase.from('salons').select('name').eq('id', salonId).maybeSingle()
  return data?.name ? `Właściciel · ${data.name}` : 'Właściciel gabinetu'
}

async function getClientForSalon(
  supabase: Supabase,
  salonId: string,
  clientId: string,
): Promise<ConsultationClient | null> {
  const { data } = await supabase
    .from('clients')
    .select('id, name, email, phone, birth_date, gender, important_info, location, city')
    .eq('id', clientId)
    .eq('salon_id', salonId)
    .maybeSingle()
  return (data as ConsultationClient | null) ?? null
}

async function getConsultationRow(supabase: Supabase, salonId: string, id: string) {
  const { data } = await supabase
    .from('client_consultations')
    .select(CONSULTATION_COLUMNS)
    .eq('id', id)
    .eq('salon_id', salonId)
    .maybeSingle()
  return data as ClientConsultation | null
}

async function signedPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin.storage
      .from('consultation-photos')
      .createSignedUrl(path, 60 * 60)
    if (error || !data) return null
    return data.signedUrl
  } catch {
    return null
  }
}

function normalizeRow(row: ClientConsultation): ClientConsultation {
  return {
    ...row,
    data: normalizeConsultationData(row.data),
    face_analysis: row.face_analysis ? normalizeFaceAnalysis(row.face_analysis) : null,
    face_annotation_count: row.face_annotation_count ?? 0,
  }
}

export const listConsultationsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { consultations: [] as ConsultationSummary[], error: 'Brak dostępu' }

    const client = await getClientForSalon(supabase, caller.salonId, data.clientId)
    if (!client) return { consultations: [] as ConsultationSummary[], error: 'Klient nie istnieje' }

    const { data: rows, error } = await supabase
      .from('client_consultations')
      .select(
        'id, status, consultation_date, completed_at, updated_at, created_by_name, face_annotation_count, face_photo_path, data',
      )
      .eq('client_id', data.clientId)
      .eq('salon_id', caller.salonId)
      .order('consultation_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return { consultations: [] as ConsultationSummary[], error: error.message }

    return {
      consultations: (rows ?? []).map((row) =>
        consultationSummaryFromRow(row as Parameters<typeof consultationSummaryFromRow>[0]),
      ),
      error: null,
    }
  })

export const getConsultationFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { consultation: null, client: null, photoUrl: null, error: 'Brak dostępu' }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row) {
      return {
        consultation: null,
        client: null,
        photoUrl: null,
        error: 'Konsultacja nie istnieje',
      }
    }

    const client = await getClientForSalon(supabase, caller.salonId, row.client_id)
    if (!client) {
      return {
        consultation: null,
        client: null,
        photoUrl: null,
        error: 'Brak dostępu do klienta',
      }
    }

    return {
      consultation: normalizeRow(row),
      client,
      photoUrl: await signedPhotoUrl(row.face_photo_path),
      error: null,
    }
  })

export const createConsultationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { clientId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { consultation: null, error: 'Brak dostępu' }

    const client = await getClientForSalon(supabase, caller.salonId, data.clientId)
    if (!client) return { consultation: null, error: 'Klient nie istnieje' }

    const createdByName = await getCallerName(
      supabase,
      caller.salonId,
      caller.userId,
      caller.isOwner,
    )
    const initialData = createEmptyConsultationData()

    const { data: row, error } = await supabase
      .from('client_consultations')
      .insert({
        salon_id: caller.salonId,
        client_id: data.clientId,
        created_by: caller.userId,
        created_by_name: createdByName,
        status: 'draft',
        consultation_date: initialData.meta.consultationDate,
        schema_version: 1,
        data: initialData,
        face_analysis: null,
        face_annotation_count: 0,
      })
      .select(CONSULTATION_COLUMNS)
      .single()

    if (error || !row)
      return { consultation: null, error: error?.message ?? 'Nie udało się utworzyć konsultacji' }

    return { consultation: normalizeRow(row as ClientConsultation), error: null }
  })

const saveConsultationInput = z.object({
  id: z.string().min(1),
  data: z.unknown(),
  status: z.enum(['draft', 'completed']).optional(),
  expectedRevision: z.number().int().positive().optional(),
})

export const saveConsultationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => saveConsultationInput.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak dostępu', conflict: false }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row) return { error: 'Konsultacja nie istnieje', conflict: false }

    if (row.status === 'completed') {
      if (data.status !== 'draft') {
        return { error: 'Konsultacja jest zakończona i nie można jej edytować', conflict: false }
      }
      if (!caller.isOwner) {
        return { error: 'Tylko właściciel może otworzyć zakończoną konsultację', conflict: false }
      }
    }

    if (data.expectedRevision && row.revision !== data.expectedRevision) {
      return {
        error: 'Konsultacja została zmieniona w innej karcie. Odśwież dane.',
        conflict: true,
      }
    }

    const normalized = normalizeConsultationData(data.data)
    const serialized = JSON.stringify(normalized)
    if (serialized.length > MAX_CONSULTATION_DATA_BYTES) {
      return { error: 'Formularz jest zbyt duży, aby go zapisać', conflict: false }
    }

    const nextStatus = data.status ?? row.status
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('client_consultations')
      .update({
        data: normalized,
        consultation_date: normalized.meta.consultationDate,
        status: nextStatus,
        completed_at: nextStatus === 'completed' ? (row.completed_at ?? now) : null,
        updated_by: caller.userId,
        revision: row.revision + 1,
      })
      .eq('id', row.id)
      .eq('salon_id', caller.salonId)
      .eq('revision', row.revision)
      .select('id, revision, updated_at, status, completed_at')
      .maybeSingle()

    if (updateError) {
      return { error: updateError.message, conflict: false }
    }

    if (!updated) {
      return {
        error: 'Konsultacja została zmieniona w innej karcie. Odśwież dane.',
        conflict: true,
      }
    }

    return {
      error: null,
      conflict: false,
      revision: updated.revision as number,
      updatedAt: updated.updated_at as string,
      status: updated.status as 'draft' | 'completed',
      completedAt: updated.completed_at as string | null,
    }
  })

export const deleteConsultationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak dostępu' }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row) return { error: 'Konsultacja nie istnieje' }
    if (row.status === 'completed' && !caller.isOwner) {
      return { error: 'Tylko właściciel może usunąć zakończoną konsultację' }
    }

    if (row.face_photo_path) {
      try {
        const admin = await createAdminClient()
        await admin.storage.from('consultation-photos').remove([row.face_photo_path])
      } catch {
        // Sam wpis nadal usuwamy — osierocony plik nie blokuje operacji.
      }
    }

    const { error } = await supabase
      .from('client_consultations')
      .delete()
      .eq('id', row.id)
      .eq('salon_id', caller.salonId)

    if (error) return { error: error.message }
    return { success: true }
  })

export const createConsultationPhotoUploadFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; contentType: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak dostępu' }

    const extension = PHOTO_EXTENSIONS[data.contentType]
    if (!extension) return { error: 'Dozwolone formaty zdjęć: JPG, PNG lub WEBP' }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row) return { error: 'Konsultacja nie istnieje' }
    if (row.status === 'completed') return { error: 'Konsultacja jest zakończona' }

    const path = `${caller.salonId}/${row.client_id}/${row.id}/face-${Date.now()}.${extension}`
    const admin = await createAdminClient()
    const { data: signed, error } = await admin.storage
      .from('consultation-photos')
      .createSignedUploadUrl(path)

    if (error || !signed) return { error: 'Nie udało się przygotować wysyłki zdjęcia' }
    return { path: signed.path, token: signed.token }
  })

export const setConsultationPhotoFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; path: string; consent: boolean }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak dostępu' }
    if (!data.consent) return { error: 'Potrzebna jest zgoda na przetwarzanie zdjęcia twarzy' }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row) return { error: 'Konsultacja nie istnieje' }
    if (row.status === 'completed') return { error: 'Konsultacja jest zakończona' }

    const expectedPrefix = `${caller.salonId}/${row.client_id}/${row.id}/`
    if (!data.path.startsWith(expectedPrefix)) {
      return { error: 'Nieprawidłowa ścieżka zdjęcia' }
    }

    const { error } = await supabase
      .from('client_consultations')
      .update({
        face_photo_path: data.path,
        face_photo_consent_at: new Date().toISOString(),
        face_photo_consent_by: caller.userId,
        face_analysis: null,
        face_annotation_count: 0,
        updated_by: caller.userId,
      })
      .eq('id', row.id)
      .eq('salon_id', caller.salonId)

    if (error) return { error: 'Nie udało się zapisać zdjęcia' }

    if (row.face_photo_path && row.face_photo_path !== data.path) {
      try {
        const admin = await createAdminClient()
        await admin.storage.from('consultation-photos').remove([row.face_photo_path])
      } catch {
        // ignorujemy sprzątanie starego pliku
      }
    }

    return { success: true, url: await signedPhotoUrl(data.path) }
  })

export const getConsultationPhotoUrlFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak dostępu' }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row?.face_photo_path) return { error: 'Brak zdjęcia' }

    const url = await signedPhotoUrl(row.face_photo_path)
    if (!url) return { error: 'Nie udało się pobrać zdjęcia' }
    return { url }
  })

export const removeConsultationPhotoFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak dostępu' }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row) return { error: 'Konsultacja nie istnieje' }
    if (row.status === 'completed') return { error: 'Konsultacja jest zakończona' }

    if (row.face_photo_path) {
      try {
        const admin = await createAdminClient()
        await admin.storage.from('consultation-photos').remove([row.face_photo_path])
      } catch {
        // ignorujemy błąd storage — wpis i tak czyścimy
      }
    }

    const { error } = await supabase
      .from('client_consultations')
      .update({
        face_photo_path: null,
        face_photo_consent_at: null,
        face_photo_consent_by: null,
        face_analysis: null,
        face_annotation_count: 0,
        updated_by: caller.userId,
      })
      .eq('id', row.id)
      .eq('salon_id', caller.salonId)

    if (error) return { error: 'Nie udało się usunąć zdjęcia' }
    return { success: true }
  })

const saveFaceAnalysisInput = z.object({
  id: z.string().min(1),
  analysis: z.unknown(),
})

export const saveFaceAnalysisFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => saveFaceAnalysisInput.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak dostępu' }

    const row = await getConsultationRow(supabase, caller.salonId, data.id)
    if (!row) return { error: 'Konsultacja nie istnieje' }
    if (row.status === 'completed') return { error: 'Konsultacja jest zakończona' }

    const parsed = faceAnalysisSchema.safeParse(data.analysis)
    if (!parsed.success) return { error: 'Nieprawidłowe dane mapy twarzy' }

    const analysis = parsed.data
    const serialized = JSON.stringify(analysis)
    if (serialized.length > MAX_FACE_ANALYSIS_BYTES) {
      return { error: 'Mapa twarzy jest zbyt duża, aby ją zapisać' }
    }

    const { error } = await supabase
      .from('client_consultations')
      .update({
        face_analysis: analysis,
        face_annotation_count: analysis.annotations.length,
        updated_by: caller.userId,
      })
      .eq('id', row.id)
      .eq('salon_id', caller.salonId)

    if (error) return { error: 'Nie udało się zapisać mapy twarzy' }
    return { success: true, updatedAt: new Date().toISOString() }
  })
