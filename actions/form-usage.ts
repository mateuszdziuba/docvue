'use server'

import { createClient } from '@/lib/supabase/server'

export async function checkFormUsage(formId: string) {
  const supabase = await createClient()

  // Check if there are any submissions for this form
  const { count, error } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('form_id', formId)

  if (error) {
    console.error('Error checking form usage:', error)
    return { error: error.message }
  }

  return { 
    isUsed: (count || 0) > 0,
    count: count || 0
  }
}
