'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TimeBlock {
  id: string
  salon_id: string
  start_time: string
  end_time: string
  label: string | null
}

export async function getTimeBlocks(
  salonId: string,
  from: Date,
  to: Date,
): Promise<TimeBlock[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('time_blocks')
    .select('id, salon_id, start_time, end_time, label')
    .eq('salon_id', salonId)
    .lt('start_time', to.toISOString())
    .gt('end_time', from.toISOString())
    .order('start_time', { ascending: true })

  if (error || !data) return []
  return data as TimeBlock[]
}

export async function createTimeBlock(input: {
  salonId: string
  startTime: string
  endTime: string
  label?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Brak autoryzacji' }

  const { error } = await supabase.from('time_blocks').insert({
    salon_id: input.salonId,
    start_time: input.startTime,
    end_time: input.endTime,
    label: input.label ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  return {}
}

export async function deleteTimeBlock(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Brak autoryzacji' }

  const { error } = await supabase.from('time_blocks').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  return {}
}
