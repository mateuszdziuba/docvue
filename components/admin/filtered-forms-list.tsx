import { createClient } from '@/lib/supabase/server'
import { FormsList } from './forms-list'

export async function FilteredFormsList({ query }: { query: string }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  let request = supabase
    .from('forms')
    .select('*')
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })

  if (query) {
    request = request.ilike('title', `%${query}%`)
  }

  const { data: forms } = await request

  return <FormsList forms={forms || []} query={query} />
}
