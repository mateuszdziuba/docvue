import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export const getSubmissionsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; clientId?: string }) => d)
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

export const deleteSubmissionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
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
