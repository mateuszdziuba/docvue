import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export const getTreatmentsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { treatments: [] }

    let q = supabase
      .from('treatments')
      .select('*, treatment_forms (form_id, forms (id, title))')
      .eq('salon_id', caller.salonId)
      .order('name')
    if (data.query) q = q.ilike('name', `%${data.query}%`)
    const { data: treatments } = await q
    return { treatments: treatments || [] }
  })

export const createTreatmentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { name: string; description?: string; duration_minutes: number; price?: number | null }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (!caller.isOwner) return { error: 'Brak uprawnień' }
    const { salonId } = caller

    const { data: treatment, error } = await supabase
      .from('treatments')
      .insert({
        salon_id: salonId,
        name: data.name,
        description: data.description || null,
        duration_minutes: data.duration_minutes,
        price: data.price ?? null,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { treatment }
  })

export const updateTreatmentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      name?: string
      description?: string | null
      duration_minutes?: number
      price?: number | null
    }) => d,
  )
  .handler(async ({ data: { id, ...updates } }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { data: treatment, error } = await supabase
      .from('treatments')
      .update(updates)
      .eq('id', id)
      .eq('salon_id', caller.salonId)
      .select()
      .single()
    if (error) return { error: error.message }
    return { treatment }
  })

export const deleteTreatmentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

export const assignFormToTreatmentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { treatmentId: string; formId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }

    const [{ data: treatmentRow }, { data: formRow }] = await Promise.all([
      supabase
        .from('treatments')
        .select('id')
        .eq('id', data.treatmentId)
        .eq('salon_id', caller.salonId)
        .maybeSingle(),
      supabase
        .from('forms')
        .select('id')
        .eq('id', data.formId)
        .eq('salon_id', caller.salonId)
        .maybeSingle(),
    ])
    if (!treatmentRow || !formRow) return { error: 'Nie znaleziono zabiegu lub formularza' }

    const { error } = await supabase
      .from('treatment_forms')
      .insert({ treatment_id: data.treatmentId, form_id: data.formId })
    if (error) return { error: error.message }
    return { success: true }
  })

export const removeFormFromTreatmentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { treatmentId: string; formId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }

    const { data: treatmentRow } = await supabase
      .from('treatments')
      .select('id')
      .eq('id', data.treatmentId)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!treatmentRow) return { error: 'Nie znaleziono zabiegu' }

    const { error } = await supabase
      .from('treatment_forms')
      .delete()
      .eq('treatment_id', data.treatmentId)
      .eq('form_id', data.formId)
    if (error) return { error: error.message }
    return { success: true }
  })
