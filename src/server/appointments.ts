import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export interface CalendarAppointment {
  id: string
  salon_id: string
  client_id: string
  treatment_id: string
  start_time: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending_forms'
  notes: string | null
  staff_id: string | null
  staff_member: { id: string; name: string } | null
  client: { id: string; name: string; phone: string | null }
  treatment: { id: string; name: string; duration_minutes: number; price: number | null }
}

async function getSalonId(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const caller = await getCallerSalonId(supabase)
  return caller?.salonId ?? null
}

export const getCalendarAppointmentsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { salonId: string; from: string; to: string }) => d)
  .handler(async ({ data }): Promise<{ appointments: CalendarAppointment[] }> => {
    const supabase = getSupabaseServerClient()
    const { data: rows, error } = await supabase
      .from('appointments')
      .select(`
        id, salon_id, client_id, treatment_id, start_time, duration_minutes, status, notes, staff_id,
        clients (id, name, phone),
        treatments (id, name, duration_minutes, price),
        staff_members (id, name)
      `)
      .eq('salon_id', data.salonId)
      .gte('start_time', data.from)
      .lt('start_time', data.to)
      .order('start_time', { ascending: true })

    if (error || !rows) return { appointments: [] }

    const appointments = rows.map((apt) => {
      const treatment = apt.treatments as unknown as {
        id: string
        name: string
        duration_minutes: number
        price: number | null
      } | null
      const customDuration = (apt as Record<string, unknown>).duration_minutes as
        | number
        | undefined
        | null
      return {
        id: apt.id,
        salon_id: apt.salon_id,
        client_id: apt.client_id,
        treatment_id: apt.treatment_id,
        start_time: apt.start_time,
        duration_minutes: customDuration ?? treatment?.duration_minutes ?? 60,
        status: apt.status as CalendarAppointment['status'],
        notes: apt.notes,
        staff_id: (apt as Record<string, unknown>).staff_id as string | null ?? null,
        staff_member: (apt as Record<string, unknown>).staff_members as { id: string; name: string } | null ?? null,
        client: apt.clients as unknown as { id: string; name: string; phone: string | null },
        treatment: treatment ?? { id: '', name: 'Brak zabiegu', duration_minutes: 60, price: null },
      }
    })

    return { appointments }
  })

export const createAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      clientId: string
      treatmentId: string
      startTime: string
      durationMinutes?: number
      notes?: string
      staffId?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { error: 'Nie jesteś zalogowany' }

    // Check for overlapping appointments
    const startTime = new Date(data.startTime)
    const duration = data.durationMinutes || 60
    const endTime = new Date(startTime.getTime() + duration * 60000)

    const dayStart = new Date(startTime)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(startTime)
    dayEnd.setHours(23, 59, 59, 999)

    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('start_time, duration_minutes')
      .eq('salon_id', salonId)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .neq('status', 'cancelled')

    const hasOverlap = (existingAppts || []).some((apt) => {
      const aptStart = new Date(apt.start_time)
      const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000)
      return startTime < aptEnd && endTime > aptStart
    })

    if (hasOverlap) {
      return { error: 'Wybrany termin jest już zajęty. Wybierz inny.' }
    }

    // Check for overlapping time blocks
    const { data: timeBlockOverlap } = await supabase
      .from('time_blocks')
      .select('id')
      .eq('salon_id', salonId)
      .lt('start_time', endTime.toISOString())
      .gt('end_time', startTime.toISOString())
      .limit(1)

    if (timeBlockOverlap && timeBlockOverlap.length > 0) {
      return { error: 'Wybrany termin jest zablokowany. Wybierz inny.' }
    }

    const { data: requiredForms } = await supabase
      .from('treatment_forms')
      .select('form_id')
      .eq('treatment_id', data.treatmentId)
    const requiredFormIds = requiredForms?.map((r) => r.form_id) ?? []
    let status: 'scheduled' | 'pending_forms' = 'scheduled'

    if (requiredFormIds.length > 0) {
      const { data: clientSubmissions } = await supabase
        .from('submissions')
        .select('form_id')
        .eq('client_id', data.clientId)
        .in('form_id', requiredFormIds)
      const submittedSet = new Set(clientSubmissions?.map((s) => s.form_id) ?? [])
      if (!requiredFormIds.every((id) => submittedSet.has(id))) status = 'pending_forms'
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        salon_id: salonId,
        client_id: data.clientId,
        treatment_id: data.treatmentId,
        start_time: data.startTime,
        duration_minutes: data.durationMinutes,
        notes: data.notes || null,
        staff_id: data.staffId || null,
        status,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { appointment }
  })

