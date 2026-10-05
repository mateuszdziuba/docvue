import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'

export interface TimeBlock {
  id: string
  salon_id: string
  start_time: string
  end_time: string
  label: string | null
  staff_id: string | null
  staff_member?: { id: string; name: string } | null
}

export const getTimeBlocksFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { salonId: string; from: string; to: string }) => d)
  .handler(async ({ data }): Promise<{ timeBlocks: TimeBlock[] }> => {
    const supabase = getSupabaseServerClient()
    const primary = await supabase
      .from('time_blocks')
      .select('id, salon_id, start_time, end_time, label, staff_id, staff_members (id, name)')
      .eq('salon_id', data.salonId)
      .lt('start_time', data.to)
      .gt('end_time', data.from)
      .order('start_time', { ascending: true })

    if (!primary.error && primary.data) {
      return { timeBlocks: primary.data as unknown as TimeBlock[] }
    }

    // Fallback zanim migracja ze staff_id zostanie zastosowana.
    const fallback = await supabase
      .from('time_blocks')
      .select('id, salon_id, start_time, end_time, label')
      .eq('salon_id', data.salonId)
      .lt('start_time', data.to)
      .gt('end_time', data.from)
      .order('start_time', { ascending: true })
    if (fallback.error || !fallback.data) return { timeBlocks: [] }
    return {
      timeBlocks: (fallback.data as Omit<TimeBlock, 'staff_id'>[]).map((block) => ({
        ...block,
        staff_id: null,
      })),
    }
  })

export const createTimeBlockFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      salonId: string
      startTime: string
      endTime: string
      label?: string
      staffId?: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Brak autoryzacji' }

    const { error } = await supabase.from('time_blocks').insert({
      salon_id: data.salonId,
      start_time: data.startTime,
      end_time: data.endTime,
      label: data.label ?? null,
      staff_id: data.staffId || null,
    })
    if (error) {
      if (/staff_id/i.test(error.message) && /column|schema cache/i.test(error.message)) {
        return {
          error:
            'Blokady per pracownik wymagają migracji (time_blocks.staff_id). Zastosuj migrację 20261009 i spróbuj ponownie.',
        }
      }
      return { error: error.message }
    }
    return { success: true }
  })

export const deleteTimeBlockFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('time_blocks').delete().eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true }
  })

// Legacy aliases
export const getTimeBlocks = async (salonId: string, from: Date | string, to: Date | string) => {
  const result = await getTimeBlocksFn({
    data: {
      salonId,
      from: from instanceof Date ? from.toISOString() : from,
      to: to instanceof Date ? to.toISOString() : to,
    },
  })
  return result.timeBlocks
}
export const createTimeBlock = (data: {
  salonId: string
  startTime: string
  endTime: string
  label?: string
  staffId?: string | null
}) => createTimeBlockFn({ data })
export const deleteTimeBlock = (id: string) => deleteTimeBlockFn({ data: { id } })
