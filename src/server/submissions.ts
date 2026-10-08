import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../../lib/supabase/admin'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export const getSubmissionsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; clientId?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { submissions: [] }

    let q = supabase
      .from('submissions')
      .select('*, forms (id, title)')
      .eq('salon_id', caller.salonId)
      .order('created_at', { ascending: false })

    if (data.clientId) q = q.eq('client_id', data.clientId)
    if (data.query) q = q.ilike('client_name', `%${data.query}%`)
    const { data: submissions } = await q
    return { submissions: submissions || [] }
  })

export const getSubmissionFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*, forms (id, title, schema), clients (id, name, email, phone)')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (error || !submission) return { error: 'Odpowiedź nie istnieje' }
    return { submission }
  })

export const getSubmissionDocumentUrlFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: row } = await supabase
      .from('submissions')
      .select('pdf_path')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!row?.pdf_path) return { error: 'Brak zapisanego dokumentu' }
    if (row.pdf_path.split('/')[0] !== caller.salonId) return { error: 'Brak dostępu do dokumentu' }

    const admin = await createAdminClient()
    const { data: signed, error } = await admin.storage
      .from('submission-documents')
      .createSignedUrl(row.pdf_path, 3600)
    if (error || !signed) return { error: 'Nie udało się pobrać dokumentu' }
    return { url: signed.signedUrl }
  })

export const deleteSubmissionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }

    // Usuń także migawkę PDF ze storage (jeśli istnieje).
    const { data: row } = await supabase
      .from('submissions')
      .select('pdf_path')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (row?.pdf_path) {
      const admin = await createAdminClient()
      await admin.storage.from('submission-documents').remove([row.pdf_path])
    }

    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

// Legacy aliases
export const deleteSubmission = (id: string) => deleteSubmissionFn({ data: { id } })
