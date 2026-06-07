import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export const submitPublicFormFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      formId: string
      formData: Record<string, unknown>
      clientName?: string
      clientEmail?: string
      signature?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('salon_id, is_public, is_active')
      .eq('id', data.formId)
      .single()

    if (formError || !form) return { error: 'Formularz nie istnieje' }
    if (!form.is_public) return { error: 'Ten formularz nie jest publiczny' }
    if (!form.is_active) return { error: 'Ten formularz jest nieaktywny' }

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        form_id: data.formId,
        salon_id: form.salon_id,
        data: data.formData,
        client_name: data.clientName || null,
        client_email: data.clientEmail || null,
        signature: data.signature || null,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { submission }
  })

export const getPublicFormFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { formId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', data.formId)
      .eq('is_public', true)
      .eq('is_active', true)
      .single()
    if (error || !form) return { error: 'Formularz nie istnieje lub jest niedostępny' }
    return { form }
  })

export const getSubmissionsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { submissions: [] }

    const caller = await getCallerSalonId(supabase)
    if (!caller) return { submissions: [] }

    let q = supabase
      .from('submissions')
      .select('*, forms (id, title)')
      .eq('salon_id', caller.salonId)
      .order('created_at', { ascending: false })

    if (data.query) q = q.ilike('client_name', `%${data.query}%`)
    const { data: submissions } = await q
    return { submissions: submissions || [] }
  })

export const getSubmissionFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*, forms (id, title, schema), clients (id, name, email, phone)')
      .eq('id', data.id)
      .single()
    if (error || !submission) return { error: 'Odpowiedź nie istnieje' }
    return { submission }
  })

export const deleteSubmissionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase.from('submissions').delete().eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true }
  })

// Legacy aliases
export const deleteSubmission = (id: string) => deleteSubmissionFn({ data: { id } })
