import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/src/utils/supabase'

export const getClientProfileFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { client: null, history: [], error: 'not_authenticated' }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) return { client: null, history: [], error: 'no_client' }

  const { data: history } = await supabase
    .from('appointments')
    .select(`*, treatments (name)`)
    .eq('client_id', client.id)
    .order('start_time', { ascending: false })
    .limit(20)

  return { client, history: history ?? [], error: null }
})

export const getClientAppointmentsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { appointments: null, error: 'not_authenticated' }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!client) return { appointments: null, client: null, error: 'no_client' }

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`id, start_time, status, notes, treatments (name, duration_minutes)`)
    .eq('client_id', client.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(20)

  return { appointments: appointments ?? [], client, error: null }
})
