import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import {
  formatValidationErrors,
  MAX_SIGNATURE_LENGTH,
  normalizeFieldType,
  validateFormSubmission,
} from '@/lib/form-validation'
import { consumeRateLimit, rateLimitError, requestIp } from '@/lib/rate-limit'
import { generateSecureToken, isValidFormToken } from '@/lib/secure-token'
import type { FormField, FormSchema } from '@/types/database'
import { createAdminClient } from '../../lib/supabase/admin'
import { getSupabaseServerClient } from '../utils/supabase'
import { getVerifiedUser } from './_auth'
import { sha256Hex, submissionContentHash } from './audit'

const SALON_PUBLIC_COLUMNS = 'name, address, phone, email, website, social_media'

type PublicSalon = {
  name: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  social_media: string | null
}

async function getSalonId(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const user = await getVerifiedUser(supabase)
  if (!user) return null
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  return salon?.id ?? null
}

async function syncClientAppointmentsStatus(clientId: string): Promise<void> {
  const admin = await createAdminClient()

  const { data: appointments, error } = await admin
    .from('appointments')
    .select(`id, treatment_id, treatments (treatment_forms (form_id, forms (id, is_active)))`)
    .eq('client_id', clientId)
    .in('status', ['pending_forms', 'scheduled'])
    .gte('start_time', new Date().toISOString())

  if (error || !appointments || appointments.length === 0) return

  for (const appointment of appointments) {
    const treatment = appointment.treatments as unknown as {
      treatment_forms: Array<{
        form_id: string
        forms: { id: string; is_active: boolean | null } | null
      } | null>
    } | null

    const treatmentForms = treatment?.treatment_forms ?? []
    const requiredFormIds = treatmentForms
      .filter(
        (tf): tf is { form_id: string; forms: { id: string; is_active: boolean | null } | null } =>
          tf?.forms?.is_active !== false,
      )
      .map((tf) => tf.form_id)

    if (requiredFormIds.length === 0) continue

    const { data: submissions } = await admin
      .from('submissions')
      .select('form_id')
      .eq('client_id', clientId)
      .in('form_id', requiredFormIds)

    const submittedFormIds = new Set((submissions ?? []).map((s) => s.form_id))
    if (!requiredFormIds.every((id) => submittedFormIds.has(id))) continue

    await admin.from('appointments').update({ status: 'scheduled' }).eq('id', appointment.id)
  }
}

export const assignFormToClientFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { clientId: string; formId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { error: 'Nie jesteś zalogowany' }

    const [{ data: clientRow }, { data: formRow }] = await Promise.all([
      supabase
        .from('clients')
        .select('id')
        .eq('id', data.clientId)
        .or(`salon_id.eq.${salonId},salon_id.is.null`)
        .maybeSingle(),
      supabase
        .from('forms')
        .select('id')
        .eq('id', data.formId)
        .eq('salon_id', salonId)
        .maybeSingle(),
    ])

    if (!clientRow) return { error: 'Nie znaleziono klienta' }
    if (!formRow) return { error: 'Nie znaleziono formularza' }

    const token = generateSecureToken()
    const { data: clientForm, error } = await supabase
      .from('client_forms')
      .insert({
        salon_id: salonId,
        client_id: data.clientId,
        form_id: data.formId,
        token,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { clientForm, token }
  })

export const getOrCreateFormTokenFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { clientId: string; formId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { error: 'Nie jesteś zalogowany' }

    const [{ data: clientRow }, { data: formRow }] = await Promise.all([
      supabase
        .from('clients')
        .select('id')
        .eq('id', data.clientId)
        .eq('salon_id', salonId)
        .maybeSingle(),
      supabase
        .from('forms')
        .select('id')
        .eq('id', data.formId)
        .eq('salon_id', salonId)
        .maybeSingle(),
    ])
    if (!clientRow) return { error: 'Nie znaleziono klienta' }
    if (!formRow) return { error: 'Nie znaleziono formularza' }

    const { data: existing } = await supabase
      .from('client_forms')
      .select('token')
      .eq('client_id', data.clientId)
      .eq('form_id', data.formId)
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing?.token) return { token: existing.token }

    const token = generateSecureToken()
    const { data: created, error } = await supabase
      .from('client_forms')
      .insert({
        salon_id: salonId,
        client_id: data.clientId,
        form_id: data.formId,
        token,
        status: 'pending',
      })
      .select('token')
      .single()
    if (error || !created) return { error: 'Nie udało się utworzyć linku do formularza' }
    return { token: created.token }
  })

