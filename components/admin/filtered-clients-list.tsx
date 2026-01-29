import { createClient } from '@/lib/supabase/server'
import { ClientsList } from './clients-list'

export async function FilteredClientsList({ query, isAddingNew }: { query: string; isAddingNew?: boolean }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  let request = supabase
    .from('clients')
    .select('*')
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })

  if (query) {
    // Search by name OR email
    request = request.or(`name.ilike.%${query}%,email.ilike.%${query}%`)
  }

  const { data: clients } = await request

  return <ClientsList clients={clients || []} query={query} defaultOpenAdd={isAddingNew} />
}
