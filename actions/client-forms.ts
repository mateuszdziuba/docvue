'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { syncClientAppointmentsStatus } from '@/actions/appointments-sync'

// Generate random token for client form link
function generateToken(length: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function assignFormToClient(data: {
  clientId: string
  formId: string
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nie jesteś zalogowany' }
  }

  // Get salon_id
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!salon) {
    return { error: 'Nie znaleziono gabinetu' }
  }

  // Generate unique token
  const token = generateToken()

  const { data: clientForm, error } = await supabase
    .from('client_forms')
    .insert({
      salon_id: salon.id,
      client_id: data.clientId,
      form_id: data.formId,
      token,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/clients')
  return { clientForm, token }
}

export async function getClientForms(clientId: string) {
  const supabase = await createClient()
  
  const { data: clientForms, error } = await supabase
    .from('client_forms')
    .select(`
      *,
      forms (id, title, description)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message, clientForms: [] }
  }

  return { clientForms: clientForms || [] }
}

export async function getClientFormByToken(token: string) {
  const supabase = await createClient()
  
  const { data: clientForm, error } = await supabase
    .from('client_forms')
    .select(`
      *,
      forms (*),
      clients (id, name, email)
    `)
    .eq('token', token)
    .single()

  if (error || !clientForm) {
    return { error: 'Nieprawidłowy link do formularza' }
  }

  if (clientForm.status === 'completed') {
    return { error: 'Ten formularz został już wypełniony', completed: true }
  }

  if ((clientForm as any).forms === null) {
    return { error: 'Formularz nie jest dostępny' }
  }

  return { clientForm }
}

export async function submitClientForm(data: {
  token: string
  formData: Record<string, unknown>
  filledBy: 'client' | 'staff'
  signature?: string
}) {
  const supabase = await createClient()
  
  // Get client form by token
  const { data: clientForm, error: cfError } = await supabase
    .from('client_forms')
    .select(`
      *,
      forms (id, salon_id),
      clients (id, name, email)
    `)
    .eq('token', data.token)
    .single()

  if (cfError || !clientForm) {
    return { error: 'Nieprawidłowy link do formularza' }
  }

  if (clientForm.status === 'completed') {
    return { error: 'Ten formularz został już wypełniony' }
  }

  // Create submission
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .insert({
      client_form_id: clientForm.id,
      form_id: clientForm.form_id,
      client_id: clientForm.client_id,
      salon_id: clientForm.salon_id,
      data: data.formData,
      client_name: clientForm.clients?.name || null,
      client_email: clientForm.clients?.email || null,
      signature: data.signature || null,
    })
    .select()
    .single()

  if (subError) {
    return { error: subError.message }
  }

  // Mark client form as completed
  await supabase
    .from('client_forms')
    .update({
      status: 'completed',
      filled_at: new Date().toISOString(),
      filled_by: data.filledBy,
    })
    .eq('id', clientForm.id)

  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/submissions')
  revalidatePath('/dashboard', 'layout')
  
  // Sync all future appointments for this client to update pending_forms -> scheduled
  try {
    await syncClientAppointmentsStatus(clientForm.client_id)
  } catch (syncError) {
    console.error('Error syncing client appointments status:', syncError)
    // Don't fail the whole request if sync fails
  }

  return { submission }
}

export async function deleteClientForm(clientFormId: string) {
  const supabase = await createClient()
  
  // 1. Delete associated submissions first (simulating Cascade Delete)
  const { error: subError } = await supabase
    .from('submissions')
    .delete()
    .eq('client_form_id', clientFormId)

  if (subError) {
    console.error('Error deleting submission:', subError)
    // We continue to delete client_form even if submission delete fails? 
    // Usually no, but if it fails it might be perms. 
    // But failing here is safer than leaving data.
    return { error: 'Błąd podczas usuwania odpowiedzi: ' + subError.message }
  }

  // 2. Delete the client form assignment
  const { error } = await supabase
    .from('client_forms')
    .delete()
    .eq('id', clientFormId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/clients')
  // Also revalidate dashboard to update visits statuses
  revalidatePath('/dashboard', 'layout')
  
  return { success: true }
}
