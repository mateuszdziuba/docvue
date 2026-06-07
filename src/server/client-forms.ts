import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'

function generateToken(length = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function getSalonId(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user.id).single()
  return salon?.id ?? null
}

export const assignFormToClientFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { clientId: string; formId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { error: 'Nie jesteś zalogowany' }

    const token = generateToken()
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

export const getClientFormsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: clientForms, error } = await supabase
      .from('client_forms')
      .select('*, forms (id, title, description)')
      .eq('client_id', data.clientId)
      .order('created_at', { ascending: false })
    if (error) return { error: error.message, clientForms: [] }
    return { clientForms: clientForms || [] }
  })

export const getClientFormByTokenFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: clientForm, error } = await supabase
      .from('client_forms')
      .select('*, forms (*), clients (id, name, email)')
      .eq('token', data.token)
      .single()

    if (error || !clientForm) return { error: 'Nieprawidłowy link do formularza' }
    if (clientForm.status === 'completed')
      return { error: 'Ten formularz został już wypełniony', completed: true }
    if (!clientForm.forms) return { error: 'Formularz nie jest dostępny' }

    return { clientForm }
  })

export const submitClientFormFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      token: string
      formData: Record<string, unknown>
      filledBy: 'client' | 'staff'
      signature?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: clientForm, error: cfError } = await supabase
      .from('client_forms')
      .select('*, forms (id, salon_id), clients (id, name, email)')
      .eq('token', data.token)
      .single()

    if (cfError || !clientForm) return { error: 'Nieprawidłowy link do formularza' }
    if (clientForm.status === 'completed') return { error: 'Ten formularz został już wypełniony' }

    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        client_form_id: clientForm.id,
        form_id: clientForm.form_id,
        client_id: clientForm.client_id,
        salon_id: clientForm.salon_id,
        data: data.formData,
        client_name: (clientForm.clients as { name: string } | null)?.name || null,
        client_email: (clientForm.clients as { email: string | null } | null)?.email || null,
        signature: data.signature || null,
      })
      .select()
      .single()

    if (subError) return { error: subError.message }

    await supabase
      .from('client_forms')
      .update({
        status: 'completed',
        filled_at: new Date().toISOString(),
        filled_by: data.filledBy,
      })
      .eq('id', clientForm.id)

    return { submission }
  })

export const deleteClientFormFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    await supabase.from('submissions').delete().eq('client_form_id', data.id)
    const { error } = await supabase.from('client_forms').delete().eq('id', data.id)
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
}) => submitClientFormFn({ data })
export const getClientFormByToken = (token: string) => getClientFormByTokenFn({ data: { token } })
