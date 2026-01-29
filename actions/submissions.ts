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
