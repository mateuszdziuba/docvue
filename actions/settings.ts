'use server'

import { revalidatePath } from '@/actions/tanstack-compat'
import { createClient } from '@/lib/supabase/server'

export async function updateSalonSettings(data: { pin_code?: string }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nie jesteś zalogowany' }
  }

  const { error } = await supabase
    .from('salons')
    .update({ 
      pin_code: data.pin_code || null,
      // Add other settings here in future
    })
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
