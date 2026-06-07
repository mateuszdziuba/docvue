import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/src/utils/supabase'

export const checkFormUsageFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { formId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { count, error } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', data.formId)

    if (error) return { error: error.message, isUsed: false, count: 0 }
    return { isUsed: (count || 0) > 0, count: count || 0, error: null }
  })

export const checkFormUsage = (formId: string) => checkFormUsageFn({ data: { formId } })