export const getClientFormsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { error: 'Nie jesteś zalogowany', clientForms: [] }

    const { data: clientForms, error } = await supabase
      .from('client_forms')
      .select('*, forms (id, title, description)')
      .eq('client_id', data.clientId)
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
    if (error) return { error: error.message, clientForms: [] }
    return { clientForms: clientForms || [] }
  })

export const getClientFormByTokenFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    if (!isValidFormToken(data.token)) {
      return { error: 'Nieprawidłowy link do formularza' }
    }

    const limit = consumeRateLimit(`form-token:${requestIp()}`, 60, 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const admin = await createAdminClient()
    const { data: clientForm, error } = await admin
      .from('client_forms')
      .select('*, forms (*), clients (id, name, email)')
      .eq('token', data.token)
      .maybeSingle()

    if (error || !clientForm) return { error: 'Nieprawidłowy link do formularza' }
    if (clientForm.status === 'completed')
      return { error: 'Ten formularz został już wypełniony', completed: true }
    const form = clientForm.forms as { is_active?: boolean | null } | null
    if (!form) return { error: 'Formularz nie jest dostępny' }
    if (form.is_active === false) return { error: 'Ten formularz jest nieaktywny' }

    // Dane gabinetu są publiczne (potrzebne do automatycznego uzupełnienia
    // formularzy np. RODO). Nigdy nie zwracamy całego wiersza `salons`
    // (zawiera m.in. pin_code i user_id).
    let salon: PublicSalon | null = null
    try {
      const { data: publicSalon } = await admin
        .from('salon_public')
        .select('*')
        .eq('id', clientForm.salon_id)
        .maybeSingle()
      if (publicSalon) salon = publicSalon as PublicSalon
    } catch {
      salon = null
    }
    if (!salon) {
      try {
        const { data: salonRow } = await admin
          .from('salons')
          .select(SALON_PUBLIC_COLUMNS)
          .eq('id', clientForm.salon_id)
          .maybeSingle()
        salon = (salonRow as PublicSalon | null) ?? null
      } catch {
        salon = null
      }
    }

    return { clientForm, salon }
  })

