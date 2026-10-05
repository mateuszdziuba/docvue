import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export const createClientFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      name: string
      email?: string | null
      phone: string
      birth_date?: string
      notes?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (!caller.isOwner) return { error: 'Brak uprawnień' }
    const { salonId } = caller

    if (data.email) {
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('salon_id', salonId)
        .eq('email', data.email)
        .single()
      if (existing) return { error: 'Klient z tym emailem już istnieje' }
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        salon_id: salonId,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        birth_date: data.birth_date || null,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { client }
  })

export const updateClientFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      name?: string
      email?: string | null
      phone?: string
      birth_date?: string | null
      notes?: string | null
    }) => d,
  )
  .handler(async ({ data: { id, ...updates } }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { data: client, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('salon_id', caller.salonId)
      .select()
      .single()
    if (error) return { error: error.message }
    return { client }
  })

export const deleteClientFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

export const CLIENTS_PAGE_SIZE = 50

export const getClientsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; page?: number }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { clients: [], total: 0, page: 1, pageSize: CLIENTS_PAGE_SIZE }
    const { salonId } = caller

    const page = Math.max(1, Math.floor(data.page ?? 1))
    const from = (page - 1) * CLIENTS_PAGE_SIZE

    let q = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('salon_id', salonId)
      .order('name')
      .range(from, from + CLIENTS_PAGE_SIZE - 1)
    if (data.query) {
      const term = data.query.replace(/[%,()]/g, '')
      if (term) {
        q = q.or(
          `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,location.ilike.%${term}%`,
        )
      }
    }
    const { data: clients, count } = await q
    return {
      clients: clients || [],
      total: count ?? 0,
      page,
      pageSize: CLIENTS_PAGE_SIZE,
    }
  })

export const getClientFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (error || !client) return { error: 'Klient nie istnieje' }
    return { client }
  })

// Legacy aliases
export const deleteClient = (id: string) => deleteClientFn({ data: { id } })
export const updateClient = (
  id: string,
  updates: {
    name?: string
    email?: string | null
    phone?: string
    birth_date?: string | null
    notes?: string | null
  },
) => updateClientFn({ data: { id, ...updates } })
export const createClientAction = (data: {
  name: string
  email?: string | null
  phone: string
  birth_date?: string
  notes?: string
}) => createClientFn({ data })
