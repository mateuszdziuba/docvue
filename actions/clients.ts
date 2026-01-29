'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createClientAction(data: {
  name: string
  email: string
  phone?: string
  notes?: string
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

  // Check if client with this email already exists
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('salon_id', salon.id)
    .eq('email', data.email)
    .single()

  if (existing) {
    return { error: 'Klient z tym emailem już istnieje' }
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      salon_id: salon.id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/clients')
  return { client }
}

export async function updateClient(
  clientId: string,
  data: {
    name?: string
    email?: string
    phone?: string
    notes?: string
  }
) {
  const supabase = await createClient()
  
  const { data: client, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', clientId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/clients')
  return { client }
}

export async function deleteClient(clientId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function getClientsForForm() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nie jesteś zalogowany', clients: [] }
  }

  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!salon) {
    return { error: 'Nie znaleziono gabinetu', clients: [] }
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('salon_id', salon.id)
    .order('name')

  return { clients: clients || [] }
}