export const submitClientFormFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      token: string
      formData: Record<string, unknown>
      filledBy: 'client' | 'staff'
      signature?: string
      pdfBase64?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    if (data.filledBy !== 'client' && data.filledBy !== 'staff') {
      return { error: 'Nieprawidłowy tryb wypełnienia formularza' }
    }
    if (!isValidFormToken(data.token)) {
      return { error: 'Nieprawidłowy link do formularza' }
    }

    const limit = consumeRateLimit(`form-submit:${requestIp()}`, 10, 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    // Publiczna ścieżka tokenowa: czytamy i zapisujemy wyłącznie klientem
    // administracyjnym po walidacji tokenu (RLS nie może zweryfikować
    // capability URL-a dla anonimowego użytkownika).
    const admin = await createAdminClient()
    const { data: clientForm, error: cfError } = await admin
      .from('client_forms')
      .select('*, forms (id, salon_id, title, schema, is_active), clients (id, name, email)')
      .eq('token', data.token)
      .maybeSingle()

    if (cfError || !clientForm) return { error: 'Nieprawidłowy link do formularza' }
    if (clientForm.status !== 'pending') {
      return { error: 'Ten formularz został już wypełniony' }
    }
    const formRow = clientForm.forms as {
      title?: string | null
      schema?: FormSchema
      is_active?: boolean | null
    } | null
    if (!formRow) return { error: 'Formularz nie jest dostępny' }
    if (formRow.is_active === false) return { error: 'Ten formularz jest nieaktywny' }

    const formSchema = formRow.schema
    const fields = (formSchema?.fields ?? []) as FormField[]
    const validation = validateFormSubmission(fields, data.formData ?? {})

    if (!validation.success) {
      return { error: formatValidationErrors(validation.errors) }
    }

    if (data.signature && data.signature.length > MAX_SIGNATURE_LENGTH) {
      return { error: 'Podpis jest zbyt duży. Spróbuj podpisać się ponownie.' }
    }

    const customSignatureField = fields.find(
      (field) => normalizeFieldType(field.type) === 'signature',
    )
    const signatureRequired = customSignatureField
      ? !!customSignatureField.required && !customSignatureField.disabled
      : true

    if (signatureRequired && !(data.signature ?? '').trim()) {
      return { error: 'Podpis przed przystąpieniem do zabiegu jest wymagany' }
    }

    const { data: claimed, error: claimError } = await admin
      .from('client_forms')
      .update({
        status: 'completed',
        filled_at: new Date().toISOString(),
        filled_by: data.filledBy,
      })
      .eq('id', clientForm.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (claimError || !claimed) return { error: 'Ten formularz został już wypełniony' }

    const signedAt = new Date().toISOString()
    const answers = (validation.data ?? data.formData) as Record<string, unknown>
    const signature = data.signature || null
    const clientRecord = clientForm.clients as { name: string | null; email: string | null } | null

    const contentSha256 = submissionContentHash({
      formTitle: formRow.title ?? null,
      schema: formSchema ?? null,
      answers,
      signature,
      signedAt,
      filledBy: data.filledBy,
    })

    const baseRow = {
      client_form_id: clientForm.id,
      form_id: clientForm.form_id,
      client_id: clientForm.client_id,
      salon_id: clientForm.salon_id,
      data: answers,
      client_name: clientRecord?.name || null,
      client_email: clientRecord?.email || null,
      signature,
    }

    const auditRow = {
      ...baseRow,
      signed_at: signedAt,
      ip_address: requestIp(),
      user_agent: (getRequestHeader('user-agent') ?? '').slice(0, 512) || null,
      filled_by: data.filledBy,
      form_title: formRow.title ?? null,
      form_schema: formSchema ?? null,
      content_sha256: contentSha256,
    }

    let inserted = await admin.from('submissions').insert(auditRow).select().single()
    // Migracja 20261011 może nie być jeszcze zastosowana — zapis bez audytu.
    if (inserted.error && /column|schema cache/i.test(inserted.error.message)) {
      inserted = await admin.from('submissions').insert(baseRow).select().single()
    }
    const submission = inserted.data
    const subError = inserted.error

    if (subError) {
      console.error('Submission insert error:', subError.message)
      await admin
        .from('client_forms')
        .update({ status: 'pending', filled_at: null, filled_by: null })
        .eq('id', clientForm.id)
      return { error: 'Nie udało się zapisać odpowiedzi. Spróbuj ponownie za chwilę.' }
    }

    // Migawka PDF przesłana przez przeglądarkę (best-effort — nie blokuje zgody).
    if (submission && data.pdfBase64) {
      try {
        const buffer = Buffer.from(data.pdfBase64, 'base64')
        const isPdf = buffer.subarray(0, 5).toString() === '%PDF-'
        if (isPdf && buffer.length <= 15 * 1024 * 1024) {
          const pdfPath = `${clientForm.salon_id}/${submission.id}.pdf`
          const { error: uploadError } = await admin.storage
            .from('submission-documents')
            .upload(pdfPath, buffer, { contentType: 'application/pdf', upsert: true })
          if (uploadError) {
            console.error('[submission-pdf] upload error:', uploadError.message)
          } else {
            const pdfSha256 = sha256Hex(buffer)
            await admin
              .from('submissions')
              .update({ pdf_path: pdfPath, pdf_sha256: pdfSha256 })
              .eq('id', submission.id)
            submission.pdf_path = pdfPath
            submission.pdf_sha256 = pdfSha256
          }
        }
      } catch (snapshotError) {
        console.error('[submission-pdf] store error:', snapshotError)
      }
    }

    await syncClientAppointmentsStatus(clientForm.client_id)

    return { submission }
  })

export const deleteClientFormFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { error: 'Nie jesteś zalogowany' }

    const { data: row } = await supabase
      .from('client_forms')
      .select('id')
      .eq('id', data.id)
      .eq('salon_id', salonId)
      .maybeSingle()
    if (!row) return { error: 'Nie znaleziono przypisania formularza' }

    await supabase.from('submissions').delete().eq('client_form_id', data.id)
    const { error } = await supabase
      .from('client_forms')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

// Legacy aliases
export const assignFormToClient = (data: { clientId: string; formId: string }) =>
  assignFormToClientFn({ data })
export const deleteClientForm = (id: string) => deleteClientFormFn({ data: { id } })
export const submitClientForm = (data: {
  token: string
  formData: Record<string, unknown>
  filledBy: 'client' | 'staff'
  signature?: string
  pdfBase64?: string
}) => submitClientFormFn({ data })
export const getClientFormByToken = (token: string) => getClientFormByTokenFn({ data: { token } })
