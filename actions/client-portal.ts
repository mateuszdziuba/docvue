'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createFormAssignment(formId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Get client
  const { data: client } = await supabase
    .from('clients')
    .select('id, salon_id')
    .eq('user_id', user.id)
    .single()

  if (!client) throw new Error('Client profile not found')

  // Generate token
  // We can use a simple random string generator since Postgres function might be hard to call directly as expression in insert if not setup on table default
  // But we have generate_token() function in DB? 
  // Let's try to fetch it via RPC or just generate in JS. JS is safer/easier here.
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Insert assignment
  const { data, error } = await supabase
    .from('client_forms')
    .insert({
      salon_id: client.salon_id,
      client_id: client.id,
      form_id: formId,
      token: token,
      status: 'pending',
      filled_by: 'client'
    })
    .select()
    .single()

  if (error) {
    console.error('Error assigning form:', error)
    throw new Error('Failed to create form assignment')
  }

  return { token }
}
