import { createServerFn } from '@tanstack/react-start'
import type { FormSchema } from '@/types/database'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export const createFormFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { title: string; description?: string; schema: FormSchema }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (!caller.isOwner) return { error: 'Brak uprawnień' }
    const { salonId } = caller

    const { data: form, error } = await supabase
      .from('forms')
      .insert({
        salon_id: salonId,
        title: data.title,
        description: data.description || null,
        schema: data.schema,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { form }
  })

export const updateFormFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      title?: string
      description?: string
      schema?: FormSchema
      is_active?: boolean
    }) => d,
  )
  .handler(async ({ data: { id, ...updates } }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { data: form, error } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    return { form }
  })

export const deleteFormFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase.from('forms').delete().eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const toggleFormActiveFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase
      .from('forms')
      .update({ is_active: data.is_active })
      .eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const getFormsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const caller = await getCallerSalonId(supabase)
  if (!caller) return { forms: [] }
  const { data: forms } = await supabase
    .from('forms')
    .select('*')
    .eq('salon_id', caller.salonId)
    .order('created_at', { ascending: false })
  return { forms: forms || [] }
})

export const getFormFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', data.id)
      .single()
    if (error || !form) return { error: 'Formularz nie istnieje' }
    return { form }
  })

// Legacy aliases
export const toggleFormActive = (id: string, is_active: boolean) =>
  toggleFormActiveFn({ data: { id, is_active } })
export const deleteForm = (id: string) => deleteFormFn({ data: { id } })
export const updateForm = (
  id: string,
  updates: { title?: string; description?: string; schema?: FormSchema; is_active?: boolean },
) => updateFormFn({ data: { id, ...updates } })
export const createForm = (data: { title: string; description?: string; schema: FormSchema }) =>
  createFormFn({ data })
