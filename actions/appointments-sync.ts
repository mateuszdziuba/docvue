'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Synchronizes appointment status based on form completion.
 * Updates status to 'scheduled' if all required forms are filled,
 * or 'pending_forms' if some are still missing.
 * 
 * @param appointmentId - The appointment ID to sync
 * @returns The new status or null if no change needed
 */
export async function syncAppointmentStatus(appointmentId: string): Promise<string | null> {
  const supabase = await createClient()
  
  // Get appointment with treatment and required forms
  const { data: appointment, error: appError } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      client_id,
      treatment_id,
      treatments (
        treatment_forms (
          form_id,
          forms (id, is_active)
        )
      )
    `)
    .eq('id', appointmentId)
    .single()
  
  if (appError || !appointment) {
    console.error('syncAppointmentStatus: Appointment not found', appointmentId)
    return null
  }
  
  // Skip if already completed or cancelled
  if (appointment.status === 'completed' || appointment.status === 'cancelled') {
    return appointment.status
  }
  
  // Get required active form IDs
  const treatmentForms = (appointment.treatments as any)?.treatment_forms || []
  const requiredFormIds = treatmentForms
    .filter((tf: any) => tf.forms?.is_active !== false)
    .map((tf: any) => tf.form_id)
  
  // If no forms required, ensure status is scheduled
  if (requiredFormIds.length === 0) {
    if (appointment.status !== 'scheduled') {
      await supabase
        .from('appointments')
        .update({ status: 'scheduled' })
        .eq('id', appointmentId)
      return 'scheduled'
    }
    return appointment.status
  }
  
  // Check client's submissions for these forms
  const { data: submissions } = await supabase
    .from('submissions')
    .select('form_id')
    .eq('client_id', appointment.client_id)
    .in('form_id', requiredFormIds)
  
  const submittedFormIds = new Set(submissions?.map(s => s.form_id) || [])
  const allFormsCompleted = requiredFormIds.every((id: string) => submittedFormIds.has(id))
  
  const newStatus = allFormsCompleted ? 'scheduled' : 'pending_forms'
  
  // Update if status changed
  if (appointment.status !== newStatus) {
    await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
    return newStatus
  }
  
  return appointment.status
}

/**
 * Syncs status for multiple appointments at once.
 * Useful for dashboard views.
 */
export async function syncMultipleAppointmentStatuses(appointmentIds: string[]): Promise<void> {
  // Run syncs in parallel for efficiency
  await Promise.all(appointmentIds.map(id => syncAppointmentStatus(id)))
}

/**
 * Syncs status for all pending_forms appointments of a client.
 * Called after form submission to update all related appointments.
 */
export async function syncClientAppointmentsStatus(clientId: string): Promise<void> {
  const supabase = await createClient()
  
  // Find all non-completed/cancelled appointments for this client
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('client_id', clientId)
    .in('status', ['pending_forms', 'scheduled'])
    .gte('start_time', new Date().toISOString()) // Only future appointments
  
  if (appointments && appointments.length > 0) {
    await syncMultipleAppointmentStatuses(appointments.map(a => a.id))
  }
}