export const updateAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      status?: string
      notes?: string | null
      before_photo_path?: string | null
      after_photo_path?: string | null
      start_time?: string
      duration_minutes?: number
    }) => d,
  )
  .handler(async ({ data: { id, ...updates } }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    return { appointment }
  })

export const deleteAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase.from('appointments').delete().eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const getAppointmentsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; status?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { appointments: [] }

    let q = supabase
      .from('appointments')
      .select('*, clients (id, name, phone), treatments (id, name, duration_minutes, price)')
      .eq('salon_id', salonId)
      .order('start_time', { ascending: false })

    if (data.status) q = q.eq('status', data.status)

    const { data: rows } = await q
    return { appointments: rows || [] }
  })

export const getAppointmentFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(
        '*, clients (id, name, phone, email, birth_date, notes), treatments (*, treatment_forms (form_id, forms (id, title))), submissions (*)',
      )
      .eq('id', data.id)
      .single()
    if (error || !appointment) return { error: 'Wizyta nie istnieje' }
    return { appointment }
  })

// Legacy function aliases for component compatibility
export const getCalendarAppointments = async (
  salonId: string,
  from: Date | string,
  to: Date | string,
) => {
  const result = await getCalendarAppointmentsFn({
    data: {
      salonId,
      from: from instanceof Date ? from.toISOString() : from,
      to: to instanceof Date ? to.toISOString() : to,
    },
  })
  return result.appointments
}

export const updateAppointmentTiming = async (
  id: string,
  startTime?: string,
  durationMinutes?: number,
) => {
  return updateAppointmentFn({
    data: { id, start_time: startTime, duration_minutes: durationMinutes },
  })
}

export const updateCalendarAppointmentStatus = async (id: string, status: string) => {
  return updateAppointmentFn({ data: { id, status } })
}
export const deleteCalendarAppointment = (id: string) => deleteAppointmentFn({ data: { id } })
export const createCalendarAppointment = (data: {
  clientId: string
  treatmentId: string
  startTime: string
  durationMinutes?: number
  notes?: string
  staffId?: string
  salonId?: string
}) => {
  const { salonId: _salonId, ...appointmentData } = data
  return createAppointmentFn({ data: appointmentData })
}

// Client-facing booking — uses auth context to find client
export const bookAsClientFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { treatmentId: string; startTime: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Musisz być zalogowany' }

    const { data: client } = await supabase
      .from('clients')
      .select('id, salon_id')
      .eq('user_id', user.id)
      .single()

    if (!client) return { error: 'Nie znaleziono profilu klienta' }

    // Reuse the same creation logic
    const treatment = await supabase
      .from('treatments')
      .select('duration_minutes')
      .eq('id', data.treatmentId)
      .single()

    const durationMinutes = treatment.data?.duration_minutes || 60

    // Check overlap
    const startTime = new Date(data.startTime)
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000)

    const dayStart = new Date(startTime)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(startTime)
    dayEnd.setHours(23, 59, 59, 999)

    const { data: existing } = await supabase
      .from('appointments')
      .select('start_time, duration_minutes')
      .eq('salon_id', client.salon_id)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .neq('status', 'cancelled')

    const hasOverlap = (existing || []).some((apt) => {
      const aptStart = new Date(apt.start_time)
      const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000)
      return startTime < aptEnd && endTime > aptStart
    })

    if (hasOverlap) return { error: 'Termin jest już zajęty.' }

    // Check required forms
    const { data: requiredForms } = await supabase
      .from('treatment_forms')
      .select('form_id')
      .eq('treatment_id', data.treatmentId)

    const requiredFormIds = requiredForms?.map((r) => r.form_id) ?? []
    let status: 'scheduled' | 'pending_forms' = 'scheduled'

    if (requiredFormIds.length > 0) {
      const { data: clientSubmissions } = await supabase
        .from('submissions')
        .select('form_id')
        .eq('client_id', client.id)
        .in('form_id', requiredFormIds)
      const submittedSet = new Set(clientSubmissions?.map((s) => s.form_id) ?? [])
      if (!requiredFormIds.every((id) => submittedSet.has(id))) status = 'pending_forms'
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        salon_id: client.salon_id,
        client_id: client.id,
        treatment_id: data.treatmentId,
        start_time: data.startTime,
        duration_minutes: durationMinutes,
        status,
      })
      .select('*, treatments (name, duration_minutes, price)')
      .single()

    if (error) return { error: error.message }
    return { appointment, status }
  })
