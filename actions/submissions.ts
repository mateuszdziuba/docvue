'use server'

import { createClient } from '@/lib/supabase/server'

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

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId)
    .eq('salon_id', salon.id)

  if (error) {
    return { error: error.message }
  }

  const { revalidatePath } = require('next/cache')
  revalidatePath('/dashboard/submissions')
  
  const { redirect } = require('next/navigation')
  redirect('/dashboard/submissions')
}

