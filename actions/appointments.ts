'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CalendarAppointment {
  id: string
  salon_id: string
  client_id: string
  treatment_id: string
  start_time: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending_forms'
  notes: string | null
  client: { id: string; name: string; phone: string | null }
  treatment: { id: string; name: string; duration_minutes: number; price: number | null }
}

export async function getCalendarAppointments(
  salonId: string,
  from: Date,
  to: Date,
): Promise<CalendarAppointment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, salon_id, client_id, treatment_id, start_time, status, notes,
      clients (id, name, phone),
      treatments (id, name, duration_minutes, price)
    `)
    .eq('salon_id', salonId)
    .gte('start_time', from.toISOString())
    .lt('start_time', to.toISOString())
    .order('start_time', { ascending: true })

  if (error || !data) return []

  return data.map((apt) => {
    const treatment = (apt.treatments as unknown) as {
      id: string
      name: string
      duration_minutes: number
      price: number | null
    } | null
    // duration_minutes column may not exist yet (requires DB migration), fall back to treatment
    const customDuration = (apt as Record<string, unknown>).duration_minutes as number | undefined | null
    return {
      id: apt.id,
      salon_id: apt.salon_id,
      client_id: apt.client_id,
      treatment_id: apt.treatment_id,
      start_time: apt.start_time,
      duration_minutes: customDuration ?? treatment?.duration_minutes ?? 60,
      status: apt.status as CalendarAppointment['status'],
      notes: apt.notes,
      client: (apt.clients as unknown) as { id: string; name: string; phone: string | null },
      treatment: treatment ?? { id: '', name: 'Brak zabiegu', duration_minutes: 60, price: null },
    }
  })
}

export async function createCalendarAppointment(input: {
  salonId: string
  clientId: string
  treatmentId: string
  startTime: string
  notes?: string
}): Promise<{ data?: { id: string }; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Brak autoryzacji' }

  // Determine initial status based on form completion
  const { data: requiredForms } = await supabase
    .from('treatment_forms')
    .select('form_id')
    .eq('treatment_id', input.treatmentId)

  const requiredFormIds = requiredForms?.map((r) => r.form_id) ?? []
  let status: 'scheduled' | 'pending_forms' = 'scheduled'

  if (requiredFormIds.length > 0) {
    const { data: clientSubmissions } = await supabase
      .from('submissions')
      .select('form_id')
      .eq('client_id', input.clientId)
      .in('form_id', requiredFormIds)

    const submittedSet = new Set(clientSubmissions?.map((s) => s.form_id) ?? [])
    if (!requiredFormIds.every((id) => submittedSet.has(id))) {
      status = 'pending_forms'
    }
  }

  const { data: created, error } = await supabase
    .from('appointments')
    .insert({
      salon_id: input.salonId,
      client_id: input.clientId,
      treatment_id: input.treatmentId,
      start_time: input.startTime,
      status,
      notes: input.notes ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')
  return { data: created }
}

export async function updateAppointmentTiming(
  id: string,
  startTime?: string,
  durationMinutes?: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (startTime !== undefined) updates.start_time = startTime
  if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes

  if (Object.keys(updates).length === 0) return {}

  const { error } = await supabase.from('appointments').update(updates).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')
  return {}
}

export async function updateCalendarAppointmentStatus(
  id: string,
  status: CalendarAppointment['status'],
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteCalendarAppointment(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')
  return {}
}
