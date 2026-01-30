'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitForm(data: {
  formId: string
  formData: Record<string, unknown>
  clientName?: string
  clientEmail?: string
  signature?: string
}) {
  const supabase = await createClient()
  
  // Get form to verify it's public and get salon_id
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('salon_id, is_public, is_active')
    .eq('id', data.formId)
    .single()

  if (formError || !form) {
    return { error: 'Formularz nie istnieje' }
  }

  if (!form.is_public) {
    return { error: 'Ten formularz nie jest publiczny' }
  }

  if (!form.is_active) {
    return { error: 'Ten formularz jest nieaktywny' }
  }

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

  if (error) {
    return { error: error.message }
  }

  return { submission }
}

export async function getPublicForm(formId: string) {
  const supabase = await createClient()
  
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .eq('is_public', true)
    .eq('is_active', true)
    .single()

  if (error || !form) {
    return { error: 'Formularz nie istnieje lub nie jest dostępny' }
  }

  return { form }
}

export async function deleteSubmission(submissionId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nie jesteś zalogowany' }
  }

  // Get salon_id to verify ownership
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!salon) {
    return { error: 'Nie znaleziono gabinetu' }
  }

  // Get submission to retrieve client_id before deletion
  const { data: submission } = await supabase
    .from('submissions')
    .select('client_id')
    .eq('id', submissionId)
    .eq('salon_id', salon.id)
    .single()

  const clientId = submission?.client_id

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId)
    .eq('salon_id', salon.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  
  // Sync client's appointments if submission had a client_id
  // This will update status from 'scheduled' to 'pending_forms' if forms are now missing
  if (clientId) {
    try {
      const { syncClientAppointmentsStatus } = await import('@/actions/appointments-sync')
      await syncClientAppointmentsStatus(clientId)
    } catch (syncError) {
      console.error('Error syncing appointments after submission deletion:', syncError)
    }
  }
  
  return { success: true }
}

