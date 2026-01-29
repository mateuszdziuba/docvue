'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FormSchema } from '@/types/database'

export async function createForm(data: {
  title: string
  description?: string
  schema: FormSchema
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

  const { data: form, error } = await supabase
    .from('forms')
    .insert({
      salon_id: salon.id,
      title: data.title,
      description: data.description || null,
      schema: data.schema,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/forms')
  return { form }
}

export async function updateForm(
  formId: string,
  data: {
    title?: string
    description?: string
    schema?: FormSchema
    is_active?: boolean
  }
) {
  const supabase = await createClient()
  
  const { data: form, error } = await supabase
    .from('forms')
    .update(data)
    .eq('id', formId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/forms')
  return { form }
}

export async function deleteForm(formId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('id', formId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/forms')
  return { success: true }
}



export async function toggleFormActive(formId: string, isActive: boolean) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('forms')
    .update({ is_active: isActive })
    .eq('id', formId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/forms')
  return { success: true }
}
